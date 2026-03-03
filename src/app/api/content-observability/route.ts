import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, run } from '@/lib/db';

const CONTENT_ALERTS_SLACK_WEBHOOK_URL = process.env.CONTENT_ALERTS_SLACK_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || '';
const SIGNAL_DEDUPE_COOLDOWN_MINUTES = Number(process.env.CONTENT_SIGNAL_DEDUPE_MINUTES || 60);

interface StatusCountRow {
  status: string;
  count: number;
}

interface NumberRow {
  value: number;
}

interface StaleTaskRow {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  age_days: number;
}

interface AlertRow {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  updated_at: string;
  hasDeliverable: number;
  signalType: 'overdue' | 'stale';
}

interface CreateSignalTaskRequest {
  workspaceId?: string;
  alertTaskId?: string;
  signalType?: 'overdue' | 'stale';
}

async function sendSlackNotification(text: string): Promise<boolean> {
  if (!CONTENT_ALERTS_SLACK_WEBHOOK_URL) return false;

  try {
    const res = await fetch(CONTENT_ALERTS_SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id') || 'default';

    const statusCounts = queryAll<StatusCountRow>(
      `SELECT status, COUNT(*) as count
       FROM tasks
       WHERE workspace_id = ?
       GROUP BY status`,
      [workspaceId]
    );

    const createdLast7d = queryOne<NumberRow>(
      `SELECT COUNT(*) as value
       FROM tasks
       WHERE workspace_id = ?
         AND datetime(created_at) >= datetime('now', '-7 days')`,
      [workspaceId]
    )?.value ?? 0;

    const completedLast7d = queryOne<NumberRow>(
      `SELECT COUNT(*) as value
       FROM tasks
       WHERE workspace_id = ?
         AND status = 'done'
         AND datetime(updated_at) >= datetime('now', '-7 days')`,
      [workspaceId]
    )?.value ?? 0;

    const staleTasks = queryAll<StaleTaskRow>(
      `SELECT id, title, status, updated_at,
              CAST((julianday('now') - julianday(updated_at)) AS INTEGER) as age_days
       FROM tasks
       WHERE workspace_id = ?
         AND status NOT IN ('done')
         AND datetime(updated_at) < datetime('now', '-2 days')
       ORDER BY updated_at ASC
       LIMIT 10`,
      [workspaceId]
    );

    const quality = queryOne<{ score: number }>(
      `SELECT ROUND(AVG(
         (CASE WHEN TRIM(COALESCE(description, '')) <> '' THEN 1 ELSE 0 END +
          CASE WHEN due_date IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN assigned_agent_id IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN status IN ('testing', 'review', 'done') THEN 1 ELSE 0 END
         ) * 25.0
       ), 0) as score
       FROM tasks
       WHERE workspace_id = ?`,
      [workspaceId]
    )?.score ?? 0;

    const withDeliverables = queryOne<NumberRow>(
      `SELECT COUNT(DISTINCT t.id) as value
       FROM tasks t
       JOIN task_deliverables td ON td.task_id = t.id
       WHERE t.workspace_id = ?`,
      [workspaceId]
    )?.value ?? 0;

    const totalTasks = statusCounts.reduce((sum, row) => sum + row.count, 0);
    const publishRate = totalTasks > 0 ? Math.round((completedLast7d / Math.max(createdLast7d, 1)) * 100) : 0;

    const alerts = queryAll<AlertRow>(
      `SELECT t.id, t.title, t.status, t.due_date, t.updated_at,
              CASE WHEN EXISTS (SELECT 1 FROM task_deliverables td WHERE td.task_id = t.id) THEN 1 ELSE 0 END as hasDeliverable,
              CASE
                WHEN t.due_date IS NOT NULL AND datetime(t.due_date) < datetime('now') THEN 'overdue'
                ELSE 'stale'
              END as signalType
       FROM tasks t
       WHERE t.workspace_id = ?
         AND t.status != 'done'
         AND (
           (t.due_date IS NOT NULL AND datetime(t.due_date) < datetime('now'))
           OR datetime(t.updated_at) < datetime('now', '-5 days')
         )
       ORDER BY t.updated_at ASC
       LIMIT 8`,
      [workspaceId]
    );

    return NextResponse.json({
      workspaceId,
      pipeline: {
        statusCounts,
        createdLast7d,
        completedLast7d,
        publishRate,
      },
      freshness: {
        staleCount: staleTasks.length,
        staleTasks,
      },
      quality: {
        score: Number(quality),
        tasksWithDeliverables: withDeliverables,
        totalTasks,
      },
      alerts,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to compute content observability:', error);
    return NextResponse.json({ error: 'Failed to compute content observability' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSignalTaskRequest = await request.json();
    const workspaceId = body.workspaceId || 'default';

    if (!body.alertTaskId || !body.signalType) {
      return NextResponse.json({ error: 'alertTaskId and signalType are required' }, { status: 400 });
    }

    const sourceTask = queryOne<{ id: string; title: string; due_date: string | null }>(
      `SELECT id, title, due_date
       FROM tasks
       WHERE id = ? AND workspace_id = ?`,
      [body.alertTaskId, workspaceId]
    );

    if (!sourceTask) {
      return NextResponse.json({ error: 'Source alert task not found' }, { status: 404 });
    }

    const defaultOwnerAgent = queryOne<{ id: string; name: string }>(
      `SELECT id, name
       FROM agents
       WHERE workspace_id = ? AND is_master = 0
       ORDER BY CASE status WHEN 'working' THEN 0 WHEN 'standby' THEN 1 ELSE 2 END, created_at ASC
       LIMIT 1`,
      [workspaceId]
    );
    const defaultOwner = defaultOwnerAgent?.id ?? null;

    const now = new Date();
    const due = new Date(now);
    due.setDate(now.getDate() + (body.signalType === 'overdue' ? 1 : 2));

    const signalLabel = body.signalType === 'overdue' ? 'Overdue' : 'Stale';
    const newTaskTitle = `[Signal] ${signalLabel}: ${sourceTask.title}`;
    const successMetric = body.signalType === 'overdue'
      ? 'Task is moved to testing/review with clear owner update within 24h.'
      : 'Task is refreshed with a meaningful update and moved forward within 48h.';

    const recentSignalTask = queryOne<{ id: string; created_at: string }>(
      `SELECT id, created_at
       FROM tasks
       WHERE workspace_id = ?
         AND title = ?
         AND datetime(created_at) >= datetime('now', ?)
       ORDER BY created_at DESC
       LIMIT 1`,
      [workspaceId, newTaskTitle, `-${SIGNAL_DEDUPE_COOLDOWN_MINUTES} minutes`]
    );

    if (recentSignalTask) {
      return NextResponse.json({
        ok: true,
        deduped: true,
        reason: `Duplicate prevented within ${SIGNAL_DEDUPE_COOLDOWN_MINUTES} minute cooldown`,
        existingTaskId: recentSignalTask.id,
      });
    }

    const taskId = uuidv4();
    const nowIso = now.toISOString();

    run(
      `INSERT INTO tasks (id, title, description, status, priority, assigned_agent_id, workspace_id, business_id, due_date, priority_note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        newTaskTitle,
        `Auto-created from Content Observability signal on task: ${sourceTask.title} (${sourceTask.id})`,
        'assigned',
        'high',
        defaultOwner,
        workspaceId,
        'default',
        due.toISOString(),
        successMetric,
        nowIso,
        nowIso,
      ]
    );

    const deliverableId = uuidv4();
    const deliverableTitle = `Deliverable: Resolve ${signalLabel.toLowerCase()} signal for \"${sourceTask.title}\"`;

    run(
      `INSERT INTO task_deliverables (id, task_id, deliverable_type, title, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        deliverableId,
        taskId,
        'artifact',
        deliverableTitle,
        `Complete this with evidence of remediation for source task ${sourceTask.id}.`,
        nowIso,
      ]
    );

    run(
      `INSERT INTO events (id, type, agent_id, task_id, message, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        'task_created',
        defaultOwner,
        taskId,
        `Signal task created from ${signalLabel.toLowerCase()} alert: ${sourceTask.title}`,
        JSON.stringify({ sourceTaskId: sourceTask.id, signalType: body.signalType, deliverableId }),
        nowIso,
      ]
    );

    const dueLabel = due.toISOString().slice(0, 10);
    const slackText = `[Auto-Task] ${signalLabel} signal → ${newTaskTitle}\nOwner: ${defaultOwnerAgent?.name || 'unassigned'} · Due: ${dueLabel}\nSource: ${sourceTask.title} (${sourceTask.id})`;
    const slackSent = await sendSlackNotification(slackText);

    run(
      `INSERT INTO events (id, type, agent_id, task_id, message, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        'message_sent',
        defaultOwner,
        taskId,
        slackSent
          ? `Auto-Task Slack notification sent: ${newTaskTitle}`
          : `Auto-Task Slack notification pending (webhook unavailable): ${newTaskTitle}`,
        JSON.stringify({ channel: 'slack', sourceTaskId: sourceTask.id, signalType: body.signalType, slackSent }),
        nowIso,
      ]
    );

    const task = queryOne(
      `SELECT t.*,
              aa.name as assigned_agent_name,
              aa.avatar_emoji as assigned_agent_emoji
       FROM tasks t
       LEFT JOIN agents aa ON t.assigned_agent_id = aa.id
       WHERE t.id = ?`,
      [taskId]
    );

    return NextResponse.json({
      ok: true,
      task,
      sourceTaskId: sourceTask.id,
      signalType: body.signalType,
      slackSent,
      deliverable: {
        id: deliverableId,
        title: deliverableTitle,
      },
    });
  } catch (error) {
    console.error('Failed to create signal task:', error);
    return NextResponse.json({ error: 'Failed to create signal task' }, { status: 500 });
  }
}

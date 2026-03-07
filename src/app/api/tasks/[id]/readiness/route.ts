/**
 * Task Readiness Gatekeeper API
 * 
 * POST /api/tasks/[id]/readiness — Run readiness assessment
 * GET  /api/tasks/[id]/readiness — Get last assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { broadcast } from '@/lib/events';
import { getOpenClawClient } from '@/lib/openclaw/client';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

interface ReadinessGap {
  category: 'scope' | 'inputs' | 'dependencies' | 'owner' | 'due_date' | 'planning';
  description: string;
  severity: 'blocking' | 'warning';
}

/**
 * Structural readiness checks (no LLM needed)
 */
function runStructuralChecks(task: Record<string, unknown>): ReadinessGap[] {
  const gaps: ReadinessGap[] = [];
  const desc = (task.description as string) || '';
  const title = (task.title as string) || '';

  // 1. Scope: meaningful description?
  if (!desc || desc.length < 30) {
    gaps.push({
      category: 'scope',
      description: 'Task has no description or it is too brief to define scope.',
      severity: 'blocking',
    });
  }

  // 2. Owner: agent assigned?
  if (!task.assigned_agent_id) {
    gaps.push({
      category: 'owner',
      description: 'No agent assigned to this task.',
      severity: 'blocking',
    });
  }

  // 3. Due date
  if (!task.due_date) {
    gaps.push({
      category: 'due_date',
      description: 'No due date set.',
      severity: 'warning',
    });
  }

  // 4. Dependencies: blocked?
  if (task.blocked_on) {
    gaps.push({
      category: 'dependencies',
      description: `Blocked on: ${task.blocked_on}${task.blocked_reason ? ' — ' + task.blocked_reason : ''}`,
      severity: 'blocking',
    });
  }

  // 5. Planning: complex task without planning spec?
  const isComplex = desc.length > 200 ||
    /\b(system|implement|build|create|develop|architect|design|scale|pipeline|automate)\b/i.test(title);

  if (isComplex && !task.planning_complete && !task.planning_spec) {
    gaps.push({
      category: 'planning',
      description: 'Complex task without a completed planning spec. Recommend running Planning Mode.',
      severity: 'blocking',
    });
  }

  return gaps;
}

/**
 * Generate task-specific planning kickoff via LLM
 */
async function generatePlanningKickoff(
  task: Record<string, unknown>,
  gaps: ReadinessGap[]
): Promise<Record<string, unknown> | null> {
  const gapSummary = gaps.map(g => `- [${g.category}] ${g.description}`).join('\n');

  const prompt = `You are the Readiness Agent for Mission Control. A task has gaps that need resolving before an agent can execute.

TASK TITLE: ${task.title}
TASK DESCRIPTION:
${(task.description as string)?.substring(0, 2000) || 'No description provided'}

DETECTED GAPS:
${gapSummary}

Generate a TASK-SPECIFIC planning kickoff. Questions must be unique to THIS task — not generic PM questions. Think about what a human would need to decide to unblock this specific work.

Respond with ONLY valid JSON:
{
  "objective": "One sentence describing what this task needs to achieve",
  "questions": [
    {
      "question": "A specific question about THIS task",
      "options": [
        {"id": "A", "label": "Option A"},
        {"id": "B", "label": "Option B"},
        {"id": "C", "label": "Option C"},
        {"id": "other", "label": "Other"}
      ]
    }
  ],
  "checklist": ["Specific action item 1", "Specific action item 2"],
  "nextSteps": ["Immediate next step 1", "Immediate next step 2"]
}

RULES:
- 2-4 questions max
- Questions must directly address the detected gaps
- Options must be concrete and actionable
- Checklist items specific to this task
- Always include "Other" option`;

  try {
    const client = getOpenClawClient();
    if (!client.isConnected()) {
      await client.connect();
    }

    const sessionKey = `agent:main:readiness:${Date.now()}`;
    
    // Send the prompt with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OpenClaw timeout')), 15000);
    });

    await Promise.race([
      client.call('sessions.send', {
        session_id: sessionKey,
        content: prompt,
      }),
      timeoutPromise,
    ]);

    // Poll for response
    const pollStartTime = Date.now();
    while (Date.now() - pollStartTime < 14000) {
      try {
        const result = await client.call<unknown[]>('sessions.history', {
          session_id: sessionKey,
        });

        const msgArray = Array.isArray(result) ? result : (result as any)?.messages || [];
        const latestAssistant = [...msgArray].reverse().find((m: any) => m.role === 'assistant');

        if (latestAssistant && latestAssistant.content) {
          let text = '';
          if (typeof latestAssistant.content === 'string') {
            text = latestAssistant.content;
          } else if (Array.isArray(latestAssistant.content)) {
            text = latestAssistant.content
              .filter((c: any) => c.type === 'text' && c.text)
              .map((c: any) => c.text)
              .join('\n');
          }
          
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        }
      } catch (pollErr) {
        console.error('[Readiness] Error polling:', pollErr);
      }

      await new Promise(r => setTimeout(r, 500));
    }
  } catch (err) {
    console.error('[Readiness] Failed to generate planning kickoff:', err);
  }
  return null;
}

// POST /api/tasks/[id]/readiness
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const body = await request.json().catch(() => ({}));
  const autoCreateSubtask = (body as Record<string, unknown>).autoCreateSubtask !== false;

  try {
    const db = getDb();
    const task = db.prepare(`
      SELECT t.*, aa.name as assigned_agent_name
      FROM tasks t
      LEFT JOIN agents aa ON t.assigned_agent_id = aa.id
      WHERE t.id = ?
    `).get(taskId) as Record<string, unknown> | undefined;

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const gaps = runStructuralChecks(task);
    const hasBlockingGaps = gaps.some(g => g.severity === 'blocking');
    const ready = !hasBlockingGaps;

    const result: Record<string, unknown> = {
      taskId,
      ready,
      gaps,
      suggestedAction: ready ? 'execute' : 'needs_planning',
      assessedAt: new Date().toISOString(),
    };

    if (!ready && gaps.length > 0) {
      // Generate task-specific planning kickoff
      const kickoff = await generatePlanningKickoff(task, gaps);
      if (kickoff) {
        result.planningKickoff = kickoff;
      }

      // Log readiness assessment as activity
      const activityId = crypto.randomUUID();
      const gapList = gaps.map(g => `• [${g.severity.toUpperCase()}] ${g.description}`).join('\n');

      db.prepare(`
        INSERT INTO task_activities (id, task_id, agent_id, activity_type, message, metadata)
        VALUES (?, ?, NULL, 'updated', ?, ?)
      `).run(
        activityId,
        taskId,
        `🔍 Readiness Check — ${gaps.length} gap(s) found:\n${gapList}\n\n→ Planning recommended. Open the Planning tab to resolve.`,
        JSON.stringify({ source: 'readiness_agent', gaps, kickoff })
      );

      broadcast({
        type: 'activity_logged',
        payload: {
          id: activityId,
          task_id: taskId,
          activity_type: 'updated',
          message: `🔍 Readiness Check — ${gaps.length} gap(s) found. Planning recommended.`,
          created_at: new Date().toISOString(),
        },
      });

      // Auto-create planning sub-task
      if (autoCreateSubtask) {
        const existing = db.prepare(
          `SELECT id FROM tasks WHERE title LIKE ? AND status != 'done'`
        ).get(`Planning: ${task.title}%`) as { id: string } | undefined;

        if (!existing) {
          const subtaskId = crypto.randomUUID();
          const checklistText = (kickoff as any)?.checklist?.map((c: string) => `- [ ] ${c}`).join('\n') || '';

          db.prepare(`
            INSERT INTO tasks (id, title, description, status, priority, workspace_id, business_id, created_at, updated_at)
            VALUES (?, ?, ?, 'inbox', ?, ?, ?, datetime('now'), datetime('now'))
          `).run(
            subtaskId,
            `Planning: ${task.title}`,
            `Resolve readiness gaps for parent task.\n\n**Gaps:**\n${gapList}\n\n**Checklist:**\n${checklistText}`,
            (task.priority as string) || 'normal',
            (task.workspace_id as string) || 'default',
            (task.business_id as string) || 'default'
          );

          db.prepare(`
            INSERT INTO events (id, type, task_id, message, created_at)
            VALUES (?, 'task_created', ?, ?, datetime('now'))
          `).run(crypto.randomUUID(), subtaskId, `Planning sub-task created for "${task.title}"`);

          broadcast({ type: 'task_created', payload: { id: subtaskId, title: `Planning: ${task.title}`, status: 'inbox' } });
          result.planningSubtaskId = subtaskId;
        }
      }

      // Update suggested_next_step
      const stepText = (kickoff as any)?.objective
        ? `Needs planning: ${(kickoff as any).objective}`
        : `Readiness check found ${gaps.length} gap(s). Open Planning tab to resolve.`;

      db.prepare(`UPDATE tasks SET suggested_next_step = ?, suggested_action = 'needs_planning' WHERE id = ?`)
        .run(stepText, taskId);

    } else {
      // Ready — update suggestion
      db.prepare(`UPDATE tasks SET suggested_next_step = 'Ready to execute. All readiness checks passed.', suggested_action = 'auto_execute' WHERE id = ?`)
        .run(taskId);

      const activityId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO task_activities (id, task_id, agent_id, activity_type, message, metadata)
        VALUES (?, ?, NULL, 'updated', '✅ Readiness check passed. Task is ready for execution.', ?)
      `).run(activityId, taskId, JSON.stringify({ source: 'readiness_agent', ready: true }));

      broadcast({
        type: 'activity_logged',
        payload: { id: activityId, task_id: taskId, activity_type: 'updated', message: '✅ Readiness check passed.', created_at: new Date().toISOString() },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Readiness check failed:', error);
    return NextResponse.json({ error: 'Readiness check failed' }, { status: 500 });
  }
}

// GET /api/tasks/[id]/readiness
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  try {
    const db = getDb();
    const last = db.prepare(`
      SELECT message, metadata, created_at
      FROM task_activities
      WHERE task_id = ? AND metadata LIKE '%readiness_agent%'
      ORDER BY created_at DESC LIMIT 1
    `).get(taskId) as { message: string; metadata: string; created_at: string } | undefined;

    if (!last) {
      return NextResponse.json({ taskId, assessed: false });
    }
    const meta = last.metadata ? JSON.parse(last.metadata) : {};
    return NextResponse.json({ taskId, assessed: true, ready: meta.ready || false, gaps: meta.gaps || [], kickoff: meta.kickoff || null, assessedAt: last.created_at });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

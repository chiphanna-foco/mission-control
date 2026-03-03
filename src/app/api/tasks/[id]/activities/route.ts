/**
 * Task Activities API
 * Endpoints for logging and retrieving task activities
 */

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { getDb } from '@/lib/db';
import { broadcast } from '@/lib/events';
import type { TaskActivity } from '@/lib/types';

/**
 * GET /api/tasks/[id]/activities
 * Retrieve all activities for a task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const db = getDb();

    // Get activities with agent info
    const activities = db.prepare(`
      SELECT 
        a.*,
        ag.id as agent_id,
        ag.name as agent_name,
        ag.avatar_emoji as agent_avatar_emoji
      FROM task_activities a
      LEFT JOIN agents ag ON a.agent_id = ag.id
      WHERE a.task_id = ?
      ORDER BY a.created_at DESC
    `).all(taskId) as any[];

    // Transform to include agent object
    const result: TaskActivity[] = activities.map(row => ({
      id: row.id,
      task_id: row.task_id,
      agent_id: row.agent_id,
      activity_type: row.activity_type,
      message: row.message,
      metadata: row.metadata,
      created_at: row.created_at,
      agent: row.agent_id ? {
        id: row.agent_id,
        name: row.agent_name,
        avatar_emoji: row.agent_avatar_emoji,
        role: '',
        status: 'working' as const,
        is_master: false,
        workspace_id: 'default',
        description: '',
        created_at: '',
        updated_at: '',
      } : undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/[id]/activities
 * Log a new activity for a task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    
    const { activity_type, message, agent_id, metadata } = body;

    if (!activity_type || !message) {
      return NextResponse.json(
        { error: 'activity_type and message are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = crypto.randomUUID();

    // Insert activity
    db.prepare(`
      INSERT INTO task_activities (id, task_id, agent_id, activity_type, message, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      taskId,
      agent_id || null,
      activity_type,
      message,
      metadata ? JSON.stringify(metadata) : null
    );

    // Get the created activity with agent info
    const activity = db.prepare(`
      SELECT 
        a.*,
        ag.id as agent_id,
        ag.name as agent_name,
        ag.avatar_emoji as agent_avatar_emoji
      FROM task_activities a
      LEFT JOIN agents ag ON a.agent_id = ag.id
      WHERE a.id = ?
    `).get(id) as any;

    const result: TaskActivity = {
      id: activity.id,
      task_id: activity.task_id,
      agent_id: activity.agent_id,
      activity_type: activity.activity_type,
      message: activity.message,
      metadata: activity.metadata,
      created_at: activity.created_at,
      agent: activity.agent_id ? {
        id: activity.agent_id,
        name: activity.agent_name,
        avatar_emoji: activity.agent_avatar_emoji,
        role: '',
        status: 'working' as const,
        is_master: false,
        workspace_id: 'default',
        description: '',
        created_at: '',
        updated_at: '',
      } : undefined,
    };

    // Broadcast to SSE clients
    broadcast({
      type: 'activity_logged',
      payload: result,
    });

    // If this is an agent update, notify Chip in Slack
    if (agent_id && activity_type !== 'system') {
      try {
        const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(taskId) as any;
        const taskTitle = task?.title || taskId;
        const preview = message.replace(/["`$\\]/g, '').substring(0, 300);
        execSync(
          `openclaw message send --channel slack --target D0ABQHX4PL4 --message "📋 *MC Update — ${taskTitle}*\\n${preview}"`,
          { timeout: 10000 }
        );
      } catch (e) {
        console.error('[activities] Failed to send Slack notification:', e);
      }
    }

    // If this is a human comment (no agent_id, comment type), ping Clawdbot via OpenClaw system event
    if (activity_type === 'comment' && !agent_id) {
      try {
        const task = db.prepare('SELECT title FROM tasks WHERE id = ?').get(taskId) as any;
        const taskTitle = task?.title || taskId;
        const cleanMsg = message.replace(/["`$\\]/g, '').substring(0, 200);
        execSync(
          `openclaw system event --text "MC comment from Chip on [${taskTitle}] (task_id:${taskId}): ${cleanMsg}" --mode now`,
          { timeout: 10000 }
        );
        console.log(`[activities] Notified Clawdbot about comment on ${taskTitle}`);

        // Add immediate in-app acknowledgment so users can see the handoff happened
        const ackId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO task_activities (id, task_id, agent_id, activity_type, message, metadata)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          ackId,
          taskId,
          null,
          'updated',
          '📨 Clawdbot notified. Response will appear here when posted.',
          JSON.stringify({ source: 'system', kind: 'comment_ack' })
        );

        broadcast({
          type: 'activity_logged',
          payload: {
            id: ackId,
            task_id: taskId,
            activity_type: 'updated',
            message: '📨 Clawdbot notified. Response will appear here when posted.',
            metadata: JSON.stringify({ source: 'system', kind: 'comment_ack' }),
            created_at: new Date().toISOString(),
          },
        });

        // Guaranteed immediate human-visible response in the task thread (even if async bridge is delayed)
        const chipAi = db.prepare(`SELECT id FROM agents WHERE name = 'ChipAI' LIMIT 1`).get() as { id?: string } | undefined;
        const immediateReplyId = crypto.randomUUID();
        const immediateReply = `Got it — I saw your comment: "${cleanMsg}". I’m on it and will post the concrete update here.`;

        db.prepare(`
          INSERT INTO task_activities (id, task_id, agent_id, activity_type, message, metadata)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          immediateReplyId,
          taskId,
          chipAi?.id || null,
          'comment',
          immediateReply,
          JSON.stringify({ source: 'system', kind: 'immediate_reply_fallback' })
        );

        broadcast({
          type: 'activity_logged',
          payload: {
            id: immediateReplyId,
            task_id: taskId,
            agent_id: chipAi?.id || undefined,
            activity_type: 'comment',
            message: immediateReply,
            metadata: JSON.stringify({ source: 'system', kind: 'immediate_reply_fallback' }),
            created_at: new Date().toISOString(),
          },
        });
      } catch (e) {
        console.error('Failed to notify Clawdbot:', e);
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}

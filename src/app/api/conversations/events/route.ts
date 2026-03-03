import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, run } from '@/lib/db';
import { isTaskCandidate } from '@/lib/conversations';
import type { ConversationEvent } from '@/lib/types';

function stripReplyTag(text: string): string {
  return text.replace(/^\s*\[\[\s*reply_to[^\]]*\]\]\s*/i, '').trim();
}

function extractTaskId(text: string): string | null {
  const m = text.match(/\(task_id:([a-zA-Z0-9_-]+)\)/i) || text.match(/task_id:([a-zA-Z0-9_-]+)/i);
  return m?.[1] || null;
}

function ensureConversationTaskLink(eventId: string, taskId: string, createdAt: number) {
  const existingLink = queryOne<{ id: string }>(
    'SELECT id FROM conversation_task_links WHERE conversation_event_id = ? AND task_id = ?',
    [eventId, taskId]
  );
  if (!existingLink) {
    run(
      `INSERT INTO conversation_task_links (id, conversation_event_id, task_id, created_at)
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), eventId, taskId, createdAt]
    );
  }
}

function maybeBridgeAssistantReplyToTask(params: {
  eventId: string;
  taskId: string;
  role?: string | null;
  text?: string | null;
  threadId?: string | null;
  createdAt: number;
}) {
  const role = (params.role || '').toLowerCase();
  if (role !== 'assistant') return;
  if (!params.text) return;
  if (/mc comment from chip/i.test(params.text)) return;

  const message = stripReplyTag(params.text);
  if (!message) return;

  const existingActivity = queryOne<{ id: string }>(
    `SELECT id FROM task_activities
     WHERE task_id = ? AND metadata LIKE ?
     LIMIT 1`,
    [params.taskId, `%"conversation_event_id":"${params.eventId}"%`]
  );
  if (existingActivity) return;

  const chipAI = queryOne<{ id: string }>(
    `SELECT id FROM agents WHERE name = 'ChipAI' LIMIT 1`
  );

  run(
    `INSERT INTO task_activities (id, task_id, agent_id, activity_type, message, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      params.taskId,
      chipAI?.id || null,
      'comment',
      message,
      JSON.stringify({
        source: 'conversation_bridge',
        conversation_event_id: params.eventId,
        thread_id: params.threadId || null,
      }),
      new Date(params.createdAt).toISOString(),
    ]
  );
}


// GET /api/conversations/events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionKey = searchParams.get('session_key');
    const threadId = searchParams.get('thread_id');
    const channel = searchParams.get('channel');
    const q = searchParams.get('q');
    const before = searchParams.get('before');
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200);

    let sql = `
      SELECT e.*, COUNT(l.id) as linked_task_count
      FROM conversation_events e
      LEFT JOIN conversation_task_links l ON l.conversation_event_id = e.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (sessionKey) {
      sql += ' AND e.session_key = ?';
      params.push(sessionKey);
    }
    if (threadId) {
      sql += ' AND e.thread_id = ?';
      params.push(threadId);
    }
    if (channel) {
      sql += ' AND e.channel = ?';
      params.push(channel);
    }
    if (q) {
      sql += ' AND e.text LIKE ?';
      params.push(`%${q}%`);
    }
    if (before) {
      sql += ' AND COALESCE(e.ts, e.created_at) < ?';
      params.push(Number(before));
    }

    sql += ' GROUP BY e.id ORDER BY COALESCE(e.ts, e.created_at) DESC LIMIT ?';
    params.push(limit);

    const events = queryAll<ConversationEvent & { linked_task_count?: number }>(sql, params)
      .map((event) => ({
        ...event,
        is_task_candidate: isTaskCandidate(event.text || ''),
      }));

    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch conversation events:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation events' }, { status: 500 });
  }
}

// POST /api/conversations/events (ingest/upsert)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const now = Date.now();

    const provider = body.provider || null;
    const messageId = body.message_id || null;

    if (provider && messageId) {
      const existing = queryOne<{ id: string }>(
        'SELECT id FROM conversation_events WHERE provider = ? AND message_id = ?',
        [provider, messageId]
      );

      if (existing) {
        run(
          `UPDATE conversation_events
           SET session_key=?, thread_id=?, channel=?, chat_id=?, role=?, author=?, text=?, ts=?, metadata_json=?, created_at=?
           WHERE id=?`,
          [
            body.session_key || null,
            body.thread_id || null,
            body.channel || null,
            body.chat_id || null,
            body.role || null,
            body.author || null,
            body.text || null,
            body.ts || now,
            body.metadata_json ? JSON.stringify(body.metadata_json) : null,
            now,
            existing.id,
          ]
        );

        let linkedTaskId = extractTaskId(body.text || '');
        if (linkedTaskId) {
          ensureConversationTaskLink(existing.id, linkedTaskId, now);
        } else if (body.thread_id) {
          const threadLink = queryOne<{ task_id: string }>(
            `SELECT l.task_id
             FROM conversation_task_links l
             JOIN conversation_events e ON e.id = l.conversation_event_id
             WHERE e.thread_id = ?
             ORDER BY COALESCE(e.ts, e.created_at) DESC
             LIMIT 1`,
            [body.thread_id]
          );
          linkedTaskId = threadLink?.task_id || null;
        }

        if (linkedTaskId) {
          maybeBridgeAssistantReplyToTask({
            eventId: existing.id,
            taskId: linkedTaskId,
            role: body.role || null,
            text: body.text || null,
            threadId: body.thread_id || null,
            createdAt: now,
          });
        }

        return NextResponse.json({ id: existing.id, upserted: true, is_task_candidate: isTaskCandidate(body.text || '') });
      }
    }

    const id = body.id || uuidv4();
    run(
      `INSERT INTO conversation_events (
        id, session_key, thread_id, channel, provider, chat_id, message_id, role, author, text, ts, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.session_key || null,
        body.thread_id || null,
        body.channel || null,
        provider,
        body.chat_id || null,
        messageId,
        body.role || null,
        body.author || null,
        body.text || null,
        body.ts || now,
        body.metadata_json ? JSON.stringify(body.metadata_json) : null,
        now,
      ]
    );

    let linkedTaskId = extractTaskId(body.text || '');
    if (linkedTaskId) {
      ensureConversationTaskLink(id, linkedTaskId, now);
    } else if (body.thread_id) {
      const threadLink = queryOne<{ task_id: string }>(
        `SELECT l.task_id
         FROM conversation_task_links l
         JOIN conversation_events e ON e.id = l.conversation_event_id
         WHERE e.thread_id = ?
         ORDER BY COALESCE(e.ts, e.created_at) DESC
         LIMIT 1`,
        [body.thread_id]
      );
      linkedTaskId = threadLink?.task_id || null;
    }

    if (linkedTaskId) {
      maybeBridgeAssistantReplyToTask({
        eventId: id,
        taskId: linkedTaskId,
        role: body.role || null,
        text: body.text || null,
        threadId: body.thread_id || null,
        createdAt: now,
      });
    }

    return NextResponse.json({ id, created: true, is_task_candidate: isTaskCandidate(body.text || '') }, { status: 201 });
  } catch (error) {
    console.error('Failed to ingest conversation event:', error);
    return NextResponse.json({ error: 'Failed to ingest conversation event' }, { status: 500 });
  }
}

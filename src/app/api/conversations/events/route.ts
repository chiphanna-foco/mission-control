import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, run } from '@/lib/db';
import { isTaskCandidate } from '@/lib/conversations';
import type { ConversationEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

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

    return NextResponse.json({ id, created: true, is_task_candidate: isTaskCandidate(body.text || '') }, { status: 201 });
  } catch (error) {
    console.error('Failed to ingest conversation event:', error);
    return NextResponse.json({ error: 'Failed to ingest conversation event' }, { status: 500 });
  }
}

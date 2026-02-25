import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, run } from '@/lib/db';
import { buildTaskTitleFromText } from '@/lib/conversations';
import type { ConversationEvent, Task } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const event = queryOne<ConversationEvent>('SELECT * FROM conversation_events WHERE id = ?', [id]);
    if (!event) {
      return NextResponse.json({ error: 'Conversation event not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const taskId = uuidv4();

    const title = body.title || buildTaskTitleFromText(event.text || '');
    const description = body.description || [
      'Created from conversation event.',
      event.author ? `Author: ${event.author}` : null,
      event.channel ? `Channel: ${event.channel}` : null,
      event.thread_id ? `Thread: ${event.thread_id}` : null,
      event.text ? `Message: ${event.text}` : null,
    ].filter(Boolean).join('\n');

    run(
      `INSERT INTO tasks (id, title, description, status, priority, workspace_id, business_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        title,
        description,
        body.status || 'inbox',
        body.priority || 'normal',
        body.workspace_id || 'default',
        body.business_id || 'default',
        nowIso,
        nowIso,
      ]
    );

    const linkId = uuidv4();
    run(
      `INSERT INTO conversation_task_links (id, conversation_event_id, task_id, created_at)
       VALUES (?, ?, ?, ?)`,
      [linkId, id, taskId, nowMs]
    );

    const task = queryOne<Task>('SELECT * FROM tasks WHERE id = ?', [taskId]);
    return NextResponse.json({ task, link: { id: linkId, conversation_event_id: id, task_id: taskId, created_at: nowMs } }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task from conversation event:', error);
    return NextResponse.json({ error: 'Failed to create task from conversation event' }, { status: 500 });
  }
}

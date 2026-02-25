import { NextRequest, NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('conversation_event_id');
    const taskId = searchParams.get('task_id');

    let sql = `
      SELECT l.*, t.title as task_title, t.status as task_status
      FROM conversation_task_links l
      LEFT JOIN tasks t ON t.id = l.task_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (eventId) {
      sql += ' AND l.conversation_event_id = ?';
      params.push(eventId);
    }
    if (taskId) {
      sql += ' AND l.task_id = ?';
      params.push(taskId);
    }

    sql += ' ORDER BY l.created_at DESC';

    const links = queryAll(sql, params);
    return NextResponse.json(links);
  } catch (error) {
    console.error('Failed to fetch conversation links:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation links' }, { status: 500 });
  }
}

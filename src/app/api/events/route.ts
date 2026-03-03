export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, run } from '@/lib/db';
import type { Event } from '@/lib/types';

interface FeedRow {
  id: string;
  source: 'event' | 'activity';
  type: string;
  activity_type: string | null;
  task_id: string | null;
  agent_id: string | null;
  message: string;
  metadata: string | null;
  created_at: string;
  task_title: string | null;
  agent_name: string | null;
  agent_emoji: string | null;
}

// Meaningful activity types we want in the feed
const MEANINGFUL_ACTIVITY_TYPES = [
  'spawned',
  'completed',
  'status_changed',
  'file_created',
];

// GET /api/events - Combined live feed from events + task_activities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const since = searchParams.get('since'); // ISO timestamp for polling

    // Build a UNION query combining events and task_activities
    const sinceClause = since ? 'AND created_at > ?' : '';
    const sinceParams = since ? [since] : [];

    const sql = `
      SELECT * FROM (
        SELECT
          e.id,
          'event' as source,
          e.type,
          NULL as activity_type,
          e.task_id,
          e.agent_id,
          e.message,
          e.metadata,
          REPLACE(e.created_at, ' ', 'T') AS created_at,
          t.title as task_title,
          a.name as agent_name,
          a.avatar_emoji as agent_emoji
        FROM events e
        LEFT JOIN tasks t ON e.task_id = t.id
        LEFT JOIN agents a ON e.agent_id = a.id
        WHERE 1=1 ${sinceClause}

        UNION ALL

        SELECT
          ta.id,
          'activity' as source,
          ta.activity_type as type,
          ta.activity_type,
          ta.task_id,
          ta.agent_id,
          ta.message,
          ta.metadata,
          REPLACE(ta.created_at, ' ', 'T') AS created_at,
          t.title as task_title,
          a.name as agent_name,
          a.avatar_emoji as agent_emoji
        FROM task_activities ta
        LEFT JOIN tasks t ON ta.task_id = t.id
        LEFT JOIN agents a ON ta.agent_id = a.id
        WHERE ta.activity_type IN (${MEANINGFUL_ACTIVITY_TYPES.map(() => '?').join(',')})
        ${sinceClause}
      )
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const params = [
      ...sinceParams,
      ...MEANINGFUL_ACTIVITY_TYPES,
      ...sinceParams,
      limit,
    ];

    const rows = queryAll<FeedRow>(sql, params);

    // Transform into a unified feed format
    const feed = rows.map((row) => ({
      id: row.id,
      source: row.source,
      type: row.type,
      activity_type: row.activity_type,
      message: row.message,
      metadata: row.metadata,
      created_at: row.created_at,
      task_id: row.task_id,
      task_title: row.task_title,
      agent_id: row.agent_id,
      agent_name: row.agent_name,
      agent_emoji: row.agent_emoji,
    }));

    return NextResponse.json(feed);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST /api/events - Create a manual event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.type || !body.message) {
      return NextResponse.json({ error: 'Type and message are required' }, { status: 400 });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    run(
      `INSERT INTO events (id, type, agent_id, task_id, message, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.type,
        body.agent_id || null,
        body.task_id || null,
        body.message,
        body.metadata ? JSON.stringify(body.metadata) : null,
        now,
      ]
    );

    return NextResponse.json({ id, type: body.type, message: body.message, created_at: now }, { status: 201 });
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

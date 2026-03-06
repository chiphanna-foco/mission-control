import { NextRequest, NextResponse } from 'next/server';
import { queryAll, run } from '@/lib/db';

/**
 * ADMIN ENDPOINT: /api/admin/import
 * 
 * Imports agents and tasks from JSON payload.
 * SECURITY: This endpoint is temporary for data migration. Remove after use.
 * In production, only allow with a private admin token in the request header.
 */

export async function POST(request: NextRequest) {
  try {
    // Simple auth check (replace with real token verification in production)
    const adminToken = request.headers.get('X-Admin-Token');
    if (adminToken !== process.env.ADMIN_IMPORT_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized. Missing or invalid X-Admin-Token header.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { agents = [], tasks = [] } = body;

    let agentInserted = 0;
    let agentSkipped = 0;
    let taskInserted = 0;
    let taskSkipped = 0;

    // Insert agents (preserving original IDs)
    for (const agent of agents) {
      try {
        // Check if agent already exists
        const existing = queryAll(
          'SELECT id FROM agents WHERE id = ?',
          [agent.id]
        );
        
        if (existing.length > 0) {
          agentSkipped++;
          continue;
        }

        run(
          `INSERT INTO agents (id, name, role, description, avatar_emoji, status, is_master, workspace_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            agent.id,
            agent.name,
            agent.role,
            agent.description || null,
            agent.avatar_emoji || '🤖',
            agent.status || 'standby',
            agent.is_master ? 1 : 0,
            agent.workspace_id || 'default',
            agent.created_at,
            agent.updated_at,
          ]
        );
        agentInserted++;
      } catch (err) {
        console.error(`Failed to insert agent ${agent.id}:`, err);
      }
    }

    // Insert tasks (preserving original IDs, handling agent references)
    for (const task of tasks) {
      try {
        // Check if task already exists
        const existing = queryAll(
          'SELECT id FROM tasks WHERE id = ?',
          [task.id]
        );
        
        if (existing.length > 0) {
          taskSkipped++;
          continue;
        }

        run(
          `INSERT INTO tasks (id, title, description, status, priority, assigned_agent_id, created_by_agent_id, workspace_id, due_date, is_priority_today, priority_rank, priority_note, snoozed_until, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.id,
            task.title,
            task.description || null,
            task.status || 'inbox',
            task.priority || 'normal',
            task.assigned_agent_id || null,
            task.created_by_agent_id || null,
            task.workspace_id || 'default',
            task.due_date || null,
            task.is_priority_today ? 1 : 0,
            task.priority_rank || null,
            task.priority_note || null,
            task.snoozed_until || null,
            task.created_at,
            task.updated_at,
          ]
        );
        taskInserted++;
      } catch (err) {
        console.error(`Failed to insert task ${task.id}:`, err);
      }
    }

    return NextResponse.json(
      {
        success: true,
        agents: { inserted: agentInserted, skipped: agentSkipped },
        tasks: { inserted: taskInserted, skipped: taskSkipped },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Import failed:', error);
    return NextResponse.json(
      { error: 'Import failed', details: String(error) },
      { status: 500 }
    );
  }
}

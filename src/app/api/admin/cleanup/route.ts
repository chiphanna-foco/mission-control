import { NextRequest, NextResponse } from 'next/server';
import { queryAll, run } from '@/lib/db';

/**
 * ADMIN CLEANUP ENDPOINT: /api/admin/cleanup
 * Removes duplicate agents/tasks, keeping only the most recent by updated_at
 */

export async function POST(request: NextRequest) {
  try {
    const adminToken = request.headers.get('X-Admin-Token');
    if (adminToken !== process.env.ADMIN_IMPORT_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find duplicate agents and keep only the most recent
    const duplicateAgents = queryAll<any>(`
      SELECT name, COUNT(*) as count
      FROM agents
      GROUP BY name
      HAVING count > 1
    `);

    let agentsDeleted = 0;
    for (const dup of duplicateAgents) {
      const toDelete = queryAll<any>(`
        SELECT id FROM agents
        WHERE name = ?
        ORDER BY updated_at DESC
        LIMIT -1 OFFSET 1
      `, [dup.name]);

      for (const agent of toDelete) {
        run('DELETE FROM agents WHERE id = ?', [agent.id]);
        agentsDeleted++;
      }
    }

    // Find duplicate tasks and keep only the most recent
    const duplicateTasks = queryAll<any>(`
      SELECT title, COUNT(*) as count
      FROM tasks
      GROUP BY title
      HAVING count > 1
    `);

    let tasksDeleted = 0;
    for (const dup of duplicateTasks) {
      const toDelete = queryAll<any>(`
        SELECT id FROM tasks
        WHERE title = ?
        ORDER BY updated_at DESC
        LIMIT -1 OFFSET 1
      `, [dup.title]);

      for (const task of toDelete) {
        run('DELETE FROM tasks WHERE id = ?', [task.id]);
        tasksDeleted++;
      }
    }

    const finalAgentCount = queryAll('SELECT COUNT(*) as count FROM agents')[0]?.count || 0;
    const finalTaskCount = queryAll('SELECT COUNT(*) as count FROM tasks')[0]?.count || 0;

    return NextResponse.json({
      success: true,
      cleaned: {
        agents_deleted: agentsDeleted,
        tasks_deleted: tasksDeleted,
      },
      remaining: {
        agents: finalAgentCount,
        tasks: finalTaskCount,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

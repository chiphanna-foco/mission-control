/**
 * Batch Readiness Check API
 * 
 * POST /api/planning/batch — Run readiness checks on all non-done tasks
 * Returns summary of which tasks are ready vs need planning
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryAll, run } from '@/lib/db';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_agent_id: string | null;
  due_date: string | null;
  planning_complete: number;
  planning_spec: string | null;
  blocked_on: string | null;
  blocked_reason: string | null;
}

interface GapSummary {
  taskId: string;
  title: string;
  status: string;
  ready: boolean;
  gaps: string[];
  suggestedAction: string;
}

function checkReadiness(task: TaskRow): GapSummary {
  const gaps: string[] = [];
  const desc = task.description || '';

  if (!desc || desc.length < 30) {
    gaps.push('No description or too brief');
  }
  if (!task.assigned_agent_id) {
    gaps.push('No agent assigned');
  }
  if (!task.due_date) {
    gaps.push('No due date');
  }
  if (task.blocked_on) {
    gaps.push(`Blocked on: ${task.blocked_on}`);
  }

  const isComplex = desc.length > 200 ||
    /\b(system|implement|build|create|develop|architect|design|scale|pipeline|automate)\b/i.test(task.title);
  if (isComplex && !task.planning_complete && !task.planning_spec) {
    gaps.push('Complex task needs planning');
  }

  const hasBlocking = gaps.some(g =>
    g.includes('No description') || g.includes('No agent') || g.includes('Blocked') || g.includes('needs planning')
  );

  return {
    taskId: task.id,
    title: task.title,
    status: task.status,
    ready: !hasBlocking,
    gaps,
    suggestedAction: hasBlocking ? 'needs_planning' : (gaps.length > 0 ? 'needs_approval' : 'auto_execute'),
  };
}

export async function POST() {
  try {
    const tasks = queryAll<TaskRow>(
      `SELECT id, title, description, status, priority, assigned_agent_id, due_date,
              planning_complete, planning_spec, blocked_on, blocked_reason
       FROM tasks WHERE status NOT IN ('done')`
    );

    const results: GapSummary[] = [];
    let readyCount = 0;
    let needsPlanningCount = 0;

    for (const task of tasks) {
      const summary = checkReadiness(task);
      results.push(summary);

      if (summary.ready) {
        readyCount++;
      } else {
        needsPlanningCount++;
      }

      // Update task suggestion based on readiness
      const nextStep = summary.ready
        ? 'Ready to execute. Readiness checks passed.'
        : `Needs planning: ${summary.gaps.join(', ')}. Open Planning tab.`;
      const action = summary.suggestedAction;

      run('UPDATE tasks SET suggested_next_step = ?, suggested_action = ? WHERE id = ?',
        [nextStep, action, task.id]);
    }

    return NextResponse.json({
      total: tasks.length,
      ready: readyCount,
      needsPlanning: needsPlanningCount,
      results,
    });
  } catch (error) {
    console.error('Batch readiness error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

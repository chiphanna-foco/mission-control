export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
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
  life_bucket: string | null;
  domain: string | null;
  effort_bucket: string | null;
  last_activity_at: string | null;
  deliverable_count: number;
  deliverable_done_count: number;
}

interface Suggestion {
  next_step: string;
  action: 'auto_execute' | 'needs_approval' | 'needs_planning' | 'blocked';
  readinessGaps?: string[];
}

/**
 * Readiness-aware suggestNextStep
 * 
 * Checks structural readiness (scope, owner, due date, dependencies, planning)
 * before making suggestions. If gaps exist, directs user to Planning tab.
 */
function suggestNextStep(task: TaskRow): Suggestion {
  // --- Readiness checks (run for all non-done tasks) ---
  const readinessGaps: string[] = [];
  const desc = task.description || '';

  if (!desc || desc.length < 30) {
    readinessGaps.push('No description or too brief to define scope');
  }
  if (!task.assigned_agent_id) {
    readinessGaps.push('No agent assigned');
  }
  if (!task.due_date) {
    readinessGaps.push('No due date set');
  }

  const isComplex = desc.length > 200 ||
    /\b(system|implement|build|create|develop|architect|design|scale|pipeline|automate|research|migrate)\b/i.test(task.title);

  if (isComplex && !task.planning_complete && !task.planning_spec) {
    readinessGaps.push('Complex task — needs planning before execution');
  }

  // --- Status-specific logic ---
  if (task.blocked_on) {
    return {
      next_step: 'Blocked on ' + task.blocked_on + (task.blocked_reason ? ': ' + task.blocked_reason : '') + '. Resolve blocker to continue.',
      action: 'blocked',
      readinessGaps,
    };
  }

  if (task.status === 'done') {
    return { next_step: 'Complete. No further action needed.', action: 'auto_execute' };
  }

  if (task.status === 'planning') {
    if (task.planning_complete) {
      return { next_step: 'Planning complete. Ready to move to inbox and assign an agent.', action: 'needs_approval', readinessGaps };
    }
    return { next_step: 'Planning in progress. Answer the planning questions to define scope.', action: 'needs_planning', readinessGaps };
  }

  // For inbox/assigned tasks: check readiness before suggesting execution
  if (task.status === 'inbox' || task.status === 'assigned') {
    const hasBlockingGaps = readinessGaps.some(g =>
      g.includes('No description') || g.includes('needs planning')
    );

    if (hasBlockingGaps) {
      const gapText = readinessGaps.join('; ');
      return {
        next_step: `Readiness gaps found: ${gapText}. Open Planning tab to resolve before assigning.`,
        action: 'needs_planning',
        readinessGaps,
      };
    }

    const isQuickWin = task.effort_bucket === 'quick-win' ||
      /\b(automate|schedule|set up|configure|enable)\b/i.test(task.title);

    if (task.status === 'inbox') {
      if (isQuickWin) {
        return { next_step: 'Quick win — ready to execute. Assign to ChipAI and auto-execute.', action: 'auto_execute', readinessGaps };
      }
      if (task.assigned_agent_id) {
        return { next_step: 'Assigned but in inbox. Move to in_progress to start work.', action: 'needs_approval', readinessGaps };
      }
      return { next_step: 'In inbox. Assign to an agent to proceed.', action: 'needs_approval', readinessGaps };
    }

    // assigned
    return { next_step: 'Assigned and ready. Move to in_progress to spin up a sub-agent.', action: 'needs_approval', readinessGaps };
  }

  if (task.status === 'in_progress') {
    // Stale task detection
    const lastActivity = task.last_activity_at;
    if (lastActivity) {
      const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceActivity > 14) {
        return {
          next_step: `⚠️ STALE: In progress but no activity for ${daysSinceActivity} days. Needs attention — restart, reassign, or move back to inbox.`,
          action: 'needs_approval',
          readinessGaps: [...readinessGaps, `No activity in ${daysSinceActivity} days`],
        };
      }
      if (daysSinceActivity > 7) {
        return {
          next_step: `In progress but last activity was ${daysSinceActivity} days ago. May need follow-up. Check activity log for updates.`,
          action: 'needs_approval',
          readinessGaps,
        };
      }
    } else {
      return {
        next_step: '⚠️ STALE: Marked in_progress but has zero activity logged. This is a plan, not active work — needs kickoff or reassignment.',
        action: 'needs_approval',
        readinessGaps: [...readinessGaps, 'No activity ever logged'],
      };
    }
    // Deliverable progress
    if (task.deliverable_count > 0) {
      const pct = Math.round((task.deliverable_done_count / task.deliverable_count) * 100);
      return {
        next_step: `In progress. ${task.deliverable_done_count}/${task.deliverable_count} deliverables done (${pct}%). Check activity log for updates.`,
        action: 'auto_execute',
        readinessGaps,
      };
    }
    return { next_step: 'In progress. Check activity log for updates. Move to review when ready.', action: 'auto_execute', readinessGaps };
  }

  if (task.status === 'testing') {
    return { next_step: 'In testing. Verify results, then move to review or back to in_progress.', action: 'needs_approval', readinessGaps };
  }

  if (task.status === 'review') {
    const lastActivity = task.last_activity_at;
    if (lastActivity) {
      const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceActivity > 7) {
        return {
          next_step: `Ready for review but sitting for ${daysSinceActivity} days. Approve, reject, or archive.`,
          action: 'needs_approval',
          readinessGaps,
        };
      }
    }
    return { next_step: 'Ready for review. Approve to mark done, or send back with feedback.', action: 'needs_approval', readinessGaps };
  }

  return { next_step: 'Check status and decide next action.', action: 'needs_approval', readinessGaps };
}

export async function POST() {
  try {
    const tasks = queryAll<TaskRow>(
      `SELECT t.id, t.title, t.description, t.status, t.priority, t.assigned_agent_id, t.due_date,
        t.planning_complete, t.planning_spec, t.blocked_on, t.blocked_reason, t.life_bucket, t.domain, t.effort_bucket,
        (SELECT MAX(a.created_at) FROM task_activities a WHERE a.task_id = t.id) as last_activity_at,
        (SELECT COUNT(*) FROM task_deliverables d WHERE d.task_id = t.id) as deliverable_count,
        (SELECT COUNT(*) FROM task_deliverables d WHERE d.task_id = t.id AND d.status = 'done') as deliverable_done_count
      FROM tasks t WHERE t.status != 'done'`
    );
    let updated = 0;
    for (const task of tasks) {
      const s = suggestNextStep(task);
      run('UPDATE tasks SET suggested_next_step = ?, suggested_action = ? WHERE id = ?', [s.next_step, s.action, task.id]);
      updated++;
    }
    return NextResponse.json({ updated, total: tasks.length });
  } catch (error) {
    console.error('Suggest error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const taskId = new URL(request.url).searchParams.get('id');
  if (!taskId) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
  try {
    const tasks = queryAll<TaskRow>(
      `SELECT t.id, t.title, t.description, t.status, t.priority, t.assigned_agent_id, t.due_date,
        t.planning_complete, t.planning_spec, t.blocked_on, t.blocked_reason, t.life_bucket, t.domain, t.effort_bucket,
        (SELECT MAX(a.created_at) FROM task_activities a WHERE a.task_id = t.id) as last_activity_at,
        (SELECT COUNT(*) FROM task_deliverables d WHERE d.task_id = t.id) as deliverable_count,
        (SELECT COUNT(*) FROM task_deliverables d WHERE d.task_id = t.id AND d.status = 'done') as deliverable_done_count
      FROM tasks t WHERE t.id = ?`,
      [taskId]
    );
    if (!tasks.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const s = suggestNextStep(tasks[0]);
    run('UPDATE tasks SET suggested_next_step = ?, suggested_action = ? WHERE id = ?', [s.next_step, s.action, taskId]);
    return NextResponse.json(s);
  } catch (error) {
    console.error('Suggest error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

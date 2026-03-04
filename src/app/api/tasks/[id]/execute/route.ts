import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, run } from '@/lib/db';
import { getOpenClawClient } from '@/lib/openclaw/client';
import { broadcast } from '@/lib/events';
import { getProjectsPath, getMissionControlUrl } from '@/lib/config';
import type { Task } from '@/lib/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/tasks/[id]/execute
 * 
 * "Start Building" button handler.
 * 
 * 1. Validates task is ready (planning complete, spec exists)
 * 2. Creates agent(s) from planning spec if needed
 * 3. Spawns execution session(s) with task spec
 * 4. Returns execution context OR clear blocker message
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 1. Get task + planning state
    const task = queryOne<any>(
      'SELECT * FROM tasks WHERE id = ?',
      [id]
    );

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 2. Check blockers
    const blockers: string[] = [];

    // Must have planning spec
    if (!task.planning_complete) {
      blockers.push('Planning not complete. Complete planning first.');
    }

    if (!task.planning_spec) {
      blockers.push('No planning spec generated. Run planning again.');
    }

    // Parse spec
    let spec: any = null;
    if (task.planning_spec) {
      try {
        spec = JSON.parse(task.planning_spec);
      } catch {
        blockers.push('Invalid planning spec. Contact support.');
      }
    }

    // Parse agents
    let agents: any[] = [];
    if (task.planning_agents) {
      try {
        agents = JSON.parse(task.planning_agents);
      } catch {
        blockers.push('Invalid agents list. Run planning again.');
      }
    }

    if (agents.length === 0) {
      blockers.push('No agents generated. Planning may have failed.');
    }

    // If blockers, return them
    if (blockers.length > 0) {
      return NextResponse.json({
        success: false,
        status: 'blocked',
        blockers,
        message: `Cannot start execution: ${blockers.join(' | ')}`
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 3. Auto-assign to default agent if not already assigned
    let agentId = task.assigned_agent_id;
    if (!agentId) {
      // Get or create default execution agent (ChipAI)
      let defaultAgent = queryOne<any>(
        'SELECT id FROM agents WHERE name = ? LIMIT 1',
        ['ChipAI']
      );

      if (!defaultAgent) {
        // Create ChipAI agent if it doesn't exist
        agentId = uuidv4();
        run(
          `INSERT INTO agents (id, name, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
          [agentId, 'ChipAI', 'standby', now, now]
        );
      } else {
        agentId = defaultAgent.id;
      }

      // Assign agent to task
      run(
        'UPDATE tasks SET assigned_agent_id = ?, updated_at = ? WHERE id = ?',
        [agentId, now, id]
      );
    }

    // 4. Update task status to in_progress
    run(
      'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
      ['in_progress', now, id]
    );

    // 5. Dispatch to assigned agent (inline dispatch logic)
    try {
      // Get agent details
      const agent = queryOne<any>(
        'SELECT * FROM agents WHERE id = ?',
        [agentId]
      );

      if (!agent) {
        throw new Error('Assigned agent not found');
      }

      // Build task message for agent
      const priorityMap: Record<string, string> = {
        low: '🔵',
        normal: '⚪',
        high: '🟡',
        urgent: '🔴'
      };
      const priorityEmoji = priorityMap[task.priority as string] || '⚪';

      // Get project path for deliverables
      const projectsPath = getProjectsPath();
      const projectDir = task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const taskProjectDir = `${projectsPath}/${projectDir}`;
      const missionControlUrl = getMissionControlUrl();

      const taskMessage = `${priorityEmoji} **NEW TASK ASSIGNED**

**Title:** ${task.title}
${task.description ? `**Description:** ${task.description}\n` : ''}
**Priority:** ${task.priority.toUpperCase()}
${task.due_date ? `**Due:** ${task.due_date}\n` : ''}
**Task ID:** ${task.id}

**OUTPUT DIRECTORY:** ${taskProjectDir}
Create this directory and save all deliverables there.

**PLANNING SPEC:**
${spec ? JSON.stringify(spec, null, 2) : 'No planning spec available'}

**IMPORTANT:** After completing work, you MUST call these APIs:
1. Log activity: POST ${missionControlUrl}/api/tasks/${task.id}/activities
   Body: {"activity_type": "completed", "message": "Description of what was done"}
2. Register deliverable: POST ${missionControlUrl}/api/tasks/${task.id}/deliverables
   Body: {"deliverable_type": "file", "title": "File name", "path": "${taskProjectDir}/filename.html"}
3. Update status: PATCH ${missionControlUrl}/api/tasks/${task.id}
   Body: {"status": "review"}

When complete, reply with:
\`TASK_COMPLETE: [brief summary of what you did]\`

If you need help or clarification, ask me (Charlie).`;

      // Get or create OpenClaw session for this agent
      let openClawSession = queryOne<any>(
        'SELECT * FROM openclaw_sessions WHERE agent_id = ? AND status = ?',
        [agentId, 'active']
      );

      if (!openClawSession) {
        // Create session record
        const sessionId = uuidv4();
        const openclawSessionId = `mission-control-${agent.name.toLowerCase().replace(/\s+/g, '-')}`;
        
        run(
          `INSERT INTO openclaw_sessions (id, agent_id, openclaw_session_id, channel, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [sessionId, agentId, openclawSessionId, 'mission-control', 'active', now, now]
        );

        openClawSession = queryOne<any>(
          'SELECT * FROM openclaw_sessions WHERE id = ?',
          [sessionId]
        );
      }

      if (!openClawSession) {
        throw new Error('Failed to create agent session');
      }

      // Send message to agent (using sessions_send which should work)
      const client = getOpenClawClient();
      if (!client.isConnected()) {
        try {
          await client.connect();
        } catch (err) {
          throw new Error('Cannot connect to OpenClaw Gateway');
        }
      }

      // Try to send message to agent using 'agent' method
      const sessionKey = `agent:main:${openClawSession.openclaw_session_id}`;
      await client.call('agent', {
        sessionKey,
        message: taskMessage,
        idempotencyKey: `execute-${task.id}-${Date.now()}`
      }, 60000);

      // Log execution start
      run(
        `INSERT INTO events (id, type, task_id, message, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          'execution_started',
          task.id,
          `Task dispatched to agent: ${agent.name}`,
          now
        ]
      );

      // Update agent status
      run(
        'UPDATE agents SET status = ?, updated_at = ? WHERE id = ?',
        ['working', now, agentId]
      );

      // Broadcast task update
      const updatedTask = queryOne<Task>('SELECT * FROM tasks WHERE id = ?', [id]);
      if (updatedTask) {
        broadcast({
          type: 'task_updated',
          payload: updatedTask,
        });
      }

      return NextResponse.json({
        success: true,
        status: 'executing',
        task_id: task.id,
        agent_id: agentId,
        agent_name: agent.name,
        message: `✅ Task execution started. ${agent.name} is working on: ${spec?.deliverables?.join(', ') || 'task'}`
      });

    } catch (dispatchErr) {
      console.error('Execution dispatch failed:', dispatchErr);
      
      return NextResponse.json({
        success: false,
        status: 'blocked',
        blockers: [
          'Execution dispatch failed',
          dispatchErr instanceof Error ? dispatchErr.message : 'Unknown error'
        ],
        message: `Cannot dispatch task: ${dispatchErr instanceof Error ? dispatchErr.message : 'Unknown error'}`
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Execute handler error:', error);
    return NextResponse.json(
      { 
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to execute task'
      },
      { status: 500 }
    );
  }
}

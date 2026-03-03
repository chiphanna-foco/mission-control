import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { run, queryOne } from '@/lib/db';
import type { Task } from '@/lib/types';

/**
 * POST /api/slack/sync-reaction
 * 
 * Handles incoming Slack emoji reaction events.
 * When a message receives an "eyes" emoji reaction, this endpoint:
 * 1. Extracts message text/thread
 * 2. Creates a new task in Mission Control
 * 3. Stores Slack metadata (channel, message_id, timestamp, reaction)
 * 
 * Expected request body:
 * {
 *   "type": "reaction_added" | "reaction_removed",
 *   "reaction": "eyes",
 *   "channel": "C1234567",
 *   "channel_name": "general",
 *   "message_id": "1234567890.123456",
 *   "timestamp": 1234567890,
 *   "text": "Message text that was reacted to",
 *   "thread_ts": "1234567890.000000",  // optional - if in a thread
 *   "user": "U1234567",
 *   "user_name": "john.doe",
 *   "reactor_user": "U7654321",
 *   "reactor_user_name": "jane.smith"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      type,
      reaction,
      channel,
      channel_name,
      message_id,
      timestamp,
      text,
      thread_ts,
      user,
      user_name,
      reactor_user,
      reactor_user_name,
    } = body;

    // Validate required fields
    if (!channel || !message_id || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: channel, message_id, text' },
        { status: 400 }
      );
    }

    // Only process "eyes" emoji reactions or when reaction is added
    if (reaction !== 'eyes' || type === 'reaction_removed') {
      return NextResponse.json(
        {
          success: true,
          message: `Reaction "${reaction}" ignored (only "eyes" emoji creates tasks)`,
        },
        { status: 200 }
      );
    }

    const taskId = uuidv4();
    const now = new Date().toISOString();

    // Build task description with Slack metadata
    const slackMetadata = {
      channel,
      channel_name,
      message_id,
      timestamp,
      thread_ts,
      message_author: { user, user_name },
      reacted_by: { user: reactor_user, user_name: reactor_user_name },
      reaction,
      source: 'slack_reaction',
    };

    const description = `
**Slack Reaction: Eyes 👀**
Channel: #${channel_name}
Message Author: @${user_name}
Reacted by: @${reactor_user_name}

Message: ${text}

[View in Slack](https://app.slack.com/archives/${channel}/p${message_id.replace('.', '')})

---
Metadata: ${JSON.stringify(slackMetadata)}
    `.trim();

    // Create task in Mission Control
    const result = run(
      `
        INSERT INTO tasks (
          id, 
          title, 
          description, 
          status, 
          priority, 
          workspace_id, 
          business_id, 
          created_at, 
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        taskId,
        `👀 ${text.substring(0, 55)}${text.length > 55 ? '...' : ''}`, // Title with eyes emoji
        description,
        'inbox', // Default to inbox
        'high', // Default to high priority (eyes reaction usually indicates urgency)
        'default', // Default workspace
        'default', // Default business
        now,
        now,
      ]
    );

    if (!result.success) {
      console.error('[Slack] Failed to create reaction task:', result.error);
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }

    // Fetch the created task
    const task = queryOne(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    ) as Task | null;

    return NextResponse.json(
      {
        success: true,
        message: 'Reaction synced and task created',
        task_id: taskId,
        task,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Slack] Reaction sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

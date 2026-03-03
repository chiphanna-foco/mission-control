import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { run, queryOne } from '@/lib/db';
import type { Task } from '@/lib/types';

/**
 * POST /api/slack/sync-bookmark
 * 
 * Handles incoming Slack bookmark events.
 * When a message is bookmarked in Slack, this endpoint:
 * 1. Extracts message text/thread
 * 2. Creates a new task in Mission Control
 * 3. Stores Slack metadata (channel, message_id, timestamp)
 * 
 * Expected request body:
 * {
 *   "channel": "C1234567",
 *   "channel_name": "general",
 *   "message_id": "1234567890.123456",
 *   "timestamp": 1234567890,
 *   "text": "Message text that was bookmarked",
 *   "thread_ts": "1234567890.000000",  // optional - if in a thread
 *   "user": "U1234567",
 *   "user_name": "john.doe"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      channel,
      channel_name,
      message_id,
      timestamp,
      text,
      thread_ts,
      user,
      user_name,
    } = body;

    // Validate required fields
    if (!channel || !message_id || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: channel, message_id, text' },
        { status: 400 }
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
      user,
      user_name,
      source: 'slack_bookmark',
    };

    const description = `
**Slack Bookmark**
Channel: #${channel_name}
User: @${user_name}
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
        `Slack: ${text.substring(0, 60)}${text.length > 60 ? '...' : ''}`, // Title from first 60 chars
        description,
        'inbox', // Default to inbox
        'normal', // Default priority
        'default', // Default workspace
        'default', // Default business
        now,
        now,
      ]
    );

    if (!result.success) {
      console.error('[Slack] Failed to create task:', result.error);
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
        message: 'Bookmark synced and task created',
        task_id: taskId,
        task,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Slack] Bookmark sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

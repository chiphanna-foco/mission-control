/**
 * Webhook Handler for Mission Control Approval Requests
 * Receives new approval requests and sends them to Chip's DM
 * Route: POST /api/slack/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { SlackApprovalBot } from '@/lib/slack-approval-bot';

const slackToken = process.env.SLACK_BOT_TOKEN;
const chipUserId = process.env.CHIP_USER_ID;
const webhookToken = process.env.WEBHOOK_TOKEN;

if (!slackToken || !chipUserId) {
  throw new Error('Missing required environment variables: SLACK_BOT_TOKEN, CHIP_USER_ID');
}

const slackClient = new WebClient(slackToken);
const bot = new SlackApprovalBot(slackClient, chipUserId, './data');

export async function POST(request: NextRequest) {
  try {
    // Verify webhook token if configured
    if (webhookToken) {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.split(' ')[1];

      if (token !== webhookToken) {
        console.warn('Invalid webhook token');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const body = await request.json();
    const { type, item } = body;

    if (type === 'new-approval-request') {
      return await handleNewApprovalRequest(item);
    } else if (type === 'test') {
      return NextResponse.json({ ok: true, message: 'Webhook is accessible' });
    }

    return NextResponse.json(
      { error: 'Unknown request type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in webhook handler:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle new approval request from Mission Control
 */
async function handleNewApprovalRequest(item: any) {
  try {
    // Validate required fields
    if (!item.id || !item.title || !item.type || !item.content || !item.sourceAgent) {
      return NextResponse.json(
        { error: 'Missing required fields: id, title, type, content, sourceAgent' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['email', 'social', 'blog'].includes(item.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: email, social, or blog' },
        { status: 400 }
      );
    }

    console.log(`📨 Received new approval request: ${item.id} (${item.title})`);

    // Load existing queue
    const queue = await bot.loadApprovalQueue();

    // Check for duplicates
    if (queue.some((i) => i.id === item.id)) {
      console.warn(`Item ${item.id} already in queue, skipping`);
      return NextResponse.json(
        {
          ok: true,
          message: 'Item already exists in queue',
          itemId: item.id,
        }
      );
    }

    // Add item to queue
    const newItem = {
      id: item.id,
      title: item.title,
      type: item.type,
      content: item.content,
      sourceAgent: item.sourceAgent,
      createdAt: item.createdAt || new Date().toISOString(),
      status: 'pending' as const,
    };

    queue.push(newItem);
    await bot.saveApprovalQueue(queue);

    console.log(`✅ Added item to queue: ${item.id}`);

    // Send Slack DM to Chip
    try {
      const messageTs = await bot.sendApprovalRequest(newItem);

      if (messageTs) {
        console.log(`✅ Sent approval request to Chip's DM: ${item.id}`);
        return NextResponse.json(
          {
            ok: true,
            message: 'Approval request sent',
            itemId: item.id,
            messageTs,
          },
          { status: 201 }
        );
      } else {
        console.error(`Failed to send Slack message for item ${item.id}`);
        return NextResponse.json(
          {
            ok: false,
            error: 'Failed to send Slack message',
            itemId: item.id,
          },
          { status: 500 }
        );
      }
    } catch (slackError) {
      console.error(`Slack API error for item ${item.id}:`, slackError);
      return NextResponse.json(
        {
          ok: false,
          error: slackError instanceof Error ? slackError.message : 'Slack API error',
          itemId: item.id,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error handling approval request:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    service: 'slack-approval-bot',
    webhook: '/api/slack/webhook',
    version: '1.0.0',
  });
}

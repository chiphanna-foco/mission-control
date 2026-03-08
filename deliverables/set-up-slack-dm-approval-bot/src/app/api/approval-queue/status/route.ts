/**
 * Approval Queue Status Endpoint
 * Returns current status of approval items
 * Route: GET /api/approval-queue/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { SlackApprovalBot } from '@/lib/slack-approval-bot';

const slackToken = process.env.SLACK_BOT_TOKEN;
const chipUserId = process.env.CHIP_USER_ID;

if (!slackToken || !chipUserId) {
  return NextResponse.json(
    { error: 'Server not configured' },
    { status: 500 }
  );
}

const slackClient = new WebClient(slackToken);
const bot = new SlackApprovalBot(slackClient, chipUserId, './data');

export async function GET(request: NextRequest) {
  try {
    const queue = await bot.loadApprovalQueue();
    const status = await bot.getQueueStatus();

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      summary: status,
      items: queue,
      pending: queue.filter((i) => i.status === 'pending'),
      approved: queue.filter((i) => i.status === 'approved'),
      rejected: queue.filter((i) => i.status === 'rejected'),
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Slack Events API Handler
 * Handles event subscriptions: reaction_added, reaction_removed, message events
 * Route: POST /api/slack/events
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { SlackApprovalBot } from '@/lib/slack-approval-bot';

const slackToken = process.env.SLACK_BOT_TOKEN;
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const chipUserId = process.env.CHIP_USER_ID;

if (!slackToken || !slackSigningSecret || !chipUserId) {
  throw new Error('Missing required Slack environment variables');
}

const slackClient = new WebClient(slackToken);
const bot = new SlackApprovalBot(slackClient, chipUserId, './data');

/**
 * Verify Slack request signature
 */
function verifySlackSignature(
  req: NextRequest,
  body: string
): boolean {
  const timestamp = req.headers.get('X-Slack-Request-Timestamp');
  const signature = req.headers.get('X-Slack-Signature');

  if (!timestamp || !signature) {
    return false;
  }

  // Check if timestamp is within 5 minutes
  const time = Math.floor(Date.now() / 1000);
  if (Math.abs(time - parseInt(timestamp)) > 300) {
    return false;
  }

  const crypto = require('crypto');
  const baseString = `v0:${timestamp}:${body}`;
  const hash = crypto
    .createHmac('sha256', slackSigningSecret)
    .update(baseString)
    .digest('hex');
  const computedSignature = `v0=${hash}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();

    // Verify Slack signature
    if (!verifySlackSignature(request, bodyText)) {
      console.warn('Invalid Slack signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const body = JSON.parse(bodyText);

    // Handle URL verification challenge
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Handle events
    if (body.type === 'event_callback') {
      const event = body.event;

      try {
        switch (event.type) {
          case 'reaction_added':
            await handleReactionAdded(event);
            break;

          case 'reaction_removed':
            await handleReactionRemoved(event);
            break;

          case 'message':
            if (event.subtype === 'message_replied') {
              await handleMessageReply(event);
            }
            break;

          default:
            console.log(`Unhandled event type: ${event.type}`);
        }
      } catch (error) {
        console.error('Error processing event:', error);
        // Still return 200 so Slack doesn't retry
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in Slack events handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle reaction_added event
 */
async function handleReactionAdded(event: any) {
  const { user, reaction, item } = event;

  console.log(`Reaction added: ${reaction} from ${user} on ${item.type} ${item.ts}`);

  const success = await bot.handleReactionAdded(
    user,
    reaction,
    item.ts,
    item.channel
  );

  if (success) {
    // Send confirmation emoji back
    try {
      await slackClient.reactions.add({
        channel: item.channel,
        timestamp: item.ts,
        name: 'white_check_mark',
      });
    } catch (error) {
      console.error('Error adding confirmation reaction:', error);
    }
  }
}

/**
 * Handle reaction_removed event
 */
async function handleReactionRemoved(event: any) {
  const { user, reaction, item } = event;

  console.log(`Reaction removed: ${reaction} from ${user}`);

  // For now, we don't revert decisions if reactions are removed
  // But you could implement undo logic here if needed
}

/**
 * Handle message replies (for rejection reason)
 */
async function handleMessageReply(event: any) {
  const { user, channel, text, thread_ts } = event;

  console.log(`Message reply from ${user} in ${channel}`);

  if (!text || !thread_ts) {
    return;
  }

  // Try to extract item ID from the thread parent message
  // This would require querying the message metadata
  try {
    const messageInfo = await slackClient.conversations.history({
      channel,
      latest: thread_ts,
      limit: 1,
      inclusive: true,
    });

    if (messageInfo.messages && messageInfo.messages[0]) {
      const parentMessage = messageInfo.messages[0];
      const metadata = (parentMessage as any).metadata;

      if (metadata?.event_type === 'rejection_reason_request') {
        const itemId = metadata.event_payload?.itemId;
        if (itemId) {
          await bot.rejectItem(itemId, text);
          console.log(`Updated rejection reason for item ${itemId}`);
        }
      }
    }
  } catch (error) {
    console.error('Error processing message reply:', error);
  }
}

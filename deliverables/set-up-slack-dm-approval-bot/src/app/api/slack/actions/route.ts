/**
 * Slack Interactive Components Handler
 * Handles button clicks and interactive actions
 * Route: POST /api/slack/actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { SlackApprovalBot } from '@/lib/slack-approval-bot';
import querystring from 'querystring';

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

    const payload = querystring.parse(bodyText);
    const body = JSON.parse(payload.payload as string);

    const { type, user, actions, trigger_id, response_url } = body;

    if (type === 'block_actions') {
      const action = actions[0];

      if (action.action_id?.startsWith('approve_')) {
        const itemId = action.action_id.replace('approve_', '');
        await handleApproveAction(itemId, trigger_id);
      } else if (action.action_id?.startsWith('reject_')) {
        const itemId = action.action_id.replace('reject_', '');
        await handleRejectAction(itemId, trigger_id);
      }

      // Respond immediately to avoid timeout
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in Slack actions handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle approve button action
 */
async function handleApproveAction(itemId: string, triggerId: string) {
  try {
    const success = await bot.approveItem(itemId);

    if (success) {
      await slackClient.views.open({
        trigger_id: triggerId,
        view: {
          type: 'modal',
          callback_id: 'approval_confirmation',
          title: {
            type: 'plain_text',
            text: 'Approved! ✅',
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `✅ Item \`${itemId}\` has been approved and will proceed.`,
              },
            },
          ],
        },
      });
    } else {
      await slackClient.views.open({
        trigger_id: triggerId,
        view: {
          type: 'modal',
          callback_id: 'approval_error',
          title: {
            type: 'plain_text',
            text: 'Error',
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `❌ Failed to approve item \`${itemId}\`. Please try again.`,
              },
            },
          ],
        },
      });
    }
  } catch (error) {
    console.error(`Error approving item ${itemId}:`, error);
  }
}

/**
 * Handle reject button action
 */
async function handleRejectAction(itemId: string, triggerId: string) {
  try {
    // Show modal to get rejection reason
    await slackClient.views.open({
      trigger_id: triggerId,
      view: {
        type: 'modal',
        callback_id: 'rejection_reason_modal',
        title: {
          type: 'plain_text',
          text: 'Reject Item',
        },
        submit: {
          type: 'plain_text',
          text: 'Reject',
        },
        blocks: [
          {
            type: 'input',
            block_id: 'reason_block',
            label: {
              type: 'plain_text',
              text: 'Rejection Reason',
            },
            element: {
              type: 'plain_text_input',
              action_id: 'reason_input',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: 'Why are you rejecting this?',
              },
            },
            optional: false,
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Item ID: \`${itemId}\``,
              },
            ],
          },
        ],
        private_metadata: JSON.stringify({ itemId }),
      },
    });
  } catch (error) {
    console.error(`Error opening rejection modal for item ${itemId}:`, error);
  }
}

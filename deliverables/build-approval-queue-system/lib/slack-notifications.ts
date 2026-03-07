import type { ApprovalItem } from './approval-queue';

/**
 * Send a Slack DM notification when an item enters the approval queue
 */
export async function notifySlackApprovalQueue(item: ApprovalItem): Promise<void> {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const slackUserId = process.env.SLACK_APPROVER_USER_ID || 'U1234567'; // Replace with actual user ID

  if (!slackToken) {
    console.warn('SLACK_BOT_TOKEN not configured. Slack notifications disabled.');
    return;
  }

  try {
    // Open a DM channel with the user
    const openDmResponse = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${slackToken}`,
      },
      body: JSON.stringify({
        users: slackUserId,
      }),
    });

    if (!openDmResponse.ok) {
      throw new Error(`Failed to open DM: ${openDmResponse.statusText}`);
    }

    const dmData = await openDmResponse.json() as { channel?: { id?: string } };
    const channelId = dmData.channel?.id;
    if (!channelId) {
      throw new Error('Failed to get channel ID');
    }

    // Send the notification message
    const messageResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${slackToken}`,
      },
      body: JSON.stringify({
        channel: channelId,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📋 New Approval Needed',
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Type:*\n${item.type}`,
              },
              {
                type: 'mrkdwn',
                text: `*Source:*\n${item.source_agent}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Title:*\n${item.title}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Preview:*\n${item.preview}`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '✅ Approve',
                },
                value: `approve_${item.id}`,
                style: 'primary',
                action_id: `approve_button_${item.id}`,
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '❌ Reject',
                },
                value: `reject_${item.id}`,
                style: 'danger',
                action_id: `reject_button_${item.id}`,
              },
            ],
          },
        ],
      }),
    });

    if (!messageResponse.ok) {
      throw new Error(`Failed to post message: ${messageResponse.statusText}`);
    }

    console.log(`[Slack] Sent approval notification for item ${item.id}`);
  } catch (error) {
    console.error('[Slack] Failed to send approval notification:', error);
    throw error;
  }
}

/**
 * Send a Slack DM notification when an item is approved or rejected
 */
export async function notifySlackApprovalDecision(
  item: ApprovalItem,
  decision: 'approved' | 'rejected',
  actor: string,
  reason?: string
): Promise<void> {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const slackUserId = process.env.SLACK_APPROVER_USER_ID || 'U1234567'; // Replace with actual user ID

  if (!slackToken) {
    console.warn('SLACK_BOT_TOKEN not configured. Slack notifications disabled.');
    return;
  }

  try {
    // Open a DM channel with the user
    const openDmResponse = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${slackToken}`,
      },
      body: JSON.stringify({
        users: slackUserId,
      }),
    });

    if (!openDmResponse.ok) {
      throw new Error(`Failed to open DM: ${openDmResponse.statusText}`);
    }

    const dmData = await openDmResponse.json() as { channel?: { id?: string } };
    const channelId = dmData.channel?.id;
    if (!channelId) {
      throw new Error('Failed to get channel ID');
    }

    const emoji = decision === 'approved' ? '✅' : '❌';
    const status = decision === 'approved' ? 'Approved' : 'Rejected';
    const color = decision === 'approved' ? '#36a64f' : '#e74c3c';

    // Build blocks array
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Item ${status}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Status:*\n${status}`,
          },
          {
            type: 'mrkdwn',
            text: `*Reviewed by:*\n${actor}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Title:*\n${item.title}`,
        },
      },
    ];

    if (reason && decision === 'rejected') {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Reason:*\n${reason}`,
        },
      });
    }

    // Send the notification message
    const messageResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${slackToken}`,
      },
      body: JSON.stringify({
        channel: channelId,
        blocks,
      }),
    });

    if (!messageResponse.ok) {
      throw new Error(`Failed to post message: ${messageResponse.statusText}`);
    }

    console.log(`[Slack] Sent ${decision} notification for item ${item.id}`);
  } catch (error) {
    console.error(`[Slack] Failed to send ${decision} notification:`, error);
    throw error;
  }
}

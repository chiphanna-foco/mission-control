/**
 * Slack Approval Bot Core Logic
 * Handles approval requests, manages reactions, and syncs with approval queue
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface ApprovalQueueItem {
  id: string;
  title: string;
  type: 'email' | 'social' | 'blog';
  content: string;
  sourceAgent: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface SlackMessage {
  ts: string;
  channel: string;
  userId: string;
  itemId: string;
}

export class SlackApprovalBot {
  private queueFilePath: string;
  private messagesMapPath: string;
  private chipUserId: string;
  private slackClient: any;

  constructor(slackClient: any, chipUserId: string, dataDir: string = './data') {
    this.slackClient = slackClient;
    this.chipUserId = chipUserId;
    this.queueFilePath = path.join(dataDir, 'approval-queue.json');
    this.messagesMapPath = path.join(dataDir, 'slack-messages-map.json');
  }

  /**
   * Format approval message for Slack
   */
  formatApprovalMessage(item: ApprovalQueueItem): {
    text: string;
    blocks: any[];
  } {
    const preview = item.content.substring(0, 200) + (item.content.length > 200 ? '...' : '');
    const typeLabel = this.getTypeLabel(item.type);

    return {
      text: `Approval needed: ${item.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📋 ${typeLabel} Approval`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Title:*\n${item.title}`,
            },
            {
              type: 'mrkdwn',
              text: `*Type:*\n${typeLabel}`,
            },
            {
              type: 'mrkdwn',
              text: `*Source:*\n${item.sourceAgent}`,
            },
            {
              type: 'mrkdwn',
              text: `*Created:*\n${new Date(item.createdAt).toLocaleString()}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Preview:*\n\`\`\`\n${preview}\n\`\`\``,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '👍 Approve',
                emoji: true,
              },
              value: `approve_${item.id}`,
              action_id: `approve_${item.id}`,
              style: 'primary',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '👎 Reject',
                emoji: true,
              },
              value: `reject_${item.id}`,
              action_id: `reject_${item.id}`,
              style: 'danger',
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Item ID: \`${item.id}\``,
            },
          ],
        },
      ],
    };
  }

  /**
   * Send approval request to Chip's DM
   */
  async sendApprovalRequest(item: ApprovalQueueItem): Promise<string | null> {
    try {
      const message = this.formatApprovalMessage(item);

      const result = await this.slackClient.conversations.open({
        users: this.chipUserId,
      });

      const channelId = result.channel.id;

      const sentMessage = await this.slackClient.chat.postMessage({
        channel: channelId,
        ...message,
      });

      if (sentMessage.ok) {
        await this.saveMessageMapping({
          ts: sentMessage.ts,
          channel: channelId,
          userId: this.chipUserId,
          itemId: item.id,
        });

        return sentMessage.ts;
      }
    } catch (error) {
      console.error(`Error sending approval request for item ${item.id}:`, error);
    }

    return null;
  }

  /**
   * Handle reaction_added event
   */
  async handleReactionAdded(
    userId: string,
    reaction: string,
    messageTs: string,
    channelId: string
  ): Promise<boolean> {
    // Only process reactions from Chip
    if (userId !== this.chipUserId) {
      return false;
    }

    const messageMap = await this.loadMessageMapping();
    const messageKey = `${channelId}_${messageTs}`;

    const mappingEntry = Object.values(messageMap).find(
      (entry: any) => entry.channel === channelId && entry.ts === messageTs
    );

    if (!mappingEntry) {
      console.warn(`No message mapping found for ${messageKey}`);
      return false;
    }

    const itemId = (mappingEntry as any).itemId;

    if (reaction === '+1' || reaction === 'thumbsup') {
      return await this.approveItem(itemId);
    } else if (reaction === '-1' || reaction === 'thumbsdown') {
      return await this.rejectItem(itemId);
    }

    return false;
  }

  /**
   * Approve an item
   */
  async approveItem(itemId: string): Promise<boolean> {
    try {
      const queue = await this.loadApprovalQueue();
      const item = queue.find((i) => i.id === itemId);

      if (!item) {
        console.error(`Item ${itemId} not found in queue`);
        return false;
      }

      item.status = 'approved';
      await this.saveApprovalQueue(queue);

      console.log(`Item ${itemId} approved`);
      return true;
    } catch (error) {
      console.error(`Error approving item ${itemId}:`, error);
      return false;
    }
  }

  /**
   * Reject an item (and send follow-up for reason)
   */
  async rejectItem(itemId: string, reason?: string): Promise<boolean> {
    try {
      const queue = await this.loadApprovalQueue();
      const item = queue.find((i) => i.id === itemId);

      if (!item) {
        console.error(`Item ${itemId} not found in queue`);
        return false;
      }

      item.status = 'rejected';
      if (reason) {
        item.rejectionReason = reason;
      }

      await this.saveApprovalQueue(queue);

      // Send follow-up DM asking for rejection reason
      if (!reason) {
        await this.requestRejectionReason(itemId);
      }

      console.log(`Item ${itemId} rejected`);
      return true;
    } catch (error) {
      console.error(`Error rejecting item ${itemId}:`, error);
      return false;
    }
  }

  /**
   * Request rejection reason via DM
   */
  async requestRejectionReason(itemId: string): Promise<void> {
    try {
      const result = await this.slackClient.conversations.open({
        users: this.chipUserId,
      });

      const channelId = result.channel.id;

      await this.slackClient.chat.postMessage({
        channel: channelId,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Please provide a rejection reason for item \`${itemId}\`. You can reply to this message with your reason.`,
            },
          },
        ],
        metadata: {
          event_type: 'rejection_reason_request',
          event_payload: {
            itemId,
          },
        },
      });
    } catch (error) {
      console.error(`Error requesting rejection reason for item ${itemId}:`, error);
    }
  }

  /**
   * Get human-readable type label
   */
  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      email: '📧 Email',
      social: '📱 Social Post',
      blog: '📝 Blog Article',
    };
    return labels[type] || type;
  }

  /**
   * Load approval queue from file
   */
  async loadApprovalQueue(): Promise<ApprovalQueueItem[]> {
    try {
      const data = await fs.readFile(this.queueFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Queue file doesn't exist yet, return empty array
      return [];
    }
  }

  /**
   * Save approval queue to file
   */
  async saveApprovalQueue(queue: ApprovalQueueItem[]): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.queueFilePath), { recursive: true });
      await fs.writeFile(this.queueFilePath, JSON.stringify(queue, null, 2));
    } catch (error) {
      console.error('Error saving approval queue:', error);
      throw error;
    }
  }

  /**
   * Load message mapping from file
   */
  async loadMessageMapping(): Promise<Record<string, SlackMessage>> {
    try {
      const data = await fs.readFile(this.messagesMapPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  /**
   * Save message mapping to file
   */
  async saveMessageMapping(message: SlackMessage): Promise<void> {
    try {
      const mapping = await this.loadMessageMapping();
      const key = `${message.channel}_${message.ts}`;
      mapping[key] = message;

      await fs.mkdir(path.dirname(this.messagesMapPath), { recursive: true });
      await fs.writeFile(this.messagesMapPath, JSON.stringify(mapping, null, 2));
    } catch (error) {
      console.error('Error saving message mapping:', error);
      throw error;
    }
  }

  /**
   * Get current queue status
   */
  async getQueueStatus(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const queue = await this.loadApprovalQueue();
    return {
      pending: queue.filter((i) => i.status === 'pending').length,
      approved: queue.filter((i) => i.status === 'approved').length,
      rejected: queue.filter((i) => i.status === 'rejected').length,
    };
  }
}

#!/usr/bin/env node

/**
 * Approval Status Sync Script
 * Run periodically to sync approval status with Mission Control dashboard
 * Can be triggered via launchd (macOS) or systemd timer (Linux)
 */

import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';

const dataDir = process.env.DATA_DIR || './data';
const queueFilePath = path.join(dataDir, 'approval-queue.json');
const dashboardWebhookUrl = process.env.DASHBOARD_WEBHOOK_URL;

interface ApprovalQueueItem {
  id: string;
  title: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  updatedAt?: string;
}

async function loadApprovalQueue(): Promise<ApprovalQueueItem[]> {
  try {
    const data = await fs.readFile(queueFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Approval queue not found, returning empty array');
    return [];
  }
}

async function syncWithDashboard(queue: ApprovalQueueItem[]): Promise<void> {
  if (!dashboardWebhookUrl) {
    console.warn('DASHBOARD_WEBHOOK_URL not set, skipping sync');
    return;
  }

  try {
    const payload = {
      timestamp: new Date().toISOString(),
      items: queue,
      summary: {
        total: queue.length,
        pending: queue.filter((i) => i.status === 'pending').length,
        approved: queue.filter((i) => i.status === 'approved').length,
        rejected: queue.filter((i) => i.status === 'rejected').length,
      },
    };

    await axios.post(dashboardWebhookUrl, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SlackApprovalBot/1.0',
      },
    });

    console.log(`✅ Synced ${queue.length} items with dashboard`);
  } catch (error) {
    console.error('Error syncing with dashboard:', error);
    // Continue even if sync fails - don't block the process
  }
}

async function processQueue(): Promise<void> {
  const queue = await loadApprovalQueue();

  if (queue.length === 0) {
    console.log('No items in approval queue');
    return;
  }

  // Add updatedAt timestamp to items that have changed status
  const now = new Date().toISOString();
  for (const item of queue) {
    if (item.status !== 'pending') {
      item.updatedAt = now;
    }
  }

  // Save updated queue
  await fs.mkdir(path.dirname(queueFilePath), { recursive: true });
  await fs.writeFile(queueFilePath, JSON.stringify(queue, null, 2));

  // Sync with dashboard
  await syncWithDashboard(queue);

  // Log summary
  const pending = queue.filter((i) => i.status === 'pending');
  const approved = queue.filter((i) => i.status === 'approved');
  const rejected = queue.filter((i) => i.status === 'rejected');

  console.log(`Queue Status:`);
  console.log(`  Pending: ${pending.length}`);
  console.log(`  Approved: ${approved.length}`);
  console.log(`  Rejected: ${rejected.length}`);

  if (pending.length > 0) {
    console.log('\nPending approvals:');
    pending.forEach((item) => {
      console.log(`  - ${item.id}: ${item.title}`);
    });
  }
}

// Run the sync
processQueue().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

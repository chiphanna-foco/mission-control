#!/usr/bin/env node

/**
 * Mission Control → Slack Integration
 * 
 * Two features:
 * 1. Real-time task updates (status changes + completions) → #chip-aiops
 * 2. 3x daily digest (8 AM, 1 PM, 6 PM MT) of blocked/urgent tasks
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../mission-control.db');
const stateFile = path.join(__dirname, '../.mc-slack-state.json');

const SLACK_CHANNEL = 'C0AD1LRLS5C'; // #chip-aiops
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

if (!SLACK_WEBHOOK) {
  console.error('SLACK_WEBHOOK_URL not set');
  process.exit(1);
}

// Initialize database
const db = new Database(dbPath);

/**
 * Load or initialize state file
 */
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return {
      lastSeenTaskIds: {},
      lastChecked: new Date().toISOString()
    };
  }
}

function saveState(state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

/**
 * Post to Slack
 */
async function postToSlack(message) {
  try {
    const response = await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: SLACK_CHANNEL,
        text: message.text || '',
        blocks: message.blocks || []
      })
    });
    if (!response.ok) {
      console.error('Slack post failed:', response.status, await response.text());
    }
  } catch (err) {
    console.error('Slack webhook error:', err.message);
  }
}

/**
 * Format task for Slack
 */
function taskBlock(task) {
  const dueDateStr = task.due_date ? ` • Due: ${task.due_date}` : '';
  const blockedStr = task.blocked_on ? ` 🔒 Blocked: ${task.blocked_reason || 'awaiting input'}` : '';
  
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*${task.title}*${dueDateStr}${blockedStr}\n_Status: ${task.status.toUpperCase()}_`
    }
  };
}

/**
 * FEATURE 1: Real-time task updates (status + completion)
 */
async function checkForUpdates() {
  const state = loadState();
  
  // Get all non-done tasks
  const tasks = db.prepare(`
    SELECT id, title, status, blocked_on, blocked_reason, due_date, updated_at
    FROM tasks
    WHERE status != 'done'
    ORDER BY updated_at DESC
    LIMIT 100
  `).all();

  const now = new Date(state.lastChecked);
  
  for (const task of tasks) {
    const updatedAt = new Date(task.updated_at);
    
    // Check if this task was updated since last check
    if (updatedAt > now) {
      const prev = state.lastSeenTaskIds[task.id];
      
      // Status change or newly created
      if (!prev || prev.status !== task.status) {
        await postToSlack({
          text: `Task updated: ${task.title}`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '✅ Task Updated'
              }
            },
            taskBlock(task),
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'View in MC' },
                  url: `http://localhost:3000/task/${task.id}`,
                  style: 'primary'
                }
              ]
            }
          ]
        });
      }
      
      state.lastSeenTaskIds[task.id] = { status: task.status, updated_at: task.updated_at };
    }
  }
  
  state.lastChecked = new Date().toISOString();
  saveState(state);
}

/**
 * FEATURE 2: 3x daily digest of blocked/urgent tasks
 */
async function postDailyDigest() {
  // Get tasks blocked on Chip or high priority
  const blockedTasks = db.prepare(`
    SELECT id, title, status, blocked_on, blocked_reason, due_date, priority
    FROM tasks
    WHERE status != 'done'
      AND (blocked_on IS NOT NULL OR priority IN ('urgent', 'high'))
    ORDER BY 
      CASE WHEN status IN ('planning', 'blocked') THEN 0 ELSE 1 END,
      CASE 
        WHEN priority = 'urgent' THEN 0
        WHEN priority = 'high' THEN 1
        ELSE 2
      END,
      due_date ASC
  `).all();

  if (blockedTasks.length === 0) {
    await postToSlack({
      text: '✨ No blocked or urgent tasks! You\'re clear.'
    });
    return;
  }

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '⏳ Waiting on You'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${blockedTasks.length} task${blockedTasks.length !== 1 ? 's' : ''} blocked or urgent`
      }
    }
  ];

  // Group by blocked vs high-priority
  const blocked = blockedTasks.filter(t => t.blocked_on);
  const urgent = blockedTasks.filter(t => !t.blocked_on && t.priority !== 'normal');

  if (blocked.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*🔒 Blocked (waiting for your input):*'
      }
    });
    blocked.slice(0, 5).forEach(t => blocks.push(taskBlock(t)));
  }

  if (urgent.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*🔴 High Priority / Urgent:*'
      }
    });
    urgent.slice(0, 5).forEach(t => blocks.push(taskBlock(t)));
  }

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'View All in MC' },
        url: 'http://localhost:3000',
        style: 'primary'
      }
    ]
  });

  await postToSlack({ blocks });
}

/**
 * Main
 */
async function main() {
  const mode = process.argv[2];

  if (mode === 'watch') {
    // Real-time polling
    console.log('Starting real-time task monitor...');
    setInterval(() => {
      checkForUpdates().catch(err => console.error('Watch error:', err.message));
    }, 30000); // Check every 30s
  } else if (mode === 'digest') {
    // One-shot digest
    console.log('Posting daily digest...');
    await postDailyDigest();
  } else {
    console.log('Usage: mc-slack-integration.mjs [watch|digest]');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

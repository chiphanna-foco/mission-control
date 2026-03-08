# Integration Guide - Slack Approval Bot + Mission Control Approval Queue

This guide explains how to integrate the Slack approval bot with your existing Mission Control approval queue system (built in mc-002).

## Architecture Overview

```
Mission Control (mc-002)
    ↓
Approval Queue System
    ↓ (new approval)
Slack Approval Bot
    ↓ (sends DM to Chip)
Chip's Slack DM
    ↓ (reaction: 👍 or 👎)
Slack Events API
    ↓
Approval Bot Handler
    ↓ (update status)
Approval Queue
    ↓ (sync every 5min)
Dashboard
```

## Prerequisites

- Mission Control approval queue system running
- Slack bot configured and running (see SLACK-SETUP.md)
- Shared data directory accessible to both systems

## Step 1: Unified Data Storage

Both systems need access to the same approval queue file. Options:

### Option A: Shared File System (Recommended)

```
~/Documents/Shared/projects/
  ├── mission-control/
  │   └── data/approval-queue.json
  └── set-up-slack-dm-approval-bot/
      └── data/ → symlink to mission-control/data
```

**Setup:**

```bash
cd ~/Documents/Shared/projects/set-up-slack-dm-approval-bot
ln -s ../mission-control/data data
```

### Option B: Shared Database

Use a database (SQLite, PostgreSQL) instead of JSON files for better concurrency:

```typescript
// Both systems read/write to the same DB
const approvalDb = new Database('sqlite:///shared/approval-queue.db');
```

### Option C: Message Queue

Use a message queue (Redis, RabbitMQ) to publish queue changes:

```typescript
// Mission Control publishes new items
approvalQueue.on('new-item', (item) => {
  publishToQueue('approval.new', item);
});

// Slack bot listens for updates
subscribeToQueue('approval.updated', (update) => {
  updateLocalQueue(update);
});
```

## Step 2: Create the Hook Function

In your Mission Control approval queue system, add a hook to notify the Slack bot of new items:

**File: `mission-control/src/lib/approval-queue.ts`**

```typescript
import axios from 'axios';

interface ApprovalQueueItem {
  id: string;
  title: string;
  type: 'email' | 'social' | 'blog';
  content: string;
  sourceAgent: string;
  status: 'pending' | 'approved' | 'rejected';
}

// After adding a new item to queue
async function notifySlackBot(item: ApprovalQueueItem) {
  const slackBotUrl = process.env.SLACK_BOT_WEBHOOK_URL;
  
  if (!slackBotUrl) {
    console.warn('SLACK_BOT_WEBHOOK_URL not configured');
    return;
  }

  try {
    await axios.post(slackBotUrl, {
      type: 'new-approval-request',
      item: {
        id: item.id,
        title: item.title,
        type: item.type,
        content: item.content,
        sourceAgent: item.sourceAgent,
        createdAt: new Date().toISOString(),
      },
    }, {
      timeout: 5000,
    });

    console.log(`✅ Notified Slack bot about item ${item.id}`);
  } catch (error) {
    console.error(`Failed to notify Slack bot: ${error}`);
    // Don't fail the entire operation if Slack notification fails
  }
}

export { notifySlackBot };
```

## Step 3: Create Webhook Route in Slack Bot

**File: `src/app/api/slack/webhook/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { SlackApprovalBot } from '@/lib/slack-approval-bot';

const slackToken = process.env.SLACK_BOT_TOKEN;
const chipUserId = process.env.CHIP_USER_ID;

const slackClient = new WebClient(slackToken);
const bot = new SlackApprovalBot(slackClient, chipUserId, './data');

export async function POST(request: NextRequest) {
  try {
    // Verify webhook token
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (token !== process.env.WEBHOOK_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (body.type === 'new-approval-request') {
      const { item } = body;

      // Load existing queue
      const queue = await bot.loadApprovalQueue();

      // Add new item
      queue.push({
        ...item,
        status: 'pending' as const,
      });

      // Save updated queue
      await bot.saveApprovalQueue(queue);

      // Send Slack DM to Chip
      const messageTs = await bot.sendApprovalRequest(item);

      if (messageTs) {
        console.log(`✅ Sent approval request to Chip: ${item.id}`);
        return NextResponse.json({
          ok: true,
          messageTs,
          itemId: item.id,
        });
      } else {
        throw new Error('Failed to send Slack message');
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in webhook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

## Step 4: Configure Environment Variables

### Mission Control (.env.local)

```env
# Slack Bot Webhook
SLACK_BOT_WEBHOOK_URL=http://localhost:3001/api/slack/webhook
SLACK_BOT_WEBHOOK_TOKEN=your-secure-token-here
```

### Slack Bot (.env.local)

```env
# Webhook security
WEBHOOK_TOKEN=your-secure-token-here

# Path to shared approval queue
DATA_DIR=../mission-control/data
DASHBOARD_WEBHOOK_URL=http://localhost:3000/api/approval-queue/webhook
```

## Step 5: Update Dashboard Integration

The approval queue dashboard needs to display status updates from the Slack bot.

**File: `mission-control/src/app/api/approval-queue/webhook/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timestamp, items, summary } = body;

    // Log update from Slack bot
    console.log(`📊 Approval queue synced at ${timestamp}`);
    console.log(`   Pending: ${summary.pending}, Approved: ${summary.approved}, Rejected: ${summary.rejected}`);

    // Optionally store sync history
    const syncLog = {
      timestamp,
      summary,
    };

    // Broadcast update to connected dashboard clients via WebSocket
    // (Implementation depends on your dashboard setup)

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error processing sync webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
```

## Step 6: Test the Integration

### 1. Start Both Services

```bash
# Terminal 1: Mission Control
cd mission-control
npm run dev

# Terminal 2: Slack Approval Bot
cd set-up-slack-dm-approval-bot
npm run dev
```

### 2. Create a Test Approval Item

In Mission Control, create a new approval item:

```bash
curl -X POST http://localhost:3000/api/approval-queue \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Email",
    "type": "email",
    "content": "This is a test email content...",
    "sourceAgent": "email-draft-agent"
  }'
```

### 3. Verify Slack Message

- Check Chip's Slack DMs - should see the approval request
- Click 👍 to approve or 👎 to reject

### 4. Verify Status Update

- Check the approval queue in Mission Control
- Status should update to "approved" or "rejected"
- Dashboard should reflect the change

## Step 7: Monitor Sync Status

The bot syncs approval status every 5 minutes (configurable). Monitor with:

```bash
# Check logs
tail -f /var/log/slack-approval-bot.log

# View current queue status
cat data/approval-queue.json | jq '.[] | {id, status}'
```

## Troubleshooting Integration

### Items not appearing in Slack DM

1. **Verify webhook is reachable:**
   ```bash
   curl -X POST http://localhost:3001/api/slack/webhook \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"type":"test"}'
   ```

2. **Check bot can open DMs:**
   ```bash
   # Test Slack API
   curl -X POST https://slack.com/api/conversations.open \
     -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
     -d "users=CHIP_USER_ID"
   ```

3. **Check data directory permissions:**
   ```bash
   ls -la data/
   chmod 755 data/
   ```

### Approval status not syncing to dashboard

1. **Verify webhook URL is accessible:**
   ```bash
   curl http://localhost:3000/api/approval-queue/webhook
   ```

2. **Check sync logs:**
   ```bash
   tail -f scripts/sync.log
   ```

3. **Manual sync test:**
   ```bash
   node scripts/sync-approval-status.ts
   ```

### Slack API errors

1. **"not_in_channel"** - Bot doesn't have access to channel
   - Ensure bot is added to the workspace
   - Check OAuth scopes

2. **"channel_not_found"** - DM channel doesn't exist
   - Verify CHIP_USER_ID format (should be `UXXX...`)
   - Try opening DM manually first

3. **"invalid_auth"** - Token is invalid/expired
   - Regenerate bot token in Slack app settings
   - Update `.env.local`

## Performance Considerations

### High Volume of Approvals

If you're processing many items per minute:

1. **Use database instead of JSON**
   - Better concurrent access
   - Faster queries

2. **Increase sync frequency**
   - Change `OnUnitActiveSec=1min` in systemd timer
   - Or adjust `StartInterval=60` in launchd plist

3. **Add caching**
   - Cache queue status in memory
   - Periodically flush to disk

### Example Database Migration

```typescript
import Database from 'better-sqlite3';

const db = new Database('approval-queue.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    sourceAgent TEXT NOT NULL,
    status TEXT NOT NULL,
    rejectionReason TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_status ON approvals(status);
  CREATE INDEX IF NOT EXISTS idx_createdAt ON approvals(createdAt);
`);
```

## Security Notes

1. **Webhook Token**
   - Use a strong random token
   - Rotate periodically
   - Store in environment variables only

2. **Signing Secrets**
   - Verify Slack request signatures in event handlers
   - Don't trust untrusted sources

3. **Data Access**
   - Restrict file permissions on data directory
   - Use OAuth scopes least privilege
   - Audit who can create approval requests

## Next Steps

- Set up monitoring/alerting for bot failures
- Implement retry logic for failed notifications
- Add approval templates for different content types
- Create an admin dashboard to manage pending approvals

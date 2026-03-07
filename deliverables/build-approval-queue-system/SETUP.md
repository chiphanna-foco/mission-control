# Approval Queue System - Setup Guide

This guide walks you through setting up the Approval Queue System in Mission Control.

## Prerequisites

- Mission Control running on `/Users/chipai/workshop`
- Node.js 18+ and npm installed
- Slack workspace (optional, for notifications)

## Step 1: Copy Files to Mission Control

Copy all files from this project to your Mission Control installation:

```bash
# Navigate to the project directory
cd ~/Documents/Shared/projects/build-approval-queue-system

# Copy library files
mkdir -p /Users/chipai/workshop/src/lib/approval-queue
cp lib/* /Users/chipai/workshop/src/lib/

# Copy API routes
mkdir -p /Users/chipai/workshop/src/app/api/approvals/[id]/{approve,reject}
cp api/approvals/route.ts /Users/chipai/workshop/src/app/api/approvals/
cp api/approvals/\[id\]/route.ts /Users/chipai/workshop/src/app/api/approvals/\[id\]/
cp api/approvals/\[id\]/approve/route.ts /Users/chipai/workshop/src/app/api/approvals/\[id\]/approve/
cp api/approvals/\[id\]/reject/route.ts /Users/chipai/workshop/src/app/api/approvals/\[id\]/reject/

# Copy components
mkdir -p /Users/chipai/workshop/src/components/approval-queue
cp components/* /Users/chipai/workshop/src/components/

# Copy pages
mkdir -p /Users/chipai/workshop/src/app/approvals
cp pages/approvals/page.tsx /Users/chipai/workshop/src/app/approvals/
```

## Step 2: Configure Environment Variables

Add to `/Users/chipai/workshop/.env.local`:

```env
# Required for file-based queue storage
# (uses default /data/approval-queue if not set)
QUEUE_ROOT=/data/approval-queue

# Optional: Slack integration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_APPROVER_USER_ID=U1234567890
```

### Getting Slack Credentials (Optional)

1. **Create a Slack App:**
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Name it "Mission Control Approvals"
   - Select your workspace

2. **Add Permissions:**
   - Go to "OAuth & Permissions"
   - Under "Scopes" → "Bot Token Scopes", add:
     - `chat:write`
     - `conversations:open`
   - Save changes

3. **Install App:**
   - Click "Install to Workspace"
   - Authorize the app
   - Copy the "Bot User OAuth Token" (starts with `xoxb-`)
   - Paste into `.env.local` as `SLACK_BOT_TOKEN`

4. **Find Your User ID:**
   - In Slack, click your profile picture
   - Click "Copy user ID"
   - Paste into `.env.local` as `SLACK_APPROVER_USER_ID`

## Step 3: Verify Installation

### Check API Endpoints

```bash
# Test creating an approval item
curl -X POST http://localhost:3000/api/approvals \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "title": "Test Email",
    "preview": "This is a test email preview",
    "content": "<p>Full email content here</p>",
    "source_agent": "test-agent",
    "metadata": {"test": true}
  }'

# Should return 201 with the created item
```

### Check Queue Directory

```bash
# Verify queue directory was created
ls -la /data/approval-queue/
# Output: pending/ approved/ rejected/ audit.log

# Should have one pending file
ls /data/approval-queue/pending/
```

### Test the Dashboard

1. Start Mission Control:
   ```bash
   cd /Users/chipai/workshop
   npm run dev
   ```

2. Navigate to http://localhost:3000/approvals

3. You should see an empty "All caught up!" message

## Step 4: Integrate Dashboard Widget

Add the Approval Queue Widget to your Mission Control dashboard:

1. Open `/Users/chipai/workshop/src/app/page.tsx` (or your dashboard file)

2. Import the widget:
   ```tsx
   import { ApprovalQueueWidget } from '@/components/ApprovalQueueWidget';
   ```

3. Add to your dashboard layout:
   ```tsx
   export default function Dashboard() {
     return (
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {/* Your other widgets */}
         
         {/* Add the approval queue widget */}
         <ApprovalQueueWidget 
           onRefresh={() => {
             // Optional: refresh other parts of dashboard
           }} 
         />
       </div>
     );
   }
   ```

4. Restart the dev server and visit the dashboard

## Step 5: Test the Complete Flow

### 1. Submit an Item for Approval

```bash
curl -X POST http://localhost:3000/api/approvals \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "title": "Weekly Newsletter - Week 10",
    "preview": "This weeks top 5 bedsheet comparisons and new market trends",
    "content": "<h1>Weekly Newsletter</h1><p>Full newsletter HTML content...</p>",
    "source_agent": "newsletter-generator",
    "metadata": {
      "week": 10,
      "recipients": "newsletter@list.com"
    }
  }'
```

**Response** (note the item ID):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "email",
  "title": "Weekly Newsletter - Week 10",
  "created_at": "2026-03-07T16:30:00.000Z",
  "approved_at": null,
  "rejected_at": null
}
```

### 2. Check Dashboard Widget

- Visit http://localhost:3000
- Widget should show "1 pending items"
- Click to expand and see the item

### 3. Check Full Approval Page

- Visit http://localhost:3000/approvals
- Click on the item to see full details
- Try the approve/reject buttons

### 4. Approve the Item

```bash
curl -X POST http://localhost:3000/api/approvals/550e8400-e29b-41d4-a716-446655440000/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approvedBy": "user@example.com"
  }'
```

### 5. Verify Approval

```bash
# Item should now be in approved directory
ls /data/approval-queue/approved/
# Output: 550e8400-e29b-41d4-a716-446655440000.json

# Dashboard should show "0 pending items"
```

### 6. Check Audit Log

```bash
# View audit trail
cat /data/approval-queue/audit.log
```

**Output:**
```
{"id":"...","item_id":"550e8400-e29b-41d4-a716-446655440000","action":"created","actor":"newsletter-generator","timestamp":"..."}
{"id":"...","item_id":"550e8400-e29b-41d4-a716-446655440000","action":"approved","actor":"user@example.com","timestamp":"..."}
```

## Step 6: Set Up Auto-Execution (Optional)

After approval, you might want to automatically execute the action. Add this to your agent:

```typescript
async function submitAndExecute(content: string, type: 'email' | 'social' | 'blog') {
  // 1. Submit for approval
  const approvalResponse = await fetch('/api/approvals', {
    method: 'POST',
    body: JSON.stringify({
      type,
      title: generateTitle(),
      preview: content.substring(0, 300),
      content,
      source_agent: 'my-agent',
    }),
  });

  const item = await approvalResponse.json();
  console.log(`Submitted for approval: ${item.id}`);

  // 2. Poll for approval status
  let approved = false;
  for (let i = 0; i < 60; i++) { // Check for up to 10 minutes
    const statusResponse = await fetch(`/api/approvals/${item.id}`);
    const status = await statusResponse.json();

    if (status.approved_at) {
      approved = true;
      break;
    }
    if (status.rejected_at) {
      console.error(`Item rejected: ${status.rejection_reason}`);
      return;
    }

    // Wait 10 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  if (approved) {
    // 3. Execute the action
    await executeAction(item);
  }
}
```

## Troubleshooting

### Queue directory not created

**Problem:** `/data/approval-queue/` doesn't exist or is empty

**Solution:**
```bash
# Create manually if needed
mkdir -p /data/approval-queue/{pending,approved,rejected}

# Verify permissions
chmod 755 /data/approval-queue
chmod 755 /data/approval-queue/*
```

### Slack notifications not working

**Problem:** Items are created but no Slack DM received

**Checklist:**
- ✅ `SLACK_BOT_TOKEN` is set in `.env.local`
- ✅ Token starts with `xoxb-` (not `xoxp-`)
- ✅ App has `chat:write` scope
- ✅ `SLACK_APPROVER_USER_ID` is correct (starts with `U`)
- ✅ Check server logs for errors: `grep "Slack" logs.txt`

**Debug:**
```bash
# Test Slack token
curl -X POST https://slack.com/api/auth.test \
  -H "Authorization: Bearer xoxb-your-token" \
  -d "test=true"

# Should return {"ok": true, "user_id": "U...", ...}
```

### Items not appearing in pending directory

**Problem:** API creates items but they're not in `/data/approval-queue/pending/`

**Solution:**
1. Check file permissions: `ls -la /data/approval-queue/`
2. Check server error logs for write errors
3. Verify disk space: `df -h /data/`

### API returns 404 for created items

**Problem:** Can create items but can't fetch or approve them

**Solution:**
1. Check file was saved: `ls /data/approval-queue/pending/`
2. Verify file is valid JSON: `cat /data/approval-queue/pending/*.json`
3. Check API logs for errors
4. Restart server to clear any in-memory caches

## Next Steps

1. **Integrate with agents** - Have your agents submit items before execution
2. **Set up webhooks** - Create custom hooks for post-approval actions
3. **Configure notifications** - Customize Slack messages or add email notifications
4. **Monitor audit logs** - Set up regular reviews of approval history
5. **Scale up** - When volume increases, consider migrating to database backend

## Support

For issues or questions:
1. Check the logs: `/Users/chipai/workshop/.next/logs/`
2. Review the README.md for API documentation
3. Check test files for usage examples

---

**Setup completed!** Your approval queue system is ready to use.

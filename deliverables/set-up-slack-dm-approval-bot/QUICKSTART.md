# Quick Start - 5 Minute Setup

Get the Slack approval bot running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Access to create a Slack app in your workspace
- Chip's Slack user ID

## Steps

### 1. Clone the Repository (30 seconds)

```bash
cd ~/Documents/Shared/projects
git clone <repo-url> set-up-slack-dm-approval-bot
cd set-up-slack-dm-approval-bot
npm install
```

### 2. Create Slack App (2 minutes)

1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. **App Name:** `approval-bot`
4. **Workspace:** Select yours
5. Click **Create App**

You're now on the app's main page. ✅

### 3. Get Credentials (1 minute)

**Step A: Copy Bot Token**
- Go to **OAuth & Permissions** (left sidebar)
- Scroll to top
- Copy the **Bot User OAuth Token** (starts with `xoxb-`)
- Save it somewhere

**Step B: Copy Signing Secret**
- Go to **Basic Information** (left sidebar)
- Scroll down to **App Credentials**
- Copy the **Signing Secret**
- Save it somewhere

**Step C: Get Chip's User ID**
- Open Slack workspace
- Click on Chip's profile
- Look for user ID (format: `U0123456789`)
- Save it

### 4. Configure Environment (1 minute)

```bash
# Copy template
cp .env.example .env.local

# Edit the file and add your credentials:
# SLACK_BOT_TOKEN=xoxb-YOUR-TOKEN-HERE
# SLACK_SIGNING_SECRET=YOUR-SECRET-HERE
# CHIP_USER_ID=UXXX12345678
```

### 5. Configure Slack App Events (1 minute)

Back in Slack app settings:

**A. Enable Event Subscriptions**
- Go to **Event Subscriptions**
- Toggle **Enable Events** to ON
- For **Request URL**, enter:
  ```
  http://localhost:3000/api/slack/events
  ```
  _(We'll test locally first, then deploy)_
- Slack will verify the URL (you need to start the server first - see next step)

**B. Subscribe to Events**
Under **Subscribe to bot events**, add:
- `reaction_added`
- `reaction_removed`
- `app_mention`

Click **Save Changes**

**C. Enable Interactivity**
- Go to **Interactivity & Shortcuts**
- Toggle to ON
- For **Request URL**, enter:
  ```
  http://localhost:3000/api/slack/actions
  ```
- Click **Save Changes**

**D. Set OAuth Scopes**
- Go to **OAuth & Permissions**
- Under **Bot Token Scopes**, add:
  - `chat:write`
  - `reactions:read`
  - `reactions:write`
  - `conversations:open`
  - `users:read`
  - `channels:read`
  - `im:read`

**E. Install to Workspace**
- At the top of **OAuth & Permissions**, click **Install to Workspace**
- Click **Allow**

### 6. Start the Bot (30 seconds)

```bash
npm run dev
```

You should see:
```
> ready - started server on 0.0.0.0:3000
```

Now go back to Slack app settings and complete Step 5A (Event Subscriptions request URL verification).

### 7. Test It! (30 seconds)

**Option A: Using curl**

```bash
curl -X POST http://localhost:3000/api/slack/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "new-approval-request",
    "item": {
      "id": "test-001",
      "title": "Test Approval",
      "type": "blog",
      "content": "This is a test blog post that needs approval...",
      "sourceAgent": "test-agent",
      "createdAt": "'$(date -Iseconds)'"
    }
  }'
```

Check Chip's DM - should see an approval request!

**Option B: Manual Test**

1. In the project directory, create `test-request.json`:
   ```json
   {
     "type": "new-approval-request",
     "item": {
       "id": "test-001",
       "title": "Review Blog Post",
       "type": "blog",
       "content": "This is test content for a blog post...",
       "sourceAgent": "content-agent"
     }
   }
   ```

2. Send the request:
   ```bash
   curl -X POST http://localhost:3000/api/slack/webhook \
     -H "Content-Type: application/json" \
     -d @test-request.json
   ```

### 8. Approve/Reject in Slack

In Chip's DM:
1. Click the **👍 Approve** button to approve
2. Or click the **👎 Reject** button to reject (and enter a reason)
3. Bot saves the decision automatically

**Verify it worked:**

```bash
cat data/approval-queue.json | jq '.[] | {id, status}'
```

Should show status changed to `approved` or `rejected`.

### ✅ Done!

You have a working Slack approval bot. Next:

- **Integrate with Mission Control** → See [INTEGRATION.md](INTEGRATION.md)
- **Deploy to Production** → See README.md Production Deployment section
- **Customize Messages** → Edit `src/lib/slack-approval-bot.ts`

## Troubleshooting

### "Request URL is unreachable"

Make sure:
1. Server is running (`npm run dev`)
2. URL in Slack app exactly matches: `http://localhost:3000/api/slack/events`
3. Firewall allows localhost:3000

### "No message in Slack"

Check:
1. Bot token is correct
2. Chip's user ID is correct (format: `UXXX...`)
3. Server logs for errors: `npm run dev` output

### "reaction_added events not working"

Verify:
1. `reaction_added` is checked in Event Subscriptions
2. Bot has `reactions:read` and `reactions:write` scopes
3. Refresh Slack and try again

## Next: Integration

To connect with Mission Control:

```bash
# Read the integration guide
open INTEGRATION.md

# Or see: Integration section in README.md
```

## Support

- **Setup help** → SLACK-SETUP.md
- **Integration help** → INTEGRATION.md  
- **General help** → README.md
- **Logs** → Run `npm run dev` and check console output

---

You're all set! Enjoy automated approvals. 🚀

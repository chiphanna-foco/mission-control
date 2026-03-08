# Slack App Setup Guide

This guide walks you through setting up the Slack approval bot application in your Slack workspace.

## Prerequisites

- Access to your Slack workspace with admin permissions
- The bot application running on a publicly accessible URL (or ngrok tunnel for local development)

## Step 1: Create a New Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App**
3. Choose **From scratch**
4. **App Name:** `approval-bot` (or your preferred name)
5. **Workspace:** Select your workspace
6. Click **Create App**

You'll be redirected to the app's basic information page.

## Step 2: Configure Event Subscriptions

1. Go to **Event Subscriptions** in the left sidebar
2. Toggle **Enable Events** to ON
3. Enter your **Request URL:**
   ```
   https://your-domain.com/api/slack/events
   ```
   - For local development, use ngrok: `https://abc123.ngrok.io/api/slack/events`
   - Slack will verify this URL

4. Under **Subscribe to bot events**, add these events:
   - `reaction_added`
   - `reaction_removed`
   - `message.im` (direct messages)
   - `app_mention`

5. Click **Save Changes**

### Event Subscriptions Configuration Details:

- **reaction_added**: User reacts to a message (approve/reject)
- **reaction_removed**: User removes a reaction (undo)
- **message.im**: Direct messages in conversations with the bot
- **app_mention**: When the bot is mentioned

## Step 3: Configure Interactivity

1. Go to **Interactivity & Shortcuts** in the left sidebar
2. Toggle **Interactivity** to ON
3. Enter your **Request URL:**
   ```
   https://your-domain.com/api/slack/actions
   ```
4. Click **Save Changes**

This allows the bot to handle button clicks and interactive components.

## Step 4: Set OAuth Permissions

1. Go to **OAuth & Permissions** in the left sidebar
2. Under **Scopes**, add these Bot Token Scopes:
   - `chat:write` - Send messages
   - `chat:write.customize` - Send messages as bot
   - `reactions:read` - Read reactions
   - `reactions:write` - Add reactions
   - `users:read` - Read user information
   - `conversations:open` - Open direct message conversations
   - `channels:read` - Read channel information
   - `im:read` - Read direct messages

3. Scroll to the top and copy your **Bot User OAuth Token**
   - Starts with `xoxb-`
   - This is your `SLACK_BOT_TOKEN`

## Step 5: Install App to Workspace

1. At the top of **OAuth & Permissions**, click **Install to Workspace**
2. Review permissions and click **Allow**
3. You'll see your OAuth tokens at the top

## Step 6: Get Your Signing Secret

1. Go to **Basic Information** in the left sidebar
2. Scroll down to **App Credentials**
3. Copy your **Signing Secret**
   - This is your `SLACK_SIGNING_SECRET`

## Step 7: Get Chip's User ID

1. Open your Slack workspace
2. Click on Chip's profile (or any user)
3. Look for the user ID in the profile panel (format: `U0123456789`)
4. This is your `CHIP_USER_ID`

## Step 8: Configure Environment Variables

Create or update `.env.local` with:

```env
SLACK_BOT_TOKEN=xoxb-YOUR-TOKEN-HERE
SLACK_SIGNING_SECRET=YOUR-SECRET-HERE
CHIP_USER_ID=UXXX12345678
SLACK_APP_ID=A0123456789
DASHBOARD_WEBHOOK_URL=http://localhost:3000/api/approval-queue/webhook
```

## Step 9: Set Bot Display Name and Permissions

1. Go to **App Home** in the left sidebar
2. Under **Your Apps section**, you can see your bot display name
3. Edit it to something friendly like `ApprovalBot` or `Approval Helper`
4. Toggle **Always Show My Bot as Online** if desired

## Step 10: Test the Setup

### Using ngrok for Local Testing

If running locally, use ngrok to expose your local server:

```bash
# Terminal 1: Start your development server
npm run dev

# Terminal 2: Create ngrok tunnel
ngrok http 3000
```

This gives you a public URL like `https://abc123.ngrok.io`.

### Send a Test Message

1. DM the bot in Slack with: `Hello @ApprovalBot`
2. The bot should respond (if you implement a message handler)
3. Check your server logs for events

### Test Approval Flow

1. Manually create a test item in your approval queue
2. The bot should send a DM with an approval request
3. Click the approve/reject buttons
4. Check your logs and approval-queue.json to verify the status updated

## Troubleshooting

### "Invalid Request URL"

- Make sure your server is running and accessible at the URL
- For local development, use ngrok and update the URL in Slack settings
- Ensure the route exists: `/api/slack/events` and `/api/slack/actions`

### "Request timed out"

- Your server is taking too long to respond (>3 seconds)
- Return a 200 OK immediately, then process events asynchronously
- Check that you're not making blocking calls in the handler

### Reactions not working

- Make sure the bot user has permissions to read/write reactions
- Verify `reactions:read` and `reactions:write` scopes are enabled
- Check that you're subscribing to `reaction_added` events

### Messages not being sent to Chip

- Verify `CHIP_USER_ID` is correct
- Ensure the bot has `chat:write` scope
- Check that `conversations:open` scope is enabled
- Look for errors in server logs

### Message delivery to wrong channel

- Verify the bot is opening DM conversations with `conversations.open` API
- Check that the user ID is correct
- Look for API error responses in server logs

## Next Steps

1. **Integrate with Approval Queue** - See INTEGRATION.md
2. **Deploy to Production** - Set up proper SSL certificates and domain
3. **Monitor Bot Activity** - Check logs and sync status regularly
4. **Test Edge Cases** - Invalid reactions, timeouts, rapid clicks

## Useful Resources

- [Slack API Documentation](https://api.slack.com/docs)
- [Slack Events API](https://api.slack.com/apis/connections/events-api)
- [Slack Interactive Components](https://api.slack.com/interactivity/handling)
- [Slack Bot Scopes](https://api.slack.com/scopes)

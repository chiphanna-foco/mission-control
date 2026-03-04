#!/bin/bash

# Install MC → Slack Integration (real-time updates + 3x daily digest)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MC_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔗 Installing Mission Control → Slack Integration..."

# 1. Ensure script is executable
chmod +x "$SCRIPT_DIR/mc-slack-integration.mjs"

# 2. Get Slack webhook URL
echo ""
echo "📝 You need a Slack Incoming Webhook for #chip-aiops"
echo "   Create one at: https://api.slack.com/apps → Your App → Incoming Webhooks"
echo "   Add a webhook to channel #chip-aiops (C0AD1LRLS5C)"
echo ""
read -p "Enter Slack Webhook URL (or press Enter to skip): " WEBHOOK_URL

if [ -z "$WEBHOOK_URL" ]; then
  echo "❌ Webhook URL required. Exiting."
  exit 1
fi

# 3. Set up environment
echo "SLACK_WEBHOOK_URL=\"$WEBHOOK_URL\"" > "$MC_DIR/.env.slack"
echo "✅ Saved webhook to .env.slack"

# 4. Install cron jobs for 3x daily digest (8 AM, 1 PM, 6 PM MT)
echo ""
echo "📅 Setting up cron jobs (8 AM, 1 PM, 6 PM MT)..."

CRON_WATCH="*/5 * * * * cd $MC_DIR && SLACK_WEBHOOK_URL=\"$WEBHOOK_URL\" node scripts/mc-slack-integration.mjs watch > /tmp/mc-watch.log 2>&1"
CRON_08="0 8 * * * cd $MC_DIR && SLACK_WEBHOOK_URL=\"$WEBHOOK_URL\" node scripts/mc-slack-integration.mjs digest > /tmp/mc-digest-08.log 2>&1"
CRON_13="0 13 * * * cd $MC_DIR && SLACK_WEBHOOK_URL=\"$WEBHOOK_URL\" node scripts/mc-slack-integration.mjs digest > /tmp/mc-digest-13.log 2>&1"
CRON_18="0 18 * * * cd $MC_DIR && SLACK_WEBHOOK_URL=\"$WEBHOOK_URL\" node scripts/mc-slack-integration.mjs digest > /tmp/mc-digest-18.log 2>&1"

# Check if cron entries already exist
if ! crontab -l 2>/dev/null | grep -q "mc-slack-integration"; then
  (crontab -l 2>/dev/null || true; echo "$CRON_WATCH"; echo "$CRON_08"; echo "$CRON_13"; echo "$CRON_18") | crontab -
  echo "✅ Cron jobs installed"
else
  echo "⚠️  Cron entries already exist. Run 'crontab -e' to verify or update."
fi

# 5. Summary
echo ""
echo "✅ Mission Control → Slack Integration installed!"
echo ""
echo "Features:"
echo "  • Real-time updates: Status changes posted to #chip-aiops"
echo "  • 3x daily digest: 8 AM, 1 PM, 6 PM MT showing blocked/urgent tasks"
echo ""
echo "Logs:"
echo "  • Real-time watcher: /tmp/mc-watch.log"
echo "  • Digest runs: /tmp/mc-digest-08.log, mc-digest-13.log, mc-digest-18.log"
echo ""
echo "To verify: crontab -l | grep mc-slack"

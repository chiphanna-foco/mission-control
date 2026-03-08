#!/bin/bash

# Install Granola Meeting Sync Scheduler Cron Jobs
# Sets up two cron entries:
# 1. Every 30 minutes during work hours (9 AM - 6 PM MT, Mon-Fri)
# 2. 6 PM daily sweep to catch any missed meetings

set -e

echo "🔧 Installing Granola Meeting Sync Scheduler cron jobs..."
echo ""

# Paths
SCHEDULER_SCRIPT="/Users/chipai/workshop/meeting-notes-to-tasks/scripts/granola-sync-scheduler.mjs"
EXTRACTION_SCRIPT="/Users/chipai/workshop/meeting-notes-extraction/extract-and-create-tasks.mjs"

# Verify scripts exist
if [ ! -f "$SCHEDULER_SCRIPT" ]; then
    echo "❌ Error: Scheduler script not found at $SCHEDULER_SCRIPT"
    exit 1
fi

if [ ! -f "$EXTRACTION_SCRIPT" ]; then
    echo "⚠️  Warning: Extraction script not found at $EXTRACTION_SCRIPT"
    echo "   (Will be available after copying files to workspace)"
fi

# Create cron entries
CRON_JOB_1="*/30 9-17 * * 1-5 source ~/.zshrc && node $SCHEDULER_SCRIPT --once >> /tmp/granola-sync-scheduler.log 2>&1"
CRON_JOB_2="0 18 * * 1-5 source ~/.zshrc && node $SCHEDULER_SCRIPT --once >> /tmp/granola-sync-scheduler-sweep.log 2>&1"

# Get existing crontab (filter out granola jobs)
EXISTING_CRON=$(crontab -l 2>/dev/null | grep -v "granola-sync-scheduler" | grep -v "granola-sync-scheduler-sweep" | tail -1)

# Build new crontab
if [ -z "$EXISTING_CRON" ]; then
    NEW_CRON="$CRON_JOB_1
$CRON_JOB_2"
else
    NEW_CRON=$(crontab -l 2>/dev/null | grep -v "granola-sync-scheduler" | grep -v "granola-sync-scheduler-sweep")
    NEW_CRON="$NEW_CRON
$CRON_JOB_1
$CRON_JOB_2"
fi

# Install new crontab
echo "$NEW_CRON" | crontab -

echo ""
echo "✅ Cron jobs installed successfully!"
echo ""
echo "📋 Scheduled:"
echo "   • Every 30 minutes (9 AM - 6 PM MT, Mon-Fri) → granola-sync-scheduler.log"
echo "   • 6 PM daily sweep (Mon-Fri) → granola-sync-scheduler-sweep.log"
echo ""
echo "🔍 Verify installation:"
echo "   crontab -l | grep granola"
echo ""
echo "📊 Monitor logs:"
echo "   tail -f /tmp/granola-sync-scheduler.log"
echo "   tail -f /tmp/granola-sync-scheduler-sweep.log"
echo ""
echo "🛑 To remove cron jobs later:"
echo "   (crontab -l | grep -v granola-sync-scheduler) | crontab -"
echo ""

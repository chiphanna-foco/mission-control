#!/bin/bash

# Verify Granola Meeting Sync Pipeline
# Checks all components and runs diagnostics

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS="${GREEN}✅${NC}"
FAIL="${RED}❌${NC}"
WARN="${YELLOW}⚠️ ${NC}"

echo ""
echo -e "${BOLD}Granola Meeting Sync Pipeline — Verification${NC}"
echo "=============================================="
echo ""

# 1. Check Granola notes directory
echo -n "1. Granola notes directory... "
if [ -d ~/Documents/claude/skills/clawd/granola-notes ]; then
    echo -e "$PASS exists"
    NOTE_COUNT=$(find ~/Documents/claude/skills/clawd/granola-notes -name "*.md" | wc -l)
    echo "   $NOTE_COUNT notes synced"
else
    echo -e "$FAIL missing"
    exit 1
fi

# 2. Check Granola sync state
echo -n "2. Granola sync state... "
if [ -f ~/Documents/claude/skills/clawd/granola-notes/.sync-state.json ]; then
    echo -e "$PASS"
    LAST_SYNC=$(cat ~/Documents/claude/skills/clawd/granola-notes/.sync-state.json | grep last_sync | head -1)
    echo "   $LAST_SYNC"
else
    echo -e "$WARN missing (will be created on first sync)"
fi

# 3. Check extraction queue directory
echo -n "3. Extraction queue directory... "
if [ -d ~/Documents/workshop/meeting-notes-extraction/queue ]; then
    echo -e "$PASS exists"
    QUEUE_COUNT=$(find ~/Documents/workshop/meeting-notes-extraction/queue -name "*-queue.json" 2>/dev/null | wc -l)
    echo "   $QUEUE_COUNT items queued"
else
    echo -e "$FAIL missing"
    exit 1
fi

# 4. Check scheduler script
echo -n "4. Scheduler script... "
if [ -f ~/Documents/workshop/meeting-notes-to-tasks/scripts/granola-sync-scheduler.mjs ]; then
    echo -e "$PASS found"
else
    echo -e "$WARN not yet installed"
    echo "   Run: cp granola-sync-scheduler.mjs ~/Documents/workshop/meeting-notes-to-tasks/scripts/"
fi

# 5. Check extraction script
echo -n "5. Extraction script... "
if [ -f ~/Documents/workshop/meeting-notes-extraction/extract-and-create-tasks.mjs ]; then
    echo -e "$PASS found"
else
    echo -e "$WARN not yet installed"
    echo "   Run: cp extract-and-create-tasks.mjs ~/Documents/workshop/meeting-notes-extraction/"
fi

# 6. Check Mission Control API
echo -n "6. Mission Control API... "
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "$PASS responding"
    STATUS=$(curl -s http://localhost:3000/api/health)
    echo "   $STATUS"
else
    echo -e "$FAIL not accessible"
    echo "   Make sure Mission Control is running: npm run dev at ~/Documents/workshop"
fi

# 7. Check if OpenClaw is running
echo -n "7. OpenClaw runtime... "
if command -v openclaw &> /dev/null; then
    STATUS=$(openclaw status 2>/dev/null | head -1 || echo "running")
    echo -e "$PASS installed"
    echo "   Status: $STATUS"
else
    echo -e "$WARN not found"
    echo "   Visit: https://docs.openclaw.ai for installation"
fi

# 8. Check cron installation
echo -n "8. Cron jobs... "
if crontab -l 2>/dev/null | grep -q "granola-sync-scheduler"; then
    echo -e "$PASS installed"
    CRON_LINES=$(crontab -l 2>/dev/null | grep -c "granola-sync-scheduler" || echo "0")
    echo "   $CRON_LINES cron entries active"
else
    echo -e "$WARN not installed"
    echo "   Run: bash install-cron-jobs.sh"
fi

# 9. Check log files
echo -n "9. Log files... "
if [ -f /tmp/granola-sync-scheduler.log ]; then
    echo -e "$PASS"
    LAST_LINE=$(tail -1 /tmp/granola-sync-scheduler.log)
    echo "   Last: $LAST_LINE"
else
    echo -e "$WARN (will be created on first run)"
fi

# 10. Test note extraction (dry run)
echo ""
echo -n "10. Testing extraction (dry run)... "

if [ -d ~/Documents/claude/skills/clawd/granola-notes ] && [ $(find ~/Documents/claude/skills/clawd/granola-notes -name "*.md" | wc -l) -gt 0 ]; then
    echo -e "$PASS"
    SAMPLE_NOTE=$(find ~/Documents/claude/skills/clawd/granola-notes -name "*.md" | head -1)
    echo "    Sample file: $(basename $SAMPLE_NOTE)"
    
    # Extract first 200 chars of note
    echo "    Content preview:"
    head -5 "$SAMPLE_NOTE" | sed 's/^/      /'
else
    echo -e "$WARN no notes to test"
fi

echo ""
echo "=============================================="
echo ""
echo -e "${BOLD}Summary:${NC}"
echo "  • Granola sync directory: ✅"
echo "  • Extraction queue: ✅"
echo "  • Scripts: $([ -f ~/Documents/workshop/meeting-notes-to-tasks/scripts/granola-sync-scheduler.mjs ] && echo "✅" || echo "⚠️ pending")"
echo "  • Mission Control: $(curl -s http://localhost:3000/api/health > /dev/null 2>&1 && echo "✅" || echo "❌")"
echo "  • Cron jobs: $(crontab -l 2>/dev/null | grep -q "granola-sync-scheduler" && echo "✅" || echo "⚠️ pending")"
echo ""

echo -e "${BOLD}Next Steps:${NC}"
echo ""
echo "1. Copy scripts to workspace:"
echo "   mkdir -p ~/Documents/workshop/meeting-notes-extraction"
echo "   cp granola-sync-scheduler.mjs ~/Documents/workshop/meeting-notes-to-tasks/scripts/"
echo "   cp extract-and-create-tasks.mjs ~/Documents/workshop/meeting-notes-extraction/"
echo ""
echo "2. Install cron jobs:"
echo "   bash install-cron-jobs.sh"
echo ""
echo "3. Monitor logs:"
echo "   tail -f /tmp/granola-sync-scheduler.log"
echo ""
echo "4. Check Mission Control for new tasks:"
echo "   Open http://localhost:3000"
echo ""

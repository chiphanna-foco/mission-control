#!/bin/bash
# Daily Backup Cron Job
# Run at 2:00 AM daily via cron: 0 2 * * * /Users/chipai/Documents/mission-control/scripts/daily-backup-cron.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATE=$(date +%Y-%m-%d)

# Run daily backup
"$SCRIPT_DIR/backup-db.sh" "daily-backup-$DATE"

# Clean up backups older than 90 days
find /Users/chipai/Documents/mission-control/backups -name "mission-control-*.db" -mtime +90 -delete

echo "✅ Daily backup completed at $(date)"

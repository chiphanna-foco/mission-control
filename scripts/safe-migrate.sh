#!/bin/bash
# Safe Migration Script
# Always backs up DB before running any migration
# Usage: ./scripts/safe-migrate.sh "migration description"

set -e

DESCRIPTION="${1:-unnamed-migration}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔐 Safe Migration: $DESCRIPTION"
echo ""

# Step 1: Backup
echo "Step 1: Backing up database..."
"$SCRIPT_DIR/backup-db.sh" "pre-migration-$DESCRIPTION"
echo ""

# Step 2: Verify backup exists
BACKUP_COUNT=$(find /Users/chipai/Documents/mission-control/backups -name "*.db" | wc -l)
if [ "$BACKUP_COUNT" -lt 1 ]; then
  echo "❌ Backup verification FAILED - aborting migration"
  exit 1
fi
echo "✅ Backup verified ($BACKUP_COUNT total backups exist)"
echo ""

# Step 3: Run the actual operation (parent script passes control here)
echo "Step 2: Ready to proceed with migration: $DESCRIPTION"
echo "To restore, run:"
echo "  cp /Users/chipai/Documents/mission-control/backups/mission-control-*-pre-migration-$DESCRIPTION.db /Users/chipai/Documents/mission-control/mission-control.db"
echo ""

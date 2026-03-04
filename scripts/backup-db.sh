#!/bin/bash
# Mission Control Database Backup Script
# Backs up mission-control.db with timestamp before any risky operations
# Usage: ./scripts/backup-db.sh [reason]

set -e

DB_PATH="/Users/chipai/Documents/mission-control/mission-control.db"
BACKUP_DIR="/Users/chipai/Documents/mission-control/backups"
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
REASON="${1:-manual}"

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup filename with timestamp and reason
BACKUP_FILE="$BACKUP_DIR/mission-control-${TIMESTAMP}-${REASON}.db"

# Copy database file
if [ -f "$DB_PATH" ]; then
  cp "$DB_PATH" "$BACKUP_FILE"
  echo "✅ Database backed up to: $BACKUP_FILE"
  echo "   Timestamp: $TIMESTAMP"
  echo "   Reason: $REASON"
  
  # List recent backups
  echo ""
  echo "Recent backups:"
  ls -lhS "$BACKUP_DIR"/mission-control-*.db | head -10 | awk '{print $9, "-", $5}'
else
  echo "❌ Database file not found at $DB_PATH"
  exit 1
fi

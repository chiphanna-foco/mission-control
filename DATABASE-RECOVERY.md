# Mission Control Database Recovery Guide

## Backup System

Mission Control now has automated database backups to prevent data loss during migrations or other risky operations.

### Backup Locations
- **Daily automatic backups**: `/Users/chipai/Documents/mission-control/backups/`
- **Naming convention**: `mission-control-YYYY-MM-DD-HHMMSS-{reason}.db`
- **Retention**: 90 days (older backups auto-deleted)

### Backup Types

#### 1. **Automatic Daily Backup** (runs at 2:00 AM)
```bash
# Cron job already installed:
0 2 * * * /Users/chipai/Documents/mission-control/scripts/daily-backup-cron.sh
```

#### 2. **Pre-Migration Backup** (manual, before any schema changes)
```bash
cd /Users/chipai/Documents/mission-control
./scripts/backup-db.sh "schema-update-someday-column"
```

#### 3. **Manual Backup Anytime**
```bash
./scripts/backup-db.sh "custom-reason"
```

## Recovery Procedures

### Scenario 1: Restore from Recent Backup

List available backups:
```bash
ls -lhS /Users/chipai/Documents/mission-control/backups/ | head -10
```

Restore a specific backup:
```bash
# Stop the server first
pkill -f "next dev"

# Restore the backup
cp /Users/chipai/Documents/mission-control/backups/mission-control-2026-03-03-150000-pre-migration-schema-update.db \
   /Users/chipai/Documents/mission-control/mission-control.db

# Restart the server
cd /Users/chipai/Documents/mission-control && npm run dev &
```

### Scenario 2: Migration Gone Wrong

If a migration corrupts data:

```bash
# 1. Identify the backup from before the migration
ls -lhS /Users/chipai/Documents/mission-control/backups/ | grep pre-migration

# 2. Restore it
cp /Users/chipai/Documents/mission-control/backups/mission-control-*-pre-migration-*.db \
   /Users/chipai/Documents/mission-control/mission-control.db

# 3. Kill and restart server
pkill -f "next dev"
sleep 2
cd /Users/chipai/Documents/mission-control && npm run dev &
```

### Scenario 3: Safe Migration Process

Always follow this pattern for schema changes:

```bash
# 1. Run the safe migration wrapper
cd /Users/chipai/Documents/mission-control
./scripts/safe-migrate.sh "clear-description-of-change"

# 2. Make your schema changes (it will have already backed up)

# 3. Restart the server to verify
pkill -f "next dev"
sleep 2
npm run dev &

# 4. If something breaks, restore:
cp /Users/chipai/Documents/mission-control/backups/mission-control-*-pre-migration-clear-description-of-change.db \
   /Users/chipai/Documents/mission-control/mission-control.db
```

## Backup Verification

Check backup integrity:
```bash
sqlite3 /Users/chipai/Documents/mission-control/backups/mission-control-YYYY-MM-DD-HHMMSS-reason.db "SELECT COUNT(*) FROM tasks;"
```

## Cron Installation

The daily backup cron job should already be installed, but to verify or reinstall:

```bash
# Check installed crons
crontab -l | grep mission-control

# If not installed, add it:
crontab -e
# Add this line:
# 0 2 * * * /Users/chipai/Documents/mission-control/scripts/daily-backup-cron.sh
```

## What This Prevents

✅ **Prevents**: Data loss during schema migrations  
✅ **Prevents**: Accidental deletion of tasks  
✅ **Prevents**: Database corruption from failed operations  
✅ **Prevents**: Need to recreate tasks manually  

❌ **Does NOT prevent**: Deleting the backups folder (don't do that!)  

## Key Learnings

From the March 3, 2026 incident where all tasks were lost:

1. **Always backup before migrations** - The schema migration for the 'someday' column should have auto-backed up
2. **Test migrations on a copy first** - Never alter the production DB without testing
3. **Keep multiple backup copies** - 90-day retention gives you a safety window
4. **Document recovery procedures** - This file!
5. **Automate backups** - Daily backups catch issues early

## Questions?

If something goes wrong:
1. Check the backups folder for a recent backup
2. Restore the most recent backup before the issue occurred
3. Restart the server
4. Verify tasks are restored with: `curl http://localhost:3000/api/tasks | jq '.tasks | length'`

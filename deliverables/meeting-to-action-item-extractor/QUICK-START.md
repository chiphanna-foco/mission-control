# Quick Start Guide - Meeting-to-Action-Item Extractor

## 1. Installation (2 minutes)

```bash
cd ~/Documents/Shared/projects/meeting-to-action-item-extractor
npm install
npm run setup
```

This will:
- Install dependencies
- Create `.env` configuration
- Initialize SQLite database
- Load sample action items

## 2. Test Extraction (1 minute)

Run demo mode (no API keys needed):

```bash
npm test
```

Expected output:
```
✅ Time-bound commitment
✅ Assignment with deadline
✅ Follow-up action
✅ Direct action item
✅ Multiple items
✅ Urgent with keywords
✅ Discussion item
✅ Approval needed
✅ Conditional commitment

📊 Results: 9 passed, 0 failed out of 9
```

## 3. Extract from Meeting Notes

### From a file:
```bash
node src/cli.js --file my-meeting-notes.txt --save
```

### From text:
```bash
node src/cli.js "I'll send the proposal by Friday. John needs to review by Tuesday."
```

### Example output:
```
📝 Extracting from text input

🎯 Extracted 2 Action Items
──────────────────────────────

1. Send proposal
   Assigned: Chip | Due: Fri Mar 14 | Priority: High
   Pattern: time_bound_commitment (95% confidence)

2. Review
   Assigned: John | Due: Tue Mar 11 | Priority: High
   Pattern: assignment (90% confidence)

✅ Extraction complete
```

## 4. Check Overdue Items

```bash
npm run check
```

Shows:
- ⚠️  Overdue items (red)
- 🔔 Due today (yellow)
- 📅 Due tomorrow (cyan)
- 📌 Due within 3 days (gray)

## 5. View All Action Items

```bash
node src/cli.js list
```

Filter by assignee:
```bash
node src/cli.js list --assigned-to Chip
```

Filter by priority:
```bash
node src/cli.js list --priority High
```

## 6. Mark Item Complete

```bash
node src/cli.js complete <action-item-id>
```

## 7. Generate Report

```bash
npm run report
```

Shows:
- Items by status
- Items by assignee
- Items by priority
- Total count

## 8. Export/Import Data

Export to JSON:
```bash
node src/cli.js export backup.json
```

Import from JSON:
```bash
node src/cli.js import backup.json
```

## Database File

SQLite database stored at:
```
~/Documents/Shared/projects/meeting-to-action-item-extractor/action-items.db
```

Query it directly:
```bash
sqlite3 action-items.db "SELECT title, assigned_to, due_date FROM action_items WHERE status='Pending' ORDER BY due_date;"
```

## Configuration

Edit `.env` to customize:

```bash
# Database location
DB_PATH=./action-items.db

# Mission Control API
MC_API_URL=http://localhost:3001
MC_API_KEY=optional-api-key

# Alert email
ALERT_EMAIL=chip.hanna@gmail.com

# Extraction settings
CONFIDENCE_THRESHOLD=0.65
DEFAULT_TIMEZONE=America/Denver
```

## What Gets Extracted

The system recognizes these patterns:

```
"I'll send the proposal by Friday"
  → Task: "Send proposal" due Friday

"John needs to review the design by Tuesday"
  → Task: "Review design" assigned to John, due Tuesday

"Follow up with Sarah on the budget"
  → Task: "Follow up on budget with Sarah"

"Action item: Schedule team meeting"
  → Task: "Schedule team meeting"

"We need to ship the hotfix by end of day"
  → Task: "Ship hotfix" priority High, due today
```

## Common Commands

```bash
# Extract and save
node src/cli.js --file notes.txt --save

# List pending items
node src/cli.js list --status Pending

# Check for overdue items
npm run check

# Send alerts
npm run alert

# Generate status report
npm run report

# Mark as complete
node src/cli.js complete <id>

# Delete item
node src/cli.js delete <id>

# Run tests
npm test
```

## Tips

1. **Lower confidence threshold for more items:**
   ```bash
   node src/cli.js --file notes.txt --confidence 0.5
   ```

2. **See all database items:**
   ```bash
   node src/cli.js list
   ```

3. **Export before making changes:**
   ```bash
   node src/cli.js export backup.json
   ```

4. **Test extraction without saving:**
   ```bash
   npm test
   ```

5. **Check what patterns exist:**
   Look at `src/patterns.js` for all recognized patterns

## Troubleshooting

### "Module not found" errors
```bash
npm install
```

### "No action items extracted"
- Try lowering confidence threshold: `--confidence 0.5`
- Check that notes have explicit commitments
- Review `src/patterns.js` for what patterns are supported

### "Date parsed incorrectly"
- Use ISO format: "2026-03-14"
- Or full date: "March 14, 2026"
- Check timezone setting in `.env`

### "Database locked"
```bash
# Remove lock file
rm action-items.db-wal action-items.db-shm

# Reinitialize
npm run setup
```

## Next Steps

1. ✅ Run `npm test` to verify installation
2. ✅ Extract from your own meeting notes: `node src/cli.js --file notes.txt --save`
3. ✅ View extracted items: `node src/cli.js list`
4. ✅ Check for overdue: `npm run check`
5. ✅ Read full README.md for advanced usage

## Support

- README.md — Full documentation
- docs/INTEGRATION.md — Mission Control integration
- src/*.js — Well-commented source code
- tests/ — Example test cases

---

**Time to first extraction:** ~2 minutes  
**Time to understand patterns:** ~5 minutes  
**Time to integrate with Mission Control:** ~15 minutes

# Troubleshooting Guide - Email Triage System

## Common Issues & Solutions

### 1. LaunchD Jobs Not Running

**Symptom:** Jobs don't execute at scheduled times, no logs appear.

**Check if loaded:**
```bash
launchctl list | grep email-triage
```

Expected output shows 3 entries with PID or `"-"`

**Solution Steps:**

```bash
# 1. Verify plist syntax
plutil -lint ~/.launchd/com.mission-control.email-triage-morning.plist

# 2. Manually load
launchctl load ~/Library/LaunchAgents/com.mission-control.email-triage-morning.plist

# 3. Manually trigger to test
launchctl start com.mission-control.email-triage-morning

# 4. Check if it ran
tail -20 logs/morning.log

# 5. If still failing, unload and try again
launchctl unload ~/Library/LaunchAgents/com.mission-control.email-triage-morning.plist
launchctl load ~/Library/LaunchAgents/com.mission-control.email-triage-morning.plist
```

**Common Plist Issues:**
- Path to Node is wrong: Check `which node` (should be `/usr/local/bin/node`)
- Project path is wrong: Verify `/Users/chipai/Documents/Shared/projects/email-triage-system-3x-daily/` exists
- Permissions: `chmod +x scripts/email-triage.js`

---

### 2. Gmail API Authentication Error

**Error:** `Invalid Credentials` or `unauthorized_client`

**Check:**

```bash
# 1. Verify service account file exists
ls -l service-account.json

# 2. Check .env.local path
cat .env.local | grep GOOGLE_KEY_FILE

# 3. Verify file is valid JSON
cat service-account.json | jq '.' > /dev/null && echo "Valid JSON"

# 4. Check Gmail API is enabled in Google Cloud
# Go to: https://console.cloud.google.com/apis/library/gmail.googleapis.com
```

**Solution:**

```bash
# 1. Download new service account key
# Google Cloud Console → Credentials → Service Accounts → [Account] → Keys → Add Key → JSON

# 2. Replace service-account.json
mv ~/Downloads/[new-key].json ./service-account.json

# 3. Test
node scripts/email-triage.js
```

---

### 3. "Fetching Emails Failed" - Quota or Rate Limit

**Error:** `Gmail API quota exceeded` or `Rate Limit Exceeded`

**Context:**
Gmail API has these limits:
- Free tier: ~1,000,000 units/day
- 1 message fetch = 1 unit
- 1 list query = 1 unit

**Solution:**

```bash
# Option 1: Reduce batch size in scripts/email-triage.js
# Change: maxResults: 20 → maxResults: 10

# Option 2: Increase time between runs
# Move from 3x daily to 2x daily

# Option 3: Request quota increase
# Google Cloud Console → APIs & Services → Quotas → Gmail API
```

---

### 4. "No Unread Emails" But Inbox Has Emails

**Issue:** Script says no emails found, but Gmail has unread messages.

**Debug:**

```bash
# 1. Check Gmail search query
# Script uses: "is:unread"

# 2. Manually test Gmail API query
node -e "
const { google } = require('googleapis');
// Test query...
"

# 3. Verify unread flag is set
# Gmail UI → Click email → Check if unread

# 4. Check if emails are in inbox vs archive/labels
# Script only checks "me" (primary inbox)
```

**Solution:**

Edit `scripts/email-triage.js`, line ~80:
```javascript
// Change from:
q: "is:unread",

// To:
q: "is:unread in:inbox",  // Specify inbox explicitly
```

---

### 5. Logs Directory Permission Error

**Error:** `EACCES: permission denied, open '/path/to/logs/morning.log'`

**Solution:**

```bash
# Create logs directory with correct permissions
mkdir -p logs
chmod 755 logs

# Test by manually creating a log file
touch logs/test.log
echo "test" >> logs/test.log
rm logs/test.log
```

---

### 6. Node Command Not Found

**Error:** `/usr/local/bin/node: No such file or directory`

**Find Node:**

```bash
# Locate Node
which node

# Common locations:
# /usr/local/bin/node (Homebrew)
# /opt/homebrew/bin/node (M1 Mac)
# ~/.nvm/versions/node/v18.0.0/bin/node (nvm)
```

**Update Plist:**

```bash
# Edit .launchd/*.plist files
# Change first argument in ProgramArguments:
<string>[YOUR_NODE_PATH]</string>

# Reload
launchctl unload ~/Library/LaunchAgents/com.mission-control.email-triage-morning.plist
launchctl load ~/Library/LaunchAgents/com.mission-control.email-triage-morning.plist
```

---

### 7. Script Runs But No Output

**Issue:** Job executes but produces no results.

**Debug:**

```bash
# 1. Check logs
tail -100 logs/morning.log logs/morning-error.log

# 2. Run script manually with verbose output
node scripts/email-triage.js 2>&1 | tee debug.log

# 3. Add debug logging to script
# At top of main():
console.log("🔍 DEBUG: Starting triage...");
console.log("📁 Config path:", CONFIG_PATH);
console.log("🔐 .env.local exists:", fs.existsSync(envPath));

# 4. Check if results directory exists
ls -la results/
```

---

### 8. Urgency Detection Not Working

**Issue:** Emails with "URGENT" keyword aren't marked as urgent.

**Check Configuration:**

```bash
# 1. Verify config has urgency patterns
cat triage.config.json | jq '.urgencyPatterns'

# 2. Test directly
node -e "
const UrgencyDetector = require('./src/lib/urgency-detector.ts');
const detector = new UrgencyDetector('./triage.config.json');
const result = detector.detect('URGENT: Need approval', 'Please approve ASAP');
console.log(result);
"

# 3. Check case sensitivity
# Patterns use .toLowerCase() so case shouldn't matter
```

**Solution:**

Edit `triage.config.json`:
```json
"urgencyPatterns": {
  "critical": {
    "keywords": ["URGENT", "EMERGENCY", "CRITICAL"],
    "level": 5
  }
}
```

Reload script on next run.

---

### 9. Slack Alerts Not Sending

**Error:** No Slack alerts appear despite urgent items.

**Check:**

```bash
# 1. Verify Slack config in .env.local
cat .env.local | grep SLACK

# 2. Test Slack token
curl -X POST https://slack.com/api/auth.test \
  -H "Authorization: Bearer xoxb-YOUR-TOKEN"

# 3. Verify user ID is correct
# Slack → [User] → Copy user ID → Should start with "U"
```

**Solution:**

```bash
# 1. Create new Slack bot if needed
# Go to: api.slack.com/apps

# 2. Get new token
# Features → OAuth & Permissions → Bot Token Scopes → copy token

# 3. Add to .env.local
SLACK_BOT_TOKEN=xoxb-...

# 4. Verify user ID
# Slack → Click your profile → Copy user ID

# 5. Test manually
node scripts/email-triage.js
```

---

### 10. Classification Not Working Correctly

**Issue:** Emails aren't classified to correct domain.

**Debug:**

```bash
# 1. Check config
cat triage.config.json | jq '.domains'

# 2. Test classifier directly
node -e "
const EmailClassifier = require('./src/lib/email-classifier.ts');
const classifier = new EmailClassifier('./triage.config.json');
const result = classifier.classify(
  'ceo@turbotenant.com',
  'Tenant issue',
  'We have a problem...'
);
console.log(JSON.stringify(result, null, 2));
"

# 3. Check sender domain vs keywords
# High priority: exact email domain match
# Lower priority: keyword matches
```

**Solution:**

Add sender domain to `triage.config.json`:
```json
"turbotenant": {
  "emails": ["@turbotenant.com", "@tenant.io"],  // Add more domains
  "keywords": ["tenant", "property", "lease"]    // Add relevant keywords
}
```

---

### 11. Performance Issues (Slow Triage)

**Symptom:** Script takes >10 seconds, timeout errors.

**Optimize:**

```bash
# 1. Reduce email batch
# scripts/email-triage.js, line ~80:
maxResults: 10  // was 20

# 2. Check Gmail API quota usage
# Google Cloud Console → APIs & Services → Credentials

# 3. Add caching
# Modify script to cache results for 1 hour

# 4. Profile the script
time node scripts/email-triage.js
```

---

### 12. "Service Account Not Authorized"

**Error:** `Authorization failed. Service account doesn't have access.`

**Solution:**

```bash
# Service account needs Gmail API permission
# 1. Go to: https://console.cloud.google.com/apis/credentials
# 2. Click service account → Edit
# 3. Go to "Permissions"
# 4. Grant "Editor" or "Viewer" role
# 5. Or use a **different** authentication method:

# Alternative: OAuth 2.0 with user consent
# (Requires interactive login, not ideal for automated jobs)
```

---

### 13. Timezone Issues (Wrong Scheduling Times)

**Issue:** Jobs run at wrong times.

**Verify Timezone:**

```bash
# Check system timezone
date
# or
cat /etc/timezone

# LaunchD uses local system time
# If system is UTC but you want MST:
sudo systemsetup -gettimezone
sudo systemsetup -settimezone America/Denver
```

**Plist Time Format:**

The `StartCalendarInterval` uses **24-hour format**:
- 8 AM = Hour: 8, Minute: 0
- 12 PM = Hour: 12, Minute: 0
- 5 PM = Hour: 17, Minute: 0

---

### 14. "Cannot Find triage.config.json"

**Error:** `Cannot find module 'triage.config.json'`

**Check:**

```bash
# File exists?
ls -l triage.config.json

# In correct directory?
pwd
# Should be: /Users/chipai/Documents/Shared/projects/email-triage-system-3x-daily

# Path correct in script?
# scripts/email-triage.js, line ~16:
const CONFIG_PATH = path.join(PROJECT_ROOT, 'triage.config.json');

console.log('Looking for config at:', CONFIG_PATH);
```

---

### 15. Results Directory Fills Up Disk

**Issue:** `results/` directory grows too large.

**Solution:**

```bash
# Archive old results
mkdir -p archive
find results -mtime +30 -type f -exec mv {} archive/ \;

# Or delete old results
find results -mtime +60 -type f -delete

# Add cleanup to cron
# (Run weekly to clean files older than 60 days)
```

---

## Getting Help

### Check Logs First

```bash
# All logs combined
cat logs/*.log

# Just errors
cat logs/*-error.log

# Follow live
tail -f logs/morning.log logs/morning-error.log
```

### Run Script Directly

```bash
# This gives more detailed output than LaunchD
node scripts/email-triage.js 2>&1 | head -100
```

### Enable Debug Mode

Edit top of `scripts/email-triage.js`:
```javascript
const DEBUG = true;

// Then add:
if (DEBUG) console.log('🔍 DEBUG:', message);
```

### Common Command Reference

```bash
# See if jobs are loaded
launchctl list | grep email-triage

# Manually run a job
launchctl start com.mission-control.email-triage-morning

# Stop a job
launchctl stop com.mission-control.email-triage-morning

# Unload a job
launchctl unload ~/Library/LaunchAgents/com.mission-control.email-triage-morning.plist

# Reload a job
launchctl unload ~/Library/LaunchAgents/com.mission-control.email-triage-morning.plist
launchctl load ~/Library/LaunchAgents/com.mission-control.email-triage-morning.plist

# View job logs
log stream --predicate 'process == "email-triage"' --level debug

# Test Node and script
/usr/local/bin/node --version
/usr/local/bin/node scripts/email-triage.js
```

---

## Still Stuck?

**Last Resort Debugging:**

```bash
# Add this at the very top of scripts/email-triage.js:
console.error('=== EMAIL TRIAGE DEBUG START ===');
console.error('Time:', new Date().toISOString());
console.error('CWD:', process.cwd());
console.error('NODE:', process.version);
console.error('Files check:');
console.error('  CONFIG:', fs.existsSync(CONFIG_PATH));
console.error('  STATE:', fs.existsSync(STATE_PATH));
console.error('  ENV:', fs.existsSync(path.join(PROJECT_ROOT, '.env.local')));
console.error('=== END DEBUG ===\n');

# Then run:
node scripts/email-triage.js > /tmp/triage-debug.log 2>&1
cat /tmp/triage-debug.log
```

---

**Version:** 1.0.0  
**Last Updated:** 2024-03-07

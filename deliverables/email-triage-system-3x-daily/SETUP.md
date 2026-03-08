# Setup Guide - Email Triage System

Complete step-by-step setup for 3x daily email triage (8 AM, 12 PM, 5 PM MST).

---

## Phase 1: Prerequisites

### 1.1 Verify System Requirements

```bash
# Check Node.js is installed
node --version
# Expected: v18.0.0 or higher

# Check npm is available
npm --version

# Verify you're on macOS
uname -s
# Expected: Darwin
```

### 1.2 Navigate to Project

```bash
cd ~/Documents/Shared/projects/email-triage-system-3x-daily
pwd
# Should show the project path
```

---

## Phase 2: Gmail API Setup

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a Project** → **NEW PROJECT**
3. Name: `Email Triage System`
4. Click **CREATE**
5. Wait for project to be created, then select it

### 2.2 Enable Gmail API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search: `Gmail API`
3. Click **Gmail API**
4. Click **ENABLE**
5. Wait for it to enable

### 2.3 Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS**
3. Select **Service Account**
4. Fill in:
   - Service account name: `email-triage`
   - Service account ID: `email-triage`
   - Description: `Email triage automation service`
5. Click **CREATE AND CONTINUE**
6. Click **CONTINUE** (skip optional steps)
7. Click **DONE**

### 2.4 Create & Download Key

1. Go to **APIs & Services** → **Credentials**
2. Under "Service Accounts", click `email-triage`
3. Go to **KEYS** tab
4. Click **ADD KEY** → **Create new key**
5. Select **JSON**
6. Click **CREATE**
7. Browser downloads `email-triage-[ID].json`

### 2.5 Place Service Account Key

```bash
# Move the downloaded key to project root
mv ~/Downloads/email-triage-*.json ~/Documents/Shared/projects/email-triage-system-3x-daily/service-account.json

# Verify
ls -l service-account.json
```

### 2.6 Share Gmail Account with Service Account

1. In service account, copy the **email address** (looks like `email-triage@project-id.iam.gserviceaccount.com`)
2. Go to [Google Account Settings](https://myaccount.google.com)
3. **Security** → **Less secure app access** (for older accounts)
   - OR use OAuth 2.0 consent (more complex, skip for now)
4. Grant the service account access to your Gmail:
   - Forward your emails to a shared inbox, OR
   - Create a shared Gmail label and share with service account

**Alternative: Use your own Gmail with OAuth 2.0**
- More complex, requires user consent flow
- See ADVANCED.md if needed

---

## Phase 3: Configuration

### 3.1 Create .env.local

```bash
# Copy example config
cp .env.example .env.local

# Edit with your paths
nano .env.local
```

Set these values:
```bash
GOOGLE_KEY_FILE=./service-account.json
SLACK_BOT_TOKEN=xoxb-your-slack-token  # (optional, for alerts)
SLACK_USER_ID=U12345678                 # (optional, Chip's user ID)
DATABASE_TYPE=json-file
DATABASE_PATH=./triage.db
LOG_LEVEL=info
```

Save and exit (Ctrl+X, Y, Enter).

### 3.2 Customize triage.config.json

Edit `triage.config.json` to match your email domains and keywords.

**Example customization:**

```json
{
  "domains": {
    "turbotenant": {
      "label": "TurboTenant",
      "keywords": ["turbotenant", "tenant", "lease", "property"],
      "emails": ["@turbotenant.com", "@yourdomain.com"],
      "priority": "high"
    }
  }
}
```

Key sections:
- `domains`: Email categories by domain
- `urgencyPatterns`: Keywords that trigger urgency (URGENT, ASAP, etc.)
- `actionKeywords`: Words that indicate action items

---

## Phase 4: Installation

### 4.1 Install Dependencies

```bash
# Install Node packages
npm install

# Verify googleapis is installed
npm list googleapis
```

### 4.2 Create Directories

```bash
# Create logs and results directories
mkdir -p logs results archive

# Verify
ls -d logs results archive
```

### 4.3 Install LaunchD Jobs

**Option A: Automated (recommended)**

```bash
bash scripts/install-launchd.sh
```

This will:
- Create `logs/` directory
- Create `results/` directory
- Make script executable
- Copy 3 plist files to `~/Library/LaunchAgents/`
- Load all 3 jobs with `launchctl`

**Option B: Manual Installation**

```bash
# Make script executable
chmod +x scripts/email-triage.js

# Copy plist files
cp .launchd/*.plist ~/Library/LaunchAgents/

# Load each job
launchctl load ~/Library/LaunchAgents/com.mission-control.email-triage-morning.plist
launchctl load ~/Library/LaunchAgents/com.mission-control.email-triage-noon.plist
launchctl load ~/Library/LaunchAgents/com.mission-control.email-triage-evening.plist

# Verify
launchctl list | grep email-triage
```

---

## Phase 5: Testing

### 5.1 Test Manual Run

```bash
# Run the triage script manually
node scripts/email-triage.js
```

**Expected output:**
```
📧 Email Triage Starting...
📨 Fetching unread emails...
📊 Processing 12 emails...

📊 Triage Summary:
   Total Emails: 12
   Action Items: 5
   Urgent: 2
   Domains: turbotenant, wetried, gamebuzz

🚨 URGENT ITEMS DETECTED: 2
   1. [TurboTenant] Q1 Financials Review
      From: ceo@turbotenant.com
      Urgency: HIGH

✅ Results saved to results/triage-2024-03-07-1234567890.json
```

### 5.2 Check Results

```bash
# View latest triage results
ls -lt results/ | head -3

# Pretty-print the JSON
cat results/triage-*.json | jq '.' | head -50
```

### 5.3 Verify LaunchD Jobs

```bash
# Check if jobs are loaded
launchctl list | grep email-triage

# Expected output (3 entries):
# -	0	com.mission-control.email-triage-morning
# -	0	com.mission-control.email-triage-noon
# -	0	com.mission-control.email-triage-evening
```

### 5.4 Manually Trigger a Job

```bash
# Trigger morning job
launchctl start com.mission-control.email-triage-morning

# Check logs immediately
tail -f logs/morning.log

# Should see output within seconds
```

---

## Phase 6: Slack Integration (Optional)

### 6.1 Create Slack App

1. Go to [Slack Apps](https://api.slack.com/apps)
2. Click **Create New App**
3. Choose **From scratch**
4. App name: `Email Triage`
5. Workspace: Select your workspace
6. Click **Create App**

### 6.2 Configure Bot Token

1. Go to **OAuth & Permissions**
2. Under **Scopes** → **Bot Token Scopes**, add:
   - `chat:write`
   - `im:write`
3. Click **Install App to Workspace**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 6.3 Get Your User ID

1. In Slack, click your profile photo
2. Click **Profile**
3. Click **...** (three dots)
4. Click **Copy user ID**
5. It looks like: `U12345678ABC`

### 6.4 Update .env.local

```bash
nano .env.local
```

Add/update:
```bash
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_USER_ID=U12345678ABC
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 6.5 Test Slack Alert

```bash
# Create a test email with URGENT
# Or manually test by running:
node scripts/email-triage.js

# Check Slack DM from bot
```

---

## Phase 7: Monitoring

### 7.1 View Logs

```bash
# Morning run logs
tail -20 logs/morning.log

# Check for errors
cat logs/*-error.log

# Follow in real-time
tail -f logs/morning.log logs/noon.log logs/evening.log
```

### 7.2 Check Results

```bash
# List all results
ls -l results/

# View latest
cat results/$(ls -t results/ | head -1) | jq '.'

# Count action items from latest
cat results/$(ls -t results/ | head -1) | jq '.actionItems | length'
```

### 7.3 Verify Scheduled Runs

Jobs should execute at:
- **8:00 AM** → check `logs/morning.log`
- **12:00 PM** → check `logs/noon.log`
- **5:00 PM** → check `logs/evening.log`

Wait for scheduled time, then check logs.

---

## Phase 8: Dashboard Integration

To integrate with Mission Control dashboard:

### 8.1 API Setup

The system includes a Next.js API endpoint at `/api/email/triage` to:
- Trigger triage manually: `POST /api/email/triage`
- Fetch latest results: `GET /api/email/triage`

### 8.2 API Key

```bash
# Add to .env.local
TRIAGE_API_KEY=your-secret-key-here
```

### 8.3 API Usage Example

```bash
# GET latest results
curl http://localhost:3000/api/email/triage \
  -H "Authorization: Bearer YOUR_API_KEY"

# POST to trigger manually
curl -X POST http://localhost:3000/api/email/triage \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

---

## Troubleshooting Setup

### Problem: "Node command not found"

```bash
# Find Node location
which node

# If not found, install Node:
# - Via Homebrew: brew install node
# - Via nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Update plist files with correct path
nano .launchd/*.plist
# Change: <string>/usr/local/bin/node</string>
# To: <string>/opt/homebrew/bin/node</string> (or your Node path)
```

### Problem: "Gmail API credentials not found"

```bash
# Verify service account file
ls -l service-account.json

# Check .env.local has correct path
grep GOOGLE_KEY_FILE .env.local

# Verify JSON is valid
cat service-account.json | jq '.' > /dev/null && echo "Valid"
```

### Problem: "LaunchD jobs won't load"

```bash
# Check plist syntax
plutil -lint .launchd/com.mission-control.email-triage-morning.plist

# Verify all paths in plist exist
cat .launchd/com.mission-control.email-triage-morning.plist | grep -E "<string>/Users"

# Try loading manually with full path
launchctl load ~/Library/LaunchAgents/com.mission-control.email-triage-morning.plist

# Check logs
launchctl log stream --predicate 'process == "email-triage"' --level debug
```

### Problem: "No emails found but inbox has unread"

```bash
# Test Gmail API access manually
node -e "
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: './service-account.json',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly']
});
// ... test query
"

# Or run script with more verbose logging
DEBUG=1 node scripts/email-triage.js
```

---

## Next Steps

1. **Monitor first 3 runs** - Check logs at 8 AM, 12 PM, 5 PM
2. **Review triage results** - Look at `results/` JSON files
3. **Customize config** - Adjust domains, keywords, urgency patterns
4. **Add Slack alerts** - Optional, for urgent item notifications
5. **Integrate dashboard** - Add to Mission Control UI

---

## Support

- **README.md** - Full documentation
- **TROUBLESHOOTING.md** - Common issues & fixes
- **example-triage-output.json** - Sample output format
- **triage.config.json** - Configuration reference

---

**Setup Complete!** ✅

Your email triage system is ready. Jobs will run automatically at 8 AM, 12 PM, and 5 PM weekdays (MST).

Check logs to verify:
```bash
tail -f logs/morning.log
```

# Deployment Guide

Complete instructions for deploying the Slack approval bot to production.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Options](#deployment-options)
3. [macOS (launchd)](#macos-launchd)
4. [Linux (systemd)](#linux-systemd)
5. [Docker](#docker)
6. [Cloud Platforms](#cloud-platforms)
7. [Monitoring & Logs](#monitoring--logs)
8. [Rollback Procedure](#rollback-procedure)

## Pre-Deployment Checklist

- [ ] All tests pass: `npm test`
- [ ] Code linting passes: `npm run lint`
- [ ] Environment variables are configured
- [ ] Slack app is created and configured
- [ ] Slack bot token is valid: `curl -X POST https://slack.com/api/auth.test -H "Authorization: Bearer $SLACK_BOT_TOKEN"`
- [ ] Data directory exists and is writable: `touch data/test.txt && rm data/test.txt`
- [ ] Public URL is accessible for webhook
- [ ] SSL certificate is valid (if using HTTPS)

## Deployment Options

Choose one:

- **macOS**: Use launchd (built-in process manager)
- **Linux**: Use systemd (built-in process manager)
- **Docker**: Docker container (portable, reproducible)
- **Cloud**: Vercel, Fly.io, Railway, etc.

## macOS (launchd)

### Step 1: Build for Production

```bash
npm run build
npm run build  # Next.js build
```

### Step 2: Prepare Deployment

```bash
# Copy service file
sudo mkdir -p /Library/LaunchDaemons
sudo cp scripts/com.missioncontrol.slack-approval-bot.plist \
  /Library/LaunchDaemons/
```

### Step 3: Edit Configuration

Edit the plist file to match your setup:

```bash
sudo nano /Library/LaunchDaemons/com.missioncontrol.slack-approval-bot.plist
```

Replace:
- `/Users/REPLACE_USERNAME/` → Your actual username
- Check paths are correct

### Step 4: Set Permissions

```bash
sudo chown root:wheel /Library/LaunchDaemons/com.missioncontrol.slack-approval-bot.plist
sudo chmod 644 /Library/LaunchDaemons/com.missioncontrol.slack-approval-bot.plist
```

### Step 5: Load and Start

```bash
# Load the service
sudo launchctl load /Library/LaunchDaemons/com.missioncontrol.slack-approval-bot.plist

# Verify it loaded
sudo launchctl list | grep slack

# You should see the service in the list
```

### Step 6: Set Environment Variables

Create a file `~/.slack-approval-bot-env` with your environment variables:

```bash
export SLACK_BOT_TOKEN="xoxb-..."
export SLACK_SIGNING_SECRET="..."
export CHIP_USER_ID="U..."
```

Then modify the plist to source this file, or set them directly in the plist's `EnvironmentVariables` dict.

### Monitor

```bash
# View logs
tail -f /var/log/slack-approval-bot.log
tail -f /var/log/slack-approval-bot-error.log

# Check if running
sudo launchctl list | grep slack-approval-bot

# Restart
sudo launchctl unload /Library/LaunchDaemons/com.missioncontrol.slack-approval-bot.plist
sudo launchctl load /Library/LaunchDaemons/com.missioncontrol.slack-approval-bot.plist
```

## Linux (systemd)

### Step 1: Build for Production

```bash
npm run build
```

### Step 2: Create Service Directory

```bash
mkdir -p ~/.local/opt/slack-approval-bot
cp -r . ~/.local/opt/slack-approval-bot/
cd ~/.local/opt/slack-approval-bot
```

### Step 3: Copy Service Files

```bash
mkdir -p ~/.config/systemd/user
cp scripts/slack-approval-bot.service ~/.config/systemd/user/
cp scripts/slack-approval-bot.timer ~/.config/systemd/user/
```

### Step 4: Edit Service Configuration

Edit both files to update paths:

```bash
nano ~/.config/systemd/user/slack-approval-bot.service
```

Replace:
- `/home/REPLACE_USERNAME/` → Your home directory (check with `echo $HOME`)
- `/usr/bin/node` → Node location (check with `which node`)

Example:
```ini
[Service]
ExecStart=/home/username/.nvm/versions/node/v18.0.0/bin/node /home/username/.local/opt/slack-approval-bot/scripts/sync-approval-status.ts
```

### Step 5: Set Environment Variables

Create `~/.config/systemd/user/slack-approval-bot.env`:

```bash
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
CHIP_USER_ID=U...
```

Update the service file to include:

```ini
EnvironmentFile=%h/.config/systemd/user/slack-approval-bot.env
```

### Step 6: Enable and Start

```bash
# Reload systemd
systemctl --user daemon-reload

# Enable timer to start on boot
systemctl --user enable slack-approval-bot.timer

# Start the timer
systemctl --user start slack-approval-bot.timer

# Check status
systemctl --user status slack-approval-bot.timer
systemctl --user list-timers
```

### Monitor

```bash
# View logs
journalctl --user -u slack-approval-bot.service -f

# Check status
systemctl --user status slack-approval-bot.timer

# View last run
systemctl --user status slack-approval-bot.service

# Manually run
systemctl --user start slack-approval-bot.service
```

## Docker

### Step 1: Build Image

```bash
docker build -t slack-approval-bot:latest .
```

### Step 2: Create .env File

```bash
# Create docker.env
cat > docker.env << EOF
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
CHIP_USER_ID=U...
DASHBOARD_WEBHOOK_URL=http://mission-control:3000/api/approval-queue/webhook
NODE_ENV=production
PORT=3000
EOF
```

### Step 3: Run Container

```bash
# Basic run
docker run -d \
  --name slack-approval-bot \
  --env-file docker.env \
  -v approval-bot-data:/app/data \
  -p 3000:3000 \
  slack-approval-bot:latest

# Docker Compose
docker-compose up -d
```

### Step 4: Docker Compose (Optional)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  slack-approval-bot:
    build: .
    image: slack-approval-bot:latest
    container_name: slack-approval-bot
    ports:
      - "3000:3000"
    volumes:
      - approval-bot-data:/app/data
    env_file:
      - docker.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/approval-queue/status"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  approval-bot-data:
```

### Monitor

```bash
# View logs
docker logs -f slack-approval-bot

# Check status
docker ps | grep slack-approval-bot

# Restart
docker restart slack-approval-bot

# Enter container
docker exec -it slack-approval-bot /bin/sh
```

## Cloud Platforms

### Vercel

```bash
# Deploy to Vercel
npm install -g vercel
vercel

# Set environment variables
vercel env add SLACK_BOT_TOKEN
vercel env add SLACK_SIGNING_SECRET
vercel env add CHIP_USER_ID
```

**Note:** Vercel serverless functions are stateless. For data persistence, use a database or external storage.

### Fly.io

```bash
# Install fly CLI
curl https://fly.io/install.sh | sh

# Deploy
flyctl launch
flyctl secrets set SLACK_BOT_TOKEN=xoxb-...
flyctl secrets set SLACK_SIGNING_SECRET=...
flyctl secrets set CHIP_USER_ID=U...
flyctl deploy
```

### Railway

1. Push code to GitHub
2. Go to railway.app
3. Create new project
4. Connect GitHub repo
5. Add environment variables
6. Deploy

### Heroku

```bash
# Install Heroku CLI
brew install heroku/brew/heroku

# Login and deploy
heroku login
heroku create slack-approval-bot
heroku config:set SLACK_BOT_TOKEN=xoxb-...
heroku config:set SLACK_SIGNING_SECRET=...
heroku config:set CHIP_USER_ID=U...
git push heroku main
```

## Monitoring & Logs

### Health Check Endpoint

```bash
curl http://your-domain.com/api/approval-queue/status
```

Expected response:
```json
{
  "ok": true,
  "timestamp": "2024-01-15T10:30:00Z",
  "summary": {
    "pending": 5,
    "approved": 10,
    "rejected": 2
  }
}
```

### Set Up Alerts

Monitor these:

1. **Service Down**
   - Health check endpoint returns error
   - No response for > 5 minutes

2. **High Pending Queue**
   - Pending items > 20
   - Indicates approvals not happening

3. **Sync Failures**
   - Dashboard webhook returning errors
   - Check logs for `Error syncing with dashboard`

4. **Slack API Errors**
   - Bot unable to send messages
   - Check logs for `Slack API error`

### Log Rotation

Set up log rotation to prevent disk space issues:

**macOS:**
```bash
# Create /etc/newsyslog.d/slack-approval-bot
/var/log/slack-approval-bot*.log {
  size 10M
  files 7
  compress
}
```

**Linux:**
```bash
# Create /etc/logrotate.d/slack-approval-bot
/var/log/slack-approval-bot*.log {
  daily
  missingok
  rotate 7
  compress
  delaycompress
  notifempty
}
```

## Rollback Procedure

### Rollback from macOS

```bash
# Stop the service
sudo launchctl unload /Library/LaunchDaemons/com.missioncontrol.slack-approval-bot.plist

# Restore previous version from git
git checkout <previous-commit>
npm install
npm run build

# Restart
sudo launchctl load /Library/LaunchDaemons/com.missioncontrol.slack-approval-bot.plist

# Verify
sudo launchctl list | grep slack
```

### Rollback from Linux

```bash
# Stop the timer
systemctl --user stop slack-approval-bot.timer
systemctl --user stop slack-approval-bot.service

# Restore previous version
git checkout <previous-commit>
npm install
npm run build

# Restart
systemctl --user start slack-approval-bot.timer

# Verify
systemctl --user status slack-approval-bot.timer
```

### Rollback from Docker

```bash
# Stop current container
docker stop slack-approval-bot

# Restore previous image
docker run -d \
  --name slack-approval-bot \
  --env-file docker.env \
  -v approval-bot-data:/app/data \
  -p 3000:3000 \
  slack-approval-bot:previous-tag

# Verify
docker logs -f slack-approval-bot
```

## Performance Optimization

### Database Migration

For high-volume deployments, migrate from JSON to SQLite:

```bash
# Create migration script
npm run migrate:sqlite

# Update code to use DB instead of JSON
# See database configuration in INTEGRATION.md
```

### Caching

Enable caching for queue status:

```bash
# Install Redis (if using cloud platform with Redis support)
# Update code to cache status in Redis
```

### Rate Limiting

Add rate limiting to webhook endpoint:

```typescript
// Use express-rate-limit or similar
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100 // 100 requests per minute
});

app.post('/api/slack/webhook', limiter, handler);
```

## Backup & Disaster Recovery

### Backup Strategy

```bash
# Daily backup of data directory
0 2 * * * tar -czf ~/backups/approval-bot-$(date +%Y-%m-%d).tar.gz ~/Documents/Shared/projects/set-up-slack-dm-approval-bot/data/

# Upload to cloud storage
# Example: S3, Google Drive, Dropbox
```

### Restore from Backup

```bash
# Extract backup
tar -xzf approval-bot-2024-01-15.tar.gz -C ~/Documents/Shared/projects/set-up-slack-dm-approval-bot/

# Restart service
sudo launchctl restart com.missioncontrol.slack-approval-bot
```

---

You're ready to deploy! Start with development/testing, then move to production once verified.

# Project Files - Complete Reference

This document lists all files in the Slack Approval Bot project and their purposes.

## Directory Structure

```
set-up-slack-dm-approval-bot/
├── src/                              # Source code (Next.js app)
│   ├── app/                          # Next.js app directory
│   │   ├── layout.tsx               # Root layout component
│   │   ├── page.tsx                 # Home page (status dashboard)
│   │   └── api/                     # API routes
│   │       ├── slack/
│   │       │   ├── events/
│   │       │   │   └── route.ts     # Slack event subscriptions handler
│   │       │   ├── actions/
│   │       │   │   └── route.ts     # Slack interactive components handler
│   │       │   └── webhook/
│   │       │       └── route.ts     # Mission Control webhook receiver
│   │       └── approval-queue/
│   │           └── status/
│   │               └── route.ts     # Queue status endpoint
│   └── lib/
│       └── slack-approval-bot.ts    # Core bot logic and utilities
├── scripts/                          # Utility and deployment scripts
│   ├── sync-approval-status.ts      # Periodic sync script
│   ├── com.missioncontrol.slack-approval-bot.plist  # macOS launchd config
│   ├── slack-approval-bot.service   # Linux systemd service file
│   └── slack-approval-bot.timer     # Linux systemd timer file
├── data/                            # Runtime data (git-ignored)
│   ├── .gitkeep                    # Placeholder
│   ├── approval-queue.json         # Current queue state (generated)
│   └── slack-messages-map.json     # Message ID tracking (generated)
├── Documentation
│   ├── README.md                    # Main documentation
│   ├── QUICKSTART.md               # 5-minute setup guide
│   ├── SLACK-SETUP.md              # Slack app configuration
│   ├── INTEGRATION.md              # Mission Control integration
│   ├── DEPLOYMENT.md               # Production deployment guide
│   └── PROJECT-FILES.md            # This file
├── Configuration & Build
│   ├── package.json                # Dependencies and scripts
│   ├── tsconfig.json               # TypeScript configuration
│   ├── next.config.js              # Next.js configuration
│   ├── .env.example                # Environment variables template
│   ├── .gitignore                  # Git ignore rules
│   ├── Dockerfile                  # Docker build configuration
│   └── docker-compose.yml          # Docker Compose for local dev
└── Deployment Files
    └── scripts/                     # See scripts section above
```

## File Descriptions

### Core Bot Logic

#### `src/lib/slack-approval-bot.ts` (9.5 KB)
**Purpose:** Core Slack approval bot logic and utilities

**Exports:**
- `SlackApprovalBot` class - Main bot functionality
- `ApprovalQueueItem` interface - Type definition for approval items
- `SlackMessage` interface - Type definition for Slack messages

**Key Methods:**
- `formatApprovalMessage()` - Format rich Slack message blocks
- `sendApprovalRequest()` - Send DM to Chip with approval request
- `handleReactionAdded()` - Process reaction events
- `approveItem()` - Mark item as approved
- `rejectItem()` - Mark item as rejected
- `requestRejectionReason()` - Ask for feedback on rejection
- `loadApprovalQueue()` - Load queue from file
- `saveApprovalQueue()` - Persist queue to file
- `getQueueStatus()` - Get summary of pending/approved/rejected

### API Routes

#### `src/app/api/slack/events/route.ts` (5.1 KB)
**Purpose:** Handle Slack event subscriptions

**Handles:**
- `reaction_added` - User reacted with emoji (👍 or 👎)
- `reaction_removed` - User removed reaction
- `message` - Direct messages (for rejection reasons)
- URL verification challenge for Slack verification

**Security:**
- Verifies Slack request signature (X-Slack-Signature)
- Validates request timestamp (prevents replay attacks)

#### `src/app/api/slack/actions/route.ts` (5.6 KB)
**Purpose:** Handle interactive Slack components (button clicks)

**Handles:**
- Approve button clicks → Opens confirmation modal
- Reject button clicks → Opens rejection reason modal
- Modal submissions → Saves approval/rejection with reason

**Response:**
- Immediately returns 200 OK (async processing)
- Shows modal to user with confirmation

#### `src/app/api/slack/webhook/route.ts` (4.8 KB)
**Purpose:** Receive new approval requests from Mission Control

**Expects:**
```json
{
  "type": "new-approval-request",
  "item": {
    "id": "string",
    "title": "string",
    "type": "email|social|blog",
    "content": "string",
    "sourceAgent": "string",
    "createdAt": "ISO-8601 timestamp (optional)"
  }
}
```

**Validation:**
- Webhook token authentication (optional but recommended)
- Validates required fields
- Checks for duplicate items
- Returns 201 on success

#### `src/app/api/approval-queue/status/route.ts` (1.3 KB)
**Purpose:** GET endpoint to check queue status

**Response:**
```json
{
  "ok": true,
  "timestamp": "ISO-8601",
  "summary": {
    "pending": 5,
    "approved": 10,
    "rejected": 2
  },
  "items": [...],
  "pending": [...],
  "approved": [...],
  "rejected": [...]
}
```

### Frontend

#### `src/app/page.tsx` (1.8 KB)
**Purpose:** Home page with status dashboard and documentation links

**Shows:**
- Service status (running on port 3000)
- API endpoints available
- Quick links to documentation
- Example webhook request

#### `src/app/layout.tsx` (526 bytes)
**Purpose:** Root layout component for Next.js app

**Provides:**
- HTML structure
- Metadata (title, description)
- Root wrapper

### Scripts

#### `scripts/sync-approval-status.ts` (3.2 KB)
**Purpose:** Periodic sync script to update dashboard with approval status

**Functionality:**
- Loads approval queue from file
- Calculates summary (pending/approved/rejected)
- Sends webhook to dashboard
- Logs results

**Invoked by:**
- macOS launchd (every 5 minutes)
- Linux systemd timer (every 5 minutes)
- Can be run manually: `npm run sync`

#### `scripts/com.missioncontrol.slack-approval-bot.plist` (1.2 KB)
**Purpose:** macOS launchd configuration file

**Configures:**
- Program path
- Environment variables
- Log files
- Startup timing (every 5 minutes)
- Automatic restart on failure

**Installation:**
```bash
sudo cp scripts/com.missioncontrol.slack-approval-bot.plist \
  /Library/LaunchDaemons/
sudo launchctl load /Library/LaunchDaemons/com.missioncontrol.slack-approval-bot.plist
```

#### `scripts/slack-approval-bot.service` (628 bytes)
**Purpose:** Linux systemd service unit file

**Configures:**
- Service type (oneshot for sync script)
- User and working directory
- Execution command
- Environment variables
- Journal logging

**Installation:**
```bash
cp scripts/slack-approval-bot.service \
  ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable slack-approval-bot.service
```

#### `scripts/slack-approval-bot.timer` (234 bytes)
**Purpose:** Linux systemd timer (like cron)

**Configures:**
- Initial delay after boot (30 seconds)
- Repeat interval (5 minutes)
- Persistent timing (survives reboots)

**Installation:**
```bash
cp scripts/slack-approval-bot.timer \
  ~/.config/systemd/user/
systemctl --user enable slack-approval-bot.timer
systemctl --user start slack-approval-bot.timer
```

### Configuration Files

#### `package.json`
**Purpose:** Node.js project manifest

**Key Scripts:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run sync` - Run sync script manually

**Dependencies:**
- `@slack/web-api` - Slack API client
- `axios` - HTTP client
- `next` - Next.js framework
- `react`, `react-dom` - React UI library

#### `tsconfig.json`
**Purpose:** TypeScript compiler configuration

**Settings:**
- Target: ES2020
- Module: ESNext
- Strict mode enabled
- Path aliases configured (`@/*`, `@/lib/*`)

#### `next.config.js`
**Purpose:** Next.js build configuration

**Settings:**
- React strict mode enabled
- SWC minification enabled
- Server runtime config for data directory

#### `.env.example`
**Purpose:** Template for environment variables

**Variables:**
```env
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
CHIP_USER_ID=U...
DASHBOARD_WEBHOOK_URL=http://localhost:3000/api/approval-queue/webhook
```

#### `.gitignore`
**Purpose:** Git ignore patterns

**Ignores:**
- node_modules, .next, build artifacts
- Environment files (.env.local)
- IDE directories (.vscode, .idea)
- Data files (approval-queue.json, etc.)

### Docker

#### `Dockerfile`
**Purpose:** Docker image build configuration

**Base:** Node.js 18 Alpine
**Stages:**
1. Install dependencies
2. Copy source code
3. Build Next.js app
4. Expose port 3000
5. Health check endpoint
6. Start application

#### `docker-compose.yml`
**Purpose:** Local development with Docker Compose

**Services:**
- slack-approval-bot service
- Volume mounts for live reload
- Environment variables from .env
- Health check configured
- Auto-restart policy

### Documentation

#### `README.md` (13.6 KB)
**Purpose:** Comprehensive project documentation

**Sections:**
- Feature overview
- Quick start guide
- Project structure
- API endpoints
- Configuration reference
- Production deployment
- Troubleshooting
- Performance notes
- Security considerations

#### `QUICKSTART.md` (5.3 KB)
**Purpose:** 5-minute setup guide for new users

**Steps:**
1. Clone and install
2. Create Slack app
3. Get credentials
4. Configure environment
5. Configure Slack app events
6. Start development server
7. Test with curl or manual request
8. Approve/reject in Slack

#### `SLACK-SETUP.md` (5.9 KB)
**Purpose:** Detailed Slack app configuration guide

**Steps:**
1. Create new Slack app from scratch
2. Configure event subscriptions
3. Configure interactivity
4. Set OAuth permissions (scopes)
5. Install to workspace
6. Get signing secret
7. Get user ID
8. Configure environment variables
9. Set bot display name
10. Test setup

**Troubleshooting:**
- Invalid request URL
- Request timeout
- Reactions not working
- Messages not being sent

#### `INTEGRATION.md` (10.4 KB)
**Purpose:** Integration with Mission Control approval queue

**Topics:**
- Architecture overview
- Data storage options (file, database, message queue)
- Hook function for Mission Control
- Webhook route for receiving approvals
- Environment configuration
- Testing integration
- Troubleshooting integration
- Performance considerations
- Security notes

#### `DEPLOYMENT.md` (10.6 KB)
**Purpose:** Production deployment instructions

**Deployment Options:**
- macOS (launchd)
- Linux (systemd)
- Docker
- Cloud platforms (Vercel, Fly.io, Railway, Heroku)

**Additional Topics:**
- Pre-deployment checklist
- Monitoring and health checks
- Log rotation
- Rollback procedures
- Performance optimization
- Backup and disaster recovery

#### `PROJECT-FILES.md`
**Purpose:** This file - Complete file reference

## File Statistics

| Category | Count | Size (approx) |
|----------|-------|---------------|
| Source Code (.ts, .tsx) | 6 | 14 KB |
| API Routes | 4 | 18 KB |
| Configuration | 8 | 5 KB |
| Scripts | 4 | 5 KB |
| Documentation | 7 | 46 KB |
| Docker | 2 | 1.3 KB |
| **Total** | **31** | **89 KB** |

## Data Files (Generated at Runtime)

### `data/approval-queue.json`
**Format:**
```json
[
  {
    "id": "item-123",
    "title": "Review proposal",
    "type": "email",
    "content": "...",
    "sourceAgent": "email-agent",
    "createdAt": "2024-01-15T10:00:00Z",
    "status": "pending|approved|rejected",
    "rejectionReason": "optional reason"
  }
]
```

### `data/slack-messages-map.json`
**Format:**
```json
{
  "channel_ts": {
    "ts": "message_timestamp",
    "channel": "channel_id",
    "userId": "user_id",
    "itemId": "approval_item_id"
  }
}
```

**Purpose:** Maps Slack messages to approval items for reaction handling

## Quick Reference

### Development
```bash
npm install           # Install dependencies
npm run dev          # Start dev server (port 3000)
npm run lint         # Run linter
```

### Production
```bash
npm run build        # Build for production
npm start           # Start production server
npm run sync        # Run sync script manually
```

### Testing
```bash
# Test webhook
curl -X POST http://localhost:3000/api/slack/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"new-approval-request","item":{"id":"test","title":"Test","type":"blog","content":"...","sourceAgent":"test"}}'

# Check queue status
curl http://localhost:3000/api/approval-queue/status

# View approval queue
cat data/approval-queue.json | jq

# Manual sync
npm run sync
```

### Deployment

**macOS:**
```bash
sudo cp scripts/com.missioncontrol.slack-approval-bot.plist \
  /Library/LaunchDaemons/
sudo launchctl load /Library/LaunchDaemons/com.missioncontrol.slack-approval-bot.plist
```

**Linux:**
```bash
cp scripts/slack-approval-bot.{service,timer} \
  ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable slack-approval-bot.timer
systemctl --user start slack-approval-bot.timer
```

**Docker:**
```bash
docker build -t slack-approval-bot .
docker run -d --env-file .env.local -p 3000:3000 slack-approval-bot
```

---

For more details, see the main README.md or specific documentation files.

# Approval Queue System for Mission Control

A comprehensive approval workflow system for Mission Control, enabling review and approval of content submissions (emails, social posts, blog articles, general content) before execution.

## Features

✅ **File-based Queue System** - Simple, transparent storage in `/data/approval-queue/{pending,approved,rejected}/`
✅ **RESTful API** - Complete CRUD operations with pagination
✅ **Dashboard UI** - Full-featured approval management interface
✅ **Dashboard Widget** - Compact quick-access widget showing pending count
✅ **Slack Integration** - DM notifications when items enter queue and on approval/rejection
✅ **Audit Logging** - Complete timestamped history of all approvals and rejections

## Architecture

```
approval-queue-system/
├── lib/
│   ├── approval-queue.ts          # Core queue management logic
│   └── slack-notifications.ts      # Slack integration
├── api/
│   └── approvals/
│       ├── route.ts                # GET /api/approvals, POST /api/approvals
│       └── [id]/
│           ├── route.ts            # GET /api/approvals/:id
│           ├── approve/route.ts    # POST /api/approvals/:id/approve
│           └── reject/route.ts     # POST /api/approvals/:id/reject
├── components/
│   └── ApprovalQueueWidget.tsx     # Dashboard widget component
├── pages/
│   └── approvals/page.tsx          # Full approval management page
└── README.md                       # This file
```

## Setup

### 1. Copy Files to Mission Control

Copy all files to your Mission Control (`/Users/chipai/workshop`) directory:

```bash
# Copy library files
cp -r lib/* /Users/chipai/workshop/src/lib/

# Copy API routes
cp -r api/* /Users/chipai/workshop/src/app/api/

# Copy components
cp components/* /Users/chipai/workshop/src/components/

# Copy pages
cp pages/* /Users/chipai/workshop/src/app/
```

### 2. Initialize Queue Directory

The system automatically creates the queue directory structure on first use:
- `/data/approval-queue/pending/` - Items awaiting review
- `/data/approval-queue/approved/` - Approved items
- `/data/approval-queue/rejected/` - Rejected items
- `/data/approval-queue/audit.log` - Audit trail

### 3. Configure Slack Integration (Optional)

Add to your `.env` file:

```env
# Slack bot token with chat:write permission
SLACK_BOT_TOKEN=xoxb-your-token-here

# User ID to receive approval notifications
SLACK_APPROVER_USER_ID=U1234567890
```

To get these values:
1. Create a Slack app at https://api.slack.com/apps
2. Add `chat:write` scope
3. Install app to your workspace and copy the Bot Token
4. Find your User ID in Slack (right-click profile → Copy user ID)

### 4. Integrate Dashboard Widget

Add to your Mission Control dashboard:

```tsx
import { ApprovalQueueWidget } from '@/components/ApprovalQueueWidget';

export default function Dashboard() {
  return (
    <div>
      {/* Other widgets */}
      <ApprovalQueueWidget onRefresh={() => {}} />
    </div>
  );
}
```

## API Endpoints

### GET /api/approvals
List pending approval items with pagination.

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 10) - Items per page

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "email|social|blog|content",
      "title": "string",
      "preview": "string (max 300 chars)",
      "content": "full markdown/html",
      "source_agent": "agent-id",
      "created_at": "ISO timestamp",
      "metadata": { "platform": "twitter", "domain": "wetried", ... },
      "approved_at": null,
      "approved_by": null,
      "rejected_at": null,
      "rejection_reason": null,
      "executed_at": null
    }
  ],
  "total": 5,
  "page": 1,
  "pages": 1
}
```

### POST /api/approvals
Create a new approval item.

**Request Body:**
```json
{
  "type": "email|social|blog|content",
  "title": "Item Title",
  "preview": "Short preview text (max 300 chars)",
  "content": "Full HTML or markdown content",
  "source_agent": "agent-name",
  "metadata": { "optional": "metadata" }
}
```

**Response:** Created ApprovalItem (201 Created)

### GET /api/approvals/:id
Get a single approval item with audit history.

**Response:**
```json
{
  "id": "uuid",
  "type": "email",
  "title": "...",
  "preview": "...",
  "content": "...",
  "source_agent": "...",
  "created_at": "...",
  "approved_at": "...",
  "approved_by": "...",
  "rejected_at": null,
  "rejection_reason": null,
  "executed_at": null,
  "auditLog": [
    {
      "id": "uuid",
      "item_id": "uuid",
      "action": "created|approved|rejected",
      "actor": "user-id",
      "reason": "optional rejection reason",
      "timestamp": "ISO timestamp"
    }
  ]
}
```

### POST /api/approvals/:id/approve
Approve an item.

**Request Body:**
```json
{
  "approvedBy": "user-id"
}
```

**Response:** Updated ApprovalItem with approval timestamp

### POST /api/approvals/:id/reject
Reject an item.

**Request Body:**
```json
{
  "rejectedBy": "user-id",
  "reason": "optional rejection reason"
}
```

**Response:** Updated ApprovalItem with rejection timestamp and reason

## File Schema

Each approval item is stored as a JSON file in the queue directories:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "email",
  "title": "Weekly Newsletter - Week 10",
  "preview": "This week we cover the top 5 bedsheet comparisons...",
  "content": "<h1>Weekly Newsletter</h1><p>Full HTML content here...</p>",
  "source_agent": "email-agent-001",
  "created_at": "2026-03-07T16:30:00.000Z",
  "metadata": {
    "platform": "email",
    "domain": "wetried.com",
    "recipient_list": "weekly_subscribers"
  },
  "approved_at": "2026-03-07T16:45:00.000Z",
  "approved_by": "user@example.com",
  "rejected_at": null,
  "rejection_reason": null,
  "executed_at": null
}
```

## Audit Logging

All operations are logged to `/data/approval-queue/audit.log` as newline-delimited JSON:

```json
{"id":"uuid","item_id":"uuid","action":"created","actor":"agent-name","timestamp":"2026-03-07T16:30:00.000Z"}
{"id":"uuid","item_id":"uuid","action":"approved","actor":"user-id","timestamp":"2026-03-07T16:45:00.000Z"}
{"id":"uuid","item_id":"uuid","action":"rejected","actor":"user-id","reason":"Too promotional","timestamp":"2026-03-07T17:00:00.000Z"}
```

## Slack Integration

### When Item is Created
The system sends a DM with:
- Item type, title, and preview
- Source agent information
- Quick approve/reject buttons

### When Item is Approved/Rejected
The system sends a follow-up DM with:
- Decision status (✅ Approved / ❌ Rejected)
- Who reviewed it
- For rejections: the reason provided

**Note:** Configure `SLACK_BOT_TOKEN` and `SLACK_APPROVER_USER_ID` in `.env` for notifications to work.

## Dashboard Widget

The `ApprovalQueueWidget` component displays:
- **Pending count** - Number of items awaiting approval (badge)
- **Recent items** - List of 5 most recent pending items
- **Quick actions** - Approve/reject buttons for each item
- **Auto-refresh** - Updates every 30 seconds

Usage:
```tsx
import { ApprovalQueueWidget } from '@/components/ApprovalQueueWidget';

<ApprovalQueueWidget onRefresh={() => {}} />
```

## Full Approval Page

Access the full approval management interface at `/approvals`:
- **Paginated table** of all pending items
- **Sortable columns** by type, title, source, date
- **Detail modal** with full content preview
- **Inline approval/rejection** with optional reasons
- **Audit history** for each item

## Usage Example

### Creating an Approval Item

```bash
curl -X POST http://localhost:3000/api/approvals \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "title": "Monthly Report - March 2026",
    "preview": "Here are the key metrics for March...",
    "content": "<h1>Monthly Report</h1><p>Full report content...</p>",
    "source_agent": "reporting-agent",
    "metadata": {
      "month": "March",
      "year": 2026,
      "report_type": "monthly"
    }
  }'
```

### Approving an Item

```bash
curl -X POST http://localhost:3000/api/approvals/550e8400-e29b-41d4-a716-446655440000/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approvedBy": "user@example.com"
  }'
```

### Rejecting an Item

```bash
curl -X POST http://localhost:3000/api/approvals/550e8400-e29b-41d4-a716-446655440000/reject \
  -H "Content-Type: application/json" \
  -d '{
    "rejectedBy": "user@example.com",
    "reason": "Needs revision - metrics don't match Q1 targets"
  }'
```

### Fetching Items

```bash
curl http://localhost:3000/api/approvals?page=1&limit=10
```

## Integration with Agents

Agents can submit items for approval before execution:

```typescript
// In your agent code
async function submitForApproval(content: string) {
  const response = await fetch('/api/approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'email',
      title: 'Generated Email - ' + new Date().toISOString(),
      preview: content.substring(0, 300),
      content: content,
      source_agent: 'your-agent-name',
      metadata: {
        // Agent-specific metadata
        generated_at: new Date().toISOString(),
        model: 'gpt-4',
      },
    }),
  });
  
  const item = await response.json();
  console.log(`Item submitted for approval: ${item.id}`);
  return item.id;
}
```

## Error Handling

The API returns appropriate HTTP status codes:
- `200 OK` - Successful GET or modification
- `201 Created` - New item created
- `400 Bad Request` - Missing required fields or invalid request
- `404 Not Found` - Item not found
- `500 Internal Server Error` - Server error

Error responses include an `error` field:
```json
{
  "error": "Approval item not found"
}
```

## Performance Considerations

- **File-based storage** is ideal for < 10,000 items
- **Pagination** is built-in to prevent loading large datasets
- **Audit log** grows indefinitely; consider archiving after 6 months
- **Auto-refresh interval** in widget is 30 seconds (configurable)

For very large volumes (> 50,000 items), consider migrating to a database backend.

## Security Notes

- Queue files contain sensitive content - restrict `/data/approval-queue/` directory permissions
- Audit logs should be protected and periodically archived
- Slack tokens should never be committed to version control
- API endpoints should be protected behind authentication in production

## Troubleshooting

### Slack notifications not working
1. Check that `SLACK_BOT_TOKEN` is set in `.env`
2. Verify bot has `chat:write` scope
3. Ensure `SLACK_APPROVER_USER_ID` is correct
4. Check server logs for detailed error messages

### Items not appearing in queue
1. Verify `/data/approval-queue/pending/` directory exists and is writable
2. Check file permissions on the directory
3. Review server logs for validation errors

### Dashboard widget not updating
1. Check browser console for errors
2. Verify `/api/approvals` endpoint is working
3. Ensure CORS is configured correctly if using different domain

## Future Enhancements

- [ ] Database backend option for large volumes
- [ ] Webhook notifications (beyond Slack)
- [ ] Multi-user approval workflows (staged approval)
- [ ] Content templating and variable substitution
- [ ] A/B testing approval
- [ ] Analytics and approval metrics
- [ ] Auto-execution after approval
- [ ] Scheduled/delayed execution
- [ ] Revision request workflow

## License

Built for Mission Control. Part of the ClawdBot ecosystem.

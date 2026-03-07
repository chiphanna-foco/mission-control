# Approval Queue System - File Manifest

Complete list of all files in the approval queue system, their purposes, and integration paths.

## Directory Structure

```
build-approval-queue-system/
├── lib/
│   ├── approval-queue.ts              # Core queue management logic
│   └── slack-notifications.ts         # Slack integration module
├── api/
│   └── approvals/
│       ├── route.ts                   # GET /api/approvals, POST /api/approvals
│       └── [id]/
│           ├── route.ts               # GET /api/approvals/:id
│           ├── approve/
│           │   └── route.ts           # POST /api/approvals/:id/approve
│           └── reject/
│               └── route.ts           # POST /api/approvals/:id/reject
├── components/
│   └── ApprovalQueueWidget.tsx        # React widget component
├── pages/
│   └── approvals/
│       └── page.tsx                   # Full approval management page
├── examples/
│   └── agent-integration.ts           # Agent integration examples
├── tests/
│   ├── approval-queue.test.ts         # Unit tests
│   └── api-integration.test.ts        # API integration tests
├── README.md                          # Main documentation
├── SETUP.md                           # Setup guide
├── MANIFEST.md                        # This file
└── .env.example                       # Environment configuration template
```

## Core Files

### `lib/approval-queue.ts` (6.6 KB)

**Purpose:** File-based queue management system

**Key Functions:**
- `initializeQueue()` - Create queue directories
- `createApprovalItem()` - Create new approval request
- `getPendingItems(page, limit)` - List pending items with pagination
- `getApprovalItem(id)` - Get single item by ID
- `approveItem(id, approvedBy)` - Approve an item
- `rejectItem(id, rejectedBy, reason)` - Reject an item
- `getAuditLog(itemId?)` - Get audit trail
- `getPendingCount()` - Count pending items
- `getAllItems()` - Get all items across all statuses

**Integration Path:** `/Users/chipai/workshop/src/lib/approval-queue.ts`

### `lib/slack-notifications.ts` (6.2 KB)

**Purpose:** Slack integration for approval notifications

**Key Functions:**
- `notifySlackApprovalQueue(item)` - Send DM when item enters queue
- `notifySlackApprovalDecision(item, decision, actor, reason)` - Send approval/rejection notification

**Dependencies:**
- `SLACK_BOT_TOKEN` environment variable
- `SLACK_APPROVER_USER_ID` environment variable

**Integration Path:** `/Users/chipai/workshop/src/lib/slack-notifications.ts`

## API Endpoints

### `api/approvals/route.ts` (2.0 KB)

**GET /api/approvals**
- Query params: `page` (default: 1), `limit` (default: 10)
- Returns: Paginated list of pending items

**POST /api/approvals**
- Request body: `{ type, title, preview, content, source_agent, metadata }`
- Returns: Created ApprovalItem (201)
- Triggers: Slack notification

**Integration Path:** `/Users/chipai/workshop/src/app/api/approvals/route.ts`

### `api/approvals/[id]/route.ts` (0.8 KB)

**GET /api/approvals/:id**
- Returns: Full item details with audit log

**Integration Path:** `/Users/chipai/workshop/src/app/api/approvals/[id]/route.ts`

### `api/approvals/[id]/approve/route.ts` (1.2 KB)

**POST /api/approvals/:id/approve**
- Request body: `{ approvedBy }`
- Returns: Updated ApprovalItem
- Moves: Item from pending to approved
- Triggers: Slack notification, audit log entry

**Integration Path:** `/Users/chipai/workshop/src/app/api/approvals/[id]/approve/route.ts`

### `api/approvals/[id]/reject/route.ts` (1.3 KB)

**POST /api/approvals/:id/reject**
- Request body: `{ rejectedBy, reason }`
- Returns: Updated ApprovalItem
- Moves: Item from pending to rejected
- Triggers: Slack notification, audit log entry

**Integration Path:** `/Users/chipai/workshop/src/app/api/approvals/[id]/reject/route.ts`

## UI Components

### `components/ApprovalQueueWidget.tsx` (6.4 KB)

**Purpose:** Compact dashboard widget showing pending approvals

**Features:**
- Displays pending count with badge
- Shows 5 most recent pending items
- Quick approve/reject buttons
- Auto-refresh every 30 seconds
- Expandable/collapsible design

**Props:**
- `onRefresh?: () => void` - Optional callback on state changes

**Integration:**
```tsx
import { ApprovalQueueWidget } from '@/components/ApprovalQueueWidget';

<ApprovalQueueWidget onRefresh={() => { /* refresh dashboard */ }} />
```

**Integration Path:** `/Users/chipai/workshop/src/components/ApprovalQueueWidget.tsx`

### `pages/approvals/page.tsx` (14.2 KB)

**Purpose:** Full approval management page

**Features:**
- Paginated table of pending items
- Type badges (email, social, blog, content)
- Sortable columns
- Detail modal with full content preview
- Inline approve/reject buttons with reason input
- Audit history per item
- Status indicator (approved/rejected)

**Route:** `/approvals`

**Integration Path:** `/Users/chipai/workshop/src/app/approvals/page.tsx`

## Test Files

### `tests/approval-queue.test.ts` (13.5 KB)

**Unit Tests for Core Functionality:**
- Queue initialization
- Item creation with validation
- Pagination
- Approve/reject workflows
- Audit logging
- Pending count and item retrieval

**Run with:**
```bash
npm test tests/approval-queue.test.ts
```

**Integration Path:** `/Users/chipai/workshop/tests/approval-queue.test.ts`

### `tests/api-integration.test.ts` (12.2 KB)

**Integration Tests for API Endpoints:**
- POST /api/approvals (creation, validation)
- GET /api/approvals (pagination)
- GET /api/approvals/:id (details with audit)
- POST /api/approvals/:id/approve
- POST /api/approvals/:id/reject
- Complete approval workflow

**Run with:**
```bash
npm test tests/api-integration.test.ts
```

**Integration Path:** `/Users/chipai/workshop/tests/api-integration.test.ts`

## Documentation

### `README.md` (11.5 KB)

**Comprehensive documentation including:**
- Feature overview
- Architecture diagram
- Setup instructions
- API endpoint reference
- File schema definition
- Audit logging details
- Slack integration guide
- Dashboard widget usage
- Usage examples
- Error handling
- Performance considerations
- Troubleshooting guide
- Future enhancements

### `SETUP.md` (9.3 KB)

**Step-by-step setup guide:**
1. Copy files to Mission Control
2. Configure environment variables
3. Get Slack credentials
4. Verify installation
5. Integrate dashboard widget
6. Test complete flow
7. Set up auto-execution
8. Troubleshooting section

### `MANIFEST.md` (This file)

**Reference guide for all files**

### `.env.example` (3.9 KB)

**Configuration template with:**
- Queue storage settings
- Slack integration
- Email service integration
- Social media integrations
- Blog/CMS integration
- Database options (future)
- Logging and monitoring
- Application settings
- Authentication
- Feature flags
- Development settings

## Examples

### `examples/agent-integration.ts` (14.4 KB)

**Real-world integration examples:**

1. **Email Newsletter Agent**
   - `submitEmailForApproval()` - Submit email for review
   - `waitForEmailApproval()` - Wait for approval with timeout
   - `sendApprovedEmail()` - Send after approval

2. **Social Media Agent**
   - `submitSocialPostForApproval()` - Submit post for review
   - `postApprovedSocialContent()` - Post after approval

3. **Blog Publishing Agent**
   - `submitBlogPostForApproval()` - Submit article for review
   - `publishApprovedBlogPost()` - Publish after approval

4. **Batch Processing**
   - `submitBatchForApproval()` - Submit multiple items
   - `waitForBatchApproval()` - Wait for all approvals

## File Integration Checklist

Copy files in this order:

```bash
# 1. Core libraries
cp lib/approval-queue.ts /Users/chipai/workshop/src/lib/
cp lib/slack-notifications.ts /Users/chipai/workshop/src/lib/

# 2. API endpoints
mkdir -p /Users/chipai/workshop/src/app/api/approvals/[id]/{approve,reject}
cp api/approvals/route.ts /Users/chipai/workshop/src/app/api/approvals/
cp api/approvals/[id]/route.ts /Users/chipai/workshop/src/app/api/approvals/[id]/
cp api/approvals/[id]/approve/route.ts /Users/chipai/workshop/src/app/api/approvals/[id]/approve/
cp api/approvals/[id]/reject/route.ts /Users/chipai/workshop/src/app/api/approvals/[id]/reject/

# 3. Components
cp components/ApprovalQueueWidget.tsx /Users/chipai/workshop/src/components/

# 4. Pages
mkdir -p /Users/chipai/workshop/src/app/approvals
cp pages/approvals/page.tsx /Users/chipai/workshop/src/app/approvals/

# 5. Tests (optional)
mkdir -p /Users/chipai/workshop/tests
cp tests/* /Users/chipai/workshop/tests/

# 6. Configuration
cp .env.example /Users/chipai/workshop/.env.approval-queue
```

## Data Flow

### Item Creation Flow
```
Agent → POST /api/approvals
  ↓
approval-queue.ts: createApprovalItem()
  ↓
File saved to: /data/approval-queue/pending/{id}.json
  ↓
Audit log entry created
  ↓
Slack notification sent
  ↓
Response: 201 Created with ApprovalItem
```

### Approval Flow
```
User → POST /api/approvals/{id}/approve
  ↓
approval-queue.ts: approveItem()
  ↓
File moved: pending/{id}.json → approved/{id}.json
  ↓
Item updated with: approved_at, approved_by
  ↓
Audit log entry created
  ↓
Slack notification sent
  ↓
Response: 200 OK with updated ApprovalItem
```

### Listing Flow
```
Dashboard → GET /api/approvals?page=1&limit=10
  ↓
approval-queue.ts: getPendingItems()
  ↓
Read files from: /data/approval-queue/pending/
  ↓
Sort by created_at (descending)
  ↓
Paginate results
  ↓
Response: 200 OK with { items, total, page, pages }
```

## Dependencies

### Required
- `next` - Next.js framework
- `fs` - File system (built-in)
- `path` - Path utilities (built-in)
- `uuid` - UUID generation (v4)

### Optional
- `lucide-react` - UI icons (for components)
- Slack API (for notifications)

## Environment Variables

**Required:**
- None (but recommended: `SLACK_BOT_TOKEN`, `SLACK_APPROVER_USER_ID`)

**Optional:**
- `QUEUE_ROOT` - Queue directory (default: `/data/approval-queue`)
- `SLACK_BOT_TOKEN` - Slack bot token
- `SLACK_APPROVER_USER_ID` - Slack user ID for notifications

See `.env.example` for complete list.

## File Sizes Summary

| File | Size | Type |
|------|------|------|
| lib/approval-queue.ts | 6.6 KB | Core |
| lib/slack-notifications.ts | 6.2 KB | Integration |
| api/approvals/route.ts | 2.0 KB | Endpoint |
| api/approvals/[id]/route.ts | 0.8 KB | Endpoint |
| api/approvals/[id]/approve/route.ts | 1.2 KB | Endpoint |
| api/approvals/[id]/reject/route.ts | 1.3 KB | Endpoint |
| components/ApprovalQueueWidget.tsx | 6.4 KB | UI |
| pages/approvals/page.tsx | 14.2 KB | UI |
| tests/approval-queue.test.ts | 13.5 KB | Testing |
| tests/api-integration.test.ts | 12.2 KB | Testing |
| README.md | 11.5 KB | Docs |
| SETUP.md | 9.3 KB | Docs |
| examples/agent-integration.ts | 14.4 KB | Examples |
| .env.example | 3.9 KB | Config |
| **Total** | **~104 KB** | |

## Performance Metrics

- **File Operations:** O(n) for directory scans, O(1) for individual item access
- **Pagination:** Efficient with configurable page sizes
- **Memory:** Low footprint - only loads requested pages
- **Scalability:** Suitable for < 10,000 items; consider database for larger volumes

## Version History

- **v1.0.0** - Initial release with file-based queue system
  - File-based storage
  - Core API endpoints
  - Dashboard widget and page
  - Slack integration
  - Audit logging
  - Comprehensive documentation

## License

Built for Mission Control. Part of the ClawdBot ecosystem.

---

**Total Implementation Size:** ~104 KB of code and documentation
**Setup Time:** ~15-30 minutes
**Ready for Production:** Yes (with appropriate environment configuration)

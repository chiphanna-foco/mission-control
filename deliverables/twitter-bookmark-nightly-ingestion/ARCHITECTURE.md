# Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                  Twitter Bookmark Ingestion                      │
│                    (nightly at 10 PM)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │     X/Twitter API v2 (Bookmarks)        │
        │  Endpoint: /2/users/:id/bookmarks       │
        │  Auth: Bearer Token                     │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │     Ingest Engine (src/ingest.js)       │
        │  • Fetch bookmarks                      │
        │  • Parse metadata                       │
        │  • De-duplicate                         │
        └─────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌──────────────────┐  ┌────────────────────┐
        │  Categorizer     │  │  Insight Extractor │
        │ (src/categ.js)   │  │  (src/insight.js)  │
        │                  │  │                    │
        │ • Pattern match  │  │ • Pattern detect   │
        │ • Confidence     │  │ • Type classify    │
        │ • Multi-tag      │  │ • Tag generation   │
        └──────────────────┘  └────────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              ▼
        ┌─────────────────────────────────────────┐
        │       SQLite Database (db.js)           │
        │   ~/data/life/bookmarks/bookmarks.db    │
        │                                         │
        │  Tables:                                │
        │  • bookmarks (id, tweet_id, content)   │
        │  • categories (bookmark_id, category)   │
        │  • insights (bookmark_id, insight)      │
        │  • search_index (full-text index)       │
        │  • ingestion_history (logs)             │
        └─────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
            ┌───────┐  ┌────────────┐  ┌──────────┐
            │Search │  │Mission     │  │Reporting │
            │API    │  │Control API │  │& Logging │
            │       │  │ (heartbeat)│  │          │
            └───────┘  └────────────┘  └──────────┘
```

## Components

### 1. Ingest Engine (`src/ingest.js`)

**Purpose:** Main orchestration and workflow

**Responsibilities:**
- Initialize database
- Fetch bookmarks from X API
- Process and store bookmarks
- Coordinate categorization and insight extraction
- Update search index
- Send heartbeats to Mission Control
- Generate reports
- Handle errors gracefully

**Key Methods:**
```javascript
init()              // Initialize database
fetchBookmarks()    // Fetch from X API
ingestBookmarks()   // Process and store
generateReport()    // Create summary
run()              // Main execution
```

**Error Handling:**
- Catches API failures
- Records in stats
- Continues processing on partial failures
- Reports to Mission Control

**Mission Control Integration:**
```
POST /api/tasks/lf-002/heartbeat     (every 5-10 min)
POST /api/tasks/lf-002/activities    (major milestones)
PATCH /api/tasks/lf-002              (final status)
```

### 2. Database Layer (`src/db.js`)

**Purpose:** Abstraction over SQLite operations

**Tables:**
```
bookmarks
├── id (TEXT, PK)
├── tweet_id (TEXT, UNIQUE)
├── author_id, author_handle, author_name
├── content (full text)
├── url
├── created_at, bookmarked_at, updated_at
└── raw_json (original API response)

categories
├── id (INT, autoincrement)
├── bookmark_id (FK)
├── category (TEXT)
├── confidence (REAL 0-1)
└── created_at

insights
├── id (INT, autoincrement)
├── bookmark_id (FK)
├── insight_type (enum: actionable, opportunity, warning, interesting, reference)
├── content (TEXT)
├── tags (JSON array)
└── created_at

search_index
├── id (INT, autoincrement)
├── bookmark_id (FK, UNIQUE)
├── searchable_text (combined for FTS)
└── last_updated

ingestion_history
├── id (INT, autoincrement)
├── run_date (DATE)
├── total_new, total_updated, total_bookmarks
├── status (success|partial|error)
├── error_message
├── started_at, completed_at
```

**Key Methods:**
```javascript
init()                      // Create tables
insertBookmark()            // Store bookmark
addCategories()             // Add category tags
addInsights()              // Store insights
updateSearchIndex()        // Update FTS
searchBookmarks()          // Full-text search
getBookmarksByCategory()   // Filter by topic
recordIngestionRun()       // Log run stats
```

**Design Decisions:**
- Raw JSON stored for future re-processing
- Confidence scores for prioritization
- Separate tables for denormalization and query speed
- Search index for fast full-text queries

### 3. Categorizer (`src/categorizer.js`)

**Purpose:** Classify bookmarks by topic

**Algorithm:**
1. **Prepare text** — Lowercase, remove special chars
2. **Score per category** — Count keyword/pattern matches
3. **Weight matches** — Keywords 0.2x, patterns 0.3x
4. **Normalize** — Cap at 1.0
5. **Filter** — Keep categories >0.25 confidence
6. **Sort** — By confidence descending

**Categories:**
- AI (LLM, Claude, GPT, agent, prompt)
- Business (startup, founder, revenue, strategy)
- Tech (developer, code, API, framework, cloud)
- Health (fitness, wellness, diet, meditation)
- Sports (football, basketball, game, team)
- Finance (investing, stock, crypto, trading)
- Marketing (social, content, engagement, brand)
- Content Strategy (writing, video, newsletter, podcast)
- Self-Improvement (learning, productivity, habits)
- Tools (software, app, platform, integration)

**Example:**
```javascript
const bookmark = {
  content: "Just built a new Claude API agent using LLM...",
  author_name: "Test User",
  author_handle: "testuser"
};

// Returns: [{category: "AI", confidence: 0.95}]
const categories = Categorizer.categorize(bookmark);
```

**Statistics:**
```javascript
const stats = Categorizer.getStats(categorizedBookmarks);
// { AI: { count: 42, avgConfidence: 0.87 }, ... }
```

### 4. Insight Extractor (`src/insight-extractor.js`)

**Purpose:** Extract actionable intelligence from bookmarks

**Insight Types:**

| Type | Pattern | Example |
|------|---------|---------|
| Actionable | "try", "build", "implement", "how to" | "Try using the new framework" |
| Opportunity | "gap", "market", "untapped", "$XXM" | "Underserved market opportunity" |
| Warning | "avoid", "don't", "risk", "failed" | "We learned this the hard way" |
| Interesting | "fascinating", "surprising", "first" | "5x improvement over competitors" |
| Reference | "research", "tutorial", "documentation" | "Check out this whitepaper" |

**Algorithm:**
1. Define patterns for each insight type
2. Search content for matches
3. Calculate confidence (number of pattern matches)
4. Return insights with confidence > threshold
5. Tag with relevant labels

**Example:**
```javascript
const bookmark = {
  content: "Here's how to implement this: try the new approach..."
};

// Returns:
// [{
//   type: 'actionable',
//   content: 'Here is how to implement this...',
//   tags: ['action-item', 'do-it']
// }]
const insights = InsightExtractor.extract(bookmark);
```

### 5. Search Interface (`src/search.js`)

**Purpose:** Query bookmarks by other agents

**Query Types:**
- **Full-text search** — `search("AI agents")`
- **Category filter** — `getByCategory("AI")`
- **Export** — `exportBookmarks("json|csv|markdown")`
- **Stats** — `getLastIngestionRun()`

**Example Usage:**
```javascript
const search = new BookmarkSearch();
await search.init();

// Search
const results = await search.search("AI agents", {limit: 20});

// By category
const aiBookmarks = await search.getByCategory("AI", {limit: 50});

// Export
const json = await search.exportBookmarks("json");
const csv = await search.exportBookmarks("csv");

await search.close();
```

## Data Flow

### Ingestion Flow

```
1. Initialize
   ├─ Create connection to SQLite
   ├─ Verify tables exist
   └─ Log start

2. Fetch
   ├─ Call X API with Bearer token
   ├─ Parse JSON response
   ├─ Validate fields
   └─ Heartbeat (30%)

3. Process Each Bookmark
   ├─ Insert into bookmarks table
   ├─ Categorize (Categorizer)
   ├─ Store categories in categories table
   ├─ Extract insights (InsightExtractor)
   ├─ Store insights in insights table
   ├─ Build search text
   └─ Update search_index

4. Report
   ├─ Calculate stats
   ├─ Record in ingestion_history
   ├─ Generate JSON report
   └─ Heartbeat (100%)
```

### Search Flow

```
User Query
   ├─ Input validation
   ├─ Query builder
   │  ├─ Full-text search: LIKE search_index
   │  ├─ Category: JOIN categories table
   │  └─ Time filter: WHERE bookmarked_at
   ├─ Execute SQL
   ├─ Enrich results (parse JSON, join arrays)
   ├─ Format output (JSON/CSV/Markdown)
   └─ Return to caller
```

## Configuration

### Environment Variables

```bash
X_API_BEARER_TOKEN          # X/Twitter API
MC_API_TOKEN                # Mission Control auth
MC_API_BASE                 # Mission Control URL
DATA_DIR                    # Data location
LOG_LEVEL                   # Logging verbosity
```

### Launchd Schedule

Default: 10 PM (22:00) daily

Configured in: `~/Library/LaunchAgents/com.chipai.twitter-bookmark-ingest.plist`

Change via XML:
```xml
<key>StartCalendarInterval</key>
<dict>
  <key>Hour</key>
  <integer>22</integer>  <!-- 0-23 -->
  <key>Minute</key>
  <integer>0</integer>   <!-- 0-59 -->
</dict>
```

## Scaling Considerations

### Current Design (Small Scale)
- Single-thread SQLite
- Suitable for <50K bookmarks
- <1 second per bookmark

### Future Scaling
- **100K+ bookmarks** → SQLite sharding or PostgreSQL
- **Real-time** → WebSocket sync instead of nightly batch
- **ML categorization** → TensorFlow or external API
- **Distributed** → Multiple workers via Celery/Bull

## Testing Strategy

### Unit Tests (`src/test.js`)
1. Database initialization
2. Categorization accuracy
3. Insight extraction
4. Bulk operations
5. Statistics generation
6. Directory creation

### Integration Tests (TODO)
- X API mocking
- End-to-end ingestion
- Search accuracy
- Export formats

### Manual Testing
```bash
# Run tests
node src/test.js

# Manual ingest
node src/ingest.js

# Search tests
node src/search.js search "test"
node src/search.js category "AI"
```

## Performance Metrics

### Typical Run (50 bookmarks)
- Fetch: 2-5 seconds (API dependent)
- Categorize: <1 second
- Extract insights: <1 second
- Store & index: <1 second
- **Total: <10 seconds**

### Database Performance
- Bookmarks table: <10ms insert
- Search query: <100ms for 50 results
- Category filter: <50ms

## Error Handling

### Error Recovery
1. **API errors** → Log, continue with cached data
2. **Database errors** → Rollback, report, retry
3. **Parsing errors** → Skip malformed bookmark, continue
4. **Rate limits** → Backoff and retry

### Logging
- Errors sent to `~/.openclaw/logs/twitter-bookmark-ingest-error.log`
- Activity logs to `~/.openclaw/logs/twitter-bookmark-ingest.log`
- Run reports to `~/data/life/bookmarks/ingest-report-YYYY-MM-DD.json`

## Security Considerations

### API Token Handling
- Stored in environment, not in code
- Passed via Authorization header
- Not logged to files

### Data Privacy
- Raw tweet content stored locally
- No external transmission except to Mission Control
- Database file permissions: 0644

### SQL Injection Prevention
- All queries use parameterized statements
- No string interpolation in SQL

## Future Architecture

### HTTP API (v2)
```
GET /api/bookmarks/search?q=...&limit=50
GET /api/bookmarks/category?name=AI&limit=50
GET /api/bookmarks/export?format=json|csv
GET /api/bookmarks/stats
GET /api/bookmarks/insights?type=actionable
```

### Real-time Sync (v3)
- X API Webhooks instead of polling
- Message queue (Redis/RabbitMQ)
- Distributed workers
- WebSocket push to Mission Control

### Intelligence Layer (v4)
- Embedding-based similarity search
- Trend detection
- Cross-bookmark linking
- Knowledge base integration

---

**Architecture Version:** 1.0  
**Last Updated:** 2026-03-07  
**Next Review:** When hitting 50K bookmarks or needing real-time sync

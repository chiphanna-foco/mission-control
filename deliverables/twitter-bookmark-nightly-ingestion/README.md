# 🌙 Twitter Bookmark Nightly Ingestion System

Automatically ingest, categorize, and index Chip's X/Twitter bookmarks every night at 10 PM.

**Status:** ✅ Ready for deployment

## What It Does

Every night at 10 PM:
1. **Pulls** Chip's X/Twitter bookmarks
2. **Categorizes** by topic (AI, Business, Tech, Health, Sports, Finance, Marketing, Content Strategy, Self-Improvement, Tools)
3. **Extracts** actionable insights (actionable items, opportunities, warnings, interesting findings, references)
4. **Stores** in searchable SQLite database (`~/data/life/bookmarks/bookmarks.db`)
5. **Indexes** for fast full-text search by other agents
6. **Reports** to Mission Control (lf-002 task)

## Quick Start

### Installation
```bash
cd ~/Documents/Shared/projects/twitter-bookmark-nightly-ingestion
npm install
node src/setup.js
```

### Configuration
Set your X/Twitter API Bearer Token:
```bash
export X_API_BEARER_TOKEN="your-bearer-token"
```

Get one from: https://developer.twitter.com/en/docs/twitter-api/getting-started/getting-access/authentication-and-authorization

### Enable Nightly Runs
```bash
launchctl load ~/Library/LaunchAgents/com.chipai.twitter-bookmark-ingest.plist
```

### Test It
```bash
node src/ingest.js
node src/search.js search "AI"
node src/search.js category "Business"
```

## Architecture

### Core Components

#### 1. Database (`src/db.js`)
SQLite database with 5 tables:
- **bookmarks** — Bookmark metadata and content
- **categories** — Topic categories (AI, Business, etc.)
- **insights** — Extracted actionable insights
- **search_index** — Full-text search index
- **ingestion_history** — Run logs and metrics

#### 2. Ingestion Engine (`src/ingest.js`)
Main script that runs nightly:
- Fetches from X/Twitter API
- Categorizes content
- Extracts insights
- Updates search index
- Sends heartbeats to Mission Control
- Logs results

#### 3. Categorizer (`src/categorizer.js`)
Analyzes content and assigns categories:
- Pattern matching and keyword detection
- Confidence scoring (0-1)
- Multi-category support
- Statistics generation

#### 4. Insight Extractor (`src/insight-extractor.js`)
Extracts actionable intelligence:
- **Actionable** — Things to do/implement
- **Opportunity** — Market gaps, growth angles
- **Warning** — Cautions, lessons learned
- **Interesting** — Novel patterns/findings
- **Reference** — Learning material

#### 5. Search Interface (`src/search.js`)
Query API for other agents:
- Full-text search
- Category filtering
- Multiple export formats (JSON, CSV, Markdown)
- Can be extended to HTTP endpoints

### Data Flow

```
X/Twitter API
    ↓
Ingest (fetch bookmarks)
    ↓
Categorize (topic detection)
    ↓
Extract Insights (intelligence)
    ↓
Build Search Index
    ↓
SQLite Database
    ↓
Search API ← Other Agents
```

## Usage

### Manual Ingestion
```bash
node src/ingest.js
```

### Search Bookmarks
```bash
# Full-text search
node src/search.js search "AI agents"

# By category
node src/search.js category AI
node src/search.js category Business

# Export formats
node src/search.js export json > bookmarks.json
node src/search.js export csv > bookmarks.csv
node src/search.js export markdown > bookmarks.md
```

### View Last Run Stats
```bash
node src/search.js stats
```

### Run Tests
```bash
node src/test.js
```

## Categories

Automatically detected topics:

| Category | Keywords | Example |
|----------|----------|---------|
| AI | LLM, Claude, GPT, machine learning, agent, prompt | Building with Claude API |
| Business | startup, founder, company, revenue, growth, strategy | SaaS growth strategies |
| Tech | developer, code, API, framework, cloud, deployment | New web framework release |
| Health | fitness, wellness, exercise, diet, meditation | Workout routines |
| Sports | football, basketball, game, team, coach | March Madness updates |
| Finance | investing, stock, crypto, trading, portfolio | Bitcoin trading analysis |
| Marketing | social, content, engagement, audience, brand | Twitter growth hacks |
| Content Strategy | writing, video, newsletter, podcast, distribution | Video production tips |
| Self-Improvement | learning, productivity, habits, motivation | Habit formation science |
| Tools | software, app, platform, integration, automation | New DevOps tool |

## Integration with Mission Control

The ingestion script reports progress to Mission Control:

- **Task ID:** `lf-002`
- **Heartbeats:** Every 5-10 minutes while running
- **Activities:** Logged for each major step
- **Status:** Updated when complete

Mission Control API:
```
POST http://localhost:3001/api/tasks/lf-002/heartbeat
POST http://localhost:3001/api/tasks/lf-002/activities
PATCH http://localhost:3001/api/tasks/lf-002
```

## Data Storage

All data lives in:
```
~/data/life/bookmarks/
├── bookmarks.db              # SQLite database
└── ingest-report-YYYY-MM-DD.json  # Daily report
```

## Schedule

**Default:** 10 PM (22:00) every night

Configure in `~/Library/LaunchAgents/com.chipai.twitter-bookmark-ingest.plist`:
- Change `<integer>22</integer>` to different hour (0-23)
- Change `<integer>0</integer>` for different minute (0-59)

Example (8 AM):
```xml
<key>Hour</key>
<integer>8</integer>
<key>Minute</key>
<integer>0</integer>
```

## Logs

- **Standard output:** `~/.openclaw/logs/twitter-bookmark-ingest.log`
- **Error output:** `~/.openclaw/logs/twitter-bookmark-ingest-error.log`
- **Daily reports:** `~/data/life/bookmarks/ingest-report-YYYY-MM-DD.json`

View logs:
```bash
tail -f ~/.openclaw/logs/twitter-bookmark-ingest.log
tail -f ~/.openclaw/logs/twitter-bookmark-ingest-error.log
```

## Managing the Service

```bash
# Load (enable)
launchctl load ~/Library/LaunchAgents/com.chipai.twitter-bookmark-ingest.plist

# Unload (disable)
launchctl unload ~/Library/LaunchAgents/com.chipai.twitter-bookmark-ingest.plist

# Check if loaded
launchctl list | grep twitter-bookmark

# View recent runs
log show --predicate 'process=="twitter-bookmark"' --last 1h

# Manually trigger a run
launchctl start com.chipai.twitter-bookmark-ingest
```

## Environment Variables

Set in `.env.local` or launchd plist:

```bash
# Required: X/Twitter API
X_API_BEARER_TOKEN=your-bearer-token

# Optional: Mission Control API (defaults below)
MC_API_TOKEN=5MY0vrWwbkapewyiS0rVYFmqsqa24jmRlT6sxuAZX4U
MC_API_BASE=http://localhost:3001

# Optional: Logging
LOG_LEVEL=info
```

## Future Enhancements

- [ ] **HTTP API** — REST endpoints for other agents to query
- [ ] **Real-time sync** — Instead of nightly (webhook-based)
- [ ] **ML categorization** — Deep learning models for better accuracy
- [ ] **Similarity detection** — Find related bookmarks
- [ ] **Trending analysis** — What topics are trending in Chip's bookmarks
- [ ] **Knowledge integration** — Connect to personal knowledge base
- [ ] **Batch processing** — Archive old bookmarks
- [ ] **Visualization** — Dashboard of categories and insights

## Troubleshooting

### Launchd not running
```bash
# Check if it's loaded
launchctl list | grep twitter-bookmark

# Check logs
tail -100 ~/.openclaw/logs/twitter-bookmark-ingest-error.log
```

### No bookmarks being fetched
- Verify API token: `echo $X_API_BEARER_TOKEN`
- Check X API rate limits
- Verify account has bookmarks on Twitter

### Database is locked
```bash
# Kill any stuck processes
pkill -f "twitter-bookmark"

# Delete database and recreate
rm ~/data/life/bookmarks/bookmarks.db
node src/setup.js
```

### Permission denied errors
```bash
# Ensure directory is writable
chmod 755 ~/data/life/bookmarks
chmod 644 ~/data/life/bookmarks/bookmarks.db
```

## Files

```
.
├── src/
│   ├── db.js                 # SQLite database layer
│   ├── categorizer.js        # Topic categorization
│   ├── insight-extractor.js  # Insight extraction
│   ├── ingest.js             # Main ingestion script
│   ├── search.js             # Search/query interface
│   ├── setup.js              # Installation and setup
│   └── test.js               # Test suite
├── package.json              # Dependencies
├── README.md                 # This file
├── SETUP.md                  # Detailed setup guide
└── docs/
    ├── API.md                # HTTP API documentation (future)
    ├── CATEGORIES.md         # Category reference
    └── SCHEMA.md             # Database schema
```

## Contributing

This system is maintained by the Life Agent (lf-001) but can be updated by:
1. Modifying source files
2. Running tests: `node src/test.js`
3. Deploying: `npm install` and restart service

## License

Private — Part of Chip Hanna's personal system

---

**Contact:** Mission Control (mc.chip-hanna.com)  
**Status:** ✅ Production Ready  
**Last Updated:** 2026-03-07

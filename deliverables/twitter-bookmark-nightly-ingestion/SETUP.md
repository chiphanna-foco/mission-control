# Twitter Bookmark Ingestion System Setup

## Overview
This system automatically pulls Chip's X/Twitter bookmarks every night at 10 PM, categorizes them by topic, extracts actionable insights, and stores them in a searchable database.

## Components

### 1. Database (SQLite)
- Location: `~/data/life/bookmarks/bookmarks.db`
- Tables:
  - `bookmarks` — Tweet content, metadata, author info
  - `categories` — Categorized topics (AI, Business, Tech, etc.)
  - `insights` — Extracted actionable insights
  - `search_index` — Full-text search index
  - `ingestion_history` — Run logs and stats

### 2. Ingestion Script (`src/ingest.js`)
Runs nightly at 10 PM via launchd. Flow:
1. Fetch bookmarks from X/Twitter API
2. Store in database
3. Categorize (confidence-scored)
4. Extract insights (actionable, opportunity, warning, etc.)
5. Update search index
6. Report metrics to Mission Control

### 3. Search Interface (`src/search.js`)
Query API for other agents:
- Full-text search
- Category filtering
- Export (JSON, CSV, Markdown)

## Configuration

### X/Twitter API
Get your Bearer Token from: https://developer.twitter.com/en/docs/twitter-api/getting-started/getting-access/authentication-and-authorization

Set environment variable:
```bash
export X_API_BEARER_TOKEN="your-token-here"
```

### Launchd Schedule
The system runs at **10 PM (22:00) daily**.

To enable/disable:
```bash
# Enable
launchctl load ~/Library/LaunchAgents/com.chipai.twitter-bookmark-ingest.plist

# Disable
launchctl unload ~/Library/LaunchAgents/com.chipai.twitter-bookmark-ingest.plist

# Check status
launchctl list | grep twitter-bookmark
```

## Testing

### Manual run
```bash
node src/ingest.js
```

### Search
```bash
# Search all bookmarks
node src/search.js search "AI agents"

# By category
node src/search.js category AI

# Export
node src/search.js export json > bookmarks.json
node src/search.js export csv > bookmarks.csv
```

## Categorization

Topics and example keywords:
- **AI** — LLM, Claude, GPT, machine learning, agent, prompt
- **Business** — startup, founder, company, revenue, growth, strategy
- **Tech** — developer, code, API, framework, cloud, deployment
- **Health** — fitness, wellness, exercise, diet, meditation
- **Sports** — football, basketball, game, team, coach
- **Finance** — investing, stock, crypto, trading, portfolio
- **Marketing** — social, content, engagement, audience, brand
- **Content Strategy** — writing, video, newsletter, podcast, distribution
- **Self-Improvement** — learning, productivity, habits, motivation
- **Tools** — software, app, platform, integration, automation

## Insights

Extracted insight types:
- **Actionable** — Things to try, implement, or do
- **Opportunity** — Market gaps, growth angles
- **Warning** — Cautions, lessons from others
- **Interesting** — Novel findings or patterns
- **Reference** — Documentation, tutorials, learning material

## Search Index

The search index combines:
- Tweet content
- Author name/handle
- Categories
- Extracted insights
- Insight tags

Enables fast full-text search across all dimensions.

## Integration with Mission Control

The ingestion script reports to Mission Control (lf-002):
- Sends heartbeats every 5-10 minutes while running
- Logs activities (new bookmarks, categorizations, insights)
- Records completion status and metrics

## Logs

- **Run logs:** `~/.openclaw/logs/twitter-bookmark-ingest.log`
- **Error logs:** `~/.openclaw/logs/twitter-bookmark-ingest-error.log`
- **Daily reports:** `~/data/life/bookmarks/ingest-report-YYYY-MM-DD.json`

## API for Other Agents

Make `bookmarks` searchable by other agents via HTTP endpoints (TODO):

```
GET /api/bookmarks/search?q=query&limit=20
GET /api/bookmarks/category?name=AI&limit=50
GET /api/bookmarks/export?format=json
```

## Troubleshooting

### Launchd not running
Check the plist is loaded:
```bash
launchctl list | grep twitter-bookmark
```

Check logs:
```bash
tail -f ~/.openclaw/logs/twitter-bookmark-ingest.log
```

### No bookmarks fetched
- Verify X_API_BEARER_TOKEN is set
- Check API rate limits
- Verify Chip's Twitter account has bookmarks

### Database errors
- Ensure ~/data/life/bookmarks/ is writable
- Delete bookmarks.db and run setup again

## Future Enhancements

- [ ] HTTP API for other agents
- [ ] Real-time sync (instead of nightly)
- [ ] ML-based categorization
- [ ] Similarity detection (find related bookmarks)
- [ ] Trending insights (what topics are hot)
- [ ] Integration with Chip's knowledge base

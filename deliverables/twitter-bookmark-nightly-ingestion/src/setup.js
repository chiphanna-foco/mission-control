#!/usr/bin/env node

/**
 * Setup script for Twitter Bookmark Ingestion System
 * 
 * Creates:
 * 1. Data directory structure
 * 2. SQLite database with schema
 * 3. launchd plist for 10 PM nightly runs
 * 4. Environment configuration
 */

const fs = require('fs');
const path = require('path');
const { BookmarkDatabase } = require('./db');

const HOME = process.env.HOME || '/Users/chipai';
const DATA_DIR = path.join(HOME, 'data', 'life', 'bookmarks');
const PROJECT_DIR = path.dirname(__dirname);
const LAUNCHD_PLIST = path.join(
  HOME,
  'Library/LaunchAgents/com.chipai.twitter-bookmark-ingest.plist'
);

async function setup() {
  console.log('🔧 Setting up Twitter Bookmark Ingestion System\n');

  try {
    // 1. Create data directories
    console.log('1. Creating data directories...');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`   ✓ ${DATA_DIR}`);

    // 2. Initialize database
    console.log('\n2. Initializing SQLite database...');
    const db = new BookmarkDatabase();
    await db.init();
    await db.close();
    console.log(`   ✓ ${path.join(DATA_DIR, 'bookmarks.db')}`);

    // 3. Create launchd plist for 10 PM runs
    console.log('\n3. Creating launchd configuration...');
    const plistContent = generatePlist(PROJECT_DIR);
    fs.mkdirSync(path.dirname(LAUNCHD_PLIST), { recursive: true });
    fs.writeFileSync(LAUNCHD_PLIST, plistContent);
    console.log(`   ✓ ${LAUNCHD_PLIST}`);

    // 4. Create environment file
    console.log('\n4. Creating environment configuration...');
    const envFile = path.join(PROJECT_DIR, '.env.local');
    if (!fs.existsSync(envFile)) {
      fs.writeFileSync(envFile, generateEnvFile());
      console.log(`   ✓ ${envFile}`);
    } else {
      console.log(`   ℹ ${envFile} already exists`);
    }

    // 5. Create README with instructions
    console.log('\n5. Creating README...');
    fs.writeFileSync(
      path.join(PROJECT_DIR, 'SETUP.md'),
      generateSetupGuide()
    );
    console.log(`   ✓ SETUP.md`);

    console.log('\n✅ Setup complete!\n');
    console.log('Next steps:');
    console.log('1. Add X/Twitter API credentials:');
    console.log('   export X_API_BEARER_TOKEN="your-token"');
    console.log('\n2. Enable launchd service:');
    console.log('   launchctl load ~/Library/LaunchAgents/com.chipai.twitter-bookmark-ingest.plist');
    console.log('\n3. Test the system:');
    console.log('   node src/ingest.js');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

function generatePlist(projectDir) {
  // Run at 10 PM (22:00) daily
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.chipai.twitter-bookmark-ingest</string>
  
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>${projectDir}/src/ingest.js</string>
  </array>
  
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>22</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  
  <key>StandardOutPath</key>
  <string>${HOME}/.openclaw/logs/twitter-bookmark-ingest.log</string>
  
  <key>StandardErrorPath</key>
  <string>${HOME}/.openclaw/logs/twitter-bookmark-ingest-error.log</string>
  
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key>
    <string>${HOME}</string>
    <key>MC_API_TOKEN</key>
    <string>5MY0vrWwbkapewyiS0rVYFmqsqa24jmRlT6sxuAZX4U</string>
  </dict>
  
  <key>RunAtLoad</key>
  <true/>
  
  <key>KeepAlive</key>
  <false/>
</dict>
</plist>`;
}

function generateEnvFile() {
  return `# X/Twitter API Configuration
X_API_BEARER_TOKEN=

# Mission Control API
MC_API_TOKEN=5MY0vrWwbkapewyiS0rVYFmqsqa24jmRlT6sxuAZX4U
MC_API_BASE=http://localhost:3001

# Data directory
DATA_DIR=${HOME}/data/life/bookmarks

# Logging
LOG_LEVEL=info
`;
}

function generateSetupGuide() {
  return `# Twitter Bookmark Ingestion System Setup

## Overview
This system automatically pulls Chip's X/Twitter bookmarks every night at 10 PM, categorizes them by topic, extracts actionable insights, and stores them in a searchable database.

## Components

### 1. Database (SQLite)
- Location: \`~/data/life/bookmarks/bookmarks.db\`
- Tables:
  - \`bookmarks\` — Tweet content, metadata, author info
  - \`categories\` — Categorized topics (AI, Business, Tech, etc.)
  - \`insights\` — Extracted actionable insights
  - \`search_index\` — Full-text search index
  - \`ingestion_history\` — Run logs and stats

### 2. Ingestion Script (\`src/ingest.js\`)
Runs nightly at 10 PM via launchd. Flow:
1. Fetch bookmarks from X/Twitter API
2. Store in database
3. Categorize (confidence-scored)
4. Extract insights (actionable, opportunity, warning, etc.)
5. Update search index
6. Report metrics to Mission Control

### 3. Search Interface (\`src/search.js\`)
Query API for other agents:
- Full-text search
- Category filtering
- Export (JSON, CSV, Markdown)

## Configuration

### X/Twitter API
Get your Bearer Token from: https://developer.twitter.com/en/docs/twitter-api/getting-started/getting-access/authentication-and-authorization

Set environment variable:
\`\`\`bash
export X_API_BEARER_TOKEN="your-token-here"
\`\`\`

### Launchd Schedule
The system runs at **10 PM (22:00) daily**.

To enable/disable:
\`\`\`bash
# Enable
launchctl load ~/Library/LaunchAgents/com.chipai.twitter-bookmark-ingest.plist

# Disable
launchctl unload ~/Library/LaunchAgents/com.chipai.twitter-bookmark-ingest.plist

# Check status
launchctl list | grep twitter-bookmark
\`\`\`

## Testing

### Manual run
\`\`\`bash
node src/ingest.js
\`\`\`

### Search
\`\`\`bash
# Search all bookmarks
node src/search.js search "AI agents"

# By category
node src/search.js category AI

# Export
node src/search.js export json > bookmarks.json
node src/search.js export csv > bookmarks.csv
\`\`\`

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

- **Run logs:** \`~/.openclaw/logs/twitter-bookmark-ingest.log\`
- **Error logs:** \`~/.openclaw/logs/twitter-bookmark-ingest-error.log\`
- **Daily reports:** \`~/data/life/bookmarks/ingest-report-YYYY-MM-DD.json\`

## API for Other Agents

Make \`bookmarks\` searchable by other agents via HTTP endpoints (TODO):

\`\`\`
GET /api/bookmarks/search?q=query&limit=20
GET /api/bookmarks/category?name=AI&limit=50
GET /api/bookmarks/export?format=json
\`\`\`

## Troubleshooting

### Launchd not running
Check the plist is loaded:
\`\`\`bash
launchctl list | grep twitter-bookmark
\`\`\`

Check logs:
\`\`\`bash
tail -f ~/.openclaw/logs/twitter-bookmark-ingest.log
\`\`\`

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
`;
}

if (require.main === module) {
  setup();
}

module.exports = { setup };

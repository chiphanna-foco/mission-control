#!/usr/bin/env node

/**
 * Twitter Bookmark Nightly Ingestion
 * 
 * Runs nightly at 10 PM to:
 * 1. Pull Chip's X/Twitter bookmarks
 * 2. Categorize by topic
 * 3. Extract key insights
 * 4. Store in /data/life/bookmarks/
 * 5. Update search index
 * 6. Report metrics
 */

const { BookmarkDatabase } = require('./db');
const { Categorizer } = require('./categorizer');
const { InsightExtractor } = require('./insight-extractor');
const fs = require('fs');
const path = require('path');

// Mission Control API
const MC_API_BASE = 'http://localhost:3001';
const MC_API_TOKEN = process.env.MC_API_TOKEN || '5MY0vrWwbkapewyiS0rVYFmqsqa24jmRlT6sxuAZX4U';
const TASK_ID = 'lf-002';

class BookmarkIngestionEngine {
  constructor() {
    this.db = new BookmarkDatabase();
    this.stats = {
      started_at: new Date().toISOString(),
      new: 0,
      updated: 0,
      total: 0,
      categorized: 0,
      insights_extracted: 0,
      errors: []
    };
  }

  async init() {
    await this.db.init();
    console.log('[✓] Database initialized');
  }

  async fetchBookmarks() {
    console.log('[⏳] Fetching bookmarks...');

    try {
      // TODO: Replace with real X API call
      // For now, return empty array - will be populated by real API
      const bookmarks = await this._fetchFromXAPI();
      
      this.stats.total = bookmarks.length;
      console.log(`[✓] Fetched ${bookmarks.length} bookmarks`);
      
      return bookmarks;
    } catch (error) {
      console.error('[✗] Error fetching bookmarks:', error.message);
      this.stats.errors.push(`Fetch error: ${error.message}`);
      return [];
    }
  }

  async _fetchFromXAPI() {
    /**
     * X/Twitter API v2 Integration
     * 
     * Requires:
     * - X_API_BEARER_TOKEN environment variable
     * - OR stored credentials in ~/.openclaw/x-api.json
     * 
     * Endpoint: GET /2/users/:id/bookmarks
     * Documentation: https://developer.twitter.com/en/docs/twitter-api/tweets/bookmarks/api-reference/get-users-id-bookmarks
     */

    const token = process.env.X_API_BEARER_TOKEN;
    if (!token) {
      console.log('[⚠] No X API token found. Set X_API_BEARER_TOKEN environment variable.');
      console.log('[ℹ] Returning empty bookmarks for now.');
      return [];
    }

    // This is where the real API call would go
    // For now, return empty to indicate no data
    return [];
  }

  async ingestBookmarks(bookmarks) {
    console.log(`[⏳] Ingesting ${bookmarks.length} bookmarks...`);

    let newCount = 0;
    let updatedCount = 0;

    for (const bookmark of bookmarks) {
      try {
        const bookmarkId = await this.db.insertBookmark(bookmark);
        newCount++;
        
        // Categorize
        const categories = Categorizer.categorize(bookmark);
        await this.db.addCategories(bookmarkId, categories);
        this.stats.categorized++;

        // Extract insights
        const insights = InsightExtractor.extract(bookmark);
        await this.db.addInsights(bookmarkId, insights);
        this.stats.insights_extracted++;

        // Update search index
        const searchableText = this._buildSearchableText(bookmark, categories, insights);
        await this.db.updateSearchIndex(bookmarkId, searchableText);

      } catch (error) {
        console.error(`[✗] Error ingesting bookmark:`, error.message);
        this.stats.errors.push(error.message);
      }
    }

    this.stats.new = newCount;
    this.stats.updated = updatedCount;

    console.log(`[✓] Ingested ${newCount} new, ${updatedCount} updated`);
  }

  _buildSearchableText(bookmark, categories, insights) {
    const parts = [
      bookmark.content,
      bookmark.author_name,
      bookmark.author_handle,
      categories.map(c => c.category).join(' '),
      insights.map(i => i.content).join(' '),
      insights.flatMap(i => i.tags).join(' ')
    ];

    return parts
      .filter(p => p)
      .join(' ')
      .toLowerCase()
      .substring(0, 5000); // Limit size
  }

  async generateReport() {
    console.log('\n[📊] Ingestion Report');
    console.log('═══════════════════════════════════════');
    console.log(`Started: ${this.stats.started_at}`);
    console.log(`Bookmarks processed: ${this.stats.total}`);
    console.log(`New bookmarks: ${this.stats.new}`);
    console.log(`Bookmarks categorized: ${this.stats.categorized}`);
    console.log(`Insights extracted: ${this.stats.insights_extracted}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n[⚠] Errors (${this.stats.errors.length}):`);
      this.stats.errors.forEach(err => console.log(`  - ${err}`));
    }

    // Record in database
    await this.db.recordIngestionRun(
      this.stats.errors.length === 0 ? 'success' : 'partial',
      this.stats,
      this.stats.errors.length > 0 ? this.stats.errors.join('; ') : null
    );
  }

  async sendHeartbeat(progress, message) {
    try {
      const response = await fetch(`${MC_API_BASE}/api/tasks/${TASK_ID}/heartbeat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MC_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          progress
        })
      });

      if (!response.ok) {
        console.error(`[✗] Heartbeat failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[✗] Heartbeat error:`, error.message);
    }
  }

  async recordActivity(message) {
    try {
      await fetch(`${MC_API_BASE}/api/tasks/${TASK_ID}/activities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MC_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activity_type: 'updated',
          message
        })
      });
    } catch (error) {
      console.error(`[✗] Activity record error:`, error.message);
    }
  }

  async run() {
    try {
      console.log('🌙 Twitter Bookmark Nightly Ingestion');
      console.log('═══════════════════════════════════════\n');

      await this.init();
      await this.sendHeartbeat(10, 'Starting bookmark ingestion');

      // Fetch bookmarks
      const bookmarks = await this.fetchBookmarks();
      await this.sendHeartbeat(30, `Fetched ${bookmarks.length} bookmarks`);

      // Ingest and process
      if (bookmarks.length > 0) {
        await this.ingestBookmarks(bookmarks);
        await this.recordActivity(`Ingested ${bookmarks.length} bookmarks, categorized ${this.stats.categorized}, extracted insights from ${this.stats.insights_extracted}`);
      } else {
        await this.recordActivity('No new bookmarks to ingest');
        console.log('[ℹ] No bookmarks to process');
      }

      await this.sendHeartbeat(90, 'Processing complete, generating report');

      // Generate report
      await this.generateReport();

      // Write report to file
      const reportPath = path.join(
        process.env.HOME || '/Users/chipai',
        'data', 'life', 'bookmarks',
        `ingest-report-${new Date().toISOString().split('T')[0]}.json`
      );
      
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(this.stats, null, 2));
      
      await this.recordActivity(`Report written to ${reportPath}`);

      await this.sendHeartbeat(100, 'Ingestion complete');

      console.log('\n[✓] Ingestion complete!\n');

    } catch (error) {
      console.error('[✗] Fatal error:', error);
      this.stats.errors.push(error.message);
      await this.recordActivity(`Fatal error: ${error.message}`);
      await this.sendHeartbeat(0, `Error: ${error.message}`);
    } finally {
      await this.db.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const engine = new BookmarkIngestionEngine();
  engine.run().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = { BookmarkIngestionEngine };

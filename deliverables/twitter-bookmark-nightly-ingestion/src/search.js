#!/usr/bin/env node

/**
 * Bookmark Search Interface
 * 
 * Makes bookmarks searchable by other agents:
 * - Full-text search
 * - Category filtering
 * - Time range filtering
 * - Export as JSON
 */

const { BookmarkDatabase } = require('./db');

class BookmarkSearch {
  constructor() {
    this.db = new BookmarkDatabase();
  }

  async init() {
    await this.db.init();
  }

  async search(query, options = {}) {
    const {
      limit = 20,
      category = null,
      offset = 0,
      format = 'json'
    } = options;

    let results = [];

    if (query) {
      // Full-text search
      results = await this.db.searchBookmarks(query, limit + offset);
    } else if (category) {
      // Category search
      results = await this.db.getBookmarksByCategory(category, limit + offset);
    }

    // Apply offset
    results = results.slice(offset, offset + limit);

    return this._formatResults(results, format);
  }

  async getByCategory(category, limit = 50) {
    const results = await this.db.getBookmarksByCategory(category, limit);
    return results.map(this._enrichBookmark);
  }

  async getStats() {
    return {
      message: 'Stats endpoint - TODO: Implement stats queries',
      note: 'Can be extended to show category distribution, top insights, etc.'
    };
  }

  async getLastIngestionRun() {
    return await this.db.getLastIngestionRun();
  }

  async exportBookmarks(format = 'json') {
    // Export all bookmarks - for backup/analysis
    const results = await new Promise((resolve, reject) => {
      this.db.db.all(
        `SELECT b.*, GROUP_CONCAT(c.category) as categories FROM bookmarks b
         LEFT JOIN categories c ON b.id = c.bookmark_id
         GROUP BY b.id
         ORDER BY b.bookmarked_at DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    return this._formatResults(results, format);
  }

  _enrichBookmark(bookmark) {
    return {
      ...bookmark,
      categories: bookmark.categories ? bookmark.categories.split(',') : [],
      raw_json: bookmark.raw_json ? JSON.parse(bookmark.raw_json) : null
    };
  }

  _formatResults(results, format) {
    const enriched = results.map(r => this._enrichBookmark(r));

    if (format === 'json') {
      return enriched;
    } else if (format === 'csv') {
      return this._formatAsCSV(enriched);
    } else if (format === 'markdown') {
      return this._formatAsMarkdown(enriched);
    }

    return enriched;
  }

  _formatAsCSV(bookmarks) {
    const headers = ['ID', 'Author', 'Content', 'Categories', 'URL', 'Bookmarked At'];
    const rows = bookmarks.map(b => [
      b.id,
      b.author_handle,
      `"${b.content.replace(/"/g, '""')}"`,
      b.categories.join(';'),
      b.url || '',
      b.bookmarked_at
    ]);

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }

  _formatAsMarkdown(bookmarks) {
    let md = '# Bookmarks\n\n';

    bookmarks.forEach(b => {
      md += `## ${b.author_name} (@${b.author_handle})\n\n`;
      md += `${b.content}\n\n`;
      md += `**Categories:** ${b.categories.join(', ')}\n`;
      md += `**Link:** ${b.url}\n\n`;
      md += '---\n\n';
    });

    return md;
  }

  async close() {
    await this.db.close();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'search';
  
  const search = new BookmarkSearch();
  await search.init();

  try {
    switch (command) {
      case 'search': {
        const query = args[1] || '';
        const format = args[2] || 'json';
        const results = await search.search(query, { format });
        console.log(format === 'json' ? JSON.stringify(results, null, 2) : results);
        break;
      }

      case 'category': {
        const category = args[1];
        if (!category) {
          console.error('Usage: search.js category <category>');
          process.exit(1);
        }
        const results = await search.getByCategory(category);
        console.log(JSON.stringify(results, null, 2));
        break;
      }

      case 'export': {
        const format = args[1] || 'json';
        const results = await search.exportBookmarks(format);
        console.log(format === 'json' ? JSON.stringify(results, null, 2) : results);
        break;
      }

      case 'stats': {
        const last = await search.getLastIngestionRun();
        console.log(JSON.stringify(last, null, 2));
        break;
      }

      default:
        console.log('Commands: search, category, export, stats');
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await search.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { BookmarkSearch };

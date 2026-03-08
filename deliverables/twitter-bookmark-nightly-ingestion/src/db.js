const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database lives in /data/life/bookmarks/
const DB_PATH = path.join(process.env.HOME || '/Users/chipai', 'data', 'life', 'bookmarks', 'bookmarks.db');

class BookmarkDatabase {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) reject(err);
        else this.createTables().then(resolve).catch(reject);
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Main bookmarks table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS bookmarks (
            id TEXT PRIMARY KEY,
            tweet_id TEXT UNIQUE,
            author_id TEXT,
            author_handle TEXT,
            author_name TEXT,
            content TEXT,
            url TEXT,
            created_at TEXT,
            bookmarked_at TEXT,
            updated_at TEXT,
            raw_json TEXT
          )
        `, (err) => {
          if (err && !err.message.includes('already exists')) reject(err);
        });

        // Categories table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bookmark_id TEXT,
            category TEXT,
            confidence REAL,
            created_at TEXT,
            FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id)
          )
        `, (err) => {
          if (err && !err.message.includes('already exists')) reject(err);
        });

        // Insights table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS insights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bookmark_id TEXT,
            insight_type TEXT,
            content TEXT,
            tags TEXT,
            created_at TEXT,
            FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id)
          )
        `, (err) => {
          if (err && !err.message.includes('already exists')) reject(err);
        });

        // Search index table (for full-text search)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS search_index (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bookmark_id TEXT,
            searchable_text TEXT,
            FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id),
            UNIQUE(bookmark_id)
          )
        `, (err) => {
          if (err && !err.message.includes('already exists')) reject(err);
        });

        // Ingestion history (for tracking what's been imported)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS ingestion_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_date TEXT,
            total_new INTEGER,
            total_updated INTEGER,
            total_bookmarks INTEGER,
            status TEXT,
            error_message TEXT,
            started_at TEXT,
            completed_at TEXT
          )
        `, (err) => {
          if (err && !err.message.includes('already exists')) reject(err);
          else resolve();
        });
      });
    });
  }

  async insertBookmark(bookmark) {
    return new Promise((resolve, reject) => {
      const id = `bm_${bookmark.tweet_id}`;
      const now = new Date().toISOString();

      this.db.run(
        `INSERT OR REPLACE INTO bookmarks 
        (id, tweet_id, author_id, author_handle, author_name, content, url, created_at, bookmarked_at, updated_at, raw_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          bookmark.tweet_id,
          bookmark.author_id,
          bookmark.author_handle,
          bookmark.author_name,
          bookmark.content,
          bookmark.url,
          bookmark.created_at || now,
          bookmark.bookmarked_at || now,
          now,
          JSON.stringify(bookmark)
        ],
        function(err) {
          if (err) reject(err);
          else resolve(id);
        }
      );
    });
  }

  async addCategories(bookmarkId, categories) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      this.db.serialize(() => {
        // Clear existing categories
        this.db.run(`DELETE FROM categories WHERE bookmark_id = ?`, [bookmarkId]);

        // Insert new ones
        const stmt = this.db.prepare(
          `INSERT INTO categories (bookmark_id, category, confidence, created_at) VALUES (?, ?, ?, ?)`
        );

        categories.forEach(cat => {
          stmt.run([bookmarkId, cat.category, cat.confidence || 0.8, now]);
        });

        stmt.finalize((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async addInsights(bookmarkId, insights) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      this.db.serialize(() => {
        // Clear existing insights
        this.db.run(`DELETE FROM insights WHERE bookmark_id = ?`, [bookmarkId]);

        // Insert new ones
        const stmt = this.db.prepare(
          `INSERT INTO insights (bookmark_id, insight_type, content, tags, created_at) VALUES (?, ?, ?, ?, ?)`
        );

        insights.forEach(insight => {
          stmt.run([
            bookmarkId,
            insight.type || 'general',
            insight.content,
            insight.tags ? JSON.stringify(insight.tags) : '[]',
            now
          ]);
        });

        stmt.finalize((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async updateSearchIndex(bookmarkId, searchableText) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO search_index (bookmark_id, searchable_text) VALUES (?, ?)`,
        [bookmarkId, searchableText],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async searchBookmarks(query, limit = 20) {
    return new Promise((resolve, reject) => {
      const searchPattern = `%${query}%`;
      this.db.all(
        `SELECT DISTINCT b.* FROM bookmarks b
         INNER JOIN search_index s ON b.id = s.bookmark_id
         WHERE s.searchable_text LIKE ?
         LIMIT ?`,
        [searchPattern, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getBookmarksByCategory(category, limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT b.*, GROUP_CONCAT(c.category) as categories
         FROM bookmarks b
         LEFT JOIN categories c ON b.id = c.bookmark_id
         WHERE c.category = ?
         GROUP BY b.id
         LIMIT ?`,
        [category, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async recordIngestionRun(status, stats, error = null) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      this.db.run(
        `INSERT INTO ingestion_history (run_date, total_new, total_updated, total_bookmarks, status, error_message, started_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          now.split('T')[0],
          stats.new || 0,
          stats.updated || 0,
          stats.total || 0,
          status,
          error,
          stats.started_at,
          now
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async getLastIngestionRun() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM ingestion_history ORDER BY run_date DESC LIMIT 1`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = { BookmarkDatabase, DB_PATH };

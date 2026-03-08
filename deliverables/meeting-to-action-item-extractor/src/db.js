/**
 * SQLite Database for Action Items
 * 
 * Manages action item storage, retrieval, and status tracking
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

class Database {
  constructor(dbPath = './action-items.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Initialize database connection and create tables
   */
  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else {
          this.db.run('PRAGMA foreign_keys = ON');
          this._createTables()
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  /**
   * Create tables if they don't exist
   * @private
   */
  async _createTables() {
    const run = promisify(this.db.run.bind(this.db));

    await run(`
      CREATE TABLE IF NOT EXISTS action_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        assigned_to TEXT,
        due_date DATETIME,
        priority TEXT CHECK(priority IN ('High', 'Medium', 'Low')),
        status TEXT CHECK(status IN ('Pending', 'Completed', 'Overdue', 'Blocked')),
        pattern_type TEXT,
        source_text TEXT,
        confidence REAL,
        meeting_id TEXT,
        meeting_date DATETIME,
        meeting_attendees TEXT,
        meeting_title TEXT,
        mc_task_id TEXT,
        mc_link TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        notes TEXT
      )
    `);

    await run(`CREATE INDEX IF NOT EXISTS idx_due_date ON action_items(due_date)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_status ON action_items(status)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_assigned_to ON action_items(assigned_to)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_meeting_id ON action_items(meeting_id)`);

    await run(`
      CREATE TABLE IF NOT EXISTS overdue_alerts (
        id TEXT PRIMARY KEY,
        action_item_id TEXT NOT NULL,
        alert_type TEXT CHECK(alert_type IN ('Email', 'Slack', 'Dashboard')),
        sent_at DATETIME,
        sent_to TEXT,
        status TEXT CHECK(status IN ('Sent', 'Failed', 'Acknowledged')),
        acknowledged_at DATETIME,
        FOREIGN KEY (action_item_id) REFERENCES action_items(id)
      )
    `);
  }

  /**
   * Insert action items
   */
  async insertActionItems(items) {
    if (!Array.isArray(items)) items = [items];

    for (const item of items) {
      await this.insertActionItem(item);
    }

    return items;
  }

  /**
   * Insert single action item
   */
  async insertActionItem(item) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `
        INSERT INTO action_items (
          id, title, description, assigned_to, due_date, priority,
          status, pattern_type, source_text, confidence,
          meeting_id, meeting_date, meeting_attendees, meeting_title,
          mc_task_id, mc_link, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          item.id,
          item.title,
          item.description,
          item.assignedTo,
          item.dueDate,
          item.priority,
          item.status,
          item.source.pattern,
          item.source.original,
          item.source.confidence,
          item.meeting?.id || null,
          item.meeting?.date || null,
          item.meeting?.attendees?.join(', ') || null,
          item.meeting?.title || null,
          item.mcTaskId || null,
          item.mcLink || null,
          item.createdAt,
          item.updatedAt
        ],
        (err) => {
          if (err) reject(err);
          else resolve(item);
        }
      );
    });
  }

  /**
   * Get action items with filters
   */
  async getActionItems(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM action_items WHERE 1=1';
      const params = [];

      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        query += ` AND status IN (${statuses.map(() => '?').join(',')})`;
        params.push(...statuses);
      }

      if (filters.assignedTo) {
        query += ' AND assigned_to = ?';
        params.push(filters.assignedTo);
      }

      if (filters.priority) {
        query += ' AND priority = ?';
        params.push(filters.priority);
      }

      if (filters.meetingId) {
        query += ' AND meeting_id = ?';
        params.push(filters.meetingId);
      }

      if (filters.overdue) {
        query += ' AND due_date < datetime("now") AND status != "Completed"';
      }

      if (filters.sort) {
        if (filters.sort === 'due_date') {
          query += ' ORDER BY due_date ASC';
        } else if (filters.sort === 'priority') {
          query += ' ORDER BY CASE priority WHEN "High" THEN 1 WHEN "Medium" THEN 2 ELSE 3 END';
        } else if (filters.sort === 'created') {
          query += ' ORDER BY created_at DESC';
        }
      } else {
        query += ' ORDER BY due_date ASC, priority DESC';
      }

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Get single action item
   */
  async getActionItem(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM action_items WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  /**
   * Update action item
   */
  async updateActionItem(id, updates) {
    const allowedFields = ['title', 'description', 'assigned_to', 'due_date', 'priority', 'status', 'notes', 'completed_at', 'mc_task_id', 'mc_link'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key === 'assignedTo' ? 'assigned_to' : key;
      if (allowedFields.includes(dbKey)) {
        fields.push(`${dbKey} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return { id, ...updates };
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE action_items SET ${fields.join(', ')} WHERE id = ?`,
        values,
        (err) => {
          if (err) reject(err);
          else resolve({ id, ...updates });
        }
      );
    });
  }

  /**
   * Delete action item
   */
  async deleteActionItem(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM action_items WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve({ deleted: id });
      });
    });
  }

  /**
   * Get overdue items count
   */
  async getOverdueCount() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(*) as count FROM action_items 
         WHERE due_date < datetime("now") AND status != "Completed"`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.count || 0);
        }
      );
    });
  }

  /**
   * Get statistics
   */
  async getStats() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) as overdue,
          SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as high_priority
        FROM action_items
        `,
        (err, row) => {
          if (err) reject(err);
          else resolve(row || {});
        }
      );
    });
  }

  /**
   * Close database connection
   */
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

  /**
   * Export data as JSON
   */
  async exportJSON(filepath) {
    const items = await this.getActionItems();
    fs.writeFileSync(filepath, JSON.stringify(items, null, 2));
    return { exported: items.length, path: filepath };
  }

  /**
   * Import data from JSON
   */
  async importJSON(filepath) {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    const items = Array.isArray(data) ? data : [data];
    
    for (const item of items) {
      await this.insertActionItem(item);
    }
    
    return { imported: items.length };
  }
}

export default Database;

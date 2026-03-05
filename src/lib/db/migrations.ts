/**
 * Database Migrations System
 * 
 * Handles schema changes in a production-safe way:
 * 1. Tracks which migrations have been applied
 * 2. Runs new migrations automatically on startup
 * 3. Never runs the same migration twice
 */

import Database from 'better-sqlite3';

interface Migration {
  id: string;
  name: string;
  up: (db: Database.Database) => void;
}

// All migrations in order - NEVER remove or reorder existing migrations
const migrations: Migration[] = [
  {
    id: '001',
    name: 'initial_schema',
    up: (db) => {
      // Core tables - these are created in schema.ts on fresh databases
      // This migration exists to mark the baseline for existing databases
      console.log('[Migration 001] Baseline schema marker');
    }
  },
  {
    id: '002',
    name: 'add_workspaces',
    up: (db) => {
      console.log('[Migration 002] Adding workspaces table and columns...');
      
      // Create workspaces table if not exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS workspaces (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          description TEXT,
          icon TEXT DEFAULT '📁',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `);
      
      // Insert default workspace if not exists
      db.exec(`
        INSERT OR IGNORE INTO workspaces (id, name, slug, description, icon) 
        VALUES ('default', 'Default Workspace', 'default', 'Default workspace', '🏠');
      `);
      
      // Add workspace_id to tasks if not exists
      const tasksInfo = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
      if (!tasksInfo.some(col => col.name === 'workspace_id')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN workspace_id TEXT DEFAULT 'default' REFERENCES workspaces(id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id)`);
        console.log('[Migration 002] Added workspace_id to tasks');
      }
      
      // Add workspace_id to agents if not exists
      const agentsInfo = db.prepare("PRAGMA table_info(agents)").all() as { name: string }[];
      if (!agentsInfo.some(col => col.name === 'workspace_id')) {
        db.exec(`ALTER TABLE agents ADD COLUMN workspace_id TEXT DEFAULT 'default' REFERENCES workspaces(id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_agents_workspace ON agents(workspace_id)`);
        console.log('[Migration 002] Added workspace_id to agents');
      }
    }
  },
  {
    id: '003',
    name: 'add_planning_tables',
    up: (db) => {
      console.log('[Migration 003] Adding planning tables...');
      
      // Create planning_questions table if not exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS planning_questions (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          category TEXT NOT NULL,
          question TEXT NOT NULL,
          question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'text', 'yes_no')),
          options TEXT,
          answer TEXT,
          answered_at TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
      
      // Create planning_specs table if not exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS planning_specs (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
          spec_markdown TEXT NOT NULL,
          locked_at TEXT NOT NULL,
          locked_by TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
      
      // Create index
      db.exec(`CREATE INDEX IF NOT EXISTS idx_planning_questions_task ON planning_questions(task_id, sort_order)`);
      
      // Update tasks status check constraint to include 'planning'
      // SQLite doesn't support ALTER CONSTRAINT, so we check if it's needed
      const taskSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'").get() as { sql: string } | undefined;
      if (taskSchema && !taskSchema.sql.includes("'planning'")) {
        console.log('[Migration 003] Note: tasks table needs planning status - will be handled by schema recreation on fresh dbs');
      }
    }
  },
  {
    id: '004',
    name: 'add_planning_session_columns',
    up: (db) => {
      console.log('[Migration 004] Adding planning session columns to tasks...');
      
      const tasksInfo = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
      
      // Add planning_session_key column
      if (!tasksInfo.some(col => col.name === 'planning_session_key')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN planning_session_key TEXT`);
        console.log('[Migration 004] Added planning_session_key');
      }
      
      // Add planning_messages column (stores JSON array of messages)
      if (!tasksInfo.some(col => col.name === 'planning_messages')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN planning_messages TEXT`);
        console.log('[Migration 004] Added planning_messages');
      }
      
      // Add planning_complete column
      if (!tasksInfo.some(col => col.name === 'planning_complete')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN planning_complete INTEGER DEFAULT 0`);
        console.log('[Migration 004] Added planning_complete');
      }
      
      // Add planning_spec column (stores final spec JSON)
      if (!tasksInfo.some(col => col.name === 'planning_spec')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN planning_spec TEXT`);
        console.log('[Migration 004] Added planning_spec');
      }
      
      // Add planning_agents column (stores generated agents JSON)
      if (!tasksInfo.some(col => col.name === 'planning_agents')) {
        db.exec(`ALTER TABLE tasks ADD COLUMN planning_agents TEXT`);
        console.log('[Migration 004] Added planning_agents');
      }
    }
  },
  {
    id: '005',
    name: 'add_conversation_events_tables',
    up: (db) => {
      console.log('[Migration 005] Adding conversation event tables...');

      db.exec(`
        CREATE TABLE IF NOT EXISTS conversation_events (
          id TEXT PRIMARY KEY,
          session_key TEXT,
          thread_id TEXT,
          channel TEXT,
          provider TEXT,
          chat_id TEXT,
          message_id TEXT,
          role TEXT,
          author TEXT,
          text TEXT,
          ts INTEGER,
          metadata_json TEXT,
          created_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS conversation_task_links (
          id TEXT PRIMARY KEY,
          conversation_event_id TEXT NOT NULL REFERENCES conversation_events(id) ON DELETE CASCADE,
          task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          created_at INTEGER
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_events_provider_message
          ON conversation_events(provider, message_id)
          WHERE provider IS NOT NULL AND message_id IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_conversation_events_session_ts ON conversation_events(session_key, ts DESC);
        CREATE INDEX IF NOT EXISTS idx_conversation_events_thread_ts ON conversation_events(thread_id, ts DESC);
        CREATE INDEX IF NOT EXISTS idx_conversation_events_channel_ts ON conversation_events(channel, ts DESC);
        CREATE INDEX IF NOT EXISTS idx_conversation_links_event ON conversation_task_links(conversation_event_id);
        CREATE INDEX IF NOT EXISTS idx_conversation_links_task ON conversation_task_links(task_id);
      `);
    }
  },
  {
    id: '006',
    name: 'add_today_priority_fields_to_tasks',
    up: (db) => {
      console.log('[Migration 006] Adding today priority fields to tasks...');

      const tasksInfo = db.prepare('PRAGMA table_info(tasks)').all() as { name: string }[];

      if (!tasksInfo.some(col => col.name === 'is_priority_today')) {
        db.exec('ALTER TABLE tasks ADD COLUMN is_priority_today INTEGER DEFAULT 0');
      }

      if (!tasksInfo.some(col => col.name === 'priority_rank')) {
        db.exec('ALTER TABLE tasks ADD COLUMN priority_rank INTEGER');
      }

      if (!tasksInfo.some(col => col.name === 'priority_note')) {
        db.exec('ALTER TABLE tasks ADD COLUMN priority_note TEXT');
      }

      db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_priority_today ON tasks(workspace_id, is_priority_today, priority_rank)');
    }
  },
  {
    id: '006.5',
    name: 'add_auth_tables',
    up: (db) => {
      console.log('[Migration 006.5] Adding authentication tables...');

      db.exec(`
        CREATE TABLE IF NOT EXISTS magic_links (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          code TEXT NOT NULL UNIQUE,
          expires_at INTEGER NOT NULL,
          confirmed BOOLEAN DEFAULT 0,
          created_at INTEGER NOT NULL,
          ip_address TEXT,
          user_agent TEXT
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          last_active_at INTEGER NOT NULL,
          ip_address TEXT,
          user_agent TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
        CREATE INDEX IF NOT EXISTS idx_magic_links_code ON magic_links(code);
        CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      `);

      console.log('[Migration 006.5] Authentication tables created');
    }
  },
  {
    id: '007',
    name: 'add_someday_status_and_snooze_fields',
    up: (db) => {
      console.log('[Migration 007] Adding someday status and snooze fields...');

      const tasksInfo = db.prepare('PRAGMA table_info(tasks)').all() as { name: string }[];

      // Check if CHECK constraint already includes 'someday'
      const taskSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'").get() as { sql: string } | undefined;
      const hasStatusCheckFix = taskSchema && taskSchema.sql.includes("'someday'");

      // If we need to add snoozed_until and snooze_count AND fix the CHECK constraint
      if (!tasksInfo.some(col => col.name === 'snoozed_until') || !hasStatusCheckFix) {
        console.log('[Migration 007] Recreating tasks table to fix CHECK constraint and add snooze columns...');

        // Step 1: Rename old table
        db.exec('ALTER TABLE tasks RENAME TO tasks_old');

        // Step 2: Create new table with correct schema
        db.exec(`
          CREATE TABLE tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'inbox' CHECK (status IN ('planning', 'inbox', 'assigned', 'in_progress', 'testing', 'review', 'done', 'someday')),
            priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
            assigned_agent_id TEXT REFERENCES agents(id),
            created_by_agent_id TEXT REFERENCES agents(id),
            workspace_id TEXT DEFAULT 'default' REFERENCES workspaces(id),
            business_id TEXT DEFAULT 'default',
            due_date TEXT,
            is_priority_today INTEGER DEFAULT 0,
            priority_rank INTEGER,
            priority_note TEXT,
            snoozed_until TEXT,
            snooze_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            planning_session_key TEXT,
            planning_messages TEXT,
            planning_complete INTEGER DEFAULT 0,
            planning_spec TEXT,
            planning_agents TEXT,
            blocked_on TEXT,
            blocked_reason TEXT,
            tags TEXT,
            life_bucket TEXT CHECK (life_bucket IN ('work','home','other')),
            domain TEXT,
            effort_bucket TEXT CHECK (effort_bucket IN ('quick-win','admin','deep-work')),
            classification_confidence REAL DEFAULT 0,
            classification_source TEXT DEFAULT 'auto',
            suggested_next_step TEXT,
            suggested_action TEXT CHECK (suggested_action IN ('auto_execute', 'needs_approval', 'needs_planning', 'blocked')),
            archived_at TEXT
          )
        `);

        // Step 3: Copy all data from old table
        db.exec(`
          INSERT INTO tasks SELECT * FROM tasks_old
        `);

        // Step 4: Drop old table
        db.exec('DROP TABLE tasks_old');

        // Step 5: Recreate indexes and triggers
        db.exec(`
          CREATE INDEX idx_tasks_status ON tasks(status);
          CREATE INDEX idx_tasks_assigned ON tasks(assigned_agent_id);
          CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
          CREATE INDEX idx_tasks_priority_today ON tasks(workspace_id, is_priority_today, priority_rank);
          CREATE INDEX idx_tasks_snoozed ON tasks(snoozed_until) WHERE snoozed_until IS NOT NULL;
          
          CREATE TRIGGER trg_tasks_done_unpin AFTER UPDATE OF status ON tasks 
            WHEN NEW.status='done' 
            BEGIN 
              UPDATE tasks SET is_priority_today=0, priority_rank=NULL WHERE id=NEW.id; 
            END;
        `);

        console.log('[Migration 007] Successfully recreated tasks table with someday status and snooze fields');
      } else {
        // Just add columns if table wasn't recreated
        if (!tasksInfo.some(col => col.name === 'snoozed_until')) {
          db.exec('ALTER TABLE tasks ADD COLUMN snoozed_until TEXT');
          console.log('[Migration 007] Added snoozed_until column');
        }

        if (!tasksInfo.some(col => col.name === 'snooze_count')) {
          db.exec('ALTER TABLE tasks ADD COLUMN snooze_count INTEGER DEFAULT 0');
          console.log('[Migration 007] Added snooze_count column');
        }

        db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_snoozed ON tasks(snoozed_until) WHERE snoozed_until IS NOT NULL');
        console.log('[Migration 007] Added index for snoozed tasks');
      }
    }
  }
];

/**
 * Run all pending migrations
 */
export function runMigrations(db: Database.Database): void {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  // Get already applied migrations
  const applied = new Set(
    (db.prepare('SELECT id FROM _migrations').all() as { id: string }[]).map(m => m.id)
  );
  
  // Run pending migrations in order
  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }
    
    console.log(`[DB] Running migration ${migration.id}: ${migration.name}`);
    
    try {
      // Run migration in a transaction
      db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO _migrations (id, name) VALUES (?, ?)').run(migration.id, migration.name);
      })();
      
      console.log(`[DB] Migration ${migration.id} completed`);
    } catch (error) {
      console.error(`[DB] Migration ${migration.id} failed:`, error);
      throw error;
    }
  }
}

/**
 * Get migration status
 */
export function getMigrationStatus(db: Database.Database): { applied: string[]; pending: string[] } {
  const applied = (db.prepare('SELECT id FROM _migrations ORDER BY id').all() as { id: string }[]).map(m => m.id);
  const pending = migrations.filter(m => !applied.includes(m.id)).map(m => m.id);
  return { applied, pending };
}

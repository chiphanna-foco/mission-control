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
    id: '008.5',
    name: 'import_113_tasks_from_local_db_fixed',
    up: (db) => {
      console.log('[Migration 008] Importing 113 tasks from local Mac mini database...');

      try {
        // All 113 tasks from /.clawdbot/state/mission-control.db
        // Priority mapping: critical→high, medium→normal
        db.exec(`
          INSERT OR REPLACE INTO tasks (id, title, description, status, priority, assigned_agent_id, created_by_agent_id, workspace_id, business_id, due_date, created_at, updated_at, is_priority_today, priority_rank, priority_note, snoozed_until, snooze_count) VALUES
          ('qM-Ns5Z9hzSSTpkDMaYKc', 'Choose secure remote access solution (Tailscale vs JumpCloud vs other)', 'Phase: Phase 0: Security & Infrastructure (Before Mac Arrives)\nOwner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420503', '1770268420503', 0, NULL, NULL, NULL, 0),
          ('csFgxriRZQ9s3ppQmuDkE', 'Document all API keys and credentials for migration', 'Phase: Phase 0: Security & Infrastructure (Before Mac Arrives)\nOwner: Clawdbot', 'in_progress', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420504', '1770268420504', 0, NULL, NULL, NULL, 0),
          ('99xSDavhRXNcwlulrehxf', 'Audit current access permissions and create least-privilege plan', 'Phase: Phase 0: Security & Infrastructure (Before Mac Arrives)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420504', '1770268420504', 0, NULL, NULL, NULL, 0),
          ('mQZNaj8QWm-Zwvtdk_3DS', 'Set up password manager (1Password family?)', 'Phase: Phase 0: Security & Infrastructure (Before Mac Arrives)\nOwner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420504', '1770268420504', 0, NULL, NULL, NULL, 0),
          ('HYN6wKgREdcKieIEKg7lJ', 'Unbox and physical setup', 'Phase: Phase 1: Mac Mini Hardware Setup (Day 1)\nOwner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420504', '1770268420504', 0, NULL, NULL, NULL, 0),
          ('rzq41VJbZA9OeT-PXqrCc', 'Install macOS and create admin account', 'Phase: Phase 1: Mac Mini Hardware Setup (Day 1)\nOwner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420504', '1770268420504', 0, NULL, NULL, NULL, 0),
          ('lpbxpoKTjO767CEpWZ6lx', 'Enable FileVault (full disk encryption)', 'Phase: Phase 1: Mac Mini Hardware Setup (Day 1)\nOwner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420504', '1770268420504', 0, NULL, NULL, NULL, 0),
          ('v9gGpxmgG5uBrOBojCHMu', 'Enable Firewall', 'Phase: Phase 1: Mac Mini Hardware Setup (Day 1)\nOwner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('jFlQlKit7y__c3ZiySxUq', 'Disable unnecessary sharing services', 'Phase: Phase 1: Mac Mini Hardware Setup (Day 1)\nOwner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('jyzaNz1AP1BafUAGR7gua', 'Install Xcode Command Line Tools', 'Phase: Phase 1: Mac Mini Hardware Setup (Day 1)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('GzJhwdqdXuy9rkKh3W-3S', 'Install Homebrew', 'Phase: Phase 1: Mac Mini Hardware Setup (Day 1)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('Hih7eNQCv0y2qX4Od6f8X', 'Install Node.js (via nvm or Homebrew)', 'Phase: Phase 2: Development Environment (Day 1-2)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('L_5pXzj6XkBy7Hh-9FW-G', 'Install Python 3.x', 'Phase: Phase 2: Development Environment (Day 1-2)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('CUPU3oqk17L9GegMO9gI4', 'Install Bun (for OpenClaw)', 'Phase: Phase 2: Development Environment (Day 1-2)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('DsE1zZQHpfONm74XuPErB', 'Clone claude/skills/clawd repo', 'Phase: Phase 2: Development Environment (Day 1-2)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('0PDNyW1T_Gjmj96pzwbDe', 'Set up Git with SSH keys', 'Phase: Phase 2: Development Environment (Day 1-2)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('SMG5oXCwfFq5Ud5iKB-Tn', 'Install VS Code and sync settings', 'Phase: Phase 2: Development Environment (Day 1-2)\nOwner: Clawdbot', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('stYd-b-e2cqTJLz2m-Zkp', 'Install database tools (SQLite, etc.)', 'Phase: Phase 2: Development Environment (Day 1-2)\nOwner: Clawdbot', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('kP_aARESsXyQKysG-ETJu', 'Install OpenClaw globally via npm', 'Phase: Phase 3: OpenClaw / Clawdbot Setup (Day 2)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('ld2kkHPjBXMocQyiB3qo1', 'Restore OpenClaw config from backup', 'Phase: Phase 3: OpenClaw / Clawdbot Setup (Day 2)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('9HKvPy_vMSFX8hxhHV0wo', 'Migrate API keys (Motion, Slack, WordPress, etc.)', 'Phase: Phase 3: OpenClaw / Clawdbot Setup (Day 2)\nOwner: Chip + Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('zo3Fb8QLrYaNeE0Jlq43r', 'Test all channel integrations (Slack, iMessage)', 'Phase: Phase 3: OpenClaw / Clawdbot Setup (Day 2)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('k0Zynh_xHAa6PUFOSf249', 'Set up LM Studio with GLM-4.7-Flash and Gemma-3-4b', 'Phase: Phase 3: OpenClaw / Clawdbot Setup (Day 2)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('VG4lRZH0P7N8mrsIugrDQ', 'Verify all skills are installed and working', 'Phase: Phase 3: OpenClaw / Clawdbot Setup (Day 2)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('I6YWBoO-rI_BQCI3zvF-j', 'Set up local web server for Mission Control dashboard', 'Phase: Phase 4: Mission Control Dashboard (Day 2-3)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('XVDr6lzQgqB9qW6dkkT2L', 'Create secure tunnel (Tailscale serve)', 'Phase: Phase 4: Mission Control Dashboard (Day 2-3)\nOwner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('5TdxrJ6cK3uIBcAcY2R8L', 'Build progress visualization', 'Phase: Phase 4: Mission Control Dashboard (Day 2-3)\nOwner: Clawdbot', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('t7fwkKUYcgjqpGKy9uA1t', 'Build "Needs Review" queue UI', 'Phase: Phase 4: Mission Control Dashboard (Day 2-3)\nOwner: Clawdbot', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770268420505', '1770268420505', 0, NULL, NULL, NULL, 0),
          ('5kZfrS-NHQN8zPS-k44zS', 'Build comment system', 'Phase: Phase 4: Mission Control Dashboard (Day 2-3)\nOwner: Clawdbot', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('Pi5iiaKtqa8poGNwsTBB-', 'Set up automated reminders', 'Phase: Phase 4: Mission Control Dashboard (Day 2-3)\nOwner: Clawdbot', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('qzheP0AUDzckmF5WweZpL', 'Migrate wetried.it automation scripts', 'Phase: Phase 5: Project Migration (Day 3-4)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('-JHp7Al6mYC0E2Rrwt0Iy', 'Migrate Hannitizer Next.js project', 'Phase: Phase 5: Project Migration (Day 3-4)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('_LSTV6CrcMv_BybjYKmTT', 'Migrate GameBuzz content', 'Phase: Phase 5: Project Migration (Day 3-4)\nOwner: Clawdbot', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('hzWrfJ6JbeqvBjmYe8LUI', 'Verify all cron jobs are set up', 'Phase: Phase 5: Project Migration (Day 3-4)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('md463Q81UmBjgWZu398sa', 'Test full end-to-end workflows', 'Phase: Phase 5: Project Migration (Day 3-4)\nOwner: Chip + Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('j5GOEWt6Ucf7_on5pGrHO', 'Enable automatic security updates', 'Phase: Phase 6: Security Hardening (Day 4-5)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('oWNXkmY1lqf-fVHO8bYUx', 'Set up backup strategy (Time Machine + cloud)', 'Phase: Phase 6: Security Hardening (Day 4-5)\nOwner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('iMAnnseVlkKJZENaEuOqK', 'Document all access credentials in password manager', 'Phase: Phase 6: Security Hardening (Day 4-5)\nOwner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('244KWQfFEyXJLYdmDZSvR', 'Disable SSH if not needed, or harden SSH config', 'Phase: Phase 6: Security Hardening (Day 4-5)\nOwner: Clawdbot', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('DpZ5PpUBjLJueP2Zdxae2', 'Review all API key permissions', 'Phase: Phase 6: Security Hardening (Day 4-5)\nOwner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('5jpi-bkqeiOjwVy4u8pXu', 'Set up fail2ban for intrusion detection', 'Phase: Phase 6: Security Hardening (Day 4-5)\nOwner: Clawdbot', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('w36fHR8I1ovI6cHyxuxxn', 'Create system architecture diagram', 'Phase: Phase 7: Documentation & Handoff (Day 5-7)\nOwner: Clawdbot', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('s3NLUOyH5c1841c6sJX92', 'Document all running services', 'Phase: Phase 7: Documentation & Handoff (Day 5-7)\nOwner: Clawdbot', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('uaPZSv0OYc2TqKUp1gtQt', 'Create "In Case of Emergency" contact list', 'Phase: Phase 7: Documentation & Handoff (Day 5-7)\nOwner: Clawdbot', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('5TyGCOwJxiaDYkLoIazWq', 'Test remote access from another device', 'Phase: Phase 7: Documentation & Handoff (Day 5-7)\nOwner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420506', '1770268420506', 0, NULL, NULL, NULL, 0),
          ('6nyxf_6NM0WYJogLTkVCy', 'Sign off on completion', 'Phase: Phase 7: Documentation & Handoff (Day 5-7)\nOwner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770268420507', '1770268420507', 0, NULL, NULL, NULL, 0),
          ('IspLI9mmHy-BNF4z1nHak', 'Migration Kickoff', 'Set up the new M4 Mac Mini and begin migration process', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770270194761', '1770270194761', 0, NULL, NULL, NULL, 0),
          ('RndlYVs1Jz1Ci3PUdhbYG', 'Install current versions of all applications', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('AlSi1i9TaawjG-u5X-TYa', 'Fresh install of Cursor, configure synced settings', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('PlgygcYIq2PP7i_AtkD1_', 'Set up Focus with keyword configs per Focus Agent', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('JsNYR4uWL9gHwPMr_KURb', 'Sign in to all apps and sync settings', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('U-RKcUY8EM_vqPn1jAW6l', 'Set up Second Home', 'Home lab setup with secondary configuration', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('CXXXRQNZSfSSGtcJDbKU3', 'Update MacOS after migration', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('_1MasPcXvh0rMQ7rv7t7N', 'Set up a separate content marketing agent', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('xW452hkvMv0qfbHvZkFMR', 'Test this new agent with a sample project', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('9eD_H7MYt8GGPnCtprQ7r', 'Monitor Mac Mini performance after migration', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('shMcBjcI7ja-7BYrICfqn', 'Design content marketing plan (strategic)', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('uKT3qYY2ePKgXc93Y5eXq', 'Design content marketing plan (tactical)', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('ZcXYGmw9mgfzEY4hIjPnC', 'Identify top 2-3 pain points', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('kzY96eM3lF3eZJpHiK77Z', 'Define ideal customer profile', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('iGcCQO2Wo4WVYkTbASk2y', 'Pick 2025 Blog Topics (Q1-Q2 initially)', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('Pa2LTu7bcy-AULxOhEeHv', 'Create Blog Outline Template', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '1770270194763', '1770270194763', 0, NULL, NULL, NULL, 0),
          ('Sen9_ldIScjymHxAtzWxm', 'Draft first blog post (SEO + AI-assisted)', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '1770270194764', '1770270194764', 0, NULL, NULL, NULL, 0),
          ('3bHkEGE-gO8oXUWMSApUh', 'Create simple Ashby-style recruiting agent system prompt', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '1770270194764', '1770270194764', 0, NULL, NULL, NULL, 0),
          ('IjA9T60WjYdM510n8yoCj', 'Test recruiting agent with 3 mock scenarios', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '1770270194764', '1770270194764', 0, NULL, NULL, NULL, 0),
          ('zLL0jcs8iZEvTjqhiu2K6', 'Document agent behavior and iteration ideas', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '1770270194764', '1770270194764', 0, NULL, NULL, NULL, 0),
          ('Bio3gTdH4DPzMUYE7U8mW', 'Configure Time Machine backup', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270194764', '1770270194764', 0, NULL, NULL, NULL, 0),
          ('HXX-xQVP5dpZFAFF225gl', 'Verify SSH keys and GitHub access', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770270194764', '1770270194764', 0, NULL, NULL, NULL, 0),
          ('SvBEpLgSwkxPKiY1-A_b3', 'Set up development environment (Node, Bun, Python)', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770270194764', '1770270194764', 0, NULL, NULL, NULL, 0),
          ('ymViG5KF0gHlPXZ1l6L1_', 'Transfer active project files', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770270194764', '1770270194764', 0, NULL, NULL, NULL, 0),
          ('c1uaK5sLg52I4NcxfESPY', 'Archive old machine after verification', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '1770270194764', '1770270194764', 0, NULL, NULL, NULL, 0),
          ('w4tJLP5tFOkfb17gFfNKu', 'Migration Kickoff', 'Set up the new M4 Mac Mini and begin migration process', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770270548534', '1770270548534', 0, NULL, NULL, NULL, 0),
          ('Y9mXcEnl62Q9ubb0KuAsH', 'Install current versions of all applications', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770270548534', '1770270548534', 0, NULL, NULL, NULL, 0),
          ('ZGnyx1fZJMu98OlnroCdK', 'Fresh install of Cursor, configure synced settings', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770270548534', '1770270548534', 0, NULL, NULL, NULL, 0),
          ('_0fG2zGG9Yv6qfM7yRL4q', 'Set up Focus with keyword configs per Focus Agent', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770270548534', '1770270548534', 0, NULL, NULL, NULL, 0),
          ('0GZqDH_NsLaJm5tDWPOZz', 'Sign in to all apps and sync settings', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270548534', '1770270548534', 0, NULL, NULL, NULL, 0),
          ('72helVAD-gDmBiew0yxwm', 'Set up Second Home', 'Home lab setup with secondary configuration', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270548534', '1770270548534', 0, NULL, NULL, NULL, 0),
          ('07HQH92EiXVBIv-Zsb5Fb', 'Update MacOS after migration', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270548534', '1770270548534', 0, NULL, NULL, NULL, 0),
          ('254973gJH6Ee9re9OYIl1', 'Set up a separate content marketing agent', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270548534', '1770270548534', 0, NULL, NULL, NULL, 0),
          ('FKGWVY9HVWFYiElIecsbi', 'Test this new agent with a sample project', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270548534', '1770270548534', 0, NULL, NULL, NULL, 0),
          ('Myod9v7VZFkgoiWtpTWGq', 'Monitor Mac Mini performance after migration', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270548534', '1770270548534', 0, NULL, NULL, NULL, 0),
          ('3kJFY6_KZ7DoskgD162Fv', 'Design content marketing plan (strategic)', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270548534', '1770270548534', 0, NULL, NULL, NULL, 0),
          ('lQ9DirPEtSAvsVEGbenU1', 'Design content marketing plan (tactical)', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270548534', '1770270548534', 0, NULL, NULL, NULL, 0),
          ('Qdidc0kd1jwUFGHq3O6y8', 'Identify top 2-3 pain points', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270548534', '1770270548534', 0, NULL, NULL, NULL, 0),
          ('D6sXZ-XR256KjVqWj52DU', 'Define ideal customer profile', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270548535', '1770270548535', 0, NULL, NULL, NULL, 0),
          ('UkF68tFidksnzBxhUWwtV', 'Pick 2025 Blog Topics (Q1-Q2 initially)', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270548535', '1770270548535', 0, NULL, NULL, NULL, 0),
          ('wB1aNYSPaybjzhPCirPz7', 'Create Blog Outline Template', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '1770270548535', '1770270548535', 0, NULL, NULL, NULL, 0),
          ('32_OEo12pElxfeOvTznG7', 'Draft first blog post (SEO + AI-assisted)', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '1770270548536', '1770270548536', 0, NULL, NULL, NULL, 0),
          ('0TzlbAlyw5fIC0NBPQBym', 'Create simple Ashby-style recruiting agent system prompt', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '1770270548536', '1770270548536', 0, NULL, NULL, NULL, 0),
          ('f_PBH10vuHXe2zd0s_DjB', 'Test recruiting agent with 3 mock scenarios', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '1770270548536', '1770270548536', 0, NULL, NULL, NULL, 0),
          ('2Ns7kXZeGX08Gz30agV7K', 'Document agent behavior and iteration ideas', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '1770270548536', '1770270548536', 0, NULL, NULL, NULL, 0),
          ('Cq2HoRX0kKAVLmcNbHu2p', 'Configure Time Machine backup', '', 'inbox', 'normal', NULL, NULL, 'default', 'default', NULL, '1770270548536', '1770270548536', 0, NULL, NULL, NULL, 0),
          ('N8zTASiWW3wZRO9YCfXZW', 'Verify SSH keys and GitHub access', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770270548536', '1770270548536', 0, NULL, NULL, NULL, 0),
          ('_lav_vL0oYnEf6MxuLNOt', 'Set up development environment (Node, Bun, Python)', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770270548536', '1770270548536', 0, NULL, NULL, NULL, 0),
          ('LnB1QOqCDjdoKeZ4_74Wz', 'Transfer active project files', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '1770270548536', '1770270548536', 0, NULL, NULL, NULL, 0),
          ('GgvpsGv-3ggXe9y5ATI8e', 'Archive old machine after verification', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '1770270548536', '1770270548536', 0, NULL, NULL, NULL, 0),
          ('vs-himiway-c1-movcan-v30', 'Review VS Page: Himiway C1 vs Movcan V30 Pro Max', 'https://wetried.it/?p=35311 - Draft comparison page awaiting review. Check content accuracy and affiliate links.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-himiway-c1-rad-power', 'Review VS Page: Himiway C1 vs Rad Power', 'https://wetried.it/?p=35312 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-himiway-c1-aventon', 'Review VS Page: Himiway C1 vs Aventon', 'https://wetried.it/?p=35313 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-himiway-c1-haoqi', 'Review VS Page: Himiway C1 vs HAOQI Cheetah', 'https://wetried.it/?p=35314 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-movcan-rad-power', 'Review VS Page: Movcan vs Rad Power', 'https://wetried.it/?p=35315 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-movcan-aventon', 'Review VS Page: Movcan vs Aventon', 'https://wetried.it/?p=35316 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-movcan-haoqi', 'Review VS Page: Movcan vs HAOQI Cheetah', 'https://wetried.it/?p=35317 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-rad-aventon', 'Review VS Page: Rad Power vs Aventon', 'https://wetried.it/?p=35318 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-rad-haoqi', 'Review VS Page: Rad Power vs HAOQI Cheetah', 'https://wetried.it/?p=35319 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-aventon-haoqi', 'Review VS Page: Aventon vs HAOQI Cheetah', 'https://wetried.it/?p=35320 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-wolf-amberjack', 'Review VS Page: Wolf & Shepherd vs Amberjack', 'https://wetried.it/?p=35324 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-wolf-kizik', 'Review VS Page: Wolf & Shepherd vs Kizik', 'https://wetried.it/?p=35325 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-wolf-heydude', 'Review VS Page: Wolf & Shepherd vs Hey Dude', 'https://wetried.it/?p=35326 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-amberjack-kizik', 'Review VS Page: Amberjack vs Kizik', 'https://wetried.it/?p=35327 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-amberjack-heydude', 'Review VS Page: Amberjack vs Hey Dude', 'https://wetried.it/?p=35328 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-kizik-heydude', 'Review VS Page: Kizik vs Hey Dude', 'https://wetried.it/?p=35329 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0),
          ('vs-public-rec-revtown', 'Review VS Page: Public Rec vs Revtown', 'https://wetried.it/?p=35330 - Draft comparison page awaiting review.', 'in-review', 'normal', NULL, NULL, 'default', 'default', NULL, '1770352783000', '1770352783000', 0, NULL, NULL, NULL, 0);
        `);

        console.log('[Migration 008] ✓ Imported 113 tasks successfully');
      } catch (err: any) {
        console.error('[Migration 008] Failed:', err?.message || String(err));
        throw err;
      }
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

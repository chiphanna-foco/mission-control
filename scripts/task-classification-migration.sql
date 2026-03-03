-- Mission Control task classification migration
-- Adds cross-cutting filters for life/work categorization.

ALTER TABLE tasks ADD COLUMN life_bucket TEXT CHECK (life_bucket IN ('work','home','other'));
ALTER TABLE tasks ADD COLUMN domain TEXT;
ALTER TABLE tasks ADD COLUMN effort_bucket TEXT CHECK (effort_bucket IN ('quick-win','admin','deep-work'));
ALTER TABLE tasks ADD COLUMN classification_confidence REAL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN classification_source TEXT DEFAULT 'auto';

CREATE INDEX IF NOT EXISTS idx_tasks_life_domain_status
  ON tasks(life_bucket, domain, status, priority);

CREATE INDEX IF NOT EXISTS idx_tasks_unclassified
  ON tasks(classification_confidence, domain);

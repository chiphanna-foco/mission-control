import fs from 'fs';
import path from 'path';
import { db } from './index';

const migrationsDir = path.join(__dirname, 'migrations');

export function runMigrations() {
  // Ensure migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found');
    return;
  }

  // Get all SQL files and sort them
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Running ${files.length} migration(s)...`);

  for (const file of files) {
    try {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`Running migration: ${file}`);
      
      // Split by semicolon but keep them with statements
      const statements = sql.split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => s + ';');

      for (const statement of statements) {
        db.exec(statement);
      }

      console.log(`✓ Completed: ${file}`);
    } catch (error) {
      console.error(`✗ Failed to run migration ${file}:`, error);
      throw error;
    }
  }

  console.log('✓ All migrations completed successfully');
}

// Run migrations on module load
if (require.main === module) {
  try {
    runMigrations();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

#!/usr/bin/env node

/**
 * Setup script for Meeting-to-Action-Item Extractor
 * 
 * Creates database, initializes config, runs tests
 */

import Database from './db.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setup() {
  console.log(chalk.blue.bold('\n🚀 Setting up Meeting-to-Action-Item Extractor\n'));

  // 1. Create environment file
  console.log(chalk.cyan('1️⃣  Creating configuration...'));
  const envPath = path.join(__dirname, '..', '.env');
  const examplePath = path.join(__dirname, '..', '.env.example');

  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log(chalk.green(`   ✅ Created .env file`));
  } else if (fs.existsSync(envPath)) {
    console.log(chalk.gray(`   ℹ️  .env already exists (skipping)`));
  }

  // 2. Initialize database
  console.log(chalk.cyan('\n2️⃣  Initializing database...'));
  const db = new Database();
  await db.init();
  console.log(chalk.green(`   ✅ Database initialized at ${db.dbPath}`));

  // 3. Show database info
  const stats = await db.getStats();
  console.log(chalk.gray(`   • Total items: ${stats.total || 0}`));
  console.log(chalk.gray(`   • Pending: ${stats.pending || 0}`));
  console.log(chalk.gray(`   • Completed: ${stats.completed || 0}`));

  // 4. Create sample data for testing
  console.log(chalk.cyan('\n3️⃣  Creating sample action items...'));

  const sampleItems = [
    {
      id: 'sample-1',
      title: 'Send Q2 budget proposal to finance',
      description: 'Send the approved Q2 budget proposal for financial review',
      assignedTo: 'Chip',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      priority: 'High',
      status: 'Pending',
      source: {
        pattern: 'time_bound_commitment',
        original: "I'll send the proposal by Friday",
        confidence: 0.95
      },
      meeting: {
        id: 'sample-meeting-1',
        date: new Date().toISOString(),
        attendees: ['Chip', 'Sarah'],
        title: 'Q2 Planning'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'sample-2',
      title: 'Review architecture documentation',
      description: 'Review and provide feedback on the architecture documentation',
      assignedTo: 'John',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      priority: 'Medium',
      status: 'Pending',
      source: {
        pattern: 'assignment',
        original: 'John needs to review the architecture by next Tuesday',
        confidence: 0.90
      },
      meeting: {
        id: 'sample-meeting-1',
        date: new Date().toISOString(),
        attendees: ['Chip', 'John'],
        title: 'Q2 Planning'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  let inserted = 0;
  for (const item of sampleItems) {
    try {
      await db.insertActionItem(item);
      inserted++;
    } catch (error) {
      if (!error.message.includes('UNIQUE constraint failed')) {
        console.error(chalk.red(`   Error: ${error.message}`));
      }
    }
  }

  if (inserted > 0) {
    console.log(chalk.green(`   ✅ Added ${inserted} sample action items`));
  } else {
    console.log(chalk.gray(`   ℹ️  Sample items already exist (skipping)`));
  }

  await db.close();

  // 5. Success
  console.log(chalk.bold.green('\n✅ Setup complete!\n'));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  1. npm test              # Run demo extraction'));
  console.log(chalk.gray('  2. npm start             # Start CLI interface'));
  console.log(chalk.gray('  3. npm run check         # Check for overdue items'));
  console.log(chalk.gray('  4. npm run report        # View status report\n'));
}

setup().catch(error => {
  console.error(chalk.red(`Setup failed: ${error.message}`));
  process.exit(1);
});

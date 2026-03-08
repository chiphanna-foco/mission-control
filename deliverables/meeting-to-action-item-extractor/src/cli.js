#!/usr/bin/env node

/**
 * Meeting-to-Action-Item CLI Interface
 * 
 * Usage:
 *   node cli.js --file /path/to/transcript.txt
 *   node cli.js "I'll send the proposal by Friday"
 *   node cli.js --meeting-id granola-123
 *   node cli.js --overdue
 *   node cli.js --dashboard
 */

import fs from 'fs';
import path from 'path';
import { program } from 'commander';
import chalk from 'chalk';
import { ExtractorEngine } from './engine.js';
import Database from './db.js';
import { ActionItemMonitor } from './monitor.js';

const engine = new ExtractorEngine();
let db;

/**
 * Extract from file
 */
async function handleFile(filepath) {
  if (!fs.existsSync(filepath)) {
    console.error(chalk.red(`File not found: ${filepath}`));
    process.exit(1);
  }

  const transcript = fs.readFileSync(filepath, 'utf-8');
  console.log(chalk.blue(`📄 Processing file: ${filepath}`));
  console.log(chalk.gray(`   ${transcript.length} characters\n`));

  const items = await engine.extract(transcript, {
    title: path.basename(filepath)
  });

  return displayResults(items);
}

/**
 * Extract from text input
 */
async function handleText(text) {
  console.log(chalk.blue(`📝 Extracting from text input\n`));
  
  const items = await engine.extract(text);
  return displayResults(items);
}

/**
 * Extract from Granola meeting
 */
async function handleMeetingId(meetingId) {
  // In real implementation, would fetch from Granola API
  // For now, stub
  console.log(chalk.yellow(`⚠️  Granola integration not yet implemented`));
  console.log(`Would fetch meeting: ${meetingId}`);
  process.exit(1);
}

/**
 * Display extraction results
 */
function displayResults(items) {
  console.log(chalk.bold(`\n🎯 Extracted ${items.length} Action Item${items.length !== 1 ? 's' : ''}`));
  console.log('─'.repeat(70));

  if (items.length === 0) {
    console.log(chalk.gray('No action items found in input'));
    return;
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const num = i + 1;
    
    console.log(`\n${chalk.bold(num)}. ${chalk.cyan(item.title)}`);
    console.log(`   ${chalk.gray(item.description)}`);
    console.log(`   Assigned: ${chalk.green(item.assignedTo)} | Due: ${chalk.yellow(item.dueDate || 'No date')} | Priority: ${chalk.magenta(item.priority)}`);
    console.log(`   Pattern: ${chalk.gray(item.source.pattern)} (${Math.round(item.source.confidence * 100)}% confidence)`);
  }

  console.log('\n─'.repeat(70));
  console.log(chalk.green(`✅ Extraction complete`));

  return items;
}

/**
 * Save to database
 */
async function saveToDatabase(items) {
  if (!db) {
    console.log(chalk.yellow(`⚠️  Database not initialized`));
    return;
  }

  try {
    await db.insertActionItems(items);
    console.log(chalk.green(`✅ Saved ${items.length} item(s) to database`));
  } catch (error) {
    console.error(chalk.red(`Error saving to database: ${error.message}`));
  }
}

/**
 * CLI setup
 */
async function main() {
  program
    .name('extract-actions')
    .description('Extract action items from meeting transcripts')
    .version('1.0.0');

  program
    .command('extract [input]', { isDefault: true })
    .description('Extract action items from meeting notes')
    .option('-f, --file <path>', 'Read from file')
    .option('-m, --meeting-id <id>', 'Fetch from Granola meeting')
    .option('-s, --save', 'Save to database')
    .option('--confidence <threshold>', 'Confidence threshold (0-1)', '0.65')
    .action(async (input, options) => {
      // Initialize database if saving
      if (options.save) {
        db = new Database();
        await db.init();
      }

      // Set confidence threshold
      engine.confidenceThreshold = parseFloat(options.confidence);

      let items = [];

      if (options.file) {
        items = await handleFile(options.file);
      } else if (options.meetingId) {
        await handleMeetingId(options.meetingId);
      } else if (input) {
        items = await handleText(input);
      } else {
        console.log(chalk.yellow('No input provided'));
        program.outputHelp();
        process.exit(1);
      }

      // Save if requested
      if (options.save && items.length > 0) {
        await saveToDatabase(items);
      }

      if (db) await db.close();
    });

  program
    .command('check')
    .description('Check for overdue action items')
    .action(async () => {
    const monitor = new ActionItemMonitor();
    await monitor.check();
  });

  program
    .command('alert')
    .description('Send alerts for overdue items')
    .action(async () => {
    const monitor = new ActionItemMonitor();
    await monitor.alert();
  });

  program
    .command('report')
    .description('Display action items status report')
    .action(async () => {
    const monitor = new ActionItemMonitor();
    await monitor.report();
  });

  program
    .command('list')
    .description('List action items')
    .option('-s, --status <status>', 'Filter by status')
    .option('-a, --assigned-to <person>', 'Filter by assignee')
    .option('-p, --priority <level>', 'Filter by priority')
    .action(async (options) => {
      db = new Database();
      await db.init();

      const filters = {};
      if (options.status) filters.status = options.status;
      if (options.assignedTo) filters.assignedTo = options.assignedTo;
      if (options.priority) filters.priority = options.priority;

      const items = await db.getActionItems(filters);

      console.log(chalk.bold(`\n📋 Action Items (${items.length} total)\n`));
      for (const item of items) {
        console.log(`${chalk.cyan(item.title)}`);
        console.log(`   Status: ${item.status} | Assigned: ${item.assigned_to} | Due: ${item.due_date || 'No date'}`);
      }

      await db.close();
    });

  program
    .command('complete <id>')
    .description('Mark action item as complete')
    .action(async (id) => {
      db = new Database();
      await db.init();

      await db.updateActionItem(id, {
        status: 'Completed',
        completedAt: new Date().toISOString()
      });

      console.log(chalk.green(`✅ Marked as complete: ${id}`));
      await db.close();
    });

  program
    .command('delete <id>')
    .description('Delete an action item')
    .action(async (id) => {
      db = new Database();
      await db.init();

      await db.deleteActionItem(id);
      console.log(chalk.green(`🗑️  Deleted: ${id}`));
      await db.close();
    });

  program
    .command('export <filepath>')
    .description('Export action items to JSON')
    .action(async (filepath) => {
      db = new Database();
      await db.init();

      const result = await db.exportJSON(filepath);
      console.log(chalk.green(`✅ Exported ${result.exported} items to ${result.path}`));
      await db.close();
    });

  program
    .command('import <filepath>')
    .description('Import action items from JSON')
    .action(async (filepath) => {
      if (!fs.existsSync(filepath)) {
        console.error(chalk.red(`File not found: ${filepath}`));
        process.exit(1);
      }

      db = new Database();
      await db.init();

      const result = await db.importJSON(filepath);
      console.log(chalk.green(`✅ Imported ${result.imported} items from ${filepath}`));
      await db.close();
    });

  program
    .command('test')
    .description('Run in demo mode (no API keys needed)')
    .action(async () => {
      console.log(chalk.blue.bold('\n🧪 Demo Mode - Sample Extraction\n'));

      const sampleTranscript = `
        In today's meeting, we discussed the Q2 planning. Here's what we committed to:

        I'll send the proposal to finance by Friday. 
        John needs to review the architecture by next Tuesday.
        We should update the API documentation before the launch.
        
        Action item: Schedule the team sync for next week.
        
        Sarah, can you follow up with the customer on the budget approval?
        We need to ship the hotfix by end of day tomorrow - it's blocking production.
      `;

      console.log(chalk.gray('Sample transcript:'));
      console.log(chalk.gray(sampleTranscript.trim()));
      console.log();

      const items = await engine.extract(sampleTranscript);
      displayResults(items);
    });

  // Parse CLI arguments
  await program.parseAsync(process.argv);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  });
}

export { engine, db };

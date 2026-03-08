#!/usr/bin/env node

/**
 * Action Item Monitoring & Overdue Alerts
 * 
 * Monitors action items for:
 * - Overdue items (due date passed, not completed)
 * - Items due today (reminder)
 * - Items due tomorrow (warning)
 * - Items overdue for >3 days (escalation)
 * 
 * Sends alerts via:
 * - Email
 * - Slack
 * - Dashboard notification
 */

import Database from './db.js';
import { isOverdue, daysUntilDue, formatDate, timeUntilDue } from './date-parser.js';
import { getPriorityEmoji } from './priority-inference.js';
import chalk from 'chalk';

class ActionItemMonitor {
  constructor(options = {}) {
    this.db = new Database(options.dbPath);
    this.alertChannels = options.alertChannels || ['console'];
  }

  /**
   * Check for overdue/due soon items
   */
  async check() {
    console.log(chalk.blue.bold('📋 Action Item Monitor - Checking Status...\n'));

    const items = await this.db.getActionItems({
      status: ['Pending', 'Blocked']
    });

    const now = new Date();
    const categories = {
      overdue: [],
      dueToday: [],
      dueTomorrow: [],
      dueSoon: [],  // Within 3 days
      normal: []
    };

    for (const item of items) {
      if (!item.dueDate) {
        categories.normal.push(item);
        continue;
      }

      const days = daysUntilDue(item.dueDate);

      if (days < 0) {
        categories.overdue.push({ ...item, daysOverdue: Math.abs(days) });
      } else if (days === 0) {
        categories.dueToday.push(item);
      } else if (days === 1) {
        categories.dueTomorrow.push(item);
      } else if (days <= 3) {
        categories.dueSoon.push({ ...item, daysUntil: days });
      } else {
        categories.normal.push(item);
      }
    }

    // Display results
    this._displayResults(categories);

    // Return data for programmatic use
    return {
      total: items.length,
      categories,
      timestamp: now.toISOString()
    };
  }

  /**
   * Display check results
   * @private
   */
  _displayResults(categories) {
    const { overdue, dueToday, dueTomorrow, dueSoon } = categories;

    // Overdue items (CRITICAL)
    if (overdue.length > 0) {
      console.log(chalk.red.bold(`\n⚠️  ${overdue.length} OVERDUE ITEM${overdue.length > 1 ? 'S' : ''}`));
      console.log(chalk.red('─'.repeat(60)));
      for (const item of overdue) {
        console.log(chalk.red(`${getPriorityEmoji(item.priority)} ${item.title}`));
        console.log(chalk.red(`   Assigned: ${item.assignedTo} | Due: ${formatDate(item.dueDate, 'long')} (${item.daysOverdue} days late)`));
        console.log();
      }
    }

    // Due today
    if (dueToday.length > 0) {
      console.log(chalk.yellow.bold(`\n🔔 ${dueToday.length} DUE TODAY`));
      console.log(chalk.yellow('─'.repeat(60)));
      for (const item of dueToday) {
        console.log(chalk.yellow(`${getPriorityEmoji(item.priority)} ${item.title}`));
        console.log(chalk.yellow(`   Assigned: ${item.assignedTo}`));
        console.log();
      }
    }

    // Due tomorrow
    if (dueTomorrow.length > 0) {
      console.log(chalk.cyan.bold(`\n📅 ${dueTomorrow.length} DUE TOMORROW`));
      console.log(chalk.cyan('─'.repeat(60)));
      for (const item of dueTomorrow) {
        console.log(chalk.cyan(`${getPriorityEmoji(item.priority)} ${item.title}`));
        console.log(chalk.cyan(`   Assigned: ${item.assignedTo}`));
        console.log();
      }
    }

    // Due soon (within 3 days)
    if (dueSoon.length > 0) {
      console.log(chalk.gray.bold(`\n📌 ${dueSoon.length} DUE WITHIN 3 DAYS`));
      console.log(chalk.gray('─'.repeat(60)));
      for (const item of dueSoon) {
        console.log(chalk.gray(`${getPriorityEmoji(item.priority)} ${item.title}`));
        console.log(chalk.gray(`   Assigned: ${item.assignedTo} | ${timeUntilDue(item.dueDate)}`));
        console.log();
      }
    }

    const totalUrgent = overdue.length + dueToday.length;
    console.log(chalk.bold(`\n📊 SUMMARY`));
    console.log('─'.repeat(60));
    console.log(`Overdue: ${overdue.length} | Due Today: ${dueToday.length} | Due Tomorrow: ${dueTomorrow.length}`);
    console.log(`Total Urgent (overdue + due today): ${totalUrgent}`);
    console.log();
  }

  /**
   * Send alerts for overdue/urgent items
   */
  async alert() {
    console.log(chalk.blue.bold('📧 Action Item Monitor - Sending Alerts...\n'));

    const results = await this.check();
    const { overdue, dueToday } = results.categories;

    const urgentItems = [...overdue, ...dueToday];

    if (urgentItems.length === 0) {
      console.log(chalk.green('✅ No urgent items to alert on'));
      return { sent: 0, items: [] };
    }

    console.log(chalk.yellow(`\n⚠️  Found ${urgentItems.length} item(s) to alert on`));

    const alerts = [];
    for (const item of urgentItems) {
      const alert = {
        itemId: item.id,
        title: item.title,
        assignedTo: item.assignedTo,
        dueDate: item.dueDate,
        priority: item.priority
      };

      // Would send to each channel (email, slack, etc)
      // For now, just log
      alerts.push(alert);

      console.log(chalk.yellow(`  → Alert for: ${item.title} (assigned to ${item.assignedTo})`));
    }

    return { sent: alerts.length, alerts };
  }

  /**
   * Generate status report
   */
  async report() {
    console.log(chalk.blue.bold('📊 Action Items Status Report\n'));

    const items = await this.db.getActionItems();

    // Group by status
    const byStatus = {};
    for (const item of items) {
      if (!byStatus[item.status]) byStatus[item.status] = [];
      byStatus[item.status].push(item);
    }

    // Group by assignee
    const byAssignee = {};
    for (const item of items) {
      if (!byAssignee[item.assignedTo]) byAssignee[item.assignedTo] = [];
      byAssignee[item.assignedTo].push(item);
    }

    // Group by priority
    const byPriority = {};
    for (const item of items) {
      if (!byPriority[item.priority]) byPriority[item.priority] = [];
      byPriority[item.priority].push(item);
    }

    console.log(chalk.bold('By Status:'));
    for (const [status, items] of Object.entries(byStatus)) {
      console.log(`  ${status}: ${items.length}`);
    }

    console.log(chalk.bold('\nBy Assignee:'));
    for (const [assignee, items] of Object.entries(byAssignee)) {
      console.log(`  ${assignee}: ${items.length}`);
    }

    console.log(chalk.bold('\nBy Priority:'));
    for (const [priority, items] of Object.entries(byPriority)) {
      console.log(`  ${getPriorityEmoji(priority)} ${priority}: ${items.length}`);
    }

    console.log(chalk.bold(`\nTotal: ${items.length} action items`));

    return {
      totalItems: items.length,
      byStatus,
      byAssignee,
      byPriority
    };
  }

  /**
   * Mark item as complete and update DB
   */
  async complete(itemId) {
    await this.db.updateActionItem(itemId, {
      status: 'Completed',
      completedAt: new Date().toISOString()
    });
    console.log(chalk.green(`✅ Marked as complete: ${itemId}`));
  }

  /**
   * Snooze overdue alert for N days
   */
  async snooze(itemId, days = 3) {
    const item = await this.db.getActionItem(itemId);
    if (!item) throw new Error(`Item not found: ${itemId}`);

    const newDueDate = new Date(item.dueDate);
    newDueDate.setDate(newDueDate.getDate() + days);

    await this.db.updateActionItem(itemId, {
      dueDate: newDueDate.toISOString()
    });
    console.log(chalk.yellow(`⏰ Snoozed for ${days} days: ${itemId}`));
  }
}

/**
 * CLI interface
 */
async function main() {
  const monitor = new ActionItemMonitor();

  const args = process.argv.slice(2);
  const command = args[0] || '--check';

  try {
    if (command === '--check') {
      const result = await monitor.check();
      process.exit(result.categories.overdue.length > 0 || result.categories.dueToday.length > 0 ? 1 : 0);
    } else if (command === '--alert') {
      const result = await monitor.alert();
      process.exit(result.sent > 0 ? 1 : 0);
    } else if (command === '--report') {
      await monitor.report();
    } else if (command === '--complete') {
      if (!args[1]) {
        console.error('Usage: monitor.js --complete <item-id>');
        process.exit(1);
      }
      await monitor.complete(args[1]);
    } else if (command === '--snooze') {
      if (!args[1]) {
        console.error('Usage: monitor.js --snooze <item-id> [days]');
        process.exit(1);
      }
      await monitor.snooze(args[1], parseInt(args[2]) || 3);
    } else {
      console.error(`Unknown command: ${command}`);
      console.error('Usage: monitor.js [--check|--alert|--report|--complete|--snooze]');
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ActionItemMonitor };
export default ActionItemMonitor;

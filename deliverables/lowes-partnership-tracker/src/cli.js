#!/usr/bin/env node

/**
 * Lowes Partnership Tracker - CLI Interface
 * 
 * Commands for managing deal milestones, categories, member segments, and readiness
 */

import { program } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { PartnershipTracker } from './engine.js';

// Load deal from file
function loadDeal(dealFile = './data/deal.json') {
  if (!fs.existsSync(dealFile)) {
    console.error(chalk.red(`Deal file not found: ${dealFile}`));
    console.error(chalk.yellow('Run: npm run setup'));
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dealFile, 'utf-8'));
  return data;
}

// Save deal to file
function saveDeal(deal, dealFile = './data/deal.json') {
  fs.mkdirSync(path.dirname(dealFile), { recursive: true });
  fs.writeFileSync(dealFile, JSON.stringify(deal, null, 2));
}

// Recreate tracker from saved data
function reconstructTracker(dealData) {
  const tracker = new PartnershipTracker(dealData.deal.id, {
    dealName: dealData.deal.name,
    status: dealData.deal.status,
    expectedClose: dealData.deal.expectedClose
  });

  // Restore milestones
  for (const m of dealData.milestones || []) {
    tracker.milestones.push(m);
  }

  // Restore categories
  for (const c of dealData.categories || []) {
    tracker.categories.push(c);
  }

  // Restore segments
  for (const s of dealData.memberSegments || []) {
    tracker.memberSegments.push(s);
  }

  // Restore readiness
  for (const r of dealData.readinessItems || []) {
    tracker.readinessItems.push(r);
  }

  return tracker;
}

// CLI Setup
const cli = program
  .name('lowes-tracker')
  .description('Lowes Partnership Deal Tracker')
  .version('1.0.0');

// ============ TIMELINE COMMANDS ============

cli.command('timeline')
  .description('View legal milestone timeline')
  .option('--all', 'Show all milestones including completed')
  .action((options) => {
    const deal = loadDeal();
    const tracker = reconstructTracker(deal);
    const status = tracker.getLegalStatus();

    console.log(chalk.bold.blue('\n📅 Legal Milestone Timeline\n'));
    console.log(chalk.gray(`Completion: ${status.completionPercentage}% (${status.completed}/${status.totalMilestones})`));
    console.log(chalk.gray(`Health: ${status.timelineHealthy ? '✅ On Track' : '⚠️ At Risk'}`));
    console.log();

    const milestones = tracker.getMilestones();
    for (const m of milestones) {
      if (!options.all && m.status === 'complete') continue;

      const statusIcon = {
        'pending': '⏳',
        'in_progress': '🔄',
        'complete': '✅',
        'delayed': '⚠️',
        'blocked': '❌'
      }[m.status] || '•';

      const priorityColor = {
        'critical': chalk.red,
        'high': chalk.yellow,
        'medium': chalk.gray,
        'low': chalk.dim
      }[m.priority] || chalk.gray;

      const dateStr = m.dueDate ? new Date(m.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : 'TBD';

      console.log(`${statusIcon} ${priorityColor(m.name)}`);
      console.log(chalk.gray(`   Due: ${dateStr} | Owner: ${m.owner || 'Unassigned'}`));
    }

    console.log();
  });

// ============ CATEGORY COMMANDS ============

cli.command('category list')
  .description('List Lowes categories by priority')
  .option('--sort <type>', 'Sort by: priority|roi|launch', 'priority')
  .action((options) => {
    const deal = loadDeal();
    const tracker = reconstructTracker(deal);

    console.log(chalk.bold.blue('\n📦 Lowes Categories\n'));

    const categories = tracker.getCategories(options.sort);
    for (const cat of categories) {
      const priorityBadge = cat.priority <= 2 ? chalk.red(`P${cat.priority}`) : chalk.gray(`P${cat.priority}`);
      const readinessBar = '█'.repeat(Math.ceil(cat.readinessPercentage / 10)) + '░'.repeat(10 - Math.ceil(cat.readinessPercentage / 10));
      const roiStr = cat.expectedROI > 0 ? chalk.green(`$${(cat.expectedROI / 1000000).toFixed(1)}M`) : chalk.gray('TBD');

      console.log(`${priorityBadge} ${chalk.cyan(cat.name)}`);
      console.log(`   ROI: ${roiStr} | Launch: ${cat.launchDate || 'TBD'} | Ready: ${readinessBar} ${cat.readinessPercentage}%`);
    }

    console.log();
  });

// ============ READINESS COMMANDS ============

cli.command('readiness')
  .description('View launch readiness status')
  .option('--details', 'Show detailed breakdown')
  .action((options) => {
    const deal = loadDeal();
    const tracker = reconstructTracker(deal);
    const readiness = tracker.getReadiness();

    console.log(chalk.bold.blue('\n🚀 Launch Readiness Status\n'));

    const readinessBar = '█'.repeat(Math.ceil(readiness.overall / 5)) + '░'.repeat(20 - Math.ceil(readiness.overall / 5));
    console.log(`Overall: ${readinessBar} ${readiness.overall}%`);
    console.log(chalk.gray(readiness.readyToLaunch ? '✅ Ready to Launch' : '⚠️ Not Ready Yet'));
    console.log();

    if (options.details) {
      console.log(chalk.bold('By Category:'));
      for (const [category, data] of Object.entries(readiness.byCategory)) {
        const bar = '▓'.repeat(Math.ceil(data.percentage / 5)) + '░'.repeat(20 - Math.ceil(data.percentage / 5));
        console.log(`  ${category.padEnd(15)} ${bar} ${data.percentage}% (${data.complete}/${data.items})`);
      }

      if (readiness.blockers.length > 0) {
        console.log(chalk.bold.red('\n🚫 Blockers:'));
        for (const blocker of readiness.blockers) {
          console.log(chalk.red(`  • ${blocker.name} (${blocker.category})`));
        }
      }
    }

    console.log();
  });

// ============ REPORT COMMANDS ============

cli.command('report')
  .description('Generate deal summary report')
  .action(() => {
    const deal = loadDeal();
    const tracker = reconstructTracker(deal);
    const summary = tracker.getDealSummary();

    console.log(chalk.bold.blue.underline(`\n${summary.dealName} - Status Report\n`));
    console.log(chalk.gray(`Deal Status: ${summary.status}`));
    console.log(chalk.gray(`Expected Close: ${summary.expectedClose || 'TBD'} (${summary.daysUntilClose} days)`));
    console.log();

    console.log(chalk.bold('Legal Timeline'));
    console.log(`  Completion: ${summary.legal.completionPercentage}%`);
    console.log(`  Status: ${summary.legal.timelineHealthy ? '✅ On Track' : '⚠️ At Risk'}`);
    if (summary.legal.atRiskMilestones.length > 0) {
      console.log(chalk.yellow(`  ⚠️  ${summary.legal.atRiskMilestones.length} milestone(s) at risk`));
    }
    console.log();

    console.log(chalk.bold('Launch Readiness'));
    console.log(`  Overall: ${summary.readiness.overall}%`);
    console.log(`  Status: ${summary.readiness.readyToLaunch ? '✅ Ready' : '🔄 In Progress'}`);
    console.log();

    console.log(chalk.bold('Categories'));
    console.log(`  Total: ${summary.categories.total}`);
    console.log(`  Revenue Potential: $${(summary.revenue.totalExpected / 1000000).toFixed(1)}M`);
    console.log();

    console.log(chalk.bold('Member Segments'));
    console.log(`  Total Segments: ${summary.memberSegments.total}`);
    console.log(`  Total Capacity: ${summary.memberSegments.totalCapacity.toLocaleString()}`);
    console.log();

    if (summary.risks.length > 0) {
      console.log(chalk.bold.red('⚠️  Identified Risks'));
      for (const risk of summary.risks) {
        const severityColor = risk.severity === 'critical' ? chalk.red : chalk.yellow;
        console.log(severityColor(`  ${risk.message}`));
      }
    }

    console.log();
  });

// ============ EXPORT COMMANDS ============

cli.command('export [filepath]')
  .description('Export deal data as JSON')
  .action((filepath) => {
    const deal = loadDeal();
    const tracker = reconstructTracker(deal);
    const exported = tracker.export();

    const file = filepath || './data/deal-export.json';
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(exported, null, 2));

    console.log(chalk.green(`✅ Exported to ${file}`));
  });

// Parse CLI
cli.parse(process.argv);

export { loadDeal, saveDeal, reconstructTracker };

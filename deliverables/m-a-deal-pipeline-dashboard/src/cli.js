#!/usr/bin/env node

/**
 * M&A Deal Pipeline CLI
 * View pipeline, status, and deal details
 */

import { program } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { DealPipeline } from './engine.js';

// Load deals from file
function loadDeals(dataFile = './data/deals.json') {
  if (!fs.existsSync(dataFile)) {
    return { deals: [], createdAt: new Date() };
  }
  return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
}

// Reconstruct pipeline
function reconstructPipeline(data) {
  const pipeline = new DealPipeline();
  for (const deal of data.deals || []) {
    pipeline.deals.push(deal);
  }
  return pipeline;
}

// CLI
const cli = program
  .name('m-a-tracker')
  .description('M&A Deal Pipeline Dashboard')
  .version('1.0.0');

cli.command('pipeline')
  .description('View pipeline overview')
  .action(() => {
    const data = loadDeals();
    const pipeline = reconstructPipeline(data);
    const dash = pipeline.getDashboard();

    console.log(chalk.bold.blue('\n📊 M&A Deal Pipeline\n'));

    for (const [stage, deals] of Object.entries(dash.pipeline)) {
      if (deals.length === 0) continue;

      const stageEmoji = {
        'prospecting': '🔍',
        'initial-contact': '📞',
        'due-diligence': '📋',
        'negotiation': '💬',
        'closing': '🎯',
        'closed': '✅',
        'dead': '❌'
      }[stage] || '•';

      console.log(chalk.bold(`${stageEmoji} ${chalk.cyan(stage.replace(/-/g, ' ').toUpperCase())} (${deals.length})`));
      for (const deal of deals) {
        console.log(chalk.gray(`   • ${deal.name} | ${deal.target.name || 'N/A'}`));
      }
      console.log();
    }
  });

cli.command('status')
  .description('View pipeline metrics')
  .action(() => {
    const data = loadDeals();
    const pipeline = reconstructPipeline(data);
    const dash = pipeline.getDashboard();
    const metrics = dash.metrics;

    console.log(chalk.bold.blue('\n📈 Pipeline Metrics\n'));
    console.log(`Active Deals: ${chalk.cyan(metrics.totalActive)}`);
    console.log(`Total Value: ${chalk.green(`$${(metrics.totalValue / 1000000).toFixed(1)}M`)}`);
    console.log(`Avg Days in Stage: ${metrics.avgTimeInStage}`);
    console.log();

    console.log(chalk.bold('By Stage:'));
    console.log(`  Prospecting: ${metrics.byStage.prospecting}`);
    console.log(`  Initial Contact: ${metrics.byStage.initialContact}`);
    console.log(`  Due Diligence: ${metrics.byStage.dueDiligence}`);
    console.log(`  Negotiation: ${metrics.byStage.negotiation}`);
    console.log(`  Closing: ${metrics.byStage.closing}`);
    console.log();

    if (metrics.blockers.length > 0) {
      console.log(chalk.bold.red(`⚠️  ${metrics.blockers.length} Active Blocker${metrics.blockers.length !== 1 ? 's' : ''}`));
      for (const b of metrics.blockers.slice(0, 5)) {
        console.log(chalk.red(`   • ${b.description} (${b.dealName})`));
      }
    }

    if (metrics.nextDueActions.length > 0) {
      console.log(chalk.bold.yellow(`\n📋 ${metrics.nextDueActions.length} Action${metrics.nextDueActions.length !== 1 ? 's' : ''} Due in 7 Days`));
      for (const a of metrics.nextDueActions.slice(0, 5)) {
        console.log(chalk.yellow(`   • ${a.description} (${a.dealName})`));
      }
    }

    console.log();
  });

cli.command('report')
  .description('Generate full pipeline report')
  .action(() => {
    const data = loadDeals();
    const pipeline = reconstructPipeline(data);
    const dash = pipeline.getDashboard();

    console.log(chalk.bold.blue.underline('\n📊 M&A Deal Pipeline Report\n'));

    for (const deal of dash.deals) {
      const stageColor = {
        'due-diligence': chalk.yellow,
        'negotiation': chalk.cyan,
        'closing': chalk.green,
        'prospecting': chalk.gray
      }[deal.stage] || chalk.gray;

      console.log(stageColor.bold(`${deal.name}`));
      console.log(chalk.gray(`   Target: ${deal.target} | Stage: ${deal.stage.replace(/-/g, ' ')}`));
      console.log(chalk.gray(`   Lead: ${deal.lead || 'Unassigned'} | Value: $${deal.value ? (deal.value / 1000000).toFixed(1) + 'M' : 'TBD'}`));

      if (deal.daysToClose) {
        const color = deal.daysToClose < 30 ? chalk.yellow : chalk.gray;
        console.log(color(`   📅 Close in ${deal.daysToClose} days`));
      }

      if (deal.ddCompletion > 0) {
        const bar = '█'.repeat(Math.ceil(deal.ddCompletion / 10)) + '░'.repeat(10 - Math.ceil(deal.ddCompletion / 10));
        console.log(chalk.gray(`   DD: ${bar} ${deal.ddCompletion}%`));
      }

      if (deal.blockers > 0) {
        console.log(chalk.red(`   ⚠️  ${deal.blockers} blocker${deal.blockers !== 1 ? 's' : ''}`));
      }

      if (deal.nextActions > 0) {
        console.log(chalk.yellow(`   → ${deal.nextActions} pending action${deal.nextActions !== 1 ? 's' : ''}`));
      }

      console.log();
    }
  });

cli.parse(process.argv);

export { loadDeals, reconstructPipeline };

#!/usr/bin/env node

/**
 * AI Innovation Pilot Tracker CLI
 */

import { program } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { PilotTracker } from './engine.js';

function loadPilots(dataFile = './data/pilots.json') {
  if (!fs.existsSync(dataFile)) {
    return { pilots: [], createdAt: new Date() };
  }
  return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
}

function reconstructTracker(data) {
  const tracker = new PilotTracker();
  for (const pilot of data.pilots || []) {
    tracker.pilots.push(pilot);
  }
  return tracker;
}

const cli = program
  .name('ai-tracker')
  .description('AI Innovation Pilot Tracker')
  .version('1.0.0');

cli.command('list')
  .description('List all pilots')
  .option('--status <status>', 'Filter by status')
  .action((options) => {
    const data = loadPilots();
    const tracker = reconstructTracker(data);
    const pilots = tracker.getAllPilots(options);

    console.log(chalk.bold.blue('\n🤖 AI Innovation Pilots\n'));
    for (const pilot of pilots) {
      const statusEmoji = { 'in-progress': '🔄', 'completed': '✅', 'planned': '📋', 'paused': '⏸️', 'failed': '❌' }[pilot.status] || '•';
      const outcomeColor = pilot.results.outcome === 'success' ? chalk.green : pilot.results.outcome === 'failure' ? chalk.red : chalk.gray;
      
      console.log(`${statusEmoji} ${chalk.cyan(pilot.name)}`);
      console.log(chalk.gray(`   Tool: ${pilot.tool} | Category: ${pilot.category}`));
      console.log(chalk.gray(`   Lead: ${pilot.pilots.lead || 'Unassigned'}`));
      if (pilot.results.outcome !== 'pending') {
        console.log(outcomeColor(`   Outcome: ${pilot.results.outcome.toUpperCase()} | ROI: ${pilot.roi.roi}%`));
      }
      console.log();
    }
  });

cli.command('status')
  .description('View overall status')
  .action(() => {
    const data = loadPilots();
    const tracker = reconstructTracker(data);
    const dash = tracker.getDashboard();

    console.log(chalk.bold.blue('\n📊 AI Innovation Status\n'));
    console.log(`Total Pilots: ${chalk.cyan(dash.summary.total)}`);
    console.log(`In Progress: ${chalk.yellow(dash.summary.inProgress)}`);
    console.log(`Completed: ${chalk.green(dash.summary.completed)}`);
    console.log(`Successful: ${chalk.green(dash.summary.successful)} (${dash.summary.successRate}% success rate)`);
    console.log();
    console.log(`Total Investment: ${chalk.cyan(`$${dash.roi.totalInvestment.toLocaleString()}`)}`);
    console.log(`Annual Benefit: ${chalk.green(`$${dash.roi.totalMonthlyBenefit.toLocaleString()}/month`)}`);
    console.log(`Average ROI: ${chalk.green(dash.roi.averageROI + '%')}`);
    console.log();
    console.log(`Case Studies Ready: ${chalk.magenta(dash.caseStudies)}`);
    console.log();
  });

cli.command('report')
  .description('Generate leadership report')
  .action(() => {
    const data = loadPilots();
    const tracker = reconstructTracker(data);
    const report = tracker.generateLeadershipReport();

    console.log(chalk.bold.blue.underline('\n🎯 AI Innovation Leadership Report\n'));
    console.log(chalk.bold('Overview:'));
    console.log(`  Total Pilots: ${report.overview.totalPilots}`);
    console.log(`  Success Rate: ${report.overview.successRate}%`);
    console.log(`  Total ROI: ${chalk.green(report.overview.totalROI + '%')}`);
    console.log(`  Annual Benefit: ${chalk.green(`$${report.overview.totalBenefit.toLocaleString()}`)}`);
    console.log();

    if (report.successStories.length > 0) {
      console.log(chalk.bold('Success Stories:'));
      for (const story of report.successStories) {
        console.log(`  ✅ ${story.title}`);
        console.log(`     ${story.impact}`);
      }
      console.log();
    }

    if (report.recommendations.length > 0) {
      console.log(chalk.bold('Top Recommendations:'));
      for (const rec of report.recommendations) {
        console.log(`  ⭐ ${rec.recommendation} (${rec.priority})`);
      }
    }
    console.log();
  });

cli.command('case-studies')
  .description('View case studies')
  .action(() => {
    const data = loadPilots();
    const tracker = reconstructTracker(data);
    const studies = tracker.getCaseStudies();

    console.log(chalk.bold.magenta('\n📚 Case Studies\n'));
    for (const study of studies) {
      console.log(chalk.bold(study.title));
      console.log(chalk.gray(`  Tool: ${study.tool} | ${study.metrics.efficiencyGain}% efficiency | ${study.metrics.roi}% ROI`));
      console.log(chalk.gray(`  Impact: ${study.impact}`));
      console.log();
    }
  });

cli.parse(process.argv);

export { loadPilots, reconstructTracker };

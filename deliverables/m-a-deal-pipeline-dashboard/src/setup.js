#!/usr/bin/env node

/**
 * Setup M&A Deal Pipeline with sample data
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { DealPipeline } from './engine.js';

async function setup() {
  console.log(chalk.blue.bold('\n🚀 Setting up M&A Deal Pipeline\n'));

  // Create directories
  console.log(chalk.cyan('Creating project structure...'));
  const dirs = ['data', 'dashboard', 'docs'];
  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  console.log(chalk.green('✅ Directories created'));

  // Create sample pipeline
  console.log(chalk.cyan('\nInitializing sample deals...'));
  const pipeline = new DealPipeline();

  // Sample deals
  const sampleDeal = [
    {
      name: 'TechCorp Acquisition',
      targetName: 'TechCorp Inc',
      industry: 'Software',
      stage: 'due-diligence',
      revenue: '50M',
      lead: 'Jane Smith',
      targetPrice: 250000000,
      synergies: 75000000,
      expectedClose: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      name: 'DataSoft Integration',
      targetName: 'DataSoft Systems',
      industry: 'Analytics',
      stage: 'negotiation',
      revenue: '30M',
      lead: 'John Doe',
      targetPrice: 150000000,
      synergies: 40000000,
      expectedClose: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      name: 'CloudBase Merger',
      targetName: 'CloudBase Pro',
      industry: 'Cloud Services',
      stage: 'negotiation',
      revenue: '25M',
      lead: 'Sarah Johnson',
      targetPrice: 120000000,
      synergies: 30000000,
      expectedClose: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      name: 'SecureNet Acquisition',
      targetName: 'SecureNet Ltd',
      industry: 'Cybersecurity',
      stage: 'initial-contact',
      revenue: '15M',
      lead: 'Mike Chen',
      targetPrice: 80000000,
      synergies: 20000000
    },
    {
      name: 'DevTools Platform',
      targetName: 'DevTools Corp',
      industry: 'Developer Tools',
      stage: 'prospecting',
      revenue: '10M',
      lead: null,
      targetPrice: 50000000,
      synergies: 15000000
    }
  ];

  for (const deal of sampleDeal) {
    const d = pipeline.addDeal(deal.name, deal);
    
    // Add sample blockers
    if (d.stage === 'due-diligence') {
      pipeline.addBlocker(d.id, 'Waiting on vendor contract review', { severity: 'high', owner: 'Legal' });
    }

    if (d.stage === 'negotiation') {
      pipeline.addBlocker(d.id, 'Price negotiation ongoing', { severity: 'medium', owner: 'Finance' });
    }

    // Add sample actions
    if (d.stage !== 'prospecting') {
      pipeline.addAction(d.id, 'Send next round of questions', {
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        owner: deal.lead,
        priority: 'high'
      });
    }

    // Add sample DD items
    if (d.stage === 'due-diligence' || d.stage === 'negotiation') {
      const ddItems = [
        { name: 'Financial audit', status: 'complete' },
        { name: 'Legal review', status: 'in-progress' },
        { name: 'Technical assessment', status: 'pending' },
        { name: 'Customer review', status: 'pending' }
      ];
      pipeline.updateDueDiligence(d.id, ddItems);
    }
  }

  // Save deals
  const dataDir = path.join(process.cwd(), 'data');
  const dealData = {
    deals: pipeline.deals,
    createdAt: pipeline.createdAt
  };

  fs.writeFileSync(
    path.join(dataDir, 'deals.json'),
    JSON.stringify(dealData, null, 2)
  );
  console.log(chalk.green('✅ Sample data created'));

  // Create dashboard HTML
  console.log(chalk.cyan('\nCreating dashboard template...'));
  const dashboardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>M&A Deal Pipeline Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1600px; margin: 0 auto; }
    .header { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header h1 { color: #333; margin-bottom: 10px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .metric-card { background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metric-value { font-size: 24px; font-weight: bold; color: #2196F3; }
    .metric-label { font-size: 12px; color: #999; text-transform: uppercase; margin-top: 5px; }
    .pipeline { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; }
    .stage-column { background: #f9f9f9; padding: 15px; border-radius: 8px; }
    .stage-title { font-weight: bold; padding: 10px; background: #eee; border-radius: 4px; margin-bottom: 10px; }
    .deal-card { background: #fff; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #2196F3; cursor: pointer; }
    .deal-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .deal-name { font-weight: bold; font-size: 13px; margin-bottom: 3px; }
    .deal-target { font-size: 11px; color: #666; }
    .dd-bar { height: 4px; background: #ddd; border-radius: 2px; margin-top: 6px; overflow: hidden; }
    .dd-fill { height: 100%; background: #4CAF50; }
    .blocker { color: #d32f2f; font-size: 11px; margin-top: 3px; }
    @media (prefers-color-scheme: dark) {
      body { background: #1a1a1a; }
      .metric-card, .stage-column, .deal-card, .header { background: #2a2a2a; color: #fff; }
      .header h1 { color: #fff; }
      .stage-column { background: #1a1a1a; }
      .stage-title { background: #333; }
      .deal-target { color: #aaa; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 M&A Deal Pipeline Dashboard</h1>
      <p style="color: #999; font-size: 14px;">Real-time view of all active M&A deals - stage, dates, blockers, and due diligence</p>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-value">5</div>
        <div class="metric-label">Active Deals</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">$600M</div>
        <div class="metric-label">Total Value</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">3</div>
        <div class="metric-label">Blockers</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">8</div>
        <div class="metric-label">Next Actions</div>
      </div>
    </div>

    <div class="pipeline">
      <div class="stage-column">
        <div class="stage-title">🔍 Prospecting (1)</div>
        <div class="deal-card">
          <div class="deal-name">DevTools Platform</div>
          <div class="deal-target">DevTools Corp • 10M revenue</div>
        </div>
      </div>

      <div class="stage-column">
        <div class="stage-title">📞 Initial Contact (1)</div>
        <div class="deal-card">
          <div class="deal-name">SecureNet Acquisition</div>
          <div class="deal-target">SecureNet Ltd • 15M revenue</div>
        </div>
      </div>

      <div class="stage-column">
        <div class="stage-title">📋 Due Diligence (1)</div>
        <div class="deal-card">
          <div class="deal-name">TechCorp Acquisition</div>
          <div class="deal-target">TechCorp Inc • 50M revenue</div>
          <div class="dd-bar"><div class="dd-fill" style="width: 50%;"></div></div>
          <div class="blocker">⚠️ Legal review pending</div>
        </div>
      </div>

      <div class="stage-column">
        <div class="stage-title">💬 Negotiation (2)</div>
        <div class="deal-card">
          <div class="deal-name">DataSoft Integration</div>
          <div class="deal-target">DataSoft Systems • 30M revenue</div>
          <div class="dd-bar"><div class="dd-fill" style="width: 75%;"></div></div>
          <div class="blocker">⚠️ Price negotiation</div>
        </div>
        <div class="deal-card">
          <div class="deal-name">CloudBase Merger</div>
          <div class="deal-target">CloudBase Pro • 25M revenue</div>
          <div class="dd-bar"><div class="dd-fill" style="width: 60%;"></div></div>
        </div>
      </div>

      <div class="stage-column">
        <div class="stage-title">🎯 Closing (0)</div>
        <p style="color: #999; font-size: 12px; padding: 10px;">No deals in closing stage</p>
      </div>
    </div>

    <p style="text-align: center; color: #999; margin-top: 40px; font-size: 12px;">
      Last updated: --
    </p>
  </div>
</body>
</html>`;

  fs.writeFileSync(
    path.join(process.cwd(), 'dashboard/index.html'),
    dashboardHtml
  );
  console.log(chalk.green('✅ Dashboard created'));

  // Success
  console.log(chalk.bold.green('\n✅ Setup Complete!\n'));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  npm run pipeline         # View pipeline overview'));
  console.log(chalk.gray('  npm run status           # View metrics'));
  console.log(chalk.gray('  npm run report           # Generate full report'));
  console.log();
}

setup().catch(error => {
  console.error(chalk.red(`Setup failed: ${error.message}`));
  process.exit(1);
});

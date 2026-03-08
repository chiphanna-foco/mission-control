#!/usr/bin/env node

/**
 * Setup script for Lowes Partnership Tracker
 * Creates sample deal data and initializes the tracker
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { PartnershipTracker } from './engine.js';

async function setup() {
  console.log(chalk.blue.bold('\n🚀 Setting up Lowes Partnership Tracker\n'));

  // Create directories
  console.log(chalk.cyan('1️⃣  Creating project structure...'));
  const dirs = ['data', 'dashboard', 'docs'];
  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  console.log(chalk.green('   ✅ Directories created'));

  // Create .env.example
  console.log(chalk.cyan('\n2️⃣  Creating configuration template...'));
  const envExample = `# Lowes Partnership Tracker Configuration

# Dashboard
DASHBOARD_PORT=3001
DASHBOARD_URL=http://localhost:3001/lowes-tracker

# Mission Control Integration
MC_API_URL=http://localhost:3001
MC_API_KEY=your-api-key-here

# Tracker Settings
TIMEZONE=America/Denver
CURRENCY=USD

# Deal Configuration
DEAL_ID=lowes-2026-q1
DEAL_NAME=Lowes Partnership
EXPECTED_CLOSE=2026-04-30

# Notifications
ALERT_EMAIL=your-email@company.com
SLACK_WEBHOOK=https://hooks.slack.com/...
`;

  fs.writeFileSync(path.join(process.cwd(), '.env.example'), envExample);
  console.log(chalk.green('   ✅ .env.example created'));

  // Create sample deal
  console.log(chalk.cyan('\n3️⃣  Initializing sample deal...'));
  
  const tracker = new PartnershipTracker('lowes-2026-q1', {
    dealName: 'Lowes Partnership - Spring 2026',
    status: 'In Negotiation',
    expectedClose: '2026-04-30'
  });

  // Add legal milestones
  tracker.addMilestone('Contract review', {
    dueDate: '2026-03-15',
    owner: 'Legal Team',
    priority: 'critical',
    status: 'in_progress'
  });

  tracker.addMilestone('Board approval', {
    dueDate: '2026-03-22',
    owner: 'Leadership',
    priority: 'high',
    status: 'pending'
  });

  tracker.addMilestone('Final sign-off', {
    dueDate: '2026-03-30',
    owner: 'CEO',
    priority: 'critical',
    status: 'pending'
  });

  tracker.addMilestone('Deal closes', {
    dueDate: '2026-04-30',
    owner: 'Operations',
    priority: 'critical',
    status: 'pending'
  });

  // Add categories
  tracker.addCategory('Appliances', {
    priority: 1,
    roi: 2500000,
    launchDate: '2026-05-15',
    readiness: 50,
    inventory: 'sourcing'
  });

  tracker.addCategory('Tools & Hardware', {
    priority: 2,
    roi: 1800000,
    launchDate: '2026-06-01',
    readiness: 30,
    inventory: 'planning'
  });

  tracker.addCategory('Outdoor & Garden', {
    priority: 3,
    roi: 1200000,
    launchDate: '2026-06-15',
    readiness: 20,
    inventory: 'planning'
  });

  tracker.addCategory('Seasonal', {
    priority: 4,
    roi: 600000,
    launchDate: '2026-07-01',
    readiness: 10,
    inventory: 'planning'
  });

  // Add member segments
  tracker.addSegment('VIP Early Access', {
    description: 'Premium members with Lowes history',
    size: 500,
    phase: 1,
    launchDate: '2026-04-15',
    criteria: {
      minSpend: 5000,
      tenure: '12+ months',
      category: 'High-value'
    },
    readiness: 60
  });

  tracker.addSegment('General Member Rollout', {
    description: 'All qualified members',
    size: 25000,
    phase: 2,
    launchDate: '2026-05-15',
    criteria: {
      minSpend: 500,
      tenure: '3+ months'
    },
    readiness: 30
  });

  // Add readiness items
  const readinessItems = [
    // Legal
    { category: 'legal', name: 'Draft partnership agreement', status: 'complete', priority: 'critical', owner: 'Legal' },
    { category: 'legal', name: 'Internal legal review', status: 'in_progress', priority: 'critical', owner: 'Legal', percentComplete: 75 },
    { category: 'legal', name: 'Executive approval', status: 'pending', priority: 'high', owner: 'Leadership', dueDate: '2026-03-22' },
    { category: 'legal', name: 'Board sign-off', status: 'pending', priority: 'critical', owner: 'Board', dueDate: '2026-03-30' },

    // Technical
    { category: 'technical', name: 'API integration', status: 'in_progress', priority: 'high', owner: 'Engineering', percentComplete: 40 },
    { category: 'technical', name: 'Inventory sync', status: 'pending', priority: 'high', owner: 'Engineering', dueDate: '2026-04-15' },
    { category: 'technical', name: 'Payment processing', status: 'pending', priority: 'high', owner: 'Finance Tech' },
    { category: 'technical', name: 'Reporting setup', status: 'pending', priority: 'medium', owner: 'Analytics' },

    // Marketing
    { category: 'marketing', name: 'Marketing campaign', status: 'pending', priority: 'medium', owner: 'Marketing', dueDate: '2026-04-01' },
    { category: 'marketing', name: 'Member communications', status: 'pending', priority: 'medium', owner: 'Marketing', dueDate: '2026-04-15' },
    { category: 'marketing', name: 'Launch announcement', status: 'pending', priority: 'medium', owner: 'Communications' },

    // Operations
    { category: 'operations', name: 'Category prioritization', status: 'in_progress', priority: 'high', owner: 'Operations', percentComplete: 60 },
    { category: 'operations', name: 'Inventory provisioning', status: 'pending', priority: 'high', owner: 'Supply Chain', dueDate: '2026-04-20' },
    { category: 'operations', name: 'Support processes', status: 'pending', priority: 'medium', owner: 'Support' },

    // Member
    { category: 'member', name: 'Beta group selection', status: 'in_progress', priority: 'high', owner: 'Member Ops', percentComplete: 50 },
    { category: 'member', name: 'Member onboarding', status: 'pending', priority: 'medium', owner: 'Member Ops', dueDate: '2026-04-20' }
  ];

  for (const item of readinessItems) {
    tracker.addReadinessItem(item.name, item);
  }

  // Save deal
  const dealExport = tracker.export();
  const dataDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'deal.json'),
    JSON.stringify(dealExport, null, 2)
  );
  console.log(chalk.green('   ✅ Sample deal created'));

  // Create index.html for dashboard
  console.log(chalk.cyan('\n4️⃣  Creating dashboard template...'));
  const dashboardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lowes Partnership Tracker</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    .header { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header h1 { color: #333; margin-bottom: 5px; }
    .header p { color: #999; font-size: 14px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
    .card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h2 { color: #333; font-size: 16px; margin-bottom: 10px; }
    .progress-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin: 10px 0; }
    .progress-fill { height: 100%; background: #4CAF50; transition: width 0.3s; }
    .status-critical { color: #d32f2f; }
    .status-warning { color: #f57c00; }
    .status-success { color: #388e3c; }
    .metric { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
    .value { font-weight: bold; }
    @media (prefers-color-scheme: dark) {
      body { background: #1a1a1a; }
      .card, .header { background: #2a2a2a; color: #fff; }
      .header h1 { color: #fff; }
      .metric { color: #ccc; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Lowes Partnership Tracker</h1>
      <p>Real-time tracking for legal timeline, category prioritization, member segmentation, and launch readiness</p>
    </div>

    <div class="grid">
      <div class="card">
        <h2>📅 Legal Timeline</h2>
        <div class="metric">
          <span>Completion</span>
          <span class="value">0%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div class="metric">
          <span>Days to Close</span>
          <span class="value">--</span>
        </div>
      </div>

      <div class="card">
        <h2>🚀 Launch Readiness</h2>
        <div class="metric">
          <span>Overall</span>
          <span class="value">0%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div class="metric">
          <span>Status</span>
          <span class="value status-warning">In Progress</span>
        </div>
      </div>

      <div class="card">
        <h2>💰 Revenue Potential</h2>
        <div class="metric">
          <span>Total Expected</span>
          <span class="value">--</span>
        </div>
        <div class="metric">
          <span>Top Category</span>
          <span class="value">--</span>
        </div>
      </div>

      <div class="card">
        <h2>👥 Member Segments</h2>
        <div class="metric">
          <span>Total Segments</span>
          <span class="value">--</span>
        </div>
        <div class="metric">
          <span>Total Capacity</span>
          <span class="value">--</span>
        </div>
      </div>

      <div class="card">
        <h2>📦 Categories</h2>
        <div class="metric">
          <span>Total</span>
          <span class="value">--</span>
        </div>
        <div class="metric">
          <span>Ready to Launch</span>
          <span class="value">--</span>
        </div>
      </div>

      <div class="card">
        <h2>⚠️ Blockers</h2>
        <div class="metric">
          <span>Critical Issues</span>
          <span class="value status-critical">--</span>
        </div>
        <div class="metric">
          <span>At-Risk Items</span>
          <span class="value status-warning">--</span>
        </div>
      </div>
    </div>

    <p style="text-align: center; color: #999; margin-top: 40px; font-size: 12px;">
      Lowes Partnership Tracker | Real-time deal status | Last updated: --
    </p>
  </div>
</body>
</html>`;

  fs.writeFileSync(
    path.join(process.cwd(), 'dashboard/index.html'),
    dashboardHtml
  );
  console.log(chalk.green('   ✅ Dashboard template created'));

  // Success message
  console.log(chalk.bold.green('\n✅ Setup Complete!\n'));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  npm run timeline         # View legal milestone timeline'));
  console.log(chalk.gray('  npm run category list   # View categories by priority'));
  console.log(chalk.gray('  npm run readiness       # Check launch readiness'));
  console.log(chalk.gray('  npm run report          # Generate full deal report'));
  console.log(chalk.gray('  npm run export          # Export deal data'));
  console.log();
}

setup().catch(error => {
  console.error(chalk.red(`Setup failed: ${error.message}`));
  process.exit(1);
});

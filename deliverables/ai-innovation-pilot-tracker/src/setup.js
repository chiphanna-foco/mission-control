#!/usr/bin/env node

/**
 * Setup AI Innovation Pilot Tracker
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { PilotTracker } from './engine.js';

async function setup() {
  console.log(chalk.blue.bold('\n🚀 Setting up AI Innovation Pilot Tracker\n'));

  // Create directories
  const dirs = ['data', 'dashboard', 'docs', 'case-studies'];
  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  console.log(chalk.green('✅ Directories created'));

  // Create sample pilots
  console.log(chalk.cyan('\nInitializing sample pilots...'));
  const tracker = new PilotTracker();

  const samplePilots = [
    {
      name: 'Claude AI for Customer Support',
      tool: 'Claude API',
      category: 'customer-service',
      lead: 'Sarah Chen',
      status: 'completed',
      description: 'Testing Claude for support ticket classification and draft responses',
      investment: 5000,
      efficiencyGain: 45,
      costSavings: 12000,
      outcome: 'success'
    },
    {
      name: 'GPT-4 for Content Generation',
      tool: 'GPT-4',
      category: 'content',
      lead: 'Mike Johnson',
      status: 'completed',
      description: 'Testing GPT-4 for property descriptions at scale',
      investment: 8000,
      efficiencyGain: 60,
      costSavings: 25000,
      outcome: 'success'
    },
    {
      name: 'AI-Powered Lease Analysis',
      tool: 'Custom LLM',
      category: 'operations',
      lead: 'Alex Rivera',
      status: 'in-progress',
      description: 'Building custom model for automated lease document review',
      investment: 15000,
      affectedUsers: 50
    },
    {
      name: 'Predictive Maintenance AI',
      tool: 'Claude + Custom',
      category: 'operations',
      lead: 'Jamie Lee',
      status: 'planned',
      description: 'AI model to predict maintenance needs from property data',
      investment: 20000,
      affectedUsers: 100
    },
    {
      name: 'Tenant Matching Algorithm',
      tool: 'Custom ML',
      category: 'analytics',
      lead: 'David Park',
      status: 'completed',
      description: 'ML model for improved tenant-property matching',
      investment: 12000,
      efficiencyGain: 35,
      outcome: 'partial'
    }
  ];

  for (const sample of samplePilots) {
    const pilot = tracker.addPilot(sample.name, sample);

    // Record metrics for completed pilots
    if (sample.outcome) {
      tracker.recordMetrics(pilot.id, {
        efficiencyGain: sample.efficiencyGain || 0,
        userSatisfaction: sample.outcome === 'success' ? 4.5 : 3.5
      });

      tracker.recordResults(pilot.id, {
        outcome: sample.outcome,
        keyFindings: [`${sample.efficiencyGain}% efficiency improvement`, 'Positive user feedback'],
        nextSteps: ['Consider scaling', 'Document learnings']
      });

      // Create case studies for successful pilots
      if (sample.outcome === 'success') {
        pilot.roi.monthlyBenefit = Math.round(sample.costSavings / 12);
        tracker.createCaseStudy(pilot.id, {
          title: `Case Study: ${sample.name}`,
          summary: `Successfully implemented ${sample.name} with ${sample.efficiencyGain}% efficiency gains`,
          impact: `${sample.efficiencyGain}% efficiency improvement, $${sample.costSavings.toLocaleString()} annual savings`,
          lessons: [
            'AI works well for this use case',
            'Training was critical to adoption',
            'Clear ROI within first quarter'
          ]
        });
      }
    }
  }

  // Save pilots
  const dataDir = path.join(process.cwd(), 'data');
  fs.writeFileSync(
    path.join(dataDir, 'pilots.json'),
    JSON.stringify({ pilots: tracker.pilots, createdAt: tracker.createdAt }, null, 2)
  );
  console.log(chalk.green('✅ Sample pilots created'));

  // Create dashboard HTML
  const dashboardHtml = `<!DOCTYPE html>
<html>
<head>
  <title>AI Innovation Pilot Tracker</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .metric { background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .value { font-size: 24px; font-weight: bold; color: #2196F3; }
    .label { font-size: 12px; color: #999; margin-top: 5px; }
    .pilots { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
    .pilot-card { background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3; }
    h1 { margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 AI Innovation Pilot Tracker</h1>
      <p>Document all AI experiments: tools, pilots, results, ROI, case studies</p>
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="value">5</div>
        <div class="label">Total Pilots</div>
      </div>
      <div class="metric">
        <div class="value">3</div>
        <div class="label">Successful</div>
      </div>
      <div class="metric">
        <div class="value">2</div>
        <div class="label">Case Studies</div>
      </div>
      <div class="metric">
        <div class="value">52%</div>
        <div class="label">Avg ROI</div>
      </div>
    </div>

    <div style="margin-top: 40px; text-align: center; color: #999; font-size: 12px;">
      Run: npm run status | npm run report | npm run case-studies
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(
    path.join(process.cwd(), 'dashboard/index.html'),
    dashboardHtml
  );
  console.log(chalk.green('✅ Dashboard created'));

  console.log(chalk.bold.green('\n✅ Setup Complete!\n'));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  npm run pilots            # List all pilots'));
  console.log(chalk.gray('  npm run status            # View overall status'));
  console.log(chalk.gray('  npm run report            # Leadership report'));
  console.log(chalk.gray('  npm run case-studies      # View case studies'));
  console.log();
}

setup().catch(error => {
  console.error(chalk.red(`Setup failed: ${error.message}`));
  process.exit(1);
});

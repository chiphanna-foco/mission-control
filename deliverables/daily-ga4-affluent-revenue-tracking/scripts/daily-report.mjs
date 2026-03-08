#!/usr/bin/env node

/**
 * Daily Analytics Report Orchestrator
 * Combines GA4 metrics + Affluent revenue into unified daily report
 * 
 * Usage:
 *   node daily-report.mjs [--date YYYY-MM-DD]
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const OUTPUT_DIR = new URL('../data/analytics', import.meta.url).pathname;
const SCRIPTS_DIR = new URL('.', import.meta.url).pathname;

function getDateArg() {
  const arg = process.argv.find((a) => a.startsWith('--date='));
  if (arg) return arg.split('=')[1];
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

async function runScript(scriptName, dateArg) {
  try {
    console.log(`📌 Running ${scriptName}...`);
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    const cmd = `node ${scriptPath}`;
    
    const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
    
    if (stderr) console.warn(`⚠️ ${scriptName} warnings:`, stderr);
    console.log(`✅ ${scriptName} completed`);
    
    return true;
  } catch (error) {
    console.error(`❌ ${scriptName} failed:`, error.message);
    return false;
  }
}

function loadJSON(filename, defaultValue = null) {
  try {
    const filepath = path.join(OUTPUT_DIR, filename);
    if (!fs.existsSync(filepath)) return defaultValue;
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (error) {
    console.error(`⚠️ Failed to load ${filename}:`, error.message);
    return defaultValue;
  }
}

function createCombinedReport(date, ga4Data, affluentData) {
  const report = {
    date,
    generatedAt: new Date().toISOString(),
    gaMetrics: ga4Data || { error: 'GA4 data unavailable' },
    affluentRevenue: affluentData || { error: 'Affluent data unavailable' },
    summary: {
      traffic: ga4Data?.overall?.screenPageViews || 0,
      revenue: affluentData?.totals?.commissions || 0,
      networks: Object.keys(affluentData?.networks || {}).length,
    },
  };

  return report;
}

function saveReport(report) {
  try {
    const filename = `daily-analytics-${report.date}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    console.log(`\n✅ Report saved: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('❌ Failed to save report:', error.message);
    throw error;
  }
}

function printSummary(report) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     DAILY ANALYTICS REPORT              ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║ Date: ${report.date.padEnd(34)} ║`);
  console.log('├────────────────────────────────────────┤');
  console.log('║ GA4 Metrics:                           ║');

  if (report.gaMetrics.overall) {
    console.log(`║   • Sessions: ${(report.gaMetrics.overall.sessions || 0).toString().padEnd(27)} ║`);
    console.log(`║   • Pageviews: ${(report.gaMetrics.overall.screenPageViews || 0).toString().padEnd(26)} ║`);
    console.log(`║   • Users: ${(report.gaMetrics.overall.activeUsers || 0).toString().padEnd(30)} ║`);
  } else {
    console.log('║   [Not available]                      ║');
  }

  console.log('├────────────────────────────────────────┤');
  console.log('║ Affluent Revenue:                      ║');

  if (report.affluentRevenue.totals) {
    console.log(`║   • Revenue: $${(report.affluentRevenue.totals.commissions || 0).toFixed(2).padEnd(28)} ║`);
    console.log(`║   • Clicks: ${(report.affluentRevenue.totals.clicks || 0).toString().padEnd(28)} ║`);
    console.log(`║   • Networks: ${report.summary.networks.toString().padEnd(26)} ║`);
  } else {
    console.log('║   [Not available]                      ║');
  }

  console.log('╚════════════════════════════════════════╝\n');
}

async function main() {
  try {
    const date = getDateArg();
    console.log(`\n🚀 Starting Daily Analytics Report for ${date}\n`);

    // Run both data collection scripts
    const ga4Success = await runScript('ga4-pull.mjs', date);
    const affluentSuccess = await runScript('affluent-parser.mjs', date);

    // Load results
    const ga4Filename = `ga4-metrics-${date}.json`;
    const affluentFilename = `affluent-revenue-${date}.json`;

    const ga4Data = loadJSON(ga4Filename);
    const affluentData = loadJSON(affluentFilename);

    // Create combined report
    console.log('\n📊 Creating combined report...');
    const report = createCombinedReport(date, ga4Data, affluentData);
    saveReport(report);

    // Print summary
    printSummary(report);

    // Exit status
    if (!ga4Success || !affluentSuccess) {
      console.log('⚠️ Some data collection steps failed. Review logs above.');
      process.exit(1);
    }

    console.log('✅ Daily analytics report complete');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

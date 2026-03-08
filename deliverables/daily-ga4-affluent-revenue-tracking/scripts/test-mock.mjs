#!/usr/bin/env node

/**
 * Test/Mock Data Generator
 * Creates sample GA4 and Affluent data for testing the pipeline
 * 
 * Usage:
 *   node scripts/test-mock.mjs [--date YYYY-MM-DD]
 */

import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = new URL('../data/analytics', import.meta.url).pathname;

function getDateArg() {
  const arg = process.argv.find((a) => a.startsWith('--date='));
  if (arg) return arg.split('=')[1];
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

function generateMockGA4Data(date) {
  return {
    date,
    timestamp: new Date().toISOString(),
    overall: {
      activeUsers: Math.floor(Math.random() * 500) + 100,
      newUsers: Math.floor(Math.random() * 200) + 30,
      sessions: Math.floor(Math.random() * 1000) + 200,
      screenPageViews: Math.floor(Math.random() * 5000) + 800,
    },
    topPages: [
      {
        title: 'Best Gaming Laptops 2026',
        path: '/best-gaming-laptops/',
        pageviews: Math.floor(Math.random() * 500) + 100,
      },
      {
        title: 'Amazon Echo Setup Guide',
        path: '/amazon-echo-setup/',
        pageviews: Math.floor(Math.random() * 300) + 50,
      },
      {
        title: 'Budget Smartphones Comparison',
        path: '/budget-phones-2026/',
        pageviews: Math.floor(Math.random() * 250) + 40,
      },
      {
        title: 'Wireless Earbuds Review',
        path: '/wireless-earbuds-review/',
        pageviews: Math.floor(Math.random() * 200) + 30,
      },
      {
        title: 'MacBook Pro vs Windows',
        path: '/macbook-vs-windows/',
        pageviews: Math.floor(Math.random() * 180) + 25,
      },
    ],
    topReferrers: [
      {
        source: 'google',
        medium: 'organic',
        pageviews: Math.floor(Math.random() * 2000) + 500,
        sessions: Math.floor(Math.random() * 1500) + 400,
      },
      {
        source: 'reddit.com',
        medium: 'referral',
        pageviews: Math.floor(Math.random() * 300) + 50,
        sessions: Math.floor(Math.random() * 250) + 40,
      },
      {
        source: 'twitter.com',
        medium: 'social',
        pageviews: Math.floor(Math.random() * 200) + 30,
        sessions: Math.floor(Math.random() * 150) + 20,
      },
      {
        source: 'direct',
        medium: 'direct',
        pageviews: Math.floor(Math.random() * 400) + 80,
        sessions: Math.floor(Math.random() * 350) + 70,
      },
    ],
  };
}

function generateMockAffluenceData(date) {
  return {
    date,
    timestamp: new Date().toISOString(),
    networks: {
      'Amazon Associates': {
        emails: [
          {
            date: new Date(new Date(date) - 2 * 3600000).toISOString(),
            clicks: Math.floor(Math.random() * 500) + 100,
            commissions: parseFloat((Math.random() * 50 + 10).toFixed(2)),
          },
        ],
        totals: {
          clicks: Math.floor(Math.random() * 500) + 100,
          commissions: parseFloat((Math.random() * 50 + 10).toFixed(2)),
        },
      },
      ShareASale: {
        emails: [
          {
            date: new Date(new Date(date) - 5 * 3600000).toISOString(),
            clicks: Math.floor(Math.random() * 200) + 40,
            commissions: parseFloat((Math.random() * 20 + 5).toFixed(2)),
          },
        ],
        totals: {
          clicks: Math.floor(Math.random() * 200) + 40,
          commissions: parseFloat((Math.random() * 20 + 5).toFixed(2)),
        },
      },
      Impact: {
        emails: [
          {
            date: new Date(new Date(date) - 8 * 3600000).toISOString(),
            clicks: Math.floor(Math.random() * 150) + 30,
            commissions: parseFloat((Math.random() * 15 + 3).toFixed(2)),
          },
        ],
        totals: {
          clicks: Math.floor(Math.random() * 150) + 30,
          commissions: parseFloat((Math.random() * 15 + 3).toFixed(2)),
        },
      },
    },
    totals: {
      clicks: 0,
      commissions: 0,
      sales: Math.floor(Math.random() * 20) + 5,
    },
    rawEmails: [
      {
        id: 'email-1',
        from: 'associates-noreply@amazon.com',
        subject: 'Your Associates Report',
        date: new Date(new Date(date) - 2 * 3600000).toISOString(),
        network: 'Amazon Associates',
      },
      {
        id: 'email-2',
        from: 'report@shareasale.com',
        subject: 'ShareASale Daily Report',
        date: new Date(new Date(date) - 5 * 3600000).toISOString(),
        network: 'ShareASale',
      },
      {
        id: 'email-3',
        from: 'reports@impact.com',
        subject: 'Impact Daily Performance Report',
        date: new Date(new Date(date) - 8 * 3600000).toISOString(),
        network: 'Impact',
      },
    ],
  };
}

function saveData(data, filename) {
  try {
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    return filepath;
  } catch (error) {
    console.error(`Failed to save ${filename}:`, error.message);
    throw error;
  }
}

async function main() {
  try {
    const date = getDateArg();
    console.log(`\n🧪 Generating mock data for ${date}\n`);

    // Generate mock GA4 data
    const ga4Data = generateMockGA4Data(date);
    const ga4Path = saveData(ga4Data, `ga4-metrics-${date}.json`);
    console.log(`✅ Mock GA4 data: ${ga4Path}`);

    // Generate mock Affluent data
    const affluentData = generateMockAffluenceData(date);
    affluentData.totals.clicks = Object.values(affluentData.networks).reduce(
      (sum, n) => sum + (n.totals?.clicks || 0),
      0
    );
    affluentData.totals.commissions = parseFloat(
      Object.values(affluentData.networks)
        .reduce((sum, n) => sum + (n.totals?.commissions || 0), 0)
        .toFixed(2)
    );

    const affluentPath = saveData(affluentData, `affluent-revenue-${date}.json`);
    console.log(`✅ Mock Affluent data: ${affluentPath}`);

    // Create combined report
    const report = {
      date,
      generatedAt: new Date().toISOString(),
      gaMetrics: ga4Data,
      affluentRevenue: affluentData,
      summary: {
        traffic: ga4Data.overall.screenPageViews,
        revenue: affluentData.totals.commissions,
        networks: Object.keys(affluentData.networks).length,
      },
    };

    const reportPath = saveData(report, `daily-analytics-${date}.json`);
    console.log(`✅ Combined report: ${reportPath}`);

    // Print summary
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   MOCK ANALYTICS REPORT GENERATED       ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║ Date: ${date.padEnd(34)} ║`);
    console.log('├────────────────────────────────────────┤');
    console.log(`║ Traffic: ${ga4Data.overall.screenPageViews.toString().padEnd(30)} ║`);
    console.log(`║ Revenue: $${affluentData.totals.commissions.toFixed(2).padEnd(29)} ║`);
    console.log(`║ Networks: ${affluentData.totals.sales.toString().padEnd(29)} ║`);
    console.log('╚════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

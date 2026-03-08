#!/usr/bin/env node

/**
 * Affluent Email Parser
 * Extracts affiliate revenue data from network emails
 * 
 * Supported networks:
 * - Amazon Associates
 * - ShareASale
 * - Impact
 * - CJ Affiliate
 * - Rakuten Advertising
 * - Other configured networks
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const OUTPUT_DIR = new URL('../data/analytics', import.meta.url).pathname;

// Affiliate network email patterns
const NETWORKS = {
  amazon: {
    label: 'Amazon Associates',
    from: 'associates-noreply@amazon.com',
    patterns: {
      clicks: /Clicks:\s*(\d+)/i,
      commissions: /Earnings:\s*\$?([\d,]+\.?\d*)/i,
      impressions: /Impressions:\s*(\d+)/i,
    },
  },
  shareasale: {
    label: 'ShareASale',
    from: 'sharesale.com',
    patterns: {
      clicks: /(?:Clicks|Click):\s*(\d+)/i,
      commissions: /(?:Commission|Earnings):\s*\$?([\d,]+\.?\d*)/i,
      sales: /Sales?:\s*(\d+)/i,
    },
  },
  impact: {
    label: 'Impact',
    from: 'impact.com',
    patterns: {
      clicks: /(?:Clicks|Click):\s*(\d+)/i,
      commissions: /(?:Commission|Earnings):\s*\$?([\d,]+\.?\d*)/i,
      conversions: /Conversions?:\s*(\d+)/i,
    },
  },
  cj: {
    label: 'CJ Affiliate',
    from: 'cj.com',
    patterns: {
      clicks: /(?:Clicks|Click):\s*(\d+)/i,
      commissions: /(?:Commission|Earnings):\s*\$?([\d,]+\.?\d*)/i,
      sales: /Sales?:\s*(\d+)/i,
    },
  },
  rakuten: {
    label: 'Rakuten Advertising',
    from: 'rakuten.com',
    patterns: {
      clicks: /(?:Clicks|Click):\s*(\d+)/i,
      commissions: /(?:Commission|Earnings):\s*\$?([\d,]+\.?\d*)/i,
    },
  },
};

async function fetchAffluenceEmails() {
  try {
    console.log('📧 Fetching affiliate network emails (past 24h)...');

    const query = Object.values(NETWORKS)
      .map((n) => `from:${n.from}`)
      .join(' OR ');

    const cmd = `gws gmail query "${query}" --format json --limit 50`;
    const { stdout } = await execAsync(cmd);
    const emails = JSON.parse(stdout);

    console.log(`✅ Found ${emails.length} affiliate emails`);
    return emails;
  } catch (error) {
    console.error('❌ Failed to fetch emails:', error.message);
    return [];
  }
}

async function parseEmailBody(emailId) {
  try {
    const cmd = `gws gmail read "${emailId}" --format json`;
    const { stdout } = await execAsync(cmd);
    const email = JSON.parse(stdout);
    return email.body || email.snippet || '';
  } catch (error) {
    console.error(`⚠️ Failed to read email ${emailId}:`, error.message);
    return '';
  }
}

function extractNetworkData(email, networkKey) {
  const network = NETWORKS[networkKey];
  const body = email.body || email.snippet || '';
  const data = { network: network.label };

  for (const [key, pattern] of Object.entries(network.patterns)) {
    const match = body.match(pattern);
    if (match) {
      const value = match[1].replace(/,/g, '');
      data[key] = isNaN(value) ? value : parseFloat(value);
    }
  }

  return data;
}

async function aggregateRevenue(emails) {
  try {
    console.log('💰 Parsing affiliate data...');

    const revenue = {
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      networks: {},
      totals: {
        clicks: 0,
        commissions: 0,
        sales: 0,
      },
      rawEmails: [],
    };

    for (const email of emails) {
      // Try each network pattern
      for (const [networkKey, network] of Object.entries(NETWORKS)) {
        if (email.from.toLowerCase().includes(network.from.toLowerCase())) {
          const body = await parseEmailBody(email.id);
          const data = extractNetworkData({ body, ...email }, networkKey);

          if (!revenue.networks[network.label]) {
            revenue.networks[network.label] = {
              emails: [],
              totals: { clicks: 0, commissions: 0, sales: 0 },
            };
          }

          revenue.networks[network.label].emails.push({
            date: email.date || new Date().toISOString(),
            ...data,
          });

          // Aggregate totals
          if (data.clicks) revenue.totals.clicks += data.clicks;
          if (data.commissions) revenue.totals.commissions += data.commissions;
          if (data.sales) revenue.totals.sales += data.sales;

          // Store raw email for reference
          revenue.rawEmails.push({
            id: email.id,
            from: email.from,
            subject: email.subject,
            date: email.date,
            network: network.label,
          });

          break; // Found matching network, move to next email
        }
      }
    }

    return revenue;
  } catch (error) {
    console.error('❌ Failed to parse revenue:', error.message);
    throw error;
  }
}

async function saveRevenue(revenue) {
  try {
    const filename = `affluent-revenue-${revenue.date}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(revenue, null, 2));

    console.log(`✅ Saved: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('❌ Failed to save revenue:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Affluent email parser...');
    const emails = await fetchAffluenceEmails();
    const revenue = await aggregateRevenue(emails);
    const filepath = await saveRevenue(revenue);

    console.log('✅ Affluent parsing complete');
    console.log('\n📊 Summary:');
    console.log(`   Total clicks: ${revenue.totals.clicks}`);
    console.log(`   Total commissions: $${revenue.totals.commissions}`);
    console.log(`   Networks: ${Object.keys(revenue.networks).join(', ') || 'none'}`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

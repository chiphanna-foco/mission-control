#!/usr/bin/env node

/**
 * GA4 Data Pull Script
 * Extracts daily metrics from Google Analytics 4
 * 
 * Requirements:
 * - Google Analytics API credentials (GOOGLE_APPLICATION_CREDENTIALS env var)
 * - GA4 Property ID for WeTried.it
 */

import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const PROPERTY_ID = 'properties/XXXXX'; // TODO: Set WeTried.it GA4 property ID
const OUTPUT_DIR = new URL('../data/analytics', import.meta.url).pathname;

async function initializeAnalytics() {
  try {
    // Use Application Default Credentials (from gws CLI setup)
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    return google.analyticsdata({
      version: 'v1beta',
      auth,
    });
  } catch (error) {
    console.error('❌ Failed to initialize GA4 API:', error.message);
    throw error;
  }
}

async function pullGA4Metrics(client) {
  try {
    console.log('📊 Pulling GA4 metrics...');

    // Date range: yesterday
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateStr = (date) => date.toISOString().split('T')[0];
    const startDate = dateStr(yesterday);
    const endDate = dateStr(yesterday);

    // Request 1: Overall metrics
    const metricsResponse = await client.properties.runReport({
      property: PROPERTY_ID,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
        ],
      },
    });

    // Request 2: Top pages
    const pagesResponse = await client.properties.runReport({
      property: PROPERTY_ID,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'screenPageViews' }],
        dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
        orderBys: [{ metric: { name: 'screenPageViews' }, desc: true }],
        limit: 10,
      },
    });

    // Request 3: Top referrers
    const referrersResponse = await client.properties.runReport({
      property: PROPERTY_ID,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        orderBys: [{ metric: { name: 'screenPageViews' }, desc: true }],
        limit: 10,
      },
    });

    // Parse metrics
    const metrics = {
      date: yesterday.toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      overall: {},
      topPages: [],
      topReferrers: [],
    };

    if (metricsResponse.data.rows?.length) {
      const row = metricsResponse.data.rows[0].metricValues;
      metrics.overall = {
        activeUsers: parseInt(row[0].value),
        newUsers: parseInt(row[1].value),
        sessions: parseInt(row[2].value),
        screenPageViews: parseInt(row[3].value),
      };
    }

    // Parse top pages
    if (pagesResponse.data.rows?.length) {
      metrics.topPages = pagesResponse.data.rows.map((row) => ({
        title: row.dimensionValues[0].value,
        path: row.dimensionValues[1].value,
        pageviews: parseInt(row.metricValues[0].value),
      }));
    }

    // Parse top referrers
    if (referrersResponse.data.rows?.length) {
      metrics.topReferrers = referrersResponse.data.rows.map((row) => ({
        source: row.dimensionValues[0].value,
        medium: row.dimensionValues[1].value,
        pageviews: parseInt(row.metricValues[0].value),
        sessions: parseInt(row.metricValues[1].value),
      }));
    }

    return metrics;
  } catch (error) {
    console.error('❌ Failed to pull GA4 metrics:', error.message);
    throw error;
  }
}

async function saveMetrics(metrics) {
  try {
    const filename = `ga4-metrics-${metrics.date}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(metrics, null, 2));

    console.log(`✅ Saved: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('❌ Failed to save metrics:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting GA4 data pull...');
    const client = await initializeAnalytics();
    const metrics = await pullGA4Metrics(client);
    const filepath = await saveMetrics(metrics);
    
    console.log('✅ GA4 data pull complete');
    console.log(JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

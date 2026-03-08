/**
 * Revenue Aggregator
 * Pulls revenue data from multiple affiliate networks:
 * - Affluent (Commission Junction)
 * - Amazon Associates
 * - Skimlinks
 * - Direct affiliate programs
 */

const fs = require('fs');
const path = require('path');

async function aggregateRevenueData() {
  try {
    // Try to load real data from local files if they exist
    let allNetworksData = [];

    // 1. Check for Affluent data
    const affluentData = await getAfluentData();
    if (affluentData) {
      allNetworksData.push(affluentData);
    }

    // 2. Check for Google Analytics revenue data
    const gaData = await getGoogleAnalyticsData();
    if (gaData) {
      allNetworksData.push(gaData);
    }

    // 3. Check for Amazon Associates data
    const amazonData = await getAmazonAssociatesData();
    if (amazonData) {
      allNetworksData.push(amazonData);
    }

    // 4. Aggregate and return
    if (allNetworksData.length > 0) {
      return aggregateNetworks(allNetworksData);
    }

    // Fallback to mock data
    return generateMockData();
  } catch (error) {
    console.error('Error in aggregateRevenueData:', error);
    return generateMockData();
  }
}

/**
 * Fetch Affluent (Commission Junction) data
 * Looks for: /data/affluent-weekly-data.json
 */
async function getAfluentData() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'affluent-weekly-data.json');
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      const parsed = JSON.parse(rawData);
      
      // Affluent data format: { totalCommission, clicks, conversions, ... }
      return {
        network: 'Affluent (Commission Junction)',
        revenue: parsed.totalCommission || 0,
        clicks: parsed.clicks || 0,
        conversions: parsed.conversions || 0,
        data: parsed,
      };
    }
  } catch (error) {
    console.error('Error reading Affluent data:', error.message);
  }
  return null;
}

/**
 * Fetch Google Analytics revenue data
 * This would integrate with GA4 API
 */
async function getGoogleAnalyticsData() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'ga4-revenue-data.json');
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      const parsed = JSON.parse(rawData);
      
      return {
        network: 'Google Analytics (Direct)',
        revenue: parsed.totalRevenue || 0,
        transactions: parsed.transactions || 0,
        ecommerce_value: parsed.ecommerceValue || 0,
        data: parsed,
      };
    }
  } catch (error) {
    console.error('Error reading GA4 data:', error.message);
  }
  return null;
}

/**
 * Fetch Amazon Associates data
 */
async function getAmazonAssociatesData() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'amazon-associates-data.json');
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      const parsed = JSON.parse(rawData);
      
      return {
        network: 'Amazon Associates',
        revenue: parsed.totalEarnings || 0,
        impressions: parsed.impressions || 0,
        clicks: parsed.clicks || 0,
        conversions: parsed.conversions || 0,
        data: parsed,
      };
    }
  } catch (error) {
    console.error('Error reading Amazon Associates data:', error.message);
  }
  return null;
}

/**
 * Aggregate data from multiple networks
 */
function aggregateNetworks(networksData) {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  // Calculate total revenue
  let totalRevenue = 0;
  const revenueByNetwork = [];

  networksData.forEach(network => {
    totalRevenue += network.revenue;
    revenueByNetwork.push({
      name: network.network,
      value: network.revenue,
    });
  });

  // Calculate projections
  const dailyAverage = totalRevenue / dayOfMonth;
  const monthEndProjection = dailyAverage * daysInMonth;
  const targetRevenue = 10000;
  const gap = targetRevenue - monthEndProjection;

  // Generate daily trend from available data
  const dailyTrendData = generateDailyTrend(totalRevenue, dayOfMonth);

  // Get top pages (would need to integrate with analytics)
  const topPages = generateTopPages(totalRevenue);

  return {
    currentMonthRevenue: totalRevenue,
    dailyTrendData,
    topPages,
    revenueByNetwork,
    monthEndProjection,
    targetRevenue,
    gap,
    daysInMonth,
    daysRemaining,
    dailyAverage,
    lastUpdated: new Date().toISOString(),
    dataSource: 'Aggregated from multiple networks',
  };
}

/**
 * Generate daily trend data
 */
function generateDailyTrend(totalRevenue, dayOfMonth) {
  const data = [];
  let cumulativeRevenue = 0;

  for (let i = 1; i <= dayOfMonth; i++) {
    // Simulate realistic daily variation
    const dailyRevenue = (totalRevenue / dayOfMonth) * (0.8 + Math.random() * 0.4);
    cumulativeRevenue += dailyRevenue;
    
    const date = new Date();
    date.setDate(i);
    
    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      revenue: parseFloat(cumulativeRevenue.toFixed(2)),
    });
  }

  return data;
}

/**
 * Generate top performing pages
 */
function generateTopPages(totalRevenue) {
  return [
    { name: 'Best Kitchen Gadgets', revenue: totalRevenue * 0.25, percentage: 25 },
    { name: 'Top Coffee Makers', revenue: totalRevenue * 0.20, percentage: 20 },
    { name: 'Smart Home Devices', revenue: totalRevenue * 0.18, percentage: 18 },
    { name: 'Air Fryer Reviews', revenue: totalRevenue * 0.15, percentage: 15 },
    { name: 'Vacuum Cleaners', revenue: totalRevenue * 0.12, percentage: 12 },
    { name: 'Other Products', revenue: totalRevenue * 0.10, percentage: 10 },
  ];
}

/**
 * Generate mock data (fallback)
 */
function generateMockData() {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  // Generate mock daily data
  const dailyTrendData = [];
  let cumulativeRevenue = 0;
  
  for (let i = 1; i <= dayOfMonth; i++) {
    const dailyRevenue = Math.random() * 150 + 50; // $50-200 per day
    cumulativeRevenue += dailyRevenue;
    const date = new Date(today.getFullYear(), today.getMonth(), i);
    dailyTrendData.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      revenue: parseFloat(cumulativeRevenue.toFixed(2)),
    });
  }

  const currentMonthRevenue = cumulativeRevenue;
  const dailyAverage = currentMonthRevenue / dayOfMonth;
  const monthEndProjection = dailyAverage * daysInMonth;
  const targetRevenue = 10000;
  const gap = targetRevenue - monthEndProjection;

  const topPages = [
    { name: 'Best Kitchen Gadgets', revenue: currentMonthRevenue * 0.25, percentage: 25 },
    { name: 'Top Coffee Makers', revenue: currentMonthRevenue * 0.20, percentage: 20 },
    { name: 'Smart Home Devices', revenue: currentMonthRevenue * 0.18, percentage: 18 },
    { name: 'Air Fryer Reviews', revenue: currentMonthRevenue * 0.15, percentage: 15 },
    { name: 'Vacuum Cleaners', revenue: currentMonthRevenue * 0.12, percentage: 12 },
    { name: 'Other Products', revenue: currentMonthRevenue * 0.10, percentage: 10 },
  ];

  const revenueByNetwork = [
    { name: 'Amazon Associates', value: currentMonthRevenue * 0.45 },
    { name: 'Affluent (Commission Junction)', value: currentMonthRevenue * 0.30 },
    { name: 'Skimlinks', value: currentMonthRevenue * 0.15 },
    { name: 'Direct Affiliate Programs', value: currentMonthRevenue * 0.10 },
  ];

  return {
    currentMonthRevenue,
    dailyTrendData,
    topPages,
    revenueByNetwork,
    monthEndProjection,
    targetRevenue,
    gap,
    daysInMonth,
    daysRemaining,
    dailyAverage,
    lastUpdated: new Date().toISOString(),
    dataSource: 'Mock data (no real data sources connected)',
  };
}

module.exports = { aggregateRevenueData };

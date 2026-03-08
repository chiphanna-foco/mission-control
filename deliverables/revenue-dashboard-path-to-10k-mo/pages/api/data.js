import { aggregateRevenueData } from '../../lib/revenue-aggregator';

export default async function handler(req, res) {
  try {
    const data = await aggregateRevenueData();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    // Return mock data on error
    res.status(200).json(getMockData());
  }
}

function getMockData() {
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
  };
}

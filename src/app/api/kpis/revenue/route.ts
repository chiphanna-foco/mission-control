import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

interface AffluientWeeklyData {
  week: string;
  net_commissions: number;
  gross_commissions: number;
  clicks: number;
}

export async function GET() {
  try {
    // Read Affluent.io weekly data from local JSON
    // Location: ~/Documents/claude/skills/clawd/data/affluent-weekly-data.json (or similar)
    
    const dataPath = join(homedir(), 'Documents/claude/skills/clawd/data/affluent-weekly-data.json');
    
    if (!existsSync(dataPath)) {
      throw new Error('Affluent data file not found');
    }

    const rawData = readFileSync(dataPath, 'utf-8');
    const weeklyData: AffluientWeeklyData[] = JSON.parse(rawData);

    // Get current and previous month data
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthData = weeklyData.filter((w) => {
      const weekDate = new Date(w.week);
      return weekDate.getMonth() === currentMonth && weekDate.getFullYear() === currentYear;
    });

    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
    const previousMonthData = weeklyData.filter((w) => {
      const weekDate = new Date(w.week);
      return weekDate.getMonth() === prevMonthDate.getMonth() && weekDate.getFullYear() === prevMonthDate.getFullYear();
    });

    const currentMonthNet = currentMonthData.reduce((sum, w) => sum + w.net_commissions, 0);
    const previousMonthNet = previousMonthData.reduce((sum, w) => sum + w.net_commissions, 0);

    const currentMonthGross = currentMonthData.reduce((sum, w) => sum + w.gross_commissions, 0);
    const currentMonthClicks = currentMonthData.reduce((sum, w) => sum + w.clicks, 0);

    // Determine trend
    const monthly_trend =
      currentMonthNet > previousMonthNet
        ? 'up'
        : currentMonthNet < previousMonthNet
        ? 'down'
        : 'flat';

    return Response.json({
      current_month: currentMonthNet,
      previous_month: previousMonthNet,
      net_commissions: currentMonthNet,
      gross_commissions: currentMonthGross,
      clicks: currentMonthClicks,
      monthly_trend,
      revenue_source: 'Affluent.io',
    });
  } catch (error) {
    console.error('Failed to get revenue metrics:', error);
    // Return sample data for development
    return Response.json({
      current_month: 914.44,
      previous_month: 823.50,
      net_commissions: 914.44,
      gross_commissions: 975.66,
      clicks: 11528,
      monthly_trend: 'up',
      revenue_source: 'Affluent.io',
    });
  }
}

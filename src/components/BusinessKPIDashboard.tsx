'use client';

import { useEffect, useState } from 'react';
import { Heart, TrendingUp, BarChart3, Users, AlertCircle, RefreshCw } from 'lucide-react';

interface HealthMetrics {
  heart_rate: number;
  steps: number;
  active_energy: number; // calories
  stand_hours: number;
  sleep_hours: number;
  weekly_trend: 'up' | 'down' | 'flat';
}

interface RevenueMetrics {
  current_month: number;
  previous_month: number;
  net_commissions: number;
  gross_commissions: number;
  clicks: number;
  monthly_trend: 'up' | 'down' | 'flat';
  revenue_source: string; // Affluent.io
}

interface TrafficMetrics {
  daily_sessions: number;
  daily_users: number;
  bounce_rate: number;
  avg_session_duration: number;
  traffic_source: string; // wetried.it
  weekly_trend: 'up' | 'down' | 'flat';
}

interface AudienceMetrics {
  gamebuzz_followers: number;
  follower_goal: number;
  progress_percent: number;
  daily_growth: number;
  engagement_rate: number;
}

export function BusinessKPIDashboard() {
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [revenue, setRevenue] = useState<RevenueMetrics | null>(null);
  const [traffic, setTraffic] = useState<TrafficMetrics | null>(null);
  const [audience, setAudience] = useState<AudienceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadKPIs = async () => {
    try {
      const [healthRes, revenueRes, trafficRes, audienceRes] = await Promise.all([
        fetch('/api/kpis/health'),
        fetch('/api/kpis/revenue'),
        fetch('/api/kpis/traffic'),
        fetch('/api/kpis/audience'),
      ]);

      if (healthRes.ok) setHealth(await healthRes.json());
      if (revenueRes.ok) setRevenue(await revenueRes.json());
      if (trafficRes.ok) setTraffic(await trafficRes.json());
      if (audienceRes.ok) setAudience(await audienceRes.json());

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKPIs();
    const interval = setInterval(loadKPIs, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const getTrendArrow = (trend: 'up' | 'down' | 'flat'): string => {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'flat'): string => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <RefreshCw className="w-8 h-8 text-mc-text-secondary" />
          </div>
          <p className="text-mc-text-secondary">Loading KPIs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-mc-accent" />
          <div>
            <h2 className="text-2xl font-bold">Business KPIs</h2>
            <p className="text-sm text-mc-text-secondary">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={loadKPIs}
          className="p-2 hover:bg-mc-bg-secondary rounded-lg transition-colors"
          title="Refresh KPIs"
        >
          <RefreshCw className="w-5 h-5 text-mc-text-secondary hover:text-mc-accent" />
        </button>
      </div>

      {/* Health Metrics */}
      <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-mc-text">Health (Apple Health)</h3>
          <span className={`text-sm ml-auto font-medium ${getTrendColor(health?.weekly_trend || 'flat')}`}>
            {getTrendArrow(health?.weekly_trend || 'flat')}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Heart Rate</p>
            <p className="text-2xl font-bold text-mc-accent">{health?.heart_rate || '—'}</p>
            <p className="text-xs text-mc-text-secondary">bpm</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Steps</p>
            <p className="text-2xl font-bold text-mc-accent">{health?.steps?.toLocaleString() || '—'}</p>
            <p className="text-xs text-mc-text-secondary">today</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Active Energy</p>
            <p className="text-2xl font-bold text-mc-accent">{health?.active_energy || '—'}</p>
            <p className="text-xs text-mc-text-secondary">kcal</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Stand Hours</p>
            <p className="text-2xl font-bold text-mc-accent">{health?.stand_hours || '—'}</p>
            <p className="text-xs text-mc-text-secondary">/12</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Sleep</p>
            <p className="text-2xl font-bold text-mc-accent">{health?.sleep_hours || '—'}</p>
            <p className="text-xs text-mc-text-secondary">hours</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Weekly Trend</p>
            <p className={`text-lg font-bold ${getTrendColor(health?.weekly_trend || 'flat')}`}>
              {health?.weekly_trend === 'up' ? '↑' : health?.weekly_trend === 'down' ? '↓' : '→'} {health?.weekly_trend}
            </p>
          </div>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-mc-text">Revenue (Affluent.io)</h3>
          <span className={`text-sm ml-auto font-medium ${getTrendColor(revenue?.monthly_trend || 'flat')}`}>
            {getTrendArrow(revenue?.monthly_trend || 'flat')}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">This Month</p>
            <p className="text-2xl font-bold text-green-500">${revenue?.current_month?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Last Month</p>
            <p className="text-lg font-bold text-mc-text">${revenue?.previous_month?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Month Change</p>
            <p className={`text-lg font-bold ${
              (revenue?.current_month || 0) > (revenue?.previous_month || 0)
                ? 'text-green-500'
                : 'text-red-500'
            }`}>
              {revenue?.current_month && revenue?.previous_month
                ? `${(((revenue.current_month - revenue.previous_month) / revenue.previous_month) * 100).toFixed(1)}%`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Net Commissions</p>
            <p className="text-2xl font-bold text-mc-accent">${revenue?.net_commissions?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Gross Commissions</p>
            <p className="text-lg font-bold text-mc-text">${revenue?.gross_commissions?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Clicks</p>
            <p className="text-2xl font-bold text-mc-accent">{revenue?.clicks?.toLocaleString() || '0'}</p>
          </div>
        </div>
      </div>

      {/* Traffic Metrics */}
      <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-mc-text">Traffic (Google Analytics)</h3>
          <span className={`text-sm ml-auto font-medium ${getTrendColor(traffic?.weekly_trend || 'flat')}`}>
            {getTrendArrow(traffic?.weekly_trend || 'flat')}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Daily Sessions</p>
            <p className="text-2xl font-bold text-mc-accent">{traffic?.daily_sessions?.toLocaleString() || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Daily Users</p>
            <p className="text-2xl font-bold text-mc-accent">{traffic?.daily_users?.toLocaleString() || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Bounce Rate</p>
            <p className="text-2xl font-bold text-mc-text">{traffic?.bounce_rate?.toFixed(1) || '—'}%</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Avg Duration</p>
            <p className="text-2xl font-bold text-mc-accent">{traffic?.avg_session_duration?.toFixed(0) || '—'}s</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Traffic Source</p>
            <p className="text-sm font-medium text-mc-text">{traffic?.traffic_source || 'wetried.it'}</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Weekly Trend</p>
            <p className={`text-lg font-bold ${getTrendColor(traffic?.weekly_trend || 'flat')}`}>
              {traffic?.weekly_trend === 'up' ? '↑' : traffic?.weekly_trend === 'down' ? '↓' : '→'} {traffic?.weekly_trend}
            </p>
          </div>
        </div>
      </div>

      {/* Audience / Growth Metrics */}
      <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-mc-text">Audience (GameBuzz Twitter)</h3>
        </div>
        <div className="space-y-6">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm text-mc-text-secondary">Progress to 1,000 Followers</p>
              <p className="text-lg font-bold text-mc-accent">{audience?.progress_percent?.toFixed(1)}%</p>
            </div>
            <div className="w-full bg-mc-bg rounded-full h-3">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                style={{ width: `${Math.min(audience?.progress_percent || 0, 100)}%` }}
              />
            </div>
            <p className="text-sm text-mc-text-secondary mt-2">
              {audience?.gamebuzz_followers || 0} / {audience?.follower_goal || 1000} followers
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-mc-text-secondary mb-1">Daily Growth</p>
              <p className={`text-2xl font-bold ${
                (audience?.daily_growth || 0) > 0 ? 'text-green-500' : 'text-mc-text'
              }`}>
                {audience?.daily_growth ? (audience.daily_growth > 0 ? '+' : '') : ''}
                {audience?.daily_growth || 0}
              </p>
              <p className="text-xs text-mc-text-secondary">followers/day</p>
            </div>
            <div>
              <p className="text-sm text-mc-text-secondary mb-1">Engagement Rate</p>
              <p className="text-2xl font-bold text-mc-accent">{audience?.engagement_rate?.toFixed(2) || '0.00'}%</p>
            </div>
          </div>

          <div className="bg-mc-bg rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-500 mb-1">Goal Status</p>
                <p className="text-sm text-mc-text-secondary">
                  {audience?.follower_goal && audience?.gamebuzz_followers
                    ? `${Math.ceil((audience.follower_goal - audience.gamebuzz_followers) / (audience.daily_growth || 1))} days to goal`
                    : 'Calculating...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

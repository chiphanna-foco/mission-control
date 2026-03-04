'use client';

import { useEffect, useState } from 'react';
import { Activity, Zap, TrendingUp, AlertCircle, RefreshCw, BarChart3 } from 'lucide-react';

interface SystemMetrics {
  disk_percent: number;
  memory_percent: number;
  cpu_percent: number;
  timestamp: number;
}

interface AgentMetrics {
  heartbeat_response_ms: number;
  last_check: number;
  status: 'healthy' | 'degraded' | 'offline';
}

interface TaskMetrics {
  total_tasks: number;
  avg_duration_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
}

interface ModelMetrics {
  model: string;
  requests_today: number;
  cost_cents: number;
  fallback_rate_percent: number;
}

interface CostMetrics {
  haiku_cost: number;
  sonnet_cost: number;
  opus_cost: number;
  gemini_cost: number;
  total_ytd: number;
}

export function PerformanceDashboard() {
  const [system, setSystem] = useState<SystemMetrics | null>(null);
  const [agent, setAgent] = useState<AgentMetrics | null>(null);
  const [tasks, setTasks] = useState<TaskMetrics | null>(null);
  const [models, setModels] = useState<ModelMetrics[]>([]);
  const [costs, setCosts] = useState<CostMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadMetrics = async () => {
    try {
      const [systemRes, agentRes, tasksRes, modelsRes, costsRes] = await Promise.all([
        fetch('/api/metrics/system'),
        fetch('/api/metrics/agent'),
        fetch('/api/metrics/tasks'),
        fetch('/api/metrics/models'),
        fetch('/api/metrics/costs'),
      ]);

      if (systemRes.ok) setSystem(await systemRes.json());
      if (agentRes.ok) setAgent(await agentRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (modelsRes.ok) setModels(await modelsRes.json());
      if (costsRes.ok) setCosts(await costsRes.json());
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getHealthStatus = (percent: number): 'healthy' | 'warning' | 'critical' => {
    if (percent < 70) return 'healthy';
    if (percent < 85) return 'warning';
    return 'critical';
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'healthy':
        return 'text-green-500 bg-green-500/10';
      case 'warning':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'critical':
        return 'text-red-500 bg-red-500/10';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <RefreshCw className="w-8 h-8 text-mc-text-secondary" />
          </div>
          <p className="text-mc-text-secondary">Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-mc-accent" />
          <div>
            <h2 className="text-2xl font-bold">Performance Dashboard</h2>
            <p className="text-sm text-mc-text-secondary">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={loadMetrics}
          className="p-2 hover:bg-mc-bg-secondary rounded-lg transition-colors"
          title="Refresh metrics"
        >
          <RefreshCw className="w-5 h-5 text-mc-text-secondary hover:text-mc-accent" />
        </button>
      </div>

      {/* System Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Disk Usage */}
        <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-mc-text">Disk Usage</h3>
            <Zap className={`w-5 h-5 ${getStatusColor(getHealthStatus(system?.disk_percent || 0))}`} />
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-mc-accent">
              {system?.disk_percent.toFixed(1)}%
            </div>
            <div className="w-full bg-mc-bg rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  getHealthStatus(system?.disk_percent || 0) === 'healthy'
                    ? 'bg-green-500'
                    : getHealthStatus(system?.disk_percent || 0) === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(system?.disk_percent || 0, 100)}%` }}
              />
            </div>
            <p className="text-xs text-mc-text-secondary">System storage</p>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-mc-text">Memory Usage</h3>
            <Zap className={`w-5 h-5 ${getStatusColor(getHealthStatus(system?.memory_percent || 0))}`} />
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-mc-accent">
              {system?.memory_percent.toFixed(1)}%
            </div>
            <div className="w-full bg-mc-bg rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  getHealthStatus(system?.memory_percent || 0) === 'healthy'
                    ? 'bg-green-500'
                    : getHealthStatus(system?.memory_percent || 0) === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(system?.memory_percent || 0, 100)}%` }}
              />
            </div>
            <p className="text-xs text-mc-text-secondary">RAM utilization</p>
          </div>
        </div>

        {/* CPU Usage */}
        <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-mc-text">CPU Usage</h3>
            <Zap className={`w-5 h-5 ${getStatusColor(getHealthStatus(system?.cpu_percent || 0))}`} />
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-mc-accent">
              {system?.cpu_percent.toFixed(1)}%
            </div>
            <div className="w-full bg-mc-bg rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  getHealthStatus(system?.cpu_percent || 0) === 'healthy'
                    ? 'bg-green-500'
                    : getHealthStatus(system?.cpu_percent || 0) === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(system?.cpu_percent || 0, 100)}%` }}
              />
            </div>
            <p className="text-xs text-mc-text-secondary">Processor load</p>
          </div>
        </div>
      </div>

      {/* Agent Health */}
      <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-mc-accent" />
          <h3 className="font-semibold text-mc-text">Agent Uptime</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Status</p>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              agent?.status === 'healthy'
                ? 'bg-green-500/10 text-green-500'
                : agent?.status === 'degraded'
                ? 'bg-yellow-500/10 text-yellow-500'
                : 'bg-red-500/10 text-red-500'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                agent?.status === 'healthy'
                  ? 'bg-green-500'
                  : agent?.status === 'degraded'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`} />
              {agent?.status.charAt(0).toUpperCase() + agent?.status.slice(1)}
            </div>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Response Time</p>
            <p className="text-2xl font-bold text-mc-accent">{agent?.heartbeat_response_ms}ms</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-1">Last Check</p>
            <p className="text-sm">
              {agent?.last_check
                ? new Date(agent.last_check).toLocaleTimeString()
                : 'Never'}
            </p>
          </div>
        </div>
      </div>

      {/* Task Execution Metrics */}
      <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-mc-accent" />
          <h3 className="font-semibold text-mc-text">Task Execution</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-mc-text-secondary mb-2">Total Tasks</p>
            <p className="text-3xl font-bold text-mc-accent">{tasks?.total_tasks || 0}</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-2">Avg Duration</p>
            <p className="text-lg font-bold">{tasks?.avg_duration_ms?.toFixed(0) || 0}ms</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-2">P50 Latency</p>
            <p className="text-lg font-bold">{tasks?.p50_latency_ms?.toFixed(0) || 0}ms</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-2">P95 Latency</p>
            <p className="text-lg font-bold text-yellow-500">{tasks?.p95_latency_ms?.toFixed(0) || 0}ms</p>
          </div>
        </div>
      </div>

      {/* Model Routing */}
      <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-mc-accent" />
          <h3 className="font-semibold text-mc-text">Model Routing</h3>
        </div>
        <div className="space-y-4">
          {models.length === 0 ? (
            <p className="text-mc-text-secondary text-sm">No model data available</p>
          ) : (
            models.map((model) => (
              <div key={model.model} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{model.model}</p>
                    <span className="px-2 py-1 bg-mc-bg rounded text-xs text-mc-text-secondary">
                      {model.requests_today} requests
                    </span>
                  </div>
                  <p className="text-xs text-mc-text-secondary">
                    Fallback rate: {model.fallback_rate_percent.toFixed(1)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-mc-accent">${(model.cost_cents / 100).toFixed(3)}</p>
                  <p className="text-xs text-mc-text-secondary">Today</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cost Tracker */}
      <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-mc-accent" />
          <h3 className="font-semibold text-mc-text">Cost Tracker (YTD)</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-mc-text-secondary mb-2">Haiku</p>
            <p className="text-2xl font-bold">${costs?.haiku_cost?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-2">Sonnet</p>
            <p className="text-2xl font-bold">${costs?.sonnet_cost?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-2">Opus</p>
            <p className="text-2xl font-bold">${costs?.opus_cost?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm text-mc-text-secondary mb-2">Gemini</p>
            <p className="text-2xl font-bold">${costs?.gemini_cost?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-mc-bg rounded-lg p-4">
            <p className="text-sm text-mc-text-secondary mb-2">Total YTD</p>
            <p className="text-3xl font-bold text-mc-accent">${costs?.total_ytd?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

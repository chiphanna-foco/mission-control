'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCcw, Sparkles, Wand2 } from 'lucide-react';

interface ContentObservabilityData {
  pipeline: {
    statusCounts: Array<{ status: string; count: number }>;
    createdLast7d: number;
    completedLast7d: number;
    publishRate: number;
  };
  freshness: {
    staleCount: number;
    staleTasks: Array<{ id: string; title: string; status: string; age_days: number }>;
  };
  quality: {
    score: number;
    tasksWithDeliverables: number;
    totalTasks: number;
  };
  alerts: Array<{ id: string; title: string; status: string; hasDeliverable: number; signalType: 'overdue' | 'stale' }>;
}

export function ContentObservabilityPanel({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<ContentObservabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingFromAlertId, setCreatingFromAlertId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/content-observability?workspace_id=${workspaceId}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Failed to load content observability:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const createTaskFromSignal = async (alertTaskId: string, signalType: 'overdue' | 'stale') => {
    setCreatingFromAlertId(alertTaskId);
    try {
      const res = await fetch('/api/content-observability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, alertTaskId, signalType }),
      });

      if (!res.ok) {
        throw new Error('Failed to create signal task');
      }

      await load();
    } catch (error) {
      console.error(error);
      alert('Could not create task from signal.');
    } finally {
      setCreatingFromAlertId(null);
    }
  };

  const activePipeline = useMemo(() => {
    if (!data) return 0;
    const activeStatuses = new Set(['planning', 'inbox', 'assigned', 'in_progress', 'testing', 'review']);
    return data.pipeline.statusCounts
      .filter((row) => activeStatuses.has(row.status))
      .reduce((sum, row) => sum + row.count, 0);
  }, [data]);

  if (loading) {
    return (
      <div className="mx-3 mt-3 rounded-lg border border-mc-border bg-mc-bg-secondary p-4 text-sm text-mc-text-secondary">
        Loading Content Observability...
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section className="mx-3 mt-3 rounded-lg border border-mc-border bg-mc-bg-secondary p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-mc-accent" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">Content Observability</h3>
        </div>
        <button
          onClick={() => void load()}
          className="rounded p-1.5 text-mc-text-secondary hover:bg-mc-bg-tertiary hover:text-mc-text"
          title="Refresh"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Activity className="h-4 w-4 text-mc-accent-cyan" />} label="Pipeline Active" value={String(activePipeline)} detail={`${data.pipeline.createdLast7d} created / 7d`} />
        <MetricCard icon={<CheckCircle2 className="h-4 w-4 text-mc-accent-green" />} label="Completion Velocity" value={`${data.pipeline.publishRate}%`} detail={`${data.pipeline.completedLast7d} completed / 7d`} />
        <MetricCard icon={<Clock3 className="h-4 w-4 text-mc-accent-yellow" />} label="Stale Content" value={String(data.freshness.staleCount)} detail={data.freshness.staleCount > 0 ? 'Needs refresh pass' : 'No stale tasks'} />
        <MetricCard icon={<Sparkles className="h-4 w-4 text-mc-accent-purple" />} label="Quality Score" value={`${data.quality.score}`} detail={`${data.quality.tasksWithDeliverables}/${Math.max(data.quality.totalTasks, 1)} with deliverables`} />
      </div>

      {data.alerts.length > 0 && (
        <div className="mt-3 rounded-md border border-mc-accent-red/30 bg-mc-accent-red/10 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-mc-accent-red">
            <AlertTriangle className="h-4 w-4" />
            Alerts ({data.alerts.length})
          </div>
          <ul className="space-y-2">
            {data.alerts.slice(0, 4).map((alert) => (
              <li key={alert.id} className="flex items-center justify-between gap-2 rounded border border-mc-border/40 bg-mc-bg/40 p-2 text-xs text-mc-text-secondary">
                <div>
                  <span className="text-mc-text">{alert.title}</span> · {alert.status.replace('_', ' ')}
                  {alert.hasDeliverable ? '' : ' · no deliverable yet'}
                </div>
                <button
                  onClick={() => void createTaskFromSignal(alert.id, alert.signalType)}
                  disabled={creatingFromAlertId === alert.id}
                  className="inline-flex items-center gap-1 rounded bg-mc-accent px-2 py-1 text-[11px] font-medium text-mc-bg hover:bg-mc-accent/90 disabled:opacity-60"
                  title="Create assigned task with due date + success metric"
                >
                  <Wand2 className="h-3 w-3" />
                  {creatingFromAlertId === alert.id ? 'Creating...' : 'Auto-Task'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md border border-mc-border/70 bg-mc-bg p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-mc-text-secondary">{label}</span>
        {icon}
      </div>
      <div className="text-xl font-semibold leading-none">{value}</div>
      <div className="mt-1 text-xs text-mc-text-secondary">{detail}</div>
    </div>
  );
}

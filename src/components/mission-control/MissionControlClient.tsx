'use client';

import { useCallback, useEffect, useState } from 'react';
import ExecutiveDashboardTab from '@/components/mission-control/ExecutiveDashboardTab';
import type {
  ActionItem,
  CalendarConflict,
  DigestEmail,
  MeetingBrief,
  PendingIntro,
  WeeklyMetricsPayload,
} from '@/lib/executive-data';

type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  note: string | null;
  lastUpdated: string | null;
};

type DigestResponse = {
  stalledEmails: DigestEmail[];
  pendingIntros: PendingIntro[];
  overdueTasks: ActionItem[];
  calendarConflicts: CalendarConflict[];
  notes?: string[];
};

type UpcomingResponse = {
  meetings: MeetingBrief[];
  live: boolean;
  note: string | null;
};

type ActionItemsResponse = {
  items: ActionItem[];
  live: boolean;
  note: string | null;
};

type MetricsResponse = {
  metrics: WeeklyMetricsPayload;
  note: string | null;
};

const tabs = [
  { id: 'overview', label: 'Mission Control', disabled: true },
  { id: 'executive', label: 'Executive Dashboard', disabled: false },
] as const;

async function getSection<T>(path: string, refresh: boolean): Promise<{ payload: T; note: string | null }> {
  const response = await fetch(`${path}${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.details ?? body.error ?? `Failed to fetch ${path}`);
  }

  const payload = (await response.json()) as T & { generatedAt?: string; note?: string | null; notes?: string[] };

  const note = Array.isArray(payload.notes)
    ? payload.notes.join(' | ')
    : (payload.note ?? null);

  return {
    payload,
    note,
  };
}

export default function MissionControlClient() {
  const [activeTab, setActiveTab] = useState<'overview' | 'executive'>('executive');

  const [digest, setDigest] = useState<ApiState<DigestResponse>>({
    data: null,
    loading: true,
    error: null,
    note: null,
    lastUpdated: null,
  });

  const [upcoming, setUpcoming] = useState<ApiState<UpcomingResponse>>({
    data: null,
    loading: true,
    error: null,
    note: null,
    lastUpdated: null,
  });

  const [actionItems, setActionItems] = useState<ApiState<ActionItemsResponse>>({
    data: null,
    loading: true,
    error: null,
    note: null,
    lastUpdated: null,
  });

  const [metrics, setMetrics] = useState<ApiState<MetricsResponse>>({
    data: null,
    loading: true,
    error: null,
    note: null,
    lastUpdated: null,
  });

  const loadDigest = useCallback(async (refresh: boolean) => {
    setDigest((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getSection<DigestResponse>('/api/executive-digest', refresh);
      setDigest({
        data: response.payload,
        loading: false,
        error: null,
        note: response.note,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      setDigest((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  const loadUpcoming = useCallback(async (refresh: boolean) => {
    setUpcoming((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getSection<UpcomingResponse>('/api/upcoming-meetings', refresh);
      setUpcoming({
        data: response.payload,
        loading: false,
        error: null,
        note: response.note,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      setUpcoming((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  const loadActionItems = useCallback(async (refresh: boolean) => {
    setActionItems((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getSection<ActionItemsResponse>('/api/action-items', refresh);
      setActionItems({
        data: response.payload,
        loading: false,
        error: null,
        note: response.note,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      setActionItems((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  const loadMetrics = useCallback(async (refresh: boolean) => {
    setMetrics((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getSection<MetricsResponse>('/api/weekly-metrics', refresh);
      setMetrics({
        data: response.payload,
        loading: false,
        error: null,
        note: response.note,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      setMetrics((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  const loadAll = useCallback(async (refresh: boolean) => {
    await Promise.all([
      loadDigest(refresh),
      loadUpcoming(refresh),
      loadActionItems(refresh),
      loadMetrics(refresh),
    ]);
  }, [loadActionItems, loadDigest, loadMetrics, loadUpcoming]);

  useEffect(() => {
    void loadAll(false);
  }, [loadAll]);

  const globalLoading = digest.loading || upcoming.loading || actionItems.loading || metrics.loading;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">Mission Control</h1>
            <p className="text-sm text-stone-600">Chip&apos;s operating system for the week</p>
          </div>
          <button
            onClick={() => void loadAll(true)}
            disabled={globalLoading}
            className="px-4 py-2 rounded-xl bg-workshop-yellow text-white font-bold hover:bg-amber-500 disabled:opacity-50"
          >
            {globalLoading ? 'Refreshing...' : 'Refresh All'}
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-4 flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`px-4 py-2 rounded-xl text-sm font-bold border ${
                activeTab === tab.id
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-500 border-stone-200'
              } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-stone-400'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {activeTab !== 'executive' ? (
          <div className="rounded-2xl bg-white border border-stone-200 p-8 text-stone-600">
            Overview tab scaffolded. Switch to Executive Dashboard to view Lifedash.
          </div>
        ) : (
          <ExecutiveDashboardTab
            digest={digest}
            upcoming={upcoming}
            actionItems={actionItems}
            metrics={metrics}
            onRefreshDigest={() => void loadDigest(true)}
            onRefreshUpcoming={() => void loadUpcoming(true)}
            onRefreshActionItems={() => void loadActionItems(true)}
            onRefreshMetrics={() => void loadMetrics(true)}
          />
        )}
      </main>
    </div>
  );
}

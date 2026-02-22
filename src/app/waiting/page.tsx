'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, ChevronDown, ChevronUp, Check, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { Task, TaskActivity, TaskPriority } from '@/lib/types';

// DB stores UTC timestamps without Z suffix — append it so JS Date parses correctly
const utc = (ts: string) => new Date(ts.endsWith('Z') ? ts : ts + 'Z');

interface WaitingTask extends Task {
  activities?: TaskActivity[];
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const PRIORITY_STYLES: Record<TaskPriority, { dot: string; text: string; bg: string }> = {
  urgent: { dot: 'bg-mc-accent-red', text: 'text-mc-accent-red', bg: 'bg-mc-accent-red/10 border-mc-accent-red/30' },
  high: { dot: 'bg-mc-accent-yellow', text: 'text-mc-accent-yellow', bg: 'bg-mc-accent-yellow/10 border-mc-accent-yellow/30' },
  normal: { dot: 'bg-mc-accent', text: 'text-mc-accent', bg: 'bg-mc-accent/10 border-mc-accent/30' },
  low: { dot: 'bg-mc-text-secondary', text: 'text-mc-text-secondary', bg: 'bg-mc-bg-tertiary border-mc-border' },
};

export default function WaitingPage() {
  const [tasks, setTasks] = useState<WaitingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Record<string, TaskActivity[]>>({});
  const [markingDone, setMarkingDone] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);

  // Load tasks blocked on chip
  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const allTasks: Task[] = await res.json();
        const blocked = allTasks
          .filter((t) => t.blocked_on === 'chip' && t.status !== 'done')
          .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
        setTasks(blocked);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async (taskId: string) => {
    if (activities[taskId]) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities((prev) => ({ ...prev, [taskId]: data }));
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const handleExpand = (taskId: string) => {
    if (expandedId === taskId) {
      setExpandedId(null);
    } else {
      setExpandedId(taskId);
      loadActivities(taskId);
    }
  };

  const handleReply = async (task: WaitingTask) => {
    const text = replyText[task.id]?.trim();
    if (!text) return;
    setSubmittingReply(task.id);
    try {
      // Post as activity comment
      await fetch(`/api/tasks/${task.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: 'comment',
          message: `💬 Chip: ${text}`,
        }),
      });
      // Clear the reply input
      setReplyText((prev) => ({ ...prev, [task.id]: '' }));
      // Reload activities for this task
      const res = await fetch(`/api/tasks/${task.id}/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities((prev) => ({ ...prev, [task.id]: data }));
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSubmittingReply(null);
    }
  };

  const handleMarkDone = async (task: WaitingTask) => {
    setMarkingDone(task.id);
    try {
      // Determine appropriate status: if it was assigned/in_progress, go back to that
      const newStatus = task.status === 'inbox' || task.status === 'planning'
        ? 'assigned'
        : task.status;

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocked_on: null,
          blocked_reason: null,
          status: newStatus,
        }),
      });

      if (res.ok) {
        // Add activity comment
        await fetch(`/api/tasks/${task.id}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_type: 'comment',
            message: 'Unblocked by Chip via Waiting on Me view',
          }),
        });
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
      }
    } catch (error) {
      console.error('Failed to mark done:', error);
    } finally {
      setMarkingDone(null);
    }
  };

  // Group by priority
  const grouped = tasks.reduce<Record<string, WaitingTask[]>>((acc, task) => {
    const key = task.priority;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const priorityLabels: Record<string, string> = {
    urgent: 'URGENT',
    high: 'HIGH PRIORITY',
    normal: 'NORMAL',
    low: 'LOW PRIORITY',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-mc-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <p className="text-mc-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mc-bg pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-mc-bg-secondary border-b border-mc-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link
            href="/"
            className="p-2 hover:bg-mc-bg-tertiary rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-mc-accent-red" />
            <h1 className="text-base font-semibold">Waiting on Me</h1>
          </div>
          {tasks.length > 0 && (
            <span className="bg-mc-accent-red text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {tasks.length}
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-semibold mb-2">All clear!</h2>
            <p className="text-mc-text-secondary">
              Nothing is waiting on you right now.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {(['urgent', 'high', 'normal', 'low'] as TaskPriority[]).map((priority) => {
              const priorityTasks = grouped[priority];
              if (!priorityTasks || priorityTasks.length === 0) return null;

              return (
                <div key={priority}>
                  {/* Priority Group Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${PRIORITY_STYLES[priority].dot}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${PRIORITY_STYLES[priority].text}`}>
                      {priorityLabels[priority]} ({priorityTasks.length})
                    </span>
                  </div>

                  {/* Task Cards */}
                  <div className="space-y-2">
                    {priorityTasks.map((task) => {
                      const isExpanded = expandedId === task.id;
                      const taskActivities = activities[task.id];
                      const blockedDuration = formatDistanceToNow(utc(task.updated_at), { addSuffix: false });

                      return (
                        <div
                          key={task.id}
                          className={`bg-mc-bg-secondary border rounded-lg overflow-hidden transition-all ${
                            PRIORITY_STYLES[task.priority].bg
                          }`}
                        >
                          {/* Card Header - Tappable */}
                          <button
                            onClick={() => handleExpand(task.id)}
                            className="w-full text-left p-4 min-h-[44px]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium leading-snug mb-1.5">
                                  {task.title}
                                </h3>
                                {task.blocked_reason && (
                                  <p className="text-xs text-mc-accent-red/80 leading-relaxed">
                                    {task.blocked_reason}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-mc-text-secondary">
                                  <Clock className="w-3 h-3" />
                                  <span>Blocked for {blockedDuration}</span>
                                </div>
                              </div>
                              <div className="flex-shrink-0 mt-1">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-mc-text-secondary" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-mc-text-secondary" />
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-mc-border/50">
                              {/* Description */}
                              {task.description && (
                                <div className="mt-3 mb-4">
                                  <h4 className="text-xs font-medium text-mc-text-secondary uppercase tracking-wider mb-1.5">
                                    Description
                                  </h4>
                                  <p className="text-sm text-mc-text leading-relaxed whitespace-pre-wrap">
                                    {task.description}
                                  </p>
                                </div>
                              )}

                              {/* Task Info */}
                              <div className="flex flex-wrap gap-2 mb-4">
                                <span className={`text-xs px-2 py-1 rounded capitalize ${PRIORITY_STYLES[task.priority].text} ${PRIORITY_STYLES[task.priority].bg}`}>
                                  {task.priority}
                                </span>
                                <span className="text-xs px-2 py-1 rounded bg-mc-bg-tertiary text-mc-text-secondary capitalize">
                                  {task.status.replace('_', ' ')}
                                </span>
                              </div>

                              {/* Activity Log */}
                              <div className="mb-4">
                                <h4 className="text-xs font-medium text-mc-text-secondary uppercase tracking-wider mb-2">
                                  Activity Log
                                </h4>
                                {!taskActivities ? (
                                  <p className="text-xs text-mc-text-secondary">Loading...</p>
                                ) : taskActivities.length === 0 ? (
                                  <p className="text-xs text-mc-text-secondary">No activity yet</p>
                                ) : (
                                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {taskActivities.slice(0, 10).map((activity) => (
                                      <div
                                        key={activity.id}
                                        className="text-xs p-2 bg-mc-bg rounded border border-mc-border/50"
                                      >
                                        <p className="text-mc-text">{activity.message}</p>
                                        <span className="text-mc-text-secondary text-[10px]">
                                          {formatDistanceToNow(utc(activity.created_at), { addSuffix: true })}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Reply / Feedback */}
                              <div className="mb-3">
                                <h4 className="text-xs font-medium text-mc-text-secondary uppercase tracking-wider mb-2">
                                  Reply / Give Direction
                                </h4>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={replyText[task.id] || ''}
                                    onChange={(e) =>
                                      setReplyText((prev) => ({ ...prev, [task.id]: e.target.value }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleReply(task);
                                      }
                                    }}
                                    placeholder="Type feedback or instructions..."
                                    className="flex-1 bg-mc-bg border border-mc-border rounded-lg px-3 py-2.5 text-sm text-mc-text placeholder-mc-text-secondary focus:outline-none focus:border-mc-accent min-h-[44px]"
                                  />
                                  <button
                                    onClick={() => handleReply(task)}
                                    disabled={submittingReply === task.id || !replyText[task.id]?.trim()}
                                    className="px-4 py-2.5 bg-mc-accent text-mc-bg rounded-lg text-sm font-medium hover:bg-mc-accent/90 disabled:opacity-30 min-h-[44px] min-w-[44px] transition-colors"
                                  >
                                    {submittingReply === task.id ? '...' : 'Send'}
                                  </button>
                                </div>
                              </div>

                              {/* Mark as Done Button */}
                              <button
                                onClick={() => handleMarkDone(task)}
                                disabled={markingDone === task.id}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-mc-accent-green text-mc-bg rounded-lg text-sm font-medium hover:bg-mc-accent-green/90 disabled:opacity-50 min-h-[44px] transition-colors"
                              >
                                <Check className="w-4 h-4" />
                                {markingDone === task.id ? 'Unblocking...' : 'Mark as Done'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      <WaitingMobileNav count={tasks.length} />
    </div>
  );
}

function WaitingMobileNav({ count }: { count: number }) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-mc-bg-secondary border-t border-mc-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        <Link
          href="/"
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] px-3 py-2 rounded-lg transition-colors text-mc-text-secondary active:text-mc-text"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
          <span className="text-[10px] font-medium">Dashboard</span>
        </Link>

        <Link
          href="/waiting"
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] px-3 py-2 rounded-lg transition-colors text-mc-accent"
        >
          <div className="relative">
            <AlertTriangle className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-mc-accent-red text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                {count}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Waiting</span>
        </Link>

        <Link
          href="/"
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] px-3 py-2 rounded-lg transition-colors text-mc-text-secondary active:text-mc-text"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8" /><rect x="2" y="2" width="20" height="20" rx="2" /><path d="M2 12h20" /><path d="M12 2v20" />
          </svg>
          <span className="text-[10px] font-medium">Agents</span>
        </Link>
      </div>
    </nav>
  );
}

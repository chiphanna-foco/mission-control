'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Calendar, Mail, CheckCircle2, AlertTriangle, Zap, TrendingUp } from 'lucide-react';

interface DigestEmail {
  id: string;
  from: string;
  subject: string;
  snippet?: string;
  date: string;
  unread: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  calendar: 'personal' | 'work';
}

interface ExecutiveDigest {
  stalledEmails: DigestEmail[];
  pendingIntros: any[];
  overdueTasks: any[];
  calendarConflicts: any[];
  notes: string[];
  error?: string;
}

export default function ExecutiveDashboard() {
  const [digest, setDigest] = useState<ExecutiveDigest | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [digestLoading, setDigestLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    // Fetch digest
    fetch('/api/executive-digest')
      .then((res) => res.json())
      .then((data) => {
        setDigest(data);
        setDigestLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch digest:', err);
        setDigestLoading(false);
      });

    // Fetch calendar events
    fetch('/api/executive/upcoming')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setEvents(data.data);
        }
        setEventsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch calendar:', err);
        setEventsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!digestLoading && !eventsLoading) {
      setLoading(false);
    }
  }, [digestLoading, eventsLoading]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-mc-bg text-mc-text p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/mission-control"
              className="p-2 rounded-lg text-mc-text-secondary hover:bg-mc-bg-secondary transition-colors"
              title="Back to Mission Control"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">Executive Dashboard</h1>
          </div>
          <Link
            href="/mission-control"
            className="px-4 py-2 rounded-lg bg-mc-accent/20 text-mc-accent hover:bg-mc-accent/30 transition-colors text-sm font-medium"
          >
            → Mission Control
          </Link>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-4">
            <div className="text-sm text-mc-text-secondary mb-1">Unread Emails</div>
            <div className="text-2xl font-bold">{digest?.stalledEmails?.length || 0}</div>
          </div>
          <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-4">
            <div className="text-sm text-mc-text-secondary mb-1">Overdue Tasks</div>
            <div className="text-2xl font-bold">{digest?.overdueTasks?.length || 0}</div>
          </div>
          <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-4">
            <div className="text-sm text-mc-text-secondary mb-1">Upcoming Events</div>
            <div className="text-2xl font-bold">{events?.length || 0}</div>
          </div>
          <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-4">
            <div className="text-sm text-mc-text-secondary mb-1">Calendar Conflicts</div>
            <div className="text-2xl font-bold">{digest?.calendarConflicts?.length || 0}</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-8">
          {/* Left Column: Digest */}
          <div className="space-y-8">
            {/* Unread Emails */}
            <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold">Unread Emails</h2>
              </div>

              {digestLoading ? (
                <div className="text-mc-text-secondary animate-pulse">Loading emails...</div>
              ) : digest?.stalledEmails && digest.stalledEmails.length > 0 ? (
                <div className="space-y-3">
                  {digest.stalledEmails.map((email) => (
                    <div key={email.id} className="border border-mc-border/50 rounded p-3 hover:bg-mc-bg/50 transition-colors">
                      <div className="text-sm font-medium truncate">{email.subject}</div>
                      <div className="text-xs text-mc-text-secondary mt-1">{email.from}</div>
                      {email.snippet && <div className="text-xs text-mc-text-secondary mt-1 line-clamp-2">{email.snippet}</div>}
                      <div className="text-xs text-mc-text-secondary mt-2">{formatDate(email.date)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-mc-text-secondary text-center py-4">No unread emails</div>
              )}
            </div>

            {/* Overdue Tasks */}
            <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h2 className="text-lg font-bold">Overdue Tasks</h2>
              </div>

              {digest?.overdueTasks && digest.overdueTasks.length > 0 ? (
                <div className="space-y-3">
                  {digest.overdueTasks.map((task) => (
                    <div key={task.id} className="border border-red-500/30 bg-red-500/10 rounded p-3">
                      <div className="text-sm font-medium">{task.title}</div>
                      <div className="text-xs text-mc-text-secondary mt-1">Status: {task.status}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-mc-text-secondary text-center py-4">No overdue tasks</div>
              )}
            </div>
          </div>

          {/* Right Column: Calendar */}
          <div className="bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-bold">Upcoming Events (Next 48h)</h2>
            </div>

            {eventsLoading ? (
              <div className="text-mc-text-secondary animate-pulse">Loading calendar...</div>
            ) : events && events.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`border rounded p-3 transition-colors ${
                      event.calendar === 'work'
                        ? 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'
                        : 'border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{event.title}</div>
                        <div className="text-xs text-mc-text-secondary mt-1">
                          {formatDate(event.start)} – {formatDate(event.end)}
                        </div>
                        <div className="text-xs text-mc-text-secondary mt-1 uppercase tracking-wider opacity-70">
                          {event.calendar === 'work' ? '💼 Work' : '👤 Personal'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-mc-text-secondary text-center py-4">No upcoming events</div>
            )}
          </div>
        </div>

        {/* Trending Insights Section */}
        <div className="mt-8 bg-mc-bg-secondary border border-mc-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold">Trending Insights (Last 30 Days)</h2>
            </div>
          </div>
          <div className="text-sm text-mc-text-secondary space-y-3">
            <p>
              Real-time trending data from Reddit, X, YouTube, TikTok, Hacker News, and beyond.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-mc-bg/50 rounded p-3 border border-mc-border/50 text-center">
                <div className="text-xs text-amber-400 mb-1">📈 Trending Topics</div>
                <div className="text-xs text-mc-text-secondary">AI, startups, tools</div>
              </div>
              <div className="bg-mc-bg/50 rounded p-3 border border-mc-border/50 text-center">
                <div className="text-xs text-amber-400 mb-1">⭐ Top Recommendations</div>
                <div className="text-xs text-mc-text-secondary">Products, services</div>
              </div>
              <div className="bg-mc-bg/50 rounded p-3 border border-mc-border/50 text-center">
                <div className="text-xs text-amber-400 mb-1">💬 Hot Debates</div>
                <div className="text-xs text-mc-text-secondary">What people discuss</div>
              </div>
            </div>
            <p className="text-xs text-mc-text-secondary/70 mt-2">
              💡 Coming soon: Live trending data will appear here
            </p>
          </div>
        </div>

        {/* Notes Section */}
        {digest?.notes && digest.notes.length > 0 && (
          <div className="mt-8 bg-mc-bg-secondary border border-mc-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-medium">Status Notes</h3>
            </div>
            <div className="text-sm text-mc-text-secondary space-y-1">
              {digest.notes.map((note, i) => (
                <div key={i}>✓ {note}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

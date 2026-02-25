'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import type { ConversationEvent } from '@/lib/types';

interface EventRow extends ConversationEvent {
  task?: { id: string; status: string; title: string };
}

export default function ConversationsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [q, setQ] = useState('');
  const [channel, setChannel] = useState('');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (q.trim()) params.set('q', q.trim());
      if (channel.trim()) params.set('channel', channel.trim());
      const res = await fetch(`/api/conversations/events?${params.toString()}`);
      if (res.ok) {
        setEvents(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTask = async (eventId: string) => {
    setWorkingId(eventId);
    try {
      const res = await fetch(`/api/conversations/events/${eventId}/create-task`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace_id: 'default' }),
      });

      if (res.ok) {
        const data = await res.json();
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  linked_task_count: (e.linked_task_count || 0) + 1,
                  task: {
                    id: data.task.id,
                    title: data.task.title,
                    status: data.task.status,
                  },
                }
              : e
          )
        );
      }
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-mc-bg overflow-hidden">
      <Header />
      <div className="px-4 py-4 border-b border-mc-border bg-mc-bg-secondary">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold">Conversations</h1>
          <Link href="/" className="text-sm text-mc-accent hover:underline">Dashboard</Link>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search text…"
            className="px-3 py-2 bg-mc-bg border border-mc-border rounded text-sm"
          />
          <input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="channel (e.g. slack)"
            className="px-3 py-2 bg-mc-bg border border-mc-border rounded text-sm"
          />
          <button onClick={loadEvents} className="px-3 py-2 bg-mc-accent text-mc-bg rounded text-sm font-medium">Filter</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 pb-20 lg:pb-4">
        {loading ? (
          <div className="text-mc-text-secondary">Loading conversation events…</div>
        ) : events.length === 0 ? (
          <div className="text-mc-text-secondary">No conversation events found.</div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="border border-mc-border rounded p-3 bg-mc-bg-secondary">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-mc-text-secondary mb-1 flex gap-2 flex-wrap">
                      <span>{event.channel || 'unknown channel'}</span>
                      <span>•</span>
                      <span>{event.author || event.role || 'unknown author'}</span>
                      {event.ts ? (
                        <>
                          <span>•</span>
                          <span>{new Date(event.ts).toLocaleString()}</span>
                        </>
                      ) : null}
                      {event.is_task_candidate ? (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-mc-accent-red/20 text-mc-accent-red">Task Candidate</span>
                      ) : null}
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">{event.text || '(no message text)'}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      disabled={workingId === event.id}
                      onClick={() => createTask(event.id)}
                      className="px-3 py-1.5 rounded bg-mc-accent text-mc-bg text-xs font-semibold disabled:opacity-50"
                    >
                      {workingId === event.id ? 'Creating…' : 'Create Task'}
                    </button>
                    {(event.linked_task_count || 0) > 0 && (
                      <span className="text-xs text-mc-accent-green">{event.linked_task_count} linked</span>
                    )}
                    {event.task ? (
                      <Link href="/workspace/default" className="text-xs text-mc-accent hover:underline">
                        View task: {event.task.id.slice(0, 8)}… ({event.task.status})
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}

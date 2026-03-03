'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, Clock, Zap, CheckCircle2, AlertCircle, Bot, FileText, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type FeedFilter = 'all' | 'tasks' | 'agents' | 'system';

interface FeedItem {
  id: string;
  source: 'event' | 'activity';
  type: string;
  activity_type: string | null;
  message: string;
  metadata: string | null;
  created_at: string;
  task_id: string | null;
  task_title: string | null;
  agent_id: string | null;
  agent_name: string | null;
  agent_emoji: string | null;
}

const TASK_TYPES = new Set([
  'task_created', 'task_assigned', 'task_status_changed', 'task_completed',
  'task_dispatched', 'status_changed', 'completed', 'file_created',
]);

const AGENT_TYPES = new Set([
  'agent_joined', 'agent_status_changed', 'spawned',
]);

const SYSTEM_TYPES = new Set(['system', 'error', 'warning']);

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function getEventStyle(item: FeedItem): {
  icon: React.ReactNode;
  text: string;
  accent: string;
  borderColor: string;
} {
  const title = truncate(item.task_title || '', 35);
  const agentName = item.agent_name || item.agent_emoji || '';

  // Activity-sourced items
  if (item.source === 'activity') {
    switch (item.activity_type) {
      case 'spawned':
        return {
          icon: <Bot className="w-3.5 h-3.5" />,
          text: `${agentName ? agentName + ' → ' : ''}Agent dispatched to ${title}`,
          accent: 'text-blue-400',
          borderColor: 'border-blue-500/50',
        };
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          text: `${title} — completed`,
          accent: 'text-green-400',
          borderColor: 'border-green-500/50',
        };
      case 'status_changed': {
        let newStatus = '';
        if (item.metadata) {
          try {
            const meta = JSON.parse(item.metadata);
            newStatus = meta.new_status || meta.to || meta.status || '';
          } catch { /* ignore */ }
        }
        return {
          icon: <ArrowRight className="w-3.5 h-3.5" />,
          text: newStatus ? `${title} → ${newStatus}` : `${title} — updated`,
          accent: 'text-mc-text',
          borderColor: 'border-yellow-500/30',
        };
      }
      case 'file_created':
        return {
          icon: <FileText className="w-3.5 h-3.5" />,
          text: `📄 Deliverable ready: ${title}`,
          accent: 'text-purple-400',
          borderColor: 'border-purple-500/50',
        };
      default:
        return {
          icon: <Zap className="w-3.5 h-3.5" />,
          text: item.message,
          accent: 'text-mc-text-secondary',
          borderColor: 'border-transparent',
        };
    }
  }

  // Event-sourced items
  switch (item.type) {
    case 'task_created':
      return {
        icon: <span className="text-xs">📋</span>,
        text: `New: ${title}`,
        accent: 'text-mc-text',
        borderColor: 'border-mc-accent/30',
      };
    case 'task_assigned':
      return {
        icon: <span className="text-xs">👤</span>,
        text: `${title} → assigned${agentName ? ` to ${agentName}` : ''}`,
        accent: 'text-mc-text',
        borderColor: 'border-blue-500/30',
      };
    case 'task_dispatched':
      return {
        icon: <Bot className="w-3.5 h-3.5" />,
        text: item.message || `${title} — dispatched`,
        accent: 'text-blue-400',
        borderColor: 'border-blue-500/50',
      };
    case 'task_status_changed': {
      let newStatus = '';
      if (item.metadata) {
        try {
          const meta = JSON.parse(item.metadata);
          newStatus = meta.new_status || meta.to || meta.status || '';
        } catch { /* ignore */ }
      }
      return {
        icon: <ArrowRight className="w-3.5 h-3.5" />,
        text: newStatus ? `${title} → ${newStatus}` : `${title} — updated`,
        accent: 'text-mc-text',
        borderColor: 'border-yellow-500/30',
      };
    }
    case 'task_completed':
      return {
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        text: `✅ ${title} — done!`,
        accent: 'text-green-400',
        borderColor: 'border-green-500/50',
      };
    case 'agent_joined':
      return {
        icon: <Bot className="w-3.5 h-3.5" />,
        text: `Agent online: ${agentName}`,
        accent: 'text-blue-400',
        borderColor: 'border-blue-500/30',
      };
    case 'agent_status_changed':
      return {
        icon: <Bot className="w-3.5 h-3.5" />,
        text: item.message,
        accent: 'text-mc-text-secondary',
        borderColor: 'border-blue-500/20',
      };
    case 'error':
      return {
        icon: <AlertCircle className="w-3.5 h-3.5" />,
        text: item.message,
        accent: 'text-red-400',
        borderColor: 'border-red-500/50',
      };
    case 'system':
      return {
        icon: <span className="text-xs">⚙️</span>,
        text: item.message,
        accent: 'text-mc-text-secondary',
        borderColor: 'border-mc-border',
      };
    default:
      return {
        icon: <Zap className="w-3.5 h-3.5" />,
        text: item.message,
        accent: 'text-mc-text-secondary',
        borderColor: 'border-transparent',
      };
  }
}

export function LiveFeed() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [isPolling, setIsPolling] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const prevCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/events?limit=50');
      if (res.ok) {
        const data: FeedItem[] = await res.json();
        // Flash new items
        if (data.length > prevCountRef.current && prevCountRef.current > 0) {
          setNewCount(data.length - prevCountRef.current);
          setTimeout(() => setNewCount(0), 3000);
        }
        prevCountRef.current = data.length;
        setFeedItems(data);
        setIsPolling(true);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    intervalRef.current = setInterval(fetchFeed, 8_000); // Poll every 8s
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchFeed]);

  const filteredItems = feedItems.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'tasks') return TASK_TYPES.has(item.activity_type || item.type);
    if (filter === 'agents') return AGENT_TYPES.has(item.activity_type || item.type);
    if (filter === 'system') return SYSTEM_TYPES.has(item.type);
    return true;
  });

  const filterCounts = {
    all: feedItems.length,
    tasks: feedItems.filter(i => TASK_TYPES.has(i.activity_type || i.type)).length,
    agents: feedItems.filter(i => AGENT_TYPES.has(i.activity_type || i.type)).length,
    system: feedItems.filter(i => SYSTEM_TYPES.has(i.type)).length,
  };

  return (
    <aside className="hidden lg:flex w-80 bg-mc-bg-secondary border-l border-mc-border flex-col">
      {/* Header */}
      <div className="p-3 border-b border-mc-border">
        <div className="flex items-center gap-2 mb-3">
          <ChevronRight className="w-4 h-4 text-mc-text-secondary" />
          <span className="text-sm font-medium uppercase tracking-wider">Live Feed</span>
          {isPolling && (
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          )}
          {newCount > 0 && (
            <span className="ml-auto text-xs bg-mc-accent text-mc-bg px-1.5 py-0.5 rounded-full font-medium animate-pulse">
              +{newCount}
            </span>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1">
          {(['all', 'tasks', 'agents', 'system'] as FeedFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filter === tab
                  ? 'bg-mc-accent text-mc-bg font-medium'
                  : 'text-mc-text-secondary hover:bg-mc-bg-tertiary'
              }`}
            >
              {tab}
              {filterCounts[tab] > 0 && (
                <span className="ml-1 opacity-60">{filterCounts[tab]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-mc-text-secondary text-sm">
            No events yet
          </div>
        ) : (
          filteredItems.map((item, idx) => (
            <FeedEntry key={item.id} item={item} isNew={idx < newCount} />
          ))
        )}
      </div>
    </aside>
  );
}

function FeedEntry({ item, isNew }: { item: FeedItem; isNew?: boolean }) {
  const { icon, text, accent, borderColor } = getEventStyle(item);

  return (
    <div
      className={`p-2 rounded border-l-2 transition-all duration-300 ${borderColor} ${
        isNew ? 'bg-mc-bg-tertiary animate-pulse' : 'bg-transparent hover:bg-mc-bg-tertiary'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 ${accent}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${accent}`}>
            {text}
          </p>
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-mc-text-secondary opacity-70">
            <Clock className="w-3 h-3" />
            {(() => {
              try {
                const d = new Date(item.created_at.replace(' ', 'T'));
                return isNaN(d.getTime()) ? item.created_at : formatDistanceToNow(d, { addSuffix: true });
              } catch {
                return '';
              }
            })()}
            {item.agent_name && (
              <span className="ml-1">• {item.agent_emoji || '🤖'} {item.agent_name}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

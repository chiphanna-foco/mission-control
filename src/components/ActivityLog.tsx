/**
 * ActivityLog Component
 * Displays chronological activity log for a task with inline comments
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { Send } from 'lucide-react';
import type { TaskActivity, Task } from '@/lib/types';

interface ActivityLogProps {
  taskId: string;
  task?: Task;
}

export function ActivityLog({ taskId, task }: ActivityLogProps) {
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadActivities();
  }, [taskId]);

  // Poll for new activities every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadActivities();
    }, 5000);
    return () => clearInterval(interval);
  }, [taskId]);

  const loadActivities = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const postComment = async () => {
    if (!comment.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: 'comment',
          message: comment.trim(),
        }),
      });
      if (res.ok) {
        setComment('');
        loadActivities();
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      postComment();
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'spawned':
        return '🚀';
      case 'updated':
        return '✏️';
      case 'completed':
        return '✅';
      case 'file_created':
        return '📄';
      case 'status_changed':
        return '🔄';
      case 'comment':
        return '💬';
      default:
        return '📝';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 1 minute
    if (diff < 60000) {
      return 'just now';
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins} min${mins > 1 ? 's' : ''} ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // More than 24 hours
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-mc-text-secondary">Loading activities...</div>
      </div>
    );
  }

  const needsContext = task?.blocked_on ? (
    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-3">
      <p className="text-sm font-medium">What&apos;s needed</p>
      <p className="text-xs text-mc-text-secondary mt-1">
        {task.blocked_reason?.trim() || 'This task is marked blocked, but no reason has been added yet.'}
      </p>
    </div>
  ) : null;

  const commentBox = (
    <div className="p-3 bg-mc-bg rounded-lg border border-mc-border mb-3">
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment or note... (Enter to send)"
          rows={2}
          className="flex-1 bg-transparent text-sm resize-none focus:outline-none placeholder:text-mc-text-secondary/50"
        />
        <button
          onClick={postComment}
          disabled={!comment.trim() || posting}
          className="self-end p-2 rounded hover:bg-mc-bg-tertiary disabled:opacity-30 transition-colors"
        >
          <Send className="w-4 h-4 text-mc-accent" />
        </button>
      </div>
      <p className="text-xs text-mc-text-secondary mt-2">
        Feedback here is linked to this task and pings Clawdbot.
      </p>
    </div>
  );

  if (activities.length === 0) {
    return (
      <div>
        {needsContext}
        {commentBox}
        <div className="flex flex-col items-center justify-center py-8 text-mc-text-secondary">
          <div className="text-4xl mb-2">📝</div>
          <p>No activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {needsContext}
      {commentBox}
      <div className="flex items-center gap-2 mb-3 text-xs text-mc-text-secondary">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        Live
      </div>
      <div className="space-y-3">
      {activities.slice().sort((a, b) => {
        if (a.activity_type === 'comment' && b.activity_type !== 'comment') return -1;
        if (a.activity_type !== 'comment' && b.activity_type === 'comment') return 1;
        return 0;
      }).map((activity) => (
        <div
          key={activity.id}
          className={`flex gap-3 p-3 rounded-lg border ${
            activity.activity_type === 'comment'
              ? 'bg-mc-accent/5 border-mc-accent/20'
              : 'bg-mc-bg border-mc-border'
          }`}
        >
          {/* Icon */}
          <div className="text-2xl flex-shrink-0">
            {getActivityIcon(activity.activity_type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Agent info */}
            {activity.agent && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{activity.agent.avatar_emoji}</span>
                <span className="text-sm font-medium text-mc-text">
                  {activity.agent.name}
                </span>
              </div>
            )}

            {/* Message */}
            <p className="text-sm text-mc-text break-words">
              {activity.message}
            </p>

            {/* Metadata */}
            {activity.metadata && (
              <div className="mt-2 p-2 bg-mc-bg-tertiary rounded text-xs text-mc-text-secondary font-mono">
                {typeof activity.metadata === 'string' 
                  ? activity.metadata 
                  : JSON.stringify(JSON.parse(activity.metadata), null, 2)}
              </div>
            )}

            {/* Timestamp */}
            <div className="text-xs text-mc-text-secondary mt-2">
              {formatTimestamp(activity.created_at)}
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

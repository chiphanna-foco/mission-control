'use client';

import { useMissionControl } from '@/lib/store';
import { AlertTriangle, DollarSign, Link2, Clock } from 'lucide-react';
import type { Task } from '@/lib/types';

interface BlockedPanelProps {
  onTaskClick: (task: Task) => void;
}

const blockerIcons: Record<string, React.ReactNode> = {
  chip: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
  budget: <DollarSign className="w-3.5 h-3.5 text-yellow-400" />,
  dependency: <Link2 className="w-3.5 h-3.5 text-blue-400" />,
  external: <Clock className="w-3.5 h-3.5 text-purple-400" />,
};

const blockerLabels: Record<string, string> = {
  chip: '🚫 Waiting on Chip',
  budget: '💰 Needs Budget',
  dependency: '🔗 Dependency',
  external: '⏳ External',
};

export function BlockedPanel({ onTaskClick }: BlockedPanelProps) {
  const { tasks } = useMissionControl();
  const blockedTasks = tasks.filter((t) => t.blocked_on && t.status !== 'done');

  if (blockedTasks.length === 0) return null;

  // Group by blocker type
  const grouped = blockedTasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = task.blocked_on || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <div className="border-b border-mc-border bg-red-500/5">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-mc-border/50">
        <AlertTriangle className="w-4 h-4 text-red-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
          Blocked ({blockedTasks.length})
        </span>
      </div>
      <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
        {Object.entries(grouped).map(([blocker, tasks]) => (
          <div key={blocker}>
            <div className="flex items-center gap-1.5 px-2 py-1">
              {blockerIcons[blocker] || blockerIcons.external}
              <span className="text-[10px] font-medium text-mc-text-secondary uppercase">
                {blockerLabels[blocker] || blocker}
              </span>
            </div>
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-mc-bg-tertiary transition-colors group"
              >
                <div className="text-xs font-medium truncate group-hover:text-mc-accent">
                  {task.title}
                </div>
                {task.blocked_reason && (
                  <div className="text-[10px] text-mc-text-secondary truncate mt-0.5">
                    {task.blocked_reason}
                  </div>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

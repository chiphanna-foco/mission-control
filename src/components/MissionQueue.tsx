'use client';

import { useMemo, useState } from 'react';
import { Plus, ChevronRight, GripVertical, Pin, X } from 'lucide-react';
import { useMissionControl } from '@/lib/store';
import type { Task, TaskStatus } from '@/lib/types';
import { TaskModal } from './TaskModal';
import { ErrorBoundary } from './ErrorBoundary';
import { BlockedPanel } from './BlockedPanel';
import { formatDistanceToNow } from 'date-fns';

interface MissionQueueProps {
  workspaceId?: string;
}

const MAX_PRIORITIES = 3;

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'planning', label: '📋 PLANNING', color: 'border-t-mc-accent-purple' },
  { id: 'inbox', label: 'INBOX', color: 'border-t-mc-accent-pink' },
  { id: 'assigned', label: 'ASSIGNED', color: 'border-t-mc-accent-yellow' },
  { id: 'in_progress', label: 'IN PROGRESS', color: 'border-t-mc-accent' },
  { id: 'testing', label: 'TESTING', color: 'border-t-mc-accent-cyan' },
  { id: 'review', label: 'REVIEW', color: 'border-t-mc-accent-purple' },
  { id: 'done', label: 'DONE', color: 'border-t-mc-accent-green' },
  { id: 'someday', label: '💭 SOMEDAY', color: 'border-t-mc-text-secondary' },
];

export function MissionQueue({ workspaceId }: MissionQueueProps) {
  const { tasks, updateTaskStatus, updateTask, addTask, addEvent } = useMissionControl();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [priorityInput, setPriorityInput] = useState('');
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const [showSomedayColumn, setShowSomedayColumn] = useState(false);
  const [mobileShowPriorities, setMobileShowPriorities] = useState(false);

  const workspaceTasks = useMemo(
    () => tasks.filter((task) => !workspaceId || task.workspace_id === workspaceId),
    [tasks, workspaceId]
  );

  const priorityTasks = useMemo(
    () => workspaceTasks
      .filter((task) => task.is_priority_today && task.status !== 'done')
      .sort((a, b) => (a.priority_rank ?? 999) - (b.priority_rank ?? 999) ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, MAX_PRIORITIES),
    [workspaceTasks]
  );

  const getTasksByStatus = (status: TaskStatus) => {
    const filteredTasks = workspaceTasks.filter((task) => {
      if (task.status !== status || task.is_priority_today) return false;
      
      // For someday tasks, only show if not snoozed OR snooze period has passed
      if (status === 'someday' && task.snoozed_until) {
        return new Date(task.snoozed_until) <= new Date();
      }
      
      return true;
    });
    return filteredTasks;
  };

  // Get snoozed someday tasks that should remain hidden
  const getSnoozedTasks = () =>
    workspaceTasks.filter((task) => {
      if (task.status !== 'someday' || !task.snoozed_until) return false;
      return new Date(task.snoozed_until) > new Date();
    });

  const clearPriorityErrorSoon = () => {
    setTimeout(() => setPriorityError(null), 2200);
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const persistTaskPatch = async (taskId: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || 'Failed to update task');
    }

    return res.json();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === targetStatus) {
      setDraggedTask(null);
      return;
    }

    // If moving to someday, set snoozed_until to 30 days from now
    const patch: Record<string, unknown> = { status: targetStatus };
    if (targetStatus === 'someday') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      patch.snoozed_until = thirtyDaysFromNow.toISOString();
      patch.snooze_count = (draggedTask.snooze_count || 0) + 1;
    }

    // Optimistic update
    updateTaskStatus(draggedTask.id, targetStatus);

    // Persist to API
    try {
      const updated = await persistTaskPatch(draggedTask.id, patch);
      updateTask(updated);
      addEvent({
        id: crypto.randomUUID(),
        type: targetStatus === 'done' ? 'task_completed' : 'task_status_changed',
        task_id: draggedTask.id,
        message: `Task "${draggedTask.title}" moved to ${targetStatus}${targetStatus === 'someday' ? ' (30-day snooze activated)' : ''}`,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
      // Revert on error
      updateTaskStatus(draggedTask.id, draggedTask.status);
    }

    setDraggedTask(null);
  };

  const handleDropToPriorities = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTask) return;

    if (draggedTask.is_priority_today) {
      setDraggedTask(null);
      return;
    }

    if (priorityTasks.length >= MAX_PRIORITIES) {
      setPriorityError('Today\'s priorities are full (max 3).');
      clearPriorityErrorSoon();
      setDraggedTask(null);
      return;
    }

    const rank = priorityTasks.length + 1;
    const optimistic = { ...draggedTask, is_priority_today: 1, priority_rank: rank };
    updateTask(optimistic);

    try {
      const updated = await persistTaskPatch(draggedTask.id, {
        is_priority_today: 1,
        priority_rank: rank,
      });
      updateTask(updated);
    } catch (error) {
      console.error('Failed to pin task to priorities:', error);
      setPriorityError('Could not add that task to priorities.');
      clearPriorityErrorSoon();
      updateTask(draggedTask);
    }

    setDraggedTask(null);
  };

  const handleUnpinPriority = async (task: Task) => {
    const optimistic = { ...task, is_priority_today: 0, priority_rank: null };
    updateTask(optimistic);

    try {
      const updated = await persistTaskPatch(task.id, {
        is_priority_today: 0,
        priority_rank: null,
      });
      updateTask(updated);
    } catch (error) {
      console.error('Failed to remove priority:', error);
      setPriorityError('Could not remove priority.');
      clearPriorityErrorSoon();
      updateTask(task);
    }
  };

  const handleCreatePriority = async () => {
    const title = priorityInput.trim();
    if (!title) return;

    if (priorityTasks.length >= MAX_PRIORITIES) {
      setPriorityError('Today\'s priorities are full (max 3).');
      clearPriorityErrorSoon();
      return;
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          workspace_id: workspaceId || 'default',
          is_priority_today: 1,
          priority_rank: priorityTasks.length + 1,
          status: 'inbox',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to create priority');
      }

      const newTask = await res.json();
      addTask(newTask);
      setPriorityInput('');
    } catch (error) {
      console.error('Failed to create priority task:', error);
      setPriorityError('Could not create priority task.');
      clearPriorityErrorSoon();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-mc-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-mc-text-secondary" />
          <span className="text-sm font-medium uppercase tracking-wider">Mission Queue</span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-mc-accent-pink text-mc-bg rounded text-sm font-medium hover:bg-mc-accent-pink/90 min-h-[44px] lg:min-h-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Task</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Blocked Panel */}
      <BlockedPanel onTaskClick={(task) => setEditingTask(task)} />

      {/* Today's Priorities */}
      <div className="px-3 pt-3">
        <div
          className="bg-mc-bg-secondary border border-mc-border rounded-lg p-3"
          onDragOver={handleDragOver}
          onDrop={handleDropToPriorities}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileShowPriorities(!mobileShowPriorities)}
                className="lg:hidden p-1 hover:bg-mc-border rounded"
                title={mobileShowPriorities ? 'Collapse priorities' : 'Expand priorities'}
              >
                <ChevronRight className={`w-4 h-4 transition-transform ${mobileShowPriorities ? 'rotate-90' : ''}`} />
              </button>
              <Pin className="w-4 h-4 text-mc-accent-yellow" />
              <h3 className="text-sm font-semibold">Today&apos;s Priorities</h3>
            </div>
            <span className="text-xs text-mc-text-secondary">{priorityTasks.length}/{MAX_PRIORITIES}</span>
          </div>

          {(mobileShowPriorities || window.innerWidth >= 1024) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              {Array.from({ length: MAX_PRIORITIES }).map((_, index) => {
                const task = priorityTasks[index];
                if (!task) {
                  return (
                    <div
                      key={`priority-slot-${index}`}
                      className="h-20 rounded border border-dashed border-mc-border flex items-center justify-center text-xs text-mc-text-secondary"
                    >
                      Drop task here
                    </div>
                  );
                }

                return (
                  <div key={task.id} className="relative">
                    <TaskCard
                      task={task}
                      onDragStart={handleDragStart}
                      onClick={() => setEditingTask(task)}
                      isDragging={draggedTask?.id === task.id}
                      compact
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleUnpinPriority(task);
                      }}
                      className="absolute top-2 right-2 p-1 rounded bg-mc-bg-tertiary/80 hover:bg-mc-bg-tertiary"
                      title="Remove from today's priorities"
                    >
                      <X className="w-3.5 h-3.5 text-mc-text-secondary" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {(mobileShowPriorities || window.innerWidth >= 1024) && (
            <>
              <div className="flex items-center gap-2">
                <input
                  value={priorityInput}
                  onChange={(e) => setPriorityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleCreatePriority();
                    }
                  }}
                  placeholder="Add Priority..."
                  className="flex-1 bg-mc-bg border border-mc-border rounded px-3 py-2 text-sm focus:outline-none focus:border-mc-accent"
                />
                <button
                  onClick={() => void handleCreatePriority()}
                  className="px-3 py-2 text-sm rounded bg-mc-accent text-mc-bg font-medium hover:bg-mc-accent/90"
                >
                  Add
                </button>
              </div>

              {priorityError && (
                <p className="text-xs text-mc-accent-red mt-2">{priorityError}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Someday Toggle */}
      <div className="px-3 pb-2 flex gap-2">
        <button
          onClick={() => setShowSomedayColumn(!showSomedayColumn)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded bg-mc-bg-secondary border border-mc-border hover:bg-mc-border/50 text-mc-text-secondary"
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${showSomedayColumn ? 'rotate-90' : ''}`} />
          <span>💭 Someday {getSnoozedTasks().length > 0 ? `(${getSnoozedTasks().length} snoozed)` : '(show)'}</span>
        </button>
      </div>

      {/* Kanban Columns - horizontal scroll on desktop, vertical stack on mobile */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-y-auto lg:overflow-x-auto lg:overflow-y-hidden pb-20 lg:pb-3">
        {COLUMNS.filter(col => col.id !== 'someday' || showSomedayColumn).map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <div
              key={column.id}
              className={`lg:flex-1 lg:min-w-[220px] lg:max-w-[300px] flex flex-col bg-mc-bg rounded-lg border border-mc-border/50 border-t-2 ${column.color} ${
                columnTasks.length === 0 ? 'hidden lg:flex' : ''
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="p-2 border-b border-mc-border flex items-center justify-between">
                <span className="text-xs font-medium uppercase text-mc-text-secondary">
                  {column.label}
                </span>
                <span className="text-xs bg-mc-bg-tertiary px-2 py-0.5 rounded text-mc-text-secondary">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex-1 lg:overflow-y-auto p-2 space-y-2">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDragStart={handleDragStart}
                    onClick={() => setEditingTask(task)}
                    isDragging={draggedTask?.id === task.id}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <ErrorBoundary fallbackLabel="TaskModal">
          <TaskModal onClose={() => setShowCreateModal(false)} workspaceId={workspaceId} />
        </ErrorBoundary>
      )}
      {editingTask && (
        <ErrorBoundary fallbackLabel="TaskModal">
          <TaskModal task={editingTask} onClose={() => setEditingTask(null)} workspaceId={workspaceId} />
        </ErrorBoundary>
      )}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onClick: () => void;
  isDragging: boolean;
  compact?: boolean;
}

function TaskCard({ task, onDragStart, onClick, isDragging, compact = false }: TaskCardProps) {
  const priorityStyles = {
    low: 'text-mc-text-secondary',
    normal: 'text-mc-accent',
    high: 'text-mc-accent-yellow',
    urgent: 'text-mc-accent-red',
  };

  const priorityDots = {
    low: 'bg-mc-text-secondary/40',
    normal: 'bg-mc-accent',
    high: 'bg-mc-accent-yellow',
    urgent: 'bg-mc-accent-red',
  };

  const isPlanning = task.status === 'planning';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={onClick}
      className={`group bg-mc-bg-secondary border rounded-lg cursor-pointer transition-all hover:shadow-lg hover:shadow-black/20 min-h-[44px] ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isPlanning ? 'border-purple-500/40 hover:border-purple-500' : 'border-mc-border/50 hover:border-mc-accent/40'}`}
    >
      {/* Drag handle bar - hidden on touch devices */}
      {!compact && (
        <div className="hidden lg:flex items-center justify-center py-1.5 border-b border-mc-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-mc-text-secondary/50 cursor-grab" />
        </div>
      )}

      {/* Card content */}
      <div className={compact ? 'p-2.5' : 'p-3 lg:p-4'}>
        {/* Title */}
        <h4 className={`font-medium leading-snug line-clamp-2 ${compact ? 'text-xs mb-2' : 'text-sm mb-2 lg:mb-3'}`}>
          {task.title}
        </h4>

        {/* Planning mode indicator */}
        {isPlanning && !compact && (
          <div className="flex items-center gap-2 mb-2 lg:mb-3 py-2 px-3 bg-purple-500/10 rounded-md border border-purple-500/20">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse flex-shrink-0" />
            <span className="text-xs text-purple-400 font-medium">Continue planning</span>
          </div>
        )}

        {/* Blocked indicator */}
        {task.blocked_on && !compact && (
          <div className="flex items-center gap-2 mb-2 lg:mb-3 py-2 px-3 bg-red-500/10 rounded-md border border-red-500/20">
            <span className="text-xs">🚫</span>
            <span className="text-xs text-red-400 font-medium truncate">
              Waiting on {task.blocked_on === 'chip' ? 'Chip' : task.blocked_on}
            </span>
          </div>
        )}

        {/* Assigned agent */}
        {task.assigned_agent && !compact && (
          <div className="flex items-center gap-2 mb-2 lg:mb-3 py-1.5 px-2 bg-mc-bg-tertiary/50 rounded">
            <span className="text-base">{(task.assigned_agent as unknown as { avatar_emoji: string }).avatar_emoji}</span>
            <span className="text-xs text-mc-text-secondary truncate">
              {(task.assigned_agent as unknown as { name: string }).name}
            </span>
          </div>
        )}

        {/* Suggested next step */}
        {task.suggested_next_step && !task.blocked_on && !isPlanning && !compact && (
          <div className="flex items-center gap-2 mb-2 lg:mb-3 py-1.5 px-2 bg-mc-accent/5 rounded border border-mc-accent/15">
            <span className="text-[10px] leading-snug text-mc-text-secondary line-clamp-2">
              {task.suggested_next_step}
            </span>
          </div>
        )}

        {/* Footer: priority + timestamp */}
        <div className="flex items-center justify-between pt-2 border-t border-mc-border/20">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${priorityDots[task.priority]}`} />
            <span className={`text-xs capitalize ${priorityStyles[task.priority]}`}>
              {task.priority}
            </span>
          </div>
          {!compact && (
            <span className="text-[10px] text-mc-text-secondary/60">
              {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import type { ApprovalItem } from '@/lib/approval-queue';
import { ChevronRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ApprovalQueueWidgetProps {
  onRefresh?: () => void;
}

export function ApprovalQueueWidget({ onRefresh }: ApprovalQueueWidgetProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/approvals?limit=5');
      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.total);
        setItems(data.items);
      }
    } catch (error) {
      console.error('Failed to fetch approval items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/approvals/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'dashboard-user' }),
      });
      if (response.ok) {
        fetchItems();
        onRefresh?.();
      }
    } catch (error) {
      console.error('Failed to approve item:', error);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason (optional):');
    try {
      const response = await fetch(`/api/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedBy: 'dashboard-user', reason: reason || '' }),
      });
      if (response.ok) {
        fetchItems();
        onRefresh?.();
      }
    } catch (error) {
      console.error('Failed to reject item:', error);
    }
  };

  const typeColors = {
    email: 'bg-blue-100 text-blue-800',
    social: 'bg-purple-100 text-purple-800',
    blog: 'bg-green-100 text-green-800',
    content: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Approval Queue</h3>
              <p className="text-sm text-gray-600">
                {loading ? 'Loading...' : `${pendingCount} pending items`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full">
                {pendingCount}
              </span>
            )}
            <ChevronRight
              className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50">
          {loading ? (
            <div className="p-4 text-center text-gray-600">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-gray-600">No pending items</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {items.map((item) => (
                <div key={item.id} className="p-4 hover:bg-white transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            typeColors[item.type]
                          }`}
                        >
                          {item.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                        {item.title}
                      </h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{item.preview}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(item.id)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
                        title="Approve"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Reject"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {pendingCount > items.length && (
                <div className="p-4 text-center">
                  <a
                    href="/approvals"
                    className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    View all {pendingCount} pending items →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

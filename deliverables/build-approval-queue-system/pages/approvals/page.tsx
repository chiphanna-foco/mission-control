'use client';

import React, { useState, useEffect } from 'react';
import type { ApprovalItem } from '@/lib/approval-queue';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Eye, Copy } from 'lucide-react';

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const pageSize = 15;

  useEffect(() => {
    fetchItems(currentPage);
  }, [currentPage]);

  const fetchItems = async (page: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/approvals?page=${page}&limit=${pageSize}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
        setTotalPages(data.pages);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
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
        fetchItems(currentPage);
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedItem) return;
    try {
      const response = await fetch(`/api/approvals/${selectedItem.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedBy: 'dashboard-user', reason: rejectReason }),
      });
      if (response.ok) {
        setShowModal(false);
        setRejectReason('');
        fetchItems(currentPage);
      }
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const typeColors = {
    email: 'bg-blue-100 text-blue-800',
    social: 'bg-purple-100 text-purple-800',
    blog: 'bg-green-100 text-green-800',
    content: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Approval Queue</h1>
          <p className="text-gray-600">Review and approve pending content submissions</p>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-600">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-gray-600">
              <p className="mb-2">✨ All caught up!</p>
              <p className="text-sm">No pending items to review</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            typeColors[item.type]
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowModal(true);
                          }}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate max-w-xs"
                        >
                          {item.title}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.source_agent}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowModal(true);
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleApprove(item.id)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
                            title="Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowModal(true);
                              setRejectReason('');
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{selectedItem.title}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Type</p>
                  <p
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-1 ${
                      typeColors[selectedItem.type]
                    }`}
                  >
                    {selectedItem.type}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Source Agent</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedItem.source_agent}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Created</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {new Date(selectedItem.created_at).toLocaleString()}
                  </p>
                </div>
                {selectedItem.metadata && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Metadata</p>
                    <p className="text-sm font-mono text-gray-600 mt-1">
                      {JSON.stringify(selectedItem.metadata, null, 2).substring(0, 100)}...
                    </p>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Preview</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                  {selectedItem.preview}
                </p>
              </div>

              {/* Full Content */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Full Content</p>
                <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-64 overflow-y-auto">
                  <div
                    className="prose prose-sm max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: selectedItem.content }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              {!selectedItem.approved_at && !selectedItem.rejected_at && (
                <div className="pt-4 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => {
                      handleApprove(selectedItem.id);
                      setShowModal(false);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Rejection reason..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded text-sm mb-2"
                    />
                    <button
                      onClick={handleRejectSubmit}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Status Display */}
              {(selectedItem.approved_at || selectedItem.rejected_at) && (
                <div className={`p-4 rounded-lg ${
                  selectedItem.approved_at ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`font-semibold ${selectedItem.approved_at ? 'text-green-900' : 'text-red-900'}`}>
                    {selectedItem.approved_at ? '✅ Approved' : '❌ Rejected'}
                  </p>
                  {selectedItem.approved_by && (
                    <p className={`text-sm ${selectedItem.approved_at ? 'text-green-700' : 'text-red-700'}`}>
                      By {selectedItem.approved_by}
                    </p>
                  )}
                  {selectedItem.rejection_reason && (
                    <p className="text-sm text-red-700 mt-2">Reason: {selectedItem.rejection_reason}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

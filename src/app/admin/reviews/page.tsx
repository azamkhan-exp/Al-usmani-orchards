'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { safeFetchJson } from '@/lib/api-client';
import { formatDate } from '@/lib/formatters';
import {
  Star,
  CheckCircle,
  XCircle,
  EyeOff,
  Clock,
  Filter,
  RefreshCw,
  Search,
  MessageSquare,
  ShieldCheck,
  Package
} from 'lucide-react';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL' ? '/api/admin/reviews' : `/api/admin/reviews?status=${statusFilter}`;
      const data = await safeFetchJson<any>(url);
      if (data?.success && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
      }
    } catch (err) {
      console.error('Error fetching admin reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const handleUpdateStatus = async (reviewId: string, status: 'APPROVED' | 'REJECTED' | 'HIDDEN') => {
    setActionLoading((prev) => ({ ...prev, [reviewId]: true }));
    setFeedbackMsg('');
    try {
      const res = await safeFetchJson<any>('/api/admin/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, status })
      });
      if (res?.success) {
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
        );
        setFeedbackMsg(`Review marked as ${status}.`);
        setTimeout(() => setFeedbackMsg(''), 3000);
      }
    } catch (err: any) {
      alert('Failed to update review status: ' + err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.customer_name?.toLowerCase().includes(q) ||
      r.product_name?.toLowerCase().includes(q) ||
      r.variety_name?.toLowerCase().includes(q) ||
      r.title?.toLowerCase().includes(q) ||
      r.comment?.toLowerCase().includes(q) ||
      r.order_number?.toLowerCase().includes(q)
    );
  });

  const pendingCount = reviews.filter((r) => r.status === 'PENDING').length;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-black text-[#113824] flex items-center space-x-2">
              <Star className="w-6 h-6 text-[#F59E0B] fill-[#F59E0B]" />
              <span>Customer Tasting Reviews Moderation</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Screen, approve, or hide customer tasting notes and ratings from verified consignment buyers.
            </p>
          </div>

          <button
            onClick={fetchReviews}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-[#113824] border border-gray-200 text-xs font-bold shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {feedbackMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-xl font-bold uppercase tracking-wider transition ${
                  statusFilter === st
                    ? 'bg-[#113824] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st}
                {st === 'PENDING' && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-[#F59E0B] text-black text-[9px]">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search patron, order #, variety..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#113824]"
            />
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="p-16 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
            Loading review queue...
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-gray-200 space-y-3">
            <Star className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="font-serif font-bold text-base text-[#113824]">No reviews matching filter criteria</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Verified patron reviews will appear here upon submission from customer accounts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((rev) => {
              const isBusy = actionLoading[rev.id];
              return (
                <div
                  key={rev.id}
                  className="card-luxury p-6 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-[#113824] text-white flex items-center justify-center font-bold text-sm">
                        {rev.customer_name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#113824] flex items-center space-x-2">
                          <span>{rev.customer_name || 'Anonymous Patron'}</span>
                          {rev.is_verified_buyer && (
                            <span className="inline-flex items-center space-x-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.2 rounded-full font-bold">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Verified Purchase</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {rev.customer_city || 'Pakistan'} • Consignment #{rev.order_number || 'N/A'} • Submitted {formatDate(rev.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                          rev.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rev.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : rev.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {rev.status}
                      </span>
                    </div>
                  </div>

                  {/* Rating & Content */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= rev.rating ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-gray-900 text-sm">{rev.title}</span>
                    </div>

                    <p className="text-gray-700 leading-relaxed text-xs">
                      {rev.comment}
                    </p>

                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-gray-50 border border-gray-100 text-[11px] text-[#113824] font-medium">
                      <Package className="w-3.5 h-3.5 text-[#D97706]" />
                      <span>{rev.product_name || rev.variety_name}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-100 justify-end">
                    {rev.status !== 'APPROVED' && (
                      <button
                        onClick={() => handleUpdateStatus(rev.id, 'APPROVED')}
                        disabled={isBusy}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider transition shadow-xs disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve Review</span>
                      </button>
                    )}

                    {rev.status !== 'REJECTED' && (
                      <button
                        onClick={() => handleUpdateStatus(rev.id, 'REJECTED')}
                        disabled={isBusy}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider transition border border-red-200 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    {rev.status !== 'HIDDEN' && (
                      <button
                        onClick={() => handleUpdateStatus(rev.id, 'HIDDEN')}
                        disabled={isBusy}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Calendar, Plus, Sparkles, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { formatPKR } from '@/lib/formatters';

export default function AdminPreordersPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/preorders')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCampaigns(data.campaigns);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-black text-[#113824]">
              Pre-Order Campaigns Engine
            </h1>
            <p className="text-xs text-gray-500">
              Manage upcoming harvest flush allocations, early bird pricing, and reservation capacities.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((c) => {
            const percentFilled = Math.min(100, Math.round((c.reserved_count / c.total_capacity) * 100));
            return (
              <div key={c.id} className="card-luxury rounded-2xl bg-white border border-gray-200 p-6 space-y-4 shadow-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-[#D97706] uppercase">{c.package_name}</span>
                    <h3 className="text-lg font-serif font-bold text-[#113824]">{c.title}</h3>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase">
                    {c.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>Capacity Reserved:</span>
                    <span>{c.reserved_count} / {c.total_capacity} Boxes ({percentFilled}%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#D97706]"
                      style={{ width: `${percentFilled}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl text-xs">
                  <div>
                    <span className="text-gray-500 block">Early Bird Price:</span>
                    <span className="font-bold text-[#113824]">{formatPKR(c.preorder_price)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Regular Price:</span>
                    <span className="font-bold text-gray-600 line-through">{formatPKR(c.regular_price)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Expected Harvest:</span>
                    <span className="font-medium text-gray-800">{c.expected_harvest_date}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Dispatch Window:</span>
                    <span className="font-medium text-gray-800">{c.expected_dispatch_date}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}

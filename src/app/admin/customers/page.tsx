'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Users, Search, Phone, Mail, MapPin, Award } from 'lucide-react';
import { formatPKR } from '@/lib/formatters';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/customers')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.customers)) {
          setCustomers(data.customers);
        } else {
          setCustomers([]);
        }
      })
      .catch((e) => {
        console.error(e);
        setCustomers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-black text-[#113824]">
            Customer CRM & Segmentation
          </h1>
          <p className="text-xs text-gray-500">
            Patron directory, order histories, RFM segmentation, and lifetime values.
          </p>
        </div>

        <div className="card-luxury rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b text-gray-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5">Segment</th>
                <th className="p-3.5">Orders Count</th>
                <th className="p-3.5">Lifetime Value</th>
                <th className="p-3.5">Referral Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">
                    Loading patron CRM directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">
                    No customer records found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="p-3.5">
                      <div className="font-bold text-[#113824]">{c.full_name}</div>
                      <div className="text-[11px] text-gray-500">{c.email} • {c.phone}</div>
                    </td>
                    <td className="p-3.5 text-gray-600">{c.city || 'Pakistan'}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.segment === 'VIP'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : c.segment === 'HIGH_VALUE'
                            ? 'bg-purple-100 text-purple-900'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {c.segment}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-gray-900">{c.real_orders_count || c.orders_count} orders</td>
                    <td className="p-3.5 font-black text-[#113824]">
                      {formatPKR(c.real_total_spent || c.total_spent || 0)}
                    </td>
                    <td className="p-3.5 font-mono text-gray-500">{c.referral_code || '---'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

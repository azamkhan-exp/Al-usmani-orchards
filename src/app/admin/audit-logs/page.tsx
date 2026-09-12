'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Shield, Clock, Search, Database } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit-logs')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLogs(data.logs);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-black text-[#113824]">
            Enterprise Security Audit Trail
          </h1>
          <p className="text-xs text-gray-500">
            Immutable log of all administrative actions, permissions, stock adjustments, and order state mutations.
          </p>
        </div>

        <div className="card-luxury rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between text-xs">
            <span className="font-bold text-[#113824] flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-[#D97706]" />
              <span>Immutable Administrative Actions ({logs.length})</span>
            </span>
            <span className="text-[11px] text-gray-500 font-mono">APPEND-ONLY SECURE LEDGER</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b text-gray-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Administrator</th>
                  <th className="p-3.5">Action Event</th>
                  <th className="p-3.5">Resource</th>
                  <th className="p-3.5">Audit Diff & Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="p-3.5 text-gray-500 whitespace-nowrap">
                      {formatDate(log.created_at, 'full')}
                    </td>
                    <td className="p-3.5 font-sans font-bold text-[#113824]">
                      {log.user_email || 'System Internal'}
                    </td>
                    <td className="p-3.5">
                      <span className="bg-[#113824]/10 text-[#113824] px-2 py-0.5 rounded font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-700">
                      {log.resource_type} {log.resource_id ? `(${log.resource_id.slice(0, 8)}...)` : ''}
                    </td>
                    <td className="p-3.5 text-gray-600 max-w-xs truncate">
                      {log.new_state || 'No diff payload'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  Shield,
  MessageSquare,
  CreditCard,
  Sparkles,
  HardDrive,
  CheckSquare,
  Lock,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface Subsystems {
  database: {
    status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    integrity: string;
    size_mb: number;
    journal_mode: string;
    tables_count: number;
    total_orders: number;
  };
  security: {
    status: 'HEALTHY' | 'WARN';
    admin_otp_enabled: boolean;
    verified_security_phone: string;
    active_admin_sessions: number;
    super_admins_count: number;
  };
  whatsapp: {
    status: 'HEALTHY' | 'SIMULATED' | 'DISABLED' | 'MISCONFIGURED';
    provider: string;
    enabled: boolean;
    phone_id_configured: boolean;
    token_configured: boolean;
    admin_phone: string;
  };
  payments: {
    status: 'HEALTHY' | 'WARN';
    active_methods: string[];
    pending_verifications: number;
  };
  ai_service: {
    status: 'HEALTHY' | 'WARN';
    gemini_key_configured: boolean;
    knowledge_docs_count: number;
  };
  storage: {
    status: 'HEALTHY';
    product_images_count: number;
  };
}

interface ChecklistItem {
  id: string;
  title: string;
  category: 'SECURITY' | 'DATABASE' | 'PAYMENTS' | 'CATALOG' | 'COMMUNICATIONS' | 'OPERATIONS';
  status: 'PASS' | 'WARN' | 'FAIL';
  description: string;
  recommendation?: string;
}

interface HealthData {
  timestamp: string;
  system: {
    node_version: string;
    platform: string;
    uptime_seconds: number;
  };
  subsystems: Subsystems;
  launch_checklist: {
    score_percentage: number;
    passed_count: number;
    warning_count: number;
    failed_count: number;
    items: ChecklistItem[];
  };
}

export default function SystemHealthPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/system-health');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch diagnostic data.');
      }
      setData(json.health);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const categories = ['ALL', 'SECURITY', 'DATABASE', 'PAYMENTS', 'CATALOG', 'COMMUNICATIONS', 'OPERATIONS'];

  const filteredItems = data?.launch_checklist.items.filter(item => {
    if (activeCategory === 'ALL') return true;
    return item.category === activeCategory;
  }) || [];

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-900 text-amber-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-stone-900">System Health & Launch Readiness</h1>
              <p className="text-sm text-stone-500">
                End-to-end operational diagnostic and 16-point launch verification audit for Al Usmani Orchards.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {data && (
              <span className="text-xs text-stone-500 hidden sm:inline-block">
                Last Diagnostic: {new Date(data.timestamp).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Run Diagnostics
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Readiness Score Banner */}
        {data && (
          <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-emerald-800/40 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="px-3 py-1 bg-amber-400/20 text-amber-300 text-xs font-semibold rounded-full border border-amber-400/30">
                  PRODUCTION AUDIT
                </span>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-white">
                  Store Launch Readiness: {data.launch_checklist.score_percentage}%
                </h2>
                <p className="text-sm text-stone-300 max-w-xl">
                  {data.launch_checklist.score_percentage >= 90
                    ? 'All critical operational, security, and payment systems meet enterprise-grade launch standards.'
                    : 'Some configuration items require attention before official storefront opening.'}
                </p>
              </div>

              {/* Stat Counters */}
              <div className="flex items-center gap-4 bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="text-center px-3">
                  <p className="text-2xl font-bold text-emerald-400">{data.launch_checklist.passed_count}</p>
                  <p className="text-[11px] uppercase tracking-wider text-stone-400">Passed</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center px-3">
                  <p className="text-2xl font-bold text-amber-400">{data.launch_checklist.warning_count}</p>
                  <p className="text-[11px] uppercase tracking-wider text-stone-400">Warnings</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center px-3">
                  <p className="text-2xl font-bold text-red-400">{data.launch_checklist.failed_count}</p>
                  <p className="text-[11px] uppercase tracking-wider text-stone-400">Failed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subsystem Health Cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Database Card */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-serif font-bold text-stone-900">
                  <Database className="w-4 h-4 text-emerald-700" />
                  SQLite Database
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  data.subsystems.database.status === 'HEALTHY'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800'
                }`}>
                  {data.subsystems.database.status}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between"><span>Integrity Check:</span><strong className="text-emerald-700 uppercase font-mono">{data.subsystems.database.integrity}</strong></div>
                <div className="flex justify-between"><span>File Size on Disk:</span><strong>{data.subsystems.database.size_mb} MB</strong></div>
                <div className="flex justify-between"><span>Journal Mode:</span><strong className="uppercase">{data.subsystems.database.journal_mode}</strong></div>
                <div className="flex justify-between"><span>Database Tables:</span><strong>{data.subsystems.database.tables_count} tables</strong></div>
              </div>
            </div>

            {/* Security & MFA Card */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-serif font-bold text-stone-900">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  Admin Security & MFA
                </div>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {data.subsystems.security.admin_otp_enabled ? 'MFA ACTIVE' : 'MFA OFF'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between"><span>Security Phone:</span><strong className="font-mono">{data.subsystems.security.verified_security_phone}</strong></div>
                <div className="flex justify-between"><span>Admin OTP Gate:</span><strong className="text-emerald-700">{data.subsystems.security.admin_otp_enabled ? 'Enforced' : 'Optional'}</strong></div>
                <div className="flex justify-between"><span>Super Administrators:</span><strong>{data.subsystems.security.super_admins_count} account(s)</strong></div>
                <div className="flex justify-between"><span>Active Sessions:</span><strong>{data.subsystems.security.active_admin_sessions} live</strong></div>
              </div>
            </div>

            {/* WhatsApp API Card */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-serif font-bold text-stone-900">
                  <MessageSquare className="w-4 h-4 text-emerald-700" />
                  WhatsApp Business API
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  data.subsystems.whatsapp.status === 'HEALTHY'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {data.subsystems.whatsapp.provider}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between"><span>Provider Mode:</span><strong>{data.subsystems.whatsapp.provider}</strong></div>
                <div className="flex justify-between"><span>Phone ID Configured:</span><strong>{data.subsystems.whatsapp.phone_id_configured ? 'Yes' : 'Simulated'}</strong></div>
                <div className="flex justify-between"><span>Access Token:</span><strong>{data.subsystems.whatsapp.token_configured ? 'Present' : 'Simulated'}</strong></div>
                <div className="flex justify-between"><span>Admin Number:</span><strong className="font-mono">{data.subsystems.whatsapp.admin_phone}</strong></div>
              </div>
            </div>

            {/* Payment Gateways Card */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-serif font-bold text-stone-900">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  Payment Methods
                </div>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {data.subsystems.payments.active_methods.length} Active
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between"><span>Active Channels:</span><strong>{data.subsystems.payments.active_methods.join(', ')}</strong></div>
                <div className="flex justify-between"><span>Pending Verifications:</span><strong className={data.subsystems.payments.pending_verifications > 0 ? 'text-amber-700 font-bold' : ''}>{data.subsystems.payments.pending_verifications}</strong></div>
                <div className="flex justify-between"><span>COD Auto-Receivables:</span><strong className="text-emerald-700">Enabled</strong></div>
              </div>
            </div>

            {/* AI Assistant Card */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-serif font-bold text-stone-900">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  AI Sommelier & RAG
                </div>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {data.subsystems.ai_service.gemini_key_configured ? 'CONNECTED' : 'STANDBY'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between"><span>Gemini 2.5 Flash:</span><strong>{data.subsystems.ai_service.gemini_key_configured ? 'Active' : 'Fallback'}</strong></div>
                <div className="flex justify-between"><span>Knowledge Base:</span><strong>{data.subsystems.ai_service.knowledge_docs_count} grounded docs</strong></div>
                <div className="flex justify-between"><span>Tools (Order, Variety):</span><strong className="text-emerald-700">Registered</strong></div>
              </div>
            </div>

            {/* Static Media & Storage */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-serif font-bold text-stone-900">
                  <HardDrive className="w-4 h-4 text-emerald-700" />
                  Media & Asset Storage
                </div>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  HEALTHY
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between"><span>Product Images:</span><strong>{data.subsystems.storage.product_images_count} indexed</strong></div>
                <div className="flex justify-between"><span>Next.js Image Host:</span><strong>images.unsplash.com & Local</strong></div>
                <div className="flex justify-between"><span>Asset Optimization:</span><strong className="text-emerald-700">WebP / AVIF</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* 16-Point Checklist Table */}
        {data && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-700" />
                  16-Point Launch Readiness Audit
                </h3>
                <p className="text-xs text-stone-500">Live inspection of all foundational operational requirements.</p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeCategory === cat
                        ? 'bg-emerald-900 text-amber-400'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Items List */}
            <div className="divide-y divide-stone-100">
              {filteredItems.map(item => (
                <div key={item.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      {item.status === 'PASS' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : item.status === 'WARN' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900">{item.title}</span>
                        <span className="px-2 py-0.2 rounded text-[10px] uppercase font-bold tracking-wider bg-stone-100 text-stone-600">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">{item.description}</p>
                      {item.recommendation && (
                        <p className="text-xs text-amber-800 mt-1 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-100 inline-block">
                          Action Needed: {item.recommendation}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={`self-start md:self-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    item.status === 'PASS'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : item.status === 'WARN'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

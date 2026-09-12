'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Database,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Archive,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Layers,
  ShoppingBag,
  Users,
  Bell,
  Star,
  Clock,
  ArrowRight,
  Sparkles,
  KeyRound,
  RotateCcw,
  Check,
  Send
} from 'lucide-react';
import Link from 'next/link';

interface OverviewData {
  protection: {
    enabled: boolean;
    maintenance_mode: boolean;
    retention_days_notifications: number;
    retention_days_sessions: number;
    retention_days_audit_logs: number;
  };
  counts: {
    orders: { total: number; production: number; demo: number; archived: number };
    customers: { total: number; production: number; demo: number; archived: number };
    products: { total: number; active: number };
    inventory: { package_sizes: number; total_stock_kg: number };
    reviews: { total: number; production: number; demo: number };
    notifications: { total: number; production: number; demo: number };
    audit_logs: { total: number };
  };
}

interface CleanupPreview {
  categories: {
    orders: {
      count: number;
      cascaded: {
        order_items: number;
        payment_transactions: number;
        shipments: number;
        accounts_receivable: number;
      };
    };
    customers: {
      count: number;
      cascaded: {
        addresses: number;
        loyalty_records: number;
        wishlists: number;
      };
    };
    reviews: { count: number };
    notifications: { count: number };
  };
  total_records_to_delete: number;
}

interface ArchivedOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  created_at: string;
  status: string;
  archived_at: string;
}

export default function DataManagementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Protection toggle state
  const [togglingProtection, setTogglingProtection] = useState(false);

  // Demo Cleanup Modal State
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>(['ORDERS', 'CUSTOMERS', 'REVIEWS', 'NOTIFICATIONS']);
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [cleanupError, setCleanupError] = useState<string | null>(null);

  // Production Launch Reset Modal State
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchLoading, setLaunchLoading] = useState(false);
  const [launchPhrase, setLaunchPhrase] = useState('');
  const [launchPassword, setLaunchPassword] = useState('');
  const [launchOtp, setLaunchOtp] = useState('');
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSentMsg, setOtpSentMsg] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Archived Orders State
  const [archivedOrders, setArchivedOrders] = useState<ArchivedOrder[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archiveInputId, setArchiveInputId] = useState('');
  const [archiveActionLoading, setArchiveActionLoading] = useState(false);

  // Retention state
  const [retentionLoading, setRetentionLoading] = useState(false);

  // Countdown timer for OTP cooldown
  useEffect(() => {
    if (otpCooldown > 0) {
      const t = setTimeout(() => setOtpCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [otpCooldown]);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/data-management?action=overview');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load database overview.');
      }
      setData(json.overview);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedOrders = async () => {
    setArchivedLoading(true);
    try {
      const res = await fetch('/api/admin/data-management?action=archived_orders');
      const json = await res.json();
      if (res.ok && json.success) {
        setArchivedOrders(json.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch archived orders:', err);
    } finally {
      setArchivedLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchArchivedOrders();
  }, []);

  const handleToggleProtection = async (enable: boolean) => {
    setTogglingProtection(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/data-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_PROTECTION',
          enabled: enable
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update protection status.');
      }
      setSuccessMsg(json.message);
      await fetchOverview();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingProtection(false);
    }
  };

  const handleRequestOtp = async () => {
    setOtpSending(true);
    setOtpSentMsg(null);
    setLaunchError(null);
    try {
      const res = await fetch('/api/admin/security/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TEST_DISPATCH' })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to dispatch security code.');
      }
      setOtpSentMsg(`Code sent to ${json.masked_phone}`);
      setOtpCooldown(json.cooldown_seconds || 60);
    } catch (err: any) {
      setLaunchError(err.message);
    } finally {
      setOtpSending(false);
    }
  };

  const openCleanupModal = async () => {
    setShowCleanupModal(true);
    setCleanupError(null);
    setPassword('');
    setOtpCode('');
    setConfirmPhrase('');
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/admin/data-management?action=preview_cleanup');
      const json = await res.json();
      if (res.ok && json.success) {
        setPreview(json.preview);
      }
    } catch (err: any) {
      setCleanupError('Could not load cascade preview: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteCleanup = async () => {
    if (confirmPhrase !== 'DELETE DEMO DATA') {
      setCleanupError('Please type "DELETE DEMO DATA" exactly to confirm.');
      return;
    }
    if (!password) {
      setCleanupError('Administrator password is required.');
      return;
    }

    setCleanupLoading(true);
    setCleanupError(null);
    try {
      const res = await fetch('/api/admin/data-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLEANUP',
          categories: selectedCats,
          password,
          otpCode: otpCode.trim() || undefined,
          confirmationPhrase: confirmPhrase
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Cleanup execution failed.');
      }
      setShowCleanupModal(false);
      setSuccessMsg(`Successfully purged demo records!`);
      await fetchOverview();
    } catch (err: any) {
      setCleanupError(err.message);
    } finally {
      setCleanupLoading(false);
    }
  };

  const openLaunchResetModal = () => {
    setShowLaunchModal(true);
    setLaunchError(null);
    setLaunchPhrase('');
    setLaunchPassword('');
    setLaunchOtp('');
    setOtpSentMsg(null);
  };

  const handleExecuteLaunchReset = async () => {
    if (launchPhrase !== 'RESET PRODUCTION LAUNCH') {
      setLaunchError('Please type "RESET PRODUCTION LAUNCH" exactly to confirm.');
      return;
    }
    if (!launchPassword) {
      setLaunchError('Administrator password is required.');
      return;
    }

    setLaunchLoading(true);
    setLaunchError(null);
    try {
      const res = await fetch('/api/admin/data-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PRODUCTION_LAUNCH_RESET',
          password: launchPassword,
          otpCode: launchOtp.trim() || undefined,
          confirmationPhrase: launchPhrase
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Production launch reset failed.');
      }
      setShowLaunchModal(false);
      setSuccessMsg(`Production Launch Reset successful! Store is ready for public launch.`);
      await fetchOverview();
      await fetchArchivedOrders();
    } catch (err: any) {
      setLaunchError(err.message);
    } finally {
      setLaunchLoading(false);
    }
  };

  const handleArchiveOrder = async (orderId: string) => {
    if (!orderId.trim()) return;
    setArchiveActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/data-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ARCHIVE_ORDER', orderId: orderId.trim() })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to archive order.');
      }
      setSuccessMsg(json.message);
      setArchiveInputId('');
      await fetchOverview();
      await fetchArchivedOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setArchiveActionLoading(false);
    }
  };

  const handleRestoreOrder = async (orderId: string) => {
    setArchiveActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/data-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESTORE_ORDER', orderId })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to restore order.');
      }
      setSuccessMsg(json.message);
      await fetchOverview();
      await fetchArchivedOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setArchiveActionLoading(false);
    }
  };

  const handleRetentionCleanup = async () => {
    if (!confirm('Run data retention cleanup now? This will permanently delete expired sessions (>30d) and orphan notifications (>90d).')) {
      return;
    }
    setRetentionLoading(true);
    try {
      const res = await fetch('/api/admin/data-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RETENTION_CLEANUP' })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(`Data retention cleanup complete: Removed ${json.result?.expired_sessions || 0} expired sessions.`);
        await fetchOverview();
      } else {
        throw new Error(json.error || 'Retention cleanup failed.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRetentionLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-900 text-amber-400 rounded-xl shadow-sm">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold text-stone-900">Production Data Management Center</h1>
                <p className="text-sm text-stone-500">
                  Authoritative database partitioning between Live Production, Pre-Launch Demo, and Archived records.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => { fetchOverview(); fetchArchivedOrders(); }}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>

            {data && (
              <button
                onClick={() => handleToggleProtection(!data.protection.enabled)}
                disabled={togglingProtection}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors ${
                  data.protection.enabled
                    ? 'bg-emerald-900 text-amber-300 hover:bg-emerald-950'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                {data.protection.enabled ? (
                  <>
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Production Lock Active</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-white" />
                    <span>Production Lock Disabled</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Feedback Banners */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm animate-in fade-in">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span className="flex-1 font-medium">{successMsg}</span>
          </div>
        )}

        {/* Protection Mode Guard Banner */}
        {data && (
          <div className={`p-5 rounded-2xl border ${
            data.protection.enabled
              ? 'bg-gradient-to-r from-emerald-900 via-emerald-850 to-stone-900 text-white border-emerald-800 shadow-md'
              : 'bg-amber-50 border-amber-200 text-amber-950 shadow-sm'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${data.protection.enabled ? 'bg-emerald-800 text-amber-400' : 'bg-amber-200 text-amber-800'}`}>
                  {data.protection.enabled ? <ShieldCheck className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold font-serif">
                      {data.protection.enabled ? 'Live Production Mode Guard: PROTECTED' : 'Production Safety Guard: UNLOCKED'}
                    </h2>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      data.protection.enabled ? 'bg-emerald-800 text-emerald-200 border border-emerald-700' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {data.protection.enabled ? 'IMMUTABLE' : 'ACTION REQUIRED'}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 max-w-2xl ${data.protection.enabled ? 'text-stone-300' : 'text-amber-800'}`}>
                    {data.protection.enabled
                      ? 'Destructive bulk deletions and demo data purges are strictly locked. Live customer records and historical order ledgers cannot be accidentally removed.'
                      : 'Production protection is unlocked. You may execute demo purges, launch resets, and maintenance. Remember to re-engage the Production Lock when finished.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                <button
                  onClick={openCleanupModal}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  Purge Demo Records
                </button>
                <button
                  onClick={openLaunchResetModal}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Production Launch Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HERO CARD: Production Launch Reset & Clean Slate */}
        <div className="bg-gradient-to-br from-stone-900 to-emerald-950 text-white rounded-2xl p-6 md:p-8 border border-emerald-900/50 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Pre-Launch Clean Baseline
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-bold text-white">
                Official Production Launch Reset
              </h2>
              <p className="text-stone-300 text-sm leading-relaxed">
                Cleanses all synthetic demo orders, demo customer profiles, transient stock reservations, and test notifications before public go-live.
                Your analytics start from an authoritative 0-order baseline for real customer commerce.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs text-stone-300">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Admin Credentials Safe</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Products & Prices Safe</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pakistan Locations Safe</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp & Keys Safe</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={openLaunchResetModal}
                className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Prepare Launch Reset
              </button>
            </div>
          </div>
        </div>

        {/* Partitioned Data Metrics */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Orders Partition */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-700" />
                  Order Registry
                </span>
                <Link href="/admin/orders" className="text-xs text-emerald-800 hover:underline flex items-center gap-1">
                  View <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div>
                <p className="text-3xl font-bold font-serif text-stone-900">{data.counts.orders.total}</p>
                <p className="text-xs text-stone-500 mt-0.5">Total orders recorded in database</p>
              </div>
              <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-stone-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Live Production:
                  </span>
                  <span className="font-bold text-emerald-800">{data.counts.orders.production}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-stone-600">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Pre-Launch Demo:
                  </span>
                  <span className="font-bold text-amber-700">{data.counts.orders.demo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-stone-600">
                    <span className="w-2 h-2 rounded-full bg-stone-400" />
                    Archived Orders:
                  </span>
                  <span className="font-bold text-stone-700">{data.counts.orders.archived}</span>
                </div>
              </div>
            </div>

            {/* Customers Partition */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-700" />
                  Customer Directory
                </span>
                <Link href="/admin/customers" className="text-xs text-emerald-800 hover:underline flex items-center gap-1">
                  View <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div>
                <p className="text-3xl font-bold font-serif text-stone-900">{data.counts.customers.total}</p>
                <p className="text-xs text-stone-500 mt-0.5">Customer profiles on record</p>
              </div>
              <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-stone-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Live Real Customers:
                  </span>
                  <span className="font-bold text-emerald-800">{data.counts.customers.production}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-stone-600">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Test Demo Accounts:
                  </span>
                  <span className="font-bold text-amber-700">{data.counts.customers.demo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-stone-600">
                    <span className="w-2 h-2 rounded-full bg-stone-400" />
                    Archived Profiles:
                  </span>
                  <span className="font-bold text-stone-700">{data.counts.customers.archived}</span>
                </div>
              </div>
            </div>

            {/* Products & Stock */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  Catalog & Inventory
                </span>
                <Link href="/admin/products" className="text-xs text-emerald-800 hover:underline flex items-center gap-1">
                  View <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div>
                <p className="text-3xl font-bold font-serif text-stone-900">{data.counts.products.active}</p>
                <p className="text-xs text-stone-500 mt-0.5">Active signature mango varieties</p>
              </div>
              <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Total Products:</span>
                  <span className="font-semibold text-stone-900">{data.counts.products.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Package Size Variants:</span>
                  <span className="font-semibold text-stone-900">{data.counts.inventory.package_sizes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Total Physical Stock:</span>
                  <span className="font-bold text-emerald-700">{data.counts.inventory.total_stock_kg.toLocaleString()} kg</span>
                </div>
              </div>
            </div>

            {/* Engagement & Logs */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-emerald-700" />
                  Audit & Activity
                </span>
                <Link href="/admin/security" className="text-xs text-emerald-800 hover:underline flex items-center gap-1">
                  Security <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div>
                <p className="text-3xl font-bold font-serif text-stone-900">{data.counts.audit_logs.total}</p>
                <p className="text-xs text-stone-500 mt-0.5">Immutable audit events</p>
              </div>
              <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Reviews (Live / Demo):</span>
                  <span className="font-semibold text-stone-900">{data.counts.reviews.production} / {data.counts.reviews.demo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Notifications (Live / Demo):</span>
                  <span className="font-semibold text-stone-900">{data.counts.notifications.production} / {data.counts.notifications.demo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Integrity Status:</span>
                  <span className="font-semibold text-emerald-700">Verified</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDER ARCHIVING & RESTORATION CONSOLE */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 text-stone-700 rounded-lg">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-stone-900">Order Archiving & Restoration</h3>
                <p className="text-xs text-stone-500">Soft-archive obsolete test orders to exclude them from live analytics without corrupting financial ledgers.</p>
              </div>
            </div>

            {/* Quick Archive By ID */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={archiveInputId}
                onChange={e => setArchiveInputId(e.target.value)}
                placeholder="Enter Order ID to archive..."
                className="px-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 w-56"
              />
              <button
                onClick={() => handleArchiveOrder(archiveInputId)}
                disabled={archiveActionLoading || !archiveInputId.trim()}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-stone-800 hover:bg-stone-900 disabled:opacity-50 rounded-lg transition-colors"
              >
                Archive Order
              </button>
            </div>
          </div>

          {/* Archived Orders Table */}
          <div className="overflow-x-auto">
            {archivedLoading ? (
              <div className="p-8 text-center text-xs text-stone-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-stone-400" />
                Loading archived orders...
              </div>
            ) : archivedOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                No archived orders found. All recorded orders are currently active.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Archived At</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {archivedOrders.map(order => (
                    <tr key={order.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-stone-900">
                        {order.order_number}
                      </td>
                      <td className="py-3 px-4 text-stone-700">{order.customer_name}</td>
                      <td className="py-3 px-4 font-bold text-emerald-800">
                        PKR {Number(order.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-stone-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-stone-500">
                        {order.archived_at ? new Date(order.archived_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRestoreOrder(order.id)}
                          disabled={archiveActionLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md font-semibold text-xs transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore Order
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Data Retention Policies */}
        {data && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 text-stone-700 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-stone-900">Automatic Data Retention Policies</h3>
                <p className="text-xs text-stone-500">Scheduled maintenance rules for high-volume operational logs.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-sm text-stone-700">
              <div className="p-4 bg-stone-50 rounded-xl space-y-1">
                <span className="text-xs text-stone-500 font-medium">User Login Sessions</span>
                <p className="font-bold text-stone-900">{data.protection.retention_days_sessions} Days Maximum</p>
                <p className="text-xs text-stone-400">Purges expired bearer tokens</p>
              </div>
              <div className="p-4 bg-stone-50 rounded-xl space-y-1">
                <span className="text-xs text-stone-500 font-medium">Notification Logs</span>
                <p className="font-bold text-stone-900">{data.protection.retention_days_notifications} Days Maximum</p>
                <p className="text-xs text-stone-400">Purges transient SMS/WhatsApp delivery receipts</p>
              </div>
              <div className="p-4 bg-stone-50 rounded-xl space-y-1">
                <span className="text-xs text-stone-500 font-medium">Security Audit Trail</span>
                <p className="font-bold text-emerald-800">{data.protection.retention_days_audit_logs} Days Immutable</p>
                <p className="text-xs text-stone-400">Permanent compliance ledger</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleRetentionCleanup}
                disabled={retentionLoading}
                className="py-2 px-4 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retentionLoading ? 'animate-spin' : ''}`} />
                Run Retention Cleanup Now
              </button>
            </div>
          </div>
        )}

        {/* PRODUCTION LAUNCH RESET MODAL */}
        {showLaunchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-stone-200 p-6 space-y-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-start justify-between border-b border-stone-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
                    <Sparkles className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-stone-900">Production Launch Reset</h2>
                    <p className="text-xs text-stone-500">Wipe test orders to prepare store for public launch.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLaunchModal(false)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  ✕
                </button>
              </div>

              {data?.protection.enabled ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm space-y-3">
                  <div className="flex items-center gap-2 font-bold">
                    <Lock className="w-5 h-5 text-amber-700" />
                    Production Mode Lock is Enabled!
                  </div>
                  <p className="text-xs leading-relaxed text-amber-800">
                    To prevent accidental data loss, the Launch Reset tool is blocked while Production Lock is active.
                    Please close this modal, click <strong>&quot;Production Lock Active&quot;</strong> in the top header to unlock it, and then re-open this modal.
                  </p>
                </div>
              ) : (
                <>
                  {launchError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
                      <span>{launchError}</span>
                    </div>
                  )}

                  {otpSentMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                      <span>{otpSentMsg}</span>
                    </div>
                  )}

                  {/* Warning and Protected Assets Box */}
                  <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-3 text-xs text-red-950">
                    <p className="font-bold flex items-center gap-1.5 text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      Irreversible Operation
                    </p>
                    <p className="leading-relaxed">
                      This action will delete all synthetic demo orders, demo customers, transient stock reservations, and test notifications.
                    </p>
                    <div className="pt-2 border-t border-red-200 text-stone-700">
                      <p className="font-bold text-stone-900 mb-1">Protected Master Assets (NOT TOUCHED):</p>
                      <ul className="list-disc list-inside space-y-0.5 text-stone-600">
                        <li>Administrator credentials and active session tokens</li>
                        <li>All products, varieties, packages, images & pricing</li>
                        <li>Complete Pakistan locations database & courier rates</li>
                        <li>Payment gateway credentials & Store settings</li>
                        <li>WhatsApp templates & AI Knowledge base</li>
                      </ul>
                    </div>
                  </div>

                  {/* Confirmation Phrase */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">
                      Type <span className="text-red-600 select-all font-mono">RESET PRODUCTION LAUNCH</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={launchPhrase}
                      onChange={e => setLaunchPhrase(e.target.value)}
                      placeholder="RESET PRODUCTION LAUNCH"
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                    />
                  </div>

                  {/* Password re-authentication */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">
                      Administrator Password:
                    </label>
                    <input
                      type="password"
                      value={launchPassword}
                      onChange={e => setLaunchPassword(e.target.value)}
                      placeholder="Enter your admin password"
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  {/* Step-Up OTP Verification */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-700">
                        Security OTP Verification Code:
                      </label>
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={otpSending || otpCooldown > 0}
                        className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 disabled:text-stone-400 flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Request OTP Code'}
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={launchOtp}
                      onChange={e => setLaunchOtp(e.target.value)}
                      placeholder="Enter 6-digit passcode (if MFA enabled)"
                      className="w-full px-3 py-2 text-sm font-mono tracking-widest border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowLaunchModal(false)}
                      disabled={launchLoading}
                      className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteLaunchReset}
                      disabled={launchLoading || launchPhrase !== 'RESET PRODUCTION LAUNCH' || !launchPassword}
                      className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
                    >
                      {launchLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Executing Reset...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Execute Production Launch Reset
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* CLEANUP DEMO DATA MODAL */}
        {showCleanupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-stone-200 p-6 space-y-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-start justify-between border-b border-stone-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-stone-900">Purge Demo Data</h2>
                    <p className="text-xs text-stone-500">Permanently delete selected demo records from SQLite.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCleanupModal(false)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  ✕
                </button>
              </div>

              {data?.protection.enabled ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm space-y-3">
                  <div className="flex items-center gap-2 font-bold">
                    <Lock className="w-5 h-5 text-amber-700" />
                    Production Mode Lock is Enabled!
                  </div>
                  <p className="text-xs leading-relaxed text-amber-800">
                    To prevent accidental data loss, the cleanup tool is blocked while Production Lock is active.
                    Please close this modal, click <strong>&quot;Production Lock Active&quot;</strong> in the top header to unlock it, and then proceed.
                  </p>
                </div>
              ) : (
                <>
                  {cleanupError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
                      <span>{cleanupError}</span>
                    </div>
                  )}

                  {/* Categories to purge */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      Select Data Categories to Delete:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'ORDERS', label: 'Demo Orders & Transactions' },
                        { id: 'CUSTOMERS', label: 'Demo Customer Accounts' },
                        { id: 'REVIEWS', label: 'Demo Customer Reviews' },
                        { id: 'NOTIFICATIONS', label: 'Demo Notification Logs' }
                      ].map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                            selectedCats.includes(cat.id)
                              ? 'border-red-500 bg-red-50 text-red-900 font-bold'
                              : 'border-stone-200 bg-stone-50 text-stone-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCats.includes(cat.id)}
                            readOnly
                            className="mr-2 accent-red-600"
                          />
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cascade Preview */}
                  {previewLoading ? (
                    <div className="p-4 text-center text-xs text-stone-500">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-stone-400" />
                      Calculating database cascade impact...
                    </div>
                  ) : preview ? (
                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs text-stone-700">
                      <p className="font-bold text-stone-900">Cascade Impact Preview:</p>
                      <ul className="list-disc list-inside space-y-1 text-stone-600">
                        <li><strong>{preview.categories.orders.count}</strong> Demo Orders (plus {preview.categories.orders.cascaded.order_items} items, {preview.categories.orders.cascaded.payment_transactions} payments)</li>
                        <li><strong>{preview.categories.customers.count}</strong> Demo Customers (plus {preview.categories.customers.cascaded.addresses} addresses, {preview.categories.customers.cascaded.loyalty_records} loyalty rows)</li>
                        <li><strong>{preview.categories.reviews.count}</strong> Demo Reviews</li>
                        <li><strong>{preview.categories.notifications.count}</strong> Demo Notifications</li>
                      </ul>
                      <p className="text-red-700 font-bold pt-1">
                        Total Database Rows Affected: {preview.total_records_to_delete}
                      </p>
                    </div>
                  ) : null}

                  {/* Confirmation Phrase */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">
                      Type <span className="text-red-600 select-all font-mono">DELETE DEMO DATA</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmPhrase}
                      onChange={e => setConfirmPhrase(e.target.value)}
                      placeholder="DELETE DEMO DATA"
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                    />
                  </div>

                  {/* Password re-authentication */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">
                      Administrator Password:
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your admin password"
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  {/* Step-Up OTP */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700">
                      Security OTP Code (Optional / If Enforced):
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="w-full px-3 py-2 text-sm font-mono tracking-widest border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCleanupModal(false)}
                      disabled={cleanupLoading}
                      className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteCleanup}
                      disabled={cleanupLoading || confirmPhrase !== 'DELETE DEMO DATA' || !password}
                      className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
                    >
                      {cleanupLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Purging Records...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Permanently Delete
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

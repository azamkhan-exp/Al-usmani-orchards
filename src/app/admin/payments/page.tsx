'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Save,
  Check,
  Clock,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Eye,
  Sliders,
  DollarSign
} from 'lucide-react';
import { safeFetchJson } from '@/lib/api-client';
import { formatPKR } from '@/lib/formatters';

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'METHODS' | 'VERIFICATIONS'>('METHODS');

  // Saving states per method code
  const [savingMethod, setSavingMethod] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form edit states (code -> configs)
  const [configsState, setConfigsState] = useState<Record<string, Record<string, string>>>({});
  const [enabledState, setEnabledState] = useState<Record<string, boolean>>({});

  // Verification actions
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await safeFetchJson<any>('/api/admin/payments');
      if (res?.methods) {
        setMethods(res.methods);
        const configsInit: Record<string, Record<string, string>> = {};
        const enabledInit: Record<string, boolean> = {};

        for (const m of res.methods) {
          configsInit[m.code] = { ...(m.configs || {}) };
          enabledInit[m.code] = m.is_enabled === 1;
        }
        setConfigsState(configsInit);
        setEnabledState(enabledInit);
      }

      if (res?.pending_verifications) {
        setPendingVerifications(res.pending_verifications);
      }
    } catch (err: any) {
      console.error('Failed to load payment settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfigChange = (methodCode: string, key: string, value: string) => {
    setConfigsState((prev) => ({
      ...prev,
      [methodCode]: {
        ...(prev[methodCode] || {}),
        [key]: value
      }
    }));
  };

  const handleToggleEnabled = (methodCode: string) => {
    setEnabledState((prev) => ({
      ...prev,
      [methodCode]: !prev[methodCode]
    }));
  };

  const handleSaveMethod = async (methodCode: string) => {
    setSavingMethod(methodCode);
    setActionMessage(null);

    try {
      const res = await safeFetchJson<any>('/api/admin/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: methodCode,
          is_enabled: enabledState[methodCode],
          configs: configsState[methodCode] || {}
        })
      });

      if (res?.error) {
        setActionMessage({ type: 'error', text: res.error });
      } else {
        setActionMessage({
          type: 'success',
          text: `Settings for ${methodCode} saved successfully.`
        });
        if (res.methods) {
          setMethods(res.methods);
        }
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setSavingMethod(null);
    }
  };

  const handleVerify = async (transactionId: string, approved: boolean) => {
    const notes = prompt(
      approved
        ? 'Optional verification notes (e.g., Bank statement matched):'
        : 'Reason for rejection (e.g., Invalid transaction reference):'
    );
    if (notes === null) return; // User cancelled prompt

    setVerifyingId(transactionId);
    setActionMessage(null);

    try {
      const res = await safeFetchJson<any>('/api/admin/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transactionId,
          approved,
          notes: notes || undefined
        })
      });

      if (res?.error) {
        setActionMessage({ type: 'error', text: res.error });
      } else {
        setActionMessage({
          type: 'success',
          text: approved ? 'Transaction verified and marked as PAID.' : 'Transaction marked as REJECTED.'
        });
        if (res.pending_verifications) {
          setPendingVerifications(res.pending_verifications);
        } else {
          setPendingVerifications((prev) => prev.filter((p) => p.id !== transactionId));
        }
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to verify transaction.' });
    } finally {
      setVerifyingId(null);
    }
  };

  const getMethodIcon = (code: string) => {
    switch (code.toUpperCase()) {
      case 'COD':
        return <Banknote className="w-5 h-5 text-emerald-400" />;
      case 'EASYPAISA':
        return <Smartphone className="w-5 h-5 text-green-400" />;
      case 'JAZZCASH':
        return <Smartphone className="w-5 h-5 text-red-400" />;
      case 'CARD':
        return <CreditCard className="w-5 h-5 text-amber-400" />;
      default:
        return <DollarSign className="w-5 h-5 text-stone-400" />;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3 text-stone-400">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
            <span className="text-sm font-medium">Loading Payment Architecture...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-800/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Multi-Tier Payment & Audit System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100">
              Payment Gateway & Verification Operations
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              Configure Cash on Delivery, EasyPaisa, JazzCash, card gateways, and audit customer manual transfers.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-stone-900 p-1 rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => setActiveTab('METHODS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'METHODS'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Payment Methods ({methods.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('VERIFICATIONS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer relative ${
                activeTab === 'VERIFICATIONS'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Verification Queue
              {pendingVerifications.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {pendingVerifications.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {actionMessage && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center justify-between animate-in fade-in ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-red-950/60 border border-red-800 text-red-300'
            }`}
          >
            <span>{actionMessage.text}</span>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-stone-400 hover:text-stone-200 text-xs ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: GLOBAL PAYMENT METHODS */}
        {activeTab === 'METHODS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {methods.map((method) => {
              const isEnabled = enabledState[method.code] ?? (method.is_enabled === 1);
              const configs = configsState[method.code] || {};
              const isSaving = savingMethod === method.code;

              return (
                <div
                  key={method.code}
                  className={`p-6 rounded-2xl border shadow-xl transition-all ${
                    isEnabled
                      ? 'bg-stone-900/70 border-stone-800'
                      : 'bg-stone-950/80 border-stone-900 opacity-80'
                  }`}
                >
                  {/* Card Top */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center shrink-0">
                        {getMethodIcon(method.code)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-stone-100">{method.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-stone-800 text-amber-400 border border-stone-700">
                            {method.code}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">{method.description}</p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(method.code)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-emerald-600' : 'bg-stone-700'
                      }`}
                      title={isEnabled ? 'Click to disable' : 'Click to enable'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Configs form */}
                  <div className="space-y-3.5 pt-2 border-t border-stone-800/80">
                    {/* Method Specific Fields */}
                    {method.code === 'COD' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1">
                            Customer Instructions
                          </label>
                          <textarea
                            rows={2}
                            value={configs.instructions || ''}
                            onChange={(e) => handleConfigChange('COD', 'instructions', e.target.value)}
                            placeholder="Pay in cash upon delivery to the courier rider..."
                            className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1">
                              Min Amount (PKR)
                            </label>
                            <input
                              type="number"
                              value={configs.min_amount || '0'}
                              onChange={(e) => handleConfigChange('COD', 'min_amount', e.target.value)}
                              className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1">
                              Max Amount (PKR)
                            </label>
                            <input
                              type="number"
                              value={configs.max_amount || '100000'}
                              onChange={(e) => handleConfigChange('COD', 'max_amount', e.target.value)}
                              className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {(method.code === 'EASYPAISA' || method.code === 'JAZZCASH') && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1">
                              Account Title / Name
                            </label>
                            <input
                              type="text"
                              value={configs.account_name || ''}
                              onChange={(e) => handleConfigChange(method.code, 'account_name', e.target.value)}
                              placeholder="Al Usmani Orchards"
                              className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1">
                              Account / Mobile Number
                            </label>
                            <input
                              type="text"
                              value={configs.account_number || ''}
                              onChange={(e) => handleConfigChange(method.code, 'account_number', e.target.value)}
                              placeholder="03001234567"
                              className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1">
                            Payment Instructions Shown at Checkout
                          </label>
                          <textarea
                            rows={2}
                            value={configs.instructions || ''}
                            onChange={(e) => handleConfigChange(method.code, 'instructions', e.target.value)}
                            placeholder="Send payment to our account and enter the TID below..."
                            className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </>
                    )}

                    {method.code === 'CARD' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1">
                              Gateway Provider
                            </label>
                            <select
                              value={configs.provider || 'stripe'}
                              onChange={(e) => handleConfigChange('CARD', 'provider', e.target.value)}
                              className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                            >
                              <option value="stripe">Stripe</option>
                              <option value="paymob">Paymob</option>
                              <option value="safepay">Safepay Pakistan</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1">
                              Environment Mode
                            </label>
                            <select
                              value={configs.mode || 'test'}
                              onChange={(e) => handleConfigChange('CARD', 'mode', e.target.value)}
                              className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                            >
                              <option value="test">Sandbox / Test</option>
                              <option value="live">Production / Live</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1">
                            Publishable Key
                          </label>
                          <input
                            type="text"
                            value={configs.publishable_key || ''}
                            onChange={(e) => handleConfigChange('CARD', 'publishable_key', e.target.value)}
                            placeholder="pk_test_..."
                            className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1">
                            Secret Key (PCI Secured)
                          </label>
                          <input
                            type="password"
                            value={configs.secret_key || ''}
                            onChange={(e) => handleConfigChange('CARD', 'secret_key', e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </>
                    )}

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[11px] text-stone-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {isEnabled ? 'Active in storefront' : 'Disabled globally'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSaveMethod(method.code)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-950 hover:bg-stone-850 border border-stone-700 text-amber-400 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>{isSaving ? 'Saving...' : 'Save Config'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: MANUAL VERIFICATION QUEUE */}
        {activeTab === 'VERIFICATIONS' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 flex items-center justify-between text-xs text-stone-300">
              <span>
                Orders with EasyPaisa / JazzCash payment proof awaiting administrative reconciliation.
              </span>
              <span className="font-semibold text-amber-400">
                {pendingVerifications.length} transaction(s) pending
              </span>
            </div>

            {pendingVerifications.length === 0 ? (
              <div className="p-12 rounded-2xl bg-stone-900/40 border border-stone-800 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-base font-semibold text-stone-200">
                  Verification Queue Cleared
                </h3>
                <p className="text-xs text-stone-400 max-w-md mx-auto">
                  All manual mobile wallet transfer proofs have been reviewed and reconciled. New customer submissions will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingVerifications.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-5 rounded-2xl bg-stone-900/70 border border-stone-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-100 font-mono">
                          Order #{tx.order_number}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 border border-amber-800/80 text-amber-300">
                          {tx.payment_method_code}
                        </span>
                        <span className="text-stone-500">•</span>
                        <span className="text-stone-400">
                          {new Date(tx.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-stone-300">
                        <span>Customer: <strong className="text-stone-100">{tx.customer_name || 'Guest Checkout'}</strong></span>
                        {tx.customer_phone && (
                          <span>Phone: <strong className="text-stone-100 font-mono">{tx.customer_phone}</strong></span>
                        )}
                        <span>
                          Amount:{' '}
                          <strong className="text-emerald-400 font-semibold font-mono text-sm">
                            {formatPKR(tx.amount)}
                          </strong>
                        </span>
                      </div>

                      <div className="pt-1 flex items-center gap-2">
                        <span className="text-stone-400">Customer TID / Ref:</span>
                        <code className="px-2.5 py-1 rounded bg-stone-950 border border-stone-800 text-amber-300 font-mono font-bold tracking-wider text-xs">
                          {tx.transaction_reference || 'NO_TID_ENTERED'}
                        </code>
                        {tx.payment_proof_url && (
                          <a
                            href={tx.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 underline ml-2"
                          >
                            <span>View Proof Receipt</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 md:pt-0 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleVerify(tx.id, true)}
                        disabled={verifyingId === tx.id}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Payment</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleVerify(tx.id, false)}
                        disabled={verifyingId === tx.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-950 hover:bg-red-950 border border-stone-800 hover:border-red-800 text-stone-300 hover:text-red-300 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

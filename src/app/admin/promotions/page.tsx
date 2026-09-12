'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Tag, Plus, Sparkles, X, CheckCircle, Percent, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { formatPKR } from '@/lib/formatters';
import { safeFetchJson } from '@/lib/api-client';

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('10');
  const [minOrderValue, setMinOrderValue] = useState('5000');
  const [isStackable, setIsStackable] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const data = await safeFetchJson<any>('/api/admin/promotions');
      if (data?.success) {
        setPromotions(data.promotions || []);
      }
    } catch (e: any) {
      console.error('Fetch promos error:', e);
      setErrorMessage(e.message || 'Failed to load promotions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const openCreateModal = () => {
    setEditingPromoId(null);
    setName('');
    setCode('');
    setDiscountType('PERCENTAGE');
    setDiscountValue('10');
    setMinOrderValue('5000');
    setIsStackable(true);
    setModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingPromoId(p.id);
    setName(p.name || '');
    setCode(p.code || '');
    setDiscountType(p.discount_type || 'PERCENTAGE');
    setDiscountValue(String(p.discount_value ?? 10));
    setMinOrderValue(String(p.min_order_value ?? 0));
    setIsStackable(Boolean(p.is_stackable));
    setModalOpen(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      if (editingPromoId) {
        // Update existing
        const data = await safeFetchJson<any>('/api/admin/promotions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPromoId,
            name,
            code: code.trim().toUpperCase(),
            discountType,
            discountValue: Number(discountValue),
            minOrderValue: Number(minOrderValue),
            isStackable
          })
        });

        if (data?.success) {
          setModalOpen(false);
          setSuccessMessage('Promotion rule updated successfully.');
          await fetchPromos();
          setTimeout(() => setSuccessMessage(''), 4000);
        } else {
          setErrorMessage(data?.error || 'Failed to update promotion.');
        }
      } else {
        // Create new
        const data = await safeFetchJson<any>('/api/admin/promotions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            code: code.trim().toUpperCase(),
            discountType,
            discountValue: Number(discountValue),
            minOrderValue: Number(minOrderValue),
            isStackable
          })
        });

        if (data?.success) {
          setModalOpen(false);
          setSuccessMessage('New promotion created successfully.');
          await fetchPromos();
          setTimeout(() => setSuccessMessage(''), 4000);
        } else {
          setErrorMessage(data?.error || 'Failed to create promotion.');
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Error occurred while saving promotion.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      const data = await safeFetchJson<any>('/api/admin/promotions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentActive })
      });
      if (data?.success) {
        fetchPromos();
      }
    } catch (e: any) {
      console.error('Toggle promo error:', e);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete promotion "${name}"?`)) {
      return;
    }

    try {
      const data = await safeFetchJson<any>(`/api/admin/promotions?id=${id}`, {
        method: 'DELETE'
      });
      if (data?.success) {
        setSuccessMessage(`Promotion "${name}" deleted.`);
        await fetchPromos();
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrorMessage(data?.error || 'Failed to delete promotion.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Error occurred while deleting promotion.');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Banner Alerts */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-black text-[#113824]">
              Promotions &amp; Discount Engine
            </h1>
            <p className="text-xs text-gray-500">
              Configure tiered quantity volume breaks, coupon codes, and seasonal campaign incentives.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Promo Coupon</span>
          </button>
        </div>

        {/* Promotions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map((p) => (
            <div
              key={p.id}
              className={`card-luxury rounded-2xl bg-white border p-6 space-y-4 shadow-xs flex flex-col justify-between ${
                p.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-1.5">
                    <Tag className="w-4 h-4 text-[#D97706]" />
                    <span className="font-mono font-bold text-xs text-[#113824]">
                      {p.code || 'AUTOMATIC TIERED'}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {p.is_active ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                <h3 className="text-base font-serif font-bold text-[#113824] mt-2">{p.name}</h3>

                <div className="text-xs text-gray-600 mt-1">
                  {p.discount_type === 'TIERED' ? (
                    <span>Volume breaks: 5-9 (5%), 10-19 (10%), 20+ (15%)</span>
                  ) : p.discount_type === 'PERCENTAGE' ? (
                    <span>{p.discount_value}% OFF orders over {formatPKR(p.min_order_value)}</span>
                  ) : (
                    <span>{formatPKR(p.discount_value)} OFF orders over {formatPKR(p.min_order_value)}</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Used {p.times_used} times</span>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleToggle(p.id, Boolean(p.is_active))}
                    className="text-xs font-bold text-[#D97706] hover:underline"
                  >
                    {p.is_active ? 'Disable' : 'Enable'}
                  </button>
                  {p.discount_type !== 'TIERED' && (
                    <>
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1 text-gray-400 hover:text-[#113824] transition-colors"
                        title="Edit promotion"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete promotion"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add / Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-serif font-bold text-base text-[#113824]">
                  {editingPromoId ? 'Edit Promotion Rule' : 'Create Coupon Rule'}
                </h3>
                <button onClick={() => setModalOpen(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSavePromo} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Campaign Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Independence Day Special"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Coupon Code (Uppercase):</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AZADI2026"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono font-bold uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Discount Type:</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Fixed Amount (PKR)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Discount Value:</label>
                    <input
                      type="number"
                      required
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Minimum Order Spend (PKR):</label>
                  <input
                    type="number"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingPromoId ? 'Update Promotion' : 'Save Promotion'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

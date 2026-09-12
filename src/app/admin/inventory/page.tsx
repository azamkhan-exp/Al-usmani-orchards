'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Layers,
  Sparkles,
  AlertTriangle,
  History,
  Plus,
  X,
  FileText,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [newStock, setNewStock] = useState('50');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventoryData = () => {
    setLoading(true);
    fetch('/api/admin/inventory')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setInventory(Array.isArray(data.inventory) ? data.inventory : []);
          setBatches(Array.isArray(data.batches) ? data.batches : []);
          setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
        } else {
          setInventory([]);
          setBatches([]);
          setTransactions([]);
        }
      })
      .catch((e) => {
        console.error(e);
        setInventory([]);
        setBatches([]);
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !adjustReason) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageSizeId: selectedItem.package_size_id,
          newAvailableStock: Number(newStock),
          reason: adjustReason
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdjustModalOpen(false);
        setAdjustReason('');
        fetchInventoryData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-black text-[#113824]">
              Inventory & FIFO Harvest Ledger
            </h1>
            <p className="text-xs text-gray-500">
              Complete stock visibility, harvest batch allocations, and immutable ledger movements.
            </p>
          </div>

          <button
            onClick={fetchInventoryData}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-[#113824] hover:bg-gray-50 shadow-xs flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* Live Stock by Package Size */}
        <div className="card-luxury rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <span className="text-xs font-bold text-[#113824] uppercase tracking-wider">
              Current Package Inventory
            </span>
            <span className="text-[11px] text-gray-500 font-medium">Auto-synced with checkout reservations</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b text-gray-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Variety & Package</th>
                  <th className="p-3">Weight</th>
                  <th className="p-3">Available</th>
                  <th className="p-3">Reserved (Cart / Order)</th>
                  <th className="p-3">Sold</th>
                  <th className="p-3">Safety Threshold</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 font-medium">
                      Loading inventory records...
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 font-medium">
                      No inventory records found.
                    </td>
                  </tr>
                ) : (
                  inventory.map((inv) => (
                    <tr key={inv.inventory_id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <span className="font-bold text-[#113824]">{inv.variety_name}</span>
                        <span className="text-gray-500 ml-1.5">({inv.package_name})</span>
                      </td>
                      <td className="p-3 font-medium">{inv.weight_kg} KG</td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-black text-xs ${
                            inv.available_stock <= inv.low_stock_threshold
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {inv.available_stock} boxes
                        </span>
                      </td>
                      <td className="p-3 font-medium text-gray-600">{inv.reserved_stock} boxes</td>
                      <td className="p-3 font-bold text-gray-900">{inv.sold_stock} boxes</td>
                      <td className="p-3 text-gray-500">Min {inv.low_stock_threshold}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedItem(inv);
                            setNewStock(inv.available_stock.toString());
                            setAdjustModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded bg-gray-100 hover:bg-[#113824] hover:text-white text-[#113824] font-bold text-[11px] transition-colors"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Harvest Batches (FIFO Origin) */}
        <div className="card-luxury rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <span className="text-xs font-bold text-[#113824] uppercase tracking-wider">
              Orchard Harvest Batches (FIFO Traceability)
            </span>
            <span className="text-[11px] text-gray-500">Traceable to orchard block and harvest date</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b text-gray-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Batch ID</th>
                  <th className="p-3">Variety</th>
                  <th className="p-3">Orchard & Block</th>
                  <th className="p-3">Harvest Date</th>
                  <th className="p-3">Total Yield (KG)</th>
                  <th className="p-3">Available (KG)</th>
                  <th className="p-3">Sold (KG)</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 font-medium">
                      Loading orchard harvest batches...
                    </td>
                  </tr>
                ) : batches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 font-medium">
                      No harvest batches recorded.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono font-bold text-[#113824]">{b.batch_code}</td>
                      <td className="p-3 font-bold text-gray-900">{b.variety_name}</td>
                      <td className="p-3 text-gray-600">
                        {b.orchard_name} ({b.block_code || 'Main Grove'})
                      </td>
                      <td className="p-3 text-gray-500">{b.harvest_date}</td>
                      <td className="p-3 font-black text-gray-900">{formatNumber(b.total_yield_kg)}</td>
                      <td className="p-3 font-black text-emerald-800">{formatNumber(b.available_kg)}</td>
                      <td className="p-3 font-bold text-gray-700">{formatNumber(b.sold_kg)}</td>
                      <td className="p-3">
                        <span className="bg-[#113824]/10 text-[#113824] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Audit Ledger Stream */}
        <div className="card-luxury rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-[#D97706]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#113824]">
                Immutable Inventory Transaction Ledger
              </h3>
            </div>
            <span className="text-[11px] text-gray-500">Every single movement is recorded</span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
            {loading ? (
              <div className="p-8 text-center text-gray-400 font-medium">Loading inventory transaction ledger...</div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-medium">No inventory movements recorded yet.</div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[#113824]">{tx.package_name}</span>
                      <span className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-gray-600 font-mono">
                        {tx.transaction_type}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-0.5">{tx.reason}</div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-black text-xs ${
                        tx.quantity > 0 ? 'text-emerald-700' : 'text-amber-800'
                      }`}
                    >
                      {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} boxes
                    </span>
                    <div className="text-[10px] text-gray-400">
                      Balance After: {tx.balance_after} • {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Manual Stock Adjustment Modal */}
        {adjustModalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <div className="text-[10px] tracking-widest text-[#D97706] font-bold uppercase">
                    AUDITED STOCK ADJUSTMENT
                  </div>
                  <h3 className="font-serif font-bold text-base text-[#113824]">
                    {selectedItem.variety_name} - {selectedItem.package_name}
                  </h3>
                </div>
                <button onClick={() => setAdjustModalOpen(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Current Available Stock:</label>
                  <div className="text-sm font-bold text-gray-900 bg-gray-50 p-2.5 rounded-xl border">
                    {selectedItem.available_stock} boxes
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">New Available Stock Count:</label>
                  <input
                    type="number"
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold text-[#113824]"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Mandatory Reason for Adjustment (Logged in Audit Ledger):
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Dawn picking fresh harvest restock / Quality inspection damage write-off..."
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold"
                  >
                    {isSubmitting ? 'Recording...' : 'Commit Adjustment'}
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

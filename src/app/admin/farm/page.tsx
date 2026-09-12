'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Sprout, MapPin, Plus, X, Award, CheckCircle } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

export default function AdminFarmPage() {
  const [orchards, setOrchards] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [addBatchModal, setAddBatchModal] = useState(false);
  const [batchCode, setBatchCode] = useState('');
  const [varietyId, setVarietyId] = useState('var-chaunsa');
  const [orchardId, setOrchardId] = useState('');
  const [totalYieldKg, setTotalYieldKg] = useState('2500');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const fetchFarmData = () => {
    setLoading(true);
    fetch('/api/admin/farm')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrchards(data.orchards);
          setBlocks(data.blocks);
          setBatches(data.batches);
          if (data.orchards.length > 0) setOrchardId(data.orchards[0].id);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFarmData();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchCode,
          varietyId,
          orchardId,
          harvestDate,
          totalYieldKg: Number(totalYieldKg),
          notes
        })
      });
      const data = await res.json();
      if (data.success) {
        setAddBatchModal(false);
        setBatchCode('');
        setNotes('');
        fetchFarmData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-black text-[#113824]">
              Farm & Orchard Yield Management
            </h1>
            <p className="text-xs text-gray-500">
              Connect real orchard trees, soil blocks, and dawn-harvested batches to online store inventory.
            </p>
          </div>

          <button
            onClick={() => setAddBatchModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold shadow-xs flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record New Harvest Batch</span>
          </button>
        </div>

        {/* Orchards Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {orchards.map((o) => (
            <div key={o.id} className="card-luxury rounded-2xl bg-white border border-gray-200 p-6 space-y-3 shadow-xs">
              <div className="flex justify-between items-start">
                <h3 className="font-serif font-bold text-base text-[#113824]">{o.name}</h3>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {o.total_acres} Acres
                </span>
              </div>
              <div className="text-xs text-gray-500 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-[#D97706]" />
                <span>{o.location}</span>
              </div>
              <div className="text-xs text-gray-600 space-y-1 pt-2 border-t">
                <div><strong>Manager:</strong> {o.manager_name} ({o.contact_phone})</div>
                <div><strong>Soil:</strong> {o.soil_type}</div>
                <div><strong>Water Source:</strong> {o.irrigation_source}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Harvest Batches */}
        <div className="card-luxury rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b bg-gray-50 text-xs font-bold text-[#113824]">
            Recorded Orchard Harvest Batches
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b text-gray-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Batch Code</th>
                <th className="p-3">Cultivar</th>
                <th className="p-3">Orchard Origin</th>
                <th className="p-3">Harvest Date</th>
                <th className="p-3">Total Yield (KG)</th>
                <th className="p-3">Available (KG)</th>
                <th className="p-3">Wastage (KG)</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono font-bold text-[#113824]">{b.batch_code}</td>
                  <td className="p-3 font-bold">{b.variety_name}</td>
                  <td className="p-3 text-gray-600">{b.orchard_name}</td>
                  <td className="p-3 text-gray-500">{b.harvest_date}</td>
                  <td className="p-3 font-black">{formatNumber(b.total_yield_kg)}</td>
                  <td className="p-3 font-black text-emerald-800">{formatNumber(b.available_kg)}</td>
                  <td className="p-3 text-red-600">{b.wastage_kg}</td>
                  <td className="p-3 font-bold text-[#113824]">{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Batch Modal */}
        {addBatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-serif font-bold text-base text-[#113824]">Record Harvest Batch</h3>
                <button onClick={() => setAddBatchModal(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Batch Code (e.g. CH-2026-04):</label>
                  <input
                    type="text"
                    required
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    placeholder="CH-2026-04"
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Orchard Estate:</label>
                  <select
                    value={orchardId}
                    onChange={(e) => setOrchardId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold"
                  >
                    {orchards.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Total Yield (KG):</label>
                  <input
                    type="number"
                    required
                    value={totalYieldKg}
                    onChange={(e) => setTotalYieldKg(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddBatchModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold"
                  >
                    Record Batch
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

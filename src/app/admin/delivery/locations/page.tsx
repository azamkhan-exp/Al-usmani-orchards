'use client';

import React, { useState, useEffect, useTransition } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  MapPin,
  Search,
  Filter,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Banknote,
  Truck,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
  Globe
} from 'lucide-react';
import { safeFetchJson } from '@/lib/api-client';

interface PakistanLocation {
  id: string;
  province: string;
  division?: string | null;
  district: string;
  tehsil?: string | null;
  city: string;
  area?: string | null;
  postal_code?: string | null;
  delivery_fee: number;
  estimated_delivery_days: string;
  cod_available: number;
  is_serviceable: number;
  is_active: number;
  courier_code?: string | null;
}

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<PakistanLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_locations: 0,
    active_count: 0,
    serviceable_count: 0,
    cod_count: 0,
    provinces_count: 0
  });

  const [provinces, setProvinces] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [serviceableFilter, setServiceableFilter] = useState<'ALL' | 'SERVICEABLE' | 'UNSERVICEABLE'>('ALL');
  const [codFilter, setCodFilter] = useState<'ALL' | 'COD' | 'PREPAID'>('ALL');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Edit / Add Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<PakistanLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [formProvince, setFormProvince] = useState('Punjab');
  const [formDivision, setFormDivision] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formPostalCode, setFormPostalCode] = useState('');
  const [formDeliveryFee, setFormDeliveryFee] = useState(350);
  const [formDeliveryDays, setFormDeliveryDays] = useState('24 - 48 Hours');
  const [formCod, setFormCod] = useState(true);
  const [formServiceable, setFormServiceable] = useState(true);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/locations?page=${page}&limit=25`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (selectedProvince) url += `&province=${encodeURIComponent(selectedProvince)}`;
      if (serviceableFilter === 'SERVICEABLE') url += `&serviceableOnly=true`;
      if (codFilter === 'COD') url += `&codOnly=true`;

      const res = await safeFetchJson<any>(url);
      if (res && res.success) {
        setLocations(res.locations || []);
        setTotalPages(res.totalPages || 1);
        if (res.summary) setSummary(res.summary);
        if (res.provinces) setProvinces(res.provinces);
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [page, selectedProvince, serviceableFilter, codFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLocations();
  };

  const handleOpenAddModal = () => {
    setEditingLocation(null);
    setFormProvince('Punjab');
    setFormDivision('');
    setFormDistrict('');
    setFormCity('');
    setFormArea('');
    setFormPostalCode('');
    setFormDeliveryFee(350);
    setFormDeliveryDays('24 - 48 Hours');
    setFormCod(true);
    setFormServiceable(true);
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (loc: PakistanLocation) => {
    setEditingLocation(loc);
    setFormProvince(loc.province);
    setFormDivision(loc.division || '');
    setFormDistrict(loc.district);
    setFormCity(loc.city);
    setFormArea(loc.area || '');
    setFormPostalCode(loc.postal_code || '');
    setFormDeliveryFee(loc.delivery_fee);
    setFormDeliveryDays(loc.estimated_delivery_days);
    setFormCod(loc.cod_available === 1);
    setFormServiceable(loc.is_serviceable === 1);
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      const payload = {
        province: formProvince,
        division: formDivision,
        district: formDistrict,
        city: formCity,
        area: formArea,
        postal_code: formPostalCode,
        delivery_fee: Number(formDeliveryFee),
        estimated_delivery_days: formDeliveryDays,
        cod_available: formCod,
        is_serviceable: formServiceable
      };

      if (editingLocation) {
        const res = await fetch('/api/admin/locations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingLocation.id, ...payload })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update location.');
        setSuccessMsg(`Location "${formCity}" updated successfully.`);
      } else {
        const res = await fetch('/api/admin/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create location.');
        setSuccessMsg(`Location "${formCity}" created successfully.`);
      }

      setModalOpen(false);
      fetchLocations();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Error saving location.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCOD = async (loc: PakistanLocation) => {
    try {
      await fetch('/api/admin/locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loc.id, cod_available: loc.cod_available === 1 ? false : true })
      });
      fetchLocations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleServiceable = async (loc: PakistanLocation) => {
    try {
      await fetch('/api/admin/locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loc.id, is_serviceable: loc.is_serviceable === 1 ? false : true })
      });
      fetchLocations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeactivate = async (loc: PakistanLocation) => {
    if (!confirm(`Are you sure you want to archive "${loc.city}, ${loc.district}"? This will deactivate it from checkout while preserving historical orders.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/locations?id=${loc.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Location "${loc.city}" deactivated.`);
        fetchLocations();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-900 text-amber-400 rounded-xl shadow-sm">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold text-stone-900">Pakistan Locations & Delivery Network</h1>
                <p className="text-sm text-stone-500">
                  Comprehensive delivery coverage across Pakistan provinces, divisions, districts, and cities.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchLocations}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Location
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Metric Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Total Locations</span>
              <Globe className="w-4 h-4 text-stone-400" />
            </div>
            <p className="text-2xl font-bold font-serif text-stone-900 mt-2">{summary.total_locations}</p>
            <p className="text-xs text-stone-500 mt-1">Across {summary.provinces_count} provinces & territories</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Active & Express</span>
              <Truck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold font-serif text-emerald-900 mt-2">{summary.serviceable_count}</p>
            <p className="text-xs text-emerald-700 mt-1">Direct cold-chain service</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">COD Enabled</span>
              <Banknote className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold font-serif text-amber-900 mt-2">{summary.cod_count}</p>
            <p className="text-xs text-amber-700 mt-1">Cash on Delivery available</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Service Coverage</span>
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold font-serif text-stone-900 mt-2">
              {summary.total_locations > 0 ? Math.round((summary.serviceable_count / summary.total_locations) * 100) : 0}%
            </p>
            <p className="text-xs text-stone-500 mt-1">Nationwide service ratio</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search city, district, province, area, postal code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors shrink-0"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value);
                setPage(1);
              }}
              className="text-xs py-2 px-3 border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
            >
              <option value="">All Provinces & Regions</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              value={serviceableFilter}
              onChange={(e) => {
                setServiceableFilter(e.target.value as any);
                setPage(1);
              }}
              className="text-xs py-2 px-3 border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
            >
              <option value="ALL">All Service Status</option>
              <option value="SERVICEABLE">Serviceable Only</option>
              <option value="UNSERVICEABLE">Unserviceable Only</option>
            </select>

            <select
              value={codFilter}
              onChange={(e) => {
                setCodFilter(e.target.value as any);
                setPage(1);
              }}
              className="text-xs py-2 px-3 border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
            >
              <option value="ALL">All Payments</option>
              <option value="COD">COD Supported</option>
              <option value="PREPAID">Prepaid Only</option>
            </select>
          </div>
        </div>

        {/* Locations Table */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 text-xs uppercase font-semibold text-stone-500 border-b border-stone-200">
                <tr>
                  <th className="px-5 py-3.5">City / Town</th>
                  <th className="px-5 py-3.5">District & Province</th>
                  <th className="px-5 py-3.5">Standard Fee</th>
                  <th className="px-5 py-3.5">Transit Window</th>
                  <th className="px-5 py-3.5">COD Status</th>
                  <th className="px-5 py-3.5">Express Network</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-stone-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stone-400 mb-2" />
                      Loading delivery locations...
                    </td>
                  </tr>
                ) : locations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-stone-500">
                      No matching locations found.
                    </td>
                  </tr>
                ) : (
                  locations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-stone-900">
                        <div>{loc.city}</div>
                        {loc.area && <span className="text-xs text-stone-500 font-normal">{loc.area}</span>}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="text-stone-800">{loc.district}</div>
                        <span className="text-xs text-stone-500 font-normal">{loc.province}</span>
                      </td>

                      <td className="px-5 py-3.5 font-semibold text-stone-900">
                        PKR {loc.delivery_fee.toLocaleString()}
                      </td>

                      <td className="px-5 py-3.5 text-xs text-stone-600">
                        <div className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          {loc.estimated_delivery_days}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleToggleCOD(loc)}
                          title="Click to toggle Cash on Delivery"
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            loc.cod_available === 1
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {loc.cod_available === 1 ? 'COD Enabled' : 'Prepaid Only'}
                        </button>
                      </td>

                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleToggleServiceable(loc)}
                          title="Click to toggle express serviceability"
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            loc.is_serviceable === 1
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {loc.is_serviceable === 1 ? 'Serviceable' : 'Special Inquiry'}
                        </button>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(loc)}
                            className="p-1.5 text-stone-500 hover:text-emerald-900 hover:bg-stone-100 rounded-lg transition-colors"
                            title="Edit location"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeactivate(loc)}
                            className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Archive location"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
              <div>
                Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-100 transition-colors inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-100 transition-colors inline-flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Add/Edit Location */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between p-5 border-b border-stone-200 bg-stone-50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-900 text-amber-400 rounded-lg">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-bold text-stone-900">
                      {editingLocation ? 'Edit Delivery Location' : 'Add New Pakistan Location'}
                    </h3>
                    <p className="text-xs text-stone-500">Configure logistics, delivery fee, and transit times.</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-200/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveLocation} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Province / Region *</label>
                    <select
                      value={formProvince}
                      onChange={(e) => setFormProvince(e.target.value)}
                      className="w-full text-xs py-2 px-3 border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    >
                      <option value="Punjab">Punjab</option>
                      <option value="Islamabad Capital Territory">Islamabad Capital Territory</option>
                      <option value="Sindh">Sindh</option>
                      <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                      <option value="Balochistan">Balochistan</option>
                      <option value="Azad Jammu & Kashmir">Azad Jammu & Kashmir</option>
                      <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">District *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Multan"
                      value={formDistrict}
                      onChange={(e) => setFormDistrict(e.target.value)}
                      className="w-full text-xs py-2 px-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">City / Town *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shujabad"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="w-full text-xs py-2 px-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Area / Suburb (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Cantt, DHA, Orchard Area"
                      value={formArea}
                      onChange={(e) => setFormArea(e.target.value)}
                      className="w-full text-xs py-2 px-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Delivery Fee (PKR)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={50}
                      value={formDeliveryFee}
                      onChange={(e) => setFormDeliveryFee(Number(e.target.value))}
                      className="w-full text-xs py-2 px-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Estimated Transit Window</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 24 - 36 Hours Cold-Chain"
                      value={formDeliveryDays}
                      onChange={(e) => setFormDeliveryDays(e.target.value)}
                      className="w-full text-xs py-2 px-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                    />
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-800">
                    <input
                      type="checkbox"
                      checked={formCod}
                      onChange={(e) => setFormCod(e.target.checked)}
                      className="rounded border-stone-300 text-emerald-900 focus:ring-emerald-900"
                    />
                    Enable Cash on Delivery (COD) for this location
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-800">
                    <input
                      type="checkbox"
                      checked={formServiceable}
                      onChange={(e) => setFormServiceable(e.target.checked)}
                      className="rounded border-stone-300 text-emerald-900 focus:ring-emerald-900"
                    />
                    Mark as actively serviceable in express delivery network
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-medium text-white bg-emerald-900 hover:bg-emerald-800 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
                  >
                    {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {editingLocation ? 'Update Location' : 'Create Location'}
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

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  ShieldAlert,
  Sparkles,
  MapPin,
  Tag,
  CreditCard,
  ChevronRight,
  Layers,
  FileText,
  Search,
  Percent,
  Inbox,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatPKR, formatPKRCompact, formatStock, formatNumber } from '@/lib/formatters';
import { safeFetchJson } from '@/lib/api-client';

const VARIETY_COLORS = ['#113824', '#D97706', '#195235', '#F59E0B', '#059669', '#6B7280'];

type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'this_year' | 'custom';
type ChartMetric = 'revenue' | 'orders' | 'aov';
type ProductSort = 'revenue' | 'units' | 'orders';

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'reports'>('analytics');
  const [preset, setPreset] = useState<DatePreset>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [scope, setScope] = useState<'PRODUCTION' | 'DEMO' | 'ALL'>('PRODUCTION');
  const [geoTab, setGeoTab] = useState<'provinces' | 'districts'>('provinces');

  const [chartMetric, setChartMetric] = useState<ChartMetric>('revenue');
  const [productSort, setProductSort] = useState<ProductSort>('revenue');

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reports state
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [reportSearch, setReportSearch] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/analytics?range=${preset}&scope=${scope}`;
      if (preset === 'custom') {
        if (customStart) url += `&startDate=${customStart}`;
        if (customEnd) url += `&endDate=${customEnd}`;
      }

      const res = await safeFetchJson<any>(url);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.error || 'Failed to parse analytics payload');
      }
    } catch (err: any) {
      console.error('Analytics fetch error:', err);
      setError(err?.message || 'Unable to load analytics data from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [preset, customStart, customEnd, scope]);

  const handleExport = async (type: string) => {
    setExportingType(type);
    try {
      let url = `/api/admin/analytics/export?type=${type}&range=${preset}`;
      if (preset === 'custom') {
        if (customStart) url += `&startDate=${customStart}`;
        if (customEnd) url += `&endDate=${customEnd}`;
      }
      // Trigger native download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `al-usmani-${type}-report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Export download error:', e);
    } finally {
      setExportingType(null);
    }
  };

  // Sorted products memo
  const sortedProducts = useMemo(() => {
    if (!data?.products?.all) return [];
    const list = [...data.products.all];
    if (productSort === 'revenue') return list.sort((a, b) => b.revenue - a.revenue);
    if (productSort === 'units') return list.sort((a, b) => b.units_sold - a.units_sold);
    if (productSort === 'orders') return list.sort((a, b) => b.orders_count - a.orders_count);
    return list;
  }, [data?.products?.all, productSort]);

  // Filtered products for reports preview
  const filteredReportProducts = useMemo(() => {
    if (!data?.products?.all) return [];
    if (!reportSearch.trim()) return data.products.all;
    const q = reportSearch.toLowerCase();
    return data.products.all.filter((p: any) =>
      p.name?.toLowerCase().includes(q) || p.variety_name?.toLowerCase().includes(q)
    );
  }, [data?.products?.all, reportSearch]);

  const kpis = data?.kpis;
  const charts = data?.charts;
  const breakdowns = data?.breakdowns;
  const inventoryAlerts = data?.inventoryAlerts || [];
  const discounts = data?.discounts;

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12">
        {/* TOP BAR: Header, Tabs, Global Date Range Filter */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
          <div>
            <div className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-widest text-[#D97706]">
              <span>Executive Commerce Intelligence</span>
              <span>•</span>
              <span>Al Usmani Orchards ERP</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#113824] tracking-tight">
              Analytics & Performance Reports
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Authoritative financial velocity, order funnels, variety preferences, and real-time inventory health.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Tab Selector */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center space-x-1 border border-gray-200">
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'analytics'
                    ? 'bg-[#113824] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Executive Analytics</span>
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'reports'
                    ? 'bg-[#113824] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Reports & Exports</span>
              </button>
            </div>

            {/* Date Range Selector Pill */}
            <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-xl p-1 shadow-xs">
              {(
                [
                  { id: 'today', label: 'Today' },
                  { id: '7d', label: '7D' },
                  { id: '30d', label: '30D' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'this_year', label: 'This Year' }
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    preset === p.id
                      ? 'bg-[#113824] text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setShowCustomModal(true)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center space-x-1 ${
                  preset === 'custom'
                    ? 'bg-[#113824] text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>{preset === 'custom' ? 'Custom Range' : 'More...'}</span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              title="Refresh Analytics from Database"
              className="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-xs transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#D97706]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Production Data Scope Control */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-white border border-stone-200 rounded-2xl text-xs shadow-xs">
          <div className="flex items-center gap-2 text-stone-700">
            <span className={`w-2.5 h-2.5 rounded-full ${
              scope === 'PRODUCTION' ? 'bg-emerald-600 animate-pulse' : scope === 'DEMO' ? 'bg-amber-500' : 'bg-stone-500'
            }`} />
            <span className="font-medium">
              Data Scope: <strong className="text-stone-900">{scope === 'PRODUCTION' ? 'Authoritative Live Production' : scope === 'DEMO' ? 'Synthetic Demo Records' : 'Consolidated (All Records)'}</strong>
            </span>
            <span className="hidden sm:inline text-stone-400">|</span>
            <span className="hidden sm:inline text-stone-500">
              {scope === 'PRODUCTION' ? 'Excludes demo carts & archived orders' : scope === 'DEMO' ? 'Shows isolated pre-launch test data' : 'Includes live, demo, and archived data'}
            </span>
          </div>

          <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200">
            <button
              onClick={() => setScope('PRODUCTION')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                scope === 'PRODUCTION'
                  ? 'bg-emerald-900 text-amber-300 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              PRODUCTION
            </button>
            <button
              onClick={() => setScope('DEMO')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                scope === 'DEMO'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-300" />
              DEMO / TEST
            </button>
            <button
              onClick={() => setScope('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                scope === 'ALL'
                  ? 'bg-stone-800 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-stone-400" />
              ALL (Consolidated)
            </button>
          </div>
        </div>

        {/* Custom Date Modal */}
        {showCustomModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-[#113824] text-sm flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-[#D97706]" />
                  <span>Select Date Range</span>
                </h3>
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-700">
                <button
                  onClick={() => { setPreset('yesterday'); setShowCustomModal(false); }}
                  className="p-2.5 rounded-xl border border-gray-200 hover:border-[#113824] text-left hover:bg-emerald-50/40"
                >
                  Yesterday
                </button>
                <button
                  onClick={() => { setPreset('last_month'); setShowCustomModal(false); }}
                  className="p-2.5 rounded-xl border border-gray-200 hover:border-[#113824] text-left hover:bg-emerald-50/40"
                >
                  Last Month
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Custom Boundaries</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#113824]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#113824]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setPreset('custom');
                    setShowCustomModal(false);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-[#113824] text-white text-xs font-bold hover:bg-[#195235]"
                >
                  Apply Custom Range
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LOADING SKELETON */}
        {loading && !data && (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
              ))}
            </div>
            <div className="h-80 bg-gray-200 rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="h-64 bg-gray-200 rounded-2xl" />
              <div className="h-64 bg-gray-200 rounded-2xl" />
              <div className="h-64 bg-gray-200 rounded-2xl" />
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {error && !loading && (
          <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start space-x-4 shadow-xs">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h3 className="font-bold text-sm">Unable to load analytics</h3>
              <p className="text-xs text-red-700">{error}</p>
              <button
                onClick={fetchAnalytics}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all inline-flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        {data && !error && (
          <>
            {activeTab === 'analytics' ? (
              <div className="space-y-8">
                {/* 1. TOP 4 PRIMARY KPI CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Revenue Card */}
                  <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Revenue</span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-serif font-black text-[#113824]">
                        {formatPKR(kpis.revenue.current)}
                      </div>
                      <div className="flex items-center space-x-1 text-xs mt-1">
                        {kpis.revenue.changePercent >= 0 ? (
                          <span className="text-emerald-700 font-bold flex items-center">
                            <TrendingUp className="w-3 h-3 mr-0.5" />
                            +{kpis.revenue.changePercent}%
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold flex items-center">
                            <TrendingDown className="w-3 h-3 mr-0.5" />
                            {kpis.revenue.changePercent}%
                          </span>
                        )}
                        <span className="text-gray-400 text-[11px]">vs previous period</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-1 text-[11px] text-gray-500">
                      <div>Today: <span className="font-bold text-gray-800">{formatPKRCompact(kpis.revenue.today)}</span></div>
                      <div>This Month: <span className="font-bold text-gray-800">{formatPKRCompact(kpis.revenue.thisMonth)}</span></div>
                    </div>
                  </div>

                  {/* Orders Card */}
                  <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Orders</span>
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-serif font-black text-[#113824]">
                        {formatNumber(kpis.orders.current)} <span className="text-sm font-sans font-normal text-gray-500">orders</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs mt-1">
                        {kpis.orders.changePercent >= 0 ? (
                          <span className="text-emerald-700 font-bold flex items-center">
                            <TrendingUp className="w-3 h-3 mr-0.5" />
                            +{kpis.orders.changePercent}%
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold flex items-center">
                            <TrendingDown className="w-3 h-3 mr-0.5" />
                            {kpis.orders.changePercent}%
                          </span>
                        )}
                        <span className="text-gray-400 text-[11px]">vs previous period</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                      <div>Pending: <span className="font-bold text-amber-700">{kpis.orders.pending}</span></div>
                      <div>Delivered: <span className="font-bold text-emerald-700">{kpis.orders.completed}</span></div>
                      <div>Cancelled: <span className="font-bold text-rose-600">{kpis.orders.cancelled}</span></div>
                    </div>
                  </div>

                  {/* Customers Card */}
                  <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Customers</span>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-serif font-black text-[#113824]">
                        {formatNumber(kpis.customers.total)} <span className="text-sm font-sans font-normal text-gray-500">patrons</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs mt-1">
                        <span className="text-emerald-700 font-bold">+{kpis.customers.new} new</span>
                        <span className="text-gray-400 text-[11px]">in selected period</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                      <div>Returning: <span className="font-bold text-blue-800">{kpis.customers.returning}</span></div>
                      <div>Growth: <span className="font-bold text-emerald-700">+{kpis.customers.growthRate}%</span></div>
                    </div>
                  </div>

                  {/* Products & Inventory Card */}
                  <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Catalog & Stock</span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                        <Package className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-serif font-black text-[#113824]">
                        {kpis.products.active} <span className="text-sm font-sans font-normal text-gray-500">active products</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs mt-1">
                        <span className="text-gray-500 text-[11px]">{formatNumber(kpis.products.totalStockUnits)} crates in reserve</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      {kpis.products.outOfStock > 0 ? (
                        <span className="text-rose-600 font-bold flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-0.5" />
                          {kpis.products.outOfStock} Out of Stock
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold flex items-center">
                          <CheckCircle className="w-3 h-3 mr-0.5" />
                          Stock Healthy
                        </span>
                      )}
                      {kpis.products.lowStock > 0 && (
                        <span className="text-amber-700 font-bold">
                          {kpis.products.lowStock} Low Stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. REVENUE & PERFORMANCE TIME-SERIES CHART */}
                <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-[#113824] flex items-center space-x-2">
                        <span>Revenue & Commerce Velocity</span>
                        <span className="text-xs font-normal text-gray-400">({data.dateRange.label})</span>
                      </h3>
                      <p className="text-xs text-gray-500">
                        Daily sales throughput, customer order frequency, and average order value.
                      </p>
                    </div>

                    {/* Chart Metric Toggle */}
                    <div className="bg-gray-100 p-1 rounded-xl flex items-center space-x-1 border border-gray-200 self-start sm:self-auto">
                      <button
                        onClick={() => setChartMetric('revenue')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          chartMetric === 'revenue'
                            ? 'bg-[#113824] text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Revenue (PKR)
                      </button>
                      <button
                        onClick={() => setChartMetric('orders')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          chartMetric === 'orders'
                            ? 'bg-[#113824] text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Orders
                      </button>
                      <button
                        onClick={() => setChartMetric('aov')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          chartMetric === 'aov'
                            ? 'bg-[#113824] text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Average Order Value
                      </button>
                    </div>
                  </div>

                  {charts.timeSeries && charts.timeSeries.length > 0 ? (
                    <div className="h-72 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={charts.timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#113824" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#113824" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#D97706" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis dataKey="display_label" tick={{ fontSize: 11, fill: '#6B7280' }} />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#6B7280' }}
                            tickFormatter={(v) => (chartMetric === 'orders' ? String(v) : `PKR ${(v / 1000).toFixed(0)}k`)}
                          />
                          <Tooltip
                            formatter={(val: any) => [
                              chartMetric === 'orders' ? `${val} orders` : formatPKR(val),
                              chartMetric === 'revenue' ? 'Revenue' : chartMetric === 'orders' ? 'Orders' : 'AOV'
                            ]}
                            contentStyle={{ backgroundColor: '#092115', borderColor: '#195235', borderRadius: '12px', color: '#FDFBF7' }}
                            labelStyle={{ color: '#F59E0B', fontWeight: 'bold' }}
                          />
                          {chartMetric === 'revenue' && (
                            <Area type="monotone" dataKey="revenue" stroke="#113824" strokeWidth={3} fillOpacity={1} fill="url(#emeraldGrad)" />
                          )}
                          {chartMetric === 'orders' && (
                            <Area type="monotone" dataKey="orders" stroke="#D97706" strokeWidth={3} fillOpacity={1} fill="url(#amberGrad)" />
                          )}
                          {chartMetric === 'aov' && (
                            <Area type="monotone" dataKey="aov" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#emeraldGrad)" />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-56 flex flex-col items-center justify-center text-center p-6 border border-dashed border-gray-200 rounded-xl">
                      <Inbox className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-sm font-bold text-gray-600">No sales recorded for this date range</p>
                      <p className="text-xs text-gray-400 mt-0.5">Try selecting a broader date range or place a test order.</p>
                    </div>
                  )}
                </div>

                {/* 3. ORDER CONVERSION FUNNEL & LEAKAGES */}
                <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#113824]">Fulfillment & Order Conversion Funnel</h3>
                      <p className="text-xs text-gray-500">Progression from checkout submission to final customer delivery.</p>
                    </div>
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-rose-600 font-bold">Cancelled: {charts.leakage.cancelled}</span>
                      <span>•</span>
                      <span className="text-red-700 font-bold">Failed: {charts.leakage.failed}</span>
                      <span>•</span>
                      <span className="text-purple-700 font-bold">Refunded: {charts.leakage.refunded}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
                    {charts.funnel.map((step: any, idx: number) => (
                      <div key={step.stage} className="p-4 rounded-xl bg-gray-50 border border-gray-200 relative overflow-hidden flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            <span>Step {idx + 1}</span>
                            <span className="text-[#113824] font-black">{step.conversion_from_start}%</span>
                          </div>
                          <div className="text-sm font-bold text-gray-900">{step.stage}</div>
                        </div>
                        <div className="pt-3">
                          <div className="text-xl font-serif font-black text-[#113824]">{step.count}</div>
                          <div className="text-[10px] text-gray-400">
                            {idx > 0 ? `${step.dropoff_rate}% drop from prev` : 'Total in period'}
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: step.color }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. BREAKDOWNS ROW: Mango Varieties + Payment Methods + Delivery Cities */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Sales by Mango Variety */}
                  <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#113824]">Sales by Mango Variety</h3>
                      <span className="text-[11px] text-gray-400 font-medium">By Revenue</span>
                    </div>

                    <div className="space-y-3">
                      {breakdowns.varietySales && breakdowns.varietySales.length > 0 ? (
                        breakdowns.varietySales.map((v: any, idx: number) => (
                          <div key={v.variety_id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: VARIETY_COLORS[idx % VARIETY_COLORS.length] }}
                                />
                                <span className="font-bold text-gray-900">{v.variety_name}</span>
                                <span className="text-[10px] text-gray-400">({v.origin_city})</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-[#113824]">{formatPKR(v.revenue)}</span>
                                <span className="text-[10px] text-gray-400 ml-1">({v.share_percent}%)</span>
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.max(4, v.share_percent)}%`,
                                  backgroundColor: VARIETY_COLORS[idx % VARIETY_COLORS.length]
                                }}
                              />
                            </div>
                            <div className="text-[10px] text-gray-400 flex justify-between pt-0.5">
                              <span>{formatNumber(v.units_sold)} crates sold</span>
                              <span>{v.orders_count} orders</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-gray-400">No variety sales data</div>
                      )}
                    </div>
                  </div>

                  {/* Sales by Payment Method */}
                  <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#113824]">Payment Gateways & Proofs</h3>
                      <span className="text-[11px] text-gray-400 font-medium">Reconciled</span>
                    </div>

                    <div className="space-y-3">
                      {breakdowns.paymentMethods && breakdowns.paymentMethods.length > 0 ? (
                        breakdowns.paymentMethods.map((pm: any) => (
                          <div key={pm.payment_method} className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-gray-900 flex items-center space-x-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-[#D97706]" />
                                <span>{pm.display_name}</span>
                              </span>
                              <span className="font-bold text-[#113824]">{formatPKR(pm.total_revenue)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-gray-500">
                              <span>{pm.orders_count} transactions ({pm.share_percent}%)</span>
                              <span className="text-emerald-700 font-bold">{pm.paid_count} Paid</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-gray-400">No payment data</div>
                      )}
                    </div>
                  </div>

                  {/* Pakistan Geographic Delivery Analytics */}
                  <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-[#113824] flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-[#D97706]" />
                          <span>Pakistan Geographic Delivery</span>
                        </h3>
                        <p className="text-[11px] text-gray-500">Destination orders & revenue across provinces and hubs</p>
                      </div>

                      {/* View toggle */}
                      <div className="flex items-center p-0.5 bg-stone-100 rounded-lg border border-stone-200 text-[11px] font-bold">
                        <button
                          onClick={() => setGeoTab('provinces')}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            geoTab === 'provinces' ? 'bg-white text-[#113824] shadow-xs' : 'text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          Provinces
                        </button>
                        <button
                          onClick={() => setGeoTab('districts')}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            geoTab === 'districts' ? 'bg-white text-[#113824] shadow-xs' : 'text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          Districts
                        </button>
                      </div>
                    </div>

                    {geoTab === 'provinces' ? (
                      <div className="space-y-3">
                        {breakdowns.provinceAnalytics && breakdowns.provinceAnalytics.length > 0 ? (
                          breakdowns.provinceAnalytics.map((p: any) => (
                            <div key={p.province} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-700" />
                                  {p.province}
                                </span>
                                <div className="text-right">
                                  <span className="font-bold text-[#113824]">{formatPKR(p.total_revenue)}</span>
                                  <span className="text-[10px] text-gray-400 ml-1.5">({p.orders_count} orders)</span>
                                </div>
                              </div>
                              <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-800 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(100, Math.max(4, p.share_percent || 0))}%` }}
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-xs text-gray-400">
                            Province breakdown will populate with order shipping records.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {((breakdowns.districtAnalytics && breakdowns.districtAnalytics.length > 0)
                          ? breakdowns.districtAnalytics
                          : breakdowns.cityAnalytics && breakdowns.cityAnalytics.length > 0
                          ? breakdowns.cityAnalytics
                          : []
                        ).map((d: any, idx: number) => (
                          <div key={d.district || d.city} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-gray-800">{d.district || d.city}</span>
                                {d.province && (
                                  <span className="text-[10px] text-gray-400 block">{d.province}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-gray-900">{formatPKRCompact(d.total_revenue)}</span>
                              <span className="text-[10px] text-gray-400 block">{d.orders_count} orders</span>
                            </div>
                          </div>
                        ))}
                        {(!breakdowns.districtAnalytics || breakdowns.districtAnalytics.length === 0) &&
                         (!breakdowns.cityAnalytics || breakdowns.cityAnalytics.length === 0) && (
                          <div className="py-8 text-center text-xs text-gray-400">
                            District location analytics will populate with order shipping records.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. TOP SELLING PRODUCTS & LOW-PERFORMING PRODUCTS */}
                <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#113824]">Orchard Catalog Performance & Stock Turnover</h3>
                      <p className="text-xs text-gray-500">Evaluate best sellers and identify slow-moving crates needing promotion.</p>
                    </div>

                    {/* Sort buttons */}
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-gray-400">Sort by:</span>
                      <button
                        onClick={() => setProductSort('revenue')}
                        className={`px-2.5 py-1 rounded-lg font-bold ${
                          productSort === 'revenue' ? 'bg-[#113824] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Revenue
                      </button>
                      <button
                        onClick={() => setProductSort('units')}
                        className={`px-2.5 py-1 rounded-lg font-bold ${
                          productSort === 'units' ? 'bg-[#113824] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Crates Sold
                      </button>
                      <button
                        onClick={() => setProductSort('orders')}
                        className={`px-2.5 py-1 rounded-lg font-bold ${
                          productSort === 'orders' ? 'bg-[#113824] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Orders
                      </button>
                    </div>
                  </div>

                  {/* Responsive Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                          <th className="pb-3">Product & Variety</th>
                          <th className="pb-3">Grade</th>
                          <th className="pb-3 text-right">Crates Sold</th>
                          <th className="pb-3 text-right">Orders</th>
                          <th className="pb-3 text-right">Revenue</th>
                          <th className="pb-3 text-right">Sales Share</th>
                          <th className="pb-3 text-right">Current Stock</th>
                          <th className="pb-3 text-center">Turnover Velocity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortedProducts.map((p: any, idx: number) => {
                          const isBest = idx === 0 && p.units_sold > 0;
                          const isSlow = p.units_sold === 0 && p.current_stock > 20;

                          return (
                            <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="py-3.5 pr-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden shrink-0">
                                    <Package className="w-4 h-4 text-[#113824]" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-gray-900">{p.name}</div>
                                    <div className="text-[10px] text-[#D97706] font-medium">{p.variety_name}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 text-gray-600 font-medium">{p.grade}</td>
                              <td className="py-3.5 text-right font-bold text-gray-900">{formatNumber(p.units_sold)}</td>
                              <td className="py-3.5 text-right text-gray-600">{p.orders_count}</td>
                              <td className="py-3.5 text-right font-bold text-[#113824]">{formatPKR(p.revenue)}</td>
                              <td className="py-3.5 text-right text-gray-600">{p.share_percent}%</td>
                              <td className="py-3.5 text-right font-medium text-gray-900">
                                {formatStock(p.current_stock)}
                              </td>
                              <td className="py-3.5 text-center">
                                {isBest ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                                    ★ Top Seller
                                  </span>
                                ) : isSlow ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                                    Slow-Moving
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">
                                    Normal
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 6. INVENTORY ALERTS & PROMOTIONS EFFICIENCY */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Inventory Critical Alerts */}
                  <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#113824] flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                        <span>Inventory & Harvest Alerts</span>
                      </h3>
                      <span className="text-xs font-bold text-gray-500">{inventoryAlerts.length} Attention Required</span>
                    </div>

                    <div className="space-y-2.5">
                      {inventoryAlerts.length > 0 ? (
                        inventoryAlerts.map((item: any) => (
                          <div
                            key={item.inventory_id}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                              item.stock_status === 'OUT_OF_STOCK'
                                ? 'bg-red-50 border-red-200 text-red-900'
                                : 'bg-amber-50 border-amber-200 text-amber-900'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold flex items-center space-x-1.5">
                                <span>{item.product_name}</span>
                                <span className="text-[10px] opacity-75">({item.package_name})</span>
                              </div>
                              <div className="text-[11px] opacity-80">
                                SKU: {item.sku} • Threshold: {item.low_stock_threshold} crates
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  item.stock_status === 'OUT_OF_STOCK'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-amber-600 text-white'
                                }`}
                              >
                                {item.stock_status === 'OUT_OF_STOCK' ? 'Out of Stock' : `⚠ Low: ${item.available_stock} left`}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-emerald-700 flex flex-col items-center">
                          <CheckCircle className="w-6 h-6 mb-1 text-emerald-600" />
                          <span>All orchard crate inventory levels are currently optimal.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Discounts & Voucher Efficiency */}
                  <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#113824] flex items-center space-x-2">
                        <Tag className="w-4 h-4 text-[#D97706]" />
                        <span>Discounts & Promotions Efficiency</span>
                      </h3>
                      <span className="text-xs font-bold text-emerald-700">Active Campaigns</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold">Gross Sales</div>
                        <div className="text-sm font-black text-gray-900">{formatPKRCompact(discounts?.grossSales)}</div>
                      </div>
                      <div className="border-x border-gray-200">
                        <div className="text-[10px] text-rose-600 uppercase font-bold">- Discounts</div>
                        <div className="text-sm font-black text-rose-600">{formatPKRCompact(discounts?.totalDiscounts)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-700 uppercase font-bold">= Net Sales</div>
                        <div className="text-sm font-black text-emerald-800">{formatPKRCompact(discounts?.netSales)}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Top Coupon Codes Used</div>
                      {discounts?.topCoupons && discounts.topCoupons.length > 0 ? (
                        discounts.topCoupons.map((c: any) => (
                          <div key={c.coupon_code} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50">
                            <div>
                              <span className="font-mono font-bold text-[#113824] bg-white px-2 py-0.5 rounded border border-gray-200">
                                {c.coupon_code}
                              </span>
                              <span className="text-[11px] text-gray-500 ml-2">{c.times_used} uses</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-emerald-700">{formatPKR(c.order_revenue)}</span>
                              <span className="text-[10px] text-rose-600 block">Saved {formatPKRCompact(c.total_discount_amount)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-xs text-gray-400">No discount codes utilized in this period</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* REPORTS & DATA EXPORTS TAB */
              <div className="space-y-8">
                {/* 7 Report Export Cards */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#113824]">Downloadable Operations & Financial Audits</h3>
                      <p className="text-xs text-gray-500">
                        Generate clean, sanitized CSV spreadsheets directly from SQLite for accounting and harvest reconciliation.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#D97706] bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      RFC 4180 UTF-8 Validated
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                    {[
                      {
                        type: 'sales',
                        title: 'Sales Ledger Report',
                        desc: 'Complete chronological orders with gross, discounts, shipping fee, and net total amount.',
                        icon: DollarSign
                      },
                      {
                        type: 'orders',
                        title: 'Fulfillment & Logistics Report',
                        desc: 'Customer contact details, courier assignments, tracking codes, and status timeline.',
                        icon: Truck
                      },
                      {
                        type: 'products',
                        title: 'Product Performance Report',
                        desc: 'Sales volume per mango variety and package size, inventory levels, and gross margins.',
                        icon: Package
                      },
                      {
                        type: 'customers',
                        title: 'Customer Directory & LTV',
                        desc: 'All customer CRM profiles, order frequencies, lifetime spend, and geographical cities.',
                        icon: Users
                      },
                      {
                        type: 'inventory',
                        title: 'Inventory & Harvest Audit',
                        desc: 'Stock on hand, reserved crates, threshold warnings, and warehouse health check.',
                        icon: Layers
                      },
                      {
                        type: 'payments',
                        title: 'Payment Reconciliation Ledger',
                        desc: 'Cross-reference COD receivables, EasyPaisa/JazzCash transaction IDs, and card statuses.',
                        icon: CreditCard
                      },
                      {
                        type: 'discounts',
                        title: 'Promotions & Vouchers Audit',
                        desc: 'Analysis of applied discount codes, coupon lifetime performance, and margin impact.',
                        icon: Tag
                      }
                    ].map((rep) => {
                      const Icon = rep.icon;
                      const isExporting = exportingType === rep.type;

                      return (
                        <div key={rep.type} className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-gray-300 transition-all">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#113824] flex items-center justify-center">
                                <Icon className="w-4 h-4" />
                              </div>
                              <h4 className="font-bold text-sm text-[#113824]">{rep.title}</h4>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">{rep.desc}</p>
                          </div>

                          <button
                            onClick={() => handleExport(rep.type)}
                            disabled={isExporting}
                            className="w-full py-2 px-3 rounded-xl bg-gray-50 hover:bg-[#113824] text-gray-700 hover:text-white border border-gray-200 hover:border-[#113824] text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-2xs"
                          >
                            <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
                            <span>{isExporting ? 'Generating CSV...' : 'Download CSV'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive Product Performance Preview Table */}
                <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#113824]">Live Catalog Audit Preview</h3>
                      <p className="text-xs text-gray-500">Real-time table view of products and stock units.</p>
                    </div>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Filter varieties..."
                        value={reportSearch}
                        onChange={(e) => setReportSearch(e.target.value)}
                        className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#113824] w-56"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                          <th className="pb-3">Product Name</th>
                          <th className="pb-3">Variety</th>
                          <th className="pb-3">Grade</th>
                          <th className="pb-3 text-right">Available Crates</th>
                          <th className="pb-3 text-right">Units Sold</th>
                          <th className="pb-3 text-right">Period Revenue</th>
                          <th className="pb-3 text-center">Catalog Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredReportProducts.map((p: any) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="py-3 font-bold text-gray-900">{p.name}</td>
                            <td className="py-3 text-[#D97706] font-medium">{p.variety_name}</td>
                            <td className="py-3 text-gray-600">{p.grade}</td>
                            <td className="py-3 text-right font-bold text-gray-900">{formatStock(p.current_stock)}</td>
                            <td className="py-3 text-right text-gray-600">{formatNumber(p.units_sold)}</td>
                            <td className="py-3 text-right font-bold text-[#113824]">{formatPKR(p.revenue)}</td>
                            <td className="py-3 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

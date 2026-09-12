'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Truck,
  Plus,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { formatPKR } from '@/lib/formatters';

const CHART_COLORS = ['#113824', '#D97706', '#195235', '#F59E0B', '#4B5563'];

export default function AdminOverviewPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/overview')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) setData(resData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-8 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-3 w-32 bg-stone-200 rounded" />
              <div className="h-8 w-64 bg-stone-300 rounded-lg" />
              <div className="h-4 w-96 bg-stone-200 rounded" />
            </div>
            <div className="flex space-x-2">
              <div className="h-9 w-28 bg-stone-200 rounded-xl" />
              <div className="h-9 w-28 bg-stone-200 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
                <div className="h-4 w-24 bg-stone-200 rounded" />
                <div className="h-7 w-32 bg-stone-300 rounded" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 bg-white border border-stone-200 rounded-2xl p-6" />
            <div className="h-72 bg-white border border-stone-200 rounded-2xl p-6" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  const fin = data?.financial || {};
  const cashFlow = data?.cashFlow || [];
  const varietySales = data?.varietySales || [];
  const lowStock = data?.lowStockAlerts || [];
  const recentOrders = data?.recentOrders || [];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page Title & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-[#D97706] uppercase tracking-widest">
              Commercial SaaS & Farm ERP
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#113824]">
              Executive Command Center
            </h1>
            <p className="text-xs text-gray-500">
              Real-time harvest financials, inventory health, courier movements, and profit margin.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/admin/finance"
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-[#113824] hover:bg-gray-50 shadow-xs flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Record Expense</span>
            </Link>

            <Link
              href="/admin/orders"
              className="px-3.5 py-2 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold shadow-xs flex items-center space-x-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Fulfill Orders</span>
            </Link>
          </div>
        </div>

        {/* Top 4 Primary Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Gross Sales */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>Gross Sales (Season)</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#113824]">
              {formatPKR(fin.grossSales || 0)}
            </div>
            <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1 border-t border-gray-100">
              <span>Net Sales: {formatPKR(fin.netSales || 0)}</span>
              <span className="text-emerald-700 font-bold">+{fin.totalOrdersCount} orders</span>
            </div>
          </div>

          {/* Operating Expenses */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>Operating Expenses</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">
              {formatPKR(fin.totalExpenses || 0)}
            </div>
            <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1 border-t border-gray-100">
              <span>Farm Labor, Boxes, Courier</span>
              <span className="text-gray-600 font-bold">8 Categories</span>
            </div>
          </div>

          {/* Net Profit & Margin */}
          <div className="p-5 rounded-2xl bg-[#092115] text-white border border-[#195235] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#F5EEE2]/80">
              <span>Net Profit (P&L)</span>
              <span className="bg-[#F59E0B] text-[#092115] text-[10px] font-black px-2 py-0.5 rounded">
                {fin.profitMarginPercent}% Margin
              </span>
            </div>
            <div className="text-2xl font-black text-[#F59E0B]">
              {formatPKR(fin.netProfit || 0)}
            </div>
            <div className="text-[11px] text-[#F5EEE2]/70 pt-1 border-t border-white/10">
              Gross Profit: {formatPKR(fin.grossProfit || 0)}
            </div>
          </div>

          {/* Pending COD Receivable */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>Pending Courier COD</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-900">
              {formatPKR(fin.pendingCodRevenue || 0)}
            </div>
            <div className="text-[11px] text-gray-500 flex items-center justify-between pt-1 border-t border-gray-100">
              <span>In Transit with TCS & Leopards</span>
              <Link href="/admin/finance" className="text-[#D97706] font-bold hover:underline">
                Reconcile →
              </Link>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Monthly Cash Flow Inflow vs Outflow */}
          <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#113824]">Cash Flow Analysis (Inflow vs Outflow)</h3>
                <div className="text-xs text-gray-500">Paid customer receipts vs operational payments</div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                Positive Net Flow
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlow.length > 0 ? cashFlow : [{ month: 'Current', inflow: fin.netSales, outflow: fin.totalExpenses }]}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `PKR ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: any) => formatPKR(val)} />
                  <Bar dataKey="inflow" name="Cash Inflow" fill="#113824" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflow" name="Cash Outflow" fill="#D97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mango Variety Sales Breakdown */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#113824]">Sales by Mango Variety</h3>
              <div className="text-xs text-gray-500">Revenue share across cultivars</div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={varietySales}
                    dataKey="total_revenue"
                    nameKey="variety_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {varietySales.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatPKR(val)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts & Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-8 p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#113824]">Recent Harvest Orders</h3>
                <div className="text-xs text-gray-500">Active customer and wholesale consignments</div>
              </div>
              <Link href="/admin/orders" className="text-xs font-bold text-[#D97706] hover:underline">
                View All Orders →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="pb-3">Order #</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">City</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-gray-50">
                      <td className="py-3 font-mono font-bold text-[#113824]">{ord.order_number}</td>
                      <td className="py-3 font-medium text-gray-900">{ord.customer_name}</td>
                      <td className="py-3 text-gray-500">{ord.city}</td>
                      <td className="py-3 font-black text-[#113824]">
                        {formatPKR(ord.total_amount)}
                      </td>
                      <td className="py-3">
                        <span className="bg-[#113824]/10 text-[#113824] text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="lg:col-span-4 p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-gray-900">Inventory Threshold Alerts</h3>
            </div>

            {lowStock.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>All package sizes are healthy and above minimum safety thresholds.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStock.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-amber-950">{item.variety_name}</div>
                      <div className="text-[11px] text-amber-800">{item.package_name}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-amber-900 block">
                        {item.available_stock} boxes
                      </span>
                      <span className="text-[10px] text-amber-700">Min: {item.low_stock_threshold}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Link
              href="/admin/inventory"
              className="block text-center py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-[#113824] text-xs font-bold border border-gray-200 transition-colors"
            >
              Open Inventory & Harvest Ledger →
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

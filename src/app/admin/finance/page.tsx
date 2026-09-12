'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  DollarSign,
  TrendingUp,
  Download,
  Plus,
  Truck,
  FileText,
  CheckCircle,
  Clock,
  X,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { formatPKR } from '@/lib/formatters';

export default function AdminFinancePage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PL' | 'EXPENSES' | 'RECEIVABLES' | 'PAYABLES'>('PL');

  // Expense modal state
  const [addExpenseModal, setAddExpenseModal] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFinanceData = () => {
    setLoading(true);
    fetch('/api/admin/finance')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setData(resData);
          if (resData.categories && resData.categories.length > 0) {
            setCategoryId(resData.categories[0].id);
          }
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount || !description) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          amount: Number(amount),
          description,
          vendorName,
          paymentMethod
        })
      });
      const resData = await res.json();
      if (resData.success) {
        setAddExpenseModal(false);
        setAmount('');
        setDescription('');
        setVendorName('');
        fetchFinanceData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    const overview = data.overview || {};
    const rows = [
      ['Metric', 'Amount (PKR)'],
      ['Gross Sales', overview.grossSales || 0],
      ['Total Discounts', overview.totalDiscounts || 0],
      ['Net Sales', overview.netSales || 0],
      ['Paid Revenue', overview.paidRevenue || 0],
      ['Pending COD Revenue', overview.pendingCodRevenue || 0],
      ['Total Refunds', overview.totalRefunds || 0],
      ['Total Operating Expenses', overview.totalExpenses || 0],
      ['Gross Profit', overview.grossProfit || 0],
      ['Net Profit', overview.netProfit || 0],
      ['Profit Margin %', `${overview.profitMarginPercent || 0}%`]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `al_usmani_orchards_pl_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-24 text-center text-xs font-bold text-gray-500">
          Compiling financial ledger...
        </div>
      </AdminLayout>
    );
  }

  const fin = data?.overview || {};
  const expenses = data?.expenses || [];
  const categories = data?.categories || [];
  const receivables = data?.receivables || [];
  const payables = data?.payables || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-black text-[#113824]">
              Finance & Profit Management
            </h1>
            <p className="text-xs text-gray-500">
              ACID financial ledger, real-time Profit & Loss statement, categorized expenses, and COD remittance.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-[#113824] hover:bg-gray-50 shadow-xs flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Export P&L Report (CSV)</span>
            </button>

            <button
              onClick={() => setAddExpenseModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold shadow-xs flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Operating Expense</span>
            </button>
          </div>
        </div>

        {/* Top 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Gross Sales Revenue</span>
            <div className="text-2xl font-black text-[#113824]">
              {formatPKR(fin.grossSales)}
            </div>
            <div className="text-[10px] text-gray-500">Net Sales: {formatPKR(fin.netSales)}</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Operating Expenses</span>
            <div className="text-2xl font-black text-amber-900">
              {formatPKR(fin.totalExpenses)}
            </div>
            <div className="text-[10px] text-gray-500">8 Audited Categories</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#092115] text-white border border-[#195235] shadow-xs space-y-1">
            <div className="flex justify-between items-center text-[11px] font-bold text-[#FBBF24]">
              <span>NET PROFIT (P&L)</span>
              <span>{fin.profitMarginPercent}% Margin</span>
            </div>
            <div className="text-2xl font-black text-[#F59E0B]">
              {formatPKR(fin.netProfit)}
            </div>
            <div className="text-[10px] text-[#F5EEE2]/70">Gross Profit: {formatPKR(fin.grossProfit)}</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Pending COD Receivable</span>
            <div className="text-2xl font-black text-blue-900">
              {formatPKR(fin.pendingCodRevenue)}
            </div>
            <div className="text-[10px] text-gray-500">With TCS & Leopards Overland</div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-gray-100 p-1 w-fit text-xs font-bold">
          <button
            onClick={() => setActiveTab('PL')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'PL' ? 'bg-white text-[#113824] shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Profit & Loss Statement
          </button>
          <button
            onClick={() => setActiveTab('EXPENSES')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'EXPENSES' ? 'bg-white text-[#113824] shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Expense Ledger ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab('RECEIVABLES')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'RECEIVABLES' ? 'bg-white text-[#113824] shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Accounts Receivable (COD)
          </button>
          <button
            onClick={() => setActiveTab('PAYABLES')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'PAYABLES' ? 'bg-white text-[#113824] shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Accounts Payable (Vendors)
          </button>
        </div>

        {/* Tab 1: Real-Time P&L Statement */}
        {activeTab === 'PL' && (
          <div className="card-luxury rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-base font-serif font-bold text-[#113824]">
                  Statement of Profit or Loss — Season 2026
                </h3>
                <div className="text-xs text-gray-500">Live reconciliation based on recorded revenue & audited expenses</div>
              </div>
              <span className="text-xs font-mono font-bold text-gray-500">PKR (Pakistani Rupee)</span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Revenue section */}
              <div className="font-bold text-[#113824] uppercase text-[11px] tracking-wider pt-1">
                I. Revenue & Inflow
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-700">Gross Sales Revenue</span>
                <span className="font-bold">{formatPKR(fin.grossSales)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50 text-emerald-700">
                <span>Less: Promotional & Tiered Discounts</span>
                <span>({formatPKR(fin.totalDiscounts)})</span>
              </div>
              <div className="flex justify-between py-1.5 font-bold bg-gray-50 px-2 rounded">
                <span>Net Sales Revenue</span>
                <span>{formatPKR(fin.netSales)}</span>
              </div>

              {/* Operating Expenses */}
              <div className="font-bold text-[#113824] uppercase text-[11px] tracking-wider pt-4">
                II. Categorized Operating Expenses
              </div>
              {fin.expensesByCategory?.map((exp: any, i: number) => (
                <div key={i} className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-700">{exp.category}</span>
                  <span className="font-medium text-gray-900">
                    {formatPKR(exp.amount)} ({exp.percentage}%)
                  </span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 font-bold bg-amber-50 text-amber-900 px-2 rounded">
                <span>Total Operating Expenses</span>
                <span>{formatPKR(fin.totalExpenses)}</span>
              </div>

              {/* Net Profit Summary */}
              <div className="pt-4 border-t-2 border-gray-200">
                <div className="flex justify-between py-2 text-base font-black text-[#113824] bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
                  <span>NET COMPREHENSIVE PROFIT</span>
                  <span className="text-emerald-800">
                    {formatPKR(fin.netProfit)} ({fin.profitMarginPercent}% Margin)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Expense Ledger */}
        {activeTab === 'EXPENSES' && (
          <div className="card-luxury rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center text-xs">
              <span className="font-bold text-[#113824]">Audited Operational Expense Records</span>
              <button
                onClick={() => setAddExpenseModal(true)}
                className="font-bold text-[#D97706] hover:underline"
              >
                + Add Expense
              </button>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b text-gray-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Vendor / Payee</th>
                  <th className="p-3">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((e: any) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-500">{e.expense_date}</td>
                    <td className="p-3 font-bold text-[#113824]">{e.category_name}</td>
                    <td className="p-3 text-gray-700 max-w-xs">{e.description}</td>
                    <td className="p-3 text-gray-600">{e.vendor_name || 'Direct'}</td>
                    <td className="p-3 font-black text-amber-900">
                      {formatPKR(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Accounts Receivable (COD) */}
        {activeTab === 'RECEIVABLES' && (
          <div className="card-luxury rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b bg-gray-50 text-xs font-bold text-[#113824]">
              Courier COD Reconciliation & Outstanding Invoices
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b text-gray-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Debtor / Consignment</th>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Amount Due</th>
                  <th className="p-3">Amount Collected</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receivables.map((ar: any) => (
                  <tr key={ar.id} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-900">{ar.debtor_name}</td>
                    <td className="p-3 font-mono text-[#113824]">{ar.order_number || 'Direct'}</td>
                    <td className="p-3 font-black text-blue-900">{formatPKR(ar.amount_due)}</td>
                    <td className="p-3 font-medium text-emerald-800">{formatPKR(ar.amount_collected)}</td>
                    <td className="p-3 text-gray-500">{ar.due_date}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ar.status === 'SETTLED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ar.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Accounts Payable */}
        {activeTab === 'PAYABLES' && (
          <div className="card-luxury rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b bg-gray-50 text-xs font-bold text-[#113824]">
              Vendor & Supplier Invoices
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b text-gray-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Vendor</th>
                  <th className="p-3">Bill #</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Amount Due</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payables.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">
                      All supplier bills are settled. Zero overdue liabilities.
                    </td>
                  </tr>
                ) : (
                  payables.map((ap: any) => (
                    <tr key={ap.id}>
                      <td className="p-3 font-bold">{ap.vendor_name}</td>
                      <td className="p-3 font-mono">{ap.bill_no}</td>
                      <td className="p-3">{ap.category}</td>
                      <td className="p-3 font-black">{formatPKR(ap.amount_due)}</td>
                      <td className="p-3">{ap.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Expense Modal */}
        {addExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-serif font-bold text-base text-[#113824]">
                  Record Operating Expense
                </h3>
                <button onClick={() => setAddExpenseModal(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Expense Category:</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold"
                  >
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Amount (PKR):</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 85000"
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Description:</label>
                  <textarea
                    rows={2}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. 500 units ventilated corrugated crates delivery..."
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Vendor / Payee (Optional):</label>
                  <input
                    type="text"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="e.g. Packages Limited"
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddExpenseModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold"
                  >
                    {isSubmitting ? 'Saving...' : 'Record Expense'}
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

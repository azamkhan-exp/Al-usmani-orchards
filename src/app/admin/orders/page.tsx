'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ShoppingBag,
  Search,
  Filter,
  Truck,
  CheckCircle,
  Clock,
  Printer,
  ChevronRight,
  X,
  AlertCircle,
  MapPin,
  FileText,
  Archive
} from 'lucide-react';
import { formatPKR } from '@/lib/formatters';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Dispatch modal states
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [courierId, setCourierId] = useState('cour-tcs');
  const [shippingCost, setShippingCost] = useState('350');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Thermal Slip Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const fetchOrders = () => {
    setLoading(true);
    let url = '/api/admin/orders?';
    if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
    if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setOrders(data.orders);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePayment = async (orderId: string, newPaymentStatus: string) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paymentStatus: newPaymentStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev: any) => ({ ...prev, payment_status: newPaymentStatus }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchiveOrder = async (orderId: string, archive: boolean) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: archive ? 'ARCHIVE' : 'RESTORE' })
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev: any) => ({ ...prev, is_archived: archive ? 1 : 0 }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDispatchOrder = async () => {
    if (!selectedOrder) return;
    setIsDispatching(true);
    setDispatchError(null);

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courierId,
          shippingCost: Number(shippingCost),
          codAmount: selectedOrder.payment_method === 'COD' ? selectedOrder.total_amount : 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setDispatchModalOpen(false);
        setDispatchError(null);
        fetchOrders();
        setSelectedOrder((prev: any) => ({
          ...prev,
          status: 'SHIPPED',
          tracking_number: data.trackingNumber
        }));
      } else {
        setDispatchError(data.error || 'Failed to dispatch order.');
      }
    } catch (e: any) {
      console.error(e);
      setDispatchError(e.message || 'An unexpected network error occurred.');
    } finally {
      setIsDispatching(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'DELIVERED') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (s === 'SHIPPED' || s === 'IN_TRANSIT') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (s === 'PACKING' || s === 'PACKED' || s === 'READY_TO_SHIP' || s === 'READY_FOR_DISPATCH') return 'bg-amber-100 text-amber-800 border-amber-300';
    if (s === 'CONFIRMED' || s === 'PROCESSING') return 'bg-purple-100 text-purple-800 border-purple-300';
    if (s === 'CANCELLED') return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-black text-[#113824]">
              Harvest Order Fulfillment
            </h1>
            <p className="text-xs text-gray-500">
              Manage packing, dispatch, cold-chain couriers, and delivery progression.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Order #, Name, Tracking..."
              className="text-xs px-3.5 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#D97706] w-64"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#113824] text-white text-xs font-bold uppercase tracking-wider"
            >
              Search
            </button>
          </form>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 text-xs">
          {['ALL', 'CONFIRMED', 'PROCESSING', 'PACKING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'ARCHIVED', 'DEMO'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[#113824] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {st === 'READY_TO_SHIP' ? 'READY FOR DISPATCH' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="card-luxury rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer & City</th>
                  <th className="py-3 px-4">Crates</th>
                  <th className="py-3 px-4">Amount & Payment</th>
                  <th className="py-3 px-4">Courier / Tracking</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#113824]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{ord.order_number}</span>
                        {ord.is_demo === 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            DEMO
                          </span>
                        )}
                        {ord.is_archived === 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-200 text-stone-700 border border-stone-300">
                            ARCHIVED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{ord.customer_name}</div>
                      <div className="text-[11px] text-gray-500 flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{ord.city}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-gray-700">
                        {ord.items?.length || 1} variety •{' '}
                        {ord.items?.reduce((acc: number, i: any) => acc + i.quantity, 0)} boxes
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-black text-[#113824]">
                        {formatPKR(ord.total_amount)}
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center space-x-1">
                        <span>{ord.payment_method}</span>
                        <span>•</span>
                        <span
                          className={ord.payment_status === 'PAID' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}
                        >
                          {ord.payment_status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {ord.tracking_number ? (
                        <div>
                          <span className="font-mono text-xs font-bold text-blue-800">
                            {ord.tracking_number}
                          </span>
                          <div className="text-[10px] text-gray-500">{ord.courier_name}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                          ord.status
                        )}`}
                      >
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <a
                          href={`/api/orders/${ord.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Download Order Slip PDF"
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-800 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-[#113824] hover:text-white text-[#113824] font-bold text-xs transition-colors"
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <div className="text-[10px] tracking-widest text-[#D97706] font-bold uppercase">
                    CONSIGNMENT MANAGEMENT
                  </div>
                  <h2 className="text-xl font-serif font-black text-[#113824]">
                    Order #{selectedOrder.order_number}
                  </h2>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={`/api/orders/${selectedOrder.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#113824] hover:bg-gray-200 rounded-lg flex items-center space-x-1 text-xs font-bold border border-gray-200 transition-colors"
                    title="Download Official A4 Slip (PDF)"
                  >
                    <FileText className="w-4 h-4 text-[#D97706]" />
                    <span>PDF Slip</span>
                  </a>
                  <button
                    onClick={() => setPrintModalOpen(true)}
                    className="p-2 text-[#113824] hover:bg-gray-200 rounded-lg flex items-center space-x-1 text-xs font-bold"
                    title="Print Thermal Slip"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Slip</span>
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 text-gray-400 hover:text-gray-700 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 flex-1 text-xs">
                {/* Customer & Address */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px]">Consignee:</span>
                    <div className="font-bold text-gray-900 text-sm">{selectedOrder.customer_name}</div>
                    <div className="text-gray-600">{selectedOrder.customer_phone || selectedOrder.guest_phone}</div>
                    <div className="text-gray-600">{selectedOrder.guest_email}</div>
                  </div>
                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px]">Shipping Address:</span>
                    <div className="text-gray-800 leading-relaxed font-medium">
                      {selectedOrder.shipping_address_json ? (
                        JSON.parse(selectedOrder.shipping_address_json).address
                      ) : (
                        selectedOrder.city
                      )}
                    </div>
                    <div className="font-bold text-[#113824] mt-1">{selectedOrder.city}, Pakistan</div>
                  </div>
                </div>

                {/* Items in order */}
                <div>
                  <h3 className="font-bold text-[#113824] uppercase text-xs mb-2">
                    Harvest Crates ({selectedOrder.items?.length})
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                    {selectedOrder.items?.map((item: any, i: number) => (
                      <div key={i} className="p-3 flex justify-between items-center bg-white">
                        <div>
                          <span className="font-bold text-gray-900">{item.variety_name}</span>
                          <span className="text-gray-500 ml-2">
                            ({item.package_name} × {item.quantity})
                          </span>
                        </div>
                        <span className="font-black text-[#113824]">
                          {formatPKR(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status & Payment Controls */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl border border-gray-200 space-y-2">
                    <span className="font-bold text-gray-700 block">Order Status Workflow:</span>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white font-bold text-[#113824]"
                    >
                      <option value="CONFIRMED">CONFIRMED (Allocation Staged)</option>
                      <option value="PROCESSING">PROCESSING (Dawn Harvest Queue)</option>
                      <option value="PACKING">PACKED / PACKING (Cold Store Nesting)</option>
                      <option value="READY_TO_SHIP">READY FOR DISPATCH</option>
                      <option value="SHIPPED">SHIPPED (With Carrier)</option>
                      <option value="IN_TRANSIT">IN TRANSIT</option>
                      <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED (Release Stock)</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-2xl border border-gray-200 space-y-2">
                    <span className="font-bold text-gray-700 block">Payment State:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900">
                        {formatPKR(selectedOrder.total_amount)} ({selectedOrder.payment_method})
                      </span>
                    </div>
                    {selectedOrder.payment_status === 'PENDING' ? (
                      <button
                        onClick={() => handleUpdatePayment(selectedOrder.id, 'PAID')}
                        className="w-full py-2 rounded-lg bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider"
                      >
                        Verify & Mark as Paid
                      </button>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs">
                        ✓ Payment Confirmed
                      </span>
                    )}
                  </div>
                </div>

                {/* Courier Dispatch Section */}
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-blue-900 font-bold">
                      <Truck className="w-4 h-4" />
                      <span>Cold-Chain Courier Assignment</span>
                    </div>
                    {selectedOrder.tracking_number && (
                      <span className="font-mono font-bold text-blue-950">
                        Consignment #{selectedOrder.tracking_number}
                      </span>
                    )}
                  </div>

                  {!selectedOrder.tracking_number ? (
                    <button
                      onClick={() => setDispatchModalOpen(true)}
                      className="w-full py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs uppercase tracking-wider shadow"
                    >
                      Assign Courier & Generate Consignment Tracking
                    </button>
                  ) : (
                    <div className="text-[11px] text-blue-900">
                      Dispatched with <strong>{selectedOrder.courier_name}</strong>.
                      Live scans are transmitting to customer tracking page.
                    </div>
                  )}
                </div>

                {/* Order Archiving Section */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-stone-800 block">
                      {selectedOrder.is_archived === 1 ? 'Order is Archived' : 'Order is Active'}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {selectedOrder.is_archived === 1
                        ? 'Archived orders are excluded from active sales & fulfillment.'
                        : 'Archive this order to soft-exclude from live revenue.'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleArchiveOrder(selectedOrder.id, selectedOrder.is_archived !== 1)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                      selectedOrder.is_archived === 1
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{selectedOrder.is_archived === 1 ? 'Restore Order' : 'Archive Order'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Courier Dispatch Assignment Modal */}
        {dispatchModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-serif font-bold text-base text-[#113824]">
                  Assign Courier Partner
                </h3>
                <button onClick={() => { setDispatchModalOpen(false); setDispatchError(null); }}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {dispatchError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {dispatchError}
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Select Carrier:</label>
                  <select
                    value={courierId}
                    onChange={(e) => setCourierId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold"
                  >
                    <option value="cour-tcs">TCS Express Cold-Chain</option>
                    <option value="cour-leo">Leopards Courier Overland</option>
                    <option value="cour-mnp">M&P Express Logistics</option>
                    <option value="cour-pakpost">Pakistan Post UMS Urgent Mail</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Freight Shipping Cost (PKR):</label>
                  <input
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-xl text-[11px] text-gray-600">
                  Clicking confirm will generate an automated cold-chain tracking manifest and transition
                  order to <strong>SHIPPED</strong>.
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setDispatchModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispatchOrder}
                  disabled={isDispatching}
                  className="flex-1 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold uppercase"
                >
                  {isDispatching ? 'Generating...' : 'Confirm Dispatch'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Printable Thermal Packing Slip Modal */}
        {printModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 printable-slip">
              <div className="flex justify-between items-center border-b pb-3 no-print">
                <h3 className="font-bold text-sm text-[#113824]">
                  Thermal Packing Slip & Commercial Invoice
                </h3>
                <div className="flex space-x-2">
                  <a
                    href={`/api/orders/${selectedOrder.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-[#D97706] hover:bg-[#b46305] text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors"
                    title="Export High-Resolution A4 PDF Invoice"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Export A4 PDF</span>
                  </a>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1 bg-[#113824] text-white rounded-lg text-xs font-bold"
                  >
                    Print
                  </button>
                  <button onClick={() => setPrintModalOpen(false)}>
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Thermal Slip Content */}
              <div className="font-mono text-xs space-y-3 p-4 border border-dashed border-gray-300 rounded-xl bg-white text-black">
                <div className="text-center border-b pb-2">
                  <div className="font-bold text-sm uppercase">AL USMANI ORCHARDS (PRIVATE) LTD</div>
                  <div className="text-[10px]">Shujabad Road, Multan • Tel: +92 300 8472910</div>
                  <div className="font-black text-xs mt-1">
                    CONSIGNMENT #: {selectedOrder.order_number}
                  </div>
                </div>

                <div className="text-[11px] space-y-1 border-b pb-2">
                  <div>
                    <strong>Consignee:</strong> {selectedOrder.customer_name}
                  </div>
                  <div>
                    <strong>Phone:</strong> {selectedOrder.customer_phone || selectedOrder.guest_phone}
                  </div>
                  <div>
                    <strong>City:</strong> {selectedOrder.city}
                  </div>
                  <div>
                    <strong>Carrier:</strong> {selectedOrder.courier_name || 'TCS Cold-Chain'} (
                    {selectedOrder.tracking_number || 'PENDING'})
                  </div>
                </div>

                <div className="space-y-1 border-b pb-2 text-[11px]">
                  <div className="font-bold uppercase">Harvest Line Items:</div>
                  {selectedOrder.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span>
                        {it.variety_name} ({it.package_name} × {it.quantity})
                      </span>
                      <span>{formatPKR(it.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between font-black text-xs pt-1">
                  <span>TOTAL DUE ({selectedOrder.payment_method}):</span>
                  <span>{formatPKR(selectedOrder.total_amount)}</span>
                </div>

                <div className="text-center text-[9px] pt-2 border-t text-gray-600">
                  100% Tree-Ripened • Zero Carbide • Al Usmani Quality Certified
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

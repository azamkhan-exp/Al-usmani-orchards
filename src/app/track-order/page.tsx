'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import SafeImage from '@/components/ui/SafeImage';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  FileText
} from 'lucide-react';
import { formatPKR, formatDate } from '@/lib/formatters';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const [query, setQuery] = useState(initialRef);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [slipToken, setSlipToken] = useState<string | undefined>(undefined);

  const fetchTracking = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await fetch(`/api/orders/track?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
        setSlipToken(data.slipToken);
      } else {
        setError(data.error || 'No consignment found matching this reference.');
      }
    } catch (err) {
      setError('Unable to fetch tracking data. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRef) {
      fetchTracking(initialRef);
    }
  }, [initialRef]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(query);
  };

  const copyTrackingNumber = (trackingNo: string) => {
    navigator.clipboard.writeText(trackingNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // State pipeline: CONFIRMED -> PROCESSING -> PACKED -> READY_FOR_DISPATCH -> SHIPPED -> OUT_FOR_DELIVERY -> DELIVERED
  const getStepIndex = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'PENDING' || s === 'PAYMENT_PENDING' || s === 'CONFIRMED' || s === 'PAID') return 0;
    if (s === 'PROCESSING') return 1;
    if (s === 'PACKING' || s === 'PACKED') return 2;
    if (s === 'READY_TO_SHIP' || s === 'READY_FOR_DISPATCH') return 3;
    if (s === 'SHIPPED' || s === 'IN_TRANSIT') return 4;
    if (s === 'OUT_FOR_DELIVERY') return 5;
    if (s === 'DELIVERED') return 6;
    return 0;
  };

  const steps = [
    { title: 'Confirmed', desc: 'Allocation queued' },
    { title: 'Processing', desc: 'Dawn-picking at orchard' },
    { title: 'Packed', desc: 'Graded & foam-nested' },
    { title: 'Ready for Dispatch', desc: 'Staged at cold-hub' },
    { title: 'Shipped', desc: 'With cold-chain carrier' },
    { title: 'Out for Delivery', desc: 'Courier van en route' },
    { title: 'Delivered', desc: 'Received at doorstep' }
  ];

  const currentStep = order ? getStepIndex(order.status) : 0;

  // Compute carrier tracking link
  const carrierPortalUrl = order?.tracking_url_template && order?.tracking_number
    ? order.tracking_url_template.replace('{tracking_number}', order.tracking_number)
    : null;

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-xs font-bold text-[#113824] hover:text-[#D97706] mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Orchards Storefront</span>
          </Link>
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#D97706] uppercase tracking-widest">
              Live Consignment Tracker • Al Usmani Orchards
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-black text-[#113824]">
              Track Your Harvest Shipment
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">
              Enter your Order Reference (e.g. <span className="font-mono font-bold text-[#113824]">AUO-10245</span>) or Courier Consignment ID (e.g. <span className="font-mono text-gray-700">TCS-88392011</span>).
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Consignment # (AUO-10245) or Tracking ID..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[#E8DBC5] bg-white text-xs sm:text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#D97706] shadow-xs"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-8 py-3.5 rounded-2xl bg-[#113824] hover:bg-[#195235] text-white text-xs sm:text-sm font-bold uppercase tracking-wider disabled:opacity-40 shadow transition-colors"
          >
            {loading ? 'Locating...' : 'Track'}
          </button>
        </form>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Order Details View */}
        {order && (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="card-luxury p-6 sm:p-8 rounded-3xl bg-white border border-[#E8DBC5] space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
                <div>
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                    Consignment Reference
                  </div>
                  <div className="text-2xl sm:text-3xl font-serif font-black text-[#113824] tracking-wider">
                    {order.order_number}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Booked on {new Date(order.created_at).toLocaleDateString()} • Payment: <strong className="text-gray-700">{order.payment_method === 'COD' ? 'Cash on Delivery' : order.payment_method.replace(/_/g, ' ')}</strong>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/orders/${order.id}/pdf?${slipToken ? `token=${encodeURIComponent(slipToken)}&download=true` : 'download=true'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#FDFBF7] hover:bg-[#F5EEE2] border border-[#E8DBC5] text-[#113824] text-[11px] font-bold uppercase tracking-wider transition-colors shadow-2xs"
                      title="Download Official A4 Consignment Invoice"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#D97706]" />
                      <span>Invoice (PDF)</span>
                    </a>
                    <span className="inline-block bg-[#113824] text-[#FDFBF7] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-xs">
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {order.courier_name && (
                    <div className="flex items-center space-x-2 mt-1">
                      {order.courier_logo && (
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 bg-white p-0.5">
                          <SafeImage
                            src={order.courier_logo}
                            alt={order.courier_name}
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                      <span className="text-xs font-bold text-[#113824]">
                        Carrier: {order.courier_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Courier Tracking Callout */}
              {order.tracking_number && (
                <div className="bg-[#FDFBF7] border border-[#E8DBC5] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    {order.courier_logo ? (
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-200 bg-white p-1 flex-shrink-0">
                        <SafeImage
                          src={order.courier_logo}
                          alt={order.courier_name || 'Courier'}
                          fill
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-xl">
                        🚚
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Consignment Tracking Number ({order.courier_name || 'Carrier Partner'})
                      </div>
                      <div className="text-lg sm:text-xl font-mono font-black text-[#113824] tracking-wider">
                        {order.tracking_number}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => copyTrackingNumber(order.tracking_number)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[#E8DBC5] bg-white text-xs font-bold text-[#113824] hover:bg-gray-50 transition-colors"
                      title="Copy Tracking ID"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                          <span>Copy ID</span>
                        </>
                      )}
                    </button>

                    {carrierPortalUrl && (
                      <a
                        href={carrierPortalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#092115] text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
                      >
                        <span>Track on Carrier</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Visual Step-by-Step Progress Timeline */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Harvest & Delivery Progression
                  </h3>
                  <span className="text-[11px] font-bold text-[#D97706]">
                    Step {currentStep + 1} of {steps.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {steps.map((step, idx) => {
                    const isCompleted = idx <= currentStep;
                    const isCurrent = idx === currentStep;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          isCurrent
                            ? 'bg-[#113824] text-white border-[#113824] shadow-md scale-102 ring-2 ring-[#F59E0B]/50'
                            : isCompleted
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-gray-50 text-gray-400 border-gray-200 opacity-60'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-[10px] font-bold mb-2 ${
                            isCurrent
                              ? 'bg-[#F59E0B] text-[#092115]'
                              : isCompleted
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {isCompleted ? '✓' : idx + 1}
                        </div>
                        <div className="text-[11px] font-bold line-clamp-1">{step.title}</div>
                        <div className="text-[9px] opacity-80 mt-0.5 line-clamp-2">{step.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Courier Tracking Events Stream */}
              {order.trackingEvents && order.trackingEvents.length > 0 && (
                <div className="pt-6 border-t border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#113824] mb-4 flex items-center space-x-1.5">
                    <Truck className="w-4 h-4 text-[#D97706]" />
                    <span>Cold-Chain Carrier Scan Logs</span>
                  </h3>
                  <div className="space-y-3">
                    {order.trackingEvents.map((evt: any, i: number) => (
                      <div key={i} className="flex space-x-3 text-xs bg-[#FDFBF7] p-3 rounded-xl border border-gray-100">
                        <div className="w-2 h-2 rounded-full bg-[#D97706] mt-1.5 flex-shrink-0" />
                        <div>
                          <div className="font-bold text-[#113824]">{evt.description}</div>
                          <div className="text-[11px] text-gray-500">
                            {evt.location} • {formatDate(evt.event_time, 'full')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Timeline History */}
              {order.timeline && order.timeline.length > 0 && (
                <div className="pt-6 border-t border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#113824] mb-3 flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-[#113824]" />
                    <span>Harvest & Order Timeline</span>
                  </h3>
                  <div className="space-y-2">
                    {order.timeline.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-start text-xs p-2.5 rounded-lg bg-gray-50">
                        <div>
                          <div className="font-bold text-[#113824]">{item.title}</div>
                          <div className="text-gray-500 text-[11px]">{item.description}</div>
                        </div>
                        <div className="text-[10px] text-gray-400 whitespace-nowrap ml-4">
                          {formatDate(item.created_at, 'short')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gift Presentation Details */}
              {order.is_gift ? (
                <div className="p-4 rounded-2xl bg-[#FEF3C7] border border-[#FCD34D] text-xs text-[#92400E]">
                  <strong className="block font-bold mb-1">🎁 Royal Gift Consignment:</strong>
                  <div>Recipient: <strong>{order.gift_recipient || 'Honored Recipient'}</strong></div>
                  {order.gift_message && (
                    <div className="italic mt-1 text-[#78350F]">&ldquo;{order.gift_message}&rdquo;</div>
                  )}
                </div>
              ) : null}

              {/* Items in Consignment */}
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#113824] mb-3">
                  Crates in this Consignment
                </h3>
                <div className="space-y-2">
                  {order.items?.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs p-3 rounded-xl bg-[#FDFBF7] border border-[#E8DBC5]"
                    >
                      <div>
                        <span className="font-bold text-[#113824]">{item.variety_name}</span>
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
            </div>

            {/* Assistance Banner */}
            <div className="p-6 rounded-2xl bg-[#F5EEE2] border border-[#E8DBC5] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-700">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-8 h-8 text-[#D97706] flex-shrink-0" />
                <div>
                  <div className="font-bold text-[#113824]">Need Assistance With Your Delivery?</div>
                  <div>Our Multan orchard concierge is active 7 days a week for tracking support.</div>
                </div>
              </div>
              <a
                href="https://wa.me/923008472910"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-xl bg-[#113824] text-white font-bold uppercase tracking-wider text-[11px] hover:bg-[#195235] whitespace-nowrap transition-colors"
              >
                WhatsApp Concierge
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFBF7] py-24 text-center">Loading tracker...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}

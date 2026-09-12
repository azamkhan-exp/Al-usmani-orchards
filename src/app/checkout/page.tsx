'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  CheckCircle,
  Sparkles,
  Gift,
  ArrowRight,
  Printer,
  ChevronLeft,
  Smartphone,
  Clock
} from 'lucide-react';
import { formatPKR } from '@/lib/formatters';
import PakistanLocationSelector, { SelectedLocationDetails } from '@/components/checkout/PakistanLocationSelector';

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    totalBoxes,
    totalWeightKg,
    subtotal,
    appliedCoupon,
    clearCart,
    isGift: cartIsGift,
    giftRecipient: cartGiftRecipient,
    giftMessage: cartGiftMessage
  } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [province, setProvince] = useState('Punjab');
  const [district, setDistrict] = useState('Lahore');
  const [city, setCity] = useState('Lahore');
  const [area, setArea] = useState('');
  const [selectedLoc, setSelectedLoc] = useState<SelectedLocationDetails | null>(null);
  const [streetAddress, setStreetAddress] = useState('');
  const [isGift, setIsGift] = useState(cartIsGift);
  const [giftRecipient, setGiftRecipient] = useState(cartGiftRecipient);
  const [giftMessage, setGiftMessage] = useState(cartGiftMessage);
  const [customerNotes, setCustomerNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('COD');
  const [transactionReference, setTransactionReference] = useState('');
  const [availableMethods, setAvailableMethods] = useState<any[]>([
    {
      code: 'COD',
      name: 'Cash on Delivery (COD)',
      description: 'Pay in cash when your fresh mangoes are delivered to your doorstep.',
      configs: { instructions: 'Pay in cash upon delivery to the courier rider. Please have exact change ready.' }
    },
    {
      code: 'EASYPAISA',
      name: 'EasyPaisa Mobile Transfer',
      description: 'Send payment directly to our official EasyPaisa wallet.',
      configs: { account_name: 'Al Usmani Orchards', account_number: '03001234567', instructions: 'Send payment via EasyPaisa to 03001234567 (Al Usmani Orchards) and enter TID.' }
    },
    {
      code: 'JAZZCASH',
      name: 'JazzCash Mobile Transfer',
      description: 'Transfer payment to our registered JazzCash account.',
      configs: { account_name: 'Al Usmani Orchards', account_number: '03017654321', instructions: 'Send payment via JazzCash to 03017654321 (Al Usmani Orchards) and enter TID.' }
    }
  ]);

  const [calculation, setCalculation] = useState<{
    tieredDiscount: number;
    couponDiscount: number;
    totalDiscount: number;
    shippingFee: number;
    grandTotal: number;
    appliedTierPercent: number;
  }>({
    tieredDiscount: 0,
    couponDiscount: 0,
    totalDiscount: 0,
    shippingFee: 350,
    grandTotal: subtotal + 350,
    appliedTierPercent: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<{
    orderNumber: string;
    orderId: string;
    totalAmount: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Re-calculate discounts and shipping based on city and items
  useEffect(() => {
    if (items.length === 0 && !orderConfirmed) return;

    fetch('/api/cart/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({ packageSizeId: i.packageSizeId, quantity: i.quantity })),
        couponCode: appliedCoupon,
        destinationCity: city
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCalculation(data);
        }
      })
  }, [items, appliedCoupon, city, orderConfirmed]);

  // Load available payment methods dynamically based on cart items
  useEffect(() => {
    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    fetch(`/api/payments/available?product_ids=${productIds.join(',')}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.methods && Array.isArray(data.methods) && data.methods.length > 0) {
          setAvailableMethods(data.methods);
          setPaymentMethod((prev) => {
            if (data.methods.some((m: any) => m.code === prev)) return prev;
            return data.methods[0].code;
          });
        }
      })
      .catch((err) => console.error('Failed to load available payment methods:', err));
  }, [items]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName || !customerEmail || !customerPhone || !streetAddress) {
      setErrorMessage('Please fill in all recipient contact and address details.');
      return;
    }

    if ((paymentMethod === 'EASYPAISA' || paymentMethod === 'JAZZCASH') && !transactionReference.trim()) {
      setErrorMessage(`Please provide the ${paymentMethod === 'EASYPAISA' ? 'EasyPaisa' : 'JazzCash'} Transaction ID (TID) from your payment transfer.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ packageSizeId: i.packageSizeId, quantity: i.quantity })),
          customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            province,
            district,
            city,
            area,
            address: `${streetAddress}${area ? ', ' + area : ''}`
          },
          couponCode: appliedCoupon,
          paymentMethod,
          paymentReference: transactionReference,
          isGift,
          giftRecipient: isGift ? giftRecipient : undefined,
          giftMessage: isGift ? giftMessage : undefined,
          customerNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        setOrderConfirmed({
          orderNumber: data.orderNumber,
          orderId: data.orderId,
          totalAmount: data.totalAmount
        });
        clearCart();
      } else {
        const msg = typeof data.error === 'string' ? data.error : (data.error?.message || data.message || 'Failed to place order. Please check stock availability.');
        setErrorMessage(msg);
      }
    } catch (err) {
      setErrorMessage('An unexpected network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order Confirmed Screen
  if (orderConfirmed) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto card-luxury rounded-3xl p-8 sm:p-12 bg-white border border-[#E8DBC5] text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto text-3xl animate-bounce">
            ✓
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-[#D97706] tracking-widest uppercase">
              Al Usmani Orchards • Harvest Allocation Confirmed
            </span>
            <h1 className="text-3xl font-serif font-black text-[#113824]">
              Shukriya! Your Order is Placed
            </h1>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Your harvest crate has been reserved from our active orchard batch.
              Our master pickers will harvest at dawn and dispatch via cold-chain courier.
            </p>
          </div>

          {/* Reference Card */}
          <div className="p-6 rounded-2xl bg-[#F5EEE2] border border-[#E8DBC5] text-left space-y-3">
            <div className="flex justify-between items-center border-b border-[#E8DBC5] pb-3">
              <span className="text-xs font-bold text-gray-600">Consignment Number:</span>
              <span className="text-base font-black text-[#113824] tracking-wider">
                {orderConfirmed.orderNumber}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-[#E8DBC5] pb-3">
              <span className="text-xs font-bold text-gray-600">Grand Total:</span>
              <span className="text-base font-black text-[#D97706]">
                {formatPKR(orderConfirmed.totalAmount)} ({paymentMethod})
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Recipient City:</span>
              <span className="font-bold text-[#113824]">{city}</span>
            </div>
          </div>

          {(paymentMethod === 'EASYPAISA' || paymentMethod === 'JAZZCASH') && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-left space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{paymentMethod === 'EASYPAISA' ? 'EasyPaisa' : 'JazzCash'} Transfer Awaiting Verification:</span>
              </div>
              <div>Transaction Reference / TID: <strong className="font-mono text-[#113824] bg-white px-2 py-0.5 rounded border border-amber-200">{transactionReference || 'SUBMITTED'}</strong></div>
              <div className="text-[11px] text-amber-800 pt-0.5">
                Our finance team will reconcile your mobile transfer with our orchard merchant ledger. Your harvest crate is reserved.
              </div>
            </div>
          )}

          {paymentMethod === 'COD' && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 text-left space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Cash on Delivery Confirmed:</span>
              </div>
              <div className="text-[11px] text-emerald-800">
                Please have exact cash ready for the courier rider upon cold-chain delivery.
              </div>
            </div>
          )}

          {paymentMethod === 'CARD' && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 text-left space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-blue-950">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Card Payment Authorization:</span>
              </div>
              <div className="text-[11px] text-blue-800">
                Card authorization recorded. Your consignment is queued for morning harvest.
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`/api/orders/${orderConfirmed.orderId}/pdf?public=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs uppercase tracking-wider shadow transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Download Order Slip (PDF)</span>
            </a>
            <Link
              href={`/track-order?ref=${orderConfirmed.orderNumber}`}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#113824] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#195235] shadow transition-colors"
            >
              Track Live Shipment
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gray-100 text-gray-800 font-bold text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors"
            >
              Return to Orchards
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If cart is empty and not confirmed
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] py-24 px-4 text-center space-y-6">
        <div className="text-5xl">🥭</div>
        <h1 className="text-2xl font-serif font-bold text-[#113824]">
          Your cart is empty
        </h1>
        <p className="text-sm text-gray-600">
          Please select your favorite mango varieties before proceeding to checkout.
        </p>
        <Link
          href="/#harvest"
          className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-[#113824] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#195235]"
        >
          <span>Shop The Harvest</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-[#113824] hover:text-[#D97706] mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Orchards</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left: Customer Information & Delivery Details Form */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <span className="text-xs font-bold text-[#D97706] uppercase tracking-widest">
                Express Checkout
              </span>
              <h1 className="text-3xl font-serif font-black text-[#113824] mt-1">
                Recipient & Delivery Details
              </h1>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitOrder} className="space-y-6">
              {/* Recipient Details */}
              <div className="card-luxury p-6 rounded-2xl bg-white border border-[#E8DBC5] space-y-4">
                <h2 className="text-sm font-bold text-[#113824] uppercase tracking-wider border-b border-gray-100 pb-2">
                  1. Contact Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Mian Shahzad Tariq"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Phone (For Courier SMS & Call) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 0300 1234567"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Email Address (For Invoice & Tracking Link) *
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="shahzad@example.com"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                    />
                  </div>
                </div>
              </div>

              {/* Destination Address */}
              <div className="card-luxury p-6 rounded-2xl bg-white border border-[#E8DBC5] space-y-5">
                <h2 className="text-sm font-bold text-[#113824] uppercase tracking-wider border-b border-gray-100 pb-2">
                  2. Destination Address & Cold-Chain Logistics
                </h2>

                <PakistanLocationSelector
                  initialProvince={province}
                  initialDistrict={district}
                  initialCity={city}
                  initialArea={area}
                  onLocationChange={(loc) => {
                    setProvince(loc.province);
                    setDistrict(loc.district);
                    setCity(loc.city);
                    setArea(loc.area);
                    setSelectedLoc(loc);
                  }}
                />

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Complete Street Address & House / Building Details *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="House / Apartment #, Street #, Phase, Neighborhood..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Special Delivery Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="e.g. Leave with gate security / Ring bell twice"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  />
                </div>
              </div>

              {/* Royal Gift Box Option */}
              <div className="card-luxury p-6 rounded-2xl bg-white border border-[#E8DBC5] space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGift}
                    onChange={(e) => setIsGift(e.target.checked)}
                    className="w-4 h-4 text-[#D97706] rounded border-gray-300 focus:ring-[#D97706]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#113824] flex items-center space-x-1.5">
                      <Gift className="w-4 h-4 text-[#D97706]" />
                      <span>Send as a Royal Gift (Gold Ribbon & Handwritten Greeting Card)</span>
                    </span>
                    <span className="text-[11px] text-gray-500 block">
                      Zero prices printed inside box. Delivered with full royal presentation.
                    </span>
                  </div>
                </label>

                {isGift && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Gift Recipient Name
                      </label>
                      <input
                        type="text"
                        value={giftRecipient}
                        onChange={(e) => setGiftRecipient(e.target.value)}
                        placeholder="e.g. Begum & Dr. Tariq"
                        className="w-full text-xs px-3.5 py-2 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Handwritten Message for Parchment Card
                      </label>
                      <textarea
                        rows={2}
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        placeholder="Wishing you health and honeyed sweetness with the first flush of Chaunsa..."
                        className="w-full text-xs px-3.5 py-2 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="card-luxury p-6 rounded-2xl bg-white border border-[#E8DBC5] space-y-4">
                <h2 className="text-sm font-bold text-[#113824] uppercase tracking-wider border-b border-gray-100 pb-2">
                  3. Payment Method
                </h2>

                <div className="space-y-3">
                  {availableMethods.map((method) => {
                    const isSelected = paymentMethod === method.code;
                    const configs = method.configs || {};

                    return (
                      <div
                        key={method.code}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-[#113824]/5 border-[#113824] shadow-sm ring-1 ring-[#113824]'
                            : 'border-[#E8DBC5] hover:bg-gray-50'
                        }`}
                      >
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.code}
                            checked={isSelected}
                            onChange={() => setPaymentMethod(method.code)}
                            className="w-4 h-4 text-[#113824] mt-0.5 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="text-xs font-bold text-[#113824] flex items-center space-x-1.5">
                              {method.code === 'COD' && <Banknote className="w-4 h-4 text-[#D97706]" />}
                              {(method.code === 'EASYPAISA' || method.code === 'JAZZCASH') && (
                                <Smartphone className="w-4 h-4 text-[#D97706]" />
                              )}
                              {method.code === 'CARD' && <CreditCard className="w-4 h-4 text-[#D97706]" />}
                              <span>{method.name}</span>
                            </div>
                            <p className="text-[11px] text-gray-600 mt-0.5">
                              {method.description}
                            </p>
                          </div>
                        </label>

                        {/* Interactive TID submission when manual mobile transfer is selected */}
                        {isSelected && (method.code === 'EASYPAISA' || method.code === 'JAZZCASH') && (
                          <div className="mt-3 pt-3 border-t border-[#E8DBC5] space-y-3 animate-in fade-in">
                            <div className="p-3 bg-[#F5EEE2] rounded-xl text-xs space-y-1 text-[#113824]">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Account Title:</span>
                                <strong className="font-semibold">{configs.account_name || 'Al Usmani Orchards'}</strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Wallet / Mobile Number:</span>
                                <strong className="font-mono text-[#D97706] font-bold text-sm select-all">
                                  {configs.account_number || (method.code === 'EASYPAISA' ? '03001234567' : '03017654321')}
                                </strong>
                              </div>
                              {configs.instructions && (
                                <p className="text-[11px] text-gray-600 pt-1 border-t border-[#E8DBC5]/60 italic">
                                  {configs.instructions}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1">
                                Transaction ID (TID) / Deposit Reference <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={transactionReference}
                                onChange={(e) => setTransactionReference(e.target.value)}
                                placeholder="e.g. 29384729103 or TID from SMS receipt"
                                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8DBC5] bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#D97706]"
                              />
                              <span className="text-[10px] text-gray-500 mt-0.5 block">
                                Enter the reference number generated by your {method.code === 'EASYPAISA' ? 'EasyPaisa' : 'JazzCash'} app to reserve your harvest allocation.
                              </span>
                            </div>
                          </div>
                        )}

                        {isSelected && method.code === 'COD' && (
                          <div className="mt-2.5 pt-2 border-t border-[#E8DBC5]/60 text-[11px] text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              Pay cash directly to the courier rider upon delivery and crate inspection.
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#092115] font-black text-sm tracking-wider uppercase flex items-center justify-center space-x-2 shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Reserving Orchard Crates...</span>
                ) : (
                  <>
                    <span>CONFIRM HARVEST CONSIGNMENT</span>
                    <ArrowRight className="w-4 h-4 font-bold" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right: Order Summary Sidebar */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card-luxury p-6 rounded-3xl bg-white border border-[#E8DBC5] space-y-6 sticky top-28">
              <h2 className="text-base font-serif font-black text-[#113824] border-b border-gray-100 pb-3">
                Order Summary ({totalBoxes} boxes • {totalWeightKg} KG)
              </h2>

              {/* Items List */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.packageSizeId} className="flex space-x-3 items-center text-xs">
                    <img
                      src={item.image || '/images/placeholder-mango.svg'}
                      alt={item.varietyName}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== window.location.origin + '/images/placeholder-mango.svg') {
                          target.src = '/images/placeholder-mango.svg';
                        }
                      }}
                      className="w-12 h-12 rounded-lg object-cover border border-[#E8DBC5]"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-[#113824]">{item.varietyName}</div>
                      <div className="text-gray-500">
                        {item.packageName} × {item.quantity}
                      </div>
                    </div>
                    <div className="font-black text-[#113824]">
                      {formatPKR(item.unitPrice * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 pt-4 border-t border-gray-100 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatPKR(subtotal)}</span>
                </div>

                {calculation.tieredDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Volume Discount ({calculation.appliedTierPercent}%)</span>
                    <span>- {formatPKR(calculation.tieredDiscount)}</span>
                  </div>
                )}

                {calculation.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon ({appliedCoupon})</span>
                    <span>- {formatPKR(calculation.couponDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span>Cold-Chain Shipping ({city})</span>
                  <span>{formatPKR(calculation.shippingFee)}</span>
                </div>

                <div className="flex justify-between text-lg font-black text-[#113824] pt-3 border-t border-gray-200">
                  <span>Grand Total</span>
                  <span className="text-[#D97706]">
                    {formatPKR(calculation.grandTotal)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F5EEE2] border border-[#E8DBC5] space-y-2 text-[11px] text-gray-700">
                <div className="font-bold text-[#113824] flex items-center space-x-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>The Al Usmani Quality Pledge:</span>
                </div>
                <p>
                  Zero carbide ripening. Hand-picked at dawn. If fruit arrives bruised or spoiled in transit,
                  we guarantee an unconditional replacement or instant refund.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

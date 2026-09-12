'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useFeatureFlags } from '@/context/FeaturesContext';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  Tag,
  Gift,
  ArrowRight,
  ShieldCheck,
  Truck,
  Award
} from 'lucide-react';
import { formatPKR } from '@/lib/formatters';

const FREE_SHIPPING_THRESHOLD = 10000; // PKR 10,000

export default function CartDrawer() {
  const {
    items,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
    totalBoxes,
    totalWeightKg,
    subtotal,
    appliedCoupon,
    setAppliedCoupon,
    isGift,
    setIsGift,
    giftRecipient,
    setGiftRecipient,
    giftMessage,
    setGiftMessage
  } = useCart();

  const { isFeatureEnabled } = useFeatureFlags();

  const [couponInput, setCouponInput] = useState('');
  const [calculation, setCalculation] = useState<{
    tieredDiscount: number;
    couponDiscount: number;
    totalDiscount: number;
    shippingFee: number;
    grandTotal: number;
    appliedTierPercent: number;
    couponDetails?: any;
    errors: string[];
  }>({
    tieredDiscount: 0,
    couponDiscount: 0,
    totalDiscount: 0,
    shippingFee: 350,
    grandTotal: subtotal + 350,
    appliedTierPercent: 0,
    errors: []
  });

  const [isCalculating, setIsCalculating] = useState(false);

  // Re-calculate discounts and shipping whenever items or coupon change
  useEffect(() => {
    if (items.length === 0) {
      setCalculation({
        tieredDiscount: 0,
        couponDiscount: 0,
        totalDiscount: 0,
        shippingFee: 0,
        grandTotal: 0,
        appliedTierPercent: 0,
        errors: []
      });
      return;
    }

    setIsCalculating(true);
    fetch('/api/cart/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({ packageSizeId: i.packageSizeId, quantity: i.quantity })),
        couponCode: isFeatureEnabled('coupon_codes') ? appliedCoupon : null,
        destinationCity: 'Lahore'
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCalculation(data);
        }
      })
      .catch((e) => console.error('Cart calculation failed', e))
      .finally(() => setIsCalculating(false));
  }, [items, appliedCoupon, isFeatureEnabled]);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setAppliedCoupon(couponInput.trim().toUpperCase());
    setCouponInput('');
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
  };

  // Lock body scroll and handle Escape key when cart is open
  useEffect(() => {
    if (!isCartOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartOpen, closeCart]);

  if (!isCartOpen) return null;

  // Free shipping progress calculation (Smart Cart)
  const freeShippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const amountNeededForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  // Estimated loyalty points
  const estimatedPoints = Math.floor(subtotal / 100);

  // Tier calculation for progress bar
  let tierProgressText = '';
  let boxesNeeded = 5 - totalBoxes;

  if (totalBoxes < 5) {
    boxesNeeded = 5 - totalBoxes;
    tierProgressText = `Add ${boxesNeeded} more box${boxesNeeded > 1 ? 'es' : ''} to unlock 5% volume discount!`;
  } else if (totalBoxes < 10) {
    boxesNeeded = 10 - totalBoxes;
    tierProgressText = `5% Discount Active! Add ${boxesNeeded} more for 10% savings!`;
  } else if (totalBoxes < 20) {
    boxesNeeded = 20 - totalBoxes;
    tierProgressText = `10% Discount Active! Add ${boxesNeeded} more for 15% wholesale tier!`;
  } else {
    tierProgressText = '🎉 Maximum 15% Wholesale Tier Discount Unlocked!';
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-[#FDFBF7] shadow-2xl flex flex-col border-l border-[#E8DBC5] h-[100dvh]">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-[#E8DBC5] flex items-center justify-between bg-white">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🥭</span>
              <h2 className="text-lg font-serif font-black text-[#113824]">
                Your Harvest Crate ({totalBoxes})
              </h2>
            </div>
            <button
              onClick={closeCart}
              className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Smart Cart: Free Delivery Progress Bar */}
          {items.length > 0 && isFeatureEnabled('smart_cart') && (
            <div className="bg-[#FAF6EE] px-4 py-3 border-b border-[#E8DBC5]">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#113824] mb-1.5">
                <span className="flex items-center space-x-1">
                  <Truck className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>
                    {amountNeededForFreeShipping === 0
                      ? 'Free Nationwide Cold-Chain Delivery Unlocked!'
                      : `Add ${formatPKR(amountNeededForFreeShipping)} for FREE Cold-Chain Delivery`}
                  </span>
                </span>
                <span className="text-[#D97706] font-mono">{freeShippingProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#D97706] to-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Tiered Discount Progress Banner */}
          {items.length > 0 && (
            <div className="bg-[#113824] text-white p-3.5 text-xs">
              <div className="flex items-center justify-between font-bold mb-1.5">
                <span className="flex items-center text-[#F59E0B]">
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Volume Tier Savings
                </span>
                <span>{calculation.appliedTierPercent}% OFF</span>
              </div>
              <p className="text-[11px] text-[#F5EEE2]/85">{tierProgressText}</p>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="text-5xl">📦</div>
                <h3 className="text-base font-serif font-bold text-[#113824]">
                  Your crate is empty
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Explore our fresh orchard varieties and handpick your seasonal boxes.
                </p>
                <button
                  onClick={closeCart}
                  className="px-6 py-2.5 rounded-xl bg-[#113824] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#195235]"
                >
                  Explore The Harvest
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.packageSizeId}
                  className="card-luxury p-3.5 rounded-2xl bg-white border border-[#E8DBC5] flex space-x-3.5"
                >
                  <img
                    src={item.image || '/images/placeholder-mango.svg'}
                    alt={item.varietyName}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== window.location.origin + '/images/placeholder-mango.svg') {
                        target.src = '/images/placeholder-mango.svg';
                      }
                    }}
                    className="w-20 h-20 rounded-xl object-cover border border-[#E8DBC5]"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <h4 className="text-xs font-bold text-[#113824] line-clamp-1">
                          {item.varietyName}
                        </h4>
                        <button
                          onClick={() => removeItem(item.packageSizeId)}
                          className="text-gray-400 hover:text-red-600 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-[11px] text-[#D97706] font-semibold mt-0.5">
                        {item.packageName} ({item.weightKg} KG)
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                        <button
                          onClick={() => updateQuantity(item.packageSizeId, item.quantity - 1)}
                          className="px-2 py-1 hover:bg-gray-200 text-xs font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-xs font-black">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.packageSizeId, item.quantity + 1)}
                          className="px-2 py-1 hover:bg-gray-200 text-xs font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-xs font-black text-[#113824]">
                        {formatPKR(item.unitPrice * item.quantity)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Gifting Toggle */}
            {items.length > 0 && isFeatureEnabled('gift_packaging') && (
              <div className="p-4 rounded-2xl bg-[#F5EEE2] border border-[#E8DBC5] space-y-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGift}
                    onChange={(e) => setIsGift(e.target.checked)}
                    className="w-4 h-4 text-[#D97706] rounded border-gray-300 focus:ring-[#D97706]"
                  />
                  <span className="text-xs font-bold text-[#113824] flex items-center space-x-1">
                    <Gift className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>Send as a Royal Gift Box (Free Ribbon & Card)</span>
                  </span>
                </label>

                {isGift && (
                  <div className="space-y-2 pt-2 border-t border-[#E8DBC5]/60">
                    <input
                      type="text"
                      placeholder="Recipient Full Name"
                      value={giftRecipient}
                      onChange={(e) => setGiftRecipient(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DBC5] bg-white focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                    />
                    <textarea
                      placeholder="Your personal greeting message (handwritten on parchment card)..."
                      rows={2}
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8DBC5] bg-white focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Coupon Code Section */}
            {items.length > 0 && isFeatureEnabled('coupon_codes') && (
              <div className="space-y-2">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <div className="flex items-center space-x-1.5 text-emerald-800 font-bold">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Code '{appliedCoupon}' applied!</span>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-red-600 hover:text-red-800 text-[11px] font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Promo Coupon (e.g. ROYAL10)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-[#E8DBC5] bg-white uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold uppercase tracking-wider"
                    >
                      Apply
                    </button>
                  </form>
                )}
                {calculation.errors.length > 0 && (
                  <p className="text-[11px] text-red-600">{calculation.errors.join(' ')}</p>
                )}
              </div>
            )}

            {/* Loyalty Points Preview */}
            {items.length > 0 && isFeatureEnabled('loyalty_program') && (
              <div className="flex items-center space-x-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Earn <strong className="font-mono text-amber-800">{estimatedPoints} Orchard Points</strong> with this harvest order!
                </span>
              </div>
            )}
          </div>

          {/* Footer & Price Breakdown */}
          {items.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-[#E8DBC5] bg-white space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({totalWeightKg} KG)</span>
                  <span>{formatPKR(subtotal)}</span>
                </div>

                {calculation.tieredDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Tier Volume Discount ({calculation.appliedTierPercent}%)</span>
                    <span>- {formatPKR(calculation.tieredDiscount)}</span>
                  </div>
                )}

                {calculation.couponDiscount > 0 && isFeatureEnabled('coupon_codes') && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon Discount</span>
                    <span>- {formatPKR(calculation.couponDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span>Estimated Shipping (Cold-Chain)</span>
                  <span>
                    {calculation.shippingFee === 0 ? (
                      <span className="text-emerald-700 font-bold">FREE</span>
                    ) : (
                      formatPKR(calculation.shippingFee)
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-base font-black text-[#113824] pt-2 border-t border-gray-100">
                  <span>Grand Total</span>
                  <span className="text-[#D97706]">
                    {formatPKR(calculation.grandTotal)}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={closeCart}
                className="w-full py-4 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#092115] font-black text-xs tracking-wider uppercase flex items-center justify-center space-x-2 shadow-lg transition-transform hover:-translate-y-0.5"
              >
                <span>PROCEED TO CHECKOUT</span>
                <ArrowRight className="w-4 h-4 font-bold" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

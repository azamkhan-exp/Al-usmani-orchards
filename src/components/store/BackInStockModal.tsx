'use client';

import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

interface BackInStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productId: string;
  packageName?: string;
  packageSizeId?: string;
}

export default function BackInStockModal({
  isOpen,
  onClose,
  productName,
  productId,
  packageName,
  packageSizeId
}: BackInStockModalProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Lock body scroll & escape listener
  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() && !phone.trim()) {
      setErrorMsg('Please enter either your email address or mobile WhatsApp number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/products/back-in-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          packageSizeId,
          email: email.trim(),
          phone: phone.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Alert registered successfully! We will notify you immediately.');
        setTimeout(() => {
          onClose();
          setSuccessMsg('');
          setEmail('');
          setPhone('');
        }, 2500);
      } else {
        setErrorMsg(data.error || 'Failed to register notification request.');
      }
    } catch (err: any) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FDFBF7] border border-[#E8DBC5] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 bg-[#113824] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-[#F59E0B] text-[#092115] flex items-center justify-center font-bold shadow-md">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-serif font-black tracking-wide">
                Notify When Back in Stock
              </h3>
              <p className="text-[11px] text-[#FBBF24]">
                {productName} {packageName ? `• ${packageName}` : ''}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-gray-300 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            Our groves harvest cultivars in natural seasonal flushes. Leave your details below, and our system will alert you via email or WhatsApp as soon as fresh crates are picked and graded into cold storage.
          </p>

          {successMsg ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#113824] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="patron@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8DBC5] bg-white focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#113824] mb-1">
                    WhatsApp Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="0300 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E8DBC5] bg-white focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-[#E8DBC5] text-gray-600 hover:bg-gray-100 text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors shadow-xs"
                >
                  {submitting ? 'Registering...' : 'Alert Me'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

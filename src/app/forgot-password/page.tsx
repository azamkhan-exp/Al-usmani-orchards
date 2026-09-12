'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Mail, ArrowRight, ShieldCheck, CheckCircle2, ChevronLeft } from 'lucide-react';
import { safeFetchJson } from '@/lib/api-client';

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [step, setStep] = useState<'REQUEST' | 'RESET'>('REQUEST');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const data = await safeFetchJson<any>('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      if (data?.success) {
        if (data.isGoogleAccount) {
          setError(data.message);
        } else {
          setSuccessMsg(data.message || 'Verification code sent to your email.');
          if (data.debugOtp) {
            setOtp(data.debugOtp);
          }
          setStep('RESET');
        }
      } else {
        setError(data?.error || 'Unable to process password reset request.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const data = await safeFetchJson<any>('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword
        })
      });

      if (data?.success) {
        router.push('/account?toast=password_reset_success');
      } else {
        setError(data?.error || 'Invalid or expired verification code.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-16 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link
            href="/login"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#113824] hover:text-[#D97706] mb-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Sign In</span>
          </Link>
          <div className="text-4xl">🥭</div>
          <span className="text-[10px] font-bold tracking-widest text-[#D97706] uppercase">
            ESTD. 1934 • MULTAN
          </span>
          <h1 className="text-2xl font-serif font-black text-[#113824]">
            Al Usmani Orchards
          </h1>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Recover access to your personal harvest allocations &amp; order history.
          </p>
        </div>

        {/* Card Container */}
        <div className="card-luxury p-8 rounded-3xl bg-white border border-[#E8DBC5] shadow-xl space-y-5">
          <div className="flex items-center space-x-2 text-[#113824] font-bold text-sm border-b border-gray-100 pb-3">
            <KeyRound className="w-4 h-4 text-[#D97706]" />
            <span>{step === 'REQUEST' ? 'Password Recovery' : 'Enter Verification Code'}</span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 leading-relaxed animate-in fade-in">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed animate-in fade-in flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === 'REQUEST' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4 text-xs">
              <p className="text-gray-500 text-[11px] leading-relaxed">
                Enter your registered patron email. We will send a secure single-use 6-digit verification code to verify your identity.
              </p>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patron@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] text-xs focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Sending Verification Code...' : 'Send 6-Digit Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 482910"
                  className="w-full p-2.5 rounded-xl border border-gray-300 font-mono text-center text-xl tracking-widest bg-white font-black text-[#113824] focus:outline-none focus:ring-2 focus:ring-[#113824]"
                />
                <span className="text-[10px] text-gray-400 mt-1 block text-center">
                  Code sent to <strong className="text-gray-700">{email}</strong> (valid for 10 minutes)
                </span>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  New Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New secure password"
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] text-xs focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full p-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] text-xs focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#092115] font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Updating Password...' : 'Set Password & Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="text-[11px] text-[#113824] hover:underline font-bold"
                >
                  Didn&apos;t receive code? Resend OTP
                </button>
              </div>
            </form>
          )}

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="text-[11px] text-gray-500 hover:text-[#113824] font-bold"
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFBF7]" />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}

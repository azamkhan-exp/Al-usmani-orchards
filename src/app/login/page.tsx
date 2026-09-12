'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, User, Lock, Mail, Phone, MapPin, ArrowRight, Sparkles, ChevronLeft, KeyRound } from 'lucide-react';
import { safeFetchJson } from '@/lib/api-client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Lahore');

  // Forgot / Reset password state
  const [resetStep, setResetStep] = useState<'REQUEST' | 'RESET'>('REQUEST');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const urlError = searchParams.get('error');
  const redirectParam = searchParams.get('redirect');

  useEffect(() => {
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [urlError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await safeFetchJson<any>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (data?.success) {
        if (redirectParam && redirectParam.startsWith('/')) {
          if (data.user.role === 'CUSTOMER' && redirectParam.startsWith('/admin')) {
            router.push('/account');
          } else {
            router.push(redirectParam);
          }
        } else if (data.user.role === 'CUSTOMER') {
          router.push('/account');
        } else {
          router.push('/admin');
        }
      } else {
        setError(data?.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to authenticate. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await safeFetchJson<any>('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, city })
      });

      if (data?.success) {
        router.push('/account');
      } else {
        setError(data?.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await safeFetchJson<any>('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (data?.success) {
        setResetSuccessMessage('Security reset code generated. Enter code below to set new password.');
        if (data.resetToken) {
          setResetToken(data.resetToken);
        }
        setResetStep('RESET');
      } else {
        setError(data?.error || 'Unable to request password reset');
      }
    } catch (e: any) {
      setError(e?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await safeFetchJson<any>('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword })
      });
      if (data?.success) {
        alert('Password successfully reset! Please sign in with your new password.');
        setTab('LOGIN');
        setPassword('');
        setResetStep('REQUEST');
        setResetSuccessMessage('');
      } else {
        setError(data?.error || 'Invalid or expired reset token');
      }
    } catch (e: any) {
      setError(e?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-16 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-md w-full mx-auto space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2 text-xs font-bold text-[#113824] hover:text-[#D97706] mb-2">
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Orchards</span>
          </Link>
          <div className="w-12 h-12 rounded-full bg-[#113824] flex items-center justify-center mx-auto border border-[#F59E0B] shadow">
            <span className="text-2xl">🥭</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#113824]">
            Al Usmani Orchards Portal
          </h1>
          <p className="text-xs text-gray-500">
            Sign in to track harvest orders or access the Enterprise ERP Command Center.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-[#F5EEE2] p-1 border border-[#E8DBC5]">
          <button
            onClick={() => {
              setTab('LOGIN');
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              tab === 'LOGIN' ? 'bg-white text-[#113824] shadow-sm' : 'text-gray-500 hover:text-[#113824]'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab('REGISTER');
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              tab === 'REGISTER' ? 'bg-white text-[#113824] shadow-sm' : 'text-gray-500 hover:text-[#113824]'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium text-center">
            {error}
          </div>
        )}

        {resetSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium text-center">
            {resetSuccessMessage}
          </div>
        )}

        {/* Form Container */}
        <div className="card-luxury p-8 rounded-3xl bg-white border border-[#E8DBC5] shadow-xl space-y-5">
          {/* Google OAuth Button */}
          {tab !== 'FORGOT_PASSWORD' && (
            <div>
              <a
                href="/api/auth/google"
                className="w-full py-3 px-4 rounded-xl border border-[#E8DBC5] bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center space-x-3 shadow-xs transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </a>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-400 font-medium">Or continue with email</span>
                </div>
              </div>
            </div>
          )}

          {/* SIGN IN FORM */}
          {tab === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
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

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('FORGOT_PASSWORD');
                      setResetStep('REQUEST');
                      setError('');
                    }}
                    className="text-[11px] font-bold text-[#D97706] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] text-xs focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {tab === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tariq Mehmood"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] text-xs focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  />
                </div>
              </div>

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
                    placeholder="tariq@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] text-xs focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300 1234567"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] text-xs focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars"
                    className="w-full p-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm"
                    className="w-full p-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#092115] font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow transition-all disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'Creating Profile...' : 'Register Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {tab === 'FORGOT_PASSWORD' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center space-x-2 text-[#113824] font-bold">
                <KeyRound className="w-4 h-4 text-[#D97706]" />
                <span>Password Recovery</span>
              </div>

              {resetStep === 'REQUEST' ? (
                <form onSubmit={handleForgotPasswordRequest} className="space-y-3">
                  <p className="text-gray-500 text-[11px]">
                    Enter your registered account email. A security token will be issued to reset your password.
                  </p>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="patron@example.com"
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold uppercase tracking-wider text-xs shadow"
                  >
                    {loading ? 'Issuing Token...' : 'Issue Reset Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Reset Token / Code</label>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste reset token"
                      className="w-full p-2.5 rounded-xl border border-gray-300 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">New Password (min 8 chars)</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#092115] font-black uppercase tracking-wider text-xs shadow"
                  >
                    {loading ? 'Updating Password...' : 'Save New Password'}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setTab('LOGIN');
                  setError('');
                }}
                className="w-full text-center text-gray-500 hover:text-[#113824] font-bold text-[11px] pt-2"
              >
                ← Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#FDFBF7]" />}>
      <LoginForm />
    </React.Suspense>
  );
}

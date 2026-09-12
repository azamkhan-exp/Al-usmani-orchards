'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Shield,
  ShieldCheck,
  Lock,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { safeFetchJson } from '@/lib/api-client';

function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  // Validation State
  const [validating, setValidating] = useState(true);
  const [invitationData, setInvitationData] = useState<{ email: string; role: string; expires_at: string } | null>(null);
  const [tokenError, setTokenError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setTokenError('No invitation token provided in the URL. Please verify the onboarding link.');
      return;
    }

    const validateToken = async () => {
      try {
        const res = await safeFetchJson<any>(`/api/admin/auth/accept-invitation?token=${encodeURIComponent(token)}`);
        if (res?.valid && res.invitation) {
          setInvitationData(res.invitation);
        } else {
          setTokenError(res?.error || 'This invitation token is invalid, expired, or has already been redeemed.');
        }
      } catch (err: any) {
        setTokenError(err.message || 'Failed to validate invitation token.');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Full legal name is required.');
      return;
    }

    if (password.length < 8) {
      setError('Master password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter carefully.');
      return;
    }

    setLoading(true);

    try {
      const res = await safeFetchJson<any>('/api/admin/auth/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: name.trim(),
          phone: phone.trim() || undefined,
          password
        })
      });

      if (res?.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/admin');
        }, 1500);
      } else {
        setError(res?.error || 'Failed to activate staff account. Please contact your Super Administrator.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while activating account.');
    } finally {
      setLoading(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { label: '', color: '', percent: 0 };
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 25;

    if (score <= 25) return { label: 'Weak', color: 'bg-red-500 text-red-400', percent: 25 };
    if (score <= 50) return { label: 'Fair', color: 'bg-amber-500 text-amber-400', percent: 50 };
    if (score <= 75) return { label: 'Good', color: 'bg-blue-500 text-blue-400', percent: 75 };
    return { label: 'Strong', color: 'bg-emerald-500 text-emerald-400', percent: 100 };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Shield & Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-700/50 shadow-2xl shadow-emerald-950/80 mb-4">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-100 tracking-tight">
            Al Usmani Orchards
          </h2>
          <p className="mt-1 text-xs uppercase tracking-widest text-amber-500 font-semibold">
            Executive Staff Onboarding
          </p>
          <p className="mt-1 text-xs text-stone-400">
            Activate your administrative credentials and master keys
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 bg-stone-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl border border-stone-800 sm:px-10">
          {validating ? (
            <div className="py-12 text-center space-y-3">
              <div className="inline-block animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
              <p className="text-xs text-stone-400 font-medium">Validating security token with royal grove registry...</p>
            </div>
          ) : tokenError ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-800 flex items-center justify-center mx-auto text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-200">Invalid or Expired Invitation</h3>
                <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                  {tokenError}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/admin/login"
                  className="inline-flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold uppercase tracking-wider transition-colors border border-stone-700"
                >
                  <span>Return to Admin Login</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="space-y-6 text-center py-6 animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-700 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-100">Welcome to the Estate</h3>
                <p className="text-xs text-emerald-400 mt-1 font-medium">
                  Your credentials have been authenticated and session initialized.
                </p>
                <p className="text-[11px] text-stone-400 mt-2">
                  Redirecting to the Executive Command Center...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Assigned Details Notice */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Recipient Email:</span>
                  <span className="font-mono font-bold text-amber-300">{invitationData?.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Assigned Role:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80">
                    {invitationData?.role}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">{error}</div>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-300 mb-1.5">
                  Full Legal Name
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Asad Usmani"
                    className="block w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 text-xs placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-300 mb-1.5">
                  Mobile Phone Number <span className="text-stone-500 normal-case font-normal">(WhatsApp / SMS 2FA)</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="block w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 text-xs placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Master Password */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-300 mb-1.5">
                  Master Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="block w-full pl-10 pr-10 py-3 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 text-xs placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-500 hover:text-stone-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength meter */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color.split(' ')[0]}`}
                        style={{ width: `${strength.percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-stone-400 block text-right font-medium">
                      Strength: <span className={strength.color.split(' ')[1]}>{strength.label}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-300 mb-1.5">
                  Confirm Master Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="block w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 text-xs placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl text-stone-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-110 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-stone-950 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-stone-950" />
                  <span>{loading ? 'Activating Credentials...' : 'Complete Onboarding & Enter Portal'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Footer Note */}
          <div className="mt-6 pt-5 border-t border-stone-800 text-center">
            <p className="text-[11px] text-stone-500">
              Al Usmani Orchards Executive Security Protocol v2.5
            </p>
            <p className="text-[10px] text-stone-600 mt-0.5">
              Zero calcium carbide • Authenticated cold-chain governance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-950 flex items-center justify-center text-amber-400 text-xs font-bold uppercase tracking-wider">
          Loading Onboarding Gateway...
        </div>
      }
    >
      <AcceptInvitationForm />
    </Suspense>
  );
}

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Shield,
  Lock,
  User,
  Key,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
  MessageSquare,
  CheckCircle2,
  Phone
} from 'lucide-react';
import { safeFetchJson } from '@/lib/api-client';

function SegmentedOtpInput({
  value,
  onChange,
  autoFocus = false
}: {
  value: string;
  onChange: (val: string) => void;
  autoFocus?: boolean;
}) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const handleChange = (index: number, char: string) => {
    const cleaned = char.replace(/\D/g, '');
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      onChange(newDigits.join(''));
      return;
    }
    const newDigits = [...digits];
    newDigits[index] = cleaned[cleaned.length - 1];
    onChange(newDigits.join(''));
    if (index < 5 && cleaned) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const nextFocus = Math.min(pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          value={digits[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold bg-stone-950 text-amber-300 border border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all shadow-inner"
        />
      ))}
    </div>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect') || '/admin';

  // Step state
  const [step, setStep] = useState<'CREDENTIALS' | 'OTP' | 'MFA' | 'FORGOT_PASSWORD'>('CREDENTIALS');

  // Step 1: Credentials
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: OTP
  const [challengeToken, setChallengeToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Step 2 Fallback: Authenticator MFA
  const [mfaCode, setMfaCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  // Forgot Password Flow
  const [forgotStep, setForgotStep] = useState<'IDENTIFIER' | 'OTP' | 'NEW_PASSWORD'>('IDENTIFIER');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotChallengeToken, setForgotChallengeToken] = useState('');
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Read error parameter from URL redirect (e.g. from middleware or AdminLayout)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(errorParam);
    }
  }, [searchParams]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // 1. Submit Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await safeFetchJson<any>('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      if (!res) {
        setError('Server did not return a response. Please check connection.');
        return;
      }

      if (res.error) {
        setError(res.error);
        return;
      }

      // OTP Challenge (WhatsApp / SMS)
      if (res.otp_required) {
        setChallengeToken(res.challenge_token);
        setMaskedPhone(res.masked_phone || '+92 ******2910');
        setCooldown(res.cooldown_seconds || 60);
        setStep('OTP');
        setOtpCode('');
        setError('');
        return;
      }

      // TOTP App MFA
      if (res.mfa_required) {
        setChallengeToken(res.challenge_token);
        setStep('MFA');
        setMfaCode('');
        setError('');
        return;
      }

      // Direct Login
      if (res.success) {
        const dest = redirectParam.startsWith('/admin') ? redirectParam : '/admin';
        router.push(dest);
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await safeFetchJson<any>('/api/admin/auth/otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_token: challengeToken,
          code: otpCode.trim()
        })
      });

      if (!res) {
        setError('Verification failed to connect. Please try again.');
        return;
      }

      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.success) {
        const dest = redirectParam.startsWith('/admin') ? redirectParam : '/admin';
        router.push(dest);
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'Verification error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setError('');
    setLoading(true);

    try {
      const res = await safeFetchJson<any>('/api/admin/auth/otp-resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_token: challengeToken,
          purpose: 'ADMIN_LOGIN'
        })
      });

      if (!res) {
        setError('Failed to contact resend server.');
        return;
      }

      if (res.error) {
        setError(res.error);
        return;
      }

      setCooldown(res.cooldown_seconds || 60);
      setSuccessMsg(res.message || 'A new verification code has been dispatched.');
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Submit TOTP MFA
  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await safeFetchJson<any>('/api/admin/auth/mfa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_token: challengeToken,
          code: mfaCode.trim()
        })
      });

      if (!res) {
        setError('Verification failed to connect.');
        return;
      }

      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.success) {
        const dest = redirectParam.startsWith('/admin') ? redirectParam : '/admin';
        router.push(dest);
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'Verification error.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Forgot Password Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (forgotStep === 'IDENTIFIER') {
        const res = await safeFetchJson<any>('/api/admin/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'REQUEST', identifier: forgotIdentifier.trim() })
        });

        if (res?.challenge_token) {
          setForgotChallengeToken(res.challenge_token);
          setMaskedPhone(res.masked_phone || '');
          setCooldown(res.cooldown_seconds || 60);
          setForgotStep('OTP');
          setSuccessMsg(res.message);
        } else {
          setSuccessMsg(res?.message || 'Verification code dispatched if account exists.');
          setForgotStep('OTP');
        }
      } else if (forgotStep === 'OTP') {
        const res = await safeFetchJson<any>('/api/admin/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'VERIFY',
            challenge_token: forgotChallengeToken,
            code: forgotOtpCode.trim()
          })
        });

        if (res?.error) {
          setError(res.error);
          return;
        }

        if (res?.reset_token) {
          setForgotResetToken(res.reset_token);
          setForgotStep('NEW_PASSWORD');
          setSuccessMsg(res.message);
        }
      } else if (forgotStep === 'NEW_PASSWORD') {
        if (newPassword !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }

        const res = await safeFetchJson<any>('/api/admin/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'RESET',
            reset_token: forgotResetToken,
            new_password: newPassword,
            confirm_password: confirmPassword
          })
        });

        if (res?.error) {
          setError(res.error);
          return;
        }

        if (res?.success) {
          setStep('CREDENTIALS');
          setSuccessMsg(res.message || 'Password reset successfully! Please log in.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Shield & Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-700/50 shadow-2xl shadow-emerald-950/80 mb-4">
            <Shield className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-100 tracking-tight">
            Al Usmani Orchards
          </h2>
          <p className="mt-1 text-xs uppercase tracking-widest text-amber-500 font-semibold">
            Executive Control Portal
          </p>
          <p className="mt-1 text-xs text-stone-400">
            Secure multi-factor administrative access
          </p>
        </div>

        {/* Auth Card */}
        <div className="mt-8 bg-stone-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-stone-800 sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">{successMsg}</div>
            </div>
          )}

          {/* STAGE 1: CREDENTIALS LOGIN */}
          {step === 'CREDENTIALS' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-300 mb-1.5">
                  Username or Email
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin or admin@alusmaniorchards.pk"
                    autoComplete="username"
                    className="block w-full pl-10 pr-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium uppercase tracking-wider text-stone-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('FORGOT_PASSWORD');
                      setForgotStep('IDENTIFIER');
                      setForgotIdentifier(identifier);
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="block w-full pl-10 pr-10 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-500 hover:text-stone-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex justify-center items-center gap-2 py-3 px-4 border border-amber-500/30 rounded-xl shadow-lg text-sm font-semibold text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-stone-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate Admin</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STAGE 2: ADMIN OTP CODE CHALLENGE (WHATSAPP / SMS) */}
          {step === 'OTP' && (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div className="text-center p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
                <div className="w-10 h-10 rounded-full bg-emerald-900/80 text-amber-400 flex items-center justify-center mx-auto mb-2 border border-emerald-700/40">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-stone-200">
                  Security Passcode Required
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  A 6-digit verification code has been dispatched to your verified security phone:
                </p>
                <p className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                  {maskedPhone || '+92 ******2910'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-300 mb-3 text-center">
                  Enter 6-Digit Passcode
                </label>
                <SegmentedOtpInput
                  value={otpCode}
                  onChange={setOtpCode}
                  autoFocus
                />
              </div>

              {/* Resend button & countdown */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || loading}
                  className={`transition-colors cursor-pointer ${
                    cooldown > 0
                      ? 'text-stone-500 cursor-not-allowed'
                      : 'text-amber-400 hover:text-amber-300 underline'
                  }`}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend verification code'}
                </button>

                <span className="text-stone-500 text-[11px]">Valid for 5 mins</span>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full mt-2 flex justify-center items-center gap-2 py-3 px-4 border border-amber-500/30 rounded-xl shadow-lg text-sm font-semibold text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-stone-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Access Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('CREDENTIALS');
                    setOtpCode('');
                    setError('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to credential login</span>
                </button>
              </div>
            </form>
          )}

          {/* STAGE 2 FALLBACK: AUTHENTICATOR APP MFA */}
          {step === 'MFA' && (
            <form onSubmit={handleMfaSubmit} className="space-y-5">
              <div className="text-center p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
                <ShieldCheck className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
                <h3 className="text-sm font-semibold text-stone-200">
                  Two-Factor Verification
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  {useRecoveryCode
                    ? 'Enter one of your 8-character single-use emergency recovery keys'
                    : 'Enter the 6-digit dynamic code from your authenticator application'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-stone-300 mb-1.5">
                  {useRecoveryCode ? 'Emergency Recovery Key' : '6-Digit Authenticator Code'}
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder={useRecoveryCode ? 'ABCD-EFGH' : '123456'}
                    autoComplete="one-time-code"
                    maxLength={useRecoveryCode ? 19 : 6}
                    className="block w-full pl-10 pr-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-600 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUseRecoveryCode(!useRecoveryCode);
                    setMfaCode('');
                    setError('');
                  }}
                  className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer underline"
                >
                  {useRecoveryCode ? 'Use 6-digit Authenticator app instead' : 'Lost device? Use emergency recovery key'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex justify-center items-center gap-2 py-3 px-4 border border-amber-500/30 rounded-xl shadow-lg text-sm font-semibold text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-stone-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Grant Access</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('CREDENTIALS');
                    setMfaCode('');
                    setError('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to credential login</span>
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD SELF-SERVICE FLOW */}
          {step === 'FORGOT_PASSWORD' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="text-center p-3 rounded-xl bg-stone-950/60 border border-stone-800">
                <h3 className="text-sm font-semibold text-stone-200">
                  Administrative Password Reset
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  {forgotStep === 'IDENTIFIER' && 'Enter your administrative email or username to receive a security reset OTP.'}
                  {forgotStep === 'OTP' && `Enter the 6-digit code dispatched to your verified security phone (${maskedPhone || '+92 ******2910'}).`}
                  {forgotStep === 'NEW_PASSWORD' && 'Set a new secure password for your administrative account.'}
                </p>
              </div>

              {forgotStep === 'IDENTIFIER' && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-stone-300 mb-1.5">
                    Account Email or Username
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="admin@alusmaniorchards.pk"
                    className="block w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              )}

              {forgotStep === 'OTP' && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-stone-300 mb-3 text-center">
                    6-Digit Security Code
                  </label>
                  <SegmentedOtpInput
                    value={forgotOtpCode}
                    onChange={setForgotOtpCode}
                    autoFocus
                  />
                </div>
              )}

              {forgotStep === 'NEW_PASSWORD' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-stone-300 mb-1.5">
                      New Password (min 8 chars)
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-stone-300 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex justify-center items-center gap-2 py-3 px-4 border border-amber-500/30 rounded-xl shadow-lg text-sm font-semibold text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {forgotStep === 'IDENTIFIER' && 'Send Verification Code'}
                      {forgotStep === 'OTP' && 'Verify Code'}
                      {forgotStep === 'NEW_PASSWORD' && 'Update Password'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('CREDENTIALS');
                    setError('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancel & return to login</span>
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 border-t border-stone-800 pt-5 text-center">
            <Link
              href="/"
              className="text-xs text-stone-400 hover:text-stone-300 transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Return to Storefront</span>
            </Link>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="mt-6 text-center text-stone-500 text-[11px] flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3 text-stone-400" />
          <span>Encrypted with SHA-256 HMAC & RFC 6238 Standard</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-950" />}>
      <AdminLoginForm />
    </Suspense>
  );
}

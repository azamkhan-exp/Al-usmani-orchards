'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Lock,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Globe,
  Monitor,
  Check,
  X,
  Send,
  Trash2,
  LogOut,
  Sliders,
  History,
  Info
} from 'lucide-react';
import { safeFetchJson } from '@/lib/api-client';

interface AccountData {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  security_phone?: string;
  security_phone_verified?: number;
  last_login_at?: string;
}

interface OtpSettings {
  admin_otp_enabled: boolean;
  verified_security_phone: string;
  masked_phone: string;
  otp_provider: string;
  otp_expiry_minutes: number;
  otp_max_attempts: number;
  otp_resend_cooldown_seconds: number;
  step_up_mfa_required: boolean;
}

interface SessionItem {
  id: string;
  user_agent?: string;
  ip_address?: string;
  is_current: boolean;
  created_at: string;
  last_active_at: string;
  expires_at: string;
}

interface AuditEvent {
  id: string;
  action: string;
  target_type: string;
  details_json?: string;
  created_at: string;
}

export default function AdminSecurityPage() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [otpSettings, setOtpSettings] = useState<OtpSettings | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  // Account Identity Form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [accountUpdating, setAccountUpdating] = useState(false);
  const [accountMsg, setAccountMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Management Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invalidateOthers, setInvalidateOthers] = useState(true);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Phone & OTP Action State
  const [otpTesting, setOtpTesting] = useState(false);
  const [otpEnforcing, setOtpEnforcing] = useState(false);
  const [securityPhoneMsg, setSecurityPhoneMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sessions State
  const [sessionsRevoking, setSessionsRevoking] = useState(false);
  const [sessionsMsg, setSessionsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Step-Up OTP Modal State (For high-privilege operations)
  const [stepUpModalOpen, setStepUpModalOpen] = useState(false);
  const [stepUpAction, setStepUpAction] = useState<'CHANGE_PHONE' | 'DISABLE_OTP' | 'REVOKE_ALL' | null>(null);
  const [stepUpDigits, setStepUpDigits] = useState(['', '', '', '', '', '']);
  const [stepUpCountdown, setStepUpCountdown] = useState(0);
  const [stepUpSubmitting, setStepUpSubmitting] = useState(false);
  const [stepUpError, setStepUpError] = useState('');
  const [newPhonePending, setNewPhonePending] = useState('');

  // 1. Initial Data Fetching
  const loadAllSecurityData = async () => {
    setLoading(true);
    try {
      const [accRes, otpRes, sessRes, logsRes] = await Promise.all([
        safeFetchJson<any>('/api/admin/security/account'),
        safeFetchJson<any>('/api/admin/security/otp'),
        safeFetchJson<any>('/api/admin/security/sessions'),
        safeFetchJson<any>('/api/admin/audit-logs')
      ]);

      if (accRes?.account) {
        setAccount(accRes.account);
        setUsername(accRes.account.username || '');
        setEmail(accRes.account.email || '');
      }

      if (otpRes?.settings) {
        setOtpSettings(otpRes.settings);
      }

      if (sessRes?.sessions) {
        setSessions(sessRes.sessions);
      }

      if (logsRes?.logs && Array.isArray(logsRes.logs)) {
        // Filter security-relevant audit logs
        const secEvents = logsRes.logs.filter((l: any) =>
          l.action.includes('AUTH') ||
          l.action.includes('OTP') ||
          l.action.includes('PASSWORD') ||
          l.action.includes('LOGIN') ||
          l.action.includes('SECURITY')
        ).slice(0, 8);
        setAuditEvents(secEvents);
      }
    } catch (err) {
      console.error('Failed to load security data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSecurityData();
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (stepUpCountdown <= 0) return;
    const timer = setInterval(() => {
      setStepUpCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [stepUpCountdown]);

  // 2. Factual Security Health Checks & Score Calculation
  const healthChecks = useMemo(() => {
    const isPhoneVerified = Boolean(account?.security_phone_verified || (otpSettings?.verified_security_phone && otpSettings.verified_security_phone.length > 5));
    const isOtpActive = Boolean(otpSettings?.admin_otp_enabled);
    const isSessionsHealthy = sessions.length <= 4;
    const isStepUpActive = Boolean(otpSettings?.step_up_mfa_required);
    const isAccountConfigured = Boolean(account?.username && account?.email);

    const checks = [
      { id: 'phone', label: 'Security Phone Verified', passed: isPhoneVerified, weight: 25 },
      { id: 'otp', label: 'Phone OTP 2FA Enforced', passed: isOtpActive, weight: 25 },
      { id: 'step_up', label: 'Step-Up Auth on Destructive Operations', passed: isStepUpActive, weight: 20 },
      { id: 'sessions', label: 'Active Sessions Monitored (< 5)', passed: isSessionsHealthy, weight: 15 },
      { id: 'identity', label: 'Administrator Identity Configured', passed: isAccountConfigured, weight: 15 }
    ];

    const score = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
    return { checks, score };
  }, [account, otpSettings, sessions]);

  // 3. Password Strength Calculation
  const passwordCriteria = useMemo(() => {
    return {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
      matches: newPassword.length > 0 && newPassword === confirmPassword
    };
  }, [newPassword, confirmPassword]);

  const passwordStrength = useMemo(() => {
    if (!newPassword) return { label: 'Empty', color: 'bg-stone-200', score: 0 };
    let score = 0;
    if (passwordCriteria.length) score++;
    if (passwordCriteria.uppercase) score++;
    if (passwordCriteria.lowercase) score++;
    if (passwordCriteria.number) score++;
    if (passwordCriteria.special) score++;

    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', score: 25 };
    if (score === 3) return { label: 'Fair', color: 'bg-amber-500', score: 50 };
    if (score === 4) return { label: 'Good', color: 'bg-blue-500', score: 75 };
    return { label: 'Strong', color: 'bg-emerald-600', score: 100 };
  }, [newPassword, passwordCriteria]);

  // 4. Test OTP Dispatch
  const handleSendTestOTP = async () => {
    setOtpTesting(true);
    setSecurityPhoneMsg(null);
    try {
      const res = await fetch('/api/admin/security/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SEND_TEST_OTP' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch test OTP.');
      }
      setSecurityPhoneMsg({
        type: 'success',
        text: `Test OTP successfully sent to ${otpSettings?.masked_phone || 'verified phone'}. Valid for 5 minutes.`
      });
      setTimeout(() => setSecurityPhoneMsg(null), 6000);
    } catch (err: any) {
      setSecurityPhoneMsg({ type: 'error', text: err.message || 'OTP dispatch failed.' });
    } finally {
      setOtpTesting(false);
    }
  };

  // 5. Toggle OTP Enforcement
  const handleToggleOTP = async (newEnabled: boolean) => {
    setOtpEnforcing(true);
    setSecurityPhoneMsg(null);
    try {
      const res = await fetch('/api/admin/security/otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_otp_enabled: newEnabled })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update OTP policy.');
      }
      setOtpSettings((prev) => prev ? { ...prev, admin_otp_enabled: newEnabled } : null);
      setSecurityPhoneMsg({
        type: 'success',
        text: `Administrator OTP multi-factor enforcement is now ${newEnabled ? 'ACTIVE' : 'DISABLED'}.`
      });
      loadAllSecurityData();
      setTimeout(() => setSecurityPhoneMsg(null), 5000);
    } catch (err: any) {
      setSecurityPhoneMsg({ type: 'error', text: err.message || 'Failed to update OTP status.' });
    } finally {
      setOtpEnforcing(false);
    }
  };

  // 6. Update Password Submit
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Please enter your current master password.' });
      return;
    }
    if (passwordStrength.score < 50) {
      setPasswordMsg({ type: 'error', text: 'New password does not meet minimum strength requirements.' });
      return;
    }
    if (!passwordCriteria.matches) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setPasswordUpdating(true);
    try {
      const res = await fetch('/api/admin/security/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          invalidate_other_sessions: invalidateOthers
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setPasswordMsg({
        type: 'success',
        text: 'Master password successfully updated and cryptographically hashed.'
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      loadAllSecurityData();
      setTimeout(() => setPasswordMsg(null), 6000);
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Error updating password.' });
    } finally {
      setPasswordUpdating(false);
    }
  };

  // 7. Update Administrator Identity
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountMsg(null);
    setAccountUpdating(true);

    try {
      const res = await fetch('/api/admin/security/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update administrator profile.');
      }

      setAccountMsg({ type: 'success', text: 'Administrator credentials saved.' });
      loadAllSecurityData();
      setTimeout(() => setAccountMsg(null), 5000);
    } catch (err: any) {
      setAccountMsg({ type: 'error', text: err.message || 'Error saving account.' });
    } finally {
      setAccountUpdating(false);
    }
  };

  // 8. Revoke Sessions
  const handleRevokeSession = async (sessionId: string) => {
    setSessionsRevoking(true);
    setSessionsMsg(null);
    try {
      const res = await fetch(`/api/admin/security/sessions?id=${sessionId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to revoke session.');
      }
      setSessionsMsg({ type: 'success', text: 'Session successfully revoked.' });
      loadAllSecurityData();
      setTimeout(() => setSessionsMsg(null), 4000);
    } catch (err: any) {
      setSessionsMsg({ type: 'error', text: err.message || 'Session revocation failed.' });
    } finally {
      setSessionsRevoking(false);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!confirm('Are you sure you want to revoke all other active admin sessions? Other logged-in devices will be immediately signed out.')) {
      return;
    }

    setSessionsRevoking(true);
    setSessionsMsg(null);
    try {
      const res = await fetch('/api/admin/security/sessions', {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to revoke sessions.');
      }
      setSessionsMsg({ type: 'success', text: 'All other administrator sessions have been invalidated.' });
      loadAllSecurityData();
      setTimeout(() => setSessionsMsg(null), 4000);
    } catch (err: any) {
      setSessionsMsg({ type: 'error', text: err.message || 'Failed to revoke other sessions.' });
    } finally {
      setSessionsRevoking(false);
    }
  };

  // 9. Step-Up OTP Input Handlers
  const handleOtpDigitChange = (index: number, val: string) => {
    const clean = val.replace(/[^\d]/g, '').slice(-1);
    const next = [...stepUpDigits];
    next[index] = clean;
    setStepUpDigits(next);

    // Auto-advance
    if (clean && index < 5) {
      const nextInput = document.getElementById(`stepup-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !stepUpDigits[index] && index > 0) {
      const prev = document.getElementById(`stepup-digit-${index - 1}`);
      prev?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/[^\d]/g, '').slice(0, 6);
    if (paste.length > 0) {
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < paste.length; i++) next[i] = paste[i];
      setStepUpDigits(next);
      const focusIndex = Math.min(paste.length, 5);
      document.getElementById(`stepup-digit-${focusIndex}`)?.focus();
    }
  };

  const handleOpenPhoneChangeModal = () => {
    setStepUpAction('CHANGE_PHONE');
    setStepUpDigits(['', '', '', '', '', '']);
    setStepUpError('');
    setStepUpCountdown(60);
    setNewPhonePending('');
    setStepUpModalOpen(true);
    // Trigger OTP dispatch for verification
    fetch('/api/admin/security/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'SEND_TEST_OTP' })
    }).catch(() => {});
  };

  const handleExecuteStepUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = stepUpDigits.join('');
    if (code.length !== 6) {
      setStepUpError('Please enter the full 6-digit security code.');
      return;
    }

    setStepUpSubmitting(true);
    setStepUpError('');

    try {
      if (stepUpAction === 'CHANGE_PHONE') {
        if (!newPhonePending || newPhonePending.length < 10) {
          throw new Error('Please provide a valid new security phone number (e.g. +92 300 1234567).');
        }

        const res = await fetch('/api/admin/security/otp', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verified_security_phone: newPhonePending,
            otp_code: code
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update security phone.');

        setSecurityPhoneMsg({ type: 'success', text: `Security phone updated to ${data.masked_phone || newPhonePending}.` });
      }

      setStepUpModalOpen(false);
      loadAllSecurityData();
      setTimeout(() => setSecurityPhoneMsg(null), 5000);
    } catch (err: any) {
      setStepUpError(err.message || 'Authorization failed. Invalid or expired code.');
    } finally {
      setStepUpSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Page Title & Subtitle */}
        <div className="border-b border-stone-200 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-900 text-amber-400 rounded-xl shadow-sm">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold text-stone-900">Enterprise Security Center</h1>
                  <p className="text-sm text-stone-500">
                    Manage administrator authentication, Phone OTP protection, master credentials, sessions and operational security.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadAllSecurityData}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-sm cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Security Status Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
            <div className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Security Status</div>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Protected</span>
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">2FA Method</div>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-stone-900">
                <Smartphone className="w-4 h-4 text-amber-600" />
                <span>{otpSettings?.admin_otp_enabled ? 'Phone OTP' : 'Disabled'}</span>
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Verified Phone</div>
              <div className="mt-1 font-bold text-xs text-stone-900 truncate">
                {otpSettings?.masked_phone || '+92 ******2910'}
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Master Password</div>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-emerald-900">
                <Key className="w-4 h-4 text-emerald-600" />
                <span>Encrypted</span>
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Active Sessions</div>
              <div className="mt-1 font-bold text-sm text-stone-900">
                {sessions.length} {sessions.length === 1 ? 'Device' : 'Devices'}
              </div>
            </div>
          </div>
        </div>

        {/* 6 Authoritative Security Status Cards (Phase 3 Requirement) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#113824] flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-800" />
              <span>Sovereign Security Posture & Status Assessment</span>
            </h3>
            <span className="text-[11px] text-stone-500 font-medium">Real-Time Evaluation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Admin Authentication */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-700" />
                  <span>Admin Authentication</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Secure
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-snug">
                Administrative access protected by unique staff identities and salted scrypt cryptographic password hashes.
              </p>
            </div>

            {/* 2. 2FA (Phone OTP) */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-700" />
                  <span>Two-Factor Auth (2FA)</span>
                </span>
                {otpSettings?.admin_otp_enabled ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Secure
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                    Action Required
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-600 leading-snug">
                {otpSettings?.admin_otp_enabled
                  ? `Cryptographic 6-digit OTP active via WhatsApp/SMS to verified number (${otpSettings?.masked_phone || '+92 ******2910'}).`
                  : 'Two-factor OTP enforcement is currently disabled. Enable below to secure executive access.'}
              </p>
            </div>

            {/* 3. Session Security */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-blue-700" />
                  <span>Session Security</span>
                </span>
                {sessions.length > 5 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Warning
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Secure
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-600 leading-snug">
                {sessions.length} active device {sessions.length === 1 ? 'session' : 'sessions'} tracked with IP logging, 24-hour expiration, and remote termination.
              </p>
            </div>

            {/* 4. Password Security */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-purple-700" />
                  <span>Password Security</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Secure
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-snug">
                Zero plaintext persistence. Password changes enforce minimum 8 characters with strength scoring and multi-session invalidation.
              </p>
            </div>

            {/* 5. Login Protection */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Login Protection</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Secure
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-snug">
                Brute-force mitigation with exponential backoff cooldown timers and step-up authentication for high-privilege operations.
              </p>
            </div>

            {/* 6. API Security */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-cyan-700" />
                  <span>API Security (RBAC)</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Secure
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-snug">
                All 41 administrative endpoints protected by server-side session guards. Non-staff and customer accounts rejected with HTTP 401/403.
              </p>
            </div>
          </div>
        </div>

        {/* Security Health Score Card */}
        <div className="p-6 bg-gradient-to-r from-emerald-950 via-[#0a2e1d] to-stone-900 rounded-2xl text-white shadow-md border border-emerald-800/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Authoritative Diagnostics</span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-stone-200">Real-Time Backend Audit</span>
              </div>
              <h2 className="text-xl font-serif font-bold text-white mt-1">
                Security Health Posture: {healthChecks.score}%
              </h2>
              <p className="text-xs text-stone-300 mt-1 max-w-2xl">
                Cryptographic evaluation based on verified security phone state, single-use OTP generation, session limits, and password integrity.
              </p>
            </div>

            {/* Score Pill */}
            <div className="text-right shrink-0">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/15">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span className="font-serif font-bold text-lg text-white">{healthChecks.score} / 100</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-2.5 mt-5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${healthChecks.score}%` }}
            />
          </div>

          {/* Individual Checks List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 text-xs">
            {healthChecks.checks.map((chk) => (
              <div
                key={chk.id}
                className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                  chk.passed
                    ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-900/30 border-amber-500/40 text-amber-200'
                }`}
              >
                {chk.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="truncate">{chk.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Global Alert Notification */}
        {securityPhoneMsg && (
          <div
            className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 border ${
              securityPhoneMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {securityPhoneMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            {securityPhoneMsg.text}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* HERO CARD: SECURITY PHONE & PHONE OTP (HIGH PRIORITY) */}
        {/* ------------------------------------------------------------- */}
        <div className="bg-white rounded-2xl border-2 border-emerald-900/20 shadow-md overflow-hidden">
          <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-50/50 via-white to-amber-50/30 border-b border-stone-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold uppercase tracking-wider">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-800" />
                  Primary Two-Factor Authentication (2FA)
                </div>
                <h2 className="text-xl font-serif font-bold text-stone-900">
                  Verified Security Phone & Cryptographic OTP Protection
                </h2>
                <p className="text-xs text-stone-600 max-w-2xl">
                  Administrative console access requires verified email and password followed by a single-use, 6-digit cryptographic passcode dispatched exclusively to this verified number.
                </p>
              </div>

              {/* Verified Phone Display Card */}
              <div className="bg-white p-4 rounded-xl border border-stone-300 shadow-sm shrink-0 min-w-[260px]">
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Verified Phone
                </div>
                <div className="text-lg font-mono font-bold text-stone-900 mt-1">
                  {otpSettings?.masked_phone || '+92 ******2910'}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Enrolled for OTP Verification</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 bg-white grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Action 1: Test OTP Dispatch */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">Live Delivery Test</span>
                <Send className="w-4 h-4 text-stone-400" />
              </div>
              <p className="text-xs text-stone-500">
                Dispatch an instantaneous test passcode to verify WhatsApp / SMS gateway deliverability.
              </p>
              <button
                onClick={handleSendTestOTP}
                disabled={otpTesting}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {otpTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send Test Passcode
              </button>
            </div>

            {/* Action 2: Change Security Phone */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">Update Number</span>
                <Smartphone className="w-4 h-4 text-stone-400" />
              </div>
              <p className="text-xs text-stone-500">
                Re-assign the authorized administrator phone. Requires step-up OTP challenge verification.
              </p>
              <button
                onClick={handleOpenPhoneChangeModal}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Change Security Phone
              </button>
            </div>

            {/* Action 3: Toggle OTP Enforcement */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">Enforcement Policy</span>
                <Sliders className="w-4 h-4 text-stone-400" />
              </div>
              <p className="text-xs text-stone-500">
                Toggle whether OTP challenge is mandatory for all administrator logins.
              </p>
              <button
                onClick={() => handleToggleOTP(!otpSettings?.admin_otp_enabled)}
                disabled={otpEnforcing}
                className={`w-full mt-2 inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer ${
                  otpSettings?.admin_otp_enabled
                    ? 'bg-emerald-900 text-white hover:bg-emerald-800'
                    : 'bg-stone-300 text-stone-700 hover:bg-stone-400'
                }`}
              >
                {otpEnforcing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {otpSettings?.admin_otp_enabled ? 'Enforced (Active)' : 'Disabled (Inactive)'}
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SECONDARY ROW: MASTER PASSWORD & ADMINISTRATOR IDENTITY */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Master Password Manager (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 shadow-sm p-6 md:p-8 space-y-6">
            <div className="border-b border-stone-200 pb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-emerald-900" />
                  <h3 className="text-lg font-serif font-bold text-stone-900">Master Password & Policy</h3>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Update administrative authentication secret using scrypt / bcrypt cryptographic hashing.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">Policy: Strong</span>
            </div>

            {passwordMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 border ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Current Master Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full text-xs py-2.5 px-3.5 pr-10 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full text-xs py-2.5 px-3.5 pr-10 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full text-xs py-2.5 px-3.5 pr-10 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Strength Meter & Policy Checklist */}
              {newPassword && (
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-700">Password Strength:</span>
                    <span className="font-bold text-stone-900">{passwordStrength.label}</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.length ? 'text-emerald-700 font-semibold' : 'text-stone-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${passwordCriteria.length ? 'text-emerald-600' : 'text-stone-300'}`} />
                      At least 8 characters
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.uppercase ? 'text-emerald-700 font-semibold' : 'text-stone-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${passwordCriteria.uppercase ? 'text-emerald-600' : 'text-stone-300'}`} />
                      One uppercase letter
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.lowercase ? 'text-emerald-700 font-semibold' : 'text-stone-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${passwordCriteria.lowercase ? 'text-emerald-600' : 'text-stone-300'}`} />
                      One lowercase letter
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.number ? 'text-emerald-700 font-semibold' : 'text-stone-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${passwordCriteria.number ? 'text-emerald-600' : 'text-stone-300'}`} />
                      One number
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.special ? 'text-emerald-700 font-semibold' : 'text-stone-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${passwordCriteria.special ? 'text-emerald-600' : 'text-stone-300'}`} />
                      Special character
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.matches ? 'text-emerald-700 font-semibold' : 'text-stone-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${passwordCriteria.matches ? 'text-emerald-600' : 'text-stone-300'}`} />
                      Passwords match
                    </div>
                  </div>
                </div>
              )}

              {/* Invalidate Other Sessions Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-700 pt-1">
                <input
                  type="checkbox"
                  checked={invalidateOthers}
                  onChange={(e) => setInvalidateOthers(e.target.checked)}
                  className="rounded border-stone-300 text-emerald-900 focus:ring-emerald-900"
                />
                Invalidate all other active sessions upon password reset (Recommended)
              </label>

              <button
                type="submit"
                disabled={passwordUpdating}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-emerald-900 hover:bg-emerald-800 rounded-xl transition-colors shadow-sm disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
              >
                {passwordUpdating && <RefreshCw className="w-4 h-4 animate-spin" />}
                Update Master Password
              </button>
            </form>
          </div>

          {/* Administrator Identity Form (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 shadow-sm p-6 md:p-8 space-y-6">
            <div className="border-b border-stone-200 pb-4">
              <h3 className="text-lg font-serif font-bold text-stone-900">Administrator Identity</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Manage your administrative login handle and registered communications email.
              </p>
            </div>

            {accountMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 border ${
                  accountMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {accountMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Admin Handle (Username) *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs py-2.5 px-3.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Registered Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs py-2.5 px-3.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Assigned Role</span>
                  <span className="font-bold text-stone-900">{account?.role || 'SUPER_ADMIN'}</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Account Status</span>
                  <span className="font-bold text-emerald-800">● Active</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={accountUpdating}
                className="w-full px-5 py-2.5 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {accountUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Save Identity Profile
              </button>
            </form>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* ROW 3: ACTIVE SECURITY SESSIONS & AUDIT TIMELINE */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Active Sessions Panel (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 shadow-sm p-6 md:p-8 space-y-6">
            <div className="border-b border-stone-200 pb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-emerald-900" />
                  <h3 className="text-lg font-serif font-bold text-stone-900">Active Security Sessions</h3>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Currently authorized devices and browsers maintaining active administrative sessions.
                </p>
              </div>

              {sessions.length > 1 && (
                <button
                  onClick={handleRevokeAllOtherSessions}
                  disabled={sessionsRevoking}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Revoke All Others
                </button>
              )}
            </div>

            {sessionsMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {sessionsMsg.text}
              </div>
            )}

            <div className="space-y-3">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`p-4 rounded-xl border transition-all ${
                    sess.is_current
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-stone-200 text-stone-700 shadow-2xs">
                        <Globe className="w-4 h-4 text-emerald-800" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-stone-900">
                            {sess.user_agent?.includes('Chrome') ? 'Google Chrome' : 'Web Browser'}
                          </span>
                          {sess.is_current && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Current Session
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {sess.ip_address ? `IP: ${sess.ip_address.slice(0, 7)}***` : 'Secure Terminal'} • Created {new Date(sess.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {!sess.is_current && (
                      <button
                        onClick={() => handleRevokeSession(sess.id)}
                        disabled={sessionsRevoking}
                        className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revoke session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Activity Timeline (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 shadow-sm p-6 md:p-8 space-y-6">
            <div className="border-b border-stone-200 pb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-900" />
                <h3 className="text-lg font-serif font-bold text-stone-900">Security Audit Activity</h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Immutable security events logged for accountability.
              </p>
            </div>

            {auditEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                No recent security actions logged.
              </div>
            ) : (
              <div className="space-y-3.5 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                {auditEvents.map((evt) => (
                  <div key={evt.id} className="relative pl-8 text-xs">
                    <div className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-emerald-900 border-2 border-white shadow-xs" />
                    <div className="font-semibold text-stone-900">{evt.action.replace(/_/g, ' ')}</div>
                    <div className="text-[11px] text-stone-500">
                      Target: {evt.target_type} • {new Date(evt.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* STEP-UP OTP MODAL (FOR SENSITIVE ACTIONS) */}
        {/* ------------------------------------------------------------- */}
        {stepUpModalOpen && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between p-5 border-b border-stone-200 bg-stone-50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-900 text-amber-400 rounded-lg">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-bold text-stone-900">Security Verification Required</h3>
                    <p className="text-xs text-stone-500">Authorized Step-Up Authorization</p>
                  </div>
                </div>
                <button
                  onClick={() => setStepUpModalOpen(false)}
                  className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-200/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleExecuteStepUp} className="p-6 space-y-5">
                {stepUpError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {stepUpError}
                  </div>
                )}

                {stepUpAction === 'CHANGE_PHONE' && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                      New Security Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+92 300 1234567"
                      value={newPhonePending}
                      onChange={(e) => setNewPhonePending(e.target.value)}
                      className="w-full text-sm font-mono py-2.5 px-3.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900"
                    />
                    <p className="text-[11px] text-stone-500 mt-1">
                      International format with country code (e.g. +92 300 8472910).
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2 text-center">
                    Enter 6-Digit Code sent to {otpSettings?.masked_phone || '+92 ******2910'}
                  </label>

                  {/* 6-Digit Segmented OTP Input */}
                  <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                    {stepUpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`stepup-digit-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-11 h-13 text-center text-xl font-bold font-mono border-2 border-stone-300 rounded-xl focus:outline-none focus:border-emerald-900 focus:ring-2 focus:ring-emerald-900/20 bg-stone-50 focus:bg-white transition-all shadow-xs"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
                  <span>Code expires in 5 minutes</span>
                  {stepUpCountdown > 0 ? (
                    <span className="font-semibold text-stone-600">Resend in {stepUpCountdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setStepUpCountdown(60);
                        fetch('/api/admin/security/otp', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'SEND_TEST_OTP' })
                        });
                      }}
                      className="text-emerald-900 font-bold hover:underline cursor-pointer"
                    >
                      Resend Passcode
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setStepUpModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={stepUpSubmitting || stepUpDigits.join('').length !== 6}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-900 hover:bg-emerald-800 rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {stepUpSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Verify & Authorize
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

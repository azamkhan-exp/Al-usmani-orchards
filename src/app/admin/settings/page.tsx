'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { safeFetchJson } from '@/lib/api-client';
import {
  Settings,
  Store,
  Phone,
  ShoppingCart,
  Truck,
  Mail,
  Shield,
  Search,
  Save,
  Send,
  CheckCircle,
  AlertCircle,
  Lock,
  Key,
  RefreshCw,
  ExternalLink,
  Bell,
  MessageSquare,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Check,
  Copy,
  Sparkles,
  Smartphone,
  Info,
  Radio,
  Clock,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Edit3,
  X,
  AlertTriangle,
  KeyRound
} from 'lucide-react';

type SettingsTab =
  | 'general'
  | 'admins'
  | 'account'
  | 'features'
  | 'whatsapp'
  | 'contact'
  | 'orders'
  | 'shipping'
  | 'couriers'
  | 'notifications'
  | 'email'
  | 'security'
  | 'seo';

export default function AdminSettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'general';

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Feature Flags State
  const [featuresList, setFeaturesList] = useState<any[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [togglingFeature, setTogglingFeature] = useState<Record<string, boolean>>({});

  // WhatsApp Business State
  const [whatsappConfig, setWhatsappConfig] = useState<any>({
    enabled: true,
    provider: 'SIMULATED',
    phoneNumberId: '',
    businessAccountId: '',
    accessTokenMasked: '',
    hasAccessToken: false,
    webhookVerifyToken: 'auo_whatsapp_verify_token_2026',
    adminNotificationNumber: '+92 300 8472910',
    webhookUrl: 'https://alusmaniorchards.pk/api/webhooks/whatsapp'
  });
  const [whatsappNewToken, setWhatsappNewToken] = useState('');
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [metaTestLoading, setMetaTestLoading] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState<any | null>(null);
  const [sendTestPhone, setSendTestPhone] = useState('+92 300 8472910');
  const [sendTestLoading, setSendTestLoading] = useState(false);
  const [sendTestResult, setSendTestResult] = useState<any | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Admin Management & RBAC State
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [invitationsList, setInvitationsList] = useState<any[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState<any>(null);

  // Modals & Action State
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [addAdminTab, setAddAdminTab] = useState<'INVITE' | 'DIRECT'>('INVITE');
  const [directName, setDirectName] = useState('');
  const [directEmail, setDirectEmail] = useState('');
  const [directPhone, setDirectPhone] = useState('');
  const [directRole, setDirectRole] = useState('ADMIN');
  const [directPassword, setDirectPassword] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ADMIN');
  const [createdInviteUrl, setCreatedInviteUrl] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Edit Role Modal
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
  const [newRoleValue, setNewRoleValue] = useState<string>('ADMIN');

  // Deleting Admin Modal
  const [deletingAdmin, setDeletingAdmin] = useState<any | null>(null);
  const [adminActionLoading, setAdminActionLoading] = useState(false);

  // Admin Account Settings State
  const [accountDetails, setAccountDetails] = useState<any | null>(null);
  const [accountName, setAccountName] = useState('');
  const [accountUsername, setAccountUsername] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPhone, setAccountPhone] = useState('');
  const [accountCurrentPassword, setAccountCurrentPassword] = useState('');
  const [accountNewPassword, setAccountNewPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);

  // Settings State
  const [general, setGeneral] = useState({
    store_name: 'Al Usmani Orchards',
    tagline: 'From Our Orchards to Your Door.',
    positioning: 'Fresh from Our Orchards • Premium Pakistani Mangoes • Naturally Grown • Delivered with Care',
    estd_year: 1934,
    currency: 'PKR',
    currency_symbol: 'Rs.',
    timezone: 'Asia/Karachi',
    announcement_enabled: true,
    announcement_banner: '🥭 Premium Pakistani Mangoes • Farm Fresh • Delivered to Your Door • Seasonal Selection • Zero Calcium Carbide • Nationwide Express Cold-Chain',
    announcement_link: '/#harvest',
    announcement_animation: true
  });

  const [contact, setContact] = useState({
    support_email: 'harvest@alusmaniorchards.pk',
    phone: '+92 300 8472910',
    whatsapp: '+92 300 8472910',
    farm_locations: [
      { name: 'Multan Royal Estate', address: 'Shujabad Road, Multan, Punjab, Pakistan' },
      { name: 'Mirpur Khas Heritage Grove', address: 'Mirwah Gorchani, Mirpur Khas, Sindh, Pakistan' }
    ]
  });

  const [orders, setOrders] = useState({
    order_prefix: 'AUO-',
    next_order_number: 10245,
    auto_confirm: true,
    allow_guest_checkout: true,
    enable_gifting: true
  });

  const [shipping, setShipping] = useState({
    standard_shipping_fee: 350,
    free_shipping_threshold: 10000,
    express_shipping_fee: 600,
    estimated_days: '1 - 2 business days'
  });

  const [couriersList, setCouriersList] = useState<any[]>([]);

  const [email, setEmail] = useState({
    from_name: 'Al Usmani Orchards',
    from_email: 'harvest@alusmaniorchards.pk',
    admin_alert_email: 'orders@alusmaniorchards.pk',
    support_email: 'support@alusmaniorchards.pk',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: false,
    enable_customer_confirmations: true,
    enable_admin_alerts: true,
    enable_dispatch_updates: true
  });

  const [notifications, setNotifications] = useState({
    admin_email: 'orders@alusmaniorchards.pk',
    admin_whatsapp: '+92 300 8472910',
    enable_admin_email: true,
    enable_admin_whatsapp: true,
    enable_customer_email: true,
    enable_customer_whatsapp: true,
    whatsapp_provider: 'SIMULATED' as 'META_CLOUD' | 'SIMULATED',
    meta_phone_number_id: '',
    meta_access_token: ''
  });

  const [security, setSecurity] = useState({
    session_timeout_hours: 24,
    max_failed_attempts: 5
  });

  const [seo, setSeo] = useState({
    meta_title: 'Al Usmani Orchards | Fresh from Our Orchards • Premium Pakistani Mangoes',
    meta_description: 'From Our Orchards to Your Door. Hand-picked Multani Chaunsa, Sindhri, Anwar Ratol, Dussehri. Tree-ripened, 100% calcium carbide-free, nationwide 24h cold-chain dispatch.',
    keywords: 'Buy Chaunsa Mango Online, Al Usmani Orchards, Premium Pakistani Mangoes, Fresh Mango Delivery, Multan Mangoes'
  });

  // Password change state
  const [adminUser, setAdminUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Test notification states
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);

  const [testWhatsAppPhone, setTestWhatsAppPhone] = useState('+92 300 8472910');
  const [testWhatsAppLoading, setTestWhatsAppLoading] = useState(false);
  const [testWhatsAppStatus, setTestWhatsAppStatus] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Sync tab with URL search param
  useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsTab;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await safeFetchJson<any>('/api/admin/settings');
      if (data?.success && data.settings) {
        if (data.settings.general) setGeneral((prev) => ({ ...prev, ...data.settings.general }));
        if (data.settings.contact) setContact((prev) => ({ ...prev, ...data.settings.contact }));
        if (data.settings.orders) setOrders((prev) => ({ ...prev, ...data.settings.orders }));
        if (data.settings.shipping) setShipping((prev) => ({ ...prev, ...data.settings.shipping }));
        if (data.settings.notifications) setNotifications((prev) => ({ ...prev, ...data.settings.notifications }));
        if (data.settings.email) setEmail((prev) => ({ ...prev, ...data.settings.email }));
        if (data.settings.security) setSecurity((prev) => ({ ...prev, ...data.settings.security }));
        if (data.settings.seo) setSeo((prev) => ({ ...prev, ...data.settings.seo }));
        if (data.couriersList) setCouriersList(data.couriersList);
        if (data.adminUser) {
          setAdminUser(data.adminUser);
          setTestEmailAddress(data.adminUser.email || 'orders@alusmaniorchards.pk');
        }
      }

      // Load Feature Flags
      safeFetchJson<any>('/api/admin/features')
        .then((fData) => {
          if (fData?.success && Array.isArray(fData.features)) {
            setFeaturesList(fData.features);
          }
        })
        .catch(() => {});

      // Load WhatsApp Config
      safeFetchJson<any>('/api/admin/whatsapp')
        .then((wData) => {
          if (wData?.success && wData.config) {
            setWhatsappConfig(wData.config);
          }
        })
        .catch(() => {});
    } catch (e: any) {
      console.error('Error loading settings:', e);
      setErrorMessage(e.message || 'Failed to load store settings from server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    try {
      const res = await safeFetchJson<any>('/api/admin/admins');
      if (res?.success) {
        setAdminsList(res.admins || []);
        setInvitationsList(res.invitations || []);
        if (res.current_user) {
          setCurrentAdminUser(res.current_user);
        }
      } else if (res?.error) {
        console.warn('Failed to load administrator roster:', res.error);
      }
    } catch (e: any) {
      console.error('Error fetching admin roster:', e);
    } finally {
      setAdminsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchNotificationLogs();
    fetchAdmins();
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsTab;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const fetchAdminAccount = async () => {
    try {
      const res = await safeFetchJson<any>('/api/admin/settings/account');
      if (res?.success && res.user) {
        setAccountDetails(res.user);
        setAccountName(res.user.name || '');
        setAccountUsername(res.user.username || '');
        setAccountEmail(res.user.email || '');
        setAccountPhone(res.user.phone || '');
      }
    } catch (err: any) {
      console.error('Failed to fetch admin account details:', err);
    }
  };

  const handleSaveAdminProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAccountSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const res = await safeFetchJson<any>('/api/admin/settings/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountName.trim(),
          username: accountUsername.trim() || null,
          email: accountEmail.trim(),
          phone: accountPhone.trim() || null
        })
      });
      if (res?.success) {
        setSuccessMessage('Administrator profile updated successfully.');
        fetchAdminAccount();
        fetchAdmins();
      } else {
        setErrorMessage(res?.error || 'Failed to update administrator profile.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating profile.');
    } finally {
      setAccountSaving(false);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNewPassword || accountNewPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }
    if (accountNewPassword !== accountConfirmPassword) {
      setErrorMessage('New passwords do not match. Please re-enter.');
      return;
    }
    setPasswordChanging(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const res = await safeFetchJson<any>('/api/admin/settings/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: accountCurrentPassword,
          newPassword: accountNewPassword
        })
      });
      if (res?.success) {
        setSuccessMessage('Your master password has been changed successfully.');
        setAccountCurrentPassword('');
        setAccountNewPassword('');
        setAccountConfirmPassword('');
      } else {
        setErrorMessage(res?.error || 'Failed to change password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error changing password.');
    } finally {
      setPasswordChanging(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'admins') {
      fetchAdmins();
    }
    if (activeTab === 'account') {
      fetchAdminAccount();
    }
  }, [activeTab]);

  const handleCreateAdminDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directName.trim() || !directEmail.trim() || !directPassword) {
      setErrorMessage('Full Name, Email and Master Password are required.');
      return;
    }
    setAdminActionLoading(true);
    setErrorMessage('');
    try {
      const res = await safeFetchJson<any>('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DIRECT',
          name: directName.trim(),
          email: directEmail.trim(),
          phone: directPhone.trim() || undefined,
          role: directRole,
          password: directPassword
        })
      });
      if (res?.success) {
        setSuccessMessage(`Administrator "${directName}" created successfully with role ${directRole}.`);
        setIsAddAdminModalOpen(false);
        setDirectName('');
        setDirectEmail('');
        setDirectPhone('');
        setDirectPassword('');
        setDirectRole('ADMIN');
        fetchAdmins();
      } else {
        setErrorMessage(res?.error || 'Failed to create administrator.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating administrator.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleCreateAdminInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setErrorMessage('Recipient email address is required.');
      return;
    }
    setAdminActionLoading(true);
    setErrorMessage('');
    try {
      const res = await safeFetchJson<any>('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'INVITE',
          email: inviteEmail.trim(),
          role: inviteRole
        })
      });
      if (res?.success) {
        const url = res.invitationUrl || res.inviteUrl || res.invitation?.invite_url || '';
        if (url) {
          setCreatedInviteUrl(url);
        }
        setSuccessMessage(res.message || `Administrator added successfully.`);
        fetchAdmins();
      } else {
        setErrorMessage(res?.error || 'Failed to authorize administrator.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error generating invitation.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingAdmin) return;
    setAdminActionLoading(true);
    setErrorMessage('');
    try {
      const res = await safeFetchJson<any>(`/api/admin/admins/${editingAdmin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRoleValue })
      });
      if (res?.success) {
        setSuccessMessage(`Role for ${editingAdmin.name} updated to ${newRoleValue}.`);
        setEditingAdmin(null);
        fetchAdmins();
      } else {
        setErrorMessage(res?.error || 'Failed to update administrator role.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating role.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleToggleAdminStatus = async (admin: any) => {
    const nextStatus = admin.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (
      nextStatus === 'SUSPENDED' &&
      !confirm(`Suspend access for ${admin.name} (${admin.email})? They will be immediately blocked and active sessions revoked.`)
    ) {
      return;
    }
    setErrorMessage('');
    try {
      const res = await safeFetchJson<any>(`/api/admin/admins/${admin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res?.success) {
        setSuccessMessage(`Status for ${admin.name} set to ${nextStatus}.`);
        fetchAdmins();
      } else {
        setErrorMessage(res?.error || 'Failed to update administrator status.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating status.');
    }
  };

  const handleRevokeAdminSessions = async (admin: any) => {
    if (!confirm(`Revoke all active sessions for ${admin.name} (${admin.email})? They will be forced to log in again.`)) {
      return;
    }
    setErrorMessage('');
    try {
      const res = await safeFetchJson<any>(`/api/admin/admins/${admin.id}/sessions`, {
        method: 'DELETE'
      });
      if (res?.success) {
        setSuccessMessage(`Terminated ${res.revoked_count} active session(s) for ${admin.name}.`);
        fetchAdmins();
      } else {
        setErrorMessage(res?.error || 'Failed to revoke sessions.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error revoking sessions.');
    }
  };

  const handleDeleteAdminConfirm = async () => {
    if (!deletingAdmin) return;
    setAdminActionLoading(true);
    setErrorMessage('');
    try {
      const res = await safeFetchJson<any>(`/api/admin/admins/${deletingAdmin.id}`, {
        method: 'DELETE'
      });
      if (res?.success) {
        setSuccessMessage(`Administrator "${deletingAdmin.name}" permanently removed.`);
        setDeletingAdmin(null);
        fetchAdmins();
      } else {
        setErrorMessage(res?.error || 'Failed to delete administrator.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error deleting administrator.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Cancel pending invitation for ${email}? The link will become immediately invalid.`)) return;
    setErrorMessage('');
    try {
      const res = await safeFetchJson<any>(`/api/admin/invitations/${invitationId}`, {
        method: 'DELETE'
      });
      if (res?.success) {
        setSuccessMessage(`Invitation for ${email} cancelled.`);
        fetchAdmins();
      } else {
        setErrorMessage(res?.error || 'Failed to cancel invitation.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error cancelling invitation.');
    }
  };

  const roleBadgeConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    SUPER_ADMIN: {
      label: 'Super Administrator',
      color: 'text-purple-900',
      bg: 'bg-purple-100',
      border: 'border-purple-300'
    },
    ADMIN: {
      label: 'Administrator',
      color: 'text-emerald-900',
      bg: 'bg-emerald-100',
      border: 'border-emerald-300'
    },
    FINANCE_MANAGER: {
      label: 'Finance Manager',
      color: 'text-blue-900',
      bg: 'bg-blue-100',
      border: 'border-blue-300'
    },
    INVENTORY_MANAGER: {
      label: 'Inventory Manager',
      color: 'text-amber-900',
      bg: 'bg-amber-100',
      border: 'border-amber-300'
    },
    ORDER_MANAGER: {
      label: 'Order Manager',
      color: 'text-cyan-900',
      bg: 'bg-cyan-100',
      border: 'border-cyan-300'
    },
    MARKETING_MANAGER: {
      label: 'Marketing Manager',
      color: 'text-rose-900',
      bg: 'bg-rose-100',
      border: 'border-rose-300'
    },
    SUPPORT_AGENT: {
      label: 'Support Agent',
      color: 'text-indigo-900',
      bg: 'bg-indigo-100',
      border: 'border-indigo-300'
    }
  };

  const handleToggleFeature = async (key: string, currentEnabled: boolean) => {
    setTogglingFeature((prev) => ({ ...prev, [key]: true }));
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const res = await safeFetchJson<any>('/api/admin/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled: !currentEnabled })
      });
      if (res?.success) {
        setFeaturesList((prev) =>
          prev.map((f) => (f.key === key ? { ...f, enabled: !currentEnabled } : f))
        );
        setSuccessMessage(`Feature '${key}' is now ${!currentEnabled ? 'ENABLED' : 'DISABLED'}.`);
        setTimeout(() => setSuccessMessage(''), 3500);
      } else {
        setErrorMessage(res?.error || `Failed to update feature ${key}.`);
      }
    } catch (err: any) {
      setErrorMessage(`Failed to update feature ${key}: ${err.message}`);
    } finally {
      setTogglingFeature((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSaveWhatsAppConfig = async () => {
    setWhatsappSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const res = await safeFetchJson<any>('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_config',
          enabled: whatsappConfig.enabled,
          provider: whatsappConfig.provider,
          phoneNumberId: whatsappConfig.phoneNumberId,
          businessAccountId: whatsappConfig.businessAccountId,
          accessToken: whatsappNewToken || undefined,
          webhookVerifyToken: whatsappConfig.webhookVerifyToken,
          adminNotificationNumber: whatsappConfig.adminNotificationNumber
        })
      });
      if (res?.success) {
        setSuccessMessage('WhatsApp Business Platform configuration saved securely.');
        setWhatsappNewToken('');
        const wData = await safeFetchJson<any>('/api/admin/whatsapp');
        if (wData?.success && wData.config) setWhatsappConfig(wData.config);
      } else {
        setErrorMessage(res?.error || 'Failed to save WhatsApp configuration.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating WhatsApp settings.');
    } finally {
      setWhatsappSaving(false);
    }
  };

  const handleTestMetaConnection = async () => {
    setMetaTestLoading(true);
    setMetaTestResult(null);
    try {
      const res = await safeFetchJson<any>('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection' })
      });
      setMetaTestResult(res);
    } catch (err: any) {
      setMetaTestResult({ success: false, error: err.message });
    } finally {
      setMetaTestLoading(false);
    }
  };

  const handleSendTestWhatsApp = async () => {
    if (!sendTestPhone.trim()) return;
    setSendTestLoading(true);
    setSendTestResult(null);
    try {
      const res = await safeFetchJson<any>('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_test', recipient_phone: sendTestPhone.trim() })
      });
      setSendTestResult(res);
      fetchNotificationLogs();
    } catch (err: any) {
      setSendTestResult({ success: false, error: err.message });
    } finally {
      setSendTestLoading(false);
    }
  };

  const handleSaveSection = async (section: SettingsTab) => {
    if (section === 'features') {
      setSuccessMessage('Feature flags are toggled in real time with instant persistence.');
      return;
    }
    if (section === 'whatsapp') {
      await handleSaveWhatsAppConfig();
      return;
    }

    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      let payloadData: any = {};

      if (section === 'general') payloadData = general;
      if (section === 'contact') payloadData = contact;
      if (section === 'orders') payloadData = orders;
      if (section === 'shipping') payloadData = shipping;
      if (section === 'couriers') payloadData = { couriers: couriersList };
      if (section === 'notifications') payloadData = notifications;
      if (section === 'email') payloadData = email;
      if (section === 'seo') payloadData = seo;
      if (section === 'security') {
        payloadData = security;
        if (newPassword) {
          if (newPassword !== confirmPassword) {
            setErrorMessage('New passwords do not match.');
            setSaving(false);
            return;
          }
          if (newPassword.length < 8) {
            setErrorMessage('New password must be at least 8 characters long.');
            setSaving(false);
            return;
          }
        }
      }

      const res = await safeFetchJson<any>('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          data: payloadData,
          passwordChange: newPassword ? { currentPassword, newPassword } : undefined
        })
      });

      if (res?.success) {
        setSuccessMessage(`Store settings for "${section.toUpperCase()}" saved successfully.`);
        if (newPassword) {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }
      } else {
        setErrorMessage(res?.error || 'Failed to save settings.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const fetchNotificationLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await safeFetchJson<any>('/api/admin/notifications');
      if (data?.success) {
        setRecentLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Error fetching notification logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: any }> = [
    { id: 'general', label: 'General & Brand', icon: Store },
    { id: 'admins', label: 'Admin Access', icon: Users },
    { id: 'account', label: 'Admin Account', icon: UserCheck },
    { id: 'orders', label: 'Order Engine', icon: ShoppingCart },
    { id: 'shipping', label: 'Cold-Chain Shipping', icon: Truck },
    { id: 'couriers', label: 'Courier Partners', icon: Truck },
    { id: 'whatsapp', label: 'WhatsApp Business API', icon: MessageSquare },
    { id: 'email', label: 'Email & SMTP', icon: Mail },
    { id: 'notifications', label: 'Order Alerts (Email & WhatsApp)', icon: Bell },
    { id: 'features', label: 'Feature Flags', icon: Sliders },
    { id: 'security', label: 'Admin Security', icon: Shield },
    { id: 'contact', label: 'Contact & Orchards', icon: Phone },
    { id: 'seo', label: 'SEO & Metadata', icon: Search }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-24 text-center text-xs text-gray-500 font-bold uppercase tracking-wider">
          Loading Al Usmani Orchards Settings Portal...
        </div>
      </AdminLayout>
    );
  }

  // Feature groups for structured rendering
  const featureCategories = [
    {
      title: 'Storefront & Cultivar Catalog',
      category: 'Storefront',
      icon: '🥭',
      keys: ['marquee_announcement', 'advanced_search', 'mango_comparison', 'seasonal_availability', 'product_reviews', 'recipe_pairing_guide']
    },
    {
      title: 'Shopping & Checkout Intelligence',
      category: 'Shopping & Cart',
      icon: '🛍️',
      keys: ['smart_cart', 'dynamic_pricing', 'coupon_codes', 'gift_packaging', 'abandoned_cart_recovery', 'guest_checkout']
    },
    {
      title: 'Patron Loyalty & Personalization',
      category: 'Customer Experience',
      icon: '👑',
      keys: ['customer_profile', 'loyalty_program', 'referral_system', 'wishlist', 'back_in_stock', 'buy_again']
    },
    {
      title: 'Logistics, Delivery & Operations',
      category: 'Operations & Logistics',
      icon: '🚚',
      keys: ['order_tracking', 'international_orders', 'delivery_slots', 'multi_courier']
    },
    {
      title: 'Platform Intelligence & Security',
      category: 'Admin & AI',
      icon: '🤖',
      keys: ['ai_sales_agent', 'two_factor_auth', 'whatsapp_support', 'voice_search']
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-black text-[#113824]">
              Centralized Store Settings
            </h1>
            <p className="text-xs text-gray-500">
              Configure brand identity, feature toggles, Meta WhatsApp Business Cloud API, sequential orders, and security credentials.
            </p>
          </div>

          {activeTab === 'admins' ? (
            currentAdminUser?.role === 'SUPER_ADMIN' ? (
              <button
                type="button"
                onClick={() => {
                  setIsAddAdminModalOpen(true);
                  setCreatedInviteUrl('');
                }}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Add Administrator</span>
              </button>
            ) : null
          ) : activeTab === 'account' ? null : (
            <button
              onClick={() => handleSaveSection(activeTab)}
              disabled={saving}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40 transition-colors shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : activeTab === 'features' ? 'Flags Live Saved' : 'Save Current Tab'}</span>
            </button>
          )}
        </div>

        {/* Global Feedback Notifications */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center space-x-2 shadow-xs">
            <CheckCircle className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center space-x-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 text-xs border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.set('tab', tab.id);
                    window.history.replaceState({}, '', url.toString());
                  }
                  setSuccessMessage('');
                  setErrorMessage('');
                }}
                className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#113824] text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Cards */}
        <div className="card-luxury p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 shadow-xs">
          {/* TAB: ADMIN ACCOUNT SETTINGS */}
          {activeTab === 'account' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                <div>
                  <h3 className="text-lg font-serif font-black text-[#113824] flex items-center space-x-2">
                    <UserCheck className="w-5 h-5 text-emerald-700" />
                    <span>My Administrative Account & Credentials</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Update your profile identity, manage username and email, and rotate your master access password securely.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Role: {accountDetails?.role || currentAdminUser?.role || 'ADMIN'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-mono bg-gray-100 text-gray-700 border border-gray-200">
                    {accountDetails?.activeSessions || 1} Active Session{(accountDetails?.activeSessions || 1) > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Card 1: Identity & Contact Form */}
                <form onSubmit={handleSaveAdminProfile} className="p-6 rounded-3xl bg-[#FDFBF7] border border-[#E8DBC5] space-y-4 text-xs">
                  <div className="flex items-center space-x-2 border-b border-[#E8DBC5] pb-3 text-[#113824]">
                    <Store className="w-4 h-4 text-[#D97706]" />
                    <h4 className="font-serif font-bold text-sm">Account Identity & Profile</h4>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-medium"
                      placeholder="e.g. Tariq Usmani"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Username (Handle)</label>
                    <input
                      type="text"
                      value={accountUsername}
                      onChange={(e) => setAccountUsername(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-mono text-xs"
                      placeholder="e.g. tariq_admin"
                    />
                    <span className="text-[10px] text-gray-400">Used for administrative login identification.</span>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Primary Email Address</label>
                    <input
                      type="email"
                      required
                      value={accountEmail}
                      onChange={(e) => setAccountEmail(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-medium"
                      placeholder="admin@alusmaniorchards.pk"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Mobile Phone Number</label>
                    <input
                      type="tel"
                      value={accountPhone}
                      onChange={(e) => setAccountPhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-mono text-xs"
                      placeholder="+92 300 8472910"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={accountSaving}
                      className="w-full py-3 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {accountSaving ? 'Saving Profile...' : 'Save Account Details'}
                    </button>
                  </div>
                </form>

                {/* Card 2: Password Rotation Form */}
                <form onSubmit={handleChangeAdminPassword} className="p-6 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-4 text-xs">
                  <div className="flex items-center space-x-2 border-b pb-3 text-[#113824]">
                    <KeyRound className="w-4 h-4 text-[#D97706]" />
                    <h4 className="font-serif font-bold text-sm">Security & Password Rotation</h4>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Current Password</label>
                    <input
                      type="password"
                      required={accountDetails?.hasPassword}
                      value={accountCurrentPassword}
                      onChange={(e) => setAccountCurrentPassword(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-mono text-xs"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">New Password (Min 8 Chars)</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={accountNewPassword}
                      onChange={(e) => setAccountNewPassword(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-mono text-xs"
                      placeholder="New master password"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={accountConfirmPassword}
                      onChange={(e) => setAccountConfirmPassword(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-mono text-xs"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                    <div className="font-bold flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-amber-700" />
                      <span>Cryptographic Protection</span>
                    </div>
                    <p>Passwords are hashed with Scrypt key derivation. Rotating your password will secure your account across all sessions.</p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordChanging}
                      className="w-full py-3 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {passwordChanging ? 'Updating Password...' : 'Update Password Securely'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB: MASTER FEATURE CONTROL SWITCHBOARD */}
          {activeTab === 'features' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
                <div>
                  <h3 className="text-lg font-serif font-black text-[#113824] flex items-center space-x-2">
                    <Sliders className="w-5 h-5 text-[#D97706]" />
                    <span>Master Feature Control System</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Toggle all 26 store modules. When disabled, features completely disappear from storefront/account with strict HTTP 403 API guards.
                  </p>
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    {featuresList.filter((f) => f.enabled).length} Enabled
                  </span>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-bold">
                    {featuresList.filter((f) => !f.enabled).length} Disabled
                  </span>
                </div>
              </div>

              {featureCategories.map((cat, idx) => {
                const catFeatures = featuresList.filter(
                  (f) => cat.keys.includes(f.key) || f.category === cat.category
                );

                return (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{cat.icon}</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#113824]">
                        {cat.title} ({catFeatures.length})
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {catFeatures.map((flag) => {
                        const isToggling = togglingFeature[flag.key];
                        return (
                          <div
                            key={flag.key}
                            className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                              flag.enabled
                                ? 'bg-[#FDFBF7] border-[#E8DBC5]'
                                : 'bg-gray-50/60 border-gray-200 opacity-80'
                            }`}
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-[#113824]">
                                  {flag.name}
                                </span>
                                <span
                                  className={`text-[9px] font-mono px-2 py-0.2 rounded font-bold ${
                                    flag.enabled
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-gray-200 text-gray-600'
                                  }`}
                                >
                                  {flag.enabled ? 'ACTIVE' : 'OFF'}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 leading-snug">
                                {flag.description}
                              </p>
                              <div className="text-[9px] font-mono text-gray-400">
                                key: {flag.key}
                              </div>
                            </div>

                            {/* Toggle Switch */}
                            <button
                              type="button"
                              onClick={() => handleToggleFeature(flag.key, flag.enabled)}
                              disabled={isToggling}
                              aria-label={`Toggle ${flag.name}`}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                flag.enabled ? 'bg-[#113824]' : 'bg-gray-300'
                              } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  flag.enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: WHATSAPP BUSINESS PLATFORM (CLOUD API v21.0) */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
                <div>
                  <h3 className="text-lg font-serif font-black text-[#113824] flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-emerald-600" />
                    <span>Official WhatsApp Business Platform (Meta Cloud API v21.0)</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Direct integration with Meta Graph API for authenticated order confirmations, tracking alerts, and patron concierge.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      whatsappConfig.provider === 'META_CLOUD'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    <Radio className="w-3 h-3 animate-pulse" />
                    <span>
                      {whatsappConfig.provider === 'META_CLOUD' ? 'Live Meta Cloud API' : 'Simulated Test Mode'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Webhook Configuration Box */}
              <div className="p-5 rounded-2xl bg-[#FDFBF7] border border-[#E8DBC5] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#113824] uppercase tracking-wider">
                    Meta Webhook Ingestion Endpoint
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">v21.0 Webhook</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-gray-600 block mb-1">Callback URL (Webhook Handshake):</label>
                    <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-[#E8DBC5]">
                      <input
                        type="text"
                        readOnly
                        value={whatsappConfig.webhookUrl || 'https://alusmaniorchards.pk/api/webhooks/whatsapp'}
                        className="flex-1 font-mono text-[11px] bg-transparent text-gray-700 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            whatsappConfig.webhookUrl || 'https://alusmaniorchards.pk/api/webhooks/whatsapp'
                          );
                          setCopiedWebhook(true);
                          setTimeout(() => setCopiedWebhook(false), 2000);
                        }}
                        className="p-1.5 text-gray-500 hover:text-[#113824]"
                        title="Copy Webhook URL"
                      >
                        {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-gray-600 block mb-1">Verification Token (Secret):</label>
                    <input
                      type="text"
                      value={whatsappConfig.webhookVerifyToken || ''}
                      onChange={(e) =>
                        setWhatsappConfig({ ...whatsappConfig, webhookVerifyToken: e.target.value })
                      }
                      className="w-full p-2 rounded-xl border border-[#E8DBC5] font-mono text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-gray-500">
                  Subscribed fields in Meta App Dashboard: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">messages</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">message_template_status_update</code>
                </div>
              </div>

              {/* Meta Cloud API Credentials Form */}
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Provider Operating Mode:
                    </label>
                    <select
                      value={whatsappConfig.provider || 'SIMULATED'}
                      onChange={(e) =>
                        setWhatsappConfig({ ...whatsappConfig, provider: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl border border-gray-300 font-bold bg-white"
                    >
                      <option value="SIMULATED">Simulated Test Mode (Logs to notification_logs table)</option>
                      <option value="META_CLOUD">Meta Cloud API v21.0 (Live WhatsApp Delivery)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Admin Alert Mobile (E.164):
                    </label>
                    <input
                      type="text"
                      value={whatsappConfig.adminNotificationNumber || ''}
                      onChange={(e) =>
                        setWhatsappConfig({
                          ...whatsappConfig,
                          adminNotificationNumber: e.target.value
                        })
                      }
                      placeholder="+92 300 8472910"
                      className="w-full p-2.5 rounded-xl border border-gray-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Meta Phone Number ID:
                    </label>
                    <input
                      type="text"
                      value={whatsappConfig.phoneNumberId || ''}
                      onChange={(e) =>
                        setWhatsappConfig({ ...whatsappConfig, phoneNumberId: e.target.value })
                      }
                      placeholder="e.g. 109827461529182"
                      className="w-full p-2.5 rounded-xl border border-gray-300 font-mono"
                    />
                    <span className="text-[10px] text-gray-400">From Meta App &gt; WhatsApp &gt; API Setup</span>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      WhatsApp Business Account ID (WABA ID):
                    </label>
                    <input
                      type="text"
                      value={whatsappConfig.businessAccountId || ''}
                      onChange={(e) =>
                        setWhatsappConfig({
                          ...whatsappConfig,
                          businessAccountId: e.target.value
                        })
                      }
                      placeholder="e.g. 291827461520192"
                      className="w-full p-2.5 rounded-xl border border-gray-300 font-mono"
                    />
                  </div>
                </div>

                {/* Permanent Token Input */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-gray-700 block">
                      Meta System User Access Token:
                    </label>
                    {whatsappConfig.hasAccessToken && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                        Existing Token Configured
                      </span>
                    )}
                  </div>

                  <input
                    type="password"
                    value={whatsappNewToken}
                    onChange={(e) => setWhatsappNewToken(e.target.value)}
                    placeholder={
                      whatsappConfig.accessTokenMasked
                        ? `Token saved: ${whatsappConfig.accessTokenMasked} (Type new token to overwrite)`
                        : 'Paste Meta Permanent System User Token (EAA...)'
                    }
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono text-xs bg-white"
                  />
                  <p className="text-[10px] text-gray-500">
                    Use a Permanent System User Token generated under Meta Business Manager &gt; System Users with <code className="text-gray-700 font-bold">whatsapp_business_messaging</code> permissions.
                  </p>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveWhatsAppConfig}
                    disabled={whatsappSaving}
                    className="px-5 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold uppercase tracking-wider text-xs shadow-xs disabled:opacity-50"
                  >
                    {whatsappSaving ? 'Saving Configuration...' : 'Save WhatsApp Configuration'}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestMetaConnection}
                    disabled={metaTestLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#F5EEE2] hover:bg-[#E8DBC5] text-[#113824] font-bold uppercase tracking-wider text-xs border border-[#E8DBC5] flex items-center space-x-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${metaTestLoading ? 'animate-spin' : ''}`} />
                    <span>{metaTestLoading ? 'Handshaking...' : 'Test Meta Connection'}</span>
                  </button>
                </div>

                {metaTestResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-mono ${
                      metaTestResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    <div className="font-bold">{metaTestResult.message || (metaTestResult.success ? 'Meta Handshake Verified!' : 'Handshake Failed')}</div>
                    {metaTestResult.details && (
                      <pre className="mt-1 text-[10px] whitespace-pre-wrap">
                        {JSON.stringify(metaTestResult.details, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>

              {/* Live Test Dispatch */}
              <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3 text-xs">
                <h4 className="font-bold text-gray-900 uppercase tracking-wider">
                  Dispatch Test WhatsApp Message
                </h4>
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    value={sendTestPhone}
                    onChange={(e) => setSendTestPhone(e.target.value)}
                    placeholder="+92 300 8472910"
                    className="flex-1 p-2.5 rounded-xl border border-gray-300 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestWhatsApp}
                    disabled={sendTestLoading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold uppercase tracking-wider shadow-xs disabled:opacity-50 flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendTestLoading ? 'Sending...' : 'Send Test Alert'}</span>
                  </button>
                </div>

                {sendTestResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-mono ${
                      sendTestResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    <div>{sendTestResult.message || (sendTestResult.success ? 'Message Dispatched!' : 'Dispatch Error')}</div>
                    {sendTestResult.response && (
                      <pre className="mt-1 text-[10px] whitespace-pre-wrap">
                        {JSON.stringify(sendTestResult.response, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>

              {/* Meta Developer Portal Setup Guide Collapsible */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3 text-xs text-gray-700">
                <div className="flex items-center space-x-2 text-[#113824] font-bold">
                  <Info className="w-4 h-4 text-[#D97706]" />
                  <span>Official Meta Setup Instructions for Al Usmani Orchards</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed text-gray-600 pl-1">
                  <li>Navigate to developers.facebook.com &gt; My Apps &gt; Al Usmani Orchards.</li>
                  <li>Add <strong>WhatsApp</strong> product to your App.</li>
                  <li>In <strong>API Setup</strong>, copy the test Phone Number ID and WhatsApp Business Account ID.</li>
                  <li>For permanent production credentials, create a <strong>System User</strong> in Meta Business Suite &gt; Settings &gt; Users &gt; System Users.</li>
                  <li>Assign permissions: <code>whatsapp_business_management</code> and <code>whatsapp_business_messaging</code>.</li>
                  <li>Generate a permanent token with "Never Expire" and paste it into the field above.</li>
                  <li>In WhatsApp &gt; Configuration, set the Webhook URL to <code className="text-gray-900 font-mono">https://alusmaniorchards.pk/api/webhooks/whatsapp</code> and verification token to your secret.</li>
                </ol>
              </div>
            </div>
          )}

          {/* 1. GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-serif font-bold text-[#113824]">
                  Brand Identity & Store Profile
                </h3>
                <p className="text-xs text-gray-500">
                  Global branding configuration strictly enforced across the customer storefront and admin portal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Brand Name:</label>
                  <input
                    type="text"
                    value={general.store_name}
                    onChange={(e) => setGeneral({ ...general, store_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold text-[#113824]"
                  />
                  <span className="text-[10px] text-gray-400">Strictly "Al Usmani Orchards"</span>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Established Year:</label>
                  <input
                    type="number"
                    value={general.estd_year}
                    onChange={(e) => setGeneral({ ...general, estd_year: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                  <span className="text-[10px] text-gray-400">Estd. 1934 • Multan, Punjab, Pakistan</span>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-gray-700 block mb-1">Primary Tagline:</label>
                  <input
                    type="text"
                    value={general.tagline}
                    onChange={(e) => setGeneral({ ...general, tagline: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                  />
                  <span className="text-[10px] text-gray-400">Strictly "From Our Orchards to Your Door."</span>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-gray-700 block mb-1">Brand Positioning Statement:</label>
                  <input
                    type="text"
                    value={general.positioning}
                    onChange={(e) => setGeneral({ ...general, positioning: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                  />
                  <span className="text-[10px] text-gray-400">Fresh from Our Orchards • Premium Pakistani Mangoes • Naturally Grown • Delivered with Care</span>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Currency Code & Symbol:</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={general.currency}
                      onChange={(e) => setGeneral({ ...general, currency: e.target.value })}
                      className="w-1/2 p-2.5 rounded-xl border border-gray-300"
                    />
                    <input
                      type="text"
                      value={general.currency_symbol}
                      onChange={(e) => setGeneral({ ...general, currency_symbol: e.target.value })}
                      className="w-1/2 p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Timezone:</label>
                  <input
                    type="text"
                    value={general.timezone}
                    onChange={(e) => setGeneral({ ...general, timezone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
              </div>

              {/* Announcement Marquee Ticker Settings */}
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-[#113824]">
                      Storefront Top Announcement Marquee Ticker
                    </h4>
                    <p className="text-xs text-gray-500">
                      Configure the continuous animated banner running across the top of every page.
                    </p>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={general.announcement_enabled}
                      onChange={(e) => setGeneral({ ...general, announcement_enabled: e.target.checked })}
                      className="rounded border-gray-300 text-[#113824] focus:ring-[#D97706]"
                    />
                    <span className="text-xs font-bold text-gray-700">Display Marquee</span>
                  </label>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Marquee Ticker Text:</label>
                    <textarea
                      rows={2}
                      value={general.announcement_banner}
                      onChange={(e) => setGeneral({ ...general, announcement_banner: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Target Click URL:</label>
                      <input
                        type="text"
                        value={general.announcement_link}
                        onChange={(e) => setGeneral({ ...general, announcement_link: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-gray-300"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={general.announcement_animation}
                          onChange={(e) => setGeneral({ ...general, announcement_animation: e.target.checked })}
                          className="rounded border-gray-300 text-[#113824] focus:ring-[#D97706]"
                        />
                        <span className="font-bold text-gray-700">Smooth Continuous Scrolling Animation</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ESTATE ADMINISTRATORS & ACCESS GOVERNANCE (RBAC) */}
          {activeTab === 'admins' && (
            <div className="space-y-8">
              {/* Header & Quick Action */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                <div>
                  <h3 className="text-lg font-serif font-black text-[#113824] flex items-center space-x-2">
                    <Users className="w-5 h-5 text-emerald-700" />
                    <span>Estate Administrators & Access Governance</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Manage administrative personnel, assign granular operational roles, issue secure onboarding invitations, and govern active session lifecycles.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={fetchAdmins}
                    disabled={adminsLoading}
                    className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs flex items-center space-x-1"
                    title="Refresh Roster"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${adminsLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  {currentAdminUser?.role === 'SUPER_ADMIN' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddAdminModalOpen(true);
                        setCreatedInviteUrl('');
                      }}
                      className="px-4 py-2 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Add Administrator</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Safeguard & Policy Banner */}
              <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#E8DBC5] flex items-start space-x-3 text-xs text-gray-700">
                <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-[#113824]">Role-Based Access Control (RBAC) & Sovereign Safeguards</span>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Granular permissions are enforced across all admin APIs. The authoritative estate owner and final remaining Super Administrator are permanently protected from deletion, suspension, or demotion. Session revocation immediately terminates all active bearer cookies for the targeted account.
                  </p>
                </div>
              </div>

              {/* Key Metrics / KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Total Staff</span>
                  <div className="text-xl font-serif font-black text-[#113824] mt-1">{adminsList.length}</div>
                  <span className="text-[10px] text-gray-400">Registered administrators</span>
                </div>
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Super Admins</span>
                  <div className="text-xl font-serif font-black text-purple-900 mt-1">
                    {adminsList.filter((a) => a.role === 'SUPER_ADMIN').length}
                  </div>
                  <span className="text-[10px] text-purple-600">Full sovereign authority</span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Active Sessions</span>
                  <div className="text-xl font-serif font-black text-emerald-900 mt-1">
                    {adminsList.reduce((acc, a) => acc + (a.active_sessions || 0), 0)}
                  </div>
                  <span className="text-[10px] text-emerald-600">Live tokens across devices</span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Pending Invites</span>
                  <div className="text-xl font-serif font-black text-amber-900 mt-1">{invitationsList.length}</div>
                  <span className="text-[10px] text-amber-600">Awaiting onboarding</span>
                </div>
              </div>

              {/* Roster Table (Desktop) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#113824]">
                    Active Administrator Directory ({adminsList.length})
                  </h4>
                  {currentAdminUser?.role !== 'SUPER_ADMIN' && (
                    <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      Read-Only View (Super Admin Required for Modifications)
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-[#113824] text-amber-300 uppercase tracking-wider font-bold text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Administrator</th>
                        <th className="py-3 px-4">Operational Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Phone / 2FA</th>
                        <th className="py-3 px-4">Sessions</th>
                        <th className="py-3 px-4">Last Login</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {adminsLoading ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400">
                            Loading administrator directory...
                          </td>
                        </tr>
                      ) : adminsList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400">
                            No administrators found.
                          </td>
                        </tr>
                      ) : (
                        adminsList.map((admin) => {
                          const badge = roleBadgeConfig[admin.role] || {
                            label: admin.role,
                            color: 'text-gray-800',
                            bg: 'bg-gray-100',
                            border: 'border-gray-200'
                          };
                          const isSelf = admin.id === currentAdminUser?.id;
                          const isOwner = admin.is_owner;
                          const canManage = currentAdminUser?.role === 'SUPER_ADMIN';

                          return (
                            <tr key={admin.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-full bg-[#113824] text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                    {admin.name?.charAt(0) || 'A'}
                                  </div>
                                  <div>
                                    <div className="font-bold text-gray-900 flex items-center space-x-1.5">
                                      <span>{admin.name}</span>
                                      {isOwner && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                          👑 Estate Owner
                                        </span>
                                      )}
                                      {isSelf && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-gray-400 font-mono text-[11px]">{admin.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.color} ${badge.border}`}
                                >
                                  {badge.label}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                {canManage && !isOwner ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAdminStatus(admin)}
                                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                                      admin.status === 'ACTIVE'
                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                                    }`}
                                    title="Click to toggle status"
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        admin.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-red-600'
                                      }`}
                                    />
                                    <span>{admin.status}</span>
                                  </button>
                                ) : (
                                  <span
                                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                      admin.status === 'ACTIVE'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        admin.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-red-600'
                                      }`}
                                    />
                                    <span>{admin.status}</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-gray-700">
                                {admin.phone ? (
                                  <div className="flex items-center space-x-1">
                                    <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>{admin.phone}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">Unlinked</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-gray-100 font-mono text-[11px] text-gray-700">
                                  <span>{admin.active_sessions || 0}</span>
                                  <span className="text-[10px] text-gray-400">active</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-gray-500 text-[11px] whitespace-nowrap">
                                {admin.last_login_at
                                  ? new Date(admin.last_login_at).toLocaleDateString('en-GB', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'Never'}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center space-x-1">
                                  {canManage && !isOwner && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingAdmin(admin);
                                        setNewRoleValue(admin.role);
                                      }}
                                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-[#113824] transition-colors"
                                      title="Edit Role"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {canManage && (
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeAdminSessions(admin)}
                                      className="p-1.5 rounded-lg border border-gray-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                                      title="Revoke All Sessions"
                                    >
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {canManage && !isOwner && (
                                    <button
                                      type="button"
                                      onClick={() => setDeletingAdmin(admin)}
                                      className="p-1.5 rounded-lg border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                                      title="Remove Administrator"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pending Staff Invitations */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#113824] flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-amber-600" />
                    <span>Pending Staff Invitations ({invitationsList.length})</span>
                  </h4>
                  <span className="text-[10px] text-gray-400">Expiring in 48 hours</span>
                </div>

                {invitationsList.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-400 bg-gray-50/50">
                    No pending invitations. All onboarding links have been claimed or expired.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                    <table className="w-full text-left text-xs text-gray-600">
                      <thead className="bg-gray-100 text-gray-700 uppercase tracking-wider font-bold text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Invited Email</th>
                          <th className="py-3 px-4">Assigned Role</th>
                          <th className="py-3 px-4">Issued Date</th>
                          <th className="py-3 px-4">Expires At</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {invitationsList.map((inv) => {
                          const badge = roleBadgeConfig[inv.role] || {
                            label: inv.role,
                            color: 'text-gray-800',
                            bg: 'bg-gray-100',
                            border: 'border-gray-200'
                          };
                          const canManage = currentAdminUser?.role === 'SUPER_ADMIN';

                          return (
                            <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-gray-900">{inv.email}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.color} ${badge.border}`}
                                >
                                  {badge.label}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-500 text-[11px]">
                                {new Date(inv.created_at).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-amber-800">
                                {new Date(inv.expires_at).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelInvitation(inv.id, inv.email)}
                                    className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold transition-colors"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* RBAC Reference Grid */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#113824]">
                  Granular Operational Role Reference
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-1">
                    <span className="font-bold text-purple-900 flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                      <span>SUPER_ADMIN</span>
                    </span>
                    <p className="text-[11px] text-purple-800 leading-snug">
                      Sovereign platform control, administrator provisioning, RBAC modifications, session terminations, and security configurations.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                    <span className="font-bold text-emerald-900 flex items-center space-x-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-700" />
                      <span>ADMIN</span>
                    </span>
                    <p className="text-[11px] text-emerald-800 leading-snug">
                      Core day-to-day operations: orders management, customer concierge, mango cultivar catalog, inventory, and reviews.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-1">
                    <span className="font-bold text-blue-900 flex items-center space-x-1.5">
                      <Store className="w-3.5 h-3.5 text-blue-700" />
                      <span>FINANCE_MANAGER</span>
                    </span>
                    <p className="text-[11px] text-blue-800 leading-snug">
                      Revenue intelligence, payment gateway settlements, sales reconciliation, order refunds, and financial reporting.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1">
                    <span className="font-bold text-amber-900 flex items-center space-x-1.5">
                      <Truck className="w-3.5 h-3.5 text-amber-700" />
                      <span>INVENTORY_MANAGER</span>
                    </span>
                    <p className="text-[11px] text-amber-800 leading-snug">
                      Cultivar harvest allocations, batch weight limits, cold-chain capacity, and crate inventory adjustments.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-cyan-50/60 border border-cyan-200 space-y-1">
                    <span className="font-bold text-cyan-900 flex items-center space-x-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-cyan-700" />
                      <span>ORDER_MANAGER</span>
                    </span>
                    <p className="text-[11px] text-cyan-800 leading-snug">
                      Order lifecycle verification, courier consignment booking, tracking code assignments, and dispatch status updates.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-1">
                    <span className="font-bold text-rose-900 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-700" />
                      <span>MARKETING_MANAGER</span>
                    </span>
                    <p className="text-[11px] text-rose-800 leading-snug">
                      Promotional banners, seasonal announcement tickers, discount coupons, and storefront search metadata.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. CONTACT & ORCHARDS TAB */}
          {activeTab === 'contact' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-serif font-bold text-[#113824]">
                  Orchard Locations & Official Concierge
                </h3>
                <p className="text-xs text-gray-500">
                  Customer service lines and geographical grove coordinates.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Concierge Email:</label>
                  <input
                    type="email"
                    value={contact.support_email}
                    onChange={(e) => setContact({ ...contact, support_email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Helpline Phone:</label>
                  <input
                    type="text"
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">WhatsApp Concierge:</label>
                  <input
                    type="text"
                    value={contact.whatsapp}
                    onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
              </div>

              {/* Physical Groves */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h4 className="font-serif font-bold text-sm text-[#113824]">Heritage Grove Locations</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {contact.farm_locations.map((loc, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                      <input
                        type="text"
                        value={loc.name}
                        onChange={(e) => {
                          const updated = [...contact.farm_locations];
                          updated[i].name = e.target.value;
                          setContact({ ...contact, farm_locations: updated });
                        }}
                        className="w-full font-bold text-[#113824] bg-white p-2 rounded-lg border border-gray-200"
                      />
                      <textarea
                        rows={2}
                        value={loc.address}
                        onChange={(e) => {
                          const updated = [...contact.farm_locations];
                          updated[i].address = e.target.value;
                          setContact({ ...contact, farm_locations: updated });
                        }}
                        className="w-full text-gray-600 bg-white p-2 rounded-lg border border-gray-200 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. ORDER ENGINE TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-serif font-bold text-[#113824]">
                  Sequential Order Numbering & Policies
                </h3>
                <p className="text-xs text-gray-500">
                  Ensure predictable order numbering and checkout workflow policies.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Order Prefix:</label>
                  <input
                    type="text"
                    value={orders.order_prefix}
                    onChange={(e) => setOrders({ ...orders, order_prefix: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono font-bold"
                  />
                  <span className="text-[10px] text-gray-400">e.g. AUO- results in AUO-10245</span>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Next Sequential Number:</label>
                  <input
                    type="number"
                    value={orders.next_order_number}
                    onChange={(e) => setOrders({ ...orders, next_order_number: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={orders.auto_confirm}
                    onChange={(e) => setOrders({ ...orders, auto_confirm: e.target.checked })}
                    className="rounded border-gray-300 text-[#113824] focus:ring-[#D97706]"
                  />
                  <span className="font-bold text-gray-700">Auto-confirm COD orders immediately upon booking</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={orders.allow_guest_checkout}
                    onChange={(e) => setOrders({ ...orders, allow_guest_checkout: e.target.checked })}
                    className="rounded border-gray-300 text-[#113824] focus:ring-[#D97706]"
                  />
                  <span className="font-bold text-gray-700">Allow instant guest checkout without registration</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={orders.enable_gifting}
                    onChange={(e) => setOrders({ ...orders, enable_gifting: e.target.checked })}
                    className="rounded border-gray-300 text-[#113824] focus:ring-[#D97706]"
                  />
                  <span className="font-bold text-gray-700">Enable Royal Gift Box option with handwritten parchment note</span>
                </label>
              </div>
            </div>
          )}

          {/* 4. SHIPPING TAB */}
          {activeTab === 'shipping' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-serif font-bold text-[#113824]">
                  Cold-Chain Freight & Free Shipping Thresholds
                </h3>
                <p className="text-xs text-gray-500">
                  Temperature-controlled express carrier freight rates.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Standard Cold-Chain Freight (PKR):</label>
                  <input
                    type="number"
                    value={shipping.standard_shipping_fee}
                    onChange={(e) => setShipping({ ...shipping, standard_shipping_fee: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Free Delivery Threshold (PKR):</label>
                  <input
                    type="number"
                    value={shipping.free_shipping_threshold}
                    onChange={(e) => setShipping({ ...shipping, free_shipping_threshold: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold text-emerald-800"
                  />
                  <span className="text-[10px] text-gray-400">Cart values at or above this threshold receive complimentary shipping</span>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Express Courier Rate (PKR):</label>
                  <input
                    type="number"
                    value={shipping.express_shipping_fee}
                    onChange={(e) => setShipping({ ...shipping, express_shipping_fee: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Estimated Delivery Window Display:</label>
                  <input
                    type="text"
                    value={shipping.estimated_days}
                    onChange={(e) => setShipping({ ...shipping, estimated_days: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. COURIERS TAB */}
          {activeTab === 'couriers' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#113824]">
                    Cold-Chain Courier Partners & API Integrations
                  </h3>
                  <p className="text-xs text-gray-500">
                    Carrier services used for dispatching ventilated harvest cartons nationwide.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {couriersList.map((c, i) => (
                  <div key={c.id || i} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-[#113824]">{c.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </div>
                    <div className="text-gray-500 text-[11px]">
                      Tracking Pattern: <code className="font-mono text-gray-800">{c.tracking_url_template || 'Auto-generated'}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-serif font-bold text-[#113824]">
                  Automated Multi-Channel Alert Configuration
                </h3>
                <p className="text-xs text-gray-500">
                  Instant order notifications dispatched via Email and WhatsApp to store administrators.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Admin Alert Recipient Email:</label>
                  <input
                    type="email"
                    value={notifications.admin_email}
                    onChange={(e) => setNotifications({ ...notifications, admin_email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Admin Alert WhatsApp Number:</label>
                  <input
                    type="text"
                    value={notifications.admin_whatsapp}
                    onChange={(e) => setNotifications({ ...notifications, admin_whatsapp: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono"
                  />
                </div>
              </div>

              {/* Notification Audit Log */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-serif font-bold text-sm text-[#113824]">Recent Notification Dispatches</h4>
                  <button
                    type="button"
                    onClick={fetchNotificationLogs}
                    className="text-xs text-[#D97706] hover:underline font-bold"
                  >
                    Refresh Logs
                  </button>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 text-xs">
                  {recentLogs.slice(0, 8).map((log) => (
                    <div key={log.id} className="p-3 flex justify-between items-center bg-white">
                      <div>
                        <div className="font-bold text-gray-800">{log.event_type} • {log.channel}</div>
                        <div className="text-[11px] text-gray-500">{log.recipient}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        log.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                  {recentLogs.length === 0 && (
                    <div className="p-4 text-center text-gray-400 text-xs italic">
                      No notification logs recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 7. EMAIL & SMTP TAB */}
          {activeTab === 'email' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-serif font-bold text-[#113824]">
                  SMTP Mailer & Email Dispatch
                </h3>
                <p className="text-xs text-gray-500">
                  Configure outgoing transactional SMTP credentials (Gmail, SendGrid, Amazon SES, or Postmark).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">From Sender Name:</label>
                  <input
                    type="text"
                    value={email.from_name}
                    onChange={(e) => setEmail({ ...email, from_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">From Email Address:</label>
                  <input
                    type="email"
                    value={email.from_email}
                    onChange={(e) => setEmail({ ...email, from_email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">SMTP Hostname:</label>
                  <input
                    type="text"
                    value={email.smtp_host}
                    onChange={(e) => setEmail({ ...email, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">SMTP Port:</label>
                  <input
                    type="number"
                    value={email.smtp_port}
                    onChange={(e) => setEmail({ ...email, smtp_port: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">SMTP Username:</label>
                  <input
                    type="text"
                    value={email.smtp_user}
                    onChange={(e) => setEmail({ ...email, smtp_user: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">SMTP Password / App Secret:</label>
                  <input
                    type="password"
                    value={email.smtp_pass}
                    onChange={(e) => setEmail({ ...email, smtp_pass: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 8. SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-serif font-bold text-[#113824]">
                  Admin Session & Passphrase Security
                </h3>
                <p className="text-xs text-gray-500">
                  Manage privileged administrator credentials and session expiry limits.
                </p>
              </div>

              {/* Password update section */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#113824]">Change Administrator Password</h4>
                  <p className="text-xs text-gray-500">
                    Updating your password will invalidate existing sessions on other devices.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Current Password:</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">New Password:</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Confirm New Password:</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-gray-400">
                  Leave password fields blank if you only wish to save session policies.
                </div>
              </div>

              {/* Session Policies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Session Timeout (Hours):</label>
                  <input
                    type="number"
                    value={security.session_timeout_hours}
                    onChange={(e) => setSecurity({ ...security, session_timeout_hours: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Max Failed Login Attempts:</label>
                  <input
                    type="number"
                    value={security.max_failed_attempts}
                    onChange={(e) => setSecurity({ ...security, max_failed_attempts: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 9. SEO TAB */}
          {activeTab === 'seo' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-serif font-bold text-[#113824]">
                  Search Engine Optimization (SEO) & Metadata
                </h3>
                <p className="text-xs text-gray-500">
                  Global search headers and OpenGraph tags for social sharing.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Meta Title Tag:</label>
                  <input
                    type="text"
                    value={seo.meta_title}
                    onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold text-[#113824]"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Meta Description:</label>
                  <textarea
                    rows={3}
                    value={seo.meta_description}
                    onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Target Keywords (Comma Separated):</label>
                  <input
                    type="text"
                    value={seo.keywords}
                    onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD ADMINISTRATOR / SEND INVITATION */}
      {isAddAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-serif font-black text-[#113824] flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-emerald-700" />
                  <span>Provision Estate Administrator</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Onboard authorized staff via secure invitation link or direct provisioning.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddAdminModalOpen(false);
                  setCreatedInviteUrl('');
                }}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab switch: Invite vs Direct */}
            <div className="flex rounded-2xl bg-gray-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAddAdminTab('INVITE');
                  setCreatedInviteUrl('');
                }}
                className={`flex-1 py-2.5 rounded-xl transition-all ${
                  addAdminTab === 'INVITE' ? 'bg-white text-[#113824] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                1. Send Invitation Link (Recommended)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddAdminTab('DIRECT');
                  setCreatedInviteUrl('');
                }}
                className={`flex-1 py-2.5 rounded-xl transition-all ${
                  addAdminTab === 'DIRECT' ? 'bg-white text-[#113824] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                2. Direct Provisioning
              </button>
            </div>

            {/* Sub-Flow A: Secure Invitation Link */}
            {addAdminTab === 'INVITE' && (
              <div className="space-y-4 text-xs">
                <p className="text-gray-600 leading-relaxed">
                  Generates a cryptographically signed 48-hour onboarding token. The recipient sets their own secure password and links their phone for WhatsApp/SMS OTP.
                </p>

                {createdInviteUrl ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                    <div className="flex items-center space-x-2 text-emerald-900 font-bold">
                      <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Invitation Link Generated!</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Copy and transmit this link to the staff member. It expires in 48 hours:
                    </p>
                    <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-emerald-300">
                      <input
                        type="text"
                        readOnly
                        value={createdInviteUrl}
                        className="flex-1 font-mono text-[11px] bg-transparent text-gray-800 outline-none select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(createdInviteUrl);
                          setCopiedInvite(true);
                          setTimeout(() => setCopiedInvite(false), 2000);
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-800 text-white text-[11px] font-bold hover:bg-emerald-900 transition-colors flex items-center space-x-1"
                      >
                        {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedInvite ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreatedInviteUrl('')}
                      className="text-[11px] text-emerald-700 underline font-bold"
                    >
                      Issue another invitation
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCreateAdminInvite} className="space-y-4">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Recipient Staff Email Address:</label>
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="staff@alusmaniorchards.pk"
                        className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Operational Role Assignment:</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-gray-300 font-bold bg-white"
                      >
                        <option value="ADMIN">ADMIN — Core operations, orders & catalog</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN — Full sovereign system control</option>
                        <option value="FINANCE_MANAGER">FINANCE_MANAGER — Revenue & payment settlements</option>
                        <option value="INVENTORY_MANAGER">INVENTORY_MANAGER — Mango harvest & crate allocations</option>
                        <option value="ORDER_MANAGER">ORDER_MANAGER — Dispatch & courier consignments</option>
                        <option value="MARKETING_MANAGER">MARKETING_MANAGER — Promotions & banners</option>
                        <option value="SUPPORT_AGENT">SUPPORT_AGENT — Customer care & order lookup</option>
                      </select>
                    </div>

                    <div className="pt-2 flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsAddAdminModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={adminActionLoading}
                        className="px-5 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {adminActionLoading ? 'Generating Link...' : 'Generate Secure Invitation Link'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Sub-Flow B: Direct Creation */}
            {addAdminTab === 'DIRECT' && (
              <form onSubmit={handleCreateAdminDirect} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Full Legal Name:</label>
                  <input
                    type="text"
                    required
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    placeholder="e.g. Tariq Usmani"
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Staff Work Email:</label>
                  <input
                    type="email"
                    required
                    value={directEmail}
                    onChange={(e) => setDirectEmail(e.target.value)}
                    placeholder="tariq@alusmaniorchards.pk"
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Mobile Phone (WhatsApp / SMS 2FA):</label>
                  <input
                    type="tel"
                    value={directPhone}
                    onChange={(e) => setDirectPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono"
                  />
                  <span className="text-[10px] text-gray-400">Used for two-factor authentication challenges.</span>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Role Assignment:</label>
                  <select
                    value={directRole}
                    onChange={(e) => setDirectRole(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold bg-white"
                  >
                    <option value="ADMIN">ADMIN — Core operations, orders & catalog</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN — Full sovereign system control</option>
                    <option value="FINANCE_MANAGER">FINANCE_MANAGER — Revenue & payment settlements</option>
                    <option value="INVENTORY_MANAGER">INVENTORY_MANAGER — Mango harvest & crate allocations</option>
                    <option value="ORDER_MANAGER">ORDER_MANAGER — Dispatch & courier consignments</option>
                    <option value="MARKETING_MANAGER">MARKETING_MANAGER — Promotions & banners</option>
                    <option value="SUPPORT_AGENT">SUPPORT_AGENT — Customer care & order lookup</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Initial Master Password:</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={directPassword}
                    onChange={(e) => setDirectPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddAdminModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adminActionLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {adminActionLoading ? 'Creating User...' : 'Create Administrator Now'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ROLE */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-5 relative">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-serif font-black text-[#113824] flex items-center space-x-2">
                  <Edit3 className="w-5 h-5 text-emerald-700" />
                  <span>Update Operational Role</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Adjust role permissions for <strong className="text-gray-900">{editingAdmin.name}</strong> ({editingAdmin.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">Select Role Assignment:</label>
                <select
                  value={newRoleValue}
                  onChange={(e) => setNewRoleValue(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 font-bold bg-white text-xs"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN — Full sovereign system control</option>
                  <option value="ADMIN">ADMIN — Core operations, orders & catalog</option>
                  <option value="FINANCE_MANAGER">FINANCE_MANAGER — Revenue & payment settlements</option>
                  <option value="INVENTORY_MANAGER">INVENTORY_MANAGER — Mango harvest & crate allocations</option>
                  <option value="ORDER_MANAGER">ORDER_MANAGER — Dispatch & courier consignments</option>
                  <option value="MARKETING_MANAGER">MARKETING_MANAGER — Promotions & banners</option>
                  <option value="SUPPORT_AGENT">SUPPORT_AGENT — Customer care & order lookup</option>
                </select>
              </div>

              {newRoleValue === 'SUPER_ADMIN' && (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[11px] leading-relaxed">
                  <strong>Notice:</strong> Granting Super Administrator provides unrestricted access to security configurations, staff provisioning, and session controls.
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateRole}
                  disabled={adminActionLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold disabled:opacity-50 transition-colors shadow-xs"
                >
                  {adminActionLoading ? 'Updating...' : 'Confirm Role Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {deletingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-red-200 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-5 relative">
            <div className="flex items-start space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-serif font-black text-red-950">
                  Revoke & Remove Administrator
                </h3>
                <p className="text-xs text-red-700 mt-1">
                  Permanent credential revocation
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              Are you sure you want to permanently remove <strong className="text-gray-900">{deletingAdmin.name}</strong> ({deletingAdmin.email})?
              All active sessions will be terminated immediately, and their administrative access will be revoked permanently.
            </p>

            <div className="pt-2 flex justify-end space-x-2 text-xs">
              <button
                type="button"
                onClick={() => setDeletingAdmin(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAdminConfirm}
                disabled={adminActionLoading}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50 transition-colors shadow-xs"
              >
                {adminActionLoading ? 'Removing...' : 'Permanently Remove Administrator'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

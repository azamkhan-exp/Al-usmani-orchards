'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Package,
  MapPin,
  LogOut,
  ChevronLeft,
  Truck,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Clock,
  ShieldCheck,
  X,
  FileText,
  Key,
  Bell,
  Check,
  AlertCircle,
  ExternalLink,
  Smartphone,
  Heart,
  Award,
  Star,
  RotateCcw,
  ShoppingBag
} from 'lucide-react';
import { formatPKR, formatDate } from '@/lib/formatters';
import { safeFetchJson } from '@/lib/api-client';
import { useFeatureFlags } from '@/context/FeaturesContext';
import { useCart } from '@/context/CartContext';

type AccountTab =
  | 'ORDERS'
  | 'WISHLIST'
  | 'REWARDS'
  | 'REVIEWS'
  | 'ADDRESSES'
  | 'PROFILE'
  | 'SECURITY'
  | 'NOTIFICATIONS';

export default function CustomerAccountPage() {
  const router = useRouter();
  const { isFeatureEnabled } = useFeatureFlags();
  const { addItem, openCart } = useCart();

  const [user, setUser] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AccountTab>('ORDERS');

  // Selected order for itemized detail modal
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);

  // Address Modal (Add / Edit)
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrLabel, setAddrLabel] = useState('Home');
  const [recipientName, setRecipientName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [addrArea, setAddrArea] = useState('');
  const [addrCity, setAddrCity] = useState('Lahore');
  const [addrProvince, setAddrProvince] = useState('Punjab');
  const [addrPostal, setAddrPostal] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState('');

  // Profile Edit State
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCity, setProfileCity] = useState('Lahore');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Security / Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);

  // Notification Preferences State
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    deliveryUpdates: true,
    promotionalOffers: false
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState('');

  // Wishlist State
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Rewards State
  const [rewardsData, setRewardsData] = useState<{
    account: any;
    tierInfo: any;
    ledger: any[];
  } | null>(null);
  const [rewardsLoading, setRewardsLoading] = useState(false);

  // Reviews State
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReviewOrder, setNewReviewOrder] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');
  const [reviewErrorMsg, setReviewErrorMsg] = useState('');

  // Reorder State
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null);
  const [reorderSuccessMsg, setReorderSuccessMsg] = useState('');

  const fetchAccountData = async () => {
    setLoading(true);
    try {
      const pData = await safeFetchJson<any>('/api/account/profile');
      if (pData?.success) {
        setUser(pData.user);
        setCustomer(pData.customer);
        setProfileName(pData.user.name || '');
        setProfilePhone(pData.user.phone || '');
        setProfileCity(pData.customer?.city || 'Lahore');

        // Fetch orders
        safeFetchJson<any>('/api/account/orders')
          .then((oData) => {
            if (oData?.success) setOrders(oData.orders || []);
          })
          .catch((err) => console.warn('[ACCOUNT] Orders fetch notice:', err.message || err));

        // Fetch addresses
        safeFetchJson<any>('/api/account/addresses')
          .then((aData) => {
            if (aData?.success) setAddresses(aData.addresses || []);
          })
          .catch((err) => console.warn('[ACCOUNT] Addresses fetch notice:', err.message || err));

        // Fetch notification preferences
        safeFetchJson<any>('/api/account/notifications')
          .then((nData) => {
            if (nData?.success && nData.preferences) setNotifications(nData.preferences);
          })
          .catch(() => {});

        // Fetch active sessions
        safeFetchJson<any>('/api/account/security/sessions')
          .then((sData) => {
            if (sData?.success && sData.sessions) setSessions(sData.sessions);
          })
          .catch(() => {});
      }
    } catch (e: any) {
      if (e?.status === 401 || e?.message?.includes('Unauthorized')) {
        router.push('/login?redirect=/account');
      } else {
        console.warn('[ACCOUNT] Profile fetch notice:', e.message || e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountData();
  }, [router]);

  // Lazy fetch tabs data on activeTab switch
  useEffect(() => {
    if (activeTab === 'WISHLIST' && isFeatureEnabled('wishlist')) {
      setWishlistLoading(true);
      safeFetchJson<any>('/api/account/wishlist')
        .then((res) => {
          if (res?.success) setWishlistItems(res.items || []);
        })
        .catch(() => {})
        .finally(() => setWishlistLoading(false));
    } else if (activeTab === 'REWARDS' && isFeatureEnabled('loyalty_program')) {
      setRewardsLoading(true);
      safeFetchJson<any>('/api/account/rewards')
        .then((res) => {
          if (res?.success) setRewardsData(res);
        })
        .catch(() => {})
        .finally(() => setRewardsLoading(false));
    } else if (activeTab === 'REVIEWS' && isFeatureEnabled('product_reviews')) {
      setReviewsLoading(true);
      safeFetchJson<any>('/api/account/reviews')
        .then((res) => {
          if (res?.success) setMyReviews(res.reviews || []);
        })
        .catch(() => {})
        .finally(() => setReviewsLoading(false));
    }
  }, [activeTab, isFeatureEnabled]);

  const handleLogout = async () => {
    try {
      await safeFetchJson('/api/auth/logout', { method: 'POST' });
    } catch (e: any) {
      console.warn('[AUTH] Logout notice:', e.message || e);
    }
    router.push('/');
  };

  const openAddAddressModal = () => {
    setEditingAddressId(null);
    setAddrLabel('Home');
    setRecipientName(user?.name || '');
    setAddrPhone(user?.phone || '');
    setStreetAddress('');
    setAddrArea('');
    setAddrCity(customer?.city || 'Lahore');
    setAddrProvince('Punjab');
    setAddrPostal('');
    setIsDefault(addresses.length === 0);
    setAddressError('');
    setAddressModalOpen(true);
  };

  const openEditAddressModal = (addr: any) => {
    setEditingAddressId(addr.id);
    setAddrLabel(addr.label || 'Home');
    setRecipientName(addr.recipient_name || '');
    setAddrPhone(addr.phone || '');
    setStreetAddress(addr.street_address || '');
    setAddrArea(addr.area || '');
    setAddrCity(addr.city || 'Lahore');
    setAddrProvince(addr.province || 'Punjab');
    setAddrPostal(addr.postal_code || '');
    setIsDefault(addr.is_default === 1);
    setAddressError('');
    setAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !addrPhone.trim() || !streetAddress.trim() || !addrCity.trim()) {
      setAddressError('Please fill out all required fields.');
      return;
    }

    setAddressSaving(true);
    setAddressError('');
    try {
      const payload = {
        id: editingAddressId,
        label: addrLabel,
        recipientName: recipientName.trim(),
        phone: addrPhone.trim(),
        streetAddress: streetAddress.trim(),
        area: addrArea.trim(),
        city: addrCity.trim(),
        province: addrProvince,
        postalCode: addrPostal.trim(),
        isDefault
      };

      const method = editingAddressId ? 'PUT' : 'POST';
      const res = await safeFetchJson<any>('/api/account/addresses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res?.success) {
        setAddressModalOpen(false);
        const aData = await safeFetchJson<any>('/api/account/addresses');
        if (aData?.success) setAddresses(aData.addresses || []);
      } else {
        setAddressError(res?.error || 'Failed to save address.');
      }
    } catch (err: any) {
      setAddressError(err.message || 'Error occurred while saving.');
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you wish to remove this delivery destination?')) return;
    try {
      await safeFetchJson(`/api/account/addresses?id=${id}`, { method: 'DELETE' });
      setAddresses(addresses.filter((a) => a.id !== id));
    } catch (e: any) {
      alert('Could not delete address: ' + e.message);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccessMsg('');
    setProfileErrorMsg('');
    try {
      const res = await safeFetchJson<any>('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName.trim(),
          phone: profilePhone.trim(),
          city: profileCity.trim()
        })
      });
      if (res?.success) {
        setProfileSuccessMsg('Your patron profile details have been updated.');
        setUser((prev: any) => ({ ...prev, name: profileName.trim(), phone: profilePhone.trim() }));
      } else {
        setProfileErrorMsg(res?.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Error saving profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/account/security/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();

      if (data.success) {
        setPasswordSuccess('Your account password has been updated securely.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(data.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setPasswordError('Network error. Please try again.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifSaving(true);
    setNotifSuccess('');
    try {
      const res = await fetch('/api/account/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifications)
      });
      const data = await res.json();
      if (data.success) {
        setNotifSuccess('Notification preferences saved.');
        setTimeout(() => setNotifSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNotifSaving(false);
    }
  };

  // Reorder / Buy Again Handler
  const handleReorder = async (orderId: string, orderNumber: string) => {
    setReorderingOrderId(orderId);
    setReorderSuccessMsg('');
    try {
      const res = await fetch('/api/account/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.addedItems)) {
        // Add items to client cart
        data.addedItems.forEach((item: any) => {
          addItem(
            {
              packageSizeId: item.packageSizeId,
              productId: item.productId,
              productName: item.varietyName,
              varietyName: item.varietyName,
              packageName: item.packageName,
              weightKg: item.weightKg,
              unitPrice: item.unitPrice,
              image: item.image || '/images/placeholder-mango.svg'
            },
            item.quantity
          );
        });

        setReorderSuccessMsg(`Added ${data.addedCount} harvest crate(s) from #${orderNumber} to your cart!`);
        openCart();
        setTimeout(() => setReorderSuccessMsg(''), 5000);
      } else {
        alert(data.error || 'Unable to reorder. Items may no longer be available.');
      }
    } catch (err) {
      console.error('Reorder failed:', err);
      alert('Network error while processing reorder request.');
    } finally {
      setReorderingOrderId(null);
    }
  };

  // Remove Wishlist Item
  const handleRemoveWishlist = async (productId: string) => {
    try {
      const res = await fetch(`/api/account/wishlist?productId=${productId}`, { method: 'DELETE' });
      if (res.ok) {
        setWishlistItems((prev) => prev.filter((it) => it.product_id !== productId));
      }
    } catch (err) {
      console.error('Failed to remove from wishlist:', err);
    }
  };

  // Move Wishlist Item to Cart
  const handleWishlistAddToCart = (item: any) => {
    if (!item.package_id || item.available_stock <= 0) return;
    addItem({
      packageSizeId: item.package_id,
      productId: item.product_id,
      productName: item.product_name,
      varietyName: item.variety_name,
      packageName: item.package_name || 'Standard Crate',
      weightKg: item.weight_kg || 5,
      unitPrice: item.effective_price || item.base_price,
      image: item.primary_image || '/images/placeholder-mango.svg'
    });
    handleRemoveWishlist(item.product_id);
    openCart();
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewOrder) return;
    setReviewSubmitting(true);
    setReviewSuccessMsg('');
    setReviewErrorMsg('');

    try {
      const res = await fetch('/api/account/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: newReviewOrder.id,
          productId: newReviewOrder.items?.[0]?.product_id || newReviewOrder.items?.[0]?.productId,
          rating: reviewRating,
          title: reviewTitle.trim(),
          comment: reviewComment.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setReviewSuccessMsg('Your tasting review has been received and staged for orchard moderation.');
        setReviewTitle('');
        setReviewComment('');
        setNewReviewOrder(null);
        // Refresh reviews
        const refData = await safeFetchJson<any>('/api/account/reviews');
        if (refData?.success) setMyReviews(refData.reviews || []);
      } else {
        setReviewErrorMsg(data.error || 'Failed to submit review.');
      }
    } catch (err: any) {
      setReviewErrorMsg('Error submitting review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Compute profile completion %
  const calculateProfileCompletion = () => {
    let score = 25; // Account created
    if (user?.name && user.name.trim().length > 2) score += 25;
    if (user?.phone && user.phone.trim().length > 7) score += 25;
    if (addresses.length > 0) score += 25;
    return score;
  };

  // Order status pipeline step index
  const getOrderStep = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'PENDING' || s === 'PAYMENT_PENDING' || s === 'CONFIRMED') return 1;
    if (s === 'PROCESSING') return 2;
    if (s === 'PACKING' || s === 'PACKED' || s === 'READY_TO_SHIP' || s === 'READY_FOR_DISPATCH') return 3;
    if (s === 'SHIPPED' || s === 'IN_TRANSIT' || s === 'OUT_FOR_DELIVERY') return 4;
    if (s === 'DELIVERED') return 5;
    return 1;
  };

  const statusSteps = [
    { label: 'Confirmed', desc: 'Allocation staged' },
    { label: 'Processing', desc: 'Dawn-picking' },
    { label: 'Packed', desc: 'Foam-nested' },
    { label: 'Shipped', desc: 'Cold-chain transit' },
    { label: 'Delivered', desc: 'Arrived at door' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] py-24 text-center">
        <div className="text-sm font-bold text-[#113824] animate-pulse">
          Connecting to Al Usmani Orchards Patron Portal...
        </div>
      </div>
    );
  }

  const completionPct = calculateProfileCompletion();

  // Dynamic Navigation Tabs Array (Strictly Guarded by Feature Flags)
  const navTabs: Array<{ id: AccountTab; label: string; icon: any }> = [
    { id: 'ORDERS', label: `Consignments (${orders.length})`, icon: Package }
  ];

  if (isFeatureEnabled('wishlist')) {
    navTabs.push({ id: 'WISHLIST', label: 'Saved Crates', icon: Heart });
  }

  if (isFeatureEnabled('loyalty_program')) {
    navTabs.push({ id: 'REWARDS', label: 'Patron Rewards', icon: Award });
  }

  if (isFeatureEnabled('product_reviews')) {
    navTabs.push({ id: 'REVIEWS', label: 'Harvest Reviews', icon: Star });
  }

  navTabs.push({ id: 'ADDRESSES', label: `Address Book (${addresses.length})`, icon: MapPin });

  if (isFeatureEnabled('customer_profile')) {
    navTabs.push({ id: 'PROFILE', label: 'Personal Profile', icon: User });
  }

  navTabs.push(
    { id: 'SECURITY', label: 'Security & Password', icon: Key },
    { id: 'NOTIFICATIONS', label: 'Alert Preferences', icon: Bell }
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-xs font-bold text-[#113824] hover:text-[#D97706] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Orchards Storefront</span>
          </Link>
          <div className="flex items-center space-x-3 sm:space-x-4">
            {user?.role !== 'CUSTOMER' && (
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-xl bg-[#113824] text-[#F59E0B] text-xs font-bold uppercase tracking-wider hover:bg-[#195235] transition shadow-xs"
              >
                Admin ERP →
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-1 text-xs font-bold text-red-600 hover:text-red-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Global Success / Alert Banner */}
        {reorderSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center space-x-2 shadow-xs">
            <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{reorderSuccessMsg}</span>
          </div>
        )}

        {/* Patron Banner Card */}
        <div className="card-luxury p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#092115] via-[#113824] to-[#195235] text-white border border-[#E8DBC5] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center space-x-4">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#F59E0B] shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#F59E0B] text-[#092115] flex items-center justify-center font-serif font-black text-2xl shadow-md shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-[#FBBF24] font-bold uppercase tracking-widest">
                  Valued Patron
                </span>
                {user?.email_verified === 1 && (
                  <span className="flex items-center space-x-1 text-[10px] bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-white mt-0.5">{user?.name}</h1>
              <div className="text-xs text-[#F5EEE2]/80 mt-1">
                {user?.email} • {user?.phone || 'No phone registered'}
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-20 sm:w-24 bg-white/20 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#F59E0B] h-full rounded-full transition-all duration-500"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <span className="text-xs font-bold font-mono text-[#F59E0B]">{completionPct}% Completed</span>
              </div>
            </div>
          </div>

          <div className="bg-black/25 px-5 py-3 rounded-2xl border border-white/10 text-center sm:text-right flex-1 sm:flex-initial">
            <div className="text-[9px] text-[#F5EEE2]/70 uppercase tracking-widest font-bold">
              Privilege Code
            </div>
            <div className="text-sm sm:text-base font-mono font-bold text-[#F59E0B] mt-0.5">
              {customer?.referral_code || 'AUO-VIP'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-[#E8DBC5] pb-2 text-xs font-bold overflow-x-auto">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-[#113824] text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: CONSIGNMENTS / ORDERS */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="card-luxury p-12 rounded-3xl bg-white border border-[#E8DBC5] text-center space-y-4">
                <Package className="w-12 h-12 text-gray-300 mx-auto" />
                <div className="text-sm font-bold text-[#113824]">No harvest consignments found</div>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Reserve your heirloom mango allocation from our dawn harvest picks.
                </p>
                <Link
                  href="/#harvest"
                  className="inline-block px-6 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold uppercase tracking-wider shadow transition-colors"
                >
                  Explore Current Harvest
                </Link>
              </div>
            ) : (
              orders.map((ord) => {
                const currentStep = getOrderStep(ord.status);
                const isDelivered = ord.status === 'DELIVERED';
                const isReordering = reorderingOrderId === ord.id;

                return (
                  <div
                    key={ord.id}
                    className="card-luxury p-6 rounded-3xl bg-white border border-[#E8DBC5] shadow-xs space-y-5"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm text-[#113824]">
                            #{ord.order_number}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              isDelivered
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'SHIPPED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ord.status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {ord.payment_method} • {ord.payment_status}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">
                          Booked on {formatDate(ord.created_at)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-left sm:text-right mr-2">
                          <div className="text-[10px] text-gray-400 uppercase font-bold">Total Amount</div>
                          <div className="text-base font-bold text-[#113824]">
                            {formatPKR(ord.total_amount)}
                          </div>
                        </div>

                        {/* Buy Again Button */}
                        {isDelivered && isFeatureEnabled('buy_again') && (
                          <button
                            type="button"
                            onClick={() => handleReorder(ord.id, ord.order_number)}
                            disabled={isReordering}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-xs"
                            title="Reorder exact crates with live stock & price validation"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${isReordering ? 'animate-spin' : ''}`} />
                            <span>{isReordering ? 'Verifying...' : 'Buy Again'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedOrderDetail(ord)}
                          className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors"
                        >
                          View Details
                        </button>

                        <a
                          href={`/api/orders/${ord.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-[#FDFBF7] hover:bg-[#F5EEE2] border border-[#E8DBC5] text-[#113824] transition-colors"
                          title="Download Official Invoice (PDF)"
                        >
                          <FileText className="w-4 h-4 text-[#D97706]" />
                        </a>

                        <Link
                          href={`/track-order?ref=${encodeURIComponent(ord.order_number)}`}
                          className="p-2 rounded-xl bg-[#113824]/5 hover:bg-[#113824]/10 text-[#113824] border border-[#113824]/15 transition-colors"
                          title="Live Tracking"
                        >
                          <Truck className="w-4 h-4 text-[#D97706]" />
                        </Link>
                      </div>
                    </div>

                    {/* Step-by-Step Progress Pipeline */}
                    <div>
                      <div className="grid grid-cols-5 gap-2 text-center text-xs">
                        {statusSteps.map((st, idx) => {
                          const stepNum = idx + 1;
                          const isPast = stepNum < currentStep;
                          const isCurr = stepNum === currentStep;
                          return (
                            <div key={idx} className="space-y-1">
                              <div
                                className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                  isCurr
                                    ? 'bg-[#113824] text-[#F59E0B] ring-2 ring-[#F59E0B]'
                                    : isPast
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-200 text-gray-500'
                                }`}
                              >
                                {isPast ? '✓' : stepNum}
                              </div>
                              <div className={`text-[10px] font-bold ${isCurr ? 'text-[#113824]' : 'text-gray-500'}`}>
                                {st.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Items preview list */}
                    <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-2 text-xs text-gray-700">
                      {ord.items?.map((item: any, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 font-medium">
                          {item.variety_name} ({item.package_name} × {item.quantity})
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB: WISHLIST (SAVED CRATES) */}
        {activeTab === 'WISHLIST' && isFeatureEnabled('wishlist') && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-[#113824] uppercase tracking-wider">
                Your Saved Mango Cultivars & Crates
              </h3>
              <p className="text-xs text-gray-500">
                Keep track of favored varieties for fast harvest reservation.
              </p>
            </div>

            {wishlistLoading ? (
              <div className="p-8 text-center text-xs text-gray-500">Loading your saved crates...</div>
            ) : wishlistItems.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#E8DBC5] space-y-3">
                <Heart className="w-12 h-12 text-gray-300 mx-auto" />
                <div className="text-sm font-bold text-[#113824]">No saved cultivars yet</div>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Click the heart icon on any harvest box to save it here for convenient reordering.
                </p>
                <Link
                  href="/#harvest"
                  className="inline-block px-5 py-2 rounded-xl bg-[#113824] text-white text-xs font-bold uppercase tracking-wider"
                >
                  Browse Fresh Harvest
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistItems.map((item) => {
                  const inStock = item.available_stock > 0;
                  return (
                    <div
                      key={item.id}
                      className="card-luxury rounded-2xl overflow-hidden bg-white border border-[#E8DBC5] flex flex-col justify-between"
                    >
                      <div className="relative h-44 bg-gray-100">
                        <img
                          src={item.primary_image || '/images/placeholder-mango.svg'}
                          alt={item.product_name}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src !== window.location.origin + '/images/placeholder-mango.svg') {
                              target.src = '/images/placeholder-mango.svg';
                            }
                          }}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleRemoveWishlist(item.product_id)}
                          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 hover:bg-white text-red-500 shadow"
                          title="Remove from wishlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider">
                            {item.variety_name}
                          </div>
                          <h4 className="text-base font-serif font-bold text-[#113824]">
                            {item.product_name}
                          </h4>
                          <div className="text-xs font-black text-[#113824] mt-1">
                            {formatPKR(item.effective_price || item.base_price)}
                          </div>
                        </div>

                        <button
                          onClick={() => handleWishlistAddToCart(item)}
                          disabled={!inStock}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition ${
                            inStock
                              ? 'bg-[#113824] hover:bg-[#195235] text-white shadow-xs'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{inStock ? 'Add Box to Cart' : 'Sold Out'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: REWARDS / LOYALTY */}
        {activeTab === 'REWARDS' && isFeatureEnabled('loyalty_program') && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-luxury p-6 rounded-3xl bg-gradient-to-br from-[#113824] to-[#092115] text-white border border-[#E8DBC5]">
                <div className="text-[10px] uppercase tracking-widest text-[#F59E0B] font-bold">
                  Patron Tier Status
                </div>
                <div className="text-2xl font-serif font-black mt-1">
                  {rewardsData?.tierInfo?.currentTier || 'ROYAL PATRON'}
                </div>
                <p className="text-[11px] text-[#F5EEE2]/75 mt-2">
                  10 Orchard Points earn PKR 1.00 credit towards reserve harvests.
                </p>
              </div>

              <div className="card-luxury p-6 rounded-3xl bg-white border border-[#E8DBC5]">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                  Available Points Balance
                </div>
                <div className="text-3xl font-mono font-black text-[#113824] mt-1">
                  {rewardsData?.account?.points_balance || 0}
                </div>
                <p className="text-[11px] text-[#D97706] font-bold mt-2">
                  ≈ {formatPKR(Math.floor((rewardsData?.account?.points_balance || 0) / 10))} Store Credit
                </p>
              </div>

              <div className="card-luxury p-6 rounded-3xl bg-white border border-[#E8DBC5]">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                  Lifetime Earned
                </div>
                <div className="text-3xl font-mono font-black text-gray-800 mt-1">
                  {rewardsData?.account?.lifetime_points_earned || 0}
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  Total points accumulated across all orchard harvests.
                </p>
              </div>
            </div>

            {/* Points Ledger Table */}
            <div className="card-luxury p-6 rounded-3xl bg-white border border-[#E8DBC5] shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-[#113824] uppercase tracking-wider">
                Immutable Points Transaction History
              </h4>

              {rewardsLoading ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading points history...</div>
              ) : !rewardsData?.ledger || rewardsData.ledger.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 italic">
                  No points activity logged yet. Place an order to earn your inaugural orchard points!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Transaction</th>
                        <th className="pb-3">Points</th>
                        <th className="pb-3">Running Balance</th>
                        <th className="pb-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rewardsData.ledger.map((tx: any) => (
                        <tr key={tx.id} className="py-2">
                          <td className="py-2.5 font-mono text-gray-500">{formatDate(tx.created_at)}</td>
                          <td className="py-2.5 font-bold text-gray-800">{tx.transaction_type}</td>
                          <td className={`py-2.5 font-mono font-bold ${tx.points_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {tx.points_change > 0 ? `+${tx.points_change}` : tx.points_change}
                          </td>
                          <td className="py-2.5 font-mono text-gray-600">{tx.balance_after}</td>
                          <td className="py-2.5 text-gray-600">{tx.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: REVIEWS */}
        {activeTab === 'REVIEWS' && isFeatureEnabled('product_reviews') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#113824] uppercase tracking-wider">
                  Your Harvest Tasting Reviews
                </h3>
                <p className="text-xs text-gray-500">
                  Reflect on sweetness, aroma, and fruit condition from delivered harvest crates.
                </p>
              </div>
            </div>

            {/* Submission Form Modal or inline card if an order is picked */}
            {newReviewOrder && (
              <div className="p-6 rounded-3xl bg-white border-2 border-[#113824] space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-[#113824]">
                    Reviewing Consignment #{newReviewOrder.order_number}
                  </h4>
                  <button onClick={() => setNewReviewOrder(null)}>
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {reviewSuccessMsg && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold">
                    {reviewSuccessMsg}
                  </div>
                )}
                {reviewErrorMsg && (
                  <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs font-bold">
                    {reviewErrorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmitReview} className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Your Rating (1 to 5 Stars):</label>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="p-1"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= reviewRating
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Headline / Title:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Heavenly sweetness and perfumed aroma!"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Tasting Notes & Impression:</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describe the texture, Brix sweetness, and packaging quality..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold uppercase text-xs disabled:opacity-50"
                  >
                    {reviewSubmitting ? 'Submitting...' : 'Submit Tasting Review'}
                  </button>
                </form>
              </div>
            )}

            {reviewsLoading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading reviews...</div>
            ) : myReviews.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#E8DBC5] space-y-3">
                <Star className="w-12 h-12 text-gray-300 mx-auto" />
                <div className="text-sm font-bold text-[#113824]">No reviews published yet</div>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Delivered orders qualify for verified patron reviews. Share your palate experience with fellow connoisseurs.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myReviews.map((rev) => (
                  <div key={rev.id} className="p-5 rounded-2xl bg-white border border-[#E8DBC5] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-200'
                            }`}
                          />
                        ))}
                        <span className="font-bold text-xs text-gray-900 ml-1.5">{rev.title}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          rev.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rev.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {rev.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{rev.comment}</p>
                    <div className="text-[10px] text-gray-400 font-mono">
                      Submitted on {formatDate(rev.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ADDRESS BOOK */}
        {activeTab === 'ADDRESSES' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#113824] uppercase tracking-wider">
                  Saved Shipping Addresses
                </h3>
                <p className="text-xs text-gray-500">
                  Manage recipient addresses for swift delivery across major cities.
                </p>
              </div>
              <button
                onClick={openAddAddressModal}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Destination</span>
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="card-luxury p-12 rounded-3xl bg-white border border-[#E8DBC5] text-center space-y-3">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto" />
                <div className="text-sm font-bold text-[#113824]">No delivery addresses recorded</div>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Add your home or office address to expedite checkout during seasonal rush.
                </p>
                <button
                  onClick={openAddAddressModal}
                  className="px-5 py-2 rounded-xl bg-[#113824] text-white text-xs font-bold uppercase tracking-wider"
                >
                  Add Primary Address
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`card-luxury p-5 rounded-2xl bg-white border transition-all ${
                      addr.is_default === 1
                        ? 'border-[#113824] ring-1 ring-[#113824]'
                        : 'border-[#E8DBC5]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black uppercase text-[#113824] tracking-wider">
                          {addr.label || 'Home'}
                        </span>
                        {addr.is_default === 1 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditAddressModal(addr)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 text-xs space-y-1 text-gray-700">
                      <div className="font-bold text-gray-900">{addr.recipient_name}</div>
                      <div>{addr.street_address}</div>
                      {addr.area && <div>{addr.area}</div>}
                      <div className="font-medium text-gray-800">
                        {addr.city}, {addr.province} {addr.postal_code || ''}
                      </div>
                      <div className="text-gray-500 pt-1 flex items-center space-x-1">
                        <Smartphone className="w-3 h-3 text-gray-400" />
                        <span>{addr.phone}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PERSONAL PROFILE */}
        {activeTab === 'PROFILE' && isFeatureEnabled('customer_profile') && (
          <div className="card-luxury p-6 sm:p-8 rounded-3xl bg-white border border-[#E8DBC5] shadow-xs space-y-6 max-w-2xl">
            <div>
              <h3 className="text-sm font-bold text-[#113824] uppercase tracking-wider">
                Patron Information
              </h3>
              <p className="text-xs text-gray-500">
                Primary contact details used for order confirmations and harvest updates.
              </p>
            </div>

            {profileSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}
            {profileErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Full Legal Name:</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Registered Email Address:</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-gray-400">
                  Email change requires cryptographic identity verification. Contact concierge.
                </span>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Mobile / WhatsApp Number:</label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+92 300 8472910"
                  className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Primary Residence City:</label>
                <input
                  type="text"
                  value={profileCity}
                  onChange={(e) => setProfileCity(e.target.value)}
                  placeholder="Lahore, Karachi, Islamabad..."
                  className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                />
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="px-6 py-3 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors shadow-xs"
              >
                {profileSaving ? 'Saving Updates...' : 'Save Profile Details'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: SECURITY & PASSWORD */}
        {activeTab === 'SECURITY' && (
          <div className="space-y-6">
            <div className="card-luxury p-6 sm:p-8 rounded-3xl bg-white border border-[#E8DBC5] shadow-xs space-y-6 max-w-2xl">
              <div>
                <h3 className="text-sm font-bold text-[#113824] uppercase tracking-wider">
                  Update Account Password
                </h3>
                <p className="text-xs text-gray-500">
                  Ensure your account is protected with a strong, distinct passphrase.
                </p>
              </div>

              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Current Password:</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">New Password (min 8 chars):</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Confirm New Password:</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-6 py-3 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors shadow-xs"
                >
                  {passwordSaving ? 'Updating Password...' : 'Change Password'}
                </button>
              </form>
            </div>

            {/* Active Sessions */}
            <div className="card-luxury p-6 sm:p-8 rounded-3xl bg-white border border-[#E8DBC5] shadow-xs space-y-4 max-w-2xl">
              <div>
                <h3 className="text-sm font-bold text-[#113824] uppercase tracking-wider">
                  Active Login Sessions
                </h3>
                <p className="text-xs text-gray-500">
                  Recent authenticated browser and device connections.
                </p>
              </div>

              <div className="divide-y divide-gray-100 text-xs">
                {sessions.map((sess) => (
                  <div key={sess.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900 truncate max-w-xs">
                        {sess.user_agent ? sess.user_agent.split(' ')[0] : 'Web Browser'}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        IP: {sess.ip_address || '127.0.0.1'} • Logged in: {new Date(sess.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                ))}

                {sessions.length === 0 && (
                  <div className="py-4 text-gray-400 text-xs italic">
                    Current active session authenticated via HTTP secure cookie.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: NOTIFICATIONS */}
        {activeTab === 'NOTIFICATIONS' && (
          <div className="card-luxury p-6 sm:p-8 rounded-3xl bg-white border border-[#E8DBC5] shadow-xs space-y-6 max-w-2xl">
            <div>
              <h3 className="text-sm font-bold text-[#113824] uppercase tracking-wider">
                Consignment & Harvest Notification Alerts
              </h3>
              <p className="text-xs text-gray-500">
                Choose the communications you wish to receive via Email and SMS/WhatsApp.
              </p>
            </div>

            {notifSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{notifSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveNotifications} className="space-y-4 text-xs">
              <label className="flex items-start space-x-3 p-4 rounded-2xl border border-gray-200 bg-gray-50/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.orderUpdates}
                  onChange={(e) => setNotifications({ ...notifications, orderUpdates: e.target.checked })}
                  className="mt-0.5 rounded border-gray-300 text-[#113824] focus:ring-[#D97706]"
                />
                <div>
                  <div className="font-bold text-gray-900">Order Booking & Allocation Confirmations</div>
                  <div className="text-gray-500 text-[11px]">
                    Receive instant booking confirmations and invoice slips upon placing harvest orders.
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-4 rounded-2xl border border-gray-200 bg-gray-50/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.deliveryUpdates}
                  onChange={(e) => setNotifications({ ...notifications, deliveryUpdates: e.target.checked })}
                  className="mt-0.5 rounded border-gray-300 text-[#113824] focus:ring-[#D97706]"
                />
                <div>
                  <div className="font-bold text-gray-900">Cold-Chain Carrier Dispatch & Out-for-Delivery Scans</div>
                  <div className="text-gray-500 text-[11px]">
                    Get real-time tracking IDs and courier hand-off alerts when your crate leaves our packing station.
                  </div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-4 rounded-2xl border border-gray-200 bg-gray-50/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.promotionalOffers}
                  onChange={(e) => setNotifications({ ...notifications, promotionalOffers: e.target.checked })}
                  className="mt-0.5 rounded border-gray-300 text-[#113824] focus:ring-[#D97706]"
                />
                <div>
                  <div className="font-bold text-gray-900">Seasonal First Flush & Pre-Order Announcements</div>
                  <div className="text-gray-500 text-[11px]">
                    Early access to limited-run Chaunsa and Anwar Ratol early-bird harvest bookings.
                  </div>
                </div>
              </label>

              <button
                type="submit"
                disabled={notifSaving}
                className="px-6 py-3 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors shadow-xs"
              >
                {notifSaving ? 'Saving Preferences...' : 'Save Notification Preferences'}
              </button>
            </form>
          </div>
        )}

        {/* ORDER DETAILS MODAL */}
        {selectedOrderDetail && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E8DBC5] flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-[#FDFBF7]">
                <div>
                  <div className="text-[10px] tracking-widest text-[#D97706] font-bold uppercase">
                    HARVEST ALLOCATION NOTE
                  </div>
                  <h2 className="text-xl font-serif font-black text-[#113824]">
                    Order #{selectedOrderDetail.order_number}
                  </h2>
                  <div className="text-[11px] text-gray-500">
                    Booked on {formatDate(selectedOrderDetail.created_at)}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={`/api/orders/${selectedOrderDetail.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#113824] hover:bg-[#F5EEE2] rounded-xl flex items-center space-x-1 text-xs font-bold border border-[#E8DBC5] transition-colors"
                    title="Download Official PDF Invoice"
                  >
                    <FileText className="w-4 h-4 text-[#D97706]" />
                    <span>PDF</span>
                  </a>
                  <button
                    onClick={() => setSelectedOrderDetail(null)}
                    className="p-2 text-gray-400 hover:text-gray-700 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 text-xs">
                {/* Status & Carrier summary */}
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500">Current Status:</span>
                    <div className="font-bold text-sm text-[#113824] mt-0.5">
                      {selectedOrderDetail.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500">Cold-Chain Carrier:</span>
                    <div className="font-bold text-sm text-gray-900 mt-0.5">
                      {selectedOrderDetail.courier_name || 'Al Usmani Express'}
                    </div>
                    {selectedOrderDetail.tracking_number && (
                      <div className="font-mono text-[10px] text-blue-700">
                        #{selectedOrderDetail.tracking_number}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items in order */}
                <div>
                  <h4 className="font-bold uppercase text-[11px] text-gray-500 tracking-wider mb-2">
                    Harvest Crates ({selectedOrderDetail.items?.length || 0})
                  </h4>
                  <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                    {selectedOrderDetail.items?.map((it: any, idx: number) => (
                      <div key={idx} className="p-3 flex justify-between items-center bg-white">
                        <div>
                          <div className="font-bold text-gray-900">{it.variety_name}</div>
                          <div className="text-[11px] text-gray-500">
                            {it.package_name} × {it.quantity}
                          </div>
                        </div>
                        <div className="font-bold text-[#113824]">
                          {formatPKR(it.subtotal)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial breakdown */}
                <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#E8DBC5] space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>{formatPKR(selectedOrderDetail.subtotal || selectedOrderDetail.total_amount)}</span>
                  </div>
                  {selectedOrderDetail.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Applied Discounts:</span>
                      <span>-{formatPKR(selectedOrderDetail.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping Freight:</span>
                    <span>{selectedOrderDetail.shipping_fee ? formatPKR(selectedOrderDetail.shipping_fee) : 'Complimentary'}</span>
                  </div>
                  <div className="pt-2 border-t border-[#E8DBC5] flex justify-between font-bold text-sm text-[#113824]">
                    <span>Total Due ({selectedOrderDetail.payment_method}):</span>
                    <span>{formatPKR(selectedOrderDetail.total_amount)}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 pt-1">
                    Payment Status: <strong className="text-gray-800">{selectedOrderDetail.payment_status}</strong>
                  </div>
                </div>

                {/* Modal Footer actions */}
                <div className="flex space-x-2 pt-2">
                  <a
                    href={`/api/orders/${selectedOrderDetail.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-center font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Download Invoice (PDF)</span>
                  </a>
                  <Link
                    href={`/track-order?ref=${encodeURIComponent(selectedOrderDetail.order_number)}`}
                    className="py-3 px-5 rounded-xl bg-[#F5EEE2] hover:bg-[#E8DBC5] text-[#113824] font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Track</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADD / EDIT ADDRESS MODAL */}
        {addressModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-serif font-bold text-base text-[#113824]">
                  {editingAddressId ? 'Edit Delivery Destination' : 'Add Delivery Destination'}
                </h3>
                <button onClick={() => setAddressModalOpen(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {addressError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {addressError}
                </div>
              )}

              <form onSubmit={handleSaveAddress} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Address Label:</label>
                  <select
                    value={addrLabel}
                    onChange={(e) => setAddrLabel(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  >
                    <option value="Home">Home</option>
                    <option value="Office">Office / Business</option>
                    <option value="Farmhouse">Estate / Farmhouse</option>
                    <option value="Gift Recipient">Gift Recipient</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Recipient Name:</label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Delivery Contact Mobile:</label>
                  <input
                    type="tel"
                    required
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Street Address & House/Building #:</label>
                  <input
                    type="text"
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Area / Sector:</label>
                    <input
                      type="text"
                      value={addrArea}
                      onChange={(e) => setAddrArea(e.target.value)}
                      placeholder="DHA Phase 5, Gulberg..."
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Destination City:</label>
                    <input
                      type="text"
                      required
                      value={addrCity}
                      onChange={(e) => setAddrCity(e.target.value)}
                      placeholder="Lahore, Karachi..."
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Province:</label>
                    <select
                      value={addrProvince}
                      onChange={(e) => setAddrProvince(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    >
                      <option value="Punjab">Punjab</option>
                      <option value="Sindh">Sindh</option>
                      <option value="Khyber Pakhtunkhwa">KPK</option>
                      <option value="Islamabad Capital">Islamabad Capital</option>
                      <option value="Balochistan">Balochistan</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Postal Code (Optional):</label>
                    <input
                      type="text"
                      value={addrPostal}
                      onChange={(e) => setAddrPostal(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>
                </div>

                <label className="flex items-center space-x-2 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-gray-300 text-[#113824] focus:ring-[#D97706]"
                  />
                  <span className="font-bold text-gray-700">Set as my default shipping address</span>
                </label>

                <div className="flex space-x-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setAddressModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold uppercase text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addressSaving}
                    className="flex-1 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white font-bold uppercase text-xs disabled:opacity-50"
                  >
                    {addressSaving ? 'Saving...' : 'Save Address'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

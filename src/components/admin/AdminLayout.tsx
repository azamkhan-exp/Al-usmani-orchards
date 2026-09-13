'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Calendar,
  Tag,
  Users,
  Truck,
  DollarSign,
  Sprout,
  BarChart3,
  Sparkles,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Search,
  Plus,
  Bell,
  ArrowRight,
  ExternalLink,
  FileText,
  CreditCard,
  Lock,
  Star,
  Sliders,
  MessageSquare,
  Database,
  Activity,
  MapPin,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import AdminAIDrawer from './AdminAIDrawer';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

// ── 5-Category Command Centre Navigation ────────────────────────────────────

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Store',
    items: [
      { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { title: 'Products', href: '/admin/products', icon: Package },
      { title: 'Inventory', href: '/admin/inventory', icon: Layers },
      { title: 'Orders', href: '/admin/orders', icon: ShoppingBag },
      { title: 'Customers', href: '/admin/customers', icon: Users },
      { title: 'Promotions', href: '/admin/promotions', icon: Tag }
    ]
  },
  {
    label: 'Website',
    items: [
      { title: 'Website Content', href: '/admin/cms', icon: FileText },
      { title: 'Media Library', href: '/admin/cms?tab=media', icon: Star }
    ]
  },
  {
    label: 'Business',
    items: [
      { title: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
      { title: 'Performance Reports', href: '/admin/analytics?tab=reports', icon: TrendingUp },
      { title: 'Finance & Ledger', href: '/admin/finance', icon: DollarSign },
      { title: 'Payments', href: '/admin/payments', icon: CreditCard },
      { title: 'Farm & Batches', href: '/admin/farm', icon: Sprout },
      { title: 'Delivery Rates', href: '/admin/delivery/locations', icon: MapPin }
    ]
  },
  {
    label: 'Security',
    items: [
      { title: 'Admin Access', href: '/admin/security', icon: Shield },
      { title: 'Security Center', href: '/admin/security?tab=center', icon: Lock },
      { title: 'Audit Logs', href: '/admin/security?tab=audit', icon: CheckCircle2 }
    ]
  },
  {
    label: 'System',
    items: [
      { title: 'Settings', href: '/admin/settings', icon: Settings },
      { title: 'System Health', href: '/admin/system-health', icon: Activity, badge: 'PROD' },
      { title: 'Data Management', href: '/admin/data-management', icon: Database },
      { title: 'Operations Guide', href: '/admin/guide', icon: MessageSquare, badge: 'MANUAL' }
    ]
  }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Track which nav groups are open (expanded)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Store: true,
    Website: false,
    Business: false,
    Security: false,
    System: false
  });

  // Active link helper
  const isItemActive = (href: string) => {
    const baseHref = href.split('?')[0];
    if (baseHref === '/admin') return pathname === '/admin';
    return pathname === baseHref || pathname.startsWith(baseHref + '/');
  };

  // Auto-expand the group that contains the current active page
  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((g) =>
      g.items.some((item) => isItemActive(item.href))
    );
    if (activeGroup) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup.label]: true }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Note: Route-level authentication and role verification is strictly enforced
  // server-side in src/middleware.ts and src/app/admin/layout.tsx.
  // We avoid redundant client-side router.push('/admin/login') calls here to prevent
  // route race conditions and mobile navigation bounces during tab switching.

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  // Helper to generate dynamic breadcrumbs
  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs = [{ label: 'Admin', href: '/admin' }];

    if (segments.length > 1) {
      const second = segments[1];
      if (second === 'delivery' && segments[2] === 'locations') {
        crumbs.push({ label: 'Logistics', href: '/admin/orders?view=shipping' });
        crumbs.push({ label: 'Pakistan Locations', href: '/admin/delivery/locations' });
      } else if (second === 'security') {
        crumbs.push({ label: 'Security Center', href: '/admin/security' });
      } else if (second === 'data-management') {
        crumbs.push({ label: 'Data Management', href: '/admin/data-management' });
      } else if (second === 'system-health') {
        crumbs.push({ label: 'System Health & Launch', href: '/admin/system-health' });
      } else if (second === 'analytics') {
        crumbs.push({ label: 'Analytics & Reports', href: '/admin/analytics' });
      } else if (second === 'orders') {
        crumbs.push({ label: 'Orders Fulfillment', href: '/admin/orders' });
      } else if (second === 'products') {
        crumbs.push({ label: 'Orchard Catalog', href: '/admin/products' });
      } else {
        crumbs.push({ label: second.charAt(0).toUpperCase() + second.slice(1).replace('-', ' '), href: pathname });
      }
    }

    return crumbs;
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-[#071D12] text-[#FDFBF7] flex items-center justify-center">
        <div className="flex items-center space-x-3 text-sm font-medium">
          <div className="w-3 h-3 rounded-full bg-[#D97706] animate-ping" />
          <span>Authenticating to Al Usmani Orchards Console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-[#071D12] text-[#FDFBF7] border-r border-emerald-900/50 flex flex-col justify-between transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-68'}`}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Brand Header */}
          <div className="p-4 border-b border-emerald-900/60 flex items-center justify-between">
            <Link href="/admin" className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-emerald-900/90 flex items-center justify-center border border-amber-500/60 shadow-md shrink-0">
                <span className="text-lg">🥭</span>
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-[10px] tracking-widest text-amber-400 font-bold uppercase truncate">
                    Al Usmani Orchards
                  </div>
                  <div className="text-xs font-serif font-bold text-white tracking-tight truncate">
                    Production Console
                  </div>
                </div>
              )}
            </Link>

            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-stone-300 hover:text-white rounded-xl hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Status Bar */}
          {!isCollapsed && (
            <div className="px-4 py-3 bg-emerald-950/70 border-b border-emerald-900/40 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 truncate">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold text-stone-200 truncate max-w-[130px]">
                  {user?.name || 'Administrator'}
                </span>
              </div>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-500/40 uppercase tracking-wider shrink-0">
                {user?.role?.replace('_', ' ') || 'ADMIN'}
              </span>
            </div>
          )}

          {/* Navigation Links — 5-Category Command Centre */}
          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto text-xs scrollbar-thin scrollbar-thumb-emerald-900">
            {NAV_GROUPS.map((group, groupIndex) => {
              const isGroupOpen = openGroups[group.label];
              const hasActiveItem = group.items.some((item) => isItemActive(item.href));

              return (
                <div
                  key={group.label}
                  className={groupIndex > 0 ? 'pt-1 border-t border-emerald-900/40' : ''}
                >
                  {/* Group Header — collapsible (hidden when sidebar is icon-only) */}
                  {!isCollapsed && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.label)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors cursor-pointer rounded-lg ${
                        hasActiveItem
                          ? 'text-amber-400 hover:text-amber-300'
                          : 'text-stone-400/80 hover:text-stone-200'
                      }`}
                    >
                      <span>{group.label}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isGroupOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}

                  {/* Group Items */}
                  {(isGroupOpen || isCollapsed) && (
                    <div className="space-y-0.5 pt-0.5">
                      {group.items.map((item) => {
                        const isActive = isItemActive(item.href);
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            title={isCollapsed ? item.title : undefined}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group min-h-[38px] cursor-pointer ${
                              isActive
                                ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                                : 'text-stone-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  isActive ? 'text-stone-950' : 'text-stone-300 group-hover:text-amber-400'
                                }`}
                              />
                              {!isCollapsed && <span className="truncate">{item.title}</span>}
                            </div>
                            {!isCollapsed && item.badge && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  isActive ? 'bg-stone-950 text-amber-400' : 'bg-white/15 text-stone-200'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Bar & Collapse Toggle */}
        <div className="p-3 border-t border-emerald-900/60 space-y-1 text-xs">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-stone-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <ExternalLink className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Storefront</span>}
            </div>
            {!isCollapsed && <span className="text-[10px] text-amber-400 font-semibold">Live ↗</span>}
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/15 hover:text-red-300 font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>

          {/* Desktop Collapse Switch */}
          <div className="hidden lg:block pt-1">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full flex items-center justify-center py-1.5 text-stone-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-stone-200 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between shadow-xs">
          {/* Left: Mobile Toggle & Dynamic Breadcrumbs */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              aria-label="Open navigation drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Trail */}
            <nav className="hidden sm:flex items-center space-x-1.5 text-xs text-stone-500">
              {getBreadcrumbs().map((crumb, i, arr) => (
                <React.Fragment key={crumb.href}>
                  <Link
                    href={crumb.href}
                    className={`hover:text-stone-900 transition-colors ${
                      i === arr.length - 1 ? 'font-semibold text-stone-900' : 'text-stone-500'
                    }`}
                  >
                    {crumb.label}
                  </Link>
                  {i < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-stone-300 shrink-0" />}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right: Environment Pill, AI, Notifications & Admin Menu */}
          <div className="flex items-center space-x-3">
            {/* Live Security Environment Pill */}
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>PROD • SECURE</span>
            </div>

            {/* Grounded Executive AI Trigger */}
            <button
              onClick={() => setIsAiDrawerOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-900 text-white text-xs font-semibold hover:bg-emerald-800 shadow-sm transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">OrchardIQ AI</span>
            </button>

            {/* Notifications Shortcut */}
            <Link
              href="/admin/system-health"
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full relative transition-colors"
              title="System Health & Alerts"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
            </Link>

            {/* Profile Avatar & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-8 h-8 rounded-full bg-emerald-900 text-amber-300 flex items-center justify-center text-xs font-bold font-serif ring-2 ring-emerald-900/20 hover:ring-emerald-900/40 transition-all cursor-pointer"
                title="Admin Account Profile"
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </button>

              {profileMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in duration-100"
                  onMouseLeave={() => setProfileMenuOpen(false)}
                >
                  <div className="px-3.5 py-2 border-b border-stone-100">
                    <p className="font-bold text-stone-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-stone-500 truncate">{user?.email}</p>
                  </div>

                  <Link
                    href="/admin/security"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-stone-700 hover:bg-stone-50 transition-colors font-medium"
                  >
                    <Lock className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Security Center & OTP</span>
                  </Link>

                  <Link
                    href="/admin/data-management"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-stone-700 hover:bg-stone-50 transition-colors font-medium"
                  >
                    <Database className="w-3.5 h-3.5 text-amber-600" />
                    <span>Data Management</span>
                  </Link>

                  <Link
                    href="/admin/system-health"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-stone-700 hover:bg-stone-50 transition-colors font-medium"
                  >
                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                    <span>Launch Audit & Health</span>
                  </Link>

                  <div className="border-t border-stone-100 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 transition-colors font-semibold text-left"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Body with Responsive Max-Width */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>

      {/* Grounded Admin Executive AI Assistant Drawer */}
      <AdminAIDrawer isOpen={isAiDrawerOpen} onClose={() => setIsAiDrawerOpen(false)} />
    </div>
  );
}

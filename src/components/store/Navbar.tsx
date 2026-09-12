'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ShoppingBag, Sparkles, User, Menu, X, LogOut, ChevronRight, Heart, MessageSquare } from 'lucide-react';
import { PublicStoreSettings } from '@/lib/services/settings.service';
import { useFeatureFlags } from '@/context/FeaturesContext';

interface NavbarProps {
  onOpenAI: () => void;
  settings?: PublicStoreSettings;
  onOpenCompare?: () => void;
}

export default function Navbar({ onOpenAI, settings, onOpenCompare }: NavbarProps) {
  const { totalBoxes, openCart } = useCart();
  const { user, logout } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const storeName = settings?.general?.store_name || 'AL USMANI ORCHARDS';
  const estdYear = settings?.general?.estd_year || 1934;
  const supportPhone = settings?.contact?.whatsapp || '+92 300 8472910';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll and handle Escape key when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setMobileMenuOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled ? 'glass-header shadow-sm border-b border-[#E8DBC5]' : 'bg-[#FDFBF7]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#113824] flex items-center justify-center border border-[#F59E0B] shadow-inner shrink-0">
              <span className="text-base sm:text-xl">🥭</span>
            </div>
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] tracking-widest text-[#D97706] font-bold uppercase truncate">
                ESTD. {estdYear} • MULTAN
              </div>
              <div className="text-sm sm:text-lg lg:text-xl font-serif font-black tracking-tight text-[#113824] group-hover:text-[#D97706] transition-colors uppercase truncate">
                {storeName}
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-7 text-sm font-medium text-[#111827]">
            <Link href="/#harvest" className="hover:text-[#D97706] transition-colors">
              The Harvest
            </Link>
            <Link href="/#varieties" className="hover:text-[#D97706] transition-colors">
              Mango Varieties
            </Link>
            <Link href="/#preorders" className="hover:text-[#D97706] transition-colors flex items-center space-x-1">
              <span>Pre-Orders</span>
              <span className="bg-[#D97706]/10 text-[#D97706] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                HOT
              </span>
            </Link>
            {isEnabled('mango_comparison') && onOpenCompare && (
              <button
                type="button"
                onClick={onOpenCompare}
                className="hover:text-[#D97706] transition-colors text-sm font-medium"
              >
                Compare Varieties
              </button>
            )}
            {isEnabled('gift_ordering') && (
              <Link href="/#gifting" className="hover:text-[#D97706] transition-colors">
                Royal Gifting
              </Link>
            )}
            {isEnabled('farm_traceability') && (
              <Link href="/#story" className="hover:text-[#D97706] transition-colors">
                Our Heritage
              </Link>
            )}
            {isEnabled('order_tracking') && (
              <Link href="/track-order" className="hover:text-[#D97706] transition-colors">
                Track Order
              </Link>
            )}
          </nav>

          {/* Action Utilities */}
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            {/* WhatsApp Concierge Support */}
            {isEnabled('whatsapp_support') && (
              <a
                href={`https://wa.me/${supportPhone.replace(/\D/g, '')}?text=Salam%20Al%20Usmani%20Orchards%2C%20I%20would%20like%20to%20inquire%20about%20fresh%20harvest%20crates.`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center space-x-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-full hover:bg-emerald-100 transition-colors"
                title="WhatsApp Concierge"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </a>
            )}

            {/* Grounded AI Assistant Button */}
            {isEnabled('ai_recommendations') && (
              <button
                onClick={onOpenAI}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#113824]/5 hover:bg-[#113824]/10 text-[#113824] text-xs font-semibold border border-[#113824]/15 transition-all"
                title="Chat with OrchardBot Concierge"
                aria-label="Open AI Concierge Chat"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                <span className="hidden sm:inline">Ask AI Concierge</span>
                <span className="sm:hidden text-[11px] font-bold">AI</span>
              </button>
            )}

            {/* Wishlist Link */}
            {isEnabled('wishlist') && (
              <Link
                href={user ? '/account?tab=WISHLIST' : '/login'}
                className="p-2 text-[#113824] hover:text-[#D97706] rounded-full hover:bg-[#F5EEE2] transition-colors"
                title="Your Wishlist"
                aria-label="View Wishlist"
              >
                <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            )}

            {/* Account / Admin Portal (Desktop) */}
            {isEnabled('customer_profile') && (
              user ? (
                <Link
                  href={user.role === 'CUSTOMER' ? '/account' : '/admin'}
                  className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-[#113824] hover:text-[#D97706] px-2.5 py-1.5 rounded-md hover:bg-[#F5EEE2] transition-colors"
                  title="Your Patron Portal"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden md:inline truncate max-w-[100px]">{user.name.split(' ')[0]}</span>
                  {user.role !== 'CUSTOMER' && (
                    <span className="bg-[#113824] text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                      ERP
                    </span>
                  )}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="hidden sm:flex items-center space-x-1 text-xs font-semibold text-[#113824] hover:text-[#D97706] px-2.5 py-1.5 rounded-md hover:bg-[#F5EEE2] transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
              )
            )}

            {/* Shopping Cart Drawer Trigger */}
            <button
              onClick={openCart}
              className="relative p-2 rounded-full bg-[#113824] text-[#FDFBF7] hover:bg-[#195235] transition-colors shadow-xs"
              aria-label={`View Cart (${totalBoxes} items)`}
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              {totalBoxes > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#D97706] text-white text-[10px] font-black w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                  {totalBoxes}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-[#113824] hover:bg-[#F5EEE2] rounded-md transition-colors"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu Modal */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Menu Drawer */}
          <div className="relative bg-[#FDFBF7] border-b border-[#E8DBC5] px-6 py-6 space-y-4 shadow-2xl max-h-[calc(100dvh-4rem)] overflow-y-auto">
            <nav className="space-y-3 divide-y divide-gray-100 text-sm font-semibold text-[#113824]">
              <Link
                href="/#harvest"
                onClick={() => setMobileMenuOpen(false)}
                className="block pt-2 flex items-center justify-between"
              >
                <span>The Harvest</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
              <Link
                href="/#varieties"
                onClick={() => setMobileMenuOpen(false)}
                className="block pt-3 flex items-center justify-between"
              >
                <span>Mango Varieties</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
              <Link
                href="/#preorders"
                onClick={() => setMobileMenuOpen(false)}
                className="block pt-3 flex items-center justify-between text-[#D97706]"
              >
                <div className="flex items-center space-x-2">
                  <span>Pre-Orders (Early Bird)</span>
                  <span className="bg-[#D97706]/15 text-[#D97706] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    HOT
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#D97706]" />
              </Link>
              {isEnabled('mango_comparison') && onOpenCompare && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenCompare();
                  }}
                  className="w-full pt-3 flex items-center justify-between text-left"
                >
                  <span>Compare Varieties</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              )}
              {isEnabled('wishlist') && (
                <Link
                  href={user ? '/account?tab=WISHLIST' : '/login'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block pt-3 flex items-center justify-between"
                >
                  <span className="flex items-center space-x-1.5">
                    <Heart className="w-4 h-4 text-[#D97706]" />
                    <span>My Wishlist</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              )}
              {isEnabled('gift_ordering') && (
                <Link
                  href="/#gifting"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block pt-3 flex items-center justify-between"
                >
                  <span>Royal Gifting</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              )}
              {isEnabled('farm_traceability') && (
                <Link
                  href="/#story"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block pt-3 flex items-center justify-between"
                >
                  <span>Our Heritage</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              )}
              {isEnabled('order_tracking') && (
                <Link
                  href="/track-order"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block pt-3 flex items-center justify-between"
                >
                  <span>Track Consignment</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              )}
            </nav>

            {/* Mobile User Profile Links */}
            <div className="pt-4 border-t border-[#E8DBC5] space-y-2">
              {user ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E8DBC5]">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-[#113824] text-[#F59E0B] flex items-center justify-center font-bold text-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-[#113824]">{user.name}</div>
                        <div className="text-[10px] text-gray-500">{user.email}</div>
                      </div>
                    </div>
                    {user.role !== 'CUSTOMER' && (
                      <span className="bg-[#113824] text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                        STAFF
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href={user.role === 'CUSTOMER' ? '/account' : '/admin'}
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-2.5 px-3 rounded-xl bg-[#113824] text-white text-center text-xs font-bold uppercase tracking-wider"
                    >
                      {user.role === 'CUSTOMER' ? 'My Account' : 'Admin ERP'}
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        await logout();
                        setMobileMenuOpen(false);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="pt-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full py-3 rounded-xl bg-[#113824] text-white text-center text-xs font-bold uppercase tracking-wider shadow"
                  >
                    Sign In / Create Account
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

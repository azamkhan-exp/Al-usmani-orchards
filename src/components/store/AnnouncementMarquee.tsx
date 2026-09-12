'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { PublicStoreSettings } from '@/lib/services/settings.service';

interface AnnouncementMarqueeProps {
  settings?: PublicStoreSettings;
  announcementContent?: {
    bannerText?: string;
    active?: boolean;
  };
}

export default function AnnouncementMarquee({ settings, announcementContent }: AnnouncementMarqueeProps) {
  const isCmsActive = announcementContent?.active !== false;
  const isSettingsActive = settings?.general?.announcement_enabled !== false;
  const isEnabled = isCmsActive && isSettingsActive;
  const isAnimated = settings?.general?.announcement_animation !== false;
  const bannerText =
    announcementContent?.bannerText ||
    settings?.general?.announcement_banner ||
    '🥭 Premium Pakistani Mangoes • Farm Fresh • Delivered to Your Door • Seasonal Selection • Zero Calcium Carbide • Nationwide Express Cold-Chain';
  const link = settings?.general?.announcement_link || '/#harvest';

  if (!isEnabled) return null;

  const renderContent = () => (
    <span className="inline-flex items-center space-x-6">
      <span className="inline-flex items-center space-x-2">
        <Sparkles className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
        <span className="font-bold text-[#F59E0B] tracking-wider uppercase text-[11px]">
          Al Usmani Orchards
        </span>
      </span>
      <span className="text-[#F59E0B]/60">•</span>
      <span className="font-medium tracking-wide text-[#FDFBF7]">
        {bannerText}
      </span>
      <span className="text-[#F59E0B]/60">•</span>
      <span className="inline-flex items-center space-x-1.5">
        <span className="bg-[#F59E0B]/20 text-[#FBBF24] px-2 py-0.5 rounded text-[10px] font-bold border border-[#F59E0B]/40 uppercase tracking-wider">
          Estate Tier Savings
        </span>
        <span className="text-[#FDFBF7]/90 text-[11px]">Buy 5 boxes save 5% | 10 boxes save 10%</span>
      </span>
      <span className="text-[#F59E0B]/60">•</span>
      <span className="text-[#FDFBF7]/90 text-[11px]">
        Tree-Ripened Guarantee • 24h Cold-Chain Express Nationwide
      </span>
      <span className="text-[#F59E0B]/60">•</span>
    </span>
  );

  return (
    <div
      className="bg-[#113824] text-[#FDFBF7] text-xs font-medium py-2.5 border-b border-[#F59E0B]/30 overflow-hidden relative select-none marquee-container transition-colors"
      role="region"
      aria-label="Announcement Banner"
    >
      {isAnimated ? (
        <div className="flex w-full overflow-hidden">
          <Link
            href={link}
            className="animate-marquee-rtl flex items-center shrink-0 hover:text-[#FBBF24] transition-colors"
          >
            {/* Primary Track */}
            <span className="flex items-center px-4">
              {renderContent()}
            </span>
            {/* Seamless Duplicated Track for 100% infinite continuous loop */}
            <span className="flex items-center px-4" aria-hidden="true">
              {renderContent()}
            </span>
          </Link>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Link
            href={link}
            className="inline-flex items-center justify-center space-x-3 hover:text-[#FBBF24] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
            <span className="truncate">{bannerText}</span>
          </Link>
        </div>
      )}
    </div>
  );
}

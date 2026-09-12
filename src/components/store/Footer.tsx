'use client';

import React from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, ShieldCheck, Heart } from 'lucide-react';
import { PublicStoreSettings } from '@/lib/services/settings.service';

interface FooterProps {
  settings?: PublicStoreSettings;
}

export default function Footer({ settings }: FooterProps) {
  const storeName = settings?.general?.store_name || 'AL USMANI ORCHARDS';
  const estdYear = settings?.general?.estd_year || 1934;
  const positioning = settings?.general?.positioning || 'Cultivating the finest canal-fed Pakistani mangoes for four generations. Naturally tree-ripened, 100% calcium carbide-free, and dispatched nationwide with export-grade protective nesting.';
  const phone = settings?.contact?.phone || '+92 300 8472910';
  const supportEmail = settings?.contact?.support_email || 'harvest@alusmaniorchards.pk';
  const farmLocations = settings?.contact?.farm_locations || [
    { name: 'Multan Royal Estate', address: 'Shujabad Road, Multan, Punjab, Pakistan' },
    { name: 'Mirpur Khas Heritage Grove', address: 'Mirwah Gorchani, Mirpur Khas, Sindh, Pakistan' }
  ];

  return (
    <footer className="bg-[#092115] text-[#FDFBF7] border-t border-[#F59E0B]/30 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Col 1: Brand & Heritage */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#113824] flex items-center justify-center border border-[#F59E0B] shadow">
                <span className="text-xl">🥭</span>
              </div>
              <div>
                <div className="text-[10px] tracking-widest text-[#F59E0B] font-bold uppercase">
                  ESTD. {estdYear} • MULTAN
                </div>
                <div className="text-xl font-serif font-black tracking-tight text-white uppercase">
                  {storeName}
                </div>
              </div>
            </div>
            <p className="text-xs text-[#F5EEE2]/80 leading-relaxed font-light max-w-sm">
              {positioning}
            </p>
            <div className="pt-2 flex items-center space-x-3 text-xs text-[#FBBF24]">
              <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
              <span>Certified Organic Soil Practices • Zero Carbide</span>
            </div>
          </div>

          {/* Col 2: The Harvest */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#F59E0B]">
              The Harvest
            </h3>
            <ul className="space-y-2 text-xs text-[#F5EEE2]/80">
              <li>
                <a href="#harvest" className="hover:text-white transition-colors">
                  Multani Chaunsa
                </a>
              </li>
              <li>
                <a href="#harvest" className="hover:text-white transition-colors">
                  Mirpur Khas Sindhri
                </a>
              </li>
              <li>
                <a href="#harvest" className="hover:text-white transition-colors">
                  Anwar Ratol Reserve
                </a>
              </li>
              <li>
                <a href="#preorders" className="hover:text-white transition-colors">
                  White Chaunsa Pre-Order
                </a>
              </li>
              <li>
                <a href="#gifting" className="hover:text-white transition-colors">
                  Royal Gift Boxes
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#F59E0B]">
              Client Care
            </h3>
            <ul className="space-y-2 text-xs text-[#F5EEE2]/80">
              <li>
                <Link href="/track-order" className="hover:text-white transition-colors">
                  Live Order Tracking
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-white transition-colors">
                  My Orders & Profile
                </Link>
              </li>
              <li>
                <a href="#story" className="hover:text-white transition-colors">
                  Our Orchard Story
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Staff & Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Orchard Contacts */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#F59E0B]">
              Orchard Locations
            </h3>
            <ul className="space-y-2.5 text-xs text-[#F5EEE2]/80">
              {farmLocations.map((loc, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <span>{loc.address || loc.name}</span>
                </li>
              ))}
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
                <span>{phone} (WhatsApp)</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
                <span>{supportEmail}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#F5EEE2]/60 space-y-4 sm:space-y-0">
          <div>
            © {new Date().getFullYear()} {storeName} Private Limited. All rights reserved.
          </div>
          <div className="flex items-center space-x-4">
            <span>Logistics Partners: TCS Cold-Chain • Leopards Overland • M&amp;P • Pakistan Post</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

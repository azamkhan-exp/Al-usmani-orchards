import React from 'react';
import Link from 'next/link';
import { Compass, Home, Search, PackageCheck } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 border border-[#E8DBC5] shadow-xl text-center space-y-6">
        {/* Emblem */}
        <div className="w-20 h-20 rounded-3xl bg-amber-50 text-[#D97706] flex items-center justify-center mx-auto shadow-inner border border-amber-200/60">
          <Compass className="w-10 h-10 animate-pulse" />
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-[#D97706] uppercase tracking-widest">
            HTTP 404 • Harvest Waypoint
          </span>
          <h1 className="text-3xl font-serif font-black text-[#113824]">
            Consignment Not Found
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
            The orchard destination, variety dossier, or order reference you requested could not be located. It may have concluded its seasonal harvest window or relocated.
          </p>
        </div>

        {/* Quick Links */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#113824] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center space-x-2 shadow-md hover:bg-[#195235] transition active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Return to Orchards</span>
          </Link>
          <Link
            href="/#varieties"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-50 text-[#D97706] border border-amber-200 text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center space-x-2 hover:bg-amber-100 transition active:scale-95"
          >
            <Search className="w-4 h-4" />
            <span>Browse Varieties</span>
          </Link>
          <Link
            href="/track-order"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center space-x-2 hover:bg-gray-200 transition active:scale-95"
          >
            <PackageCheck className="w-4 h-4" />
            <span>Track Order</span>
          </Link>
        </div>

        {/* Helpline footer */}
        <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-400">
          Need immediate concierge assistance? Contact our grove team via{' '}
          <a
            href="https://wa.me/923008472910"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#113824] font-bold underline hover:text-[#D97706]"
          >
            WhatsApp Helpline (+92 300 8472910)
          </a>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sun, Truck, Award, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#092115] text-[#FDFBF7] pt-12 pb-24 lg:pt-20 lg:pb-32">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#F59E0B]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-[#195235]/40 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Vision & Action */}
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#113824] border border-[#F59E0B]/40 shadow-sm">
              <Sparkles className="w-4 h-4 text-[#F59E0B]" />
              <span className="text-xs font-semibold text-[#FBBF24] tracking-wide uppercase">
                Peak Summer Flush 2026 • Live Picking
              </span>
            </div>

            <div className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#FBBF24]">
              Fresh from Our Orchards • Premium Pakistani Mangoes • Naturally Grown • Delivered with Care
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight leading-[1.15]">
              From Our Orchards <span className="text-[#F59E0B] italic">to Your Door.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#F5EEE2]/85 max-w-2xl font-light leading-relaxed">
              Cultivated in centuries-old canal silt along the Chenab river in Multan and Mirpur Khas.
              Every mango is hand-picked at dawn at peak 24°+ Brix sweetness, cushioned in 5-ply export crates,
              and delivered nationwide with zero calcium carbide chemicals.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
              <a
                href="#harvest"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#092115] font-black text-sm tracking-wider uppercase shadow-lg shadow-[#F59E0B]/20 transition-all transform hover:-translate-y-0.5"
              >
                <span>SHOP THE HARVEST</span>
                <ArrowRight className="w-4 h-4 ml-2 font-bold" />
              </a>
              <a
                href="#story"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-transparent hover:bg-white/10 text-[#FDFBF7] font-bold text-sm tracking-wider uppercase border border-[#FDFBF7]/30 transition-colors"
              >
                EXPLORE OUR FARM
              </a>
            </div>

            {/* Pillars */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-[#195235]/60">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-[#113824] flex items-center justify-center border border-[#F59E0B]/30 text-[#F59E0B]">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase">24°+ Brix</div>
                  <div className="text-[11px] text-[#F5EEE2]/70">Naturally Sweet</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-[#113824] flex items-center justify-center border border-[#F59E0B]/30 text-[#F59E0B]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase">0% Carbide</div>
                  <div className="text-[11px] text-[#F5EEE2]/70">Tree Ripened</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-[#113824] flex items-center justify-center border border-[#F59E0B]/30 text-[#F59E0B]">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase">24h Transit</div>
                  <div className="text-[11px] text-[#F5EEE2]/70">Cold-Chain Reefer</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Main Mango Photo Card */}
              <div className="rounded-3xl overflow-hidden border-2 border-[#F59E0B]/40 shadow-2xl shadow-black/50 bg-[#113824]">
                <img
                  src="https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1000&q=80"
                  alt="Multani Chaunsa Gold Mangoes"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== window.location.origin + '/images/placeholder-mango.svg') {
                      target.src = '/images/placeholder-mango.svg';
                    }
                  }}
                  className="w-full h-96 object-cover transform hover:scale-105 transition-transform duration-700"
                />
                <div className="p-6 bg-gradient-to-t from-[#092115] via-[#092115]/95 to-transparent -mt-16 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] tracking-widest text-[#F59E0B] font-bold uppercase">
                        Current Pick: Batch CH-2026-01
                      </span>
                      <h2 className="text-xl font-serif font-bold text-white">Royal Multani Chaunsa</h2>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#F5EEE2]/70 line-through">PKR 2,800</div>
                      <div className="text-lg font-black text-[#F59E0B]">PKR 2,500</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#F5EEE2]/80">
                    <span className="flex items-center">
                      <Award className="w-3.5 h-3.5 text-[#F59E0B] mr-1" />
                      Export Grade A+
                    </span>
                    <span className="text-[#FBBF24] font-medium">Available in 5, 8 & 10 KG</span>
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-[#FDFBF7] text-[#092115] p-4 rounded-2xl shadow-xl border border-[#E8DBC5] hidden sm:flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#F59E0B]/20 text-[#D97706] flex items-center justify-center font-bold text-lg">
                  ★
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#113824]">90+ Years Tradition</div>
                  <div className="text-[11px] text-gray-600">Pure Canal Water Irrigation</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

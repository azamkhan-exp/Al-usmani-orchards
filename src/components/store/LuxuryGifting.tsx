'use client';

import React from 'react';
import { Gift, Heart, Shield, Sparkles, Check } from 'lucide-react';

export default function LuxuryGifting() {
  return (
    <section id="gifting" className="py-20 bg-[#FDFBF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-luxury rounded-3xl p-8 sm:p-14 bg-gradient-to-br from-[#113824] via-[#092115] to-[#113824] text-white border border-[#F59E0B]/40 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#F59E0B] uppercase tracking-widest bg-[#113824] px-3.5 py-1 rounded-full border border-[#F59E0B]/30">
                <Gift className="w-3.5 h-3.5" />
                <span>The Sovereign Tradition</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-serif font-black text-white">
                Send as a Royal Gift Box
              </h2>

              <p className="text-sm sm:text-base text-[#F5EEE2]/85 leading-relaxed font-light">
                In Mughal tradition, the gifting of first-flush mangoes was an act of profound honor.
                We preserve this heritage. Simply select <strong className="text-[#F59E0B]">"Send as Gift"</strong> at checkout,
                and we will wrap your crate in custom gold-embossed seals with a handwritten parchment greeting card.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs text-[#F5EEE2]/90">
                    <span className="font-bold text-white block">Custom Wax-Seal Card:</span>
                    Your personal greeting handwritten on parchment.
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs text-[#F5EEE2]/90">
                    <span className="font-bold text-white block">Direct Recipient Dispatch:</span>
                    Shipped directly to friends, family, or VIP clients.
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs text-[#F5EEE2]/90">
                    <span className="font-bold text-white block">No Invoice in Box:</span>
                    Financial receipt is sent only to your email.
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs text-[#F5EEE2]/90">
                    <span className="font-bold text-white block">Corporate Gifting:</span>
                    Bulk custom logo sleeves available for orders over 20 boxes.
                  </div>
                </div>
              </div>
            </div>

            {/* Gift Preview Card Visual */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm bg-[#FDFBF7] text-[#113824] p-6 rounded-2xl shadow-2xl border-2 border-[#F59E0B] space-y-4">
                <div className="flex items-center justify-between border-b border-[#E8DBC5] pb-3">
                  <span className="text-[10px] tracking-widest text-[#D97706] font-bold uppercase">
                    GIFT CONSIGNMENT
                  </span>
                  <span className="text-xs font-serif italic text-gray-500">Royal Parchment</span>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-gray-500">To Our Esteemed:</div>
                  <div className="font-serif font-bold text-lg text-[#113824]">
                    Begum & Chaudhry Sahib
                  </div>
                  <p className="text-xs font-serif italic text-gray-700 leading-relaxed bg-[#F5EEE2]/60 p-3 rounded-xl border border-[#E8DBC5]">
                    "With warmest compliments and blessings from Lahore. May these honeyed Chaunsa mangoes bring sweetness to your home."
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 text-[11px] text-[#D97706] font-bold">
                  <span>★ Gold Embossed Seal</span>
                  <span>Zero Price Exposure</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

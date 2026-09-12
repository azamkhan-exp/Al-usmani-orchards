'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { Calendar, Sparkles, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { PreorderCampaignDTO } from '@/types/dtos';
import { formatPKR } from '@/lib/formatters';

export default function PreorderSection({ campaigns }: { campaigns: PreorderCampaignDTO[] }) {
  const { addItem } = useCart();

  if (!campaigns || campaigns.length === 0) return null;

  return (
    <section id="preorders" className="py-20 bg-[#092115] text-[#FDFBF7] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#F59E0B] uppercase tracking-widest bg-[#113824] px-3.5 py-1 rounded-full border border-[#F59E0B]/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Priority Harvest Allocation</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-black text-white">
            Upcoming Flush Pre-Orders
          </h2>
          <p className="text-sm sm:text-base text-[#F5EEE2]/80">
            Lock in early bird rates and reserve rare harvest flushes picked straight from reserved trees.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {campaigns.map((camp) => {
            const percentFilled = Math.min(100, Math.round((camp.reserved_count / camp.total_capacity) * 100));
            const remaining = Math.max(0, camp.total_capacity - camp.reserved_count);

            return (
              <div
                key={camp.id}
                className="rounded-3xl overflow-hidden bg-[#113824] border border-[#F59E0B]/40 shadow-2xl flex flex-col justify-between"
              >
                {/* Header Image */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={camp.banner_image || '/images/placeholder-mango.svg'}
                    alt={camp.title}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== window.location.origin + '/images/placeholder-mango.svg') {
                        target.src = '/images/placeholder-mango.svg';
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-[#F59E0B] text-[#092115] text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow">
                    SAVE {formatPKR(camp.regular_price - camp.preorder_price)}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-xl flex items-center justify-between text-xs">
                    <span className="flex items-center text-[#FBBF24]">
                      <Clock className="w-4 h-4 mr-1.5" />
                      Expected Dispatch: {camp.expected_dispatch_date}
                    </span>
                    <span className="font-bold text-white">{camp.package_name}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-white">
                      {camp.title}
                    </h3>
                    <p className="text-xs text-[#F5EEE2]/80 mt-2 leading-relaxed">
                      {camp.customer_terms}
                    </p>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-2 p-4 rounded-xl bg-[#092115]/60 border border-white/10">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-white">Reservation Capacity:</span>
                      <span className="text-[#F59E0B]">
                        {camp.reserved_count} / {camp.total_capacity} Boxes Reserved ({percentFilled}%)
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full gold-gradient transition-all duration-700"
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-[#F5EEE2]/70 text-right">
                      Only <span className="font-bold text-white">{remaining} boxes</span> remaining for this flush
                    </div>
                  </div>

                  {/* Pricing and Preorder Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div>
                      <div className="text-[11px] text-[#F5EEE2]/70 line-through">
                        Regular: {formatPKR(camp.regular_price)}
                      </div>
                      <div className="text-2xl font-black text-[#F59E0B]">
                        {formatPKR(camp.preorder_price)}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        addItem({
                          packageSizeId: camp.package_size_id,
                          productId: camp.product_id,
                          productName: camp.product_name,
                          varietyName: camp.title,
                          packageName: camp.package_name,
                          weightKg: camp.weight_kg,
                          unitPrice: camp.preorder_price,
                          image: camp.banner_image
                        })
                      }
                      className="px-6 py-3 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#092115] font-black text-xs tracking-wider uppercase flex items-center space-x-2 shadow-lg transition-transform hover:-translate-y-0.5"
                    >
                      <span>PRE-ORDER NOW</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

'use client';

import React from 'react';
import { Sun, Droplet, Sprout, HeartHandshake, ShieldCheck } from 'lucide-react';

export default function FarmStory() {
  return (
    <section id="story" className="py-24 bg-[#F5EEE2] border-t border-[#E8DBC5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Visual Grid */}
          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden shadow-lg border border-[#E8DBC5] h-64">
                <img
                  src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80"
                  alt="Ancient Mango Orchard Trees"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== window.location.origin + '/images/placeholder-mango.svg') {
                      target.src = '/images/placeholder-mango.svg';
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-lg border border-[#E8DBC5] h-44 bg-[#113824] p-6 text-white flex flex-col justify-between">
                <div className="text-3xl font-serif font-black text-[#F59E0B]">1934</div>
                <div className="text-xs text-[#F5EEE2]/80">First grafted royal Chaunsa grove planted on Shujabad alluvium.</div>
              </div>
            </div>

            <div className="space-y-4 pt-8">
              <div className="rounded-2xl overflow-hidden shadow-lg border border-[#E8DBC5] h-44 bg-white p-6 border-l-4 border-l-[#D97706] flex flex-col justify-between">
                <div className="text-2xl font-serif font-black text-[#113824]">Chenab Fed</div>
                <div className="text-xs text-gray-600">Mineral-dense river silts nourish the root systems year-round.</div>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-lg border border-[#E8DBC5] h-64">
                <img
                  src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80"
                  alt="Harvest at Dawn"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== window.location.origin + '/images/placeholder-mango.svg') {
                      target.src = '/images/placeholder-mango.svg';
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Narrative */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#D97706] uppercase tracking-widest">
              <Sprout className="w-3.5 h-3.5" />
              <span>Four Generations of Custodianship</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#113824]">
              Where Soil, Sun & Heritage Converge
            </h2>

            <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-light">
              True Multani Chaunsa cannot be replicated in a commercial greenhouse. It requires the intense,
              punishing summer heat of southern Punjab, tempered by pure glacial run-off waters channeled from the
              Chenab river.
            </p>

            <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-light">
              Unlike industrial produce distributors who harvest immature green fruit and force-ripen with toxic
              calcium carbide, our master orchard pickers wait until each individual mango reaches physiological
              perfection on the tree branch.
            </p>

            <div className="pt-4 space-y-3">
              <div className="flex items-center space-x-3 text-sm text-[#113824] font-semibold">
                <div className="w-6 h-6 rounded-full bg-[#113824] text-[#F59E0B] flex items-center justify-center text-xs">✓</div>
                <span>Zero Carbide Chemical Ripening — 100% Tree Ripened</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-[#113824] font-semibold">
                <div className="w-6 h-6 rounded-full bg-[#113824] text-[#F59E0B] flex items-center justify-center text-xs">✓</div>
                <span>Organic Bio-Compost & Cold Pressed Neem Soil Treatment</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-[#113824] font-semibold">
                <div className="w-6 h-6 rounded-full bg-[#113824] text-[#F59E0B] flex items-center justify-center text-xs">✓</div>
                <span>Export Grade A+ Sorting: Only Top 15% of Harvest is Boxed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

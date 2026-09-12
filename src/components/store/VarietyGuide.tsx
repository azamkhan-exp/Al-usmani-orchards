'use client';

import React, { useState } from 'react';
import { Sparkles, MapPin, Calendar, Award } from 'lucide-react';
import { VarietyDTO } from '@/types/dtos';

export default function VarietyGuide({ varieties }: { varieties: VarietyDTO[] }) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!varieties || varieties.length === 0) return null;
  const active = varieties[activeIdx] || varieties[0];

  return (
    <section id="varieties" className="py-20 bg-[#F5EEE2] border-y border-[#E8DBC5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#D97706] uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Connoisseur’s Compass</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#113824]">
            Explore Our Heritage Mango Varieties
          </h2>
          <p className="text-sm sm:text-base text-gray-700">
            Each cultivar possesses a distinct physiological sugar density, aromatic bouquet, and texture.
            Compare our orchard selections below.
          </p>
        </div>

        {/* Variety Selection Tabs */}
        <div className="flex items-center justify-start sm:justify-center space-x-2 overflow-x-auto pb-4 mb-8">
          {varieties.map((v, idx) => (
            <button
              key={v.id}
              onClick={() => setActiveIdx(idx)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeIdx === idx
                  ? 'bg-[#113824] text-[#FDFBF7] shadow-md shadow-[#113824]/20'
                  : 'bg-white/80 text-[#113824] hover:bg-white hover:text-[#D97706] border border-[#E8DBC5]'
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>

        {/* Active Variety Detail Card */}
        <div className="card-luxury rounded-3xl p-6 sm:p-10 bg-white border border-[#E8DBC5]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Visual */}
            <div className="lg:col-span-5 relative">
              <div className="rounded-2xl overflow-hidden shadow-xl border border-[#E8DBC5] aspect-square relative">
                <img
                  src={active.image_url || '/images/placeholder-mango.svg'}
                  alt={active.name}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== window.location.origin + '/images/placeholder-mango.svg') {
                      target.src = '/images/placeholder-mango.svg';
                    }
                  }}
                  className="w-full h-full object-cover transition-all duration-500 hover:scale-105"
                />
                <div className="absolute top-4 left-4 bg-[#113824] text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 shadow">
                  <MapPin className="w-3 h-3 text-[#F59E0B]" />
                  <span>{active.origin_city}</span>
                </div>
              </div>
            </div>

            {/* Profiler Metrics */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#D97706]">
                  Exclusive Orchard Profile
                </span>
                <h3 className="text-2xl sm:text-3xl font-serif font-black text-[#113824] mt-1">
                  {active.name}
                </h3>
                <p className="text-sm text-gray-700 mt-3 leading-relaxed">
                  {active.description}
                </p>
              </div>

              {/* Flavor Notes Card */}
              <div className="p-4 rounded-xl bg-[#FDFBF7] border border-[#E8DBC5]">
                <span className="text-[11px] font-bold text-[#D97706] uppercase tracking-wider">
                  Tasting & Aromatics:
                </span>
                <p className="text-sm font-serif italic text-[#113824] mt-1">
                  "{active.flavor_notes}"
                </p>
              </div>

              {/* Gauge Sliders */}
              <div className="space-y-4 pt-2">
                {/* Brix Sweetness Meter */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#113824] mb-1.5">
                    <span>Sweetness (Brix Rating)</span>
                    <span className="text-[#D97706]">{active.sweetness_brix}° Brix (Very High)</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full gold-gradient transition-all duration-700"
                      style={{ width: `${Math.min(100, (active.sweetness_brix / 30) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>Standard Commercial: 16°</span>
                    <span>Al Usmani Peak Sweet: 24°+</span>
                  </div>
                </div>

                {/* Aroma Intensity */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#113824] mb-1.5">
                    <span>Aroma & Fragrance Concentration</span>
                    <span className="text-[#113824]">{active.aroma_level} / 10</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#113824] transition-all duration-700"
                      style={{ width: `${active.aroma_level * 10}%` }}
                    />
                  </div>
                </div>

                {/* Fiber Texture (Lower is smoother) */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#113824] mb-1.5">
                    <span>Pulp Texture & Fiber</span>
                    <span className="text-emerald-700">
                      {active.fiber_level <= 2 ? 'Buttery Melt (Virtually Zero Fiber)' : 'Tender Gentle Fiber'}
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-700"
                      style={{ width: `${active.fiber_level * 10}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="#harvest"
                  className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-[#D97706] hover:text-[#B45309] transition-colors"
                >
                  <span>Select packages for {active.name}</span>
                  <span className="ml-1.5">→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

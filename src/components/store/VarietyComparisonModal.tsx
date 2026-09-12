'use client';

import React, { useEffect, useState } from 'react';
import { X, Sparkles, Award, Scale, Droplet, Sun, Check } from 'lucide-react';
import { formatPKR } from '@/lib/formatters';

interface VarietyComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMPARISON_VARIETIES = [
  {
    name: 'Multani White Chaunsa',
    tagline: 'The Emperor of Sweetness',
    brix: 26,
    aroma: '10/10 (Intense Honey-Nectar)',
    fiber: 'Zero (Completely Butter-Smooth)',
    season: 'August – September (Late Harvest)',
    origin: 'Multan Royal Estate, Punjab',
    recommendedUse: 'Royal Connoisseur Slicing, Sovereign Gifts',
    cratePrice: 'From PKR 2,900 (5 KG)',
    badge: 'SWEETEST CULTIVAR'
  },
  {
    name: 'Multani Chaunsa (Traditional)',
    tagline: 'The Honey-Golden Classic',
    brix: 24.5,
    aroma: '9/10 (Rich Floral Perfume)',
    fiber: 'Zero (Melts in Mouth)',
    season: 'July – August',
    origin: 'Multan & Shujabad Groves',
    recommendedUse: 'Daily Luxury Slicing, Decadent Purees',
    cratePrice: 'From PKR 2,500 (5 KG)',
    badge: 'MOST POPULAR'
  },
  {
    name: 'Sindhri',
    tagline: 'The Regal Queen of Sindh',
    brix: 21,
    aroma: '8.5/10 (Citrusy-Floral Bouquet)',
    fiber: 'Minimal (Silky & Firm)',
    season: 'May – June (First Flush)',
    origin: 'Mirpur Khas Heritage Grove, Sindh',
    recommendedUse: 'Fresh Slicing, Mango Shakes & Desserts',
    cratePrice: 'From PKR 2,400 (5 KG)',
    badge: 'FIRST OF SEASON'
  },
  {
    name: 'Anwar Ratol',
    tagline: 'The Miniature Aroma Giant',
    brix: 25,
    aroma: '10/10 (Pungent Exotic Perfume)',
    fiber: 'None (Delicate Petite Flesh)',
    season: 'July – August',
    origin: 'Rahim Yar Khan Orchards',
    recommendedUse: 'Chilled Snacking, Post-Dinner Delicacy',
    cratePrice: 'From PKR 2,600 (5 KG)',
    badge: 'AROMA EMPEROR'
  },
  {
    name: 'Dussehri',
    tagline: 'The Mughal Court Heritage',
    brix: 22.5,
    aroma: '8.5/10 (Sweet Musky Bouquet)',
    fiber: 'Low (Juicy & Tender)',
    season: 'June – July',
    origin: 'Punjab Canal Belt',
    recommendedUse: 'Hand-pressed Traditional Sucking / Juicing',
    cratePrice: 'From PKR 2,200 (5 KG)',
    badge: 'HERITAGE FAVORITE'
  }
];

export default function VarietyComparisonModal({ isOpen, onClose }: VarietyComparisonModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([0, 1, 2]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleSelect = (idx: number) => {
    if (selectedIndices.includes(idx)) {
      if (selectedIndices.length > 2) {
        setSelectedIndices(selectedIndices.filter((i) => i !== idx));
      }
    } else {
      if (selectedIndices.length < 3) {
        setSelectedIndices([...selectedIndices, idx]);
      } else {
        setSelectedIndices([selectedIndices[1], selectedIndices[2], idx]);
      }
    }
  };

  const activeVarieties = selectedIndices.map((i) => COMPARISON_VARIETIES[i]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-[#FDFBF7] border border-[#E8DBC5] rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-[#113824] text-white flex items-center justify-between border-b border-[#195235]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#F59E0B] text-[#092115] flex items-center justify-center font-bold text-lg shadow-md">
              🥭
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-black tracking-wide">
                Mango Variety Comparison Matrix
              </h3>
              <p className="text-xs text-[#FBBF24]">
                Side-by-side agricultural tasting profiles from our Multan & Sindh estates
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Variety Selector Pills */}
        <div className="p-3 sm:p-4 bg-[#F5EEE2] border-b border-[#E8DBC5] flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-[#113824] whitespace-nowrap mr-2">
            Select Varieties (2-3):
          </span>
          {COMPARISON_VARIETIES.map((v, idx) => {
            const isSelected = selectedIndices.includes(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggleSelect(idx)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#113824] text-[#FDFBF7] shadow-xs'
                    : 'bg-white text-gray-600 border border-[#E8DBC5] hover:border-[#D97706]'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-[#F59E0B]" />}
                <span>{v.name}</span>
              </button>
            );
          })}
        </div>

        {/* Comparison Grid Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {activeVarieties.map((v, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border-2 border-[#E8DBC5] p-5 shadow-xs flex flex-col space-y-4 hover:border-[#D97706] transition-colors"
              >
                <div>
                  <span className="inline-block bg-[#D97706]/15 text-[#D97706] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                    {v.badge}
                  </span>
                  <h4 className="text-lg font-serif font-black text-[#113824]">
                    {v.name}
                  </h4>
                  <p className="text-xs text-gray-500 italic mt-0.5">{v.tagline}</p>
                </div>

                {/* Sweetness Brix Meter */}
                <div className="bg-[#FDFBF7] p-3 rounded-xl border border-[#E8DBC5]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#113824] mb-1.5">
                    <span className="flex items-center">
                      <Sun className="w-3.5 h-3.5 text-[#F59E0B] mr-1" />
                      Refractometer Sweetness
                    </span>
                    <span className="text-[#D97706] text-sm font-black">{v.brix}° Brix</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-[#D97706] h-full rounded-full transition-all duration-500"
                      style={{ width: `${((v.brix - 15) / 12) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    (Industry standard premium starts at 18° Brix)
                  </span>
                </div>

                {/* Attributes list */}
                <div className="space-y-2.5 text-xs text-gray-700">
                  <div className="flex items-start justify-between py-1 border-b border-gray-100">
                    <span className="font-medium text-gray-500">Aroma Profile:</span>
                    <span className="font-bold text-right text-[#113824] max-w-[60%]">{v.aroma}</span>
                  </div>
                  <div className="flex items-start justify-between py-1 border-b border-gray-100">
                    <span className="font-medium text-gray-500">Fiber Level:</span>
                    <span className="font-bold text-right text-[#113824]">{v.fiber}</span>
                  </div>
                  <div className="flex items-start justify-between py-1 border-b border-gray-100">
                    <span className="font-medium text-gray-500">Harvest Season:</span>
                    <span className="font-bold text-right text-[#113824]">{v.season}</span>
                  </div>
                  <div className="flex items-start justify-between py-1 border-b border-gray-100">
                    <span className="font-medium text-gray-500">Orchard Terroir:</span>
                    <span className="font-bold text-right text-[#113824]">{v.origin}</span>
                  </div>
                  <div className="flex items-start justify-between py-1 border-b border-gray-100">
                    <span className="font-medium text-gray-500">Best Enjoyed For:</span>
                    <span className="font-bold text-right text-[#113824] max-w-[60%]">{v.recommendedUse}</span>
                  </div>
                </div>

                <div className="pt-2 mt-auto border-t border-[#E8DBC5] flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">Live Price:</span>
                  <span className="text-sm font-black text-[#113824]">{v.cratePrice}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#E8DBC5] flex items-center justify-between">
          <p className="text-xs text-gray-500 hidden sm:block">
            All varieties are 100% naturally tree-ripened with zero calcium carbide ripening chemicals.
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold uppercase tracking-wider transition-colors ml-auto"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
}

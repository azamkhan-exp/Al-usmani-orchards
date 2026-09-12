'use client';

import React from 'react';
import { Sun, Droplet, CheckCircle, ShieldAlert, Sparkles, Box, Truck } from 'lucide-react';

export default function QualityProcess() {
  const steps = [
    {
      num: '01',
      title: 'Dawn Hand-Picking',
      time: '5:00 AM – 8:00 AM',
      desc: 'Harvested exclusively at daybreak while temperatures are cool. 1cm of stem is retained to prevent caustic latex sap burns on the skin.'
    },
    {
      num: '02',
      title: 'Desapping & Spring Wash',
      time: 'Post-Harvest QC',
      desc: 'Fruit is placed in custom desapping stands followed by a warm pure-water wash to cleanse natural orchard dust without harmful chemicals.'
    },
    {
      num: '03',
      title: 'Brix Sweetness Inspection',
      time: 'Spectrometer Check',
      desc: 'Every batch is tested with digital refractometers ensuring sugar concentration exceeds 24° Brix for Chaunsa and 21° Brix for Sindhri.'
    },
    {
      num: '04',
      title: 'Foam Nestling & 5-Ply Crates',
      time: 'Precision Packing',
      desc: 'Each mango is individually wrapped in a breathable food-grade foam sleeve and nested in a ventilated heavy-gauge export carton.'
    },
    {
      num: '05',
      title: '24h Cold-Chain Dispatch',
      time: 'Nationwide Delivery',
      desc: 'Loaded onto temperature-monitored courier vans (TCS & Leopards) reaching Lahore, Karachi, and Islamabad within 24 to 36 hours.'
    }
  ];

  return (
    <section className="py-24 bg-[#FDFBF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#D97706] uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Five-Step Export Standard</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#113824]">
            Our Uncompromising Harvest Protocol
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            From branch to banquet: every step is calibrated to deliver the freshest, sweetest mangoes in Pakistan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {steps.map((s) => (
            <div
              key={s.num}
              className="card-luxury rounded-2xl p-6 bg-white border border-[#E8DBC5] flex flex-col justify-between"
            >
              <div>
                <div className="text-3xl font-serif font-black text-[#D97706] mb-3">
                  {s.num}
                </div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  {s.time}
                </div>
                <h3 className="text-base font-serif font-bold text-[#113824] mb-2">
                  {s.title}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed font-light">
                  {s.desc}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-[#F5EEE2] flex items-center text-[11px] font-bold text-emerald-800">
                <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                <span>Certified Protocol</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

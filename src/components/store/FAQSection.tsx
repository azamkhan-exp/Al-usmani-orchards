'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How do you guarantee that your mangoes are 100% carbide-free?',
      a: 'We pick fruit only after physiological maturity is reached on the tree branches. The sugars and enzymes develop naturally. Calcium carbide produces toxic acetylene gas that imparts an artificial taste; we strictly ban carbide and heat-ripening chemicals across all our orchards.'
    },
    {
      q: 'How fast will my order arrive in Lahore, Karachi, or Islamabad?',
      a: 'Deliveries to Lahore and South Punjab are fulfilled within 24 hours of dispatch. Islamabad, Rawalpindi, and Karachi arrive within 24–36 hours via specialized cold-chain courier vehicles to maintain ambient fruit coolness.'
    },
    {
      q: 'Can I choose Cash on Delivery (COD)?',
      a: 'Yes! Cash on Delivery is available across all serviceable postal codes in Pakistan. You can pay the courier directly when your consignment is handed over at your doorstep.'
    },
    {
      q: 'What is your damaged fruit replacement guarantee?',
      a: 'If any mango arrives bruised, soft-spotted, or transit-damaged, we will replace the box or issue an instant refund. Simply share a clear photo of the crate with our WhatsApp Concierge within 12 hours of delivery.'
    },
    {
      q: 'How should I store the mangoes upon arrival?',
      a: 'Allow the mangoes to sit at normal room temperature for 1–2 days until the skin turns deep golden and releases its intoxicating aroma. Once ripe, chill in the refrigerator for 2 hours before peeling and serving.'
    }
  ];

  return (
    <section className="py-20 bg-[#FDFBF7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold text-[#D97706] uppercase tracking-widest">
            Transparency & Assurance
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#113824]">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="card-luxury rounded-2xl overflow-hidden bg-white border border-[#E8DBC5] transition-all"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between space-x-4 focus:outline-none"
                >
                  <span className="text-base font-serif font-bold text-[#113824]">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#D97706] transition-transform duration-300 flex-shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-gray-700 leading-relaxed font-light border-t border-[#F5EEE2] pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

'use client';

import React from 'react';
import { Star, Quote, CheckCircle } from 'lucide-react';

export default function Testimonials() {
  const reviews = [
    {
      name: 'Dr. Shahzad Tariq',
      city: 'DHA, Lahore',
      rating: 5,
      variety: 'Multani Chaunsa (10 KG)',
      comment:
        'The sweetness was beyond belief. Cut into the first mango and the entire living room was filled with honeyed aroma. Zero bruising, delivered within 24 hours of dispatch. True Multani gold.'
    },
    {
      name: 'Fatima Al-Hassan',
      city: 'Clifton, Karachi',
      rating: 5,
      variety: 'Mirpur Khas Sindhri (8 KG)',
      comment:
        'Sindhri from Mirpur Khas is unmatched. Perfectly sweet with just the right touch of citrus balance. My parents in Karachi said it reminded them of mangoes from their childhood.'
    },
    {
      name: 'Senator (R) Mansoor Qureshi',
      city: 'Sector F-7, Islamabad',
      rating: 5,
      variety: 'Anwar Ratol Perfumed Reserve',
      comment:
        'Sent 10 gift crates to friends and diplomatic associates in Islamabad. The presentation with the wax seal and personalized card made an extraordinary impression. Remarkable service.'
    }
  ];

  return (
    <section className="py-20 bg-[#F5EEE2] border-t border-[#E8DBC5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-bold text-[#D97706] uppercase tracking-widest">
            Verified Patron Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#113824]">
            Loved by Connoisseurs Nationwide
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((rev, i) => (
            <div
              key={i}
              className="card-luxury rounded-2xl p-8 bg-white border border-[#E8DBC5] flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex text-[#F59E0B] space-x-1">
                  {[...Array(rev.rating)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm font-serif italic text-gray-700 leading-relaxed">
                  "{rev.comment}"
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#F5EEE2] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#113824]">{rev.name}</div>
                  <div className="text-[11px] text-gray-500">{rev.city}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />
                    Verified
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

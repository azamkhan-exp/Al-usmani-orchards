'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  BookOpen,
  Award,
  Truck,
  Sparkles,
  Layers,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Thermometer,
  Clock,
  ArrowRight,
  Printer
} from 'lucide-react';

export default function AdminOperationsGuidePage() {
  const [activeSection, setActiveSection] = useState<'all' | 'brand' | 'varieties' | 'workflow' | 'couriers' | 'finance'>('all');

  const varieties = [
    {
      name: 'Multan Royal Chaunsa',
      season: 'July – August',
      brix: '26° – 28° Brix',
      aroma: '10/10 Perfumed Honey',
      origin: 'Multan / Shujabad',
      notes: 'Undisputed King of Mangoes. Velvety, fiberless golden nectar. Handpicked at physiological tree-ripeness.'
    },
    {
      name: 'Mirpur Khas Sindhri',
      season: 'Late May – June',
      brix: '20° – 22° Brix',
      aroma: '8/10 Citrus-Floral',
      origin: 'Mirpur Khas, Sindh',
      notes: 'The Pride of Sindh. Elegant elongated fruit with a refreshing apricot-citrus bouquet and fine firm texture.'
    },
    {
      name: 'Anwar Ratol',
      season: 'Mid June – July',
      brix: '27° – 29° Brix',
      aroma: '10/10 Explosive',
      origin: 'Multan Heirloom',
      notes: 'Miniature powerhouse. High sugar-to-acid ratio with an intoxicating floral perfume that fills the room.'
    },
    {
      name: 'Dussehri',
      season: 'June – July',
      brix: '21° – 23° Brix',
      aroma: '8/10 Delicate Musky',
      origin: 'Multan / Khanewal',
      notes: 'Slender heritage favorite. Exceptionally soft, melting texture with honeyed musky sweetness.'
    },
    {
      name: 'White Chaunsa',
      season: 'August – September',
      brix: '25° – 27° Brix',
      aroma: '9/10 Pure Nectar',
      origin: 'Multan Late Season',
      notes: 'Late-season sovereign. Silvery-gold skin, ultra-clean concentrated sweetness, and superior cold-chain shelf life.'
    }
  ];

  const workflowSteps = [
    {
      step: '1',
      status: 'CONFIRMED',
      title: 'Immediate Harvest Allocation',
      desc: 'Customer checkout immediately confirms the consignment (e.g. AUO-10245). Confirmation email dispatched. No manual approval required.'
    },
    {
      step: '2',
      status: 'PROCESSING',
      title: 'Dawn Plucking Queue',
      desc: 'Harvest tickets assigned to master pickers for dawn harvest (5:00 AM - 8:30 AM). Stalks trimmed under spring water to prevent sap damage.'
    },
    {
      step: '3',
      status: 'PACKED',
      title: 'Quality Grading & Nesting',
      desc: 'Each mango graded A+ export standard, sleeved in ventilated foam netting, and nested in 5-ply export-grade cartons.'
    },
    {
      step: '4',
      status: 'READY_FOR_DISPATCH',
      title: 'Cold-Hub Staging',
      desc: 'Crates staged at 13°C cold-storage holding rooms awaiting carrier reefer truck arrivals.'
    },
    {
      step: '5',
      status: 'SHIPPED',
      title: 'Courier Handover & Tracking',
      desc: 'Consignment handed to TCS, Leopards, M&P, or PakPost. Air/overland manifest generated and dispatched to customer email.'
    },
    {
      step: '6',
      status: 'OUT_FOR_DELIVERY',
      title: 'Destination Last-Mile',
      desc: 'Regional carrier hub assigns consignment to courier van for final doorstep handover.'
    },
    {
      step: '7',
      status: 'DELIVERED',
      title: 'Consignment Handed Over',
      desc: 'Delivery verified. For COD orders, collection credited to Accounts Receivable for courier remittance.'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-5xl">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold text-[#D97706] uppercase tracking-widest">
              Standard Operating Procedures • Al Usmani Orchards
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#113824]">
              Harvest Operations & Fulfillment Manual
            </h1>
            <p className="text-xs text-gray-500">
              Complete operational protocol for orchard staff, cold-chain fulfillment, and customer concierge.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            <span>Print SOP</span>
          </button>
        </div>

        {/* Section Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 text-xs border-b border-gray-200">
          {[
            { id: 'all', label: 'All Protocols' },
            { id: 'brand', label: 'Brand & Ethos' },
            { id: 'varieties', label: 'Mango Varieties' },
            { id: 'workflow', label: '7-Stage Workflow' },
            { id: 'couriers', label: 'Courier Carriers' },
            { id: 'finance', label: 'COD & Finance' }
          ].map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={`px-3.5 py-1.5 rounded-xl font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeSection === sec.id
                  ? 'bg-[#113824] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>

        {/* SECTION 1: BRAND IDENTITY & ETHOS */}
        {(activeSection === 'all' || activeSection === 'brand') && (
          <div className="card-luxury p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 space-y-4 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-xl">
                👑
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-[#113824]">
                  1. Brand Identity & Quality Mandate
                </h2>
                <p className="text-xs text-gray-500">
                  Strict standards governing the public image of Al Usmani Orchards.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#E8DBC5] space-y-1.5">
                <span className="font-bold text-[#113824] uppercase tracking-wider text-[11px] block">
                  Official Brand Name
                </span>
                <p className="font-serif font-black text-lg text-[#113824]">
                  Al Usmani Orchards
                </p>
                <p className="text-[11px] text-gray-600">
                  Strictly enforced across all customer communications, packaging, receipts, and marketing. Never use "Al Usmani Farm" or "Shahi Orchards".
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#E8DBC5] space-y-1.5">
                <span className="font-bold text-[#D97706] uppercase tracking-wider text-[11px] block">
                  Primary Tagline & Positioning
                </span>
                <p className="font-serif italic font-bold text-base text-[#113824]">
                  &ldquo;From Our Orchards to Your Door.&rdquo;
                </p>
                <p className="text-[11px] text-gray-600">
                  Fresh from Our Orchards • Premium Pakistani Mangoes • Naturally Grown • Delivered with Care. Estd. 1934 Multan, Punjab, Pakistan.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
              <strong className="text-emerald-950 font-bold flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>The Zero-Carbide Guarantee</span>
              </strong>
              <p className="text-emerald-900 leading-relaxed">
                Industrial calcium carbide is strictly prohibited across all Al Usmani harvesting estates. Fruit is allowed to achieve physiological maturity naturally on heirloom branches, converting organic starches into floral honey sugars prior to harvest.
              </p>
            </div>
          </div>
        )}

        {/* SECTION 2: MANGO VARIETIES MATRIX */}
        {(activeSection === 'all' || activeSection === 'varieties') && (
          <div className="card-luxury p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 space-y-4 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-xl">
                🥭
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-[#113824]">
                  2. Heritage Mango Cultivars & Terroir Guide
                </h2>
                <p className="text-xs text-gray-500">
                  Harvest calendars, sweetness brix benchmarks, and tasting notes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {varieties.map((v, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl border border-gray-200 bg-[#FDFBF7] space-y-3 text-xs"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-serif font-bold text-base text-[#113824]">{v.name}</h3>
                      <div className="text-gray-500 text-[11px]">Terroir: {v.origin}</div>
                    </div>
                    <span className="bg-[#F59E0B] text-[#092115] text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                      {v.brix}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-gray-400 block">Harvest Window:</span>
                      <span className="font-bold text-gray-800">{v.season}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Aroma Rating:</span>
                      <span className="font-bold text-amber-700">{v.aroma}</span>
                    </div>
                  </div>

                  <p className="text-gray-600 leading-relaxed text-[11px]">{v.notes}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 3: 7-STAGE ORDER STATE MACHINE */}
        {(activeSection === 'all' || activeSection === 'workflow') && (
          <div className="card-luxury p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 space-y-4 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-xl">
                ⚡
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-[#113824]">
                  3. The 7-Stage Order Fulfillment Workflow
                </h2>
                <p className="text-xs text-gray-500">
                  Every consignment follows this precise sequential flow from checkout to doorstep.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {workflowSteps.map((s) => (
                <div
                  key={s.step}
                  className="p-4 rounded-2xl border border-gray-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs hover:border-[#D97706] transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-7 h-7 rounded-full bg-[#113824] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {s.step}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-900 text-sm">{s.title}</span>
                        <span className="font-mono text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                          {s.status}
                        </span>
                      </div>
                      <p className="text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 4: COURIER CARRIER REFERENCE */}
        {(activeSection === 'all' || activeSection === 'couriers') && (
          <div className="card-luxury p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 space-y-4 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-xl">
                🚚
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-[#113824]">
                  4. Cold-Chain Courier Logistics & SLAs
                </h2>
                <p className="text-xs text-gray-500">
                  Nationwide shipping partners, vehicle cold-chains, and consignment tracking codes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl border border-gray-200 bg-[#FDFBF7] space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[#113824]">TCS Cold-Chain Express</span>
                  <span className="text-[10px] font-mono bg-blue-100 text-blue-900 px-2 py-0.2 rounded font-bold">Overnight Air</span>
                </div>
                <p className="text-gray-600 text-[11px]">
                  Priority carrier for Karachi, Lahore, and Islamabad metro areas. Picked at dawn in Multan, dispatched on afternoon flights, delivered within 24 hours.
                </p>
                <div className="font-mono text-[10px] text-gray-500">Tracking Code: TCS-XXXXXXXX</div>
              </div>

              <div className="p-4 rounded-2xl border border-gray-200 bg-[#FDFBF7] space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[#113824]">Leopards Courier Logistics</span>
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-900 px-2 py-0.2 rounded font-bold">Heavy Reefer</span>
                </div>
                <p className="text-gray-600 text-[11px]">
                  Dedicated overland logistics for multi-crate family bundles and corporate orders (20+ KG) using climate-controlled containers.
                </p>
                <div className="font-mono text-[10px] text-gray-500">Tracking Code: LEO-XXXXXXXX</div>
              </div>

              <div className="p-4 rounded-2xl border border-gray-200 bg-[#FDFBF7] space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[#113824]">M&P Express Logistics</span>
                  <span className="text-[10px] font-mono bg-amber-100 text-amber-900 px-2 py-0.2 rounded font-bold">Standard Ground</span>
                </div>
                <p className="text-gray-600 text-[11px]">
                  Secondary tier ground transport for secondary cities across Punjab and upper Sindh with high reliability.
                </p>
                <div className="font-mono text-[10px] text-gray-500">Tracking Code: MNP-XXXXXXXX</div>
              </div>

              <div className="p-4 rounded-2xl border border-gray-200 bg-[#FDFBF7] space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[#113824]">Pakistan Post UMS Urgent Mail</span>
                  <span className="text-[10px] font-mono bg-zinc-100 text-zinc-900 px-2 py-0.2 rounded font-bold">Universal Reach</span>
                </div>
                <p className="text-gray-600 text-[11px]">
                  National universal postal service delivering to remote cantonments, valleys, and non-commercial zip codes.
                </p>
                <div className="font-mono text-[10px] text-gray-500">Tracking Code: PAK-XXXXXXXX</div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: FINANCE & COD RECONCILIATION */}
        {(activeSection === 'all' || activeSection === 'finance') && (
          <div className="card-luxury p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 space-y-4 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-xl">
                💳
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-[#113824]">
                  5. Accounts Receivable & Courier COD Remittance
                </h2>
                <p className="text-xs text-gray-500">
                  Managing cash flow, pending courier balances, and bank reconciliation.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-gray-200 space-y-2">
                <span className="font-bold text-[#113824] block text-sm">COD Settlement Cycle</span>
                <p className="text-gray-600 leading-relaxed text-[11px]">
                  When an order is created with Cash on Delivery (COD), the system automatically registers a debt against <span className="font-mono font-bold">COURIER_COD</span> in Accounts Receivable. Once the carrier collects cash at the customer doorstep and issues their weekly bank remittance statement, staff should open <span className="font-bold">Finance & Profit</span> and mark the ledger row <span className="font-bold text-emerald-800">SETTLED</span>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-gray-200 space-y-2">
                <span className="font-bold text-[#113824] block text-sm">Customer Replacement Policy</span>
                <p className="text-gray-600 leading-relaxed text-[11px]">
                  Al Usmani Orchards offers an unconditional freshness guarantee. If fruit exhibits any transit bruise, customers report via WhatsApp (+92 300 8472910) within 12 hours with a crate photo. The concierge queues an immediate priority replacement consignment at no additional charge.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Save,
  CheckCircle,
  Sparkles,
  ExternalLink,
  Plus,
  Trash2,
  HelpCircle,
  Image as ImageIcon,
  MessageSquare,
  Sprout,
  RefreshCw,
  Eye
} from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

export default function AdminCMSPage() {
  const [content, setContent] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'ANNOUNCEMENT' | 'HERO' | 'STORY' | 'FAQS'>('HERO');

  // Announcement states
  const [bannerText, setBannerText] = useState('');
  const [bannerActive, setBannerActive] = useState(true);

  // Hero states
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [primaryCta, setPrimaryCta] = useState('');
  const [secondaryCta, setSecondaryCta] = useState('');
  const [brixBadge, setBrixBadge] = useState('');
  const [dispatchNote, setDispatchNote] = useState('');
  const [heroImage, setHeroImage] = useState('');

  // Farm Story states
  const [storyTitle, setStoryTitle] = useState('');
  const [storyNarrative, setStoryNarrative] = useState('');

  // FAQs states
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  useEffect(() => {
    fetch('/api/admin/cms')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.content) {
          setContent(data.content);
          // Hero
          if (data.content.hero) {
            setHeadline(data.content.hero.headline || '');
            setSubheadline(data.content.hero.subheadline || '');
            setPrimaryCta(data.content.hero.primaryCta || 'SHOP THE HARVEST');
            setSecondaryCta(data.content.hero.secondaryCta || 'EXPLORE OUR FARM');
            setBrixBadge(data.content.hero.brixBadge || '24°+ Brix');
            setDispatchNote(data.content.hero.dispatchNote || 'Dawn-Picked • 24h Cold-Chain Nationwide Dispatch');
            setHeroImage(data.content.hero.heroImage || 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1000&q=80');
          }
          // Announcement
          if (data.content.announcement) {
            setBannerText(data.content.announcement.bannerText || '');
            setBannerActive(data.content.announcement.active !== false);
          }
          // Farm Story
          if (data.content.farm_story) {
            setStoryTitle(data.content.farm_story.title || '');
            setStoryNarrative(data.content.farm_story.narrative || '');
          }
          // FAQs
          if (Array.isArray(data.content.faqs)) {
            setFaqs(data.content.faqs);
          }
        }
      })
      .catch((e) => console.error('Failed to load CMS content:', e))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Save Hero
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey: 'hero',
          content: {
            ...content.hero,
            headline,
            subheadline,
            primaryCta,
            secondaryCta,
            brixBadge,
            dispatchNote,
            heroImage
          }
        })
      });

      // 2. Save Announcement
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey: 'announcement',
          content: {
            bannerText,
            active: bannerActive
          }
        })
      });

      // 3. Save Farm Story
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey: 'farm_story',
          content: {
            ...(content.farm_story || {}),
            title: storyTitle,
            narrative: storyNarrative
          }
        })
      });

      // 4. Save FAQs
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey: 'faqs',
          content: faqs
        })
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      console.error('Error saving CMS:', e);
      alert('Failed to save CMS changes: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFaq = () => {
    setFaqs([...faqs, { q: 'New Question?', a: 'Detailed answer explaining orchard processes or policies.' }]);
  };

  const handleUpdateFaq = (index: number, field: 'q' | 'a', value: string) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
  };

  const handleRemoveFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <span className="text-[11px] font-bold text-[#D97706] uppercase tracking-widest">
              Live Brand Experience
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#113824]">
              Website Content Management (CMS)
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Edit live copywriting, hero banners, orchard story narrative, and FAQs without touching source code.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-[#113824] hover:bg-gray-50 shadow-xs flex items-center space-x-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Preview Live Store</span>
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </a>

            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 text-[#F59E0B]" />
              )}
              <span>{saving ? 'Publishing...' : 'Publish to Live Store'}</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Storefront content updated & cache revalidated successfully! Visitors will see changes immediately.</span>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {[
            { id: 'HERO', label: '1. Homepage Hero', icon: Sparkles },
            { id: 'ANNOUNCEMENT', label: '2. Top Marquee', icon: MessageSquare },
            { id: 'STORY', label: '3. Farm Heritage Story', icon: Sprout },
            { id: 'FAQS', label: '4. Store FAQs', icon: HelpCircle }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-5 py-3 border-b-2 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#113824] text-[#113824]'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#D97706]' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSaveAll} className="space-y-6">
          {/* TAB 1: HERO */}
          {activeTab === 'HERO' && (
            <div className="card-luxury p-6 rounded-2xl bg-white border border-gray-200 space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-[#113824] uppercase tracking-wider">
                  Primary Homepage Hero Banner
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  The primary visual and headline seen by every customer arriving at Al Usmani Orchards.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Primary Main Headline:
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. From Our Orchards to Your Door."
                    className="w-full text-sm p-3 rounded-xl border border-gray-300 font-serif font-bold text-[#113824]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Supporting Subheadline Narrative:
                  </label>
                  <textarea
                    rows={3}
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                    placeholder="Describe tree-ripening, origin groves, and courier dispatch..."
                    className="w-full text-xs p-3 rounded-xl border border-gray-300 text-gray-700 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Primary Button CTA Text:
                  </label>
                  <input
                    type="text"
                    value={primaryCta}
                    onChange={(e) => setPrimaryCta(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Secondary Button CTA Text:
                  </label>
                  <input
                    type="text"
                    value={secondaryCta}
                    onChange={(e) => setSecondaryCta(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Brix Sweetness Badge:
                  </label>
                  <input
                    type="text"
                    value={brixBadge}
                    onChange={(e) => setBrixBadge(e.target.value)}
                    placeholder="e.g. 24°+ Brix"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Transit & Dispatch Badge:
                  </label>
                  <input
                    type="text"
                    value={dispatchNote}
                    onChange={(e) => setDispatchNote(e.target.value)}
                    placeholder="e.g. 24h Transit"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 font-medium"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Hero Showcase Image URL:
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="url"
                      value={heroImage}
                      onChange={(e) => setHeroImage(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 text-xs p-2.5 rounded-xl border border-gray-300 font-mono"
                    />
                    {heroImage && (
                      <div className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden shrink-0 bg-stone-100">
                        <img
                          src={heroImage}
                          alt="Hero Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANNOUNCEMENT */}
          {activeTab === 'ANNOUNCEMENT' && (
            <div className="card-luxury p-6 rounded-2xl bg-white border border-gray-200 space-y-4">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#113824] uppercase tracking-wider">
                    Top Announcement Marquee Ticker
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Displayed at the very top of all customer pages.
                  </p>
                </div>
                <label className="flex items-center space-x-2 text-xs font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bannerActive}
                    onChange={(e) => setBannerActive(e.target.checked)}
                    className="rounded text-emerald-800 focus:ring-emerald-800"
                  />
                  <span>Active on Storefront</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ticker Announcement Message:
                </label>
                <textarea
                  rows={3}
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value)}
                  placeholder="🥭 MANGO HARVEST SEASON 2026: BUY 10 BOXES & SAVE 15% AUTOMATICALLY • FREE NATIONWIDE COLD-CHAIN DISPATCH ON PRE-ORDERS"
                  className="w-full text-xs p-3 rounded-xl border border-gray-300 font-medium leading-relaxed"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600">
                <span className="font-bold text-[#113824]">Live Storefront Appearance: </span>
                <span>The marquee automatically loops smoothly from right to left with seasonal promotional highlights.</span>
              </div>
            </div>
          )}

          {/* TAB 3: FARM STORY */}
          {activeTab === 'STORY' && (
            <div className="card-luxury p-6 rounded-2xl bg-white border border-gray-200 space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-[#113824] uppercase tracking-wider">
                  Farm Story & Heritage Section
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  The history, tradition, and organic soil heritage narrative shown in the homepage story section.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Story Section Title:
                </label>
                <input
                  type="text"
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder="e.g. Four Generations of Royal Orchard Mastery"
                  className="w-full text-sm p-3 rounded-xl border border-gray-300 font-serif font-bold text-[#113824]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Heritage Narrative:
                </label>
                <textarea
                  rows={5}
                  value={storyNarrative}
                  onChange={(e) => setStoryNarrative(e.target.value)}
                  placeholder="Our estate lies along the fertile alluvium of the ancient Chenab and Indus rivers..."
                  className="w-full text-xs p-3 rounded-xl border border-gray-300 leading-relaxed text-gray-700 font-light"
                />
              </div>
            </div>
          )}

          {/* TAB 4: FAQS */}
          {activeTab === 'FAQS' && (
            <div className="card-luxury p-6 rounded-2xl bg-white border border-gray-200 space-y-4">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#113824] uppercase tracking-wider">
                    Customer Frequently Asked Questions
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Answer questions regarding carbide-free tree ripening, city delivery times, and damaged fruit replacements.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFaq}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold hover:bg-emerald-100 flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-stone-50/60 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        FAQ #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFaq(idx)}
                        className="text-red-500 hover:text-red-700 text-xs p-1"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={faq.q}
                        onChange={(e) => handleUpdateFaq(idx, 'q', e.target.value)}
                        placeholder="Question title"
                        className="w-full text-xs font-bold p-2 rounded-lg border border-gray-300 bg-white"
                      />
                    </div>

                    <div>
                      <textarea
                        rows={2}
                        value={faq.a}
                        onChange={(e) => handleUpdateFaq(idx, 'a', e.target.value)}
                        placeholder="Answer narrative..."
                        className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <span className="text-xs text-gray-500">
              Changes are immediately cached across Vercel edge nodes upon publishing.
            </span>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4 text-[#F59E0B]" />
              )}
              <span>{saving ? 'Publishing Changes...' : 'Publish Content to Live Store'}</span>
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

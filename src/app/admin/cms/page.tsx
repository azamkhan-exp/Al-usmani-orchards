'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Settings, Save, CheckCircle, Sparkles } from 'lucide-react';

export default function AdminCMSPage() {
  const [content, setContent] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [bannerText, setBannerText] = useState('');

  useEffect(() => {
    fetch('/api/admin/cms')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setContent(data.content);
          if (data.content.hero) {
            setHeadline(data.content.hero.headline || '');
            setSubheadline(data.content.hero.subheadline || '');
          }
          if (data.content.announcement) {
            setBannerText(data.content.announcement.bannerText || '');
          }
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey: 'hero',
          content: {
            ...content.hero,
            headline,
            subheadline
          }
        })
      });

      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey: 'announcement',
          content: {
            bannerText,
            active: true
          }
        })
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-black text-[#113824]">
            Website Content Management (CMS)
          </h1>
          <p className="text-xs text-gray-500">
            Edit live storefront copywriting, promotional announcements, and hero banners without writing code.
          </p>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Storefront content updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSaveHero} className="space-y-6">
          {/* Announcement Bar */}
          <div className="card-luxury p-6 rounded-2xl bg-white border border-gray-200 space-y-3">
            <h2 className="text-sm font-bold text-[#113824] uppercase tracking-wider">
              1. Top Announcement Marquee
            </h2>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Announcement Ticker Text:
              </label>
              <textarea
                rows={2}
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-gray-300 font-medium"
              />
            </div>
          </div>

          {/* Hero Section */}
          <div className="card-luxury p-6 rounded-2xl bg-white border border-gray-200 space-y-4">
            <h2 className="text-sm font-bold text-[#113824] uppercase tracking-wider">
              2. Homepage Hero Section
            </h2>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Primary Main Headline:
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-gray-300 font-serif font-bold text-[#113824]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Supporting Subheadline:
              </label>
              <textarea
                rows={3}
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-gray-300"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-[#113824] hover:bg-[#195235] text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-2 shadow"
          >
            <Save className="w-4 h-4" />
            <span>Publish Content to Live Store</span>
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}

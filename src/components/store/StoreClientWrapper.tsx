'use client';

import React, { useState } from 'react';
import AnnouncementMarquee from './AnnouncementMarquee';
import Navbar from './Navbar';
import Hero from './Hero';
import VarietyGuide from './VarietyGuide';
import ProductSection from './ProductSection';
import PreorderSection from './PreorderSection';
import LuxuryGifting from './LuxuryGifting';
import FarmStory from './FarmStory';
import QualityProcess from './QualityProcess';
import Testimonials from './Testimonials';
import FAQSection from './FAQSection';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import OrchardBotDrawer from './OrchardBotDrawer';
import { VarietyDTO, ProductDTO, PreorderCampaignDTO } from '@/types/dtos';
import { PublicStoreSettings } from '@/lib/services/settings.service';

interface StoreClientWrapperProps {
  varieties: VarietyDTO[];
  products: ProductDTO[];
  campaigns: PreorderCampaignDTO[];
  settings?: PublicStoreSettings;
}

export default function StoreClientWrapper({
  varieties,
  products,
  campaigns,
  settings
}: StoreClientWrapperProps) {
  const [isAiOpen, setIsAiOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7]">
      <AnnouncementMarquee settings={settings} />
      <Navbar onOpenAI={() => setIsAiOpen(true)} settings={settings} />
      <main className="flex-grow">
        <Hero />
        <VarietyGuide varieties={varieties} />
        <ProductSection products={products} />
        <PreorderSection campaigns={campaigns} />
        <LuxuryGifting />
        <FarmStory />
        <QualityProcess />
        <Testimonials />
        <FAQSection />
      </main>
      <Footer settings={settings} />
      <CartDrawer />
      <OrchardBotDrawer isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
}

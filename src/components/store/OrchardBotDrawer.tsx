'use client';

import React, { useState, useRef, useEffect } from 'react';
import SafeImage from '@/components/ui/SafeImage';
import { Sparkles, X, Send, ShoppingBag, Check, Award, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPKR } from '@/lib/formatters';

interface ChatProduct {
  id: string;
  name: string;
  variety: string;
  package_size_id: string;
  package_name: string;
  weight_kg: number;
  price: number;
  original_price?: number | null;
  image_url: string;
  in_stock: boolean;
  available_stock: number;
  sweetness_brix: number;
}

interface Message {
  sender: 'bot' | 'user';
  text: string;
  time: string;
  suggestedFollowUps?: string[];
  products?: ChatProduct[];
}

export default function OrchardBotDrawer({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: 'Salam! I am **OrchardBot**, your Royal Mango Concierge.\n\nI can assist you with sweetness comparisons (Brix index), live harvest crate stock, volume discounts, and protected order tracking.\n\nHow may I assist your palate today?',
      time: 'Just now',
      suggestedFollowUps: [
        'Which mango is sweetest?',
        'What is available in 10 KG?',
        'Which offer is active?',
        'Do you deliver to Lahore?'
      ]
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAddToCart = (item: ChatProduct) => {
    addItem({
      packageSizeId: item.package_size_id,
      productId: item.id,
      productName: item.name,
      varietyName: item.variety,
      packageName: item.package_name,
      weightKg: item.weight_kg,
      unitPrice: item.price,
      image: item.image_url
    });

    setAddedItems((prev) => ({ ...prev, [item.package_size_id]: true }));
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [item.package_size_id]: false }));
    }, 2000);
  };

  const handleSend = async (queryText?: string) => {
    const query = (queryText || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode: 'customer' })
      });
      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: data.answer,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedFollowUps: data.suggestedFollowUps,
            products: data.products
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: data.error || 'I encountered an issue accessing our harvest records. Please connect with our WhatsApp concierge at +92 300 8472910.',
            time: 'Just now'
          }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Unable to reach the orchard server. Please verify your connection.',
          time: 'Just now'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Lock body scroll and handle Escape key when OrchardBot drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-[#FDFBF7] shadow-2xl flex flex-col border-l border-[#E8DBC5] h-[100dvh]">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-[#113824] text-white flex items-center justify-between border-b border-[#195235]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-[#F59E0B] text-[#092115] flex items-center justify-center font-bold shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-serif font-black tracking-wide">
                  OrchardBot AI Concierge
                </h3>
                <div className="text-[10px] text-[#FBBF24] flex items-center space-x-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Grounded in Live Multan Harvest Data</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-gray-300 hover:text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-[#113824] text-white rounded-tr-none shadow-sm'
                      : 'bg-white text-gray-800 border border-[#E8DBC5] shadow-xs rounded-tl-none'
                  }`}
                >
                  {m.text}

                  {/* Interactive Product Cards inside chat */}
                  {m.products && m.products.length > 0 && (
                    <div className="mt-3.5 pt-3.5 border-t border-[#E8DBC5] space-y-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#D97706] flex items-center space-x-1">
                        <Award className="w-3.5 h-3.5" />
                        <span>Recommended Harvest Crates:</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {m.products.map((p) => {
                          const isAdded = addedItems[p.package_size_id];
                          return (
                            <div
                              key={p.package_size_id}
                              className="p-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] flex items-center justify-between gap-2.5 hover:border-[#D97706] transition-colors"
                            >
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                                <SafeImage
                                  src={p.image_url}
                                  alt={p.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-900 text-xs truncate">
                                  {p.variety} — {p.package_name}
                                </div>
                                <div className="flex items-center space-x-2 text-[10px] text-gray-500">
                                  <span>{p.weight_kg} KG</span>
                                  <span>•</span>
                                  <span className="text-[#D97706] font-bold">{p.sweetness_brix}° Brix</span>
                                </div>
                                <div className="flex items-center space-x-1.5 mt-0.5">
                                  <span className="font-bold text-[#113824] text-xs">
                                    {formatPKR(p.price)}
                                  </span>
                                  {p.original_price && p.original_price > p.price && (
                                    <span className="text-[10px] text-gray-400 line-through">
                                      {formatPKR(p.original_price)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddToCart(p)}
                                disabled={!p.in_stock}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center space-x-1 flex-shrink-0 transition-all ${
                                  !p.in_stock
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : isAdded
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-[#113824] hover:bg-[#195235] text-white shadow-xs'
                                }`}
                              >
                                {isAdded ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Added!</span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="w-3.5 h-3.5" />
                                    <span>Add</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">{m.time}</span>

                {/* Follow-up suggestion chips */}
                {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.suggestedFollowUps.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => handleSend(chip)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-[#F5EEE2] hover:bg-[#E8DBC5] text-[#113824] font-medium border border-[#E8DBC5] transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-xs text-[#D97706] p-2 bg-amber-50/50 rounded-xl border border-amber-100 max-w-[200px]">
                <div className="w-2 h-2 rounded-full bg-[#D97706] animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-[#D97706] animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-[#D97706] animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] font-medium text-amber-900">Consulting orchard ledger...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Query Input */}
          <div className="p-4 bg-white border-t border-[#E8DBC5]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about sweetness, stock, or tracking..."
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-[#E8DBC5] bg-[#FDFBF7] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white disabled:opacity-40 transition-opacity shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

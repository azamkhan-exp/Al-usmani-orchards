'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, Database, BarChart2 } from 'lucide-react';

interface Message {
  sender: 'bot' | 'user';
  text: string;
  time: string;
  suggestedFollowUps?: string[];
}

export default function AdminAIDrawer({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: 'Salam! I am **OrchardIQ**, your executive business intelligence analyst. I query our live database directly to answer questions regarding P&L, sales, inventory risk, courier performance, and expenses.\n\nWhat would you like to analyze?',
      time: 'Just now',
      suggestedFollowUps: [
        'How much profit did we make?',
        'Which mango sold the most?',
        'How much COD is pending?',
        'Which product is low in stock?',
        'How much did we spend on marketing?'
      ]
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
        body: JSON.stringify({ query, mode: 'admin' })
      });
      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: data.answer,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedFollowUps: data.suggestedFollowUps
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: data.error || 'Failed to synthesize database records.',
            time: 'Just now'
          }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Error connecting to database analytics engine.',
          time: 'Just now'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-gray-200">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-[#092115] text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-[#F59E0B] text-[#092115] flex items-center justify-center font-bold shadow">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-serif font-black tracking-wide">
                  OrchardIQ Executive AI
                </h3>
                <div className="text-[10px] text-[#FBBF24] flex items-center space-x-1 font-medium">
                  <Database className="w-3 h-3 text-emerald-400" />
                  <span>Grounded SQL Intelligence</span>
                </div>
              </div>
            </div>

            <button onClick={onClose} className="p-1.5 text-gray-300 hover:text-white rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-[#113824] text-white rounded-tr-none'
                      : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">{m.time}</span>

                {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.suggestedFollowUps.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => handleSend(chip)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-[#F5EEE2] text-[#113824] font-medium border border-gray-200 transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-xs text-[#D97706] p-2">
                <div className="w-2 h-2 rounded-full bg-[#D97706] animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-[#D97706] animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-[#D97706] animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] text-gray-500">Querying live financial ledger...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Query Input */}
          <div className="p-4 bg-white border-t border-gray-200">
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
                placeholder="Ask about P&L, sales, COD, or inventory..."
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#D97706]"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 rounded-xl bg-[#113824] hover:bg-[#195235] text-white disabled:opacity-40 transition-opacity"
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

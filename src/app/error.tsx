'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    try {
      // Safe diagnostic logging
      console.error('Orchard Guard caught unhandled UI error:', error?.message || error);
    } catch {
      // Silent catch
    }
  }, [error]);

  const handleReset = () => {
    try {
      reset();
    } catch {
      window.location.reload();
    }
  };

  // Sanitize message to prevent leaking SQL/tokens/paths even in dev
  const isDev = process.env.NODE_ENV !== 'production';
  const rawMsg = error?.message || '';
  const containsSensitive = /select|insert|update|delete|sqlite|password|secret|bearer|token|\/users\//i.test(rawMsg);
  const displayMsg = containsSensitive
    ? 'A system operation encountered an unexpected issue.'
    : rawMsg;

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#113824]/10 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#D97706] flex items-center justify-center mx-auto shadow-inner border border-amber-200/50">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold text-[#D97706] uppercase tracking-widest">
            Orchard Guard System
          </span>
          <h1 className="text-2xl font-serif font-black text-[#113824]">
            Something went wrong
          </h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            We encountered an unexpected issue while loading this view. Your session and harvest crate reservations remain completely secure.
          </p>

          {isDev && displayMsg && (
            <div className="mt-3 p-3 rounded-xl bg-gray-50 text-red-600 text-[11px] font-mono text-left overflow-auto max-h-32 border border-red-100">
              {displayMsg}
              {error?.digest && (
                <div className="mt-1 text-gray-400 text-[10px]">Digest: {error.digest}</div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#113824] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center space-x-2 shadow-md hover:bg-[#195235] transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center space-x-2 hover:bg-gray-200 transition"
          >
            <Home className="w-4 h-4" />
            <span>Return to Orchards</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

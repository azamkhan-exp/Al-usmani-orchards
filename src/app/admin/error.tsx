'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    console.error('Admin Command Center Exception caught:', error);
  }, [error]);

  const handleReset = () => {
    try {
      reset();
    } catch {
      window.location.reload();
    }
  };

  const isDev = process.env.NODE_ENV !== 'production';
  const rawMsg = error?.message || '';
  const containsSensitive = /select|insert|update|delete|sqlite|password|secret|bearer|token|\/users\//i.test(rawMsg);
  const displayMsg = containsSensitive
    ? 'An administrative operation encountered an exception. Details have been logged securely.'
    : rawMsg;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-3xl p-8 border border-red-200 shadow-xl text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold text-red-600 uppercase tracking-widest">
            Admin System Exception
          </span>
          <h1 className="text-2xl font-serif font-black text-[#113824]">
            Administrative Portal Error
          </h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            An unexpected error occurred while rendering this administrative view. Database records and active transactions remain fully protected.
          </p>
          {isDev && displayMsg && (
            <div className="mt-3 p-3 rounded-xl bg-gray-50 text-red-600 text-[11px] font-mono text-left overflow-auto max-h-36 border border-red-100">
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
            <span>Reload Module</span>
          </button>
          <Link
            href="/admin"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center space-x-2 hover:bg-gray-200 transition"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Command Center</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

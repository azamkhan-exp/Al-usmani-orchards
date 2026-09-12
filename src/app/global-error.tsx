'use client';

import React, { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Root error boundary to catch catastrophic layout errors.
 * Replaces the entire root layout, so it defines its own <html> and <body>.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    try {
      console.error('Catastrophic root layout exception caught:', error);
    } catch {}
  }, [error]);

  const handleReset = () => {
    try {
      reset();
    } catch {
      window.location.href = '/';
    }
  };

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#FDFBF7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{
            maxWidth: '440px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid #E8DBC5',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              fontSize: '28px'
            }}>
              ⚠️
            </div>

            <span style={{ fontSize: '11px', fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '2px', display: 'block', marginBottom: '8px' }}>
              Orchard Guard Alert
            </span>

            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#113824', margin: '0 0 12px 0' }}>
              System Standby
            </h1>

            <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              We encountered a temporary disruption while rendering the root application layout. Your account and reservations remain intact.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleReset}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  backgroundColor: '#113824',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Reload Orchards
              </button>
              <a
                href="/"
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                Storefront
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

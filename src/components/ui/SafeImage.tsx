'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

const ALLOWED_REMOTE_HOSTNAMES = new Set([
  'images.unsplash.com',
  'lh3.googleusercontent.com'
]);

const DEFAULT_FALLBACK = '/images/placeholder-mango.svg';

export interface SafeImageProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined;
  fallbackSrc?: string;
}

/**
 * SafeImage provides bulletproof image rendering for Al Usmani Orchards:
 * 1. Checks if src is valid (non-empty, local path or allowed remote hostname).
 * 2. If unwhitelisted remote host, gracefully renders via standard <img> or fallback without crashing Next.js.
 * 3. Catches network/load errors and falls back to /images/placeholder-mango.svg.
 * 4. Prevents infinite error loops if fallback itself fails.
 */
export default function SafeImage({
  src,
  alt = 'Al Usmani Orchards Mango Crate',
  fallbackSrc = DEFAULT_FALLBACK,
  onError,
  className,
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  // 1. If error occurred or src is missing/empty, use fallback
  const cleanSrc = typeof src === 'string' ? src.trim() : '';
  if (hasError || !cleanSrc) {
    return (
      <Image
        {...props}
        src={fallbackSrc}
        alt={alt}
        className={className}
        onError={() => {
          // If fallback itself fails, do not throw; maintain silent safety
        }}
      />
    );
  }

  // 2. Check if src is an external URL
  const isExternal = cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://');

  if (isExternal) {
    try {
      const parsedUrl = new URL(cleanSrc);
      const isWhitelisted = ALLOWED_REMOTE_HOSTNAMES.has(parsedUrl.hostname);

      if (!isWhitelisted) {
        // Unconfigured remote host: Use standard <img> with fallback to prevent Next.js Invalid src prop crash
        return (
          <img
            src={cleanSrc}
            alt={alt}
            className={className}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== fallbackSrc) {
                target.src = fallbackSrc;
              }
            }}
            style={
              props.fill
                ? { position: 'absolute', height: '100%', width: '100%', inset: 0, objectFit: 'cover' }
                : undefined
            }
          />
        );
      }
    } catch {
      // Invalid URL format
      return (
        <Image
          {...props}
          src={fallbackSrc}
          alt={alt}
          className={className}
        />
      );
    }
  }

  // 3. Permitted local or whitelisted remote image
  return (
    <Image
      {...props}
      src={cleanSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        setHasError(true);
        if (onError) onError(e);
      }}
    />
  );
}

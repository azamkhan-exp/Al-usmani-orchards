'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface FeaturesContextType {
  features: Record<string, boolean>;
  isEnabled: (key: string) => boolean;
  isFeatureEnabled: (key: string) => boolean;
  refreshFeatures: () => Promise<void>;
  loading: boolean;
}

const FeaturesContext = createContext<FeaturesContextType>({
  features: {},
  isEnabled: () => true,
  isFeatureEnabled: () => true,
  refreshFeatures: async () => {},
  loading: true
});

export function FeaturesProvider({ children }: { children: React.ReactNode }) {
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchFeatures = async () => {
    try {
      const res = await fetch('/api/features');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.features) {
          setFeatures(data.features);
        }
      }
    } catch (err) {
      console.warn('Failed to load client feature flags:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const isEnabled = (key: string): boolean => {
    // If flag is explicitly defined in map, return its boolean; default true for backwards compatibility
    if (key in features) {
      return features[key];
    }
    return true;
  };

  return (
    <FeaturesContext.Provider
      value={{
        features,
        isEnabled,
        isFeatureEnabled: isEnabled,
        refreshFeatures: fetchFeatures,
        loading
      }}
    >
      {children}
    </FeaturesContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeaturesContext);
}

export const useFeatures = useFeatureFlags;

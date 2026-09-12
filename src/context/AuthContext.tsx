'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { safeFetchJson } from '@/lib/api-client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  avatar_url?: string | null;
  status: string;
  email_verified?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authenticated: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await safeFetchJson<{ authenticated: boolean; user: AuthUser | null }>('/api/auth/me');
      if (data && data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err: any) {
      console.warn('[AUTH] Session status check:', err.message || err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await safeFetchJson('/api/auth/logout', { method: 'POST' });
    } catch (e: any) {
      console.warn('[AUTH] Logout call:', e.message || e);
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticated: Boolean(user),
        refreshUser,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

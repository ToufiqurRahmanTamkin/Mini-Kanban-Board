'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import * as apiRoutes from './api';
import {
  clearSession,
  getCachedUser,
  getToken,
  setCachedUser,
  setToken,
} from './auth-storage';
import type { AuthResponse, User } from '@/types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (name: string, email: string, password: string) => Promise<User>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!getToken()) {
        setStatus('unauthenticated');
        return;
      }

      setUser(getCachedUser());

      try {
        const profile = await apiRoutes.fetchProfile();
        if (cancelled) return;

        setUser(profile);
        setCachedUser(profile);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;

        clearSession();
        setUser(null);
        setStatus('unauthenticated');
      }
    }

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  const adopt = useCallback((response: AuthResponse): User => {
    setToken(response.accessToken);
    setCachedUser(response.user);
    setUser(response.user);
    setStatus('authenticated');
    return response.user;
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) =>
      adopt(await apiRoutes.login({ email, password })),
    [adopt],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) =>
      adopt(await apiRoutes.register({ name, email, password })),
    [adopt],
  );

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
    setStatus('unauthenticated');
    router.replace('/login');
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, signIn, signUp, signOut }),
    [user, status, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }

  return context;
}

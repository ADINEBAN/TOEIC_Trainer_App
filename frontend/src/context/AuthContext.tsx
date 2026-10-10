import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authService } from '@/src/services/auth.service';
import { isUnauthorized } from '@/src/services/api.client';
import {
  clearSession,
  getStoredUser,
  getToken,
  isOnboarded,
  setOnboarded as persistOnboarded,
  setStoredUser,
  setToken,
} from '@/src/services/storage';
import type { User } from '@/src/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  onboarded: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  markOnboarded: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboardedFlag] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const [storedUser, done] = await Promise.all([getStoredUser(), isOnboarded()]);
        setOnboardedFlag(done);
        if (token && storedUser) {
          setUser(JSON.parse(storedUser) as User);
          try {
            const fresh = await authService.me();
            setUser(fresh);
            await setStoredUser(JSON.stringify(fresh));
          } catch (error) {
            if (isUnauthorized(error)) {
              await clearSession();
              setUser(null);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    await setToken(res.token);
    await setStoredUser(JSON.stringify(res.user));
    setUser(res.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await authService.register(name, email, password);
    await setToken(res.token);
    await setStoredUser(JSON.stringify(res.user));
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const fresh = await authService.me();
    setUser(fresh);
    await setStoredUser(JSON.stringify(fresh));
  }, []);

  const markOnboarded = useCallback(async () => {
    await persistOnboarded();
    setOnboardedFlag(true);
  }, []);

  const value = useMemo(
    () => ({ user, loading, onboarded, login, register, logout, refreshUser, markOnboarded }),
    [user, loading, onboarded, login, register, logout, refreshUser, markOnboarded]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

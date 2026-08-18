import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '@/lib/supabase';
import { getLguSession, signOutLgu, type LguSession } from '@/services/lgu-auth-service';

type AuthContextValue = {
  session: LguSession | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LguSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await getLguSession();
      setSession(next);
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getLguSession()
      .then((next) => {
        if (!cancelled) setSession(next);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      refresh().catch(() => setSession(null));
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    await signOutLgu();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, loading, signOut, refresh }),
    [session, loading, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

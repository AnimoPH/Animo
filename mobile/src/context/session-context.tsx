import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { fetchMyProfile, signOut as signOutRequest } from '@/services/auth-service';
import { supabase } from '@/lib/supabase';
import type { Account, SessionStatus } from '@/types/auth';

/**
 * `hasRegisteredOnDevice` outlives sign-out — it only tells the landing
 * screen whether to route to `/login` (this device has an account) or
 * `/onboarding/role` (first run). Signing out never unsets it; only a fresh
 * install would.
 */
const HAS_REGISTERED_KEY = 'animo.hasRegisteredOnDevice';
const LAST_ACTIVE_KEY = 'animo.session.lastActiveAt';
const SESSION_IDLE_LIMIT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type SessionContextValue = {
  status: SessionStatus;
  account: Account | null;
  /** Whether this device has ever completed registration (survives sign-out). */
  hasRegisteredOnDevice: boolean;
  /** Re-fetch the profile and recompute status — call after login/registration. */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [account, setAccount] = useState<Account | null>(null);
  const [hasRegisteredOnDevice, setHasRegisteredOnDevice] = useState(false);
  // Avoids two overlapping hydrate() runs (mount + immediate AppState event).
  const hydrating = useRef(false);

  const hydrate = useCallback(async () => {
    if (hydrating.current) return;
    hydrating.current = true;
    try {
      const [registeredFlag, lastActiveRaw, { data: sessionData }] = await Promise.all([
        AsyncStorage.getItem(HAS_REGISTERED_KEY),
        AsyncStorage.getItem(LAST_ACTIVE_KEY),
        supabase.auth.getSession(),
      ]);
      setHasRegisteredOnDevice(registeredFlag === 'true');

      if (!sessionData.session) {
        setStatus('guest');
        setAccount(null);
        return;
      }

      const lastActiveAt = lastActiveRaw ? Number(lastActiveRaw) : null;
      if (lastActiveAt !== null && Date.now() - lastActiveAt > SESSION_IDLE_LIMIT_MS) {
        // Idle past the 30-day window — force a fresh login even though the
        // refresh token might still technically be valid.
        await signOutRequest().catch(() => {});
        await AsyncStorage.removeItem(LAST_ACTIVE_KEY);
        setStatus('guest');
        setAccount(null);
        return;
      }

      await AsyncStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));

      const profile = await fetchMyProfile();
      if (!profile) {
        setStatus('needs-profile');
        setAccount(null);
        return;
      }

      await AsyncStorage.setItem(HAS_REGISTERED_KEY, 'true');
      setHasRegisteredOnDevice(true);
      setAccount(profile);
      setStatus('authenticated');
    } catch {
      // Network hiccup or malformed session — fail safe to guest rather than
      // getting stuck on the splash screen.
      setStatus('guest');
      setAccount(null);
    } finally {
      hydrating.current = false;
    }
  }, []);

  useEffect(() => {
    hydrate();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      hydrate();
    });

    const appStateListener = AppState.addEventListener('change', (next) => {
      if (next === 'active') hydrate();
    });

    return () => {
      authListener.subscription.unsubscribe();
      appStateListener.remove();
    };
  }, [hydrate]);

  const signOut = useCallback(async () => {
    await signOutRequest();
    await AsyncStorage.removeItem(LAST_ACTIVE_KEY);
    setStatus('guest');
    setAccount(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{ status, account, hasRegisteredOnDevice, refresh: hydrate, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}

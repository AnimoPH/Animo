import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { useOutboxFlush } from '@/hooks/use-outbox-flush';
import { resolveSession, type ProfileCheck } from '@/lib/account-cache';
import { setSuspension } from '@/lib/suspension';
import { fetchMyProfile, signOut as signOutRequest } from '@/services/auth-service';
import { isRealTap, requestInbox } from '@/lib/notification-route';
import { supabase } from '@/lib/supabase';
import { clearPushToken, registerPushToken } from '@/services/push-registration';
import type { Account, SessionStatus } from '@/types/auth';

/**
 * `hasRegisteredOnDevice` outlives sign-out — it only tells the landing
 * screen whether to route to `/login` (this device has an account) or
 * `/onboarding/role` (first run). Signing out never unsets it; only a fresh
 * install would.
 */
const HAS_REGISTERED_KEY = 'animo.hasRegisteredOnDevice';
const LAST_ACTIVE_KEY = 'animo.session.lastActiveAt';
/** Last account the server confirmed, so a failed check does not read as signed out. */
const ACCOUNT_CACHE_KEY = 'animo.session.account';
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

async function readCachedAccount(): Promise<Account | null> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNT_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    return null;
  }
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [account, setAccount] = useState<Account | null>(null);
  const [hasRegisteredOnDevice, setHasRegisteredOnDevice] = useState(false);
  // Join overlapping hydrate() calls (sign-in fires onAuthStateChange while
  // the login screen also calls refresh()) instead of dropping the second one.
  const hydrateInFlight = useRef<Promise<void> | null>(null);

  const hydrate = useCallback(() => {
    if (hydrateInFlight.current) return hydrateInFlight.current;

    const run = (async () => {
      try {
        const [registeredFlag, lastActiveRaw, { data: sessionData, error: sessionError }] =
          await Promise.all([
            AsyncStorage.getItem(HAS_REGISTERED_KEY),
            AsyncStorage.getItem(LAST_ACTIVE_KEY),
            supabase.auth.getSession(),
          ]);
        setHasRegisteredOnDevice(registeredFlag === 'true');

        if (!sessionData.session) {
          // Opened offline with an expired token: the refresh could not reach the
          // server, which is not the same as being signed out.
          const cached = isAuthRetryableFetchError(sessionError) ? await readCachedAccount() : null;
          if (cached) {
            setAccount(cached);
            setStatus('authenticated');
            return;
          }
          await AsyncStorage.removeItem(ACCOUNT_CACHE_KEY);
          setStatus('guest');
          setAccount(null);
          return;
        }

        const lastActiveAt = lastActiveRaw ? Number(lastActiveRaw) : null;
        if (lastActiveAt !== null && Date.now() - lastActiveAt > SESSION_IDLE_LIMIT_MS) {
          // Idle past the 30-day window — force a fresh login even though the
          // refresh token might still technically be valid.
          if (sessionData.session.user?.id) await clearPushToken(sessionData.session.user.id);
          await signOutRequest().catch(() => {});
          await AsyncStorage.multiRemove([LAST_ACTIVE_KEY, ACCOUNT_CACHE_KEY]);
          setStatus('guest');
          setAccount(null);
          return;
        }

        await AsyncStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));

        let check: ProfileCheck;
        try {
          check = { kind: 'ok', account: await fetchMyProfile() };
        } catch {
          check = { kind: 'failed' };
        }
        const cached = check.kind === 'failed' ? await readCachedAccount() : null;
        const view = resolveSession(check, cached, sessionData.session.user.id);

        if (check.kind === 'ok' && check.account) {
          await AsyncStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify(check.account));
          await AsyncStorage.setItem(HAS_REGISTERED_KEY, 'true');
          setHasRegisteredOnDevice(true);
        }
        setAccount(view.account);
        setStatus(view.status);
      } catch {
        // Network hiccup or malformed session — fail safe to guest rather than
        // getting stuck on the splash screen.
        setStatus('guest');
        setAccount(null);
      } finally {
        hydrateInFlight.current = null;
      }
    })();

    hydrateInFlight.current = run;
    return run;
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

  // Error messages read this to say why an action was refused.
  useEffect(() => {
    setSuspension(account?.accountStatus === 'Suspended', account?.suspensionReason);
  }, [account?.accountStatus, account?.suspensionReason]);

  // Save the Expo push token once the account is signed in.
  const accountId = account?.id ?? null;
  useEffect(() => {
    if (status !== 'authenticated' || !accountId) return;
    registerPushToken(accountId);
  }, [status, accountId]);

  // Tapping a notification opens the in-app inbox for the signed-in role.
  const role = account?.role ?? null;
  const coldStartHandled = useRef(false);
  useEffect(() => {
    if (!role || Platform.OS === 'web') return;
    const inbox = role === 'magsasaka' ? '/(farmer)/notipikasyon' : '/(buyer)/notipikasyon';
    const openInbox = (response: Notifications.NotificationResponse) => {
      // Android keeps returning the last tapped notification on every later start,
      // so clear it once it is handled.
      Notifications.clearLastNotificationResponse();
      if (!isRealTap(response.notification.request.identifier)) return;
      const tapId = `${response.notification.request.identifier}:${response.notification.date}`;
      requestInbox(tapId, () => router.push(inbox));
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(openInbox);
    if (!coldStartHandled.current) {
      coldStartHandled.current = true;
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) openInbox(response);
      });
    }
    return () => subscription.remove();
  }, [role]);

  useOutboxFlush(status === 'authenticated' ? (account?.id ?? null) : null);

  const signOut = useCallback(async () => {
    if (account) await clearPushToken(account.id);
    await signOutRequest();
    await AsyncStorage.multiRemove([LAST_ACTIVE_KEY, ACCOUNT_CACHE_KEY]);
    setStatus('guest');
    setAccount(null);
  }, [account]);

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

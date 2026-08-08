import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { RoleId } from '@/constants/roles';

/**
 * Tracks first-run registration state and the chosen role.
 *
 * Frontend-only for now: persisted in AsyncStorage. When the backend lands,
 * this is where a real session check goes. The registration screen shows only
 * on first run; returning users see login instead. The stored role decides
 * which module (buyer vs. farmer) the user enters.
 */
const REGISTERED_KEY = 'animo.hasRegistered';
const ROLE_KEY = 'animo.role';

export type OnboardingState = {
  /** null while still reading from storage. */
  hasRegistered: boolean | null;
  /** Selected role, or null if none stored / still loading. */
  role: RoleId | null;
  /** Mark registration complete and store the chosen role. */
  completeRegistration: (role: RoleId) => Promise<void>;
  /** Testing helper: wipe stored state so the first-run flow shows again. */
  reset: () => Promise<void>;
};

export function useOnboarding(): OnboardingState {
  const [hasRegistered, setHasRegistered] = useState<boolean | null>(null);
  const [role, setRole] = useState<RoleId | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(REGISTERED_KEY), AsyncStorage.getItem(ROLE_KEY)])
      .then(([registered, storedRole]) => {
        if (!active) return;
        setHasRegistered(registered === 'true');
        setRole((storedRole as RoleId | null) ?? null);
      })
      .catch(() => {
        if (active) setHasRegistered(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const completeRegistration = useCallback(async (nextRole: RoleId) => {
    await AsyncStorage.multiSet([
      [REGISTERED_KEY, 'true'],
      [ROLE_KEY, nextRole],
    ]);
    setHasRegistered(true);
    setRole(nextRole);
  }, []);

  const reset = useCallback(async () => {
    await AsyncStorage.multiRemove([REGISTERED_KEY, ROLE_KEY]);
    setHasRegistered(false);
    setRole(null);
  }, []);

  return { hasRegistered, role, completeRegistration, reset };
}

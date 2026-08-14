import { createClient } from '@supabase/supabase-js';

import { secureSessionStorage } from '@/lib/secure-session-storage';

/**
 * Supabase client for the mobile app.
 *
 * Session (JWT + refresh token) persists via `secureSessionStorage` — an
 * AES-256-encrypted AsyncStorage wrapper keyed by a SecureStore-held key
 * (see `secure-session-storage.ts`). Plain AsyncStorage was used previously;
 * that left the refresh token recoverable in plaintext by anything with
 * filesystem access to the app sandbox. Requires a real Supabase project —
 * see `.env.example`.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env and fill in your Supabase project credentials.',
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: secureSessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

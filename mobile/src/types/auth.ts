import type { RoleId } from '@/constants/roles';

/**
 * Account shape, joined from `user` (ANIMO Data Dictionary §1 USER) plus the
 * caller's role extension row (§1a FARMER or §1b BUYER) — see
 * supabase/migrations/0003_full_data_dictionary_schema.sql. The DB stores
 * role as 'Farmer'/'Buyer'/'LGU_Official' (the dictionary's spelling); this
 * client only ever deals in 'magsasaka'/'mamimili' — the translation lives
 * in `auth-service.ts`.
 *
 * Fields the dictionary doesn't define on USER/FARMER/BUYER (age, gender,
 * farm experience/household/storm-damage, business name) are intentionally
 * not modeled here — see the registration Edge Function for what's actually
 * persisted. `lgu_verified` was dropped from the schema entirely (Aug 2026)
 * — it isn't a dictionary field; see the Data Dictionary's Open Items re:
 * the LGU-verified badge, which remains unsettled.
 */
export type Account = {
  id: string; // auth.users.id / user.user_id
  role: RoleId;
  fullName: string;
  /** From `contact_number` — the phone verified at registration. */
  phone: string;
  /** Farmer-only per the dictionary; always null for buyers. */
  barangay: string | null;
  gcashNumber: string | null;
  walletAddress: string | null;
  accountStatus: 'Active' | 'Suspended';
  /** ISO date (not datetime) — matches the dictionary's `date_registered`. */
  dateRegistered: string;
};

/**
 * Registration payload sent to the `complete-registration` Edge Function.
 * `barangay` is required when `role` is `magsasaka`, omitted for `mamimili`.
 */
export type CompleteRegistrationInput = {
  role: RoleId;
  fullName: string;
  barangay?: string;
};

/**
 * `SessionProvider` status:
 * - `loading` — still hydrating the Supabase session from storage.
 * - `guest` — no active session (never registered, signed out, or expired).
 * - `needs-profile` — phone verified with Supabase Auth, but no `user`
 *   row yet (registration was interrupted after OTP but before profile submit).
 * - `authenticated` — session valid and profile loaded.
 */
export type SessionStatus = 'loading' | 'guest' | 'needs-profile' | 'authenticated';

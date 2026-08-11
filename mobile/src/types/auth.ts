import type { Gender, YesNo } from '@/components/animo/profile-form';
import type { RoleId } from '@/constants/roles';

/**
 * Server-side account shape, mirrored from the `profiles` / `farmer_profiles`
 * / `buyer_profiles` tables (see `supabase/migrations/0001_init_auth.sql`).
 * The client only ever reads these — all writes happen inside the
 * `complete-registration` Edge Function under the service role.
 */
export type BaseProfile = {
  id: string; // auth.users.id
  role: RoleId;
  fullName: string;
  /** From auth.users.phone (Supabase Auth), not stored redundantly in `profiles`. */
  phone: string;
  walletAddress: string;
  roleLockedAt: string; // ISO timestamp — role is immutable from this point on
  createdAt: string;
};

export type FarmerProfile = BaseProfile & {
  role: 'magsasaka';
  age: string;
  gender: Gender;
  municipality: string;
  barangay: string;
  farmSize: string;
  experience: string;
  household: string;
  stormDamage: YesNo;
};

export type BuyerProfile = BaseProfile & {
  role: 'mamimili';
  age: string;
  gender: Gender;
  businessName: string;
};

export type Account = FarmerProfile | BuyerProfile;

/**
 * Registration payload sent to the `complete-registration` Edge Function.
 * Shape matches `ProfileValues` from the registration form, plus the role
 * chosen on the "Sino ka?" screen.
 */
export type CompleteRegistrationInput = {
  role: RoleId;
  fullName: string;
  age: string;
  gender: Gender;
  // Farmer-only fields — omitted for buyers.
  municipality?: string;
  barangay?: string;
  farmSize?: string;
  experience?: string;
  household?: string;
  stormDamage?: YesNo;
  // Buyer-only field — omitted for farmers.
  businessName?: string;
};

/**
 * `SessionProvider` status:
 * - `loading` — still hydrating the Supabase session from storage.
 * - `guest` — no active session (never registered, signed out, or expired).
 * - `needs-profile` — phone verified with Supabase Auth, but no `profiles`
 *   row yet (registration was interrupted after OTP but before profile submit).
 * - `authenticated` — session valid and profile loaded.
 */
export type SessionStatus = 'loading' | 'guest' | 'needs-profile' | 'authenticated';

import { supabase } from '@/lib/supabase';
import type { Account, CompleteRegistrationInput } from '@/types/auth';

/**
 * Auth + registration service — thin wrapper over Supabase Auth (phone OTP)
 * and the `complete-registration` Edge Function. This is the only file that
 * talks to Supabase directly for auth; screens go through here so the
 * request/response shape stays in one place.
 */

/** "9171234567" / "+639171234567" / "09171234567" → "+639171234567". */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  const local = digits.startsWith('63')
    ? digits.slice(2)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  return `+63${local}`;
}

export type SendOtpOptions = {
  /**
   * Registration allows Supabase to create the `auth.users` row on first
   * verify. Login must NOT — otherwise any unregistered number would silently
   * get an account instead of surfacing "not registered".
   */
  isRegistration: boolean;
};

export async function sendOtp(phone: string, { isRegistration }: SendOtpOptions) {
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizePhone(phone),
    options: { shouldCreateUser: isRegistration },
  });
  if (error) throw error;
}

export async function verifyOtp(phone: string, code: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizePhone(phone),
    token: code,
    type: 'sms',
  });
  if (error) throw error;
  return data.session;
}

type ProfileRow = {
  id: string;
  role: Account['role'];
  full_name: string;
  wallet_address: string;
  role_locked_at: string;
  created_at: string;
  farmer_profiles: {
    age: string;
    gender: 'lalaki' | 'babae';
    municipality: string;
    barangay: string;
    farm_size: string;
    experience_years: string;
    household_size: string;
    storm_damage: boolean;
  } | null;
  buyer_profiles: {
    age: string;
    gender: 'lalaki' | 'babae';
    business_name: string;
  } | null;
};

function mapProfileRow(row: ProfileRow, phone: string): Account {
  const base = {
    id: row.id,
    fullName: row.full_name,
    phone,
    walletAddress: row.wallet_address,
    roleLockedAt: row.role_locked_at,
    createdAt: row.created_at,
  };

  if (row.role === 'magsasaka') {
    const farmer = row.farmer_profiles;
    return {
      ...base,
      role: 'magsasaka',
      age: farmer?.age ?? '',
      gender: farmer?.gender ?? 'lalaki',
      municipality: farmer?.municipality ?? '',
      barangay: farmer?.barangay ?? '',
      farmSize: farmer?.farm_size ?? '',
      experience: farmer?.experience_years ?? '',
      household: farmer?.household_size ?? '',
      stormDamage: farmer?.storm_damage ? 'oo' : 'hindi',
    };
  }

  const buyer = row.buyer_profiles;
  return {
    ...base,
    role: 'mamimili',
    age: buyer?.age ?? '',
    gender: buyer?.gender ?? 'lalaki',
    businessName: buyer?.business_name ?? '',
  };
}

/** Returns the caller's profile, or `null` if they've verified OTP but haven't finished registration yet. */
export async function fetchMyProfile(): Promise<Account | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*, farmer_profiles(*), buyer_profiles(*)')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapProfileRow(data as ProfileRow, user.phone ?? '');
}

/**
 * Calls the `complete-registration` Edge Function, which — under the service
 * role — creates the `profiles`/`farmer_profiles`|`buyer_profiles` row and
 * generates the custodial Polygon wallet server-side. Rejects if the caller
 * already has a profile (role lock).
 */
export async function completeRegistration(input: CompleteRegistrationInput): Promise<Account> {
  const { error } = await supabase.functions.invoke('complete-registration', {
    body: input,
  });
  if (error) throw error;
  return await fetchMyProfileOrThrow();
}

async function fetchMyProfileOrThrow(): Promise<Account> {
  const profile = await fetchMyProfile();
  if (!profile) throw new Error('Registration completed but profile could not be loaded.');
  return profile;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

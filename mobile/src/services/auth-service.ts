import { supabase } from '@/lib/supabase';
import type { RoleId } from '@/constants/roles';
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

/** DB spells role per the data dictionary; the app only ever knows magsasaka/mamimili. */
type DbRole = 'Farmer' | 'Buyer' | 'LGU_Official';
const DB_ROLE_TO_APP: Partial<Record<DbRole, RoleId>> = {
  Farmer: 'magsasaka',
  Buyer: 'mamimili',
};

type UserRow = {
  user_id: string;
  role: DbRole;
  full_name: string;
  contact_number: string;
  account_status: 'Active' | 'Suspended';
  date_registered: string;
};

/** Farmer/buyer extension row (§1a/§1b) — wallet_address is null until registration wires up Alchemy. */
type ExtensionRow = {
  wallet_address: string | null;
  gcash_number: string | null;
  barangay?: string | null;
};

function mapAccount(user: UserRow, extension: ExtensionRow | null): Account {
  const role = DB_ROLE_TO_APP[user.role];
  if (!role) {
    // This mobile client never creates or expects LGU_Official rows — the
    // web dashboard for that role is a separate, unbuilt system.
    throw new Error(`Unsupported role for mobile client: ${user.role}`);
  }

  return {
    id: user.user_id,
    role,
    fullName: user.full_name,
    phone: user.contact_number,
    barangay: extension?.barangay ?? null,
    gcashNumber: extension?.gcash_number ?? null,
    walletAddress: extension?.wallet_address ?? null,
    accountStatus: user.account_status,
    dateRegistered: user.date_registered,
  };
}

/** Returns the caller's account, or `null` if they've verified OTP but haven't finished registration yet. */
export async function fetchMyProfile(): Promise<Account | null> {
  const { data: userData } = await supabase.auth.getUser();
  const authUser = userData.user;
  if (!authUser) return null;

  const { data: user, error } = await supabase
    .from('user')
    .select('user_id, role, full_name, contact_number, account_status, date_registered')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (error) throw error;
  if (!user) return null;

  const row = user as UserRow;
  const extensionTable = row.role === 'Farmer' ? 'farmer' : row.role === 'Buyer' ? 'buyer' : null;
  if (!extensionTable) return mapAccount(row, null);

  const columns =
    extensionTable === 'farmer'
      ? 'wallet_address, gcash_number, barangay'
      : 'wallet_address, gcash_number';
  const { data: extension, error: extensionError } = await supabase
    .from(extensionTable)
    .select(columns)
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (extensionError) throw extensionError;
  return mapAccount(row, extension as ExtensionRow | null);
}

/**
 * Calls the `complete-registration` Edge Function, which — under the service
 * role — creates the `user` row + role extension row and generates the
 * custodial Polygon wallet server-side. Rejects if the caller is already
 * registered (role lock).
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

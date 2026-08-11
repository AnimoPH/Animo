// Supabase Edge Function (Deno). Deploy with:
//   supabase secrets set WALLET_ENCRYPTION_KEY=<base64 32-byte key>
//   supabase functions deploy complete-registration
//
// Creates the profile row + custodial Polygon wallet for a newly
// phone-verified user. Runs under the service role, which is the only way
// anything ever gets written to `profiles` / `farmer_profiles` /
// `buyer_profiles` / `wallets` — the client has no direct insert access.
// The private key never leaves this function unencrypted, and never goes
// back to the client at all — only the wallet address does.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'https://esm.sh/ethers@6';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RegistrationInput = {
  role: 'magsasaka' | 'mamimili';
  fullName: string;
  age: string;
  gender: 'lalaki' | 'babae';
  municipality?: string;
  barangay?: string;
  farmSize?: string;
  experience?: string;
  household?: string;
  stormDamage?: 'oo' | 'hindi';
  businessName?: string;
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function validateInput(input: Partial<RegistrationInput>): string | null {
  if (input.role !== 'magsasaka' && input.role !== 'mamimili') return 'role must be magsasaka or mamimili';
  if (!input.fullName?.trim()) return 'fullName is required';
  if (!input.age?.trim()) return 'age is required';
  if (input.gender !== 'lalaki' && input.gender !== 'babae') return 'gender must be lalaki or babae';

  if (input.role === 'magsasaka') {
    if (!input.municipality || !input.barangay || !input.farmSize || !input.experience || !input.household) {
      return 'municipality, barangay, farmSize, experience, and household are required for magsasaka';
    }
    if (input.stormDamage !== 'oo' && input.stormDamage !== 'hindi') return 'stormDamage must be oo or hindi';
  } else if (!input.businessName?.trim()) {
    return 'businessName is required for mamimili';
  }

  return null;
}

/** AES-GCM encrypt with the WALLET_ENCRYPTION_KEY secret. Returns "iv:ciphertext", both base64. */
async function encryptPrivateKey(privateKey: string): Promise<string> {
  const rawKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
  if (!rawKey) throw new Error('WALLET_ENCRYPTION_KEY secret is not set');

  const keyBytes = Uint8Array.from(atob(rawKey), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    new TextEncoder().encode(privateKey),
  );

  return `${btoa(String.fromCharCode(...iv))}:${btoa(String.fromCharCode(...new Uint8Array(ciphertext)))}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'missing Authorization header' }, 401);

  // Caller-scoped client — only used to resolve who's calling, via their JWT.
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: 'invalid session' }, 401);
  const userId = userData.user.id;

  let input: Partial<RegistrationInput>;
  try {
    input = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400);
  }

  const validationError = validateInput(input);
  if (validationError) return jsonResponse({ error: validationError }, 400);
  const payload = input as RegistrationInput;

  // Service-role client — the only thing in this system allowed to write to
  // profiles/farmer_profiles/buyer_profiles/wallets.
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Role lock: registration is a one-time action per account.
  const { data: existing } = await adminClient
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (existing) return jsonResponse({ error: 'profile already exists — role is locked' }, 409);

  const wallet = ethers.Wallet.createRandom();
  const encryptedPrivateKey = await encryptPrivateKey(wallet.privateKey);

  const { error: profileError } = await adminClient.from('profiles').insert({
    id: userId,
    role: payload.role,
    full_name: payload.fullName,
    wallet_address: wallet.address,
  });
  if (profileError) return jsonResponse({ error: profileError.message }, 500);

  const roleTableInsert =
    payload.role === 'magsasaka'
      ? adminClient.from('farmer_profiles').insert({
          profile_id: userId,
          age: payload.age,
          gender: payload.gender,
          municipality: payload.municipality,
          barangay: payload.barangay,
          farm_size: payload.farmSize,
          experience_years: payload.experience,
          household_size: payload.household,
          storm_damage: payload.stormDamage === 'oo',
        })
      : adminClient.from('buyer_profiles').insert({
          profile_id: userId,
          age: payload.age,
          gender: payload.gender,
          business_name: payload.businessName,
        });

  const { error: roleTableError } = await roleTableInsert;
  if (roleTableError) {
    await adminClient.from('profiles').delete().eq('id', userId);
    return jsonResponse({ error: roleTableError.message }, 500);
  }

  const { error: walletError } = await adminClient.from('wallets').insert({
    profile_id: userId,
    address: wallet.address,
    encrypted_private_key: encryptedPrivateKey,
    chain: 'polygon-amoy',
  });
  if (walletError) {
    // Cascades to farmer_profiles/buyer_profiles via FK on delete cascade.
    await adminClient.from('profiles').delete().eq('id', userId);
    return jsonResponse({ error: walletError.message }, 500);
  }

  return jsonResponse({ walletAddress: wallet.address }, 200);
});

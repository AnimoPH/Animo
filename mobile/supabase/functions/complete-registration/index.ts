// Supabase Edge Function (Deno). Deploy with:
//   supabase functions deploy complete-registration
//
// Creates the base "user" row plus the role-specific extension row (farmer or
// buyer) for a newly phone-verified user, and a custodial Polygon wallet.
// Runs under the service role, which is the only way anything ever gets
// written to these tables — the client has no direct insert access.
//
// Table names are copied literally from the ANIMO Data Dictionary (see
// supabase/migrations/0001_full_data_dictionary_schema.sql): "user" (§1),
// "farmer" (§1a), "buyer" (§1b). This client only ever creates 'Farmer' or
// 'Buyer' rows, translated from the app's 'magsasaka'/'mamimili' RoleId.
//
// Wallet: the private key is generated here but never stored in a farmer/
// buyer column — the dictionary defines neither, and that's the whole reason
// the old encrypted_private_key/chain columns got dropped. It's stored in
// Supabase Vault instead (see migration 0002_wallet_vault_functions.sql —
// public.create_wallet_secret, callable only by service_role) and never
// returned to the client; only wallet_address is. Retrieval
// (public.get_wallet_private_key) is unused today — wired in whenever this
// app actually needs to sign a transaction, or replaced outright once
// custody moves to Alchemy.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'https://esm.sh/ethers@6';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AppRole = 'magsasaka' | 'mamimili';
type DbRole = 'Farmer' | 'Buyer';

const APP_ROLE_TO_DB: Record<AppRole, DbRole> = {
  magsasaka: 'Farmer',
  mamimili: 'Buyer',
};

type RegistrationInput = {
  role: AppRole;
  fullName: string;
  /** Required when role is magsasaka (farmer-only per the data dictionary). */
  barangay?: string;
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function validateInput(input: Partial<RegistrationInput>): string | null {
  if (input.role !== 'magsasaka' && input.role !== 'mamimili') {
    return 'role must be magsasaka or mamimili';
  }
  if (!input.fullName?.trim()) return 'fullName is required';
  if (input.role === 'magsasaka' && !input.barangay?.trim()) {
    return 'barangay is required for magsasaka';
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'missing Authorization header' }, 401);

  // Caller-scoped client — only used to resolve who's calling (and their
  // already-verified phone number), via their JWT.
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: 'invalid session' }, 401);
  const userId = userData.user.id;
  const phone = userData.user.phone;
  if (!phone) return jsonResponse({ error: 'caller has no verified phone number' }, 400);

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
  // user/farmer/buyer, and the only role with EXECUTE on the Vault wrapper
  // functions below.
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Role lock: registration is a one-time action per account.
  const { data: existing } = await adminClient
    .from('user')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return jsonResponse({ error: 'user already exists — role is locked' }, 409);

  const dbRole = APP_ROLE_TO_DB[payload.role];
  const wallet = ethers.Wallet.createRandom();

  const { error: secretError } = await adminClient.rpc('create_wallet_secret', {
    p_user_id: userId,
    p_private_key: wallet.privateKey,
  });
  if (secretError) return jsonResponse({ error: secretError.message }, 500);

  const { error: insertError } = await adminClient.from('user').insert({
    user_id: userId,
    role: dbRole,
    full_name: payload.fullName,
    contact_number: phone,
  });
  if (insertError) {
    await adminClient.rpc('delete_wallet_secret', { p_user_id: userId });
    return jsonResponse({ error: insertError.message }, 500);
  }

  // Extension row (§1a FARMER / §1b BUYER) — wallet_address is the only
  // dictionary field involved; the private key lives in Vault, not here.
  const extensionTable = payload.role === 'magsasaka' ? 'farmer' : 'buyer';
  const extensionRow: Record<string, unknown> = { user_id: userId, wallet_address: wallet.address };
  if (payload.role === 'magsasaka') {
    extensionRow.barangay = payload.barangay;
  }

  const { error: extensionError } = await adminClient.from(extensionTable).insert(extensionRow);
  if (extensionError) {
    await adminClient.from('user').delete().eq('user_id', userId);
    await adminClient.rpc('delete_wallet_secret', { p_user_id: userId });
    return jsonResponse({ error: extensionError.message }, 500);
  }

  return jsonResponse({ walletAddress: wallet.address }, 200);
});

// Supabase Edge Function (Deno). Deploy with:
//   supabase functions deploy verify-otp
//
// Security fix: OTP verify had no attempt cap anywhere in this codebase.
// Adds a server-enforced lockout after repeated failures (see migration
// 0005_otp_abuse_guard.sql).
//
// Returns raw session tokens on success — the client must call
// supabase.auth.setSession() itself to persist them (see auth-service.ts).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN');
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  ...(ALLOWED_ORIGIN ? { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN } : {}),
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/** "9171234567" / "+639171234567" / "09171234567" → "+639171234567". Mirrors auth-service.ts. */
function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  const local = digits.startsWith('63') ? digits.slice(2) : digits.startsWith('0') ? digits.slice(1) : digits;
  return `+63${local}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  let body: { phone?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400);
  }
  if (!body.phone || !body.code) {
    return jsonResponse({ error: 'phone and code are required' }, 400);
  }
  const phone = normalizePhone(body.phone);

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = Date.now();
  const { data: guard } = await adminClient
    .from('otp_guard')
    .select('fail_count, locked_until')
    .eq('phone', phone)
    .maybeSingle();

  if (guard?.locked_until && new Date(guard.locked_until).getTime() > now) {
    return jsonResponse({ error: 'Sobrang dami ng maling subok. Sandaling maghintay bago muling subukan.' }, 429);
  }

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { data, error } = await callerClient.auth.verifyOtp({
    phone,
    token: body.code,
    type: 'sms',
  });

  if (error) {
    const failCount = (guard?.fail_count ?? 0) + 1;
    const locked = failCount >= MAX_FAILED_ATTEMPTS;
    const { error: guardError } = await adminClient.from('otp_guard').upsert({
      phone,
      fail_count: locked ? 0 : failCount,
      locked_until: locked ? new Date(now + LOCKOUT_MS).toISOString() : null,
    });
    if (guardError) {
      console.error('[verify-otp] otp_guard upsert failed', guardError.message);
    }
    console.error('[verify-otp] verifyOtp failed', error.message);
    return jsonResponse({ error: error.message }, error.status ?? 400);
  }

  const { error: resetError } = await adminClient
    .from('otp_guard')
    .update({ fail_count: 0, locked_until: null })
    .eq('phone', phone);
  if (resetError) {
    console.error('[verify-otp] otp_guard reset failed', resetError.message);
  }

  return jsonResponse({ session: data.session }, 200);
});

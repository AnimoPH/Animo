// Supabase Edge Function (Deno). Deploy with:
//   supabase functions deploy send-otp
//
// Security fix: the client used to call signInWithOtp directly with only a
// client-side cooldown timer — easy to bypass with the public anon key.
// This function enforces a real per-phone cooldown and daily cap (see
// migration 0005_otp_abuse_guard.sql) before reaching Supabase Auth.
// Login's "not registered" error is forwarded as-is — that's an
// intentional product decision, not something this function should mask.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN');
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  ...(ALLOWED_ORIGIN ? { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN } : {}),
};

const RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_SENDS_PER_WINDOW = 10;
const WINDOW_MS = 24 * 60 * 60 * 1000;

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

  let body: { phone?: string; isRegistration?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400);
  }

  if (!body.phone || body.phone.replace(/\D/g, '').length < 10) {
    return jsonResponse({ error: 'invalid phone number' }, 400);
  }
  const phone = normalizePhone(body.phone);
  const isRegistration = body.isRegistration === true;

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = Date.now();
  const { data: guard } = await adminClient
    .from('otp_guard')
    .select('last_sent_at, send_count_in_window, window_started_at, locked_until')
    .eq('phone', phone)
    .maybeSingle();

  if (guard?.locked_until && new Date(guard.locked_until).getTime() > now) {
    return jsonResponse({ error: 'Sobrang dami ng subok. Sandaling maghintay bago muling humiling.' }, 429);
  }

  if (guard?.last_sent_at && now - new Date(guard.last_sent_at).getTime() < RESEND_COOLDOWN_MS) {
    return jsonResponse({ error: 'Maghintay muna bago humiling ng bagong code.' }, 429);
  }

  const windowStartedAt = guard?.window_started_at ? new Date(guard.window_started_at).getTime() : now;
  const windowExpired = now - windowStartedAt > WINDOW_MS;
  const sendCount = windowExpired ? 0 : guard?.send_count_in_window ?? 0;
  if (sendCount >= MAX_SENDS_PER_WINDOW) {
    return jsonResponse({ error: 'Umabot na sa pinakamataas na bilang ng subok ngayong araw.' }, 429);
  }

  // Same signInWithOtp call the client used to make directly.
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { error } = await callerClient.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: isRegistration },
  });

  const { error: guardError } = await adminClient.from('otp_guard').upsert({
    phone,
    last_sent_at: new Date(now).toISOString(),
    send_count_in_window: sendCount + 1,
    window_started_at: new Date(windowExpired ? now : windowStartedAt).toISOString(),
  });
  if (guardError) {
    // Fail open — never block a real signup/login over a throttle-table error.
    console.error('[send-otp] otp_guard upsert failed', guardError.message);
  }

  if (error) {
    // Forwarded as-is — the intentional "not registered" signal login relies on.
    console.error('[send-otp] signInWithOtp failed', error.message);
    return jsonResponse({ error: error.message }, error.status ?? 400);
  }

  return jsonResponse({ ok: true }, 200);
});

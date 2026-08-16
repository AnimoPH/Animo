// Supabase Edge Function (Deno). Deploy with:
//   supabase functions deploy refresh-dry-base
//
// Service-role only. Caches the monthly dry nowcast on
// marketpricefeed.dry_base_price_per_kg so listing create can keep using
// croplisting_lock_price (it reads that column; the client never submits a
// price). Callers: sync-psa-prices after a successful history upsert, and
// the nfa_intervention_window statement trigger in migration 0012.
//
// Not invoked from get-price-prediction — that function stays a read of
// FastAPI. On any failure this keeps the previous dry_base (0007's ₱18.83
// until the first successful write) and does not blank the row.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REQUIRED_MONTHS = 12;
const PROVINCE = 'Rizal';

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

type PriceRow = { price_month: string; price_per_kg: number };
type NfaWindowRow = { start_date: string; end_date: string | null };

function nextMonth(dateStr: string): string {
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function isNfaActive(targetDate: string, windows: NfaWindowRow[]): boolean {
  const t = new Date(`${targetDate}T00:00:00Z`).getTime();
  return windows.some((w) => {
    const start = new Date(`${w.start_date}T00:00:00Z`).getTime();
    const end = w.end_date ? new Date(`${w.end_date}T00:00:00Z`).getTime() : Infinity;
    return t >= start && t <= end;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'missing Authorization header' }, 401);

  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (bearerToken !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    return jsonResponse({ error: 'service role required' }, 403);
  }

  const pricingServiceUrl = Deno.env.get('PRICING_SERVICE_URL');
  if (!pricingServiceUrl) {
    console.error('refresh-dry-base: PRICING_SERVICE_URL is not configured; keeping previous dry_base');
    return jsonResponse({ error: 'PRICING_SERVICE_URL is not configured' }, 500);
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: rows, error: queryError } = await adminClient
    .from('palay_price_history')
    .select('price_month, price_per_kg')
    .eq('province', PROVINCE)
    .order('price_month', { ascending: false })
    .limit(REQUIRED_MONTHS);

  if (queryError) {
    console.error('refresh-dry-base: history query failed; keeping previous dry_base', queryError.message);
    return jsonResponse({ error: queryError.message }, 500);
  }

  const priceRows = (rows ?? []) as PriceRow[];
  if (priceRows.length < REQUIRED_MONTHS) {
    console.error(
      `refresh-dry-base: need ${REQUIRED_MONTHS} months, have ${priceRows.length}; keeping previous dry_base`,
    );
    return jsonResponse(
      {
        error: `insufficient price history: need ${REQUIRED_MONTHS} months, have ${priceRows.length}`,
      },
      409,
    );
  }

  const oldestFirst = [...priceRows].reverse();
  const lastPrices = oldestFirst.map((r) => r.price_per_kg);
  const latestMonth = oldestFirst[oldestFirst.length - 1].price_month;
  const targetDate = nextMonth(latestMonth);
  const targetMonth = new Date(`${targetDate}T00:00:00Z`).getUTCMonth() + 1;

  const { data: nfaWindows, error: nfaError } = await adminClient
    .from('nfa_intervention_window')
    .select('start_date, end_date');
  if (nfaError) {
    console.error('refresh-dry-base: NFA window query failed; keeping previous dry_base', nfaError.message);
    return jsonResponse({ error: nfaError.message }, 500);
  }
  const nfaActive = isNfaActive(targetDate, (nfaWindows ?? []) as NfaWindowRow[]);

  let pricingBody: { estimated_price?: unknown };
  try {
    const pricingResponse = await fetch(`${pricingServiceUrl}/predict-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        last_prices: lastPrices,
        target_month: targetMonth,
        target_date: targetDate,
        nfa_active: nfaActive,
      }),
    });
    pricingBody = await pricingResponse.json();
    if (!pricingResponse.ok) {
      console.error('refresh-dry-base: pricing_service failed; keeping previous dry_base', pricingBody);
      return jsonResponse({ error: 'pricing_service request failed', detail: pricingBody }, 502);
    }
  } catch (err) {
    console.error('refresh-dry-base: pricing_service unreachable; keeping previous dry_base', err);
    return jsonResponse({ error: 'pricing_service unreachable' }, 502);
  }

  const estimatedPrice = Number(pricingBody.estimated_price);
  if (!Number.isFinite(estimatedPrice)) {
    console.error('refresh-dry-base: invalid estimated_price; keeping previous dry_base', pricingBody);
    return jsonResponse({ error: 'pricing_service returned no estimated_price' }, 502);
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: latest, error: latestError } = await adminClient
    .from('marketpricefeed')
    .select('feed_id')
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) {
    console.error('refresh-dry-base: marketpricefeed read failed; keeping previous dry_base', latestError.message);
    return jsonResponse({ error: latestError.message }, 500);
  }

  if (latest) {
    const { error: updateError } = await adminClient
      .from('marketpricefeed')
      .update({ dry_base_price_per_kg: estimatedPrice, effective_date: today })
      .eq('feed_id', latest.feed_id);
    if (updateError) {
      console.error('refresh-dry-base: dry_base update failed; keeping previous dry_base', updateError.message);
      return jsonResponse({ error: updateError.message }, 500);
    }
  } else {
    const { error: insertError } = await adminClient
      .from('marketpricefeed')
      .insert({ dry_base_price_per_kg: estimatedPrice, effective_date: today });
    if (insertError) {
      console.error('refresh-dry-base: dry_base insert failed; keeping previous dry_base', insertError.message);
      return jsonResponse({ error: insertError.message }, 500);
    }
  }

  return jsonResponse(
    { dry_base_price_per_kg: estimatedPrice, effective_date: today, nfa_active: nfaActive },
    200,
  );
});

// Supabase Edge Function (Deno). Deploy with:
//   supabase functions deploy get-market-status
//
// Same data-fetch logic as get-price-prediction, but calls pricing_service's
// POST /market-status instead of /predict-price. This is the LGU dashboard's
// platform-wide "is the market weird right now" signal — not tied to a
// specific listing, and not something the mobile app itself calls.
//
// pricing_service itself is deliberately kept Supabase-unaware — this
// function is where the two systems meet, not main.py.

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

/** Adds one calendar month to a YYYY-MM-DD date string, returned the same way. */
function nextMonth(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/** True if targetDate falls within any NFA intervention window (end_date null = ongoing). */
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
  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({ error: 'method not allowed' }, 405);
  }

  const pricingServiceUrl = Deno.env.get('PRICING_SERVICE_URL');
  if (!pricingServiceUrl) {
    return jsonResponse({ error: 'PRICING_SERVICE_URL is not configured' }, 500);
  }

  // Read-only, and the table is publicly selectable (RLS: "Anyone can view
  // price history"), so the service-role client here is just for simplicity,
  // not for bypassing any restriction.
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

  if (queryError) return jsonResponse({ error: queryError.message }, 500);

  const priceRows = (rows ?? []) as PriceRow[];
  if (priceRows.length < REQUIRED_MONTHS) {
    return jsonResponse(
      {
        error: `insufficient price history: need ${REQUIRED_MONTHS} months, have ${priceRows.length}`,
      },
      409,
    );
  }

  // priceRows is newest-first (query order); pricing_service expects
  // oldest-first.
  const oldestFirst = [...priceRows].reverse();
  const lastPrices = oldestFirst.map((r) => r.price_per_kg);
  const latestMonth = oldestFirst[oldestFirst.length - 1].price_month;
  const targetDate = nextMonth(latestMonth);
  const targetMonth = new Date(`${targetDate}T00:00:00Z`).getUTCMonth() + 1;

  const { data: nfaWindows, error: nfaError } = await adminClient
    .from('nfa_intervention_window')
    .select('start_date, end_date');
  if (nfaError) return jsonResponse({ error: nfaError.message }, 500);
  const nfaActive = isNfaActive(targetDate, (nfaWindows ?? []) as NfaWindowRow[]);

  const pricingResponse = await fetch(`${pricingServiceUrl}/market-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      last_prices: lastPrices,
      target_month: targetMonth,
      target_date: targetDate,
      nfa_active: nfaActive,
    }),
  });

  const pricingBody = await pricingResponse.json();
  if (!pricingResponse.ok) {
    return jsonResponse({ error: 'pricing_service request failed', detail: pricingBody }, 502);
  }

  return jsonResponse(pricingBody, 200);
});

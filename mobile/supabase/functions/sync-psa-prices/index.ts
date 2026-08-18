// Supabase Edge Function (Deno). Deploy with:
//   supabase functions deploy sync-psa-prices
//
// "Sync now" button target: an LGU official calls this to pull the latest
// Rizal palay farmgate prices straight from PSA OpenSTAT's live PXWeb API,
// instead of manually re-exporting/uploading an Excel file every month.
//
// Dataset: 0032M4AFN01.px ("Cereals: Farmgate Prices by Geolocation,
// Commodity, Year and Period"), under DB/2M/NFG (Farmgate Prices, New
// Series). No API key required. PSA has historically published a given
// month's data roughly 4-6 weeks later (e.g. May 2026 -> released Jun 11
// 2026, Jun 2026 -> released Jul 13 2026) - so this is meant to be run
// on-demand (or on a monthly schedule later), not on every app request.
//
// Dimension codes (Year/Period) are index-based and could shift if PSA
// reorders the table, so this resolves them dynamically from the table's
// own metadata on every run rather than hardcoding "16" = 2026 etc. The
// Geolocation code for Rizal (045800000) is a stable PSGC code and the
// Commodity is matched by name ("Palay [Paddy] Other Variety, dry ..."),
// same as the training notebook/Excel export used.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PXWEB_TABLE_URL = 'https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/2M/NFG/0032M4AFN01.px';
const PROVINCE = 'Rizal';
const PROVINCE_VALUE_TEXT = '....Rizal';
const COMMODITY_VALUE_TEXT_PREFIX = 'Palay [Paddy] Other Variety';
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

type PxVariable = { code: string; values: string[]; valueTexts: string[] };
type PxMetadata = { variables: PxVariable[] };
type PxDataRow = { key: string[]; values: string[] };
type PxDataResponse = { data: PxDataRow[] };

function findVariable(meta: PxMetadata, code: string): PxVariable {
  const v = meta.variables.find((v) => v.code === code);
  if (!v) throw new Error(`PXWeb metadata missing expected variable: ${code}`);
  return v;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'missing Authorization header' }, 401);

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Two ways in: an LGU official's own session (the "sync now" dashboard
  // button), or the service-role key itself (the monthly pg_cron job -
  // see migration 0014). The service-role key is itself a validly-signed
  // JWT, so Supabase's platform-level JWT check already accepts it; this
  // is just how *this function* tells the two callers apart once inside.
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const isSystemCall = bearerToken === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  let callerId: string | null = null;
  if (!isSystemCall) {
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: 'invalid session' }, 401);
    callerId = userData.user.id;

    // Only an LGU official may trigger a sync - same restriction as manually
    // writing a row (the palay_price_history RLS policy + role-check trigger
    // would reject the insert below anyway, but checking here first gives a
    // clean 403 instead of a raw Postgres error).
    const { data: userRow, error: roleError } = await adminClient
      .from('user')
      .select('role')
      .eq('user_id', callerId)
      .maybeSingle();
    if (roleError) return jsonResponse({ error: roleError.message }, 500);
    if (!userRow || userRow.role !== 'LGU_Official') {
      return jsonResponse({ error: 'only an LGU official may sync PSA prices' }, 403);
    }
  }

  // Step 1: fetch metadata to resolve dimension codes dynamically.
  const metaResponse = await fetch(PXWEB_TABLE_URL);
  if (!metaResponse.ok) {
    return jsonResponse({ error: 'PSA OpenSTAT metadata request failed', status: metaResponse.status }, 502);
  }
  const meta = (await metaResponse.json()) as PxMetadata;

  const geolocationVar = findVariable(meta, 'Geolocation');
  const geolocationCode = geolocationVar.values[geolocationVar.valueTexts.indexOf(PROVINCE_VALUE_TEXT)];
  if (!geolocationCode) return jsonResponse({ error: `could not resolve Geolocation code for ${PROVINCE}` }, 502);

  const commodityVar = findVariable(meta, 'Commodity');
  const commodityIdx = commodityVar.valueTexts.findIndex((t) => t.startsWith(COMMODITY_VALUE_TEXT_PREFIX));
  const commodityCode = commodityVar.values[commodityIdx];
  if (!commodityCode) return jsonResponse({ error: 'could not resolve Commodity code for palay' }, 502);

  const yearVar = findVariable(meta, 'Year');
  const periodVar = findVariable(meta, 'Period');
  // Exclude "Annual" - only want the 12 monthly periods.
  const monthPeriodCodes = periodVar.values.filter((_, i) => MONTH_NAMES.includes(periodVar.valueTexts[i]));

  // Step 2: query every year/month for this province+commodity. Small
  // payload (a few hundred numbers), and re-fetching everything each run
  // is simplest and self-correcting if PSA ever revises a past figure.
  const query = {
    query: [
      { code: 'Geolocation', selection: { filter: 'item', values: [geolocationCode] } },
      { code: 'Commodity', selection: { filter: 'item', values: [commodityCode] } },
      { code: 'Year', selection: { filter: 'item', values: yearVar.values } },
      { code: 'Period', selection: { filter: 'item', values: monthPeriodCodes } },
    ],
    response: { format: 'json' },
  };

  const dataResponse = await fetch(PXWEB_TABLE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!dataResponse.ok) {
    return jsonResponse({ error: 'PSA OpenSTAT data request failed', status: dataResponse.status }, 502);
  }
  const body = (await dataResponse.json()) as PxDataResponse;

  const yearCodeToText = new Map(yearVar.values.map((c, i) => [c, yearVar.valueTexts[i]]));
  const periodCodeToText = new Map(periodVar.values.map((c, i) => [c, periodVar.valueTexts[i]]));

  const rows: { province: string; price_month: string; price_per_kg: number; source: string; entered_by: string | null }[] = [];
  for (const row of body.data) {
    const [, , yearCode, periodCode] = row.key;
    const rawValue = row.values[0];
    if (rawValue === '..' || rawValue === undefined) continue; // not yet published

    const year = Number(yearCodeToText.get(yearCode));
    const monthName = periodCodeToText.get(periodCode);
    const monthNum = monthName ? MONTH_NAMES.indexOf(monthName) + 1 : 0;
    if (!year || !monthNum) continue;

    const priceMonth = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    rows.push({
      province: PROVINCE,
      price_month: priceMonth,
      price_per_kg: Number(rawValue),
      source: 'psa_api',
      entered_by: callerId,
    });
  }

  if (rows.length === 0) {
    return jsonResponse({ error: 'PSA OpenSTAT returned no usable rows' }, 502);
  }

  const { error: upsertError } = await adminClient
    .from('palay_price_history')
    .upsert(rows, { onConflict: 'province,price_month' });
  if (upsertError) return jsonResponse({ error: upsertError.message }, 500);

  const months = rows.map((r) => r.price_month).sort();

  // History is already saved. A dry_base miss must not fail the sync or
  // blank the 0007 seed — refresh-dry-base itself leaves the previous value.
  let dryBaseRefreshed = false;
  try {
    const refreshResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/refresh-dry-base`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      },
    );
    dryBaseRefreshed = refreshResponse.ok;
    if (!refreshResponse.ok) {
      const detail = await refreshResponse.text();
      console.error('sync-psa-prices: refresh-dry-base failed; keeping previous dry_base', detail);
    }
  } catch (err) {
    console.error('sync-psa-prices: refresh-dry-base unreachable; keeping previous dry_base', err);
  }

  return jsonResponse(
    {
      synced_months: rows.length,
      earliest: months[0],
      latest: months[months.length - 1],
      dry_base_refreshed: dryBaseRefreshed,
    },
    200,
  );
});

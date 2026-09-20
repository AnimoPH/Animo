// Supabase Edge Function (Deno). Deploy with:
//   supabase functions deploy send-push-notifications
//
// Service-role only, invoked every 2 minutes by
// trigger_push_notification_dispatch() (migration 0030). Drains
// push_notification_queue: for every 'Pending' row, looks up the user's
// expo_push_token and POSTs to Expo's push API directly (no expo-server-sdk
// dependency — that package targets Node, and this runs on Deno).
//
// A user with no push token yet (the common case until the mobile app ships
// registration) is marked 'Skipped', not 'Failed' — this is an expected
// state, not an error, until the client-side follow-up lands.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Expo caps a single push request at 100 messages.
const BATCH_SIZE = 100;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

type QueueRow = {
  notification_id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
};

type UserRow = {
  user_id: string;
  expo_push_token: string | null;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'missing Authorization header' }, 401);

  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (bearerToken !== serviceRoleKey) {
    return jsonResponse({ error: 'service role required' }, 403);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const restHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  const queueRes = await fetch(
    `${supabaseUrl}/rest/v1/push_notification_queue?status=eq.Pending&order=created_at.asc&limit=500`,
    { headers: restHeaders },
  );
  if (!queueRes.ok) {
    const text = await queueRes.text();
    console.error('send-push-notifications: queue fetch failed', text);
    return jsonResponse({ error: text }, 500);
  }
  const pending = (await queueRes.json()) as QueueRow[];
  if (pending.length === 0) {
    return jsonResponse({ sent: 0, skipped: 0, failed: 0 }, 200);
  }

  const userIds = [...new Set(pending.map((row) => row.user_id))];
  const usersRes = await fetch(
    `${supabaseUrl}/rest/v1/user?user_id=in.(${userIds.join(',')})&select=user_id,expo_push_token`,
    { headers: restHeaders },
  );
  if (!usersRes.ok) {
    const text = await usersRes.text();
    console.error('send-push-notifications: user token fetch failed', text);
    return jsonResponse({ error: text }, 500);
  }
  const tokenByUserId = new Map<string, string | null>(
    ((await usersRes.json()) as UserRow[]).map((row) => [row.user_id, row.expo_push_token]),
  );

  const skippedIds: string[] = [];
  const deliverable = pending.filter((row) => {
    const token = tokenByUserId.get(row.user_id);
    if (!token) {
      skippedIds.push(row.notification_id);
      return false;
    }
    return true;
  });

  const sentIds: string[] = [];
  const failedIds: string[] = [];

  for (const batch of chunk(deliverable, BATCH_SIZE)) {
    const messages = batch.map((row) => ({
      to: tokenByUserId.get(row.user_id),
      title: row.title,
      body: row.body,
      data: row.data ?? {},
    }));

    try {
      const expoRes = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!expoRes.ok) {
        console.error('send-push-notifications: Expo push API request failed', await expoRes.text());
        failedIds.push(...batch.map((row) => row.notification_id));
        continue;
      }

      const result = await expoRes.json();
      const tickets: Array<{ status: string }> = result?.data ?? [];
      batch.forEach((row, i) => {
        const ticket = tickets[i];
        if (ticket?.status === 'ok') {
          sentIds.push(row.notification_id);
        } else {
          console.error('send-push-notifications: Expo ticket error', ticket);
          failedIds.push(row.notification_id);
        }
      });
    } catch (err) {
      console.error('send-push-notifications: batch send threw', err);
      failedIds.push(...batch.map((row) => row.notification_id));
    }
  }

  async function markStatus(ids: string[], status: 'Sent' | 'Failed' | 'Skipped') {
    if (ids.length === 0) return;
    const payload: Record<string, unknown> = { status };
    if (status === 'Sent') payload.sent_at = new Date().toISOString();
    await fetch(`${supabaseUrl}/rest/v1/push_notification_queue?notification_id=in.(${ids.join(',')})`, {
      method: 'PATCH',
      headers: restHeaders,
      body: JSON.stringify(payload),
    });
  }

  await Promise.all([markStatus(sentIds, 'Sent'), markStatus(failedIds, 'Failed'), markStatus(skippedIds, 'Skipped')]);

  return jsonResponse({ sent: sentIds.length, skipped: skippedIds.length, failed: failedIds.length }, 200);
});

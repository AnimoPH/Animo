// Supabase Edge Function (Deno). Deploy with:
//   supabase functions deploy record-blockchain-receipt
//
// Writes a real on-chain record for a completed transaction and inserts the
// resulting tx_hash into `receipt` (0001 §10). Runs under the service role —
// the only way anything gets written to `receipt` (no client INSERT policy
// exists). The relayer wallet (RELAYER_PRIVATE_KEY) pays gas and is the sole
// signer — farmer/buyer custodial wallets (Vault-stored, see
// 0002_wallet_vault_functions.sql) are never touched here; their
// wallet_address values are only read, to go into the on-chain payload as
// data, not as signers. That means this receipt is backend-authored
// evidence ("Animo recorded this"), not a dual-signed attestation — a
// deliberate choice to avoid pulling a user's custodial key out of Vault for
// a second purpose beyond registration.
//
// Idempotent by design (safe to call more than once for the same
// transaction_id): a pre-check returns the existing receipt without
// touching the chain, and a unique index on receipt.transaction_id
// (0011_receipt_idempotency_guard.sql) means a losing concurrent insert is
// treated as success rather than an error. See that migration's header for
// the residual (accepted, documented) double-broadcast race this doesn't
// fully close.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'https://esm.sh/ethers@6';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN');
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  ...(ALLOWED_ORIGIN ? { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN } : {}),
};

const CONFIRMATION_TIMEOUT_MS = 60_000;

type ReceiptInput = {
  transactionId: string;
};

type TransactionMatchRow = {
  transaction_id: string;
  buyer_id: string;
  farmer_id: string;
  quantity_kg: number;
  agreed_price_per_kg: number;
  status: string;
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/** Races a promise against a timer so a stalled RPC fails fast with a clear, retryable error. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
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
  const callerId = userData.user.id;

  let input: Partial<ReceiptInput>;
  try {
    input = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400);
  }
  const transactionId = input.transactionId?.trim();
  if (!transactionId) return jsonResponse({ error: 'transactionId is required' }, 400);

  // Service-role client — the only thing allowed to write to `receipt`, and
  // the only role that can read wallet_address across both parties freely
  // (RLS on farmer/buyer wouldn't let one party see the other's row).
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: transaction, error: transactionError } = await adminClient
    .from('transactionmatch')
    .select('transaction_id, buyer_id, farmer_id, quantity_kg, agreed_price_per_kg, status')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (transactionError) {
    if (transactionError.code === '22P02') return jsonResponse({ error: 'invalid transactionId' }, 400);
    console.error('[record-blockchain-receipt] transactionmatch lookup failed', transactionError.message);
    return jsonResponse({ error: 'Hindi ma-record sa blockchain ngayon. Subukan muli.' }, 500);
  }
  if (!transaction) return jsonResponse({ error: 'transaction not found' }, 404);

  const row = transaction as TransactionMatchRow;
  if (callerId !== row.buyer_id && callerId !== row.farmer_id) {
    return jsonResponse({ error: 'not authorized' }, 403);
  }
  if (row.status !== 'Completed') {
    return jsonResponse({ error: 'Hindi pa kumpleto ang transaksyong ito.' }, 409);
  }

  // Idempotency pre-check — shrinks the common-case race window (see
  // migration 0011 for what it doesn't fully close). No chain call at all
  // if a receipt already exists.
  const { data: existingReceipt, error: existingReceiptError } = await adminClient
    .from('receipt')
    .select('tx_hash')
    .eq('transaction_id', transactionId)
    .maybeSingle();
  if (existingReceiptError) {
    console.error('[record-blockchain-receipt] existing receipt lookup failed', existingReceiptError.message);
    return jsonResponse({ error: 'Hindi ma-record sa blockchain ngayon. Subukan muli.' }, 500);
  }
  if (existingReceipt) return jsonResponse({ txHash: existingReceipt.tx_hash }, 200);

  const [{ data: farmer, error: farmerError }, { data: buyer, error: buyerError }] = await Promise.all([
    adminClient.from('farmer').select('wallet_address').eq('user_id', row.farmer_id).maybeSingle(),
    adminClient.from('buyer').select('wallet_address').eq('user_id', row.buyer_id).maybeSingle(),
  ]);
  if (farmerError || buyerError) {
    console.error(
      '[record-blockchain-receipt] wallet_address lookup failed',
      farmerError?.message ?? buyerError?.message,
    );
    return jsonResponse({ error: 'Hindi ma-record sa blockchain ngayon. Subukan muli.' }, 500);
  }
  if (!farmer?.wallet_address || !buyer?.wallet_address) {
    return jsonResponse({ error: 'Kulang ang wallet address ng isa sa mga partido.' }, 422);
  }

  let txHash: string;
  try {
    // POLYGON_RPC_URL is the Alchemy base URL (e.g.
    // https://polygon-amoy.g.alchemy.com/v2/), ALCHEMY_API_KEY the auth
    // token appended to it — Alchemy runs the actual Polygon Amoy node,
    // this app never does. Constructing the Wallet throws synchronously on
    // a missing/malformed RELAYER_PRIVATE_KEY — kept inside this try so a
    // misconfigured secret still produces a controlled response and a
    // logged, specific error instead of an uncaught-exception boot error
    // (which surfaces to the client as an opaque, un-unwrappable non-2xx).
    const rawUrl = Deno.env.get('POLYGON_RPC_URL') ?? '';
    const rawKey = Deno.env.get('ALCHEMY_API_KEY') ?? '';
    const relayerKey = Deno.env.get('RELAYER_PRIVATE_KEY') ?? '';
    if (!rawUrl || !rawKey || !relayerKey) {
      // Fails fast with a specific server-side log instead of letting
      // ethers throw an opaque "invalid private key"/network error further
      // down for what's actually a missing-secret misconfiguration.
      throw new Error(
        `missing secret(s): ${[
          !rawUrl && 'POLYGON_RPC_URL',
          !rawKey && 'ALCHEMY_API_KEY',
          !relayerKey && 'RELAYER_PRIVATE_KEY',
        ]
          .filter(Boolean)
          .join(', ')}`,
      );
    }

    const provider = new ethers.JsonRpcProvider(`${rawUrl}${rawKey}`);
    const relayerWallet = new ethers.Wallet(relayerKey, provider);

    const payload = {
      transaction_id: transactionId,
      buyer_wallet: buyer.wallet_address,
      farmer_wallet: farmer.wallet_address,
      quantity_kg: row.quantity_kg,
      agreed_price_per_kg: row.agreed_price_per_kg,
    };
    const data = ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify(payload)));

    // Explicit nonce, fetched fresh per call. Two concurrent invocations for
    // *different* transactions can still read the same pending nonce and
    // race (one send fails with a nonce-conflict error) — a known,
    // documented limitation for this low-concurrency testnet feature, not a
    // mutex/queue. The resibo retry-on-load pattern picks it up on a later,
    // unblocked nonce.
    const nonce = await provider.getTransactionCount(relayerWallet.address, 'pending');
    const tx = await relayerWallet.sendTransaction({ to: relayerWallet.address, value: 0n, data, nonce });
    await withTimeout(tx.wait(1), CONFIRMATION_TIMEOUT_MS, 'confirmation timed out');
    txHash = tx.hash;
  } catch (sendError) {
    console.error(
      '[record-blockchain-receipt] send/confirm failed',
      sendError instanceof Error ? sendError.message : sendError,
    );
    return jsonResponse({ error: 'Hindi ma-record sa blockchain ngayon. Subukan muli mamaya.' }, 500);
  }

  const { error: insertError } = await adminClient.from('receipt').insert({
    transaction_id: transactionId,
    tx_hash: txHash,
  });
  if (insertError) {
    if (insertError.code === '23505') {
      // Lost the idempotency race — another call already inserted first.
      // The chain send above is a harmless orphaned duplicate (see 0011);
      // surface the winner's hash rather than erroring.
      const { data: winner, error: winnerError } = await adminClient
        .from('receipt')
        .select('tx_hash')
        .eq('transaction_id', transactionId)
        .maybeSingle();
      if (winner) return jsonResponse({ txHash: winner.tx_hash }, 200);
      console.error('[record-blockchain-receipt] winner re-read failed', winnerError?.message);
      return jsonResponse({ error: 'Hindi ma-record sa blockchain ngayon. Subukan muli.' }, 500);
    }
    console.error('[record-blockchain-receipt] receipt insert failed', insertError.message);
    return jsonResponse({ error: 'Hindi ma-record sa blockchain ngayon. Subukan muli.' }, 500);
  }

  return jsonResponse({ txHash }, 200);
});

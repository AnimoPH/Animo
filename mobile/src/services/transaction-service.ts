import { requireAuthUserId } from '@/services/crop-listing-service';
import { unwrapFunctionError } from '@/services/auth-service';
import {
  fetchBuyerPurchaseRequests,
  fetchFarmerPurchaseRequests,
  fetchListingPurchaseRequests,
} from '@/services/purchase-request-service';
import { supabase } from '@/lib/supabase';
import type {
  DisplayStage,
  Payment,
  PaymentMode,
  PaymentStatus,
  PurchaseOutcome,
  TransactionCounterpart,
  TransactionMatch,
  TransactionMatchStatus,
  TransactionWithPayment,
} from '@/types/transaction';
import { DISPLAY_STAGE_LABELS, deriveDisplayStage } from '@/types/transaction';

/**
 * Transaction/payment service — `transactionmatch` rows are only ever
 * created by `accept_purchase_request` (migration 0009), so this file is
 * read-only against that table plus thin RPC wrappers around the payment
 * workflow hardened in 0004. Direct client UPDATE is revoked on both
 * `transactionmatch` and `payment` — every state change below is an RPC.
 */

export type TransactionMatchRow = {
  transaction_id: string;
  listing_id: string;
  created_at: string;
  updated_at: string;
  request_id: string;
  buyer_id: string;
  farmer_id: string;
  agreed_price_per_kg: number;
  quantity_kg: number;
  total_amount: number;
  status: TransactionMatchStatus;
  date_completed: string | null;
};

export const TRANSACTION_COLUMNS =
  'transaction_id, listing_id, created_at, updated_at, request_id, buyer_id, farmer_id, agreed_price_per_kg, quantity_kg, total_amount, status, date_completed' as const;

export type PaymentRow = {
  payment_id: string;
  transaction_id: string;
  gcash_reference_number: string | null;
  payment_mode: PaymentMode;
  amount: number;
  buyer_confirmed_at: string | null;
  farmer_confirmed_at: string | null;
  payer_id: string;
  payee_id: string;
  status: PaymentStatus;
  timestamp: string | null;
};

export const PAYMENT_COLUMNS =
  'payment_id, transaction_id, gcash_reference_number, payment_mode, amount, buyer_confirmed_at, farmer_confirmed_at, payer_id, payee_id, status, timestamp' as const;

export function mapTransaction(row: TransactionMatchRow): TransactionMatch {
  return {
    id: row.transaction_id,
    listingId: row.listing_id,
    requestId: row.request_id,
    buyerId: row.buyer_id,
    farmerId: row.farmer_id,
    agreedPricePerKg: Number(row.agreed_price_per_kg),
    quantityKg: Number(row.quantity_kg),
    totalAmount: Number(row.total_amount),
    status: row.status,
    dateCompleted: row.date_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.payment_id,
    transactionId: row.transaction_id,
    gcashReferenceNumber: row.gcash_reference_number,
    paymentMode: row.payment_mode,
    amount: Number(row.amount),
    buyerConfirmedAt: row.buyer_confirmed_at,
    farmerConfirmedAt: row.farmer_confirmed_at,
    payerId: row.payer_id,
    payeeId: row.payee_id,
    status: row.status,
    timestamp: row.timestamp,
  };
}

export type ReceiptRow = {
  transaction_id: string;
  tx_hash: string;
};

/** The real on-chain receipt for a completed transaction (§10) — just a tx_hash, nothing fabricated. */
export type Receipt = {
  transactionId: string;
  txHash: string;
};

export function mapReceipt(row: ReceiptRow): Receipt {
  return { transactionId: row.transaction_id, txHash: row.tx_hash };
}

type TransactionMatchWithPaymentsRow = TransactionMatchRow & { payment: PaymentRow[] };

function mapTransactionWithPayment(row: TransactionMatchWithPaymentsRow): TransactionWithPayment {
  // A transaction only ever gets one payment row in this flow (record_payment
  // can't be called twice — bayad.tsx guards against double-submit — but take
  // the most recently-created one defensively rather than assume exactly one).
  const payments = (row.payment ?? []).slice().sort((a, b) => (a.payment_id < b.payment_id ? 1 : -1));
  return { ...mapTransaction(row), payment: payments.length > 0 ? mapPayment(payments[0]) : null };
}

const TRANSACTION_WITH_PAYMENT_SELECT = `${TRANSACTION_COLUMNS}, payment(${PAYMENT_COLUMNS})` as const;

/** One transaction by id, with its payment joined. RLS restricts this to the buyer/farmer party. */
export async function fetchTransaction(id: string): Promise<TransactionWithPayment | null> {
  const { data, error } = await supabase
    .from('transactionmatch')
    .select(TRANSACTION_WITH_PAYMENT_SELECT)
    .eq('transaction_id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapTransactionWithPayment(data as unknown as TransactionMatchWithPaymentsRow) : null;
}

/** The transaction spun off from a given purchase request, if the farmer has accepted it. */
export async function fetchTransactionByRequestId(requestId: string): Promise<TransactionWithPayment | null> {
  const { data, error } = await supabase
    .from('transactionmatch')
    .select(TRANSACTION_WITH_PAYMENT_SELECT)
    .eq('request_id', requestId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapTransactionWithPayment(data as unknown as TransactionMatchWithPaymentsRow) : null;
}

export async function fetchBuyerTransactions(): Promise<TransactionWithPayment[]> {
  const buyerId = await requireAuthUserId();

  const { data, error } = await supabase
    .from('transactionmatch')
    .select(TRANSACTION_WITH_PAYMENT_SELECT)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as TransactionMatchWithPaymentsRow[]).map(mapTransactionWithPayment);
}

export async function fetchFarmerTransactions(): Promise<TransactionWithPayment[]> {
  const farmerId = await requireAuthUserId();

  const { data, error } = await supabase
    .from('transactionmatch')
    .select(TRANSACTION_WITH_PAYMENT_SELECT)
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as TransactionMatchWithPaymentsRow[]).map(mapTransactionWithPayment);
}

/**
 * Buyer's full purchase history as one feed: every request that hasn't been
 * matched yet (Pending/Rejected/Cancelled/No_Quantity_Remaining) alongside
 * every request that has (paired with its transaction), newest first.
 */
export async function fetchBuyerPurchaseOutcomes(): Promise<PurchaseOutcome[]> {
  const [requests, transactions] = await Promise.all([
    fetchBuyerPurchaseRequests(),
    fetchBuyerTransactions(),
  ]);
  return combineOutcomes(requests, transactions);
}

/**
 * Farmer's full activity feed across every listing they own: pending
 * requests waiting on a decision, plus every request that's already been
 * matched into a transaction, newest first.
 */
export async function fetchFarmerPurchaseOutcomes(): Promise<PurchaseOutcome[]> {
  const [requests, transactions] = await Promise.all([
    fetchFarmerPurchaseRequests(),
    fetchFarmerTransactions(),
  ]);
  return combineOutcomes(requests, transactions);
}

/** Merged purchase requests + matched transactions for one listing the farmer owns. */
export async function fetchListingPurchaseOutcomes(listingId: string): Promise<PurchaseOutcome[]> {
  const [requests, transactions] = await Promise.all([
    fetchListingPurchaseRequests(listingId),
    fetchListingTransactions(listingId),
  ]);
  return combineOutcomes(requests, transactions);
}

/** Farmer's matched transactions for a single listing. */
export async function fetchListingTransactions(listingId: string): Promise<TransactionWithPayment[]> {
  const farmerId = await requireAuthUserId();

  const { data, error } = await supabase
    .from('transactionmatch')
    .select(TRANSACTION_WITH_PAYMENT_SELECT)
    .eq('farmer_id', farmerId)
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as TransactionMatchWithPaymentsRow[]).map(mapTransactionWithPayment);
}

/** Latest ISO timestamp among non-null candidates (ISO strings compare lexicographically). */
function maxIsoTimestamp(candidates: Array<string | null | undefined>): string {
  let best = '';
  for (const value of candidates) {
    if (value && value > best) best = value;
  }
  return best;
}

/** Most recent activity on a matched transaction (row updates + payment stamps). */
export function transactionLastActivityAt(tx: TransactionWithPayment): string {
  return maxIsoTimestamp([
    tx.updatedAt,
    tx.createdAt,
    tx.dateCompleted,
    tx.payment?.buyerConfirmedAt,
    tx.payment?.farmerConfirmedAt,
  ]);
}

/**
 * Most recent activity for a purchase-request / transaction feed row.
 * Prefer updated_at (migration 0028); include payment confirm stamps as a
 * belt-and-suspenders signal for the buyer-marked-paid path.
 */
export function outcomeLastActivityAt(outcome: PurchaseOutcome): string {
  const candidates: Array<string | null | undefined> = [
    outcome.request.updatedAt,
    outcome.request.submittedAt,
  ];
  if (outcome.kind === 'matched') {
    candidates.push(transactionLastActivityAt(outcome.transaction));
  }
  return maxIsoTimestamp(candidates);
}

function combineOutcomes(
  requests: Awaited<ReturnType<typeof fetchBuyerPurchaseRequests>>,
  transactions: TransactionWithPayment[],
): PurchaseOutcome[] {
  const transactionByRequestId = new Map(transactions.map((tx) => [tx.requestId, tx]));

  return requests
    .map((request): PurchaseOutcome => {
      const transaction = transactionByRequestId.get(request.id);
      return transaction ? { kind: 'matched', request, transaction } : { kind: 'unmatched', request };
    })
    .sort((a, b) => (outcomeLastActivityAt(a) < outcomeLastActivityAt(b) ? 1 : -1));
}

/**
 * Max activity timestamp across a listing's purchase requests and transactions.
 * Falls back to `listingDateListed` when the listing has no PR/TM activity yet.
 */
export function listingLastActivityAt(
  listingId: string,
  listingDateListed: string,
  prLatestUpdatedAt: Map<string, string>,
  transactions: TransactionWithPayment[],
): string {
  const candidates: Array<string | null | undefined> = [
    listingDateListed,
    prLatestUpdatedAt.get(listingId),
  ];
  for (const tx of transactions) {
    if (tx.listingId === listingId) candidates.push(transactionLastActivityAt(tx));
  }
  return maxIsoTimestamp(candidates);
}

/** Live sum of completed kg sold for one listing (no stored column). */
export function sumCompletedSoldKg(transactions: TransactionWithPayment[], listingId: string): number {
  return transactions
    .filter((tx) => tx.listingId === listingId && tx.status === 'Completed')
    .reduce((sum, tx) => sum + tx.quantityKg, 0);
}

/** Live sum of completed earnings (Buong Kita) for one listing. */
export function sumCompletedEarnings(transactions: TransactionWithPayment[], listingId: string): number {
  return transactions
    .filter((tx) => tx.listingId === listingId && tx.status === 'Completed')
    .reduce((sum, tx) => sum + tx.totalAmount, 0);
}

/**
 * Farmer Part B list badges — local labels only; does not change global
 * DISPLAY_STAGE_LABELS used on detail/buyer screens.
 */
const FARMER_LISTING_TXN_STAGE_LABELS: Partial<Record<DisplayStage, string>> = {
  request_pending: 'Naghihintay ng sagot',
  awaiting_payment: 'Naghihintay ng bayad',
  payment_sent: 'Naghihintay ng bayad',
  payment_confirmed: 'Naghihintay ng pickup',
  delivered: 'Naghihintay ng pickup',
  completed: 'Tapos na',
};

export function getFarmerListingTxnStageLabel(stage: DisplayStage): string {
  return FARMER_LISTING_TXN_STAGE_LABELS[stage] ?? DISPLAY_STAGE_LABELS[stage];
}

export const LISTING_TXN_ONGOING_STAGES: DisplayStage[] = [
  'request_pending',
  'awaiting_payment',
  'payment_sent',
  'payment_confirmed',
  'delivered',
];

export function isListingTxnOngoing(outcome: PurchaseOutcome): boolean {
  return LISTING_TXN_ONGOING_STAGES.includes(deriveDisplayStage(outcome));
}

export function isListingTxnCompleted(outcome: PurchaseOutcome): boolean {
  return deriveDisplayStage(outcome) === 'completed';
}

/** Buyer records a payment on their own transaction. Returns the new payment_id. */
export async function recordPayment(
  transactionId: string,
  mode: PaymentMode,
  amount: number,
  gcashReference?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('record_payment', {
    p_transaction_id: transactionId,
    p_payment_mode: mode,
    p_amount: amount,
    p_gcash_reference: gcashReference ?? null,
  });

  if (error) throw error;
  return data as string;
}

export async function confirmPaymentSent(paymentId: string): Promise<void> {
  const { error } = await supabase.rpc('buyer_confirm_payment_sent', { p_payment_id: paymentId });
  if (error) throw error;
}

export async function confirmPaymentReceived(paymentId: string): Promise<void> {
  const { error } = await supabase.rpc('farmer_confirm_payment_received', { p_payment_id: paymentId });
  if (error) throw error;
}

export async function reportPaymentFailed(paymentId: string): Promise<void> {
  const { error } = await supabase.rpc('report_payment_failed', { p_payment_id: paymentId });
  if (error) throw error;
}

export async function markDelivered(transactionId: string): Promise<void> {
  const { error } = await supabase.rpc('farmer_mark_delivered', { p_transaction_id: transactionId });
  if (error) throw error;

  // Best-effort: delivery itself already succeeded above (transactionmatch
  // is already Completed via the transactionmatch_auto_complete trigger by
  // the time this resolves) — a blockchain RPC hiccup here must never
  // surface as a delivery failure. Both resibo screens retry this on load
  // if it's still missing; the Edge Function is idempotent (see
  // 0011_receipt_idempotency_guard.sql).
  recordBlockchainReceipt(transactionId).catch((e) => {
    console.warn('[markDelivered] blockchain receipt deferred:', e instanceof Error ? e.message : e);
  });
}

/** The on-chain receipt for a transaction, if one has been recorded yet. RLS restricts this to the buyer/farmer party. */
export async function fetchReceipt(transactionId: string): Promise<Receipt | null> {
  const { data, error } = await supabase
    .from('receipt')
    .select('transaction_id, tx_hash')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapReceipt(data as ReceiptRow) : null;
}

/**
 * Calls the `record-blockchain-receipt` Edge Function, which writes a real
 * on-chain record (relayer-paid, no user gas) and returns its tx_hash.
 * Idempotent — safe to call repeatedly for the same transaction
 * (0011_receipt_idempotency_guard.sql). Callers treat this as best-effort:
 * a failure here should never block or fail the surrounding user action.
 */
export async function recordBlockchainReceipt(transactionId: string): Promise<Receipt> {
  const { data, error } = await supabase.functions.invoke('record-blockchain-receipt', {
    body: { transactionId },
  });
  if (error) throw await unwrapFunctionError(error);

  const txHash = (data as { txHash?: string } | null)?.txHash;
  if (!txHash) throw new Error('Walang natanggap na tx hash mula sa blockchain function.');
  return { transactionId, txHash };
}

export async function cancelTransaction(transactionId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_transaction', { p_transaction_id: transactionId });
  if (error) throw error;
}

/**
 * The other party's name/phone, readable once a transaction match exists
 * (see the "Counterpart contact revealed after a transaction match" RLS
 * policy on "user" in migration 0001) — null before that.
 */
export async function fetchTransactionCounterpart(userId: string): Promise<TransactionCounterpart | null> {
  const { data, error } = await supabase
    .from('user')
    .select('user_id, full_name, contact_number')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { id: data.user_id, name: data.full_name, phone: data.contact_number };
}

/**
 * Batched lookup of counterpart user names by user IDs.
 */
export async function fetchCounterpartNames(userIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('user')
    .select('user_id, full_name')
    .in('user_id', uniqueIds);

  if (error) return new Map();
  const nameById = new Map<string, string>();
  (data ?? []).forEach((row: { user_id: string; full_name: string }) => {
    if (row.user_id && row.full_name) {
      nameById.set(row.user_id, row.full_name);
    }
  });
  return nameById;
}

/**
 * Batched lookup of public farmer names by listing IDs.
 */
export async function fetchFarmerNamesByListingIds(listingIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(listingIds)].filter(Boolean);
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('listing_farmer_public')
    .select('listing_id, farmer_name')
    .in('listing_id', uniqueIds);

  if (error) return new Map();
  const nameByListing = new Map<string, string>();
  (data ?? []).forEach((row: { listing_id: string; farmer_name: string }) => {
    if (row.listing_id && row.farmer_name) {
      nameByListing.set(row.listing_id, row.farmer_name);
    }
  });
  return nameByListing;
}

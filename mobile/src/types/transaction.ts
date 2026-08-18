/**
 * Transaction/payment domain types — maps the ANIMO Data Dictionary §8/§9
 * TRANSACTIONMATCH/PAYMENT tables (supabase/migrations/0001, hardened by
 * 0004_payment_workflow_hardening.sql and 0009_purchase_request_workflow.sql)
 * to the shapes the buyer/farmer transaction screens use.
 *
 * There is no pickup/inspection/scheduling table in this schema — the real
 * lifecycle is purchaserequest (pre-match) -> transactionmatch (post-match)
 * -> payment, nothing more. `DisplayStage`/`deriveDisplayStage` below is the
 * single source of UI state, replacing the two old parallel mock enums
 * (`RequestStage`, `FarmerTransactionStage`) that used to live in
 * `constants/marketplace.ts`.
 *
 * Payment happens *before* delivery in the real flow (the reverse of the old
 * inspect-then-pay mock): `farmer_mark_delivered` only succeeds once
 * `status = 'Payment_Confirmed'`, and the `transactionmatch_auto_complete`
 * trigger (0001) promotes Delivered -> Completed immediately since a
 * Confirmed payment already exists by then — so `Delivered` is never
 * actually observable as a settled state, only handled defensively below.
 */

import type { PurchaseRequest } from './purchase-request';

export type TransactionMatchStatus =
  | 'Pending_Payment'
  | 'Payment_Confirmed'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled'
  | 'Failed';

export type PaymentMode = 'GCash' | 'Cash';
export type PaymentStatus = 'Pending' | 'Confirmed' | 'Failed';

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  GCash: 'GCash',
  Cash: 'Cash',
};

export type Payment = {
  id: string;
  transactionId: string;
  gcashReferenceNumber: string | null;
  paymentMode: PaymentMode;
  amount: number;
  buyerConfirmedAt: string | null;
  farmerConfirmedAt: string | null;
  payerId: string;
  payeeId: string;
  status: PaymentStatus;
  timestamp: string | null;
};

export type TransactionMatch = {
  id: string;
  listingId: string;
  requestId: string;
  buyerId: string;
  farmerId: string;
  agreedPricePerKg: number;
  quantityKg: number;
  totalAmount: number;
  status: TransactionMatchStatus;
  dateCompleted: string | null;
  createdAt: string;
};

/** Every screen actually wants the transaction with its most recent payment row joined. */
export type TransactionWithPayment = TransactionMatch & { payment: Payment | null };

/** The other party's identity, revealed only once a transaction match exists (see the
 * "Counterpart contact revealed after a transaction match" RLS policy on "user" in 0001). */
export type TransactionCounterpart = {
  id: string;
  name: string;
  phone: string;
};

export type PurchaseOutcome =
  | { kind: 'unmatched'; request: PurchaseRequest }
  | { kind: 'matched'; request: PurchaseRequest; transaction: TransactionWithPayment };

/** The single source of truth for UI state — replaces both old mock stage enums. */
export type DisplayStage =
  | 'request_pending'
  | 'request_rejected'
  | 'request_cancelled'
  | 'awaiting_payment'
  | 'payment_sent'
  | 'payment_confirmed'
  | 'delivered'
  | 'completed'
  | 'transaction_cancelled'
  | 'payment_failed';

/** Matches `BadgeTone` in `src/components/animo/status-badge.tsx` (kept as a plain string union here to avoid a component import in a domain-types file). */
export type DisplayStageTone = 'info' | 'success' | 'warning' | 'mild' | 'danger' | 'neutral';

export const DISPLAY_STAGE_TONE: Record<DisplayStage, DisplayStageTone> = {
  request_pending: 'warning',
  request_rejected: 'neutral',
  request_cancelled: 'neutral',
  awaiting_payment: 'info',
  payment_sent: 'mild',
  payment_confirmed: 'info',
  delivered: 'info',
  completed: 'success',
  transaction_cancelled: 'neutral',
  payment_failed: 'danger',
};

export const DISPLAY_STAGE_LABELS: Record<DisplayStage, string> = {
  request_pending: 'Naghihintay',
  request_rejected: 'Tinanggihan',
  request_cancelled: 'Nakansela',
  awaiting_payment: 'Naghihintay ng Bayad',
  payment_sent: 'Naghihintay ng Kumpirmasyon',
  payment_confirmed: 'Bayad Nakumpirma',
  delivered: 'Naihatid',
  completed: 'Kumpleto',
  transaction_cancelled: 'Nakansela',
  payment_failed: 'Hindi Natuloy',
};

/** Pure derivation — no I/O. This is what replaces both old stage enums. */
export function deriveDisplayStage(outcome: PurchaseOutcome): DisplayStage {
  if (outcome.kind === 'unmatched') {
    switch (outcome.request.status) {
      case 'Pending':
        return 'request_pending';
      case 'Rejected':
      case 'No_Quantity_Remaining':
        return 'request_rejected';
      case 'Cancelled':
        return 'request_cancelled';
      default:
        // Accepted/Partially_Accepted without a joined transaction row is an
        // invariant violation (accept_purchase_request always inserts one) —
        // fail soft rather than crash the list.
        return 'request_pending';
    }
  }

  const { transaction } = outcome;
  switch (transaction.status) {
    case 'Cancelled':
      return 'transaction_cancelled';
    case 'Failed':
      return 'payment_failed';
    case 'Completed':
      return 'completed';
    case 'Delivered':
      // Defensive only — transactionmatch_auto_complete promotes this to
      // Completed before a client ever observes it.
      return 'delivered';
    case 'Payment_Confirmed':
      return 'payment_confirmed';
    case 'Pending_Payment': {
      const payment = transaction.payment;
      if (!payment) return 'awaiting_payment';
      if (payment.status === 'Failed') return 'payment_failed';
      if (payment.buyerConfirmedAt) return 'payment_sent';
      return 'awaiting_payment';
    }
  }
}

/* ---------------- Progress tracker ---------------- */

export type ProgressStepKey = 'kahilingan' | 'tinanggap' | 'bayad' | 'kumpleto';

export type ProgressStep = {
  key: ProgressStepKey;
  label: string;
  detail: string;
  /** Optional extra line above `detail` (e.g. "Jul 30, 2026 9:15 AM"). */
  timestamp?: string;
  state: 'done' | 'current' | 'upcoming' | 'failed';
};

/**
 * Four real milestones: Request -> Tinanggap -> Bayad -> Kumpleto. There is
 * no pickup/inspection milestone — nothing in the schema backs one.
 */
export function buildProgressSteps(
  outcome: PurchaseOutcome,
  role: 'buyer' | 'farmer',
): ProgressStep[] {
  const stage = deriveDisplayStage(outcome);
  const isDead = stage === 'request_rejected' || stage === 'request_cancelled' || stage === 'transaction_cancelled' || stage === 'payment_failed';

  const kahilinganState: ProgressStep['state'] = isDead && stage !== 'transaction_cancelled' && stage !== 'payment_failed' ? 'failed' : 'done';

  const accepted = outcome.kind === 'matched';
  const tinanggapState: ProgressStep['state'] = isDead
    ? stage === 'request_rejected' || stage === 'request_cancelled'
      ? 'failed'
      : 'done'
    : accepted
      ? 'done'
      : 'current';

  const paymentConfirmedOrBeyond =
    accepted &&
    (stage === 'payment_confirmed' || stage === 'delivered' || stage === 'completed');
  const bayadState: ProgressStep['state'] = !accepted
    ? 'upcoming'
    : stage === 'transaction_cancelled' || stage === 'payment_failed'
      ? 'failed'
      : paymentConfirmedOrBeyond
        ? 'done'
        : stage === 'awaiting_payment' || stage === 'payment_sent'
          ? 'current'
          : 'upcoming';

  const completedState: ProgressStep['state'] =
    stage === 'completed' ? 'done' : paymentConfirmedOrBeyond ? 'current' : 'upcoming';

  const bayadDetail = (() => {
    if (!accepted) return 'Kasunod ng pagtanggap ng magsasaka.';
    if (stage === 'transaction_cancelled') return 'Kinansela ang transaksyon.';
    if (stage === 'payment_failed') return 'Hindi natuloy ang bayad.';
    if (paymentConfirmedOrBeyond) return 'Nakumpirma ang bayad.';
    if (stage === 'payment_sent') return 'Naghihintay ng kumpirmasyon ng magsasaka.';
    if (stage === 'awaiting_payment') return role === 'buyer' ? 'Isumite ang bayad.' : 'Naghihintay ng bayad mula sa mamimili.';
    return 'Naghihintay.';
  })();

  return [
    { key: 'kahilingan', label: 'Request naipadala', detail: outcome.request.submittedAt, state: kahilinganState },
    {
      key: 'tinanggap',
      label: accepted ? 'Tinanggap ng magsasaka' : 'Pag-accept ng magsasaka',
      detail: accepted ? 'Tinanggap ang kahilingan.' : isDead ? 'Hindi na itutuloy.' : 'Naghihintay ng sagot.',
      state: tinanggapState,
    },
    { key: 'bayad', label: role === 'buyer' ? 'Bayad sa magsasaka' : 'Bayad mula sa Mamimili', detail: bayadDetail, state: bayadState },
    {
      key: 'kumpleto',
      label: 'Kumpleto',
      detail: stage === 'completed' ? 'Tapos na ang transaksyon.' : 'Huling hakbang.',
      state: completedState,
    },
  ];
}

/* ---------------- Cancellation policy ---------------- */

export type CancelPolicy = {
  allowed: boolean;
  title: string;
  body: string;
  consequences: string[];
  confirmLabel: string;
  triggerLabel: string;
};

export function cancelPolicy(outcome: PurchaseOutcome, now: number = Date.now()): CancelPolicy {
  const stage = deriveDisplayStage(outcome);

  if (stage === 'request_pending') {
    const deadline = outcome.request.cancelDeadline;
    const withinWindow = !!deadline && now < new Date(deadline).getTime();
    return withinWindow
      ? {
          allowed: true,
          title: 'Kanselahin ang request?',
          body: 'Hindi pa tinatanggap ng magsasaka ang request na ito, kaya wala kang babayaran.',
          consequences: [
            'Walang parusa o bayad sa pagkansela.',
            'Maaari kang mag-request muli anumang oras.',
          ],
          confirmLabel: 'Kanselahin ang Request',
          triggerLabel: 'Kanselahin ang Request',
        }
      : {
          allowed: false,
          title: 'Nag-expire na ang pagkansela',
          body: 'Lumipas na ang 30-segundong window para kanselahin nang mag-isa ang request na ito.',
          consequences: [],
          confirmLabel: '',
          triggerLabel: '',
        };
  }

  if (stage === 'awaiting_payment') {
    return {
      allowed: true,
      title: 'Kanselahin ang transaksyon?',
      body: 'Tinanggap na ng magsasaka ang request na ito ngunit wala pang bayad na naitala.',
      consequences: [
        'Aabisuhan ang kabilang partido sa pagkansela.',
        'Muling magiging available ang dami ng palay na ito.',
      ],
      confirmLabel: 'Kanselahin ang Transaksyon',
      triggerLabel: 'Kanselahin ang Transaksyon',
    };
  }

  if (stage === 'completed' || stage === 'payment_confirmed' || stage === 'delivered' || stage === 'payment_sent') {
    return {
      allowed: false,
      title: 'Hindi na maaaring kanselahin',
      body: 'May naitala nang bayad sa transaksyong ito.',
      consequences: [
        'Makipag-ugnayan sa kabilang partido kung may problema.',
      ],
      confirmLabel: '',
      triggerLabel: '',
    };
  }

  return {
    allowed: false,
    title: 'Wala nang aksyon',
    body: 'Wala nang aksyon na maaaring gawin sa request/transaksyong ito.',
    consequences: [],
    confirmLabel: '',
    triggerLabel: '',
  };
}

/* ---------------- Amount helpers ---------------- */

/** Total for a matched transaction (agreed price locked at accept time). */
export function requestTotal(outcome: PurchaseOutcome): number {
  if (outcome.kind === 'matched') return outcome.transaction.totalAmount;
  // Pre-match, there's no agreed price yet — nothing to total against.
  return 0;
}

/** Sum of what's been recorded as paid on a matched transaction. */
export function amountPaid(outcome: PurchaseOutcome): number {
  if (outcome.kind !== 'matched') return 0;
  const payment = outcome.transaction.payment;
  if (!payment || payment.status !== 'Confirmed') return 0;
  return payment.amount;
}

/** What remains due. */
export function balanceDue(outcome: PurchaseOutcome): number {
  return Math.max(0, requestTotal(outcome) - amountPaid(outcome));
}

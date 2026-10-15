import type { CreateCropListingInput, PhotoType } from '@/types/crop-listing';
import type { PaymentMode } from '@/types/transaction';

/**
 * What the phone can save while offline and send once the signal returns.
 * `buyer_payment` is the buyer's payment record plus the "I sent it" confirm,
 * `buyer_confirm_payment` is the confirm alone, `farmer_confirm_payment` is the
 * farmer's "received" confirm.
 */
export type OutboxPayloads = {
  create_listing: {
    /** The peso the farmer saw on the cached feed. The server only compares it, it never stores it. */
    seenPricePerKg: number | null;
    input: CreateCropListingInput;
    photos: { type: PhotoType; uri: string }[];
  };
  purchase_request: { listingId: string; requestedQuantityKg: number };
  buyer_payment: {
    transactionId: string;
    mode: PaymentMode;
    amount: number;
    gcashReference?: string;
  };
  /** The buyer's "I sent it" confirm on a payment that was already recorded. */
  buyer_confirm_payment: { paymentId: string };
  farmer_confirm_payment: { paymentId: string };
};

export type OutboxKind = keyof OutboxPayloads;

/**
 * pending: waiting for a signal. sending: in flight (reset to pending if the
 * app dies mid-send). needs_review: the server refused because the peso on the
 * feed changed, the user has to look at it. failed: refused for good, or ran
 * out of attempts.
 */
export type OutboxStatus = 'pending' | 'sending' | 'needs_review' | 'failed';

export type OutboxItem<K extends OutboxKind = OutboxKind> = {
  /** Doubles as the client request id the server uses to spot a repeat. */
  id: string;
  userId: string;
  kind: K;
  payload: OutboxPayloads[K];
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  createdAt: number;
};

export type OutboxHandlers = {
  [K in OutboxKind]: (payload: OutboxPayloads[K], clientRequestId: string) => Promise<void>;
};

export type NewOutboxItem<K extends OutboxKind = OutboxKind> = Pick<
  OutboxItem<K>,
  'id' | 'userId' | 'kind' | 'payload'
>;

export interface OutboxStore {
  /** Saves the item. A second call with the same id is ignored. */
  enqueue(item: NewOutboxItem): Promise<void>;
  /** Pending items for this user, oldest first. */
  listPending(userId: string): Promise<OutboxItem[]>;
  /** Everything still on the phone for this user, oldest first. */
  listAll(userId: string): Promise<OutboxItem[]>;
  markSending(id: string): Promise<void>;
  markPending(id: string, attempts: number, error: string): Promise<void>;
  markNeedsReview(id: string, error: string): Promise<void>;
  markFailed(id: string, attempts: number, error: string): Promise<void>;
  /** Gives the item a new payload and puts it back in the queue with a fresh attempt count. */
  requeue(id: string, payload: unknown): Promise<void>;
  remove(id: string): Promise<void>;
  /** Puts items left in 'sending' by a killed app back to pending. */
  resetSending(): Promise<void>;
}

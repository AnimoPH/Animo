/**
 * Purchase request domain types — maps the ANIMO Data Dictionary §7
 * PURCHASEREQUEST table (supabase/migrations/0001_full_data_dictionary_schema.sql,
 * hardened by 0009_purchase_request_workflow.sql) to the shapes the buyer/farmer
 * request screens use.
 *
 * `cancelDeadline` is server-set (submitted_at + 30s, see the
 * purchaserequest_set_cancel_deadline_trigger in 0001). It is the end of
 * the free cancel period, not the last moment a buyer may cancel. A cancel
 * is late when `cancelledAt` is after `cancelDeadline`. Never compute or
 * hardcode this window client-side.
 */

export type PurchaseRequestStatus =
  | 'Pending'
  | 'Accepted'
  | 'Partially_Accepted'
  | 'Rejected'
  | 'Cancelled'
  | 'No_Quantity_Remaining';

export const PURCHASE_REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  Pending: 'Hinihintay ang Pagtanggap',
  Accepted: 'Tinanggap',
  Partially_Accepted: 'Bahagyang Tinanggap',
  Rejected: 'Tinanggihan',
  Cancelled: 'Nakansela',
  No_Quantity_Remaining: 'Naubos na ang Stock',
};

export const PURCHASE_REQUEST_STATUS_LABELS_EN: Record<PurchaseRequestStatus, string> = {
  Pending: 'Pending Acceptance',
  Accepted: 'Accepted',
  Partially_Accepted: 'Partially Accepted',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
  No_Quantity_Remaining: 'Stock Depleted',
};

export type PurchaseRequest = {
  id: string;
  listingId: string;
  buyerId: string;
  requestedQuantityKg: number;
  acceptedQuantityKg: number | null;
  status: PurchaseRequestStatus;
  submittedAt: string;
  /** Last row change (status transitions, etc.) — migration 0028. */
  updatedAt: string;
  /** End of the free cancel period (submitted_at + 30 seconds). */
  cancelDeadline: string | null;
  /** Set when the buyer cancels. Late when this is after cancelDeadline. */
  cancelledAt: string | null;
};

/** Payload for `submitPurchaseRequest` — exactly what the buy screen collects. */
export type SubmitPurchaseRequestInput = {
  listingId: string;
  requestedQuantityKg: number;
};

/**
 * True while the purchase request is still Pending. The buyer may cancel
 * until the farmer accepts. `cancelDeadline` is the free period, not a
 * permission check. The RPC remains the real enforcement.
 */
export function canCancelPurchaseRequest(
  request: Pick<PurchaseRequest, 'status'>,
): boolean {
  return request.status === 'Pending';
}

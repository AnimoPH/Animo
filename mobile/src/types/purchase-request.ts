/**
 * Purchase request domain types — maps the ANIMO Data Dictionary §7
 * PURCHASEREQUEST table (supabase/migrations/0001_full_data_dictionary_schema.sql,
 * hardened by 0009_purchase_request_workflow.sql) to the shapes the buyer/farmer
 * request screens use.
 *
 * `cancelDeadline` is server-set (submitted_at + 30s, see the
 * purchaserequest_set_cancel_deadline_trigger in 0001) — never compute or
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
  cancelDeadline: string | null;
};

/** Payload for `submitPurchaseRequest` — exactly what the bid screen collects. */
export type SubmitPurchaseRequestInput = {
  listingId: string;
  requestedQuantityKg: number;
};

/**
 * Mirrors `cancel_purchase_request`'s own guard, so the UI can gray the
 * cancel button out before the RPC even runs. The RPC's own check is still
 * the real enforcement — this is a display-only convenience.
 */
export function canCancelPurchaseRequest(
  request: Pick<PurchaseRequest, 'status' | 'cancelDeadline'>,
  now: number = Date.now(),
): boolean {
  if (request.status !== 'Pending' || !request.cancelDeadline) return false;
  return now < new Date(request.cancelDeadline).getTime();
}

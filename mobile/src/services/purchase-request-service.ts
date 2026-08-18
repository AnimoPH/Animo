import { requireAuthUserId } from '@/services/crop-listing-service';
import { supabase } from '@/lib/supabase';
import type { PurchaseRequest, PurchaseRequestStatus, SubmitPurchaseRequestInput } from '@/types/purchase-request';

/**
 * Purchase request service — `purchaserequest` INSERT/SELECT stay direct
 * client calls (RLS-scoped by migration 0009: buyers can insert/select their
 * own rows, farmers can select rows on listings they own); every status
 * transition (accept/reject/cancel) goes through the SECURITY DEFINER RPCs
 * added in that same migration, since direct UPDATE is revoked entirely.
 */

export type PurchaseRequestRow = {
  request_id: string;
  listing_id: string;
  buyer_id: string;
  requested_quantity_kg: number;
  status: PurchaseRequestStatus;
  accepted_quantity_kg: number | null;
  submitted_at: string;
  cancel_deadline: string | null;
};

export const PURCHASE_REQUEST_COLUMNS =
  'request_id, listing_id, buyer_id, requested_quantity_kg, status, accepted_quantity_kg, submitted_at, cancel_deadline' as const;

export function mapPurchaseRequest(row: PurchaseRequestRow): PurchaseRequest {
  return {
    id: row.request_id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    requestedQuantityKg: Number(row.requested_quantity_kg),
    acceptedQuantityKg: row.accepted_quantity_kg === null ? null : Number(row.accepted_quantity_kg),
    status: row.status,
    submittedAt: row.submitted_at,
    cancelDeadline: row.cancel_deadline,
  };
}

/**
 * Submits a new purchase request. RLS ("Buyers can submit purchase
 * requests") pins buyer_id to the caller and forces status='Pending'; the
 * purchaserequest_validate_availability trigger (0009) rejects requests
 * against a non-Available listing or a quantity beyond what remains, and
 * the purchaserequest_one_active_per_buyer_listing unique index (0010)
 * rejects a second active request from the same buyer on the same listing.
 */
export async function submitPurchaseRequest(input: SubmitPurchaseRequestInput): Promise<PurchaseRequest> {
  const buyerId = await requireAuthUserId();

  if (!(input.requestedQuantityKg > 0)) {
    throw new Error('Dapat mas malaki sa 0 ang dami na hihilingin.');
  }

  const { data, error } = await supabase
    .from('purchaserequest')
    .insert({
      listing_id: input.listingId,
      buyer_id: buyerId,
      requested_quantity_kg: input.requestedQuantityKg,
    })
    .select(PURCHASE_REQUEST_COLUMNS)
    .single();

  if (error) {
    // Postgres unique_violation on purchaserequest_one_active_per_buyer_listing.
    if (error.code === '23505') {
      throw new Error('May aktibo ka nang request sa listing na ito. Hintayin munang sagutin o kanselahin ito bago mag-request muli.');
    }
    throw error;
  }
  return mapPurchaseRequest(data as PurchaseRequestRow);
}

/** The signed-in buyer's own requests, most recent first. */
export async function fetchBuyerPurchaseRequests(): Promise<PurchaseRequest[]> {
  const buyerId = await requireAuthUserId();

  const { data, error } = await supabase
    .from('purchaserequest')
    .select(PURCHASE_REQUEST_COLUMNS)
    .eq('buyer_id', buyerId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data as PurchaseRequestRow[]).map(mapPurchaseRequest);
}

/**
 * The signed-in buyer's active (Pending/Accepted/Partially_Accepted) request
 * on a given listing, if any — mirrors the
 * purchaserequest_one_active_per_buyer_listing unique index (0010) so the UI
 * can grey out "Bumili" before the buyer ever taps it.
 */
export async function fetchMyActiveRequestForListing(listingId: string): Promise<PurchaseRequest | null> {
  const buyerId = await requireAuthUserId();

  const { data, error } = await supabase
    .from('purchaserequest')
    .select(PURCHASE_REQUEST_COLUMNS)
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .in('status', ['Pending', 'Accepted', 'Partially_Accepted'])
    .maybeSingle();

  if (error) throw error;
  return data ? mapPurchaseRequest(data as PurchaseRequestRow) : null;
}

/** One request by id — RLS restricts this to the buyer who sent it or the farmer who owns the listing. */
export async function fetchPurchaseRequest(id: string): Promise<PurchaseRequest | null> {
  const { data, error } = await supabase
    .from('purchaserequest')
    .select(PURCHASE_REQUEST_COLUMNS)
    .eq('request_id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapPurchaseRequest(data as PurchaseRequestRow) : null;
}

/** Requests against every listing the signed-in farmer owns (RLS: "Farmers view requests on their listings"). */
export async function fetchFarmerPurchaseRequests(): Promise<PurchaseRequest[]> {
  const { data, error } = await supabase
    .from('purchaserequest')
    .select(PURCHASE_REQUEST_COLUMNS)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data as PurchaseRequestRow[]).map(mapPurchaseRequest);
}

/** Requests against one specific listing (farmer's own Orders tab). */
export async function fetchListingPurchaseRequests(listingId: string): Promise<PurchaseRequest[]> {
  const { data, error } = await supabase
    .from('purchaserequest')
    .select(PURCHASE_REQUEST_COLUMNS)
    .eq('listing_id', listingId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data as PurchaseRequestRow[]).map(mapPurchaseRequest);
}

/** Farmer accepts (fully or partially) a pending request. Returns the new transaction_id. */
export async function acceptPurchaseRequest(requestId: string, acceptedQuantityKg: number): Promise<string> {
  if (!(acceptedQuantityKg > 0)) {
    throw new Error('Dapat mas malaki sa 0 ang tatanggaping dami.');
  }

  const { data, error } = await supabase.rpc('accept_purchase_request', {
    p_request_id: requestId,
    p_accepted_quantity_kg: acceptedQuantityKg,
  });

  if (error) throw error;
  return data as string;
}

/** Farmer rejects a still-pending request outright. */
export async function rejectPurchaseRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('reject_purchase_request', { p_request_id: requestId });
  if (error) throw error;
}

/** Buyer cancels their own still-pending request, only inside the server-set cancel_deadline. */
export async function cancelPurchaseRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_purchase_request', { p_request_id: requestId });
  if (error) throw error;
}

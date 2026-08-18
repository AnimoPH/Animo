import { formatPeso } from '@/constants/marketplace';
import { fetchCropListingsByIds, fetchMyCropListings } from '@/services/crop-listing-service';
import { fetchFarmerPurchaseRequests } from '@/services/purchase-request-service';
import {
  fetchCounterpartNames,
  fetchFarmerPurchaseOutcomes,
  fetchFarmerTransactions,
} from '@/services/transaction-service';
import { varietyLabel, type CropListing } from '@/types/crop-listing';
import {
  deriveDisplayStage,
  requestTotal,
  type DisplayStage,
  type PurchaseOutcome,
  type TransactionMatchStatus,
} from '@/types/transaction';

const TERMINAL_TRANSACTION_STATUSES: TransactionMatchStatus[] = ['Completed', 'Cancelled', 'Failed'];

export type FarmerHomeStats = {
  activeListings: number;
  pendingRequests: number;
  pendingTransactions: number;
};

export type FarmerHomeActivity = {
  id: string;
  buyer: string;
  variety: string;
  weight: string;
  amount: string;
  stage: DisplayStage;
};

export type FarmerHomeData = {
  stats: FarmerHomeStats;
  activities: FarmerHomeActivity[];
};

function toHomeActivity(
  outcome: PurchaseOutcome,
  listing: CropListing | undefined,
  buyerName?: string,
): FarmerHomeActivity {
  const stage = deriveDisplayStage(outcome);
  const quantityKg =
    outcome.kind === 'matched' ? outcome.transaction.quantityKg : outcome.request.requestedQuantityKg;
  const pricePerKg =
    outcome.kind === 'matched' ? outcome.transaction.agreedPricePerKg : (listing?.pricePerKg ?? 0);
  const total = outcome.kind === 'matched' ? requestTotal(outcome) : pricePerKg * quantityKg;

  return {
    id: outcome.kind === 'matched' ? outcome.transaction.id : outcome.request.listingId,
    buyer: buyerName || (outcome.kind === 'matched' ? 'Mamimili' : 'Bagong Mamimili'),
    variety: listing ? varietyLabel(listing) : 'Palay',
    weight: `${quantityKg} kg`,
    amount: formatPeso(total),
    stage,
  };
}

/** Farmer Tahanan — live stats and recent activity from existing purchase/transaction data. */
export async function fetchFarmerHomeData(): Promise<FarmerHomeData> {
  const [listings, requests, transactions, outcomes] = await Promise.all([
    fetchMyCropListings(),
    fetchFarmerPurchaseRequests(),
    fetchFarmerTransactions(),
    fetchFarmerPurchaseOutcomes(),
  ]);

  const buyerIds = outcomes
    .map((o) => (o.kind === 'matched' ? o.transaction.buyerId : o.request.buyerId))
    .filter((id): id is string => Boolean(id));

  const [listingsById, buyerNamesById] = await Promise.all([
    fetchCropListingsByIds(outcomes.map((o) => o.request.listingId)),
    fetchCounterpartNames(buyerIds),
  ]);

  const activities = outcomes.slice(0, 3).map((outcome) => {
    const buyerId = outcome.kind === 'matched' ? outcome.transaction.buyerId : outcome.request.buyerId;
    return toHomeActivity(outcome, listingsById.get(outcome.request.listingId), buyerNamesById.get(buyerId));
  });

  return {
    stats: {
      activeListings: listings.filter((l) => l.status === 'Available').length,
      pendingRequests: requests.filter((r) => r.status === 'Pending').length,
      pendingTransactions: transactions.filter((t) => !TERMINAL_TRANSACTION_STATUSES.includes(t.status)).length,
    },
    activities,
  };
}

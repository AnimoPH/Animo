import { supabase } from '@/lib/supabase';
import {
  LISTING_COLUMNS,
  mapListing,
  type CropListingRow,
} from '@/services/crop-listing-service';
import { varietyLabel, type CropListing, type DeclaredVariety } from '@/types/crop-listing';

export type FarmerPublicProfile = {
  farmerId: string;
  name: string;
  location: string;
  memberSince: string;
  verified: boolean;
  totalSoldKg: number;
  completedTransactionsCount: number;
  commonlySoldVarieties: string[];
  credibilityScorePct: number;
  averageRating: number;
  totalReviews: number;
  /** Share of ratings that are 4–5 stars; null when there are no reviews yet. */
  positiveFeedbackPct: number | null;
  comments: string[];
};

const FILIPINO_MONTHS = [
  'Enero',
  'Pebrero',
  'Marso',
  'Abril',
  'Mayo',
  'Hunyo',
  'Hulyo',
  'Agosto',
  'Setyembre',
  'Oktubre',
  'Nobyembre',
  'Disyembre',
];

function formatMemberSince(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return `${FILIPINO_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function averageScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round((sum / scores.length) * 10) / 10;
}

function positiveShare(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const positive = scores.filter((score) => score >= 4).length;
  return Math.round((positive / scores.length) * 100);
}

async function fetchAvailableListings(): Promise<CropListing[]> {
  const { data, error } = await supabase
    .from('croplisting')
    .select(LISTING_COLUMNS)
    .eq('status', 'Available')
    .not('computed_price_per_kg', 'is', null)
    .gt('computed_price_per_kg', 0);

  if (error) throw error;
  return (data as CropListingRow[]).map(mapListing);
}

function emptyProfile(partial?: Partial<FarmerPublicProfile>): FarmerPublicProfile {
  return {
    farmerId: '',
    name: 'Magsasaka',
    location: '',
    memberSince: '',
    verified: false,
    totalSoldKg: 0,
    completedTransactionsCount: 0,
    commonlySoldVarieties: [],
    credibilityScorePct: 0,
    averageRating: 0,
    totalReviews: 0,
    positiveFeedbackPct: null,
    comments: [],
    ...partial,
  };
}

/**
 * Privacy-safe public stats for the farmer who owns this listing.
 * Missing data is zero / empty — never padded with demo personas.
 */
export async function fetchFarmerPublicProfile(
  listingId: string,
  listing?: CropListing | null,
): Promise<FarmerPublicProfile> {
  const { data: listingData, error: listingError } = await supabase
    .from('croplisting')
    .select('farmer_id, date_listed, declared_variety, declared_variety_custom')
    .eq('listing_id', listingId)
    .maybeSingle();

  if (listingError) throw listingError;

  const farmerId = listingData?.farmer_id;
  if (!farmerId) {
    return emptyProfile({
      commonlySoldVarieties: listing ? [varietyLabel(listing)] : [],
    });
  }

  const [
    { data: farmerUserData, error: nameError },
    { data: pastListings, error: listingsError },
    { data: transactions, error: txError },
    { data: credData, error: credError },
    { data: ratingsData, error: ratingError },
  ] = await Promise.all([
    supabase.from('listing_farmer_public').select('farmer_name').eq('listing_id', listingId).maybeSingle(),
    supabase
      .from('croplisting')
      .select(
        'declared_variety, declared_variety_custom, gross_weight_kg, tare_weight_kg, remaining_quantity_kg, date_listed, status',
      )
      .eq('farmer_id', farmerId),
    supabase.from('transactionmatch').select('quantity_kg').eq('farmer_id', farmerId).eq('status', 'Completed'),
    supabase.from('credibilityscore').select('pass_rate_pct').eq('farmer_id', farmerId).maybeSingle(),
    supabase.from('rating').select('score, comment').eq('rated_id', farmerId),
  ]);

  if (nameError) throw nameError;
  if (listingsError) throw listingsError;
  if (txError) throw txError;
  if (credError) throw credError;
  if (ratingError) throw ratingError;

  const completed = transactions ?? [];
  const completedCount = completed.length;
  const totalSold = completed.reduce((acc, row) => acc + (Number(row.quantity_kg) || 0), 0);

  const varietyCountMap = new Map<string, number>();
  let oldestListingAt: string | null = listingData.date_listed ?? null;
  for (const item of pastListings ?? []) {
    const label = varietyLabel({
      declaredVariety: item.declared_variety as DeclaredVariety,
      declaredVarietyCustom: item.declared_variety_custom,
    });
    varietyCountMap.set(label, (varietyCountMap.get(label) ?? 0) + 1);
    if (!oldestListingAt || item.date_listed < oldestListingAt) {
      oldestListingAt = item.date_listed;
    }
  }
  if (listing) {
    const currentLabel = varietyLabel(listing);
    varietyCountMap.set(currentLabel, (varietyCountMap.get(currentLabel) ?? 0) + 1);
  }

  const commonVarieties = Array.from(varietyCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 3);

  const scores = (ratingsData ?? []).map((row) => Number(row.score)).filter((score) => Number.isFinite(score));
  const comments = (ratingsData ?? [])
    .map((row) => (typeof row.comment === 'string' ? row.comment.trim() : ''))
    .filter((comment) => comment.length > 0);

  return {
    farmerId,
    name: farmerUserData?.farmer_name?.trim() || 'Magsasaka',
    location: '',
    memberSince: formatMemberSince(oldestListingAt),
    verified: false,
    totalSoldKg: totalSold,
    completedTransactionsCount: completedCount,
    commonlySoldVarieties: commonVarieties,
    credibilityScorePct: credData ? Number(credData.pass_rate_pct) || 0 : 0,
    averageRating: averageScore(scores),
    totalReviews: scores.length,
    positiveFeedbackPct: positiveShare(scores),
    comments,
  };
}

export type RankedFarmer = FarmerPublicProfile & {
  listingId: string;
  rank: number;
  rankBadge: string;
  badgeLabel: string;
};

/** Farmers with at least one Available listing, ranked by completed transactions then volume. */
export async function fetchTopRankedFarmers(): Promise<RankedFarmer[]> {
  const availableListings = await fetchAvailableListings();
  if (availableListings.length === 0) return [];

  const listingIds = availableListings.map((listing) => listing.id);
  const { data: publicRows, error: publicError } = await supabase
    .from('listing_farmer_public')
    .select('listing_id, farmer_id, farmer_name')
    .in('listing_id', listingIds);

  if (publicError) throw publicError;

  const farmers = new Map<
    string,
    { name: string; listingId: string; varieties: Set<string>; oldestListed: string | null }
  >();
  const listingById = new Map(availableListings.map((listing) => [listing.id, listing]));

  for (const row of publicRows ?? []) {
    const listing = listingById.get(row.listing_id);
    const existing = farmers.get(row.farmer_id);
    const variety = listing ? varietyLabel(listing) : null;
    if (!existing) {
      farmers.set(row.farmer_id, {
        name: row.farmer_name?.trim() || 'Magsasaka',
        listingId: row.listing_id,
        varieties: new Set(variety ? [variety] : []),
        oldestListed: listing?.dateListed ?? null,
      });
    } else if (variety) {
      existing.varieties.add(variety);
    }
  }

  const farmerIds = [...farmers.keys()];
  if (farmerIds.length === 0) return [];

  const [{ data: transactions, error: txError }, { data: ratings, error: ratingError }] = await Promise.all([
    supabase.from('transactionmatch').select('farmer_id, quantity_kg').in('farmer_id', farmerIds).eq('status', 'Completed'),
    supabase.from('rating').select('rated_id, score, comment').in('rated_id', farmerIds),
  ]);

  if (txError) throw txError;
  if (ratingError) throw ratingError;

  const profiles: FarmerPublicProfile[] = farmerIds.map((farmerId) => {
    const meta = farmers.get(farmerId)!;
    const farmerTxns = (transactions ?? []).filter((row) => row.farmer_id === farmerId);
    const farmerRatings = (ratings ?? []).filter((row) => row.rated_id === farmerId);
    const scores = farmerRatings.map((row) => Number(row.score)).filter((score) => Number.isFinite(score));
    const comments = farmerRatings
      .map((row) => (typeof row.comment === 'string' ? row.comment.trim() : ''))
      .filter((comment) => comment.length > 0);

    return {
      farmerId,
      name: meta.name,
      location: '',
      memberSince: formatMemberSince(meta.oldestListed),
      verified: false,
      totalSoldKg: farmerTxns.reduce((acc, row) => acc + (Number(row.quantity_kg) || 0), 0),
      completedTransactionsCount: farmerTxns.length,
      commonlySoldVarieties: [...meta.varieties].slice(0, 3),
      credibilityScorePct: 0,
      averageRating: averageScore(scores),
      totalReviews: scores.length,
      positiveFeedbackPct: positiveShare(scores),
      comments,
    };
  });

  return profiles
    .sort((a, b) => {
      if (b.completedTransactionsCount !== a.completedTransactionsCount) {
        return b.completedTransactionsCount - a.completedTransactionsCount;
      }
      return b.totalSoldKg - a.totalSoldKg;
    })
    .map((profile, index) => {
      const rank = index + 1;
      const meta = farmers.get(profile.farmerId)!;
      return {
        ...profile,
        listingId: meta.listingId,
        rank,
        rankBadge: `#${rank}`,
        badgeLabel: rank === 1 ? 'Nangunguna' : '',
      };
    });
}

export async function searchFarmerProfiles(query: string): Promise<RankedFarmer[]> {
  const farmers = await fetchTopRankedFarmers();
  const q = query.trim().toLowerCase();
  if (!q) return farmers;
  return farmers.filter(
    (farmer) =>
      farmer.name.toLowerCase().includes(q) ||
      farmer.location.toLowerCase().includes(q) ||
      farmer.commonlySoldVarieties.some((variety) => variety.toLowerCase().includes(q)),
  );
}

export type MarketPopularityInsight = {
  topVariety: string;
  topVarietyShare: string;
  averagePricePerKg: number;
  activeFarmersCount: number;
  totalVolumeMonthKg: number;
};

/** Live marketplace snapshot from Available listings — returns null when the market is empty. */
export async function fetchMarketPopularityInsights(): Promise<MarketPopularityInsight | null> {
  const available = await fetchAvailableListings();
  if (available.length === 0) return null;

  const varietyCounts = new Map<string, number>();
  let priceSum = 0;
  let pricedCount = 0;
  let volumeKg = 0;
  const farmerNames = new Set<string>();

  const listingIds = available.map((listing) => listing.id);
  const { data: publicRows } = await supabase
    .from('listing_farmer_public')
    .select('listing_id, farmer_id')
    .in('listing_id', listingIds);

  for (const row of publicRows ?? []) {
    farmerNames.add(row.farmer_id);
  }

  for (const listing of available) {
    const label = varietyLabel(listing);
    varietyCounts.set(label, (varietyCounts.get(label) ?? 0) + 1);
    if (listing.pricePerKg && listing.pricePerKg > 0) {
      priceSum += listing.pricePerKg;
      pricedCount += 1;
    }
    volumeKg += listing.remainingQuantityKg;
  }

  const [topVariety, topCount] = [...varietyCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['Palay', 0];
  const sharePct = available.length > 0 ? Math.round((topCount / available.length) * 100) : 0;

  return {
    topVariety,
    topVarietyShare: `${sharePct}% ng mga listing`,
    averagePricePerKg: pricedCount > 0 ? Math.round((priceSum / pricedCount) * 100) / 100 : 0,
    activeFarmersCount: farmerNames.size,
    totalVolumeMonthKg: volumeKg,
  };
}

/**
 * Buyer trust stats — there is no buyer-side equivalent of `credibilityscore`
 * (that table is farmer-only, see 0001 §11), so this is computed on the fly
 * from `transactionmatch` (completed sales to this buyer) and `rating`
 * (`rated_id` = this buyer), the same two tables `fetchFarmerPublicProfile`
 * already reads for the farmer-side trust stat above.
 */
export type BuyerTrustStats = {
  buyerId: string;
  completedTransactionsCount: number;
  totalBoughtKg: number;
  averageRating: number;
  totalReviews: number;
  /** 0–1, derived from completed-transaction count and average rating — a display-order aid, not a stored score. */
  reliabilityScore: number;
};

function computeBuyerTrustStats(
  buyerId: string,
  transactions: { quantity_kg: number }[],
  ratings: { score: number }[],
): BuyerTrustStats {
  const completedTransactionsCount = transactions.length;
  const totalBoughtKg = transactions.reduce((sum, t) => sum + (Number(t.quantity_kg) || 0), 0);
  const averageRating =
    ratings.length > 0 ? ratings.reduce((sum, r) => sum + Number(r.score), 0) / ratings.length : 0;

  const transactionSignal = Math.min(1, completedTransactionsCount / 20);
  const ratingSignal = ratings.length > 0 ? averageRating / 5 : 0.5;
  const reliabilityScore =
    ratings.length > 0 ? transactionSignal * 0.5 + ratingSignal * 0.5 : transactionSignal * 0.5 + 0.25;

  return {
    buyerId,
    completedTransactionsCount,
    totalBoughtKg,
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews: ratings.length,
    reliabilityScore,
  };
}

export async function fetchBuyerTrustStats(buyerId: string): Promise<BuyerTrustStats> {
  const [{ data: transactions, error: txError }, { data: ratings, error: ratingError }] = await Promise.all([
    supabase.from('transactionmatch').select('quantity_kg').eq('buyer_id', buyerId).eq('status', 'Completed'),
    supabase.from('rating').select('score').eq('rated_id', buyerId),
  ]);

  if (txError) throw txError;
  if (ratingError) throw ratingError;

  return computeBuyerTrustStats(buyerId, transactions ?? [], ratings ?? []);
}

export async function fetchBuyerRatingComments(buyerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('rating')
    .select('comment')
    .eq('rated_id', buyerId)
    .not('comment', 'is', null);
  if (error) throw error;
  return (data ?? []).map((row) => row.comment as string).filter((comment) => comment.trim().length > 0);
}

export async function fetchBuyerTrustStatsBatch(buyerIds: string[]): Promise<Map<string, BuyerTrustStats>> {
  const uniqueIds = [...new Set(buyerIds)];
  if (uniqueIds.length === 0) return new Map();

  const [{ data: transactions, error: txError }, { data: ratings, error: ratingError }] = await Promise.all([
    supabase.from('transactionmatch').select('buyer_id, quantity_kg').in('buyer_id', uniqueIds).eq('status', 'Completed'),
    supabase.from('rating').select('rated_id, score').in('rated_id', uniqueIds),
  ]);

  if (txError) throw txError;
  if (ratingError) throw ratingError;

  const statsByBuyer = new Map<string, BuyerTrustStats>();
  for (const buyerId of uniqueIds) {
    const buyerTransactions = (transactions ?? []).filter((t) => t.buyer_id === buyerId);
    const buyerRatings = (ratings ?? []).filter((r) => r.rated_id === buyerId);
    statsByBuyer.set(buyerId, computeBuyerTrustStats(buyerId, buyerTransactions, buyerRatings));
  }
  return statsByBuyer;
}

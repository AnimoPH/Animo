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

function positiveShare(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const positive = scores.filter((score) => score >= 4).length;
  return Math.round((positive / scores.length) * 100);
}

/**
 * One row from `user_trust_profile`, read via the public `get_trust_profile`
 * RPC (single user, includes member_since/barangay) or directly from the
 * table (batch lookups — same "anyone can view" RLS policy, just without
 * the join the RPC does for display fields). See migration 0022.
 */
export type TrustProfile = {
  userId: string;
  role: 'Farmer' | 'Buyer';
  completedTransactions: number;
  averageRating: number;
  ratingCount: number;
  completionRatePct: number | null;
  activeListingsCount: number | null;
  totalSoldKg: number | null;
  paymentConfirmationRatePct: number | null;
  purchaseRequestCancelRatePct: number | null;
  totalBoughtKg: number | null;
  memberSince: string | null;
  barangay: string | null;
};

function mapTrustProfileRow(row: Record<string, unknown>): TrustProfile {
  const num = (value: unknown): number => Number(value) || 0;
  const nullableNum = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value));
  return {
    userId: row.user_id as string,
    role: row.role as 'Farmer' | 'Buyer',
    completedTransactions: num(row.completed_transactions),
    averageRating: num(row.average_rating),
    ratingCount: num(row.rating_count),
    completionRatePct: nullableNum(row.completion_rate_pct),
    activeListingsCount: nullableNum(row.active_listings_count),
    totalSoldKg: nullableNum(row.total_sold_kg),
    paymentConfirmationRatePct: nullableNum(row.payment_confirmation_rate_pct),
    purchaseRequestCancelRatePct: nullableNum(row.purchase_request_cancel_rate_pct),
    totalBoughtKg: nullableNum(row.total_bought_kg),
    memberSince: (row.member_since as string | undefined) ?? null,
    barangay: (row.barangay as string | undefined) ?? null,
  };
}

/** Single-user public trust lookup — includes member_since/barangay via the RPC's join. */
export async function fetchTrustProfile(userId: string): Promise<TrustProfile | null> {
  const { data, error } = await supabase.rpc('get_trust_profile', { p_user_id: userId }).maybeSingle();
  if (error) throw error;
  return data ? mapTrustProfileRow(data as Record<string, unknown>) : null;
}

/** Batch public trust lookup — direct table read (same RLS policy as the RPC), no member_since/barangay. */
export async function fetchTrustProfilesBatch(userIds: string[]): Promise<Map<string, TrustProfile>> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase.from('user_trust_profile').select('*').in('user_id', uniqueIds);
  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.user_id as string, mapTrustProfileRow(row as Record<string, unknown>)]));
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
    trustProfile,
    { data: ratingsData, error: ratingError },
  ] = await Promise.all([
    supabase.from('listing_farmer_public').select('farmer_name').eq('listing_id', listingId).maybeSingle(),
    supabase
      .from('croplisting')
      .select('declared_variety, declared_variety_custom')
      .eq('farmer_id', farmerId),
    fetchTrustProfile(farmerId),
    supabase.from('rating').select('score, comment').eq('rated_id', farmerId),
  ]);

  if (nameError) throw nameError;
  if (listingsError) throw listingsError;
  if (ratingError) throw ratingError;

  const varietyCountMap = new Map<string, number>();
  for (const item of pastListings ?? []) {
    const label = varietyLabel({
      declaredVariety: item.declared_variety as DeclaredVariety,
      declaredVarietyCustom: item.declared_variety_custom,
    });
    varietyCountMap.set(label, (varietyCountMap.get(label) ?? 0) + 1);
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
    location: trustProfile?.barangay ?? '',
    memberSince: formatMemberSince(trustProfile?.memberSince ?? listingData.date_listed),
    verified: false,
    totalSoldKg: trustProfile?.totalSoldKg ?? 0,
    completedTransactionsCount: trustProfile?.completedTransactions ?? 0,
    commonlySoldVarieties: commonVarieties,
    averageRating: trustProfile?.averageRating ?? 0,
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

  const farmers = new Map<string, { name: string; listingId: string; varieties: Set<string> }>();
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
      });
    } else if (variety) {
      existing.varieties.add(variety);
    }
  }

  const farmerIds = [...farmers.keys()];
  if (farmerIds.length === 0) return [];

  const trustByFarmer = await fetchTrustProfilesBatch(farmerIds);

  const profiles: FarmerPublicProfile[] = farmerIds.map((farmerId) => {
    const meta = farmers.get(farmerId)!;
    const trust = trustByFarmer.get(farmerId);

    return {
      farmerId,
      name: meta.name,
      location: '',
      memberSince: '',
      verified: false,
      totalSoldKg: trust?.totalSoldKg ?? 0,
      completedTransactionsCount: trust?.completedTransactions ?? 0,
      commonlySoldVarieties: [...meta.varieties].slice(0, 3),
      averageRating: trust?.averageRating ?? 0,
      totalReviews: trust?.ratingCount ?? 0,
      positiveFeedbackPct: null,
      comments: [],
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

export type PopularVariety = {
  name: string;
  avgPricePerKg: number;
  listingCount: number;
};

export type MarketPopularityInsight = {
  topVariety: string;
  topVarietyShare: string;
  averagePricePerKg: number;
  activeFarmersCount: number;
  totalVolumeMonthKg: number;
  popularVarieties: PopularVariety[];
};

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Live marketplace snapshot from Available listings — returns null when the market is empty. */
export async function fetchMarketPopularityInsights(): Promise<MarketPopularityInsight | null> {
  const available = await fetchAvailableListings();
  if (available.length === 0) return null;

  const varietyAgg = new Map<string, { priceSum: number; pricedCount: number; listingCount: number }>();
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
    const agg = varietyAgg.get(label) ?? { priceSum: 0, pricedCount: 0, listingCount: 0 };
    agg.listingCount += 1;
    if (listing.pricePerKg && listing.pricePerKg > 0) {
      agg.priceSum += listing.pricePerKg;
      agg.pricedCount += 1;
      priceSum += listing.pricePerKg;
      pricedCount += 1;
    }
    varietyAgg.set(label, agg);
    volumeKg += listing.remainingQuantityKg;
  }

  const popularVarieties = [...varietyAgg.entries()]
    .map(([name, agg]) => ({
      name,
      avgPricePerKg: agg.pricedCount > 0 ? roundPrice(agg.priceSum / agg.pricedCount) : 0,
      listingCount: agg.listingCount,
    }))
    .filter((variety) => variety.avgPricePerKg > 0)
    .sort((a, b) => b.listingCount - a.listingCount || a.name.localeCompare(b.name))
    .slice(0, 5);

  const topEntry = [...varietyAgg.entries()].sort((a, b) => b[1].listingCount - a[1].listingCount)[0];
  const topVariety = topEntry?.[0] ?? 'Palay';
  const sharePct = topEntry ? Math.round((topEntry[1].listingCount / available.length) * 100) : 0;

  return {
    topVariety,
    topVarietyShare: `${sharePct}% ng mga listing`,
    averagePricePerKg: pricedCount > 0 ? roundPrice(priceSum / pricedCount) : 0,
    activeFarmersCount: farmerNames.size,
    totalVolumeMonthKg: volumeKg,
    popularVarieties,
  };
}

/**
 * Buyer trust stats — computed from user_trust_profile (migration 0022) via
 * get_trust_profile()/direct table read, same source data (transactionmatch
 * + rating) the farmer side reads, now precomputed instead of aggregated
 * live on every view.
 */
export type BuyerTrustStats = {
  buyerId: string;
  completedTransactionsCount: number;
  totalBoughtKg: number;
  averageRating: number;
  totalReviews: number;
};

function toBuyerTrustStats(buyerId: string, trust: TrustProfile | undefined): BuyerTrustStats {
  return {
    buyerId,
    completedTransactionsCount: trust?.completedTransactions ?? 0,
    totalBoughtKg: trust?.totalBoughtKg ?? 0,
    averageRating: trust?.averageRating ?? 0,
    totalReviews: trust?.ratingCount ?? 0,
  };
}

export async function fetchBuyerTrustStats(buyerId: string): Promise<BuyerTrustStats> {
  const trust = await fetchTrustProfile(buyerId);
  return toBuyerTrustStats(buyerId, trust ?? undefined);
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

  const trustByBuyer = await fetchTrustProfilesBatch(uniqueIds);
  const statsByBuyer = new Map<string, BuyerTrustStats>();
  for (const buyerId of uniqueIds) {
    statsByBuyer.set(buyerId, toBuyerTrustStats(buyerId, trustByBuyer.get(buyerId)));
  }
  return statsByBuyer;
}

import { supabase } from '@/lib/supabase';

export type MarketPriceFeed = {
  dryBasePerKg: number | null;
  wetBasePerKg: number;
  effectiveDate: string;
};

export type PriceHistoryPoint = {
  month: string;
  pricePerKg: number;
};

export type NfaWindow = {
  windowId: string;
  startDate: string;
  endDate: string | null;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export type LguFarmerRow = {
  farmerId: string;
  name: string;
  barangay: string;
  dateRegistered: string;
  activeListings: number;
  totalListings: number;
};

export type LguBuyerRow = {
  buyerId: string;
  name: string;
  contactNumber: string | null;
  dateRegistered: string;
  accountStatus: string;
  completedTransactions: number;
  totalPurchaseRequests: number;
  reportedReviews: number;
};

export type LguUserProfile = {
  userId: string;
  fullName: string;
  contactNumber: string | null;
  role: string;
  accountStatus: string;
  dateRegistered: string;
  barangay: string | null;
  completedTransactions: number;
  reviewCount: number;
  averageRating: number | null;
};

export type LguUserReview = {
  ratingId: string;
  score: number;
  comment: string | null;
  raterName: string;
  raterRole: string;
  transactionId: string;
  reported: boolean;
  reportReason: string | null;
  createdAt: string;
};

export type LguUserTransaction = {
  transactionId: string;
  variety: string;
  quantityKg: number;
  totalAmount: number;
  partnerName: string;
  dateCompleted: string | null;
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

export function formatPeso(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}

export function formatRegisteredDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return `${FILIPINO_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatReviewDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return `${FILIPINO_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function mapAccountStatus(status: string): 'active' | 'inactive' | 'suspended' {
  if (status === 'Suspended') return 'suspended';
  if (status === 'Active') return 'active';
  return 'inactive';
}

export function mapRoleLabel(role: string): string {
  if (role === 'Farmer') return 'Magsasaka';
  if (role === 'Buyer') return 'Mamimili';
  return role;
}

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function formatSyncTimestamp(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isNfaWindowActiveToday(windows: NfaWindow[]): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  return windows.some((window) => {
    const start = new Date(`${window.startDate}T00:00:00`).getTime();
    const end = window.endDate ? new Date(`${window.endDate}T00:00:00`).getTime() : Infinity;
    return todayMs >= start && todayMs <= end;
  });
}

export async function fetchMarketPriceFeed(): Promise<MarketPriceFeed | null> {
  const { data, error } = await supabase
    .from('marketpricefeed')
    .select('dry_base_price_per_kg, wet_base_price_per_kg, effective_date')
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    dryBasePerKg: data.dry_base_price_per_kg != null ? Number(data.dry_base_price_per_kg) : null,
    wetBasePerKg: Number(data.wet_base_price_per_kg),
    effectiveDate: data.effective_date as string,
  };
}

export async function fetchRizalPriceHistory(limit = 12): Promise<PriceHistoryPoint[]> {
  const { data, error } = await supabase
    .from('palay_price_history')
    .select('price_month, price_per_kg')
    .eq('province', 'Rizal')
    .order('price_month', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? [])
    .map((row) => ({
      month: row.price_month as string,
      pricePerKg: Number(row.price_per_kg),
    }))
    .reverse();
}

export async function syncPsaPrices(): Promise<{
  syncedMonths: number;
  latest: string | null;
  dryBaseRefreshed: boolean;
}> {
  const { data, error } = await supabase.functions.invoke('sync-psa-prices', { method: 'POST' });
  if (error) {
    const message = error.message ?? 'Hindi natapos ang PSA sync.';
    if (/non-2xx|404|not found|failed to send/i.test(message)) {
      throw new Error(
        'Hindi naka-deploy ang sync-psa-prices sa hosted Supabase. Run mula sa mobile/: npx supabase functions deploy sync-psa-prices (at refresh-dry-base kung gusto mo ng model dry base refresh).',
      );
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error as string);

  return {
    syncedMonths: Number(data?.synced_months) || 0,
    latest: (data?.latest as string | null) ?? null,
    dryBaseRefreshed: Boolean(data?.dry_base_refreshed),
  };
}

export async function fetchNfaInterventionWindows(): Promise<NfaWindow[]> {
  const { data, error } = await supabase
    .from('nfa_intervention_window')
    .select('window_id, start_date, end_date')
    .order('start_date', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    windowId: row.window_id as string,
    startDate: row.start_date as string,
    endDate: (row.end_date as string | null) ?? null,
  }));
}

export async function activateNfaInterventionWindow(userId: string): Promise<void> {
  const { error } = await supabase.from('nfa_intervention_window').insert({
    start_date: todayIsoDate(),
    end_date: null,
    toggled_by: userId,
  });
  if (error) throw error;
}

export async function deactivateNfaInterventionWindows(): Promise<void> {
  const windows = await fetchNfaInterventionWindows();
  const activeIds = windows.filter((window) => isNfaWindowActiveToday([window])).map((window) => window.windowId);
  if (activeIds.length === 0) return;

  const { error } = await supabase
    .from('nfa_intervention_window')
    .update({ end_date: todayIsoDate() })
    .in('window_id', activeIds);
  if (error) throw error;
}

export async function fetchLguBarangayCoverage(): Promise<string[]> {
  const { data, error } = await supabase.from('farmer').select('barangay');
  if (error) throw error;

  return [...new Set((data ?? []).map((row) => (row.barangay as string | null)?.trim()).filter(Boolean) as string[])].sort();
}

export async function fetchLguFarmerRegistry(): Promise<LguFarmerRow[]> {
  const [{ data: farmers, error }, { data: listings, error: listingError }] = await Promise.all([
    supabase.from('farmer').select(`
        user_id,
        barangay,
        user:user_id (full_name, date_registered)
      `),
    supabase.from('croplisting').select('farmer_id, status').neq('status', 'Draft'),
  ]);

  if (error) throw error;
  if (listingError) throw listingError;

  const listingsByFarmer = new Map<string, { active: number; total: number }>();
  for (const listing of listings ?? []) {
    const farmerId = listing.farmer_id as string;
    const bucket = listingsByFarmer.get(farmerId) ?? { active: 0, total: 0 };
    bucket.total += 1;
    if (listing.status === 'Available') bucket.active += 1;
    listingsByFarmer.set(farmerId, bucket);
  }

  const rows: LguFarmerRow[] = [];
  for (const farmer of farmers ?? []) {
    const user = asOne(
      farmer.user as
        | { full_name: string; date_registered: string }
        | { full_name: string; date_registered: string }[]
        | null,
    );
    if (!user) continue;

    const farmerId = farmer.user_id as string;
    const counts = listingsByFarmer.get(farmerId);
    if (!counts || counts.total === 0) continue;

    rows.push({
      farmerId,
      name: user.full_name,
      barangay: (farmer.barangay as string | null)?.trim() || 'Hindi nakasaad',
      dateRegistered: user.date_registered,
      activeListings: counts.active,
      totalListings: counts.total,
    });
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchLguBuyerRegistry(): Promise<LguBuyerRow[]> {
  const [{ data: buyers, error }, { data: txns, error: txnError }, { data: requests, error: prError }, { data: reports, error: reportError }] =
    await Promise.all([
      supabase.from('buyer').select(`
          user_id,
          user:user_id (full_name, contact_number, date_registered, account_status)
        `),
      supabase.from('transactionmatch').select('buyer_id').eq('status', 'Completed'),
      supabase.from('purchaserequest').select('buyer_id'),
      supabase.from('rating').select('rated_id').eq('reported', true),
    ]);

  if (error) throw error;
  if (txnError) throw txnError;
  if (prError) throw prError;
  if (reportError) throw reportError;

  const completedByBuyer = new Map<string, number>();
  for (const row of txns ?? []) {
    const id = row.buyer_id as string;
    completedByBuyer.set(id, (completedByBuyer.get(id) ?? 0) + 1);
  }

  const requestsByBuyer = new Map<string, number>();
  for (const row of requests ?? []) {
    const id = row.buyer_id as string;
    requestsByBuyer.set(id, (requestsByBuyer.get(id) ?? 0) + 1);
  }

  const reportsByUser = new Map<string, number>();
  for (const row of reports ?? []) {
    const id = row.rated_id as string;
    reportsByUser.set(id, (reportsByUser.get(id) ?? 0) + 1);
  }

  return (buyers ?? [])
    .map((row) => {
      const user = asOne(row.user as {
        full_name: string;
        contact_number: string | null;
        date_registered: string;
        account_status: string;
      } | {
        full_name: string;
        contact_number: string | null;
        date_registered: string;
        account_status: string;
      }[] | null);
      if (!user) return null;

      const id = row.user_id as string;
      return {
        buyerId: id,
        name: user.full_name,
        contactNumber: user.contact_number,
        dateRegistered: user.date_registered,
        accountStatus: user.account_status,
        completedTransactions: completedByBuyer.get(id) ?? 0,
        totalPurchaseRequests: requestsByBuyer.get(id) ?? 0,
        reportedReviews: reportsByUser.get(id) ?? 0,
      };
    })
    .filter((row): row is LguBuyerRow => row != null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchLguUserProfile(userId: string): Promise<LguUserProfile | null> {
  const { data: user, error } = await supabase
    .from('user')
    .select('user_id, full_name, contact_number, role, account_status, date_registered')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!user) return null;

  let barangay: string | null = null;
  if (user.role === 'Farmer') {
    const { data: farmer, error: farmerError } = await supabase
      .from('farmer')
      .select('barangay')
      .eq('user_id', userId)
      .maybeSingle();
    if (farmerError) throw farmerError;
    barangay = farmer?.barangay?.trim() || 'Hindi nakasaad';
  }

  const [{ data: txns, error: txnError }, { data: ratings, error: ratingError }] = await Promise.all([
    supabase
      .from('transactionmatch')
      .select('transaction_id')
      .eq('status', 'Completed')
      .or(`buyer_id.eq.${userId},farmer_id.eq.${userId}`),
    supabase.from('rating').select('score').eq('rated_id', userId),
  ]);

  if (txnError) throw txnError;
  if (ratingError) throw ratingError;

  const scores = (ratings ?? []).map((row) => Number(row.score));
  const averageRating = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : null;

  return {
    userId: user.user_id as string,
    fullName: user.full_name as string,
    contactNumber: (user.contact_number as string | null) ?? null,
    role: user.role as string,
    accountStatus: user.account_status as string,
    dateRegistered: user.date_registered as string,
    barangay,
    completedTransactions: txns?.length ?? 0,
    reviewCount: scores.length,
    averageRating,
  };
}

export async function fetchLguUserReviews(userId: string): Promise<LguUserReview[]> {
  const { data, error } = await supabase
    .from('rating')
    .select(`
      rating_id,
      score,
      comment,
      reported,
      report_reason,
      transaction_id,
      rater:rater_id (full_name, role),
      transaction:transaction_id (date_completed, created_at)
    `)
    .eq('rated_id', userId);

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const rater = asOne(row.rater as { full_name: string; role: string } | { full_name: string; role: string }[] | null);
      const transaction = asOne(
        row.transaction as
          | { date_completed: string | null; created_at: string }
          | { date_completed: string | null; created_at: string }[]
          | null,
      );
      const reviewDate = transaction?.date_completed ?? transaction?.created_at ?? '';
      return {
        ratingId: row.rating_id as string,
        score: Number(row.score),
        comment: (row.comment as string | null) ?? null,
        raterName: rater?.full_name ?? 'Hindi kilala',
        raterRole: rater?.role ?? '—',
        transactionId: row.transaction_id as string,
        reported: Boolean(row.reported),
        reportReason: (row.report_reason as string | null) ?? null,
        createdAt: reviewDate,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchLguUserTransactions(
  userId: string,
  role: 'farmer' | 'buyer',
): Promise<LguUserTransaction[]> {
  const column = role === 'farmer' ? 'farmer_id' : 'buyer_id';
  const { data, error } = await supabase
    .from('transactionmatch')
    .select(`
      transaction_id,
      quantity_kg,
      total_amount,
      date_completed,
      listing:listing_id (declared_variety, declared_variety_custom),
      buyer:buyer_id (full_name),
      farmer:farmer_id (full_name)
    `)
    .eq(column, userId)
    .eq('status', 'Completed')
    .order('date_completed', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const listing = asOne(
      row.listing as
        | { declared_variety: string; declared_variety_custom: string | null }
        | { declared_variety: string; declared_variety_custom: string | null }[]
        | null,
    );
    const buyer = asOne(row.buyer as { full_name: string } | { full_name: string }[] | null);
    const farmer = asOne(row.farmer as { full_name: string } | { full_name: string }[] | null);
    const variety =
      listing?.declared_variety_custom?.trim() || listing?.declared_variety || '—';

    return {
      transactionId: row.transaction_id as string,
      variety,
      quantityKg: Number(row.quantity_kg),
      totalAmount: Number(row.total_amount),
      partnerName: role === 'farmer' ? (buyer?.full_name ?? '—') : (farmer?.full_name ?? '—'),
      dateCompleted: (row.date_completed as string | null) ?? null,
    };
  });
}

export function toWeeklyBars(points: PriceHistoryPoint[], take = 7) {
  const slice = points.slice(-take);
  if (slice.length === 0) return [];

  const prices = slice.map((point) => point.pricePerKg);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  return slice.map((point, index) => {
    const date = new Date(`${point.month}T00:00:00`);
    const day = date.toLocaleDateString('en-PH', { weekday: 'short' }).slice(0, 3);
    return {
      day,
      pricePerKg: point.pricePerKg,
      level: 0.35 + ((point.pricePerKg - min) / range) * 0.65,
      active: index === slice.length - 1,
    };
  });
}

export function priceDelta(current: number, previous: number | undefined): string | null {
  if (previous == null || previous <= 0) return null;
  const diff = current - previous;
  const pct = (diff / previous) * 100;
  const sign = diff >= 0 ? '+' : '-';
  return `${sign}${formatPeso(Math.abs(diff))} (${sign}${Math.abs(pct).toFixed(1)}%)`;
}

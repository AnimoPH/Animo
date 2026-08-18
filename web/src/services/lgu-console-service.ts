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
  startDate: string;
  endDate: string | null;
};

export type LguFarmerRow = {
  farmerId: string;
  name: string;
  barangay: string;
  dateRegistered: string;
  activeListings: number;
  totalListings: number;
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

export async function fetchNfaInterventionWindows(): Promise<NfaWindow[]> {
  const { data, error } = await supabase
    .from('nfa_intervention_window')
    .select('start_date, end_date')
    .order('start_date', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    startDate: row.start_date as string,
    endDate: (row.end_date as string | null) ?? null,
  }));
}

export async function fetchLguFarmerRegistry(): Promise<LguFarmerRow[]> {
  const { data, error } = await supabase
    .from('lgu_farmer_registry')
    .select('farmer_id, farmer_name, barangay, date_registered, active_listings, total_listings')
    .order('farmer_name', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    farmerId: row.farmer_id as string,
    name: row.farmer_name as string,
    barangay: row.barangay as string,
    dateRegistered: row.date_registered as string,
    activeListings: Number(row.active_listings) || 0,
    totalListings: Number(row.total_listings) || 0,
  }));
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

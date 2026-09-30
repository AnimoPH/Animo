import { supabase } from '@/lib/supabase';

export type PalayReview = {
  id: string;
  score: number;
  comment: string | null;
  quantityKg: number;
  maskedName: string;
  reviewedAt: string;
};

type PalayReviewRow = {
  rating_id: string;
  score: number;
  comment: string | null;
  quantity_kg: number;
  masked_name: string;
  reviewed_at: string;
};

/** Buyer ratings for one listing: masked name, kilograms bought, score, and comment. */
export async function fetchListingPalayReviews(listingId: string): Promise<PalayReview[]> {
  const { data, error } = await supabase.rpc('listing_palay_reviews', { p_listing_id: listingId });
  if (error) throw error;

  return ((data ?? []) as PalayReviewRow[]).map((row) => ({
    id: row.rating_id,
    score: Number(row.score),
    comment: row.comment,
    quantityKg: Number(row.quantity_kg),
    maskedName: row.masked_name,
    reviewedAt: row.reviewed_at,
  }));
}

export function averageReviewScore(reviews: PalayReview[]): number | null {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, review) => sum + review.score, 0);
  return total / reviews.length;
}

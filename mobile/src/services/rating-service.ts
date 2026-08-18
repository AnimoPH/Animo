import { requireAuthUserId } from '@/services/crop-listing-service';
import { supabase } from '@/lib/supabase';
import type { Rating, SubmitRatingInput } from '@/types/rating';

/**
 * Rating service — one 1–5 `score` plus optional comment per (transaction,
 * rater). Detail-star rows on the review screens are display-only; 0001's
 * `rating` table has no columns for quality/communication/etc.
 *
 * INSERT is a direct client write. RLS ("A transaction party can rate the
 * other party") pins rater_id to the caller. Migration 0017 adds a unique
 * index (one review per party per deal) and a trigger that requires
 * transactionmatch.status = 'Completed'.
 */

export type RatingRow = {
  rating_id: string;
  transaction_id: string;
  rater_id: string;
  rated_id: string;
  score: number;
  comment: string | null;
};

export const RATING_COLUMNS =
  'rating_id, transaction_id, rater_id, rated_id, score, comment' as const;

export function mapRating(row: RatingRow): Rating {
  return {
    id: row.rating_id,
    transactionId: row.transaction_id,
    raterId: row.rater_id,
    ratedId: row.rated_id,
    score: Number(row.score),
    comment: row.comment,
  };
}

function assertValidScore(score: number): void {
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error('Dapat 1 hanggang 5 ang marka.');
  }
}

/** The signed-in user's review of this transaction, if they already submitted one. */
export async function fetchOwnRatingForTransaction(transactionId: string): Promise<Rating | null> {
  const raterId = await requireAuthUserId();

  const { data, error } = await supabase
    .from('rating')
    .select(RATING_COLUMNS)
    .eq('transaction_id', transactionId)
    .eq('rater_id', raterId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRating(data as RatingRow) : null;
}

/**
 * Inserts a rating of the other party on a completed transaction.
 * Duplicate (same rater + transaction) surfaces as a Filipino error via 23505.
 */
export async function submitRating(input: SubmitRatingInput): Promise<Rating> {
  const raterId = await requireAuthUserId();
  assertValidScore(input.score);

  if (input.ratedId === raterId) {
    throw new Error('Hindi mo puwedeng i-rate ang sarili mo.');
  }

  const comment = input.comment?.trim() || null;
  if (comment && comment.length > 500) {
    throw new Error('Hanggang 500 karakter lang ang komento.');
  }

  const { data, error } = await supabase
    .from('rating')
    .insert({
      transaction_id: input.transactionId,
      rater_id: raterId,
      rated_id: input.ratedId,
      score: input.score,
      comment,
    })
    .select(RATING_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Naisumite mo na ang review para sa transaksyong ito.');
    }
    if (error.message.includes('can only rate a completed transaction')) {
      throw new Error('Puwedeng mag-review kapag tapos na ang transaksyon.');
    }
    throw error;
  }

  return mapRating(data as RatingRow);
}

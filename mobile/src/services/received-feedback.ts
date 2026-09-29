import { supabase } from '@/lib/supabase';
import { fetchCounterpartNames } from '@/services/transaction-service';

export type ReceivedFeedback = {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
};

type TransactionDate = {
  date_completed: string | null;
  created_at: string | null;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Reviews received by a user. `rating` has no created_at column, so the
 * date comes from the related transaction, the same read the LGU console uses.
 */
export async function fetchReceivedFeedbacks(
  userId: string,
  isTagalog: boolean,
  fallbackAuthor: string,
): Promise<ReceivedFeedback[]> {
  const { data, error } = await supabase
    .from('rating')
    .select(`
      rating_id,
      score,
      comment,
      rater_id,
      transaction:transaction_id (date_completed, created_at)
    `)
    .eq('rated_id', userId);

  if (error) throw error;

  const rows = data ?? [];
  const names = await fetchCounterpartNames(
    rows.map((row) => row.rater_id as string).filter(Boolean),
  );

  return rows
    .map((row) => {
      const transaction = asOne(row.transaction as TransactionDate | TransactionDate[] | null);
      const iso = transaction?.date_completed ?? transaction?.created_at ?? '';
      const date = iso
        ? new Date(iso).toLocaleDateString(isTagalog ? 'fil-PH' : 'en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '';
      return {
        id: row.rating_id as string,
        author: names.get(row.rater_id as string) || fallbackAuthor,
        rating: Number(row.score) || 5,
        date,
        comment:
          (row.comment as string | null)?.trim() ||
          (isTagalog ? 'Walang nakasaad na komento.' : 'No comment provided.'),
        sortKey: iso,
      };
    })
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .slice(0, 5)
    .map(({ sortKey: _sortKey, ...feedback }) => feedback);
}

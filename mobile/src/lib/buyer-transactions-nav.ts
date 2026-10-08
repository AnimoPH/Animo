import type { Href } from 'expo-router';

/** Route param that opens a Transaksyon list filter. */
export type BuyerTransactionListFilter = 'kasalukuyan' | 'tapos';

type ListFilterValue = 'Kasalukuyan' | 'Tapos na';

/** Transaksyon list, optionally focused on Kasalukuyan or Tapos na. */
export function buyerTransactionsHref(filter?: BuyerTransactionListFilter): Href {
  if (!filter) return '/(buyer)/transaksyon';
  return {
    pathname: '/(buyer)/transaksyon',
    params: { filter },
  } as Href;
}

/** Maps the `filter` search param to the list's pill value. */
export function parseBuyerTransactionListFilter(
  value: string | string[] | undefined,
): ListFilterValue | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'kasalukuyan') return 'Kasalukuyan';
  if (raw === 'tapos') return 'Tapos na';
  return null;
}

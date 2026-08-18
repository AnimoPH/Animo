/**
 * Peso formatting shared across marketplace, request, and transaction
 * screens.
 *
 * This file used to also hold the mock request/transaction domain model and
 * seed data — that's been replaced by real `purchaserequest`/`transactionmatch`
 * data (see `src/types/purchase-request.ts`, `src/types/transaction.ts`, and
 * `src/services/purchase-request-service.ts`/`transaction-service.ts`).
 * `formatPeso` has no mock-data dependency and is used well outside that
 * blast radius (listing cards, payment summaries, palengke browse screens),
 * so it stays here.
 */

/** Format a peso amount like "₱8,000.00". */
export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

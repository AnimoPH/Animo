/**
 * Where a tap on an inbox row goes. The farmer's transaction screen takes a
 * transaction id, but the buyer's takes the purchase request id, so a buyer row
 * needs the request id. Notices carry the transaction id (and, for accepted
 * requests, the request id too).
 */
export type NoticeIds = {
  transactionId?: string;
  requestId?: string;
};

export function noticeTarget(
  role: 'farmer' | 'buyer',
  kind: string,
  ids: NoticeIds,
): string | null {
  if (kind === 'advisory' && role === 'farmer') return '/(farmer)/advisory';
  if ((kind === 'purchase_request_received' || kind === 'purchase_request_cancelled') && role === 'farmer') {
    return '/(farmer)/(tabs)/transaksyon';
  }
  const TRADE_KINDS = [
    'purchase_request_accepted',
    'transaction_completed',
    'payment_sent',
    'payment_confirmed',
    'rating_received',
  ];
  if (!TRADE_KINDS.includes(kind)) return null;
  if (role === 'farmer') return ids.transactionId ? `/(farmer)/transaksyon/${ids.transactionId}` : null;
  return ids.requestId ? `/(buyer)/transaksyon/${ids.requestId}` : null;
}

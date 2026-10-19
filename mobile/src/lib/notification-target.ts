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
  if (kind !== 'purchase_request_accepted' && kind !== 'transaction_completed') return null;
  if (role === 'farmer') return ids.transactionId ? `/(farmer)/transaksyon/${ids.transactionId}` : null;
  return ids.requestId ? `/(buyer)/transaksyon/${ids.requestId}` : null;
}

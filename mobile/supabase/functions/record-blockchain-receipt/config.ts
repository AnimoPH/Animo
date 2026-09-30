/** Bearer-token authentication and transaction ownership are enforced by the handler.
 * No cookies are used; allow web clients by default, with an optional origin restriction.
 */
export function receiptCorsHeaders(allowedOrigin?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin?.trim() || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

/** Accept a complete RPC URL or an Alchemy /v2/ base plus a separate key. */
export function resolvePolygonRpcUrl(rawUrl: string, rawKey = ''): string {
  if (!rawUrl.trim()) throw new Error('missing secret: POLYGON_RPC_URL');
  const url = new URL(rawUrl.trim());
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('POLYGON_RPC_URL must use HTTP or HTTPS');
  }
  if (/\/v2\/?$/.test(url.pathname)) {
    const key = rawKey.trim();
    if (!key) throw new Error('missing secret: ALCHEMY_API_KEY for RPC base URL');
    url.pathname = `${url.pathname.replace(/\/$/, '')}/${encodeURIComponent(key)}`;
  }
  return url.toString();
}

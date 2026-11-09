import { isSuspensionNotice } from '../suspension.ts';

/**
 * Plain-language reason for a saved action the server refused. The match is on
 * the database message that outbox-store kept in lastError.
 */
const REASONS: { match: RegExp; tl: string; en: string }[] = [
  {
    match: /listing is not open for requests/i,
    tl: 'Hindi na bukas ang listing para sa request. Maaaring naibenta na ito o inalis.',
    en: 'The listing is no longer open for requests. It may be sold or removed.',
  },
  {
    match: /exceeds remaining_quantity_kg/i,
    tl: 'Kulang na ang natitirang kilo sa listing para sa dami na hiniling mo.',
    en: 'The listing no longer has enough kilos left for the amount you asked for.',
  },
  {
    match: /listing not found/i,
    tl: 'Wala na ang listing.',
    en: 'The listing no longer exists.',
  },
  {
    match: /in-flight transaction/i,
    tl: 'May transaksyon ka pang hindi tapos sa listing na ito.',
    en: 'You still have an unfinished transaction on this listing.',
  },
  {
    match: /purchaserequest_one_active_per_buyer_listing|duplicate key/i,
    tl: 'May aktibo ka nang request sa listing na ito.',
    en: 'You already have an active request on this listing.',
  },
  {
    match: /account is suspended/i,
    tl: 'Na-suspend ang account kaya hindi maipadala ang aksyon.',
    en: 'The account is suspended, so the action could not be sent.',
  },
  {
    match: /gcash reference already used/i,
    tl: 'Nagamit na ang reference number ng GCash na ito.',
    en: 'This GCash reference number was already used.',
  },
  {
    match: /gcash reference (invalid format|required)/i,
    tl: 'Hindi tama o kulang ang reference number ng GCash.',
    en: 'The GCash reference number is wrong or missing.',
  },
  {
    match: /transaction not found|payment not found|not authorized/i,
    tl: 'Hindi na mahanap ang transaksyon o bayad.',
    en: 'The transaction or payment can no longer be found.',
  },
];

export function refusalReason(lastError: string | null, isTagalog: boolean): string {
  if (lastError && isSuspensionNotice(lastError)) return lastError;
  const hit = lastError ? REASONS.find((reason) => reason.match.test(lastError)) : undefined;
  if (hit) return isTagalog ? hit.tl : hit.en;
  return isTagalog
    ? 'Tinanggihan ng server ang naka-save na aksyon.'
    : 'The server refused the saved action.';
}

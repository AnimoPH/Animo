import { actionLabel, type RecommendedAction } from '@/services/advisory-service';
import { noticeTarget } from '@/lib/notification-target';
import { supabase } from '@/lib/supabase';

export type NotificationCategory = 'lahat' | 'transaksyon' | 'palengke' | 'sistema';

export type InboxNotification = {
  id: string;
  kind: string;
  rawTitle: string;
  rawBody: string;
  createdAt: string;
  read: boolean;
  category: 'transaksyon' | 'sistema';
  targetRoute: string | null;
};

const ADVISORY_ACTIONS = new Set<RecommendedAction>(['Advance_Cut', 'Delayed_Harvest', 'No_Action_Needed']);
const GENERIC_SUSPEND_BODY = 'Na-suspend ang iyong account.';

function isAdvisoryAction(value: string): value is RecommendedAction {
  return ADVISORY_ACTIONS.has(value as RecommendedAction);
}

/** Screen copy for a queue row. Stored SQL text is only a fallback. */
export function notificationText(item: InboxNotification, isTagalog: boolean): { title: string; body: string } {
  const lang = isTagalog ? 'tl' : 'en';

  if (item.kind === 'advisory') {
    const weather = item.rawTitle === 'Babala sa Panahon';
    const title = weather
      ? isTagalog ? 'Babala sa Panahon' : 'Weather warning'
      : isTagalog ? 'Payo sa Bukid' : 'Farm Advisory';
    const body = isAdvisoryAction(item.rawBody)
      ? isTagalog
        ? `Ang rekomendasyon para sa iyong pananim ay ${actionLabel(item.rawBody, lang)}.`
        : `The recommendation for your crop is ${actionLabel(item.rawBody, lang)}.`
      : isTagalog
        ? 'May bagong payo para sa iyong pananim.'
        : 'There is a new advisory for your crop.';
    return { title, body };
  }

  if (item.kind === 'purchase_request_received') {
    return isTagalog
      ? { title: 'Bagong Kahilingan', body: 'May bagong purchase request sa iyong listing.' }
      : { title: 'New purchase request', body: 'A buyer sent a purchase request on your listing.' };
  }

  if (item.kind === 'purchase_request_cancelled') {
    return isTagalog
      ? { title: 'Kinansela ang Kahilingan', body: 'Kinansela ng mamimili ang purchase request.' }
      : { title: 'Purchase request cancelled', body: 'The buyer cancelled the purchase request.' };
  }

  if (item.kind === 'purchase_request_accepted') {
    return isTagalog
      ? { title: 'Tinanggap ang kahilingan', body: 'Tinanggap ng magsasaka ang iyong kahilingan sa pagbili.' }
      : { title: 'Purchase request accepted', body: 'The farmer accepted your purchase request.' };
  }

  if (item.kind === 'purchase_request_rejected') {
    return isTagalog
      ? { title: 'Tinanggihan ang kahilingan', body: 'Tinanggihan ng magsasaka ang iyong kahilingan sa pagbili.' }
      : { title: 'Purchase request declined', body: 'The farmer declined your purchase request.' };
  }

  if (item.kind === 'transaction_completed') {
    return isTagalog
      ? { title: 'Tapos na ang transaksyon', body: 'Kumpleto na ang iyong transaksyon.' }
      : { title: 'Transaction completed', body: 'Your transaction is complete.' };
  }

  if (item.kind === 'account_suspended') {
    const reason = item.rawBody.trim();
    const generic = reason.length === 0 || reason === GENERIC_SUSPEND_BODY;
    return {
      title: isTagalog ? 'Na-suspend ang account' : 'Account suspended',
      body: generic
        ? isTagalog ? 'Na-suspend ang iyong account.' : 'Your account has been suspended.'
        : reason,
    };
  }

  if (item.kind === 'account_unsuspended') {
    return isTagalog
      ? { title: 'Naibalik ang account', body: 'Naibalik na ang access ng iyong account.' }
      : { title: 'Account restored', body: 'Your account access has been restored.' };
  }

  return { title: item.rawTitle, body: item.rawBody };
}

const TRANSACTION_KINDS = new Set([
  'purchase_request_received',
  'purchase_request_cancelled',
  'purchase_request_accepted',
  'purchase_request_rejected',
  'transaction_completed',
]);

type QueueRow = {
  notification_id: string;
  title: string;
  body: string;
  data: { type?: string; transaction_id?: string; request_id?: string } | null;
  created_at: string;
  read_at: string | null;
};


export async function fetchMyNotifications(role: 'farmer' | 'buyer'): Promise<InboxNotification[]> {
  const { data, error } = await supabase
    .from('push_notification_queue')
    .select('notification_id, title, body, data, created_at, read_at')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as QueueRow[];

  // A buyer's transaction screen is opened with the purchase request id. Completed
  // notices only carry the transaction id, so look the request up for those.
  const requestByTransaction = new Map<string, string>();
  if (role === 'buyer') {
    const missing = rows
      .filter((row) => !row.data?.request_id && row.data?.transaction_id)
      .map((row) => row.data!.transaction_id as string);
    if (missing.length > 0) {
      const { data: matches } = await supabase
        .from('transactionmatch')
        .select('transaction_id, request_id')
        .in('transaction_id', missing);
      for (const match of (matches ?? []) as { transaction_id: string; request_id: string }[]) {
        requestByTransaction.set(match.transaction_id, match.request_id);
      }
    }
  }

  return rows.map((row) => {
    const kind = row.data?.type ?? '';
    const transactionId = row.data?.transaction_id;
    return {
      id: row.notification_id,
      kind,
      rawTitle: row.title,
      rawBody: row.body,
      createdAt: row.created_at,
      read: row.read_at != null,
      category: TRANSACTION_KINDS.has(kind) ? 'transaksyon' : 'sistema',
      targetRoute: noticeTarget(role, kind, {
        transactionId,
        requestId: row.data?.request_id ?? (transactionId ? requestByTransaction.get(transactionId) : undefined),
      }),
    };
  });
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('push_notification_queue')
    .select('notification_id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('push_notification_queue')
    .update({ read_at: new Date().toISOString() })
    .eq('notification_id', id)
    .is('read_at', null);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('push_notification_queue')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}

export function formatNotificationTime(iso: string, isTagalog: boolean): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return isTagalog ? 'Ngayon' : 'Just now';
  if (minutes < 60) {
    return isTagalog ? `${minutes} minuto ang nakalipas` : `${minutes} minutes ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return isTagalog ? `${hours} oras ang nakalipas` : `${hours} hours ago`;
  }
  const days = Math.round(hours / 24);
  return isTagalog ? `${days} araw ang nakalipas` : `${days} days ago`;
}

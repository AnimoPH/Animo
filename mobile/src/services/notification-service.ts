import { supabase } from '@/lib/supabase';

export type NotificationCategory = 'lahat' | 'transaksyon' | 'palengke' | 'sistema';

export type InboxNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  category: 'transaksyon' | 'sistema';
  targetRoute: string | null;
};

const TRANSACTION_KINDS = new Set([
  'purchase_request_accepted',
  'purchase_request_rejected',
  'transaction_completed',
]);

type QueueRow = {
  notification_id: string;
  title: string;
  body: string;
  data: { type?: string; transaction_id?: string } | null;
  created_at: string;
  read_at: string | null;
};

function targetRoute(role: 'farmer' | 'buyer', kind: string, transactionId: string | undefined): string | null {
  if (kind === 'advisory' && role === 'farmer') return '/(farmer)/advisory';
  if (!transactionId) return null;
  if (kind !== 'purchase_request_accepted' && kind !== 'transaction_completed') return null;
  return role === 'farmer'
    ? `/(farmer)/transaksyon/${transactionId}`
    : `/(buyer)/transaksyon/${transactionId}`;
}

export async function fetchMyNotifications(role: 'farmer' | 'buyer'): Promise<InboxNotification[]> {
  const { data, error } = await supabase
    .from('push_notification_queue')
    .select('notification_id, title, body, data, created_at, read_at')
    .order('created_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as QueueRow[]).map((row) => {
    const kind = row.data?.type ?? '';
    return {
      id: row.notification_id,
      title: row.title,
      body: row.body,
      createdAt: row.created_at,
      read: row.read_at != null,
      category: TRANSACTION_KINDS.has(kind) ? 'transaksyon' : 'sistema',
      targetRoute: targetRoute(role, kind, row.data?.transaction_id),
    };
  });
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

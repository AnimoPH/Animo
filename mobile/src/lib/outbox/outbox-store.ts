import * as SQLite from 'expo-sqlite';

import type { NewOutboxItem, OutboxItem, OutboxKind, OutboxStatus, OutboxStore } from './types';

type Row = {
  id: string;
  user_id: string;
  kind: string;
  payload: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: number;
};

function toItem(row: Row): OutboxItem {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind as OutboxKind,
    payload: JSON.parse(row.payload),
    status: row.status as OutboxStatus,
    attempts: row.attempts,
    lastError: row.last_error,
    createdAt: row.created_at,
  };
}

/**
 * SQLite behind the outbox. Rows are only what the phone still has to send,
 * a sent item is deleted. It is not a copy of the server database.
 */
export async function openOutboxStore(): Promise<OutboxStore> {
  const db = await SQLite.openDatabaseAsync('animo-outbox.db');
  await db.execAsync(`
    create table if not exists outbox (
      id text primary key not null,
      user_id text not null,
      kind text not null,
      payload text not null,
      status text not null default 'pending',
      attempts integer not null default 0,
      last_error text,
      created_at integer not null
    );
    create index if not exists outbox_user_status_idx on outbox (user_id, status, created_at);
  `);

  return {
    async enqueue(item: NewOutboxItem) {
      await db.runAsync(
        'insert or ignore into outbox (id, user_id, kind, payload, created_at) values (?, ?, ?, ?, ?)',
        item.id,
        item.userId,
        item.kind,
        JSON.stringify(item.payload),
        Date.now(),
      );
    },
    async listPending(userId) {
      const rows = await db.getAllAsync<Row>(
        "select * from outbox where user_id = ? and status = 'pending' order by created_at, rowid",
        userId,
      );
      return rows.map(toItem);
    },
    async listAll(userId) {
      const rows = await db.getAllAsync<Row>(
        'select * from outbox where user_id = ? order by created_at, rowid',
        userId,
      );
      return rows.map(toItem);
    },
    async markSending(id) {
      await db.runAsync("update outbox set status = 'sending' where id = ?", id);
    },
    async markPending(id, attempts, error) {
      await db.runAsync(
        "update outbox set status = 'pending', attempts = ?, last_error = ? where id = ?",
        attempts,
        error,
        id,
      );
    },
    async markNeedsReview(id, error) {
      await db.runAsync(
        "update outbox set status = 'needs_review', last_error = ? where id = ?",
        error,
        id,
      );
    },
    async markFailed(id, attempts, error) {
      await db.runAsync(
        "update outbox set status = 'failed', attempts = ?, last_error = ? where id = ?",
        attempts,
        error,
        id,
      );
    },
    async requeue(id, payload) {
      await db.runAsync(
        "update outbox set status = 'pending', attempts = 0, last_error = null, payload = ? where id = ?",
        JSON.stringify(payload),
        id,
      );
    },
    async remove(id) {
      await db.runAsync('delete from outbox where id = ?', id);
    },
    async resetSending() {
      await db.runAsync("update outbox set status = 'pending' where status = 'sending'");
    },
  };
}

-- In-app notification list. The queue and the sender already exist (0030).
-- Authenticated users can read their own rows and set read_at. They cannot
-- insert, delete, or change title, body, status, or data. Dispatch stays on
-- the service role. enqueue_push_notification stays callable from the
-- security-definer hooks; direct calls from signed-in users are revoked.

alter table public.push_notification_queue
  add column read_at timestamptz;

create policy "Users can view own notifications"
  on public.push_notification_queue
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can mark own notifications read"
  on public.push_notification_queue
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select (notification_id, title, body, data, created_at, read_at)
  on public.push_notification_queue to authenticated;

grant update (read_at)
  on public.push_notification_queue to authenticated;

revoke execute on function public.enqueue_push_notification(uuid, text, text, jsonb) from authenticated;

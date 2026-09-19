-- Push notification trigger service — Frontend-Handoff/Project Context list
-- Expo Push as "planned", never installed. This migration adds the backend
-- half only (Sec. 21 backend priority list, item 4): token storage, a queue
-- table DB triggers/RPCs enqueue into, and the cron/edge-function dispatch
-- pattern already proven by 0025's advisory refresh. Client-side
-- expo-notifications install + permission/registration flow, and wiring the
-- two notipikasyon.tsx mock screens to a real table, are explicit follow-ups
-- for mobile/FE — nothing here depends on them existing yet.

alter table public."user" add column expo_push_token text;
grant update (full_name, expo_push_token) on public."user" to authenticated;

-- ---------------------------------------------------------------------------
-- Queue table — a trigger/RPC enqueues a row here; the edge function below
-- drains it. Decoupled the same way weather_forecast_feed's fetch is
-- decoupled from advisoryrecommendation's write (0025): the DB transaction
-- that causes a notification never itself makes an HTTP call.
-- ---------------------------------------------------------------------------
create table public.push_notification_queue (
  notification_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public."user" (user_id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb,
  status text not null default 'Pending' check (status in ('Pending', 'Sent', 'Failed', 'Skipped')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.push_notification_queue enable row level security;

-- System-generated only, same "service role writes, no client policy at all"
-- posture as weather_forecast_feed (0025) — nobody reads their own queue rows
-- directly, they read the eventual push notification on their device.
revoke all on public.push_notification_queue from authenticated, anon;
grant select, update on public.push_notification_queue to service_role;

-- send-push-notifications (service role) reads expo_push_token off "user";
-- same missing-grant gap as cropcycle in 0025 — service_role gets no
-- automatic read grant on a pre-existing table either.
grant select on public."user" to service_role;

create index push_notification_queue_pending_idx on public.push_notification_queue (created_at) where status = 'Pending';

-- Every trigger/RPC hook below calls this instead of inserting directly.
-- SECURITY DEFINER because some callers run as `authenticated` (e.g. inside
-- accept_purchase_request), and this table has no authenticated grant.
create function public.enqueue_push_notification(p_user_id uuid, p_title text, p_body text, p_data jsonb default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_notification_queue (user_id, title, body, data)
  values (p_user_id, p_title, p_body, p_data);
end;
$$;

revoke all on function public.enqueue_push_notification(uuid, text, text, jsonb) from public, anon;
grant execute on function public.enqueue_push_notification(uuid, text, text, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Hook 1 — new advisory generated (0026's cropcycle trigger and 0025's
-- 6-hourly cron both insert into advisoryrecommendation; one AFTER INSERT
-- trigger here catches both paths).
-- ---------------------------------------------------------------------------
create function public.notify_new_advisory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer_id uuid;
begin
  select f.farmer_id into v_farmer_id
    from public.cropcycle cc
    join public.farm f on f.farm_id = cc.farm_id
    where cc.cropcycle_id = new.cropcycle_id;

  if v_farmer_id is not null then
    perform public.enqueue_push_notification(
      v_farmer_id,
      case new.type when 'RainAdvisory' then 'Babala sa Panahon' else 'Payo sa Bukid' end,
      coalesce(new.recommended_action, 'May bagong payo para sa iyong pananim.'),
      jsonb_build_object('type', 'advisory', 'advisory_id', new.advisory_id, 'cropcycle_id', new.cropcycle_id)
    );
  end if;

  return new;
end;
$$;

create trigger advisoryrecommendation_notify_push
  after insert on public.advisoryrecommendation
  for each row execute function public.notify_new_advisory();

-- ---------------------------------------------------------------------------
-- Hook 2 — purchase request accepted/rejected. accept_purchase_request and
-- reject_purchase_request (0009) are replaced in place to also enqueue a
-- notification to the buyer; all validation/locking logic is unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.accept_purchase_request(
  p_request_id uuid,
  p_accepted_quantity_kg numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_buyer_id uuid;
  v_requested_quantity_kg numeric;
  v_status text;
  v_farmer_id uuid;
  v_remaining_quantity_kg numeric;
  v_price_per_kg numeric;
  v_transaction_id uuid;
begin
  if p_accepted_quantity_kg is null or p_accepted_quantity_kg <= 0 then
    raise exception 'p_accepted_quantity_kg must be greater than zero';
  end if;

  select listing_id, buyer_id, requested_quantity_kg, status
    into v_listing_id, v_buyer_id, v_requested_quantity_kg, v_status
    from public.purchaserequest
    where request_id = p_request_id
    for update;

  if v_listing_id is null then
    raise exception 'purchase request not found';
  end if;

  select farmer_id, remaining_quantity_kg, computed_price_per_kg
    into v_farmer_id, v_remaining_quantity_kg, v_price_per_kg
    from public.croplisting
    where listing_id = v_listing_id
    for update;

  if auth.uid() <> v_farmer_id then
    raise exception 'not authorized';
  end if;

  if v_status <> 'Pending' then
    raise exception 'purchase request is no longer pending (status: %)', v_status;
  end if;

  if p_accepted_quantity_kg > v_requested_quantity_kg then
    raise exception 'accepted quantity (%) cannot exceed requested quantity (%)', p_accepted_quantity_kg, v_requested_quantity_kg;
  end if;

  if p_accepted_quantity_kg > v_remaining_quantity_kg then
    raise exception 'accepted quantity (%) exceeds remaining listing quantity (%)', p_accepted_quantity_kg, v_remaining_quantity_kg;
  end if;

  insert into public.transactionmatch (
    listing_id, request_id, buyer_id, farmer_id, agreed_price_per_kg, quantity_kg, status
  ) values (
    v_listing_id, p_request_id, v_buyer_id, v_farmer_id, v_price_per_kg, p_accepted_quantity_kg, 'Pending_Payment'
  )
  returning transaction_id into v_transaction_id;

  update public.purchaserequest
    set status = case when p_accepted_quantity_kg = v_requested_quantity_kg then 'Accepted' else 'Partially_Accepted' end,
        accepted_quantity_kg = p_accepted_quantity_kg
    where request_id = p_request_id;

  update public.croplisting
    set remaining_quantity_kg = remaining_quantity_kg - p_accepted_quantity_kg
    where listing_id = v_listing_id;

  perform public.enqueue_push_notification(
    v_buyer_id,
    'Tinanggap ang Kahilingan',
    'Tinanggap ng magsasaka ang iyong purchase request.',
    jsonb_build_object('type', 'purchase_request_accepted', 'request_id', p_request_id, 'transaction_id', v_transaction_id)
  );

  return v_transaction_id;
end;
$$;

create or replace function public.reject_purchase_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_farmer_id uuid;
  v_buyer_id uuid;
  v_status text;
begin
  select listing_id, buyer_id, status into v_listing_id, v_buyer_id, v_status
    from public.purchaserequest
    where request_id = p_request_id
    for update;

  if v_listing_id is null then
    raise exception 'purchase request not found';
  end if;

  select farmer_id into v_farmer_id from public.croplisting where listing_id = v_listing_id;

  if auth.uid() <> v_farmer_id then
    raise exception 'not authorized';
  end if;

  if v_status <> 'Pending' then
    raise exception 'purchase request is no longer pending (status: %)', v_status;
  end if;

  update public.purchaserequest set status = 'Rejected' where request_id = p_request_id;

  perform public.enqueue_push_notification(
    v_buyer_id,
    'Tinanggihan ang Kahilingan',
    'Tinanggihan ng magsasaka ang iyong purchase request.',
    jsonb_build_object('type', 'purchase_request_rejected', 'request_id', p_request_id)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Hook 3 — transaction completed. transactionmatch_check_completed (0001,
-- before update on transactionmatch) and payment_check_completed (0001,
-- after update on payment) both drive status to 'Completed' via their own
-- UPDATE on transactionmatch; one AFTER UPDATE trigger here on
-- transactionmatch itself catches both paths regardless of which fired.
-- ---------------------------------------------------------------------------
create function public.notify_transaction_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Completed' and old.status is distinct from 'Completed' then
    perform public.enqueue_push_notification(
      new.buyer_id,
      'Tapos na ang Transaksyon',
      'Nakumpleto na ang iyong transaksyon.',
      jsonb_build_object('type', 'transaction_completed', 'transaction_id', new.transaction_id)
    );
    perform public.enqueue_push_notification(
      new.farmer_id,
      'Tapos na ang Transaksyon',
      'Nakumpleto na ang iyong transaksyon.',
      jsonb_build_object('type', 'transaction_completed', 'transaction_id', new.transaction_id)
    );
  end if;

  return new;
end;
$$;

create trigger transactionmatch_notify_completed
  after update on public.transactionmatch
  for each row execute function public.notify_transaction_completed();

-- ---------------------------------------------------------------------------
-- Hook 4 — account suspended/unsuspended. suspend_account/unsuspend_account
-- (0028) are replaced in place to also enqueue a notification to the
-- affected user; the LGU-official check and column updates are unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.suspend_account(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if not public.is_lgu_official() then
    raise exception 'LGU official required';
  end if;

  select role into v_role from public."user" where user_id = p_user_id;
  if v_role is null then
    raise exception 'user not found';
  end if;
  if v_role not in ('Farmer', 'Buyer') then
    raise exception 'only farmer/buyer accounts can be suspended';
  end if;

  update public."user"
    set account_status = 'Suspended',
        suspended_by = auth.uid(),
        suspended_at = now(),
        suspension_reason = p_reason
    where user_id = p_user_id;

  perform public.enqueue_push_notification(
    p_user_id,
    'Na-suspend ang Account',
    coalesce(p_reason, 'Na-suspend ang iyong account.'),
    jsonb_build_object('type', 'account_suspended')
  );
end;
$$;

create or replace function public.unsuspend_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_lgu_official() then
    raise exception 'LGU official required';
  end if;

  update public."user"
    set account_status = 'Active',
        suspended_by = null,
        suspended_at = null,
        suspension_reason = null
    where user_id = p_user_id;

  perform public.enqueue_push_notification(
    p_user_id,
    'Naibalik ang Account',
    'Naibalik na ang access ng iyong account.',
    jsonb_build_object('type', 'account_unsuspended')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Dispatch — same pg_cron + pg_net pattern as 0025/0014: an operator runs
-- once after deploying send-push-notifications:
--
--   select vault.create_secret('<the real service_role key>', 'push_notifications_service_role_key');
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-push-notifications', 'push_notifications_function_url');
--
-- Until both secrets exist, the job skips cleanly instead of failing loudly.
-- Every 2 minutes, not 6 hours like advisory — these are user-facing
-- transactional notifications, not a periodic weather refresh.
-- ---------------------------------------------------------------------------
create or replace function public.trigger_push_notification_dispatch()
returns void
language plpgsql
security definer
set search_path = vault, public, extensions
as $$
declare
  service_key text;
  function_url text;
begin
  select decrypted_secret into service_key from vault.decrypted_secrets where name = 'push_notifications_service_role_key';
  select decrypted_secret into function_url from vault.decrypted_secrets where name = 'push_notifications_function_url';

  if service_key is null or function_url is null then
    raise notice 'push notification dispatch skipped: vault secrets (push_notifications_service_role_key / push_notifications_function_url) not configured yet';
    return;
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || service_key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.trigger_push_notification_dispatch() from public, anon, authenticated;

select cron.schedule('push-notification-dispatch-every-2min', '*/2 * * * *', 'select public.trigger_push_notification_dispatch();');

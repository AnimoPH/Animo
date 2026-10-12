-- Local verification for 0038_pending_purchase_request_cancel.
-- Run against the local Supabase database only, as supabase_admin.
-- Do not run this on the hosted project.
--
--   docker exec -i supabase_db_mobile psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1
--
-- The race section opens two dblink sessions. Local TCP auth is trust, and
-- dblink refuses that for a non-superuser. The local postgres role is not a
-- superuser; supabase_admin is.
--
-- SEQUENTIAL checks (one call finishes before the next starts):
--   1. Free cancel inside 30 seconds is not counted in the rate
--   2. Late cancel after the deadline is counted; a free cancel stays in the denominator
--   3. Backfill shape (cancelled_at = cancel_deadline) stays free
--   4. Cancel after the farmer has accepted fails
--   5. Accept after the buyer has cancelled fails
--   6. A new purchase request can be inserted after cancel
--
-- RACE check (the only two-session test in this file):
--   7. Accept and cancel run at the same time on two dblink connections.
--      This does not say which side wins. It checks that exactly one succeeds
--      and the row matches that winner. Sections 1-6 are not concurrency tests.
\timing on
\set ON_ERROR_STOP on

\echo '===== SETUP ====='
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a0380000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'farmer-0038@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b0380000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'buyer-free-0038@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b0380000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'buyer-late-0038@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b0380000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'buyer-after-accept-0038@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b0380000-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
   'buyer-reorder-0038@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b0380000-0000-0000-0000-000000000005', 'authenticated', 'authenticated',
   'buyer-race-0038@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b0380000-0000-0000-0000-000000000006', 'authenticated', 'authenticated',
   'buyer-backfill-0038@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public."user" (user_id, full_name, role, contact_number, account_status)
values
  ('a0380000-0000-0000-0000-000000000001', 'Verify Farmer 0038', 'Farmer', '09170000038', 'Active'),
  ('b0380000-0000-0000-0000-000000000001', 'Verify Buyer Free 0038', 'Buyer', '09170000031', 'Active'),
  ('b0380000-0000-0000-0000-000000000002', 'Verify Buyer Late 0038', 'Buyer', '09170000032', 'Active'),
  ('b0380000-0000-0000-0000-000000000003', 'Verify Buyer After Accept 0038', 'Buyer', '09170000033', 'Active'),
  ('b0380000-0000-0000-0000-000000000004', 'Verify Buyer Reorder 0038', 'Buyer', '09170000034', 'Active'),
  ('b0380000-0000-0000-0000-000000000005', 'Verify Buyer Race 0038', 'Buyer', '09170000035', 'Active'),
  ('b0380000-0000-0000-0000-000000000006', 'Verify Buyer Backfill 0038', 'Buyer', '09170000036', 'Active')
on conflict (user_id) do update
  set account_status = 'Active',
      suspension_reason = null,
      suspended_by = null,
      suspended_at = null;

insert into public.farmer (user_id) values ('a0380000-0000-0000-0000-000000000001')
on conflict do nothing;
insert into public.buyer (user_id) values
  ('b0380000-0000-0000-0000-000000000001'),
  ('b0380000-0000-0000-0000-000000000002'),
  ('b0380000-0000-0000-0000-000000000003'),
  ('b0380000-0000-0000-0000-000000000004'),
  ('b0380000-0000-0000-0000-000000000005'),
  ('b0380000-0000-0000-0000-000000000006')
on conflict do nothing;

insert into public.marketpricefeed (effective_date, dry_base_price_per_kg, wet_base_price_per_kg)
select current_date, 20.85, 16.00
where not exists (select 1 from public.marketpricefeed where effective_date = current_date);

delete from public.push_notification_queue
  where user_id = 'a0380000-0000-0000-0000-000000000001'
    and data->>'request_id' like 'd0380000-%';
delete from public.payment where transaction_id in (
  select transaction_id from public.transactionmatch
  where listing_id::text like 'c0380000-%'
);
delete from public.transactionmatch where listing_id::text like 'c0380000-%';
delete from public.purchaserequest where listing_id::text like 'c0380000-%';
delete from public.user_trust_profile where user_id::text like 'b0380000-%';
delete from public.croplisting where listing_id::text like 'c0380000-%';

insert into public.croplisting (
  listing_id, farmer_id, listing_name, declared_variety, variety_code, declared_moisture,
  declared_purity_grade, gross_weight_kg, tare_weight_kg, remaining_quantity_kg,
  minimum_request_kg, status
) values
  ('c0380000-0000-0000-0000-000000000001', 'a0380000-0000-0000-0000-000000000001',
   'Free cancel listing', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0380000-0000-0000-0000-000000000002', 'a0380000-0000-0000-0000-000000000001',
   'Late cancel listing', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0380000-0000-0000-0000-000000000007', 'a0380000-0000-0000-0000-000000000001',
   'Late buyer free cancel listing', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0380000-0000-0000-0000-000000000003', 'a0380000-0000-0000-0000-000000000001',
   'Cancel after accept listing', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0380000-0000-0000-0000-000000000004', 'a0380000-0000-0000-0000-000000000001',
   'Reorder listing', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0380000-0000-0000-0000-000000000005', 'a0380000-0000-0000-0000-000000000001',
   'Race listing', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0380000-0000-0000-0000-000000000006', 'a0380000-0000-0000-0000-000000000001',
   'Backfill shape listing', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available');

insert into public.purchaserequest (request_id, listing_id, buyer_id, requested_quantity_kg, status) values
  ('d0380000-0000-0000-0000-000000000001', 'c0380000-0000-0000-0000-000000000001', 'b0380000-0000-0000-0000-000000000001', 50, 'Pending'),
  ('d0380000-0000-0000-0000-000000000002', 'c0380000-0000-0000-0000-000000000002', 'b0380000-0000-0000-0000-000000000002', 50, 'Pending'),
  ('d0380000-0000-0000-0000-000000000003', 'c0380000-0000-0000-0000-000000000003', 'b0380000-0000-0000-0000-000000000003', 50, 'Pending'),
  ('d0380000-0000-0000-0000-000000000004', 'c0380000-0000-0000-0000-000000000004', 'b0380000-0000-0000-0000-000000000004', 50, 'Pending'),
  ('d0380000-0000-0000-0000-000000000005', 'c0380000-0000-0000-0000-000000000005', 'b0380000-0000-0000-0000-000000000005', 50, 'Pending'),
  ('d0380000-0000-0000-0000-000000000006', 'c0380000-0000-0000-0000-000000000006', 'b0380000-0000-0000-0000-000000000006', 50, 'Pending');

\echo '===== SEQUENTIAL 1: free cancel inside 30 seconds, not counted ====='
do $$
declare
  v_status text;
  v_cancelled_at timestamptz;
  v_deadline timestamptz;
  v_remaining numeric;
  v_rate numeric;
  v_title text;
begin
  perform set_config('request.jwt.claim.sub', 'b0380000-0000-0000-0000-000000000001', false);
  perform public.cancel_purchase_request('d0380000-0000-0000-0000-000000000001');

  select status, cancelled_at, cancel_deadline
    into v_status, v_cancelled_at, v_deadline
    from public.purchaserequest
    where request_id = 'd0380000-0000-0000-0000-000000000001';

  if v_status <> 'Cancelled' then
    raise exception 'FAIL sequential 1: expected Cancelled, got %', v_status;
  end if;
  if v_cancelled_at is null or v_deadline is null or v_cancelled_at > v_deadline then
    raise exception 'FAIL sequential 1: cancel was not inside the free period (cancelled_at %, deadline %)', v_cancelled_at, v_deadline;
  end if;

  select remaining_quantity_kg into v_remaining
    from public.croplisting
    where listing_id = 'c0380000-0000-0000-0000-000000000001';
  if v_remaining <> 1000 then
    raise exception 'FAIL sequential 1: stock changed to %', v_remaining;
  end if;

  select title into v_title
    from public.push_notification_queue
    where user_id = 'a0380000-0000-0000-0000-000000000001'
      and data->>'request_id' = 'd0380000-0000-0000-0000-000000000001'
    order by created_at desc
    limit 1;
  if v_title is distinct from 'Kinansela ang Kahilingan' then
    raise exception 'FAIL sequential 1: farmer notice title was %', v_title;
  end if;

  select purchase_request_cancel_rate_pct into v_rate
    from public.user_trust_profile
    where user_id = 'b0380000-0000-0000-0000-000000000001';
  if v_rate is distinct from 0 then
    raise exception 'FAIL sequential 1: free cancel counted in the rate (%)', v_rate;
  end if;

  raise notice 'SEQUENTIAL 1 OK: free cancel, rate %', v_rate;
end $$;

\echo '===== SEQUENTIAL 2: late cancel is counted; free cancel stays in the denominator ====='
do $$
declare
  v_cancelled_at timestamptz;
  v_deadline timestamptz;
  v_rate numeric;
begin
  -- Fixture only: move the deadline into the past so this check does not sleep 30 seconds.
  -- Production still sets cancel_deadline to submitted_at + 30 seconds.
  update public.purchaserequest
    set cancel_deadline = now() - interval '1 second'
    where request_id = 'd0380000-0000-0000-0000-000000000002';

  perform set_config('request.jwt.claim.sub', 'b0380000-0000-0000-0000-000000000002', false);
  perform public.cancel_purchase_request('d0380000-0000-0000-0000-000000000002');

  select cancelled_at, cancel_deadline
    into v_cancelled_at, v_deadline
    from public.purchaserequest
    where request_id = 'd0380000-0000-0000-0000-000000000002';

  if v_cancelled_at is null or v_cancelled_at <= v_deadline then
    raise exception 'FAIL sequential 2: expected a late cancel (cancelled_at %, deadline %)', v_cancelled_at, v_deadline;
  end if;

  select purchase_request_cancel_rate_pct into v_rate
    from public.user_trust_profile
    where user_id = 'b0380000-0000-0000-0000-000000000002';
  if v_rate is distinct from 100 then
    raise exception 'FAIL sequential 2: one late cancel of one request should be 100, got %', v_rate;
  end if;

  insert into public.purchaserequest (request_id, listing_id, buyer_id, requested_quantity_kg, status)
  values (
    'd0380000-0000-0000-0000-000000000007',
    'c0380000-0000-0000-0000-000000000007',
    'b0380000-0000-0000-0000-000000000002',
    50, 'Pending'
  );
  perform public.cancel_purchase_request('d0380000-0000-0000-0000-000000000007');

  select purchase_request_cancel_rate_pct into v_rate
    from public.user_trust_profile
    where user_id = 'b0380000-0000-0000-0000-000000000002';
  if v_rate is distinct from 50 then
    raise exception 'FAIL sequential 2: 1 late of 2 requests should be 50 (free cancel stays in the denominator), got %', v_rate;
  end if;

  raise notice 'SEQUENTIAL 2 OK: late rate then denominator rate %', v_rate;
end $$;

\echo '===== SEQUENTIAL 3: backfill shape stays free ====='
do $$
declare
  v_rate numeric;
begin
  -- Same values the migration writes for Cancelled rows that already existed:
  -- cancelled_at = cancel_deadline, which is not a late cancel.
  update public.purchaserequest
    set status = 'Cancelled',
        cancelled_at = cancel_deadline
    where request_id = 'd0380000-0000-0000-0000-000000000006';

  perform public.refresh_trust_profile('b0380000-0000-0000-0000-000000000006');

  select purchase_request_cancel_rate_pct into v_rate
    from public.user_trust_profile
    where user_id = 'b0380000-0000-0000-0000-000000000006';
  if v_rate is distinct from 0 then
    raise exception 'FAIL sequential 3: backfill-shaped cancel counted as late (%)', v_rate;
  end if;

  raise notice 'SEQUENTIAL 3 OK: backfill shape rate %', v_rate;
end $$;

\echo '===== SEQUENTIAL 4: cancel after farmer accepted fails ====='
do $$
declare
  v_status text;
  v_matches integer;
begin
  perform set_config('request.jwt.claim.sub', 'a0380000-0000-0000-0000-000000000001', false);
  perform public.accept_purchase_request('d0380000-0000-0000-0000-000000000003', 50);

  perform set_config('request.jwt.claim.sub', 'b0380000-0000-0000-0000-000000000003', false);
  begin
    perform public.cancel_purchase_request('d0380000-0000-0000-0000-000000000003');
    raise exception 'FAIL sequential 4: cancel after accept succeeded';
  exception
    when others then
      if sqlerrm like 'FAIL sequential 4:%' then
        raise;
      end if;
  end;

  select status into v_status
    from public.purchaserequest
    where request_id = 'd0380000-0000-0000-0000-000000000003';
  select count(*) into v_matches
    from public.transactionmatch
    where request_id = 'd0380000-0000-0000-0000-000000000003';

  if v_status <> 'Accepted' then
    raise exception 'FAIL sequential 4: status changed to %', v_status;
  end if;
  if v_matches <> 1 then
    raise exception 'FAIL sequential 4: expected 1 transactionmatch, got %', v_matches;
  end if;

  raise notice 'SEQUENTIAL 4 OK: cancel after accept failed, match kept';
end $$;

\echo '===== SEQUENTIAL 5: accept after buyer cancelled fails ====='
do $$
declare
  v_status text;
  v_matches integer;
  v_remaining numeric;
begin
  perform set_config('request.jwt.claim.sub', 'b0380000-0000-0000-0000-000000000004', false);
  perform public.cancel_purchase_request('d0380000-0000-0000-0000-000000000004');

  perform set_config('request.jwt.claim.sub', 'a0380000-0000-0000-0000-000000000001', false);
  begin
    perform public.accept_purchase_request('d0380000-0000-0000-0000-000000000004', 50);
    raise exception 'FAIL sequential 5: accept after cancel succeeded';
  exception
    when others then
      if sqlerrm like 'FAIL sequential 5:%' then
        raise;
      end if;
  end;

  select status into v_status
    from public.purchaserequest
    where request_id = 'd0380000-0000-0000-0000-000000000004';
  select count(*) into v_matches
    from public.transactionmatch
    where request_id = 'd0380000-0000-0000-0000-000000000004';
  select remaining_quantity_kg into v_remaining
    from public.croplisting
    where listing_id = 'c0380000-0000-0000-0000-000000000004';

  if v_status <> 'Cancelled' then
    raise exception 'FAIL sequential 5: status changed to %', v_status;
  end if;
  if v_matches <> 0 then
    raise exception 'FAIL sequential 5: transactionmatch was created';
  end if;
  if v_remaining <> 1000 then
    raise exception 'FAIL sequential 5: stock changed to %', v_remaining;
  end if;

  raise notice 'SEQUENTIAL 5 OK: accept after cancel failed';
end $$;

\echo '===== SEQUENTIAL 6: order again after cancel ====='
do $$
declare
  v_pending integer;
begin
  insert into public.purchaserequest (
    request_id, listing_id, buyer_id, requested_quantity_kg, status
  ) values (
    'd0380000-0000-0000-0000-000000000008',
    'c0380000-0000-0000-0000-000000000004',
    'b0380000-0000-0000-0000-000000000004',
    40, 'Pending'
  );

  select count(*) into v_pending
    from public.purchaserequest
    where listing_id = 'c0380000-0000-0000-0000-000000000004'
      and buyer_id = 'b0380000-0000-0000-0000-000000000004'
      and status = 'Pending';

  if v_pending <> 1 then
    raise exception 'FAIL sequential 6: expected 1 new Pending request, got %', v_pending;
  end if;

  raise notice 'SEQUENTIAL 6 OK: new Pending request inserted after cancel';
end $$;

\echo '===== RACE 7: two sessions, accept and cancel at the same time ====='
do $$
begin
  if not exists (select 1 from pg_roles where rolname = current_user and rolsuper) then
    raise exception 'RACE 7 needs a superuser connection (supabase_admin). Sections 1-6 are sequential and already finished.';
  end if;
end $$;
\echo 'Sections 1-6 are sequential. This section is the only concurrency test.'
\echo 'Two dblink sessions start together. The check does not require a particular winner.'

create extension if not exists dblink with schema extensions;

do $$
declare
  v_accept_ok boolean;
  v_cancel_ok boolean;
  v_successes integer;
  v_status text;
  v_cancelled_at timestamptz;
  v_matches integer;
begin
  -- Literal connection string: dblink rejects a password that only lives in a variable.
  perform extensions.dblink_connect('race_accept', 'host=127.0.0.1 port=5432 dbname=postgres user=postgres password=postgres');
  perform extensions.dblink_connect('race_cancel', 'host=127.0.0.1 port=5432 dbname=postgres user=postgres password=postgres');

  perform extensions.dblink_send_query('race_accept', $q$
    select public.accept_purchase_request('d0380000-0000-0000-0000-000000000005'::uuid, 50)::text
    from (
      select
        set_config('request.jwt.claim.sub', 'a0380000-0000-0000-0000-000000000001', false),
        set_config('request.jwt.claim.role', 'authenticated', false)
    ) claims
  $q$);

  perform extensions.dblink_send_query('race_cancel', $q$
    select 'ok'
    from (
      select public.cancel_purchase_request('d0380000-0000-0000-0000-000000000005'::uuid)
      from (
        select
          set_config('request.jwt.claim.sub', 'b0380000-0000-0000-0000-000000000005', false),
          set_config('request.jwt.claim.role', 'authenticated', false)
      ) claims
    ) done
  $q$);

  create temporary table if not exists race_0038_results (
    side text primary key,
    ok boolean not null,
    detail text
  );
  delete from race_0038_results;

  begin
    perform * from extensions.dblink_get_result('race_accept') as t(result text);
    insert into race_0038_results(side, ok, detail) values ('accept', true, 'ok');
  exception when others then
    insert into race_0038_results(side, ok, detail) values ('accept', false, sqlerrm);
  end;

  begin
    perform * from extensions.dblink_get_result('race_cancel') as t(result text);
    insert into race_0038_results(side, ok, detail) values ('cancel', true, 'ok');
  exception when others then
    insert into race_0038_results(side, ok, detail) values ('cancel', false, sqlerrm);
  end;

  select ok into v_accept_ok from race_0038_results where side = 'accept';
  select ok into v_cancel_ok from race_0038_results where side = 'cancel';
  select count(*) into v_successes from race_0038_results where ok;

  select status, cancelled_at into v_status, v_cancelled_at
    from public.purchaserequest
    where request_id = 'd0380000-0000-0000-0000-000000000005';
  select count(*) into v_matches
    from public.transactionmatch
    where request_id = 'd0380000-0000-0000-0000-000000000005';

  if v_successes <> 1 then
    raise exception 'FAIL race 7: expected exactly one success, accept=% (%) cancel=% (%)',
      v_accept_ok, (select detail from race_0038_results where side = 'accept'),
      v_cancel_ok, (select detail from race_0038_results where side = 'cancel');
  end if;

  if v_accept_ok and (v_status not in ('Accepted', 'Partially_Accepted') or v_matches <> 1 or v_cancelled_at is not null) then
    raise exception 'FAIL race 7: accept won but row is status % matches % cancelled_at %', v_status, v_matches, v_cancelled_at;
  end if;

  if v_cancel_ok and (v_status <> 'Cancelled' or v_cancelled_at is null or v_matches <> 0) then
    raise exception 'FAIL race 7: cancel won but row is status % matches % cancelled_at %', v_status, v_matches, v_cancelled_at;
  end if;

  perform extensions.dblink_disconnect('race_accept');
  perform extensions.dblink_disconnect('race_cancel');

  raise notice 'RACE 7 OK: winner is %', case when v_accept_ok then 'accept' else 'cancel' end;
end $$;

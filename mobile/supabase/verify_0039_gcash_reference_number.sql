-- Local verification for 0039_gcash_reference_number_rules.
-- Run against the local Supabase database only, as supabase_admin.
-- Do not run this on the hosted project.
--
--   docker exec -i supabase_db_mobile psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1
--
-- supabase_admin is needed for checks 7 and 8 (legacy-shaped rows inserted with
-- session_replication_role = replica, which skips triggers the way rows
-- written before 0039 never went through the new trigger) and for check 9
-- (two dblink sessions; dblink refuses trust auth for a non-superuser).
--
--   1. GCash with a valid 13-digit number goes through
--   2. GCash with an empty or short number is rejected
--   3. Letters or spaces in the number are rejected (RPC and direct insert)
--   4. Cash with no number goes through
--   5. Cash with a number is rejected (RPC and direct insert)
--   6. A duplicate GCash reference number is rejected (RPC and direct insert)
--   7. Existing payment rows are unaffected: legacy 11-digit rows can still be
--      confirmed or failed, and rows that existed before this script are unchanged
--   8. Repeated short legacy numbers can coexist; a repeated 13-digit number cannot
--   9. RACE: two sessions send the same new number at once. The second one hits
--      the unique index after the first commits, and record_payment turns that
--      into "gcash reference already used" (the unique_violation handler)
\timing on
\set ON_ERROR_STOP on

\echo '===== SNAPSHOT: payment rows that existed before this script ====='
drop table if exists pg_temp.payment_before_0039;
create temporary table payment_before_0039 as
  select payment_id, md5(p::text) as row_hash
  from public.payment p
  where transaction_id not in (
    select transaction_id from public.transactionmatch where listing_id::text like 'c0390000-%'
  );
select count(*) as existing_payment_rows from payment_before_0039;

-- Runs p_sql and fails unless it raises an error containing p_expected.
create or replace function pg_temp.expect_error(p_label text, p_sql text, p_expected text)
returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception
    when others then
      if position(p_expected in sqlerrm) = 0 then
        raise exception 'FAIL %: expected error "%", got "%"', p_label, p_expected, sqlerrm;
      end if;
      return;
  end;
  raise exception 'FAIL %: expected error "%", but it succeeded', p_label, p_expected;
end;
$$;

\echo '===== SETUP ====='
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a0390000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'farmer-0039@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b0390000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'buyer-0039@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public."user" (user_id, full_name, role, contact_number, account_status)
values
  ('a0390000-0000-0000-0000-000000000001', 'Verify Farmer 0039', 'Farmer', '09170000039', 'Active'),
  ('b0390000-0000-0000-0000-000000000001', 'Verify Buyer 0039', 'Buyer', '09170000391', 'Active')
on conflict (user_id) do update
  set account_status = 'Active',
      suspension_reason = null,
      suspended_by = null,
      suspended_at = null;

insert into public.farmer (user_id) values ('a0390000-0000-0000-0000-000000000001')
on conflict do nothing;
insert into public.buyer (user_id) values ('b0390000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.marketpricefeed (effective_date, dry_base_price_per_kg, wet_base_price_per_kg)
select current_date, 20.85, 16.00
where not exists (select 1 from public.marketpricefeed where effective_date = current_date);

delete from public.push_notification_queue
  where user_id in ('a0390000-0000-0000-0000-000000000001', 'b0390000-0000-0000-0000-000000000001');
delete from public.payment where transaction_id in (
  select transaction_id from public.transactionmatch
  where listing_id::text like 'c0390000-%'
);
delete from public.transactionmatch where listing_id::text like 'c0390000-%';
delete from public.purchaserequest where listing_id::text like 'c0390000-%';
delete from public.user_trust_profile where user_id::text like 'b0390000-%';
delete from public.croplisting where listing_id::text like 'c0390000-%';

-- One listing and one accepted purchase request per check, so each check has
-- its own transaction. Listings 7 and 8 back the legacy rows in check 7;
-- listing 9 backs checks 8 and 9.
insert into public.croplisting (
  listing_id, farmer_id, listing_name, declared_variety, variety_code, declared_moisture,
  declared_purity_grade, gross_weight_kg, tare_weight_kg, remaining_quantity_kg,
  minimum_request_kg, status
)
select
  ('c0390000-0000-0000-0000-00000000000' || n)::uuid,
  'a0390000-0000-0000-0000-000000000001',
  'GCash ref listing ' || n, 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'
from generate_series(1, 9) n;

insert into public.purchaserequest (request_id, listing_id, buyer_id, requested_quantity_kg, status)
select
  ('d0390000-0000-0000-0000-00000000000' || n)::uuid,
  ('c0390000-0000-0000-0000-00000000000' || n)::uuid,
  'b0390000-0000-0000-0000-000000000001',
  50, 'Pending'
from generate_series(1, 9) n;

do $$
declare
  n integer;
begin
  perform set_config('request.jwt.claim.sub', 'a0390000-0000-0000-0000-000000000001', false);
  for n in 1..9 loop
    perform public.accept_purchase_request(('d0390000-0000-0000-0000-00000000000' || n)::uuid, 50);
  end loop;
end $$;

-- tx(n) = transaction for listing n.
create or replace function pg_temp.tx(n integer)
returns uuid
language sql
as $$
  select transaction_id from public.transactionmatch
  where request_id = ('d0390000-0000-0000-0000-00000000000' || n)::uuid
$$;

select set_config('request.jwt.claim.sub', 'b0390000-0000-0000-0000-000000000001', false);

\echo '===== 1: GCash with a valid 13-digit number goes through ====='
do $$
declare
  v_pay uuid;
  v_ref text;
begin
  v_pay := public.record_payment(pg_temp.tx(1), 'GCash', 1000, '0039000000001');
  select gcash_reference_number into v_ref from public.payment where payment_id = v_pay;
  if v_ref is distinct from '0039000000001' then
    raise exception 'FAIL 1: stored reference is %', v_ref;
  end if;
  raise notice '1 OK: payment % stored reference %', v_pay, v_ref;
end $$;

\echo '===== 2: GCash with an empty or short number is rejected ====='
do $$
declare
  v_rows integer;
begin
  perform pg_temp.expect_error('2 null',
    format('select public.record_payment(%L, ''GCash'', 1000, null)', pg_temp.tx(2)),
    'gcash reference required');
  perform pg_temp.expect_error('2 empty',
    format('select public.record_payment(%L, ''GCash'', 1000, '''')', pg_temp.tx(2)),
    'gcash reference required');
  perform pg_temp.expect_error('2 eleven digits',
    format('select public.record_payment(%L, ''GCash'', 1000, ''00390000002'')', pg_temp.tx(2)),
    'gcash reference invalid format');
  perform pg_temp.expect_error('2 fourteen digits',
    format('select public.record_payment(%L, ''GCash'', 1000, ''00390000000021'')', pg_temp.tx(2)),
    'gcash reference invalid format');

  select count(*) into v_rows from public.payment where transaction_id = pg_temp.tx(2);
  if v_rows <> 0 then
    raise exception 'FAIL 2: % payment rows created', v_rows;
  end if;
  raise notice '2 OK: null, empty, 11 and 14 digits rejected, no rows created';
end $$;

\echo '===== 3: letters or spaces are rejected ====='
do $$
declare
  v_rows integer;
begin
  perform pg_temp.expect_error('3 letters',
    format('select public.record_payment(%L, ''GCash'', 1000, ''00390000003ab'')', pg_temp.tx(3)),
    'gcash reference invalid format');
  perform pg_temp.expect_error('3 inner spaces',
    format('select public.record_payment(%L, ''GCash'', 1000, ''0039 0000 0003'')', pg_temp.tx(3)),
    'gcash reference invalid format');
  perform pg_temp.expect_error('3 leading space',
    format('select public.record_payment(%L, ''GCash'', 1000, '' 0039000000003'')', pg_temp.tx(3)),
    'gcash reference invalid format');
  perform pg_temp.expect_error('3 direct insert',
    format($q$insert into public.payment (transaction_id, payer_id, payee_id, payment_mode, amount, gcash_reference_number)
              values (%L, 'b0390000-0000-0000-0000-000000000001', 'a0390000-0000-0000-0000-000000000001',
                      'GCash', 1000, '003900000003x')$q$, pg_temp.tx(3)),
    'gcash reference invalid format');

  select count(*) into v_rows from public.payment where transaction_id = pg_temp.tx(3);
  if v_rows <> 0 then
    raise exception 'FAIL 3: % payment rows created', v_rows;
  end if;
  raise notice '3 OK: letters and spaces rejected through the RPC and a direct insert';
end $$;

\echo '===== 4: Cash with no number goes through ====='
do $$
declare
  v_pay uuid;
  v_ref text;
  v_mode text;
begin
  v_pay := public.record_payment(pg_temp.tx(4), 'Cash', 1000, null);
  select gcash_reference_number, payment_mode into v_ref, v_mode from public.payment where payment_id = v_pay;
  if v_mode <> 'Cash' or v_ref is not null then
    raise exception 'FAIL 4: mode %, reference %', v_mode, v_ref;
  end if;
  raise notice '4 OK: Cash payment % with no reference', v_pay;
end $$;

\echo '===== 5: Cash with a number is rejected ====='
do $$
declare
  v_rows integer;
begin
  perform pg_temp.expect_error('5 rpc',
    format('select public.record_payment(%L, ''Cash'', 1000, ''0039000000005'')', pg_temp.tx(5)),
    'gcash reference not allowed for cash');
  perform pg_temp.expect_error('5 direct insert',
    format($q$insert into public.payment (transaction_id, payer_id, payee_id, payment_mode, amount, gcash_reference_number)
              values (%L, 'b0390000-0000-0000-0000-000000000001', 'a0390000-0000-0000-0000-000000000001',
                      'Cash', 1000, '0039000000005')$q$, pg_temp.tx(5)),
    'gcash reference not allowed for cash');

  select count(*) into v_rows from public.payment where transaction_id = pg_temp.tx(5);
  if v_rows <> 0 then
    raise exception 'FAIL 5: % payment rows created', v_rows;
  end if;
  raise notice '5 OK: Cash with a number rejected through the RPC and a direct insert';
end $$;

\echo '===== 6: a duplicate GCash reference number is rejected ====='
do $$
declare
  v_rows integer;
begin
  -- 0039000000001 was stored in check 1.
  perform pg_temp.expect_error('6 rpc',
    format('select public.record_payment(%L, ''GCash'', 1000, ''0039000000001'')', pg_temp.tx(6)),
    'gcash reference already used');
  -- A direct insert skips the RPC pre-check and hits the unique index.
  perform pg_temp.expect_error('6 direct insert',
    format($q$insert into public.payment (transaction_id, payer_id, payee_id, payment_mode, amount, gcash_reference_number)
              values (%L, 'b0390000-0000-0000-0000-000000000001', 'a0390000-0000-0000-0000-000000000001',
                      'GCash', 1000, '0039000000001')$q$, pg_temp.tx(6)),
    'payment_gcash_reference_number_key');

  select count(*) into v_rows from public.payment where transaction_id = pg_temp.tx(6);
  if v_rows <> 0 then
    raise exception 'FAIL 6: % payment rows created', v_rows;
  end if;
  raise notice '6 OK: reused reference rejected through the RPC and the unique index';
end $$;

\echo '===== 7: existing payment rows are unaffected ====='
-- Legacy rows: 11-digit numbers, as test data written before 0039 may have.
-- replica mode skips all triggers for these two inserts only.
set session_replication_role = replica;
insert into public.payment (payment_id, transaction_id, payer_id, payee_id, payment_mode, amount, gcash_reference_number, status)
values
  ('e0390000-0000-0000-0000-000000000007', pg_temp.tx(7), 'b0390000-0000-0000-0000-000000000001',
   'a0390000-0000-0000-0000-000000000001', 'GCash', 1000, '00390000007', 'Pending'),
  ('e0390000-0000-0000-0000-000000000008', pg_temp.tx(8), 'b0390000-0000-0000-0000-000000000001',
   'a0390000-0000-0000-0000-000000000001', 'GCash', 1000, '00390000008', 'Pending');
set session_replication_role = origin;

do $$
declare
  v_ref text;
  v_status text;
  v_buyer_at timestamptz;
  v_changed integer;
  v_missing integer;
begin
  -- Buyer confirms sent, farmer confirms received on legacy row 7.
  perform set_config('request.jwt.claim.sub', 'b0390000-0000-0000-0000-000000000001', false);
  perform public.buyer_confirm_payment_sent('e0390000-0000-0000-0000-000000000007');
  perform set_config('request.jwt.claim.sub', 'a0390000-0000-0000-0000-000000000001', false);
  perform public.farmer_confirm_payment_received('e0390000-0000-0000-0000-000000000007');

  select gcash_reference_number, status, buyer_confirmed_at into v_ref, v_status, v_buyer_at
    from public.payment where payment_id = 'e0390000-0000-0000-0000-000000000007';
  if v_ref <> '00390000007' or v_status <> 'Confirmed' or v_buyer_at is null then
    raise exception 'FAIL 7 confirm: reference %, status %, buyer_confirmed_at %', v_ref, v_status, v_buyer_at;
  end if;

  -- Failed cascade on legacy row 8.
  perform public.report_payment_failed('e0390000-0000-0000-0000-000000000008');
  select gcash_reference_number, status into v_ref, v_status
    from public.payment where payment_id = 'e0390000-0000-0000-0000-000000000008';
  if v_ref <> '00390000008' or v_status <> 'Failed' then
    raise exception 'FAIL 7 failed: reference %, status %', v_ref, v_status;
  end if;
  if (select status from public.transactionmatch where transaction_id = pg_temp.tx(8)) <> 'Failed' then
    raise exception 'FAIL 7 failed: transaction did not cascade to Failed';
  end if;

  -- Rows that existed before this script: none missing, none changed.
  select count(*) into v_missing
    from payment_before_0039 b
    where not exists (select 1 from public.payment p where p.payment_id = b.payment_id);
  select count(*) into v_changed
    from payment_before_0039 b
    join public.payment p on p.payment_id = b.payment_id
    where md5(p::text) <> b.row_hash;
  if v_missing <> 0 or v_changed <> 0 then
    raise exception 'FAIL 7 existing: % missing, % changed', v_missing, v_changed;
  end if;

  raise notice '7 OK: legacy rows confirmed and failed with numbers kept; % pre-existing rows unchanged',
    (select count(*) from payment_before_0039);
end $$;

\echo '===== 8: repeated short legacy numbers coexist; a repeated 13-digit number does not ====='
-- Same shape as the hosted test data (123456 x5, 123456789 x5). replica mode
-- skips the trigger, as for rows written before 0039, but not the unique index.
set session_replication_role = replica;
insert into public.payment (payment_id, transaction_id, payer_id, payee_id, payment_mode, amount, gcash_reference_number, status)
select ('e0390000-0000-0000-0000-0000000008' || lpad(n::text, 2, '0'))::uuid, pg_temp.tx(9),
       'b0390000-0000-0000-0000-000000000001', 'a0390000-0000-0000-0000-000000000001', 'GCash', 1000,
       case when n <= 5 then '123456' else '123456789' end, 'Pending'
from generate_series(1, 10) n;

-- A repeated 13-digit number is rejected by the index itself, even with triggers off.
do $$
begin
  perform pg_temp.expect_error('8 duplicate 13-digit legacy',
    format($q$insert into public.payment (transaction_id, payer_id, payee_id, payment_mode, amount, gcash_reference_number, status)
              values (%L, 'b0390000-0000-0000-0000-000000000001', 'a0390000-0000-0000-0000-000000000001',
                      'GCash', 1000, '0039000000001', 'Pending')$q$, pg_temp.tx(9)),
    'payment_gcash_reference_number_key');
end $$;
set session_replication_role = origin;

do $$
declare
  v_short_6 integer;
  v_short_9 integer;
  v_13 integer;
begin
  select count(*) into v_short_6 from public.payment where gcash_reference_number = '123456' and transaction_id = pg_temp.tx(9);
  select count(*) into v_short_9 from public.payment where gcash_reference_number = '123456789' and transaction_id = pg_temp.tx(9);
  select count(*) into v_13 from public.payment where gcash_reference_number = '0039000000001';
  if v_short_6 <> 5 or v_short_9 <> 5 then
    raise exception 'FAIL 8: expected 5 + 5 short legacy rows, got % + %', v_short_6, v_short_9;
  end if;
  if v_13 <> 1 then
    raise exception 'FAIL 8: expected 1 row with 0039000000001, got %', v_13;
  end if;

  -- The short legacy numbers do not block anything new: the RPC still rejects
  -- them for format, never as "already used".
  perform set_config('request.jwt.claim.sub', 'b0390000-0000-0000-0000-000000000001', false);
  perform pg_temp.expect_error('8 short via rpc',
    format('select public.record_payment(%L, ''GCash'', 1000, ''123456'')', pg_temp.tx(9)),
    'gcash reference invalid format');

  raise notice '8 OK: 123456 x5 and 123456789 x5 coexist; repeated 13-digit number rejected by the index';
end $$;

\echo '===== RACE 9: same new number from two sessions at once ====='
do $$
begin
  if not exists (select 1 from pg_roles where rolname = current_user and rolsuper) then
    raise exception 'RACE 9 needs a superuser connection (supabase_admin). Checks 1-8 already finished.';
  end if;
end $$;
\echo 'Session A records the number and holds its transaction open. Session B sends'
\echo 'the same number, passes the exists() pre-check (A has not committed), and waits'
\echo 'on the unique index. A commits; B must fail with "gcash reference already used".'

create extension if not exists dblink with schema extensions;

do $$
declare
  v_tx uuid := pg_temp.tx(9);
  v_busy integer;
  v_b_ok boolean;
  v_b_detail text;
  v_rows integer;
begin
  -- Literal connection string: dblink rejects a password that only lives in a variable.
  perform extensions.dblink_connect('race_a_0039', 'host=127.0.0.1 port=5432 dbname=postgres user=postgres password=postgres');
  perform extensions.dblink_connect('race_b_0039', 'host=127.0.0.1 port=5432 dbname=postgres user=postgres password=postgres');

  perform extensions.dblink_exec('race_a_0039', 'begin');
  perform * from extensions.dblink('race_a_0039', format($q$
    select public.record_payment(%L::uuid, 'GCash', 1000, '0039000000009')::text
    from (select set_config('request.jwt.claim.sub', 'b0390000-0000-0000-0000-000000000001', false)) claims
  $q$, v_tx)) as t(result text);

  perform extensions.dblink_send_query('race_b_0039', format($q$
    select public.record_payment(%L::uuid, 'GCash', 1000, '0039000000009')::text
    from (select set_config('request.jwt.claim.sub', 'b0390000-0000-0000-0000-000000000001', false)) claims
  $q$, v_tx));

  perform pg_sleep(1);
  v_busy := extensions.dblink_is_busy('race_b_0039');
  if v_busy <> 1 then
    raise exception 'FAIL race 9: session B was not waiting on session A (dblink_is_busy = %)', v_busy;
  end if;

  perform extensions.dblink_exec('race_a_0039', 'commit');

  begin
    perform * from extensions.dblink_get_result('race_b_0039') as t(result text);
    v_b_ok := true;
  exception when others then
    v_b_ok := false;
    v_b_detail := sqlerrm;
  end;
  perform * from extensions.dblink_get_result('race_b_0039') as t(result text);

  perform extensions.dblink_disconnect('race_a_0039');
  perform extensions.dblink_disconnect('race_b_0039');

  if v_b_ok then
    raise exception 'FAIL race 9: session B also recorded 0039000000009';
  end if;
  if position('gcash reference already used' in coalesce(v_b_detail, '')) = 0 then
    raise exception 'FAIL race 9: expected "gcash reference already used", got "%"', v_b_detail;
  end if;

  select count(*) into v_rows from public.payment where gcash_reference_number = '0039000000009';
  if v_rows <> 1 then
    raise exception 'FAIL race 9: expected 1 row with 0039000000009, got %', v_rows;
  end if;

  raise notice 'RACE 9 OK: B waited, then failed with "%"; 1 row stored', v_b_detail;
end $$;

\echo '===== ALL 0039 CHECKS PASSED ====='

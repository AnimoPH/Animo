-- Step 2 verification for 0028_purchase_transaction_updated_at
\timing on
\set ON_ERROR_STOP on

\echo '===== CHECK 1: columns + triggers ====='
select c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in ('purchaserequest', 'transactionmatch')
  and c.column_name = 'updated_at'
order by c.table_name;

select event_object_table as table_name, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where event_object_schema = 'public'
  and trigger_name in ('purchaserequest_touch_updated_at', 'transactionmatch_touch_updated_at')
order by event_object_table;

\echo '===== SETUP: auth users + public users + listing ====='
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated',
   'farmer-verify@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated',
   'buyer-verify@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public."user" (user_id, full_name, role, contact_number)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Verify Farmer', 'Farmer', '09171111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Verify Buyer', 'Buyer', '09172222222')
on conflict (user_id) do nothing;

insert into public.farmer (user_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
on conflict do nothing;
insert into public.buyer (user_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
on conflict do nothing;

insert into public.croplisting (
  listing_id, farmer_id, listing_name, declared_variety, variety_code, declared_moisture,
  declared_purity_grade, gross_weight_kg, tare_weight_kg, remaining_quantity_kg,
  minimum_request_kg, status
) values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Verify Listing',
  'Inbred', 'OTHER', 'Dry', 'Ungraded',
  1100, 100, 1000, 50, 'Available'
) on conflict (listing_id) do update
  set remaining_quantity_kg = 1000, status = 'Available';

\echo '===== CHECK 2: direct PR status update advances updated_at ====='
insert into public.purchaserequest (
  request_id, listing_id, buyer_id, requested_quantity_kg, status
) values (
  'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  100, 'Pending'
);

select request_id, status, submitted_at, updated_at as before_ts
from public.purchaserequest where request_id = 'dddddddd-dddd-dddd-dddd-ddddddddddd1';

select pg_sleep(1.2);

update public.purchaserequest
  set status = 'Rejected'
  where request_id = 'dddddddd-dddd-dddd-dddd-ddddddddddd1';

select request_id, status, submitted_at, updated_at as after_ts,
  (updated_at > submitted_at) as updated_after_submit
from public.purchaserequest where request_id = 'dddddddd-dddd-dddd-dddd-ddddddddddd1';

\echo '===== CHECK 3: direct TM status update advances updated_at ====='
insert into public.purchaserequest (
  request_id, listing_id, buyer_id, requested_quantity_kg, status, accepted_quantity_kg
) values (
  'dddddddd-dddd-dddd-dddd-ddddddddddd2',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  50, 'Accepted', 50
);

insert into public.transactionmatch (
  transaction_id, listing_id, request_id, buyer_id, farmer_id,
  agreed_price_per_kg, quantity_kg, status
) values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-ddddddddddd2',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  20.00, 50, 'Pending_Payment'
);

select transaction_id, status, created_at, updated_at as before_ts
from public.transactionmatch where transaction_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2';

select pg_sleep(1.2);

update public.transactionmatch
  set status = 'Cancelled'
  where transaction_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2';

select transaction_id, status, created_at, updated_at as after_ts,
  (updated_at > created_at) as updated_after_create
from public.transactionmatch where transaction_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2';

\echo '===== CHECK 4a: reject_purchase_request RPC ====='
insert into public.purchaserequest (
  request_id, listing_id, buyer_id, requested_quantity_kg, status
) values (
  'dddddddd-dddd-dddd-dddd-ddddddddddd3',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  60, 'Pending'
);

select updated_at as before_reject from public.purchaserequest
where request_id = 'dddddddd-dddd-dddd-dddd-ddddddddddd3';
select pg_sleep(1.2);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select public.reject_purchase_request('dddddddd-dddd-dddd-dddd-ddddddddddd3');

select request_id, status, submitted_at, updated_at as after_reject,
  (updated_at > submitted_at) as ok
from public.purchaserequest where request_id = 'dddddddd-dddd-dddd-dddd-ddddddddddd3';

\echo '===== CHECK 4b: accept_purchase_request RPC ====='
insert into public.purchaserequest (
  request_id, listing_id, buyer_id, requested_quantity_kg, status
) values (
  'dddddddd-dddd-dddd-dddd-ddddddddddd4',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  80, 'Pending'
);

select updated_at as pr_before_accept from public.purchaserequest
where request_id = 'dddddddd-dddd-dddd-dddd-ddddddddddd4';
select pg_sleep(1.2);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select public.accept_purchase_request('dddddddd-dddd-dddd-dddd-ddddddddddd4', 80) as new_transaction_id;

select request_id, status, submitted_at, updated_at as pr_after_accept,
  (updated_at > submitted_at) as pr_ok
from public.purchaserequest where request_id = 'dddddddd-dddd-dddd-dddd-ddddddddddd4';

select transaction_id, status, created_at, updated_at as tm_after_accept
from public.transactionmatch where request_id = 'dddddddd-dddd-dddd-dddd-ddddddddddd4';

\echo '===== CHECK 4c: record_payment + buyer_confirm_payment_sent (the fixed path) ====='
do $$
declare
  v_tx uuid;
  v_pay uuid;
  v_before timestamptz;
  v_after timestamptz;
  v_status text;
  v_buyer_confirmed timestamptz;
begin
  select transaction_id into v_tx from public.transactionmatch
    where request_id = 'dddddddd-dddd-dddd-dddd-ddddddddddd4';

  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

  v_pay := public.record_payment(v_tx, 'Cash',
    (select total_amount from public.transactionmatch where transaction_id = v_tx),
    null);

  select updated_at, status into v_before, v_status
    from public.transactionmatch where transaction_id = v_tx;
  raise notice 'TM before buyer_confirm: status=% updated_at=%', v_status, v_before;

  perform pg_sleep(1.2);
  perform public.buyer_confirm_payment_sent(v_pay);

  select updated_at, status into v_after, v_status
    from public.transactionmatch where transaction_id = v_tx;
  select buyer_confirmed_at into v_buyer_confirmed
    from public.payment where payment_id = v_pay;

  raise notice 'TM after buyer_confirm: status=% updated_at=% advanced=%',
    v_status, v_after, (v_after > v_before);
  raise notice 'payment buyer_confirmed_at=%', v_buyer_confirmed;

  if v_after <= v_before then
    raise exception 'FAIL: buyer_confirm_payment_sent did not advance transactionmatch.updated_at';
  end if;
  if v_status <> 'Pending_Payment' then
    raise exception 'FAIL: buyer_confirm unexpectedly changed status to %', v_status;
  end if;
  if v_buyer_confirmed is null then
    raise exception 'FAIL: buyer_confirmed_at not set';
  end if;

  create temporary table verify_ids (transaction_id uuid, payment_id uuid) on commit preserve rows;
  insert into verify_ids values (v_tx, v_pay);
end $$;

\echo '===== CHECK 4d: farmer_confirm_payment_received ====='
do $$
declare
  v_tx uuid;
  v_pay uuid;
  v_before timestamptz;
  v_after timestamptz;
  v_status text;
begin
  select transaction_id, payment_id into v_tx, v_pay from verify_ids;

  select updated_at into v_before from public.transactionmatch where transaction_id = v_tx;
  perform pg_sleep(1.2);

  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
  perform public.farmer_confirm_payment_received(v_pay);

  select updated_at, status into v_after, v_status
    from public.transactionmatch where transaction_id = v_tx;

  raise notice 'TM after farmer_confirm: status=% updated_at=% advanced=%',
    v_status, v_after, (v_after > v_before);

  if v_status <> 'Payment_Confirmed' then
    raise exception 'FAIL: expected Payment_Confirmed, got %', v_status;
  end if;
  if v_after <= v_before then
    raise exception 'FAIL: farmer_confirm did not advance updated_at';
  end if;
end $$;

\echo '===== CHECK 4e: farmer_mark_delivered ====='
do $$
declare
  v_tx uuid;
  v_before timestamptz;
  v_after timestamptz;
  v_status text;
  v_completed timestamptz;
begin
  select transaction_id into v_tx from verify_ids;

  select updated_at into v_before from public.transactionmatch where transaction_id = v_tx;
  perform pg_sleep(1.2);

  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
  perform public.farmer_mark_delivered(v_tx);

  select updated_at, status, date_completed into v_after, v_status, v_completed
    from public.transactionmatch where transaction_id = v_tx;

  raise notice 'TM after deliver: status=% updated_at=% advanced=% date_completed=%',
    v_status, v_after, (v_after > v_before), v_completed;

  if v_status not in ('Delivered', 'Completed') then
    raise exception 'FAIL: unexpected status after deliver: %', v_status;
  end if;
  if v_after <= v_before then
    raise exception 'FAIL: deliver did not advance updated_at';
  end if;
end $$;

\echo '===== SUMMARY ====='
select 'PR' as kind, request_id::text as id, status, updated_at::text
from public.purchaserequest
where request_id::text like 'dddddddd-dddd-dddd-dddd-ddddddddddd%'
union all
select 'TM', transaction_id::text, status, updated_at::text
from public.transactionmatch
where transaction_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2'
   or request_id = 'dddddddd-dddd-dddd-dddd-ddddddddddd4'
order by kind, id;

\echo '===== ALL CHECKS PASSED ====='

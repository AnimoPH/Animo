-- Local verification for 0033_buyer_confirm_payment_touch_updated_at.
-- Expects develop's migration history through 0033 already applied.
-- CHECK 1 uses separate auto-committed statements because now() is
-- transaction-scoped (a single DO + pg_sleep cannot observe updated_at advance).
\timing on
\set ON_ERROR_STOP on

\echo '===== FUNCTION BODY (post-0033) ====='
select pg_get_functiondef('public.buyer_confirm_payment_sent'::regproc);

\echo '===== SETUP: farmer + buyer + listing ====='
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a0330000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'farmer-0033@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b0330000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'buyer-0033@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public."user" (user_id, full_name, role, contact_number, account_status)
values
  ('a0330000-0000-0000-0000-000000000001', 'Verify Farmer 0033', 'Farmer', '09173330001', 'Active'),
  ('b0330000-0000-0000-0000-000000000001', 'Verify Buyer 0033', 'Buyer', '09173330002', 'Active')
on conflict (user_id) do update
  set account_status = 'Active',
      suspension_reason = null,
      suspended_by = null,
      suspended_at = null;

insert into public.farmer (user_id) values ('a0330000-0000-0000-0000-000000000001')
on conflict do nothing;
insert into public.buyer (user_id) values ('b0330000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.croplisting (
  listing_id, farmer_id, listing_name, declared_variety, variety_code, declared_moisture,
  declared_purity_grade, gross_weight_kg, tare_weight_kg, remaining_quantity_kg,
  minimum_request_kg, status
) values (
  'c0330000-0000-0000-0000-000000000001',
  'a0330000-0000-0000-0000-000000000001',
  'Verify Listing 0033',
  'Inbred', 'OTHER', 'Dry', 'Ungraded',
  1100, 100, 1000, 50, 'Available'
) on conflict (listing_id) do update
  set remaining_quantity_kg = 1000, status = 'Available';

\echo '===== CHECK 1: active buyer confirm advances transactionmatch.updated_at ====='
insert into public.purchaserequest (
  request_id, listing_id, buyer_id, requested_quantity_kg, status
) values (
  'd0330000-0000-0000-0000-000000000001',
  'c0330000-0000-0000-0000-000000000001',
  'b0330000-0000-0000-0000-000000000001',
  80, 'Pending'
);

select set_config('request.jwt.claim.sub', 'a0330000-0000-0000-0000-000000000001', false);
select public.accept_purchase_request('d0330000-0000-0000-0000-000000000001', 80) as tx1
\gset

select set_config('request.jwt.claim.sub', 'b0330000-0000-0000-0000-000000000001', false);
select public.record_payment(
  :'tx1'::uuid,
  'Cash',
  (select total_amount from public.transactionmatch where transaction_id = :'tx1'::uuid),
  null
) as pay1
\gset

create temporary table verify_0033_before (
  before_ts timestamptz not null
) on commit preserve rows;
insert into verify_0033_before(before_ts)
select updated_at from public.transactionmatch where transaction_id = :'tx1'::uuid;

select before_ts as tm_before_confirm from verify_0033_before;
select pg_sleep(1.2);

select set_config('request.jwt.claim.sub', 'b0330000-0000-0000-0000-000000000001', false);
select public.buyer_confirm_payment_sent(:'pay1'::uuid);

select
  tm.status,
  b.before_ts as tm_before,
  tm.updated_at as tm_after,
  (tm.updated_at > b.before_ts) as advanced,
  p.buyer_confirmed_at
from public.transactionmatch tm
cross join verify_0033_before b
join public.payment p on p.payment_id = :'pay1'::uuid
where tm.transaction_id = :'tx1'::uuid;

do $$
declare
  v_advanced boolean;
  v_status text;
  v_buyer_confirmed timestamptz;
  v_before timestamptz;
  v_after timestamptz;
  v_tx uuid;
begin
  select transaction_id into v_tx
    from public.transactionmatch
   where request_id = 'd0330000-0000-0000-0000-000000000001';

  select b.before_ts, tm.updated_at, tm.status, p.buyer_confirmed_at,
         (tm.updated_at > b.before_ts)
    into v_before, v_after, v_status, v_buyer_confirmed, v_advanced
  from public.transactionmatch tm
  cross join verify_0033_before b
  join public.payment p on p.transaction_id = tm.transaction_id
  where tm.transaction_id = v_tx
    and p.buyer_confirmed_at is not null;

  raise notice 'CHECK1 before=% after=% advanced=% status=% buyer_confirmed_at=%',
    v_before, v_after, v_advanced, v_status, v_buyer_confirmed;

  if not coalesce(v_advanced, false) then
    raise exception 'FAIL CHECK1: buyer_confirm_payment_sent did not advance transactionmatch.updated_at';
  end if;
  if v_status <> 'Pending_Payment' then
    raise exception 'FAIL CHECK1: buyer_confirm unexpectedly changed status to %', v_status;
  end if;
  if v_buyer_confirmed is null then
    raise exception 'FAIL CHECK1: buyer_confirmed_at not set';
  end if;

  raise notice 'CHECK1 PASS';
end $$;

\echo '===== CHECK 2 setup: second listing (avoids in-flight-on-same-listing guard) ====='
insert into public.croplisting (
  listing_id, farmer_id, listing_name, declared_variety, variety_code, declared_moisture,
  declared_purity_grade, gross_weight_kg, tare_weight_kg, remaining_quantity_kg,
  minimum_request_kg, status
) values (
  'c0330000-0000-0000-0000-000000000002',
  'a0330000-0000-0000-0000-000000000001',
  'Verify Listing 0033b',
  'Inbred', 'OTHER', 'Dry', 'Ungraded',
  1100, 100, 1000, 50, 'Available'
) on conflict (listing_id) do update
  set remaining_quantity_kg = 1000, status = 'Available';

\echo '===== CHECK 2: suspended buyer is still blocked ====='
do $$
declare
  v_request_id uuid := 'd0330000-0000-0000-0000-000000000002';
  v_tx uuid;
  v_pay uuid;
  v_before timestamptz;
  v_after timestamptz;
  v_buyer_confirmed timestamptz;
  v_blocked boolean := false;
  v_err text;
begin
  update public."user"
    set account_status = 'Active',
        suspension_reason = null,
        suspended_by = null,
        suspended_at = null
    where user_id = 'b0330000-0000-0000-0000-000000000001';

  insert into public.purchaserequest (
    request_id, listing_id, buyer_id, requested_quantity_kg, status
  ) values (
    v_request_id,
    'c0330000-0000-0000-0000-000000000002',
    'b0330000-0000-0000-0000-000000000001',
    40, 'Pending'
  );

  perform set_config('request.jwt.claim.sub', 'a0330000-0000-0000-0000-000000000001', true);
  v_tx := public.accept_purchase_request(v_request_id, 40);

  perform set_config('request.jwt.claim.sub', 'b0330000-0000-0000-0000-000000000001', true);
  v_pay := public.record_payment(
    v_tx,
    'Cash',
    (select total_amount from public.transactionmatch where transaction_id = v_tx),
    null
  );

  select updated_at into v_before
    from public.transactionmatch where transaction_id = v_tx;

  update public."user"
    set account_status = 'Suspended',
        suspension_reason = 'verify_0033',
        suspended_at = now()
    where user_id = 'b0330000-0000-0000-0000-000000000001';

  begin
    perform public.buyer_confirm_payment_sent(v_pay);
  exception
    when others then
      v_blocked := true;
      v_err := SQLERRM;
  end;

  select updated_at into v_after
    from public.transactionmatch where transaction_id = v_tx;
  select buyer_confirmed_at into v_buyer_confirmed
    from public.payment where payment_id = v_pay;

  raise notice 'CHECK2 blocked=% err=%', v_blocked, v_err;
  raise notice 'CHECK2 TM updated_at before=% after=% unchanged=%',
    v_before, v_after, (v_after = v_before);
  raise notice 'CHECK2 payment buyer_confirmed_at=%', v_buyer_confirmed;

  if not v_blocked then
    raise exception 'FAIL CHECK2: suspended buyer was not blocked';
  end if;
  if v_err is distinct from 'account is suspended' then
    raise exception 'FAIL CHECK2: expected ''account is suspended'', got %', v_err;
  end if;
  if v_buyer_confirmed is not null then
    raise exception 'FAIL CHECK2: buyer_confirmed_at was set despite suspension';
  end if;
  if v_after is distinct from v_before then
    raise exception 'FAIL CHECK2: transactionmatch.updated_at changed despite suspension block';
  end if;

  raise notice 'CHECK2 PASS';
end $$;

\echo '===== ALL 0033 CHECKS PASSED ====='

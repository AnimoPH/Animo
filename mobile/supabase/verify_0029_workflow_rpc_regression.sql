-- Post-0029 regression: accept/reject/payment/delivery RPCs still work after
-- REVOKE UPDATE, DELETE on croplisting from authenticated.
\timing on
\set ON_ERROR_STOP on

\echo '===== PRECHECK: authenticated privileges on croplisting ====='
select privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'croplisting'
  and grantee = 'authenticated'
order by privilege_type;

\echo '===== SETUP ====='
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a0300000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'farmer-0030@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b0300000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'buyer-0030@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public."user" (user_id, full_name, role, contact_number)
values
  ('a0300000-0000-0000-0000-000000000001', 'Regression Farmer', 'Farmer', '09171110030'),
  ('b0300000-0000-0000-0000-000000000001', 'Regression Buyer', 'Buyer', '09172220030')
on conflict (user_id) do nothing;

insert into public.farmer (user_id) values ('a0300000-0000-0000-0000-000000000001')
on conflict do nothing;
insert into public.buyer (user_id) values ('b0300000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.marketpricefeed (effective_date, dry_base_price_per_kg, wet_base_price_per_kg)
select current_date, 20.00, 16.00
where not exists (select 1 from public.marketpricefeed);

-- Clean prior run
delete from public.payment where transaction_id in (
  select transaction_id from public.transactionmatch
  where listing_id in ('c0300000-0000-0000-0000-000000000001','c0300000-0000-0000-0000-000000000002')
);
delete from public.transactionmatch
  where listing_id in ('c0300000-0000-0000-0000-000000000001','c0300000-0000-0000-0000-000000000002');
delete from public.purchaserequest
  where listing_id in ('c0300000-0000-0000-0000-000000000001','c0300000-0000-0000-0000-000000000002');
delete from public.croplisting
  where listing_id in ('c0300000-0000-0000-0000-000000000001','c0300000-0000-0000-0000-000000000002');

insert into public.croplisting (
  listing_id, farmer_id, listing_name, declared_variety, variety_code, declared_moisture,
  declared_purity_grade, gross_weight_kg, tare_weight_kg, remaining_quantity_kg,
  minimum_request_kg, status
) values
  ('c0300000-0000-0000-0000-000000000001', 'a0300000-0000-0000-0000-000000000001',
   'Reject Flow Listing', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0300000-0000-0000-0000-000000000002', 'a0300000-0000-0000-0000-000000000001',
   'Accept Payment Delivery Listing', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available');

insert into public.purchaserequest (request_id, listing_id, buyer_id, requested_quantity_kg, status) values
  ('d0300000-0000-0000-0000-000000000001', 'c0300000-0000-0000-0000-000000000001',
   'b0300000-0000-0000-0000-000000000001', 100, 'Pending'),
  ('d0300000-0000-0000-0000-000000000002', 'c0300000-0000-0000-0000-000000000002',
   'b0300000-0000-0000-0000-000000000001', 150, 'Pending');

\echo '===== 1. reject_purchase_request ====='
select set_config('request.jwt.claim.sub', 'a0300000-0000-0000-0000-000000000001', false);
select public.reject_purchase_request('d0300000-0000-0000-0000-000000000001');
select request_id, status
from public.purchaserequest where request_id = 'd0300000-0000-0000-0000-000000000001';

\echo '===== 2. accept_purchase_request (updates croplisting remaining) ====='
select remaining_quantity_kg as remaining_before
from public.croplisting where listing_id = 'c0300000-0000-0000-0000-000000000002';

select public.accept_purchase_request('d0300000-0000-0000-0000-000000000002', 150) as new_transaction_id;

select request_id, status, accepted_quantity_kg
from public.purchaserequest where request_id = 'd0300000-0000-0000-0000-000000000002';

select remaining_quantity_kg as remaining_after,
       (remaining_quantity_kg = 850) as remaining_decremented_ok
from public.croplisting where listing_id = 'c0300000-0000-0000-0000-000000000002';

select transaction_id, status, quantity_kg
from public.transactionmatch where request_id = 'd0300000-0000-0000-0000-000000000002';

\echo '===== 3. record_payment + farmer_confirm_payment_received ====='
do $$
declare
  v_tx uuid;
  v_pay uuid;
  v_amount numeric;
  v_tm_status text;
  v_pay_status text;
begin
  select transaction_id, total_amount into v_tx, v_amount
    from public.transactionmatch
   where request_id = 'd0300000-0000-0000-0000-000000000002';

  perform set_config('request.jwt.claim.sub', 'b0300000-0000-0000-0000-000000000001', false);
  v_pay := public.record_payment(v_tx, 'Cash', v_amount, null);
  perform public.buyer_confirm_payment_sent(v_pay);

  perform set_config('request.jwt.claim.sub', 'a0300000-0000-0000-0000-000000000001', false);
  perform public.farmer_confirm_payment_received(v_pay);

  select status into v_tm_status from public.transactionmatch where transaction_id = v_tx;
  select status into v_pay_status from public.payment where payment_id = v_pay;

  raise notice 'farmer_confirm_payment_received OK: tm_status=% pay_status=% payment_id=%',
    v_tm_status, v_pay_status, v_pay;

  if v_tm_status <> 'Payment_Confirmed' then
    raise exception 'FAIL: expected Payment_Confirmed, got %', v_tm_status;
  end if;
  if v_pay_status <> 'Confirmed' then
    raise exception 'FAIL: expected payment Confirmed, got %', v_pay_status;
  end if;

  -- stash ids for next check via temp table
  create temporary table if not exists _reg_ids (tx uuid, pay uuid);
  delete from _reg_ids;
  insert into _reg_ids values (v_tx, v_pay);
end $$;

\echo '===== 4. farmer_mark_delivered ====='
do $$
declare
  v_tx uuid;
  v_tm_status text;
begin
  select tx into v_tx from _reg_ids;
  perform set_config('request.jwt.claim.sub', 'a0300000-0000-0000-0000-000000000001', false);
  perform public.farmer_mark_delivered(v_tx);

  select status into v_tm_status from public.transactionmatch where transaction_id = v_tx;
  raise notice 'farmer_mark_delivered OK: tm_status=%', v_tm_status;

  -- 0001 transactionmatch_check_completed derives Completed from Delivered
  -- the same way it always has — end state after mark_delivered is Completed.
  if v_tm_status <> 'Completed' then
    raise exception 'FAIL: expected Completed after mark_delivered, got %', v_tm_status;
  end if;
end $$;

\echo '===== 5. direct authenticated UPDATE on croplisting still blocked ====='
do $$
begin
  begin
    set local role authenticated;
    perform set_config('request.jwt.claim.sub', 'a0300000-0000-0000-0000-000000000001', true);
    update public.croplisting
      set listing_name = 'should fail'
      where listing_id = 'c0300000-0000-0000-0000-000000000002';
    reset role;
    raise exception 'UNEXPECTED: direct UPDATE as authenticated should fail';
  exception
    when insufficient_privilege then
      reset role;
      raise notice 'OK direct UPDATE blocked: %', sqlerrm;
    when others then
      reset role;
      if sqlerrm like '%permission denied%' or sqlerrm like '%insufficient%' then
        raise notice 'OK direct UPDATE blocked: %', sqlerrm;
      else
        raise;
      end if;
  end;
end $$;

\echo '===== DONE — all workflow RPCs passed ====='

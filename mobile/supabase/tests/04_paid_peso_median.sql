-- requires: 0042
-- Paid-peso rule (migration 0042): the next listing's base is the starting base
-- until the month has 5 paid trades of that moisture, then
-- (25 x start + n x median paid base) / (25 + n). Wet and dry are separate,
-- Rc218 Grade A has its 5 pesos taken off first, last month does not count.
-- Feed from 00_fixtures: dry 20.00, wet 15.50.
set session_replication_role = replica;
create function pg_temp.add_hist(p_moist text, p_paid numeric, p_prem numeric, p_ago interval, p_n int) returns void language sql as $$
  insert into public.transaction_price_history(transaction_id, price_per_kg, premium_per_kg, moisture, quantity_kg, completed_at)
  select gen_random_uuid(), p_paid, p_prem, p_moist, 10, now() - p_ago from generate_series(1, p_n) $$;
set session_replication_role = origin;

do $$ begin
  assert public.effective_base_price('Wet') = 15.50 and public.effective_base_price('Dry') = 20.00, 'FAIL starting bases';
  raise notice 'PASS: no paid trades, the starting bases are used (wet 15.50, dry 20.00)';
end $$;

set session_replication_role = replica;
select pg_temp.add_hist('Wet', 15, 0, '1 hour', 1); select pg_temp.add_hist('Wet', 16, 0, '1 hour', 1);
select pg_temp.add_hist('Wet', 17, 0, '1 hour', 1); select pg_temp.add_hist('Wet', 18, 0, '1 hour', 1);
set session_replication_role = origin;
do $$ begin
  assert public.effective_base_price('Wet') = 15.50, 'FAIL 4 trades moved the base';
  raise notice 'PASS: 4 paid wet trades do not move the base';
end $$;

set session_replication_role = replica;
select pg_temp.add_hist('Wet', 19, 0, '1 hour', 1);
set session_replication_role = origin;
do $$ declare w numeric; begin
  w := public.effective_base_price('Wet');
  assert abs(w - (25 * 15.5 + 5 * 17.0) / 30) < 1e-9, 'FAIL 5th trade ' || w;
  raise notice 'PASS: the 5th paid wet trade (median 17) gives (25 x 15.5 + 5 x 17) / 30 = %', round(w, 4);
end $$;

set session_replication_role = replica;
select pg_temp.add_hist('Wet', 20, 0, '1 hour', 1);
select pg_temp.add_hist('Wet', 30, 0, '40 days', 10);
set session_replication_role = origin;
do $$ declare w numeric; begin
  w := public.effective_base_price('Wet');
  assert abs(w - (25 * 15.5 + 6 * 17.5) / 31) < 1e-9, 'FAIL 6 trades or last month counted ' || w;
  assert public.effective_base_price('Dry') = 20.00, 'FAIL dry moved by wet trades';
  raise notice 'PASS: 6 trades (median 17.5) give %, last month''s 10 trades are ignored, dry stays 20.00', round(w, 4);
end $$;

set session_replication_role = replica;
select pg_temp.add_hist('Dry', 25, 5, '1 hour', 5);
set session_replication_role = origin;
do $$ begin
  assert abs(public.effective_base_price('Dry') - 20.00) < 1e-9, 'FAIL premium not removed';
  raise notice 'PASS: 5 Rc218 Grade A dry trades paid 25.00 (premium 5) keep the dry base at 20.00';
end $$;

select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$ declare l public.croplisting; cur numeric; msg text; begin
  cur := public.croplisting_compute_locked_price('Wet', 'OTHER', 'Ungraded');
  l := public.create_crop_listing(gen_random_uuid(), cur, 'New wet', 'Inbred', null, 'OTHER', null, null, 'Wet', 'Ungraded', 100, 0);
  assert abs(l.computed_price_per_kg - (25 * 15.5 + 6 * 17.5) / 31) < 1e-9, 'FAIL new listing did not lock the blended base';
  assert (select computed_price_per_kg from public.croplisting where listing_id = 'c0500000-1111-0000-0000-000000000001') = 20.00, 'FAIL an existing listing moved';
  raise notice 'PASS: a new wet listing locks the blended base %, the listing already up keeps 20.00', round(l.computed_price_per_kg, 4);
  begin
    perform public.create_crop_listing(gen_random_uuid(), 15.50, 'Stale', 'Inbred', null, 'OTHER', null, null, 'Wet', 'Ungraded', 100, 0);
    raise exception 'FAIL a stale peso was accepted';
  exception when others then
    get stacked diagnostics msg = message_text;
    assert msg like 'price changed:%', 'FAIL ' || msg;
    raise notice 'PASS: a phone that saw 15.50 is refused (%)', msg;
  end;
  assert abs(public.croplisting_compute_locked_price('Wet', '218', 'A') - (cur + 5)) < 1e-9, 'FAIL premium on top';
  raise notice 'PASS: Rc218 Grade A wet lock is the blended base + 5';
end $$;
do $$ declare r record; n int; begin
  select * into r from public.effective_base_prices();
  assert abs(r.wet_base_price_per_kg - public.effective_base_price('Wet')) < 1e-9, 'FAIL phone bases';
  select count(*) into n from public.transaction_price_history;
  assert n = 0, 'FAIL the app role can read the history rows';
  raise notice 'PASS: the phone bases match, and a signed-in user cannot read the trade history';
end $$;
reset role;

-- completion trigger: the peso actually paid per kilo, and the premium inside it
set session_replication_role = replica;
insert into public.croplisting(listing_id, farmer_id, declared_variety, declared_moisture, declared_purity_grade, variety_code,
  gross_weight_kg, tare_weight_kg, remaining_quantity_kg, listing_name, status, computed_price_per_kg)
values ('c0500000-1111-0000-0000-000000000009', 'c0500000-0000-0000-0000-000000000001', 'Inbred', 'Wet', 'A', '218', 1000, 0, 1000, 'Rc218 A wet', 'Available', 20.5);
insert into public.purchaserequest(request_id, listing_id, buyer_id, requested_quantity_kg, status) values
 ('c0500000-3333-0000-0000-000000000011', 'c0500000-1111-0000-0000-000000000009', 'c0500000-0000-0000-0000-000000000002', 50, 'Accepted'),
 ('c0500000-3333-0000-0000-000000000012', 'c0500000-1111-0000-0000-000000000009', 'c0500000-0000-0000-0000-000000000002', 50, 'Accepted');
insert into public.transactionmatch(transaction_id, listing_id, request_id, buyer_id, farmer_id, agreed_price_per_kg, quantity_kg, status) values
 ('c0500000-2222-0000-0000-000000000011', 'c0500000-1111-0000-0000-000000000009', 'c0500000-3333-0000-0000-000000000011', 'c0500000-0000-0000-0000-000000000002', 'c0500000-0000-0000-0000-000000000001', 20.5, 50, 'Delivered'),
 ('c0500000-2222-0000-0000-000000000012', 'c0500000-1111-0000-0000-000000000009', 'c0500000-3333-0000-0000-000000000012', 'c0500000-0000-0000-0000-000000000002', 'c0500000-0000-0000-0000-000000000001', 20.5, 50, 'Delivered');
insert into public.payment(transaction_id, payer_id, payee_id, payment_mode, amount, status, farmer_confirmed_at, buyer_confirmed_at) values
 ('c0500000-2222-0000-0000-000000000011', 'c0500000-0000-0000-0000-000000000002', 'c0500000-0000-0000-0000-000000000001', 'Cash', 1025, 'Confirmed', now(), now()),
 ('c0500000-2222-0000-0000-000000000012', 'c0500000-0000-0000-0000-000000000002', 'c0500000-0000-0000-0000-000000000001', 'Cash', 1000, 'Confirmed', now(), now());
set session_replication_role = origin;
update public.transactionmatch set status = 'Completed', date_completed = now()
  where transaction_id in ('c0500000-2222-0000-0000-000000000011', 'c0500000-2222-0000-0000-000000000012');
do $$ declare a record; b record; begin
  select * into a from public.transaction_price_history where transaction_id = 'c0500000-2222-0000-0000-000000000011';
  select * into b from public.transaction_price_history where transaction_id = 'c0500000-2222-0000-0000-000000000012';
  assert a.price_per_kg = 20.5 and a.premium_per_kg = 5 and a.moisture = 'Wet', 'FAIL matching cash';
  assert b.price_per_kg = 20.0 and b.premium_per_kg = 5, 'FAIL different cash';
  raise notice 'PASS: cash matched the locked 20.50/kg, the trade is recorded at 20.50 with premium 5';
  raise notice 'PASS: 1000 paid for 50 kg is recorded at 20.00/kg, not the locked 20.50';
end $$;

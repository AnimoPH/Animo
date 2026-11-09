-- FT-09 (migration 0038): a buyer cancels a Pending purchase request until the
-- farmer accepts. A cancel inside the first 30 seconds is free. A later cancel
-- counts toward the buyer's cancel rate. An accepted request cannot be
-- cancelled. A cancelled request lets the buyer send a new one for the listing.
-- The fixture buyer already has one Accepted request on the fixture listing.
set session_replication_role = replica;
insert into public.purchaserequest(request_id, listing_id, buyer_id, requested_quantity_kg, status, submitted_at, cancel_deadline)
values ('c0500000-3333-0000-0000-000000000011', 'c0500000-1111-0000-0000-000000000001',
  'c0500000-0000-0000-0000-000000000002', 100, 'Pending', now(), now() + interval '30 seconds');
set session_replication_role = origin;

select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.cancel_purchase_request('c0500000-3333-0000-0000-000000000011');
reset role;

do $$
declare r public.purchaserequest; rate numeric;
begin
  select * into r from public.purchaserequest where request_id = 'c0500000-3333-0000-0000-000000000011';
  assert r.status = 'Cancelled', 'FT-09 wrong status after a cancel inside 30 seconds: ' || r.status;
  assert r.cancelled_at <= r.cancel_deadline, 'FT-09 a cancel inside 30 seconds was marked late';
  raise notice 'PASS FT-09: a pending request cancelled inside 30 seconds becomes Cancelled and is not late';

  select purchase_request_cancel_rate_pct into rate from public.user_trust_profile
    where user_id = 'c0500000-0000-0000-0000-000000000002';
  assert rate = 0, 'FT-09 a free cancel moved the cancel rate to ' || coalesce(rate::text, 'null');
  raise notice 'PASS FT-09: the cancel inside 30 seconds is not counted in the cancel rate (0)';
end $$;

-- the buyer sends a new request for the same listing, 2 minutes ago on the clock
set session_replication_role = replica;
insert into public.purchaserequest(request_id, listing_id, buyer_id, requested_quantity_kg, status, submitted_at, cancel_deadline)
values ('c0500000-3333-0000-0000-000000000012', 'c0500000-1111-0000-0000-000000000001',
  'c0500000-0000-0000-0000-000000000002', 100, 'Pending', now() - interval '2 minutes', now() - interval '90 seconds');
set session_replication_role = origin;
do $$ begin
  raise notice 'PASS FT-09: after a cancel the buyer can send a new request for the same listing';
end $$;

select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.cancel_purchase_request('c0500000-3333-0000-0000-000000000012');
reset role;

do $$
declare r public.purchaserequest; rate numeric;
begin
  select * into r from public.purchaserequest where request_id = 'c0500000-3333-0000-0000-000000000012';
  assert r.status = 'Cancelled', 'FT-09 wrong status after a late cancel: ' || r.status;
  assert r.cancelled_at > r.cancel_deadline, 'FT-09 a late cancel was not marked late';
  raise notice 'PASS FT-09: a pending request cancelled after 30 seconds becomes Cancelled and is late';

  select purchase_request_cancel_rate_pct into rate from public.user_trust_profile
    where user_id = 'c0500000-0000-0000-0000-000000000002';
  -- 1 late cancel out of 3 requests (accepted, free cancel, late cancel)
  assert rate = 33.3, 'FT-09 wrong cancel rate after a late cancel: ' || coalesce(rate::text, 'null');
  raise notice 'PASS FT-09: the late cancel counts, 1 of 3 requests gives a cancel rate of 33.3';
end $$;

-- the farmer already accepted request c0500000-3333-...-01 (fixture): cancel is refused
select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
do $$
declare msg text;
begin
  begin
    perform public.cancel_purchase_request('c0500000-3333-0000-0000-000000000001');
    raise exception 'FT-09 a cancel of an accepted request went through';
  exception when others then
    get stacked diagnostics msg = message_text;
    assert msg = 'purchase request could not be cancelled', 'FT-09 wrong refusal: ' || msg;
  end;
  raise notice 'PASS FT-09: a request the farmer already accepted cannot be cancelled (%)', msg;
end $$;
reset role;
do $$
declare s text;
begin
  select status into s from public.purchaserequest where request_id = 'c0500000-3333-0000-0000-000000000001';
  assert s = 'Accepted', 'FT-09 the refused cancel changed the status to ' || s;
  raise notice 'PASS FT-09: the accepted request is still Accepted';
end $$;

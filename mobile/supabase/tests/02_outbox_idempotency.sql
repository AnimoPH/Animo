-- FT-08 and NF-02 (server side, migration 0041): a repeated send creates no
-- second record, and a stale peso is refused.
select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare a public.croplisting; b public.croplisting; n int; msg text;
begin
  a := public.create_crop_listing('c0500000-5555-0000-0000-000000000001', 20.00, 'Offline palay', 'Inbred', null, 'OTHER', null, null, 'Dry', 'Ungraded', 1000, 50);
  b := public.create_crop_listing('c0500000-5555-0000-0000-000000000001', 20.00, 'Offline palay', 'Inbred', null, 'OTHER', null, null, 'Dry', 'Ungraded', 1000, 50);
  select count(*) into n from public.croplisting where client_request_id = 'c0500000-5555-0000-0000-000000000001';
  assert a.listing_id = b.listing_id and n = 1, 'FT-08 FAIL a repeat created a second listing';
  raise notice 'PASS FT-08: a repeated listing send returns the same listing, one row';

  begin
    perform public.create_crop_listing(gen_random_uuid(), 18.50, 'Stale', 'Inbred', null, 'OTHER', null, null, 'Dry', 'Ungraded', 1000, 0);
    raise exception 'FAIL a stale peso was accepted';
  exception when others then
    get stacked diagnostics msg = message_text;
    assert msg like 'price changed:%', 'FAIL wrong error ' || msg;
    raise notice 'PASS FT-08: a phone that saw 18.50 is refused (%)', msg;
  end;

  begin
    perform public.create_crop_listing(null, null, 'No id', 'Inbred', null, 'OTHER', null, null, 'Dry', 'Ungraded', 1000, 0);
    raise exception 'FAIL accepted a null request id';
  exception when others then
    raise notice 'PASS NF-02: a send with no request id is refused';
  end;
end $$;

select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare p1 uuid; p2 uuid; n int; msg text; lid uuid := 'c0500000-5555-0000-0000-000000000001'::uuid;
begin
  select listing_id into lid from public.croplisting where client_request_id = 'c0500000-5555-0000-0000-000000000001';
  insert into public.purchaserequest(listing_id, buyer_id, requested_quantity_kg, client_request_id)
    values (lid, auth.uid(), 100, 'c0500000-6666-0000-0000-000000000001');
  begin
    insert into public.purchaserequest(listing_id, buyer_id, requested_quantity_kg, client_request_id)
      values (lid, auth.uid(), 100, 'c0500000-6666-0000-0000-000000000001');
    raise exception 'FAIL a second request was inserted';
  exception when unique_violation then
    raise notice 'PASS FT-08: a repeated purchase request is refused as a duplicate, one row';
  end;

  p1 := public.record_payment('c0500000-2222-0000-0000-000000000001', 'GCash', 2000, '1234567890123', 'c0500000-7777-0000-0000-000000000001');
  p2 := public.record_payment('c0500000-2222-0000-0000-000000000001', 'GCash', 2000, '1234567890123', 'c0500000-7777-0000-0000-000000000001');
  select count(*) into n from public.payment where client_request_id = 'c0500000-7777-0000-0000-000000000001';
  assert p1 = p2 and n = 1, 'FAIL a repeated payment created a second row';
  raise notice 'PASS FT-08: a repeated payment send returns the same payment, one row';

  begin
    perform public.record_payment('c0500000-2222-0000-0000-000000000001', 'GCash', 2000, '1234567890123', gen_random_uuid());
    raise exception 'FAIL a reused GCash reference was accepted';
  exception when others then
    get stacked diagnostics msg = message_text;
    assert msg = 'gcash reference already used', 'FAIL wrong message ' || msg;
    raise notice 'PASS: a new request with a reused GCash reference is still refused';
  end;

  perform public.buyer_confirm_payment_sent(p1);
end $$;

reset role;
create temp table _t1 as select buyer_confirmed_at as first_confirm from public.payment where client_request_id = 'c0500000-7777-0000-0000-000000000001';
select pg_sleep(1.1);
select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.buyer_confirm_payment_sent(payment_id) from public.payment where client_request_id = 'c0500000-7777-0000-0000-000000000001';
reset role;
do $$ declare a timestamptz; b timestamptz; begin
  select first_confirm into a from _t1;
  select buyer_confirmed_at into b from public.payment where client_request_id = 'c0500000-7777-0000-0000-000000000001';
  assert a = b, 'FAIL a second buyer confirm moved the time';
  raise notice 'PASS NF-02: a second buyer confirm keeps the first confirmation time';
end $$;

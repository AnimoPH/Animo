-- requires: 0045
-- A new purchase request notifies the farmer of that listing and nobody else
-- (migration 0045). A repeated send of the same request makes no second notice.
set session_replication_role = replica;
insert into public.croplisting(listing_id, farmer_id, declared_variety, declared_moisture, declared_purity_grade,
  variety_code, gross_weight_kg, tare_weight_kg, remaining_quantity_kg, minimum_request_kg, listing_name, status, computed_price_per_kg)
values ('c0700000-1111-0000-0000-000000000001', 'c0500000-0000-0000-0000-000000000001', 'Inbred', 'Dry', 'Ungraded',
  'OTHER', 1000, 0, 1000, 50, 'Notice listing', 'Available', 20.00);
set session_replication_role = origin;
delete from public.push_notification_queue;

do $$
declare n int; b text; k text; buyer_n int;
begin
  insert into public.purchaserequest(listing_id, buyer_id, requested_quantity_kg, client_request_id)
    values ('c0700000-1111-0000-0000-000000000001', 'c0500000-0000-0000-0000-000000000002', 100,
            'c0700000-2222-0000-0000-000000000001');
  select count(*), min(body), min(data->>'type') into n, b, k from public.push_notification_queue
    where user_id = 'c0500000-0000-0000-0000-000000000001';
  select count(*) into buyer_n from public.push_notification_queue
    where user_id = 'c0500000-0000-0000-0000-000000000002';
  assert n = 1, 'FAIL farmer got ' || n || ' notices, expected 1';
  assert k = 'purchase_request_received', 'FAIL type was ' || coalesce(k, 'none');
  assert b = 'May bagong purchase request sa iyong listing.', 'FAIL body was ' || b;
  assert buyer_n = 0, 'FAIL buyer got ' || buyer_n || ' notices, expected 0';
  raise notice 'PASS: a new request notifies the farmer once and not the buyer';
end $$;

do $$
declare n int;
begin
  begin
    insert into public.purchaserequest(listing_id, buyer_id, requested_quantity_kg, client_request_id)
      values ('c0700000-1111-0000-0000-000000000001', 'c0500000-0000-0000-0000-000000000002', 100,
              'c0700000-2222-0000-0000-000000000001');
  exception when unique_violation then null;
  end;
  select count(*) into n from public.push_notification_queue where user_id = 'c0500000-0000-0000-0000-000000000001';
  assert n = 1, 'FAIL a repeated request made ' || n || ' notices, expected 1';
  raise notice 'PASS: a repeated send makes no second notice';
end $$;

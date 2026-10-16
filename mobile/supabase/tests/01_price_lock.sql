-- FT-01 and FT-02: the price comes from the saved feed, the farmer does not
-- type it, and a later refresh of the feed leaves a listing's peso alone.
select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare l public.croplisting; args text;
begin
  -- the create_crop_listing function has no peso to write, only the peso the farmer saw
  select pg_get_function_arguments('public.create_crop_listing(uuid,numeric,text,text,text,text,text,text,text,text,numeric,numeric)'::regprocedure) into args;
  assert args !~* 'computed|price_per_kg' or args ~* 'p_seen_price_per_kg', 'FT-01 FAIL the function takes a price';

  l := public.create_crop_listing(gen_random_uuid(), null, 'Dry other', 'Inbred', null, 'OTHER', null, null, 'Dry', 'Ungraded', 100, 0);
  assert l.computed_price_per_kg = 20.00, 'FT-01 FAIL dry other ' || l.computed_price_per_kg;
  raise notice 'PASS FT-01: dry listing locks the feed dry base 20.00';

  l := public.create_crop_listing(gen_random_uuid(), null, 'Wet other', 'Inbred', null, 'OTHER', null, null, 'Wet', 'Ungraded', 100, 0);
  assert l.computed_price_per_kg = 15.50, 'FT-01 FAIL wet other ' || l.computed_price_per_kg;
  raise notice 'PASS FT-01: wet listing locks the wet base 15.50';

  l := public.create_crop_listing(gen_random_uuid(), null, 'Dry 218 A', 'Inbred', null, '218', null, null, 'Dry', 'A', 100, 0);
  assert l.computed_price_per_kg = 25.00, 'FT-01 FAIL dry 218 A ' || l.computed_price_per_kg;
  raise notice 'PASS FT-01: NSIC Rc218 Grade A adds 5 -> 25.00';

  l := public.create_crop_listing(gen_random_uuid(), null, 'Wet 218 A', 'Inbred', null, '218', null, null, 'Wet', 'A', 100, 0);
  assert l.computed_price_per_kg = 20.50, 'FT-01 FAIL wet 218 A ' || l.computed_price_per_kg;
  raise notice 'PASS FT-01: wet Rc218 Grade A -> 20.50';

  l := public.create_crop_listing(gen_random_uuid(), null, 'Dry 218 B', 'Inbred', null, '218', null, null, 'Dry', 'B', 100, 0);
  assert l.computed_price_per_kg = 20.00, 'FT-01 FAIL 218 grade B must carry no premium';
  raise notice 'PASS FT-01: Rc218 below Grade A carries no premium';
end $$;

do $$
declare l public.croplisting; fresh public.croplisting; kept numeric;
begin
  l := public.create_crop_listing('c0500000-4444-0000-0000-000000000001', null, 'Before refresh', 'Inbred', null, 'OTHER', null, null, 'Dry', 'Ungraded', 100, 0);
  assert l.computed_price_per_kg = 20.00;
end $$;

-- the feed refresh (refresh-dry-base) updates the single feed row in place
reset role;
update public.marketpricefeed set dry_base_price_per_kg = 22.00, effective_date = current_date;
select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare kept numeric; fresh public.croplisting;
begin
  select computed_price_per_kg into kept from public.croplisting where client_request_id = 'c0500000-4444-0000-0000-000000000001';
  assert kept = 20.00, 'FT-02 FAIL the listing moved to ' || kept;
  raise notice 'PASS FT-02: after the feed moved to 22.00 the existing listing still shows 20.00';

  fresh := public.create_crop_listing(gen_random_uuid(), null, 'After refresh', 'Inbred', null, 'OTHER', null, null, 'Dry', 'Ungraded', 100, 0);
  assert fresh.computed_price_per_kg = 22.00, 'FT-02 FAIL new listing ' || fresh.computed_price_per_kg;
  raise notice 'PASS FT-02: a new listing locks the refreshed base 22.00';
end $$;

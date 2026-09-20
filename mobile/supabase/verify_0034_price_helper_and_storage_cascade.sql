-- Local verification for 0034_croplisting_price_helper_and_storage_cascade.
-- Expects this branch's history through 0034 already applied.
\timing on
\set ON_ERROR_STOP on

\echo '===== CHECK 0: 0034 functions present ====='
select to_regprocedure('public.croplisting_compute_locked_price(text,text,text)') is not null as compute_exists;
select pg_get_functiondef('public.croplisting_lock_price'::regproc);
select pg_get_functiondef('public.croplisting_delete_photos_cascade'::regproc);

\echo '===== SETUP ====='
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a0340000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'farmer-0034@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b0340000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'buyer-0034@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public."user" (user_id, full_name, role, contact_number, account_status)
values
  ('a0340000-0000-0000-0000-000000000001', 'Verify Farmer 0034', 'Farmer', '09173440001', 'Active'),
  ('b0340000-0000-0000-0000-000000000001', 'Verify Buyer 0034', 'Buyer', '09173440002', 'Active')
on conflict (user_id) do update set account_status = 'Active';

insert into public.farmer (user_id) values ('a0340000-0000-0000-0000-000000000001')
on conflict do nothing;
insert into public.buyer (user_id) values ('b0340000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.marketpricefeed (effective_date, dry_base_price_per_kg, wet_base_price_per_kg)
select current_date, 20.00, 16.00
where not exists (select 1 from public.marketpricefeed);

-- L1 active deal (cosmetic lock), L2 full edit+price, L3 delete+photos, L4 ever-had delete blocked
insert into public.croplisting (
  listing_id, farmer_id, listing_name, declared_variety, variety_code, declared_moisture,
  declared_purity_grade, gross_weight_kg, tare_weight_kg, remaining_quantity_kg,
  minimum_request_kg, status
) values
  ('c0340000-0000-0000-0000-000000000001', 'a0340000-0000-0000-0000-000000000001',
   'L1 Active Deal', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0340000-0000-0000-0000-000000000002', 'a0340000-0000-0000-0000-000000000001',
   'L2 Full Edit', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0340000-0000-0000-0000-000000000003', 'a0340000-0000-0000-0000-000000000001',
   'L3 Delete Clean', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0340000-0000-0000-0000-000000000004', 'a0340000-0000-0000-0000-000000000001',
   'L4 Had Rejected', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available');

insert into public.listingphoto (listing_id, photo_type, storage_uri) values
  ('c0340000-0000-0000-0000-000000000003', 'Overview', 'c0340000-0000-0000-0000-000000000003/Overview.jpg'),
  ('c0340000-0000-0000-0000-000000000003', 'BeforeHarvest', 'c0340000-0000-0000-0000-000000000003/BeforeHarvest.jpg');

insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', false)
on conflict (id) do nothing;

select set_config('storage.allow_delete_query', 'true', false);
delete from storage.objects
where bucket_id = 'listing-photos'
  and name like 'c0340000-0000-0000-0000-000000000003/%';

insert into storage.objects (bucket_id, name, metadata)
values
  ('listing-photos', 'c0340000-0000-0000-0000-000000000003/Overview.jpg', '{}'::jsonb),
  ('listing-photos', 'c0340000-0000-0000-0000-000000000003/BeforeHarvest.jpg', '{}'::jsonb);

insert into public.purchaserequest (listing_id, buyer_id, requested_quantity_kg, status) values
  ('c0340000-0000-0000-0000-000000000001', 'b0340000-0000-0000-0000-000000000001', 100, 'Pending'),
  ('c0340000-0000-0000-0000-000000000004', 'b0340000-0000-0000-0000-000000000001', 100, 'Rejected');

select set_config('request.jwt.claim.sub', 'a0340000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

\echo '===== CHECK A: price recompute via shared helper ====='
select listing_name, declared_moisture, variety_code, declared_purity_grade,
       computed_price_per_kg as price_before,
       public.croplisting_compute_locked_price(declared_moisture, variety_code, declared_purity_grade) as expected_before
from public.croplisting where listing_id = 'c0340000-0000-0000-0000-000000000002';

select public.croplisting_compute_locked_price('Dry', 'OTHER', 'Ungraded') as expected_dry_other_ungraded,
       public.croplisting_compute_locked_price('Wet', '218', 'A') as expected_wet_218_a;

select public.update_own_crop_listing(
  p_listing_id := 'c0340000-0000-0000-0000-000000000002',
  p_listing_name := 'L2 Fully Edited',
  p_declared_moisture := 'Wet',
  p_variety_code := '218',
  p_declared_purity_grade := 'A',
  p_remaining_quantity_kg := 900
);

select listing_name, declared_moisture, variety_code, declared_purity_grade,
       remaining_quantity_kg, computed_price_per_kg as price_after,
       public.croplisting_compute_locked_price('Wet', '218', 'A') as expected_after,
       (computed_price_per_kg = public.croplisting_compute_locked_price('Wet', '218', 'A')) as price_matches_helper
from public.croplisting where listing_id = 'c0340000-0000-0000-0000-000000000002';

do $$
declare
  v_before numeric;
  v_after numeric;
  v_expected numeric;
begin
  -- price_before was Dry/OTHER/Ungraded at insert; after edit must differ and match helper
  v_expected := public.croplisting_compute_locked_price('Wet', '218', 'A');
  select computed_price_per_kg into v_after
    from public.croplisting where listing_id = 'c0340000-0000-0000-0000-000000000002';
  v_before := public.croplisting_compute_locked_price('Dry', 'OTHER', 'Ungraded');

  if v_after is distinct from v_expected then
    raise exception 'FAIL CHECK A: price_after % != helper %', v_after, v_expected;
  end if;
  if v_after = v_before then
    raise exception 'FAIL CHECK A: price did not change after moisture/variety/purity edit';
  end if;
  raise notice 'CHECK A PASS before=% after=% expected=%', v_before, v_after, v_expected;
end $$;

\echo '===== CHECK B: delete with photos — storage cleanup ====='
select count(*) as photo_rows_before
from public.listingphoto where listing_id = 'c0340000-0000-0000-0000-000000000003';
select count(*) as storage_objects_before
from storage.objects
where bucket_id = 'listing-photos'
  and name like 'c0340000-0000-0000-0000-000000000003/%';

select public.delete_own_crop_listing('c0340000-0000-0000-0000-000000000003');

select exists(
  select 1 from public.croplisting where listing_id = 'c0340000-0000-0000-0000-000000000003'
) as listing_still_exists;
select count(*) as photo_rows_after
from public.listingphoto where listing_id = 'c0340000-0000-0000-0000-000000000003';
select count(*) as storage_objects_after
from storage.objects
where bucket_id = 'listing-photos'
  and name like 'c0340000-0000-0000-0000-000000000003/%';

do $$
begin
  if exists(select 1 from public.croplisting where listing_id = 'c0340000-0000-0000-0000-000000000003') then
    raise exception 'FAIL CHECK B: listing still exists after delete';
  end if;
  if exists(select 1 from public.listingphoto where listing_id = 'c0340000-0000-0000-0000-000000000003') then
    raise exception 'FAIL CHECK B: listingphoto rows remain';
  end if;
  if exists(
    select 1 from storage.objects
    where bucket_id = 'listing-photos'
      and name like 'c0340000-0000-0000-0000-000000000003/%'
  ) then
    raise exception 'FAIL CHECK B: storage.objects remain';
  end if;
  raise notice 'CHECK B PASS listing+photos+storage cleaned';
end $$;

\echo '===== CHECK C: cosmetic lock during active deal ====='
select public.listing_has_active_deal('c0340000-0000-0000-0000-000000000001') as l1_active;

select public.update_own_crop_listing(
  p_listing_id := 'c0340000-0000-0000-0000-000000000001',
  p_listing_name := 'L1 Renamed Cosmetic'
);

select listing_name from public.croplisting where listing_id = 'c0340000-0000-0000-0000-000000000001';

do $$
begin
  begin
    perform public.update_own_crop_listing(
      p_listing_id := 'c0340000-0000-0000-0000-000000000001',
      p_declared_moisture := 'Wet'
    );
    raise exception 'FAIL CHECK C: moisture update should have been rejected';
  exception
    when others then
      if sqlerrm like '%only listing_name is editable while listing has an active deal%' then
        raise notice 'CHECK C PASS locked moisture rejected: %', sqlerrm;
      else
        raise;
      end if;
  end;

  begin
    perform public.update_own_crop_listing(
      p_listing_id := 'c0340000-0000-0000-0000-000000000001',
      p_remaining_quantity_kg := 500
    );
    raise exception 'FAIL CHECK C: quantity update should have been rejected';
  exception
    when others then
      if sqlerrm like '%only listing_name is editable while listing has an active deal%' then
        raise notice 'CHECK C PASS locked quantity rejected: %', sqlerrm;
      else
        raise;
      end if;
  end;

  begin
    perform public.update_own_crop_listing(
      p_listing_id := 'c0340000-0000-0000-0000-000000000001',
      p_variety_code := '218',
      p_declared_purity_grade := 'A'
    );
    raise exception 'FAIL CHECK C: variety/purity update should have been rejected';
  exception
    when others then
      if sqlerrm like '%only listing_name is editable while listing has an active deal%' then
        raise notice 'CHECK C PASS locked variety/purity rejected: %', sqlerrm;
      else
        raise;
      end if;
  end;
end $$;

\echo '===== CHECK D: delete blocked when listing ever had a request ====='
do $$
begin
  begin
    perform public.delete_own_crop_listing('c0340000-0000-0000-0000-000000000004');
    raise exception 'FAIL CHECK D: delete with past request should have been blocked';
  exception
    when others then
      if sqlerrm like '%cannot delete listing that has ever had a purchase request%' then
        raise notice 'CHECK D PASS delete blocked: %', sqlerrm;
      else
        raise;
      end if;
  end;
end $$;

select exists(
  select 1 from public.croplisting where listing_id = 'c0340000-0000-0000-0000-000000000004'
) as l4_still_exists;

\echo '===== ALL 0034 CHECKS PASSED ====='

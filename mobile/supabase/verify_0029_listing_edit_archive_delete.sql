-- Step 2 verification for 0029_listing_edit_archive_delete
\timing on
\set ON_ERROR_STOP on

\echo '===== CHECK 1: status CHECK includes Archived + RPCs exist ====='
select conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid = 'public.croplisting'::regclass
  and conname = 'croplisting_status_check';

select p.proname,
       pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'listing_has_active_deal',
    'listing_ever_had_request',
    'update_own_crop_listing',
    'archive_own_crop_listing',
    'delete_own_crop_listing',
    'croplisting_compute_locked_price'
  )
order by p.proname;

\echo '===== SETUP: auth users + farmer/buyer + seed listings ====='
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a0290000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'farmer-0029@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b0290000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'buyer-0029@example.com', crypt('password', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public."user" (user_id, full_name, role, contact_number)
values
  ('a0290000-0000-0000-0000-000000000001', 'Verify Farmer 0029', 'Farmer', '09171110029'),
  ('b0290000-0000-0000-0000-000000000001', 'Verify Buyer 0029', 'Buyer', '09172220029')
on conflict (user_id) do nothing;

insert into public.farmer (user_id) values ('a0290000-0000-0000-0000-000000000001')
on conflict do nothing;
insert into public.buyer (user_id) values ('b0290000-0000-0000-0000-000000000001')
on conflict do nothing;

-- Ensure market price feed has a row so lock-price can compute
insert into public.marketpricefeed (effective_date, dry_base_price_per_kg, wet_base_price_per_kg)
select current_date, 20.00, 16.00
where not exists (select 1 from public.marketpricefeed);

-- L1: active Pending request (cosmetic-only edits)
-- L2: no active deal (full edit + price recompute)
-- L3: zero requests ever (hard delete + photos)
-- L4: had a Rejected request (delete blocked, archive ok)
-- L5: active deal for archive-blocked check
-- L6: archive then confirm buyer browse excludes it

delete from public.purchaserequest where listing_id in (
  'c0290000-0000-0000-0000-000000000001',
  'c0290000-0000-0000-0000-000000000002',
  'c0290000-0000-0000-0000-000000000003',
  'c0290000-0000-0000-0000-000000000004',
  'c0290000-0000-0000-0000-000000000005',
  'c0290000-0000-0000-0000-000000000006'
);
delete from public.listingphoto where listing_id in (
  'c0290000-0000-0000-0000-000000000001',
  'c0290000-0000-0000-0000-000000000002',
  'c0290000-0000-0000-0000-000000000003',
  'c0290000-0000-0000-0000-000000000004',
  'c0290000-0000-0000-0000-000000000005',
  'c0290000-0000-0000-0000-000000000006'
);
delete from public.croplisting where listing_id in (
  'c0290000-0000-0000-0000-000000000001',
  'c0290000-0000-0000-0000-000000000002',
  'c0290000-0000-0000-0000-000000000003',
  'c0290000-0000-0000-0000-000000000004',
  'c0290000-0000-0000-0000-000000000005',
  'c0290000-0000-0000-0000-000000000006'
);

insert into public.croplisting (
  listing_id, farmer_id, listing_name, declared_variety, variety_code, declared_moisture,
  declared_purity_grade, gross_weight_kg, tare_weight_kg, remaining_quantity_kg,
  minimum_request_kg, status
) values
  ('c0290000-0000-0000-0000-000000000001', 'a0290000-0000-0000-0000-000000000001',
   'L1 Active Deal', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0290000-0000-0000-0000-000000000002', 'a0290000-0000-0000-0000-000000000001',
   'L2 Full Edit', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0290000-0000-0000-0000-000000000003', 'a0290000-0000-0000-0000-000000000001',
   'L3 Delete Clean', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0290000-0000-0000-0000-000000000004', 'a0290000-0000-0000-0000-000000000001',
   'L4 Had Rejected', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0290000-0000-0000-0000-000000000005', 'a0290000-0000-0000-0000-000000000001',
   'L5 Archive Blocked', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available'),
  ('c0290000-0000-0000-0000-000000000006', 'a0290000-0000-0000-0000-000000000001',
   'L6 Archive Browse', 'Inbred', 'OTHER', 'Dry', 'Ungraded', 1100, 100, 1000, 50, 'Available');

-- Photo rows for L3 (delete should cascade row + storage trigger)
insert into public.listingphoto (listing_id, photo_type, storage_uri) values
  ('c0290000-0000-0000-0000-000000000003', 'Overview', 'c0290000-0000-0000-0000-000000000003/Overview.jpg'),
  ('c0290000-0000-0000-0000-000000000003', 'BeforeHarvest', 'c0290000-0000-0000-0000-000000000003/BeforeHarvest.jpg');

-- Fake storage objects so cascade trigger has something to delete.
-- Inserts are allowed; deletes need storage.allow_delete_query (set by the
-- fixed croplisting_delete_photos_cascade in 0029). is_local=false so the
-- GUC survives across psql auto-commit statements in this session.
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', false)
on conflict (id) do nothing;

select set_config('storage.allow_delete_query', 'true', false);
delete from storage.objects
where bucket_id = 'listing-photos'
  and name like 'c0290000-0000-0000-0000-000000000003/%';

insert into storage.objects (bucket_id, name, metadata)
values
  ('listing-photos', 'c0290000-0000-0000-0000-000000000003/Overview.jpg', '{}'::jsonb),
  ('listing-photos', 'c0290000-0000-0000-0000-000000000003/BeforeHarvest.jpg', '{}'::jsonb);

-- Pending request on L1 and L5
insert into public.purchaserequest (listing_id, buyer_id, requested_quantity_kg, status) values
  ('c0290000-0000-0000-0000-000000000001', 'b0290000-0000-0000-0000-000000000001', 100, 'Pending'),
  ('c0290000-0000-0000-0000-000000000005', 'b0290000-0000-0000-0000-000000000001', 100, 'Pending');

-- Rejected request on L4 (inactive, but ever-had)
insert into public.purchaserequest (listing_id, buyer_id, requested_quantity_kg, status) values
  ('c0290000-0000-0000-0000-000000000004', 'b0290000-0000-0000-0000-000000000001', 100, 'Rejected');

-- Act as farmer for RPC calls (session-level GUC; psql autocommits each statement)
select set_config('request.jwt.claim.sub', 'a0290000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

\echo '===== CHECK 1b: guard functions on L1/L2/L4 ====='
select public.listing_has_active_deal('c0290000-0000-0000-0000-000000000001') as l1_active,
       public.listing_ever_had_request('c0290000-0000-0000-0000-000000000001') as l1_ever;
select public.listing_has_active_deal('c0290000-0000-0000-0000-000000000002') as l2_active,
       public.listing_ever_had_request('c0290000-0000-0000-0000-000000000002') as l2_ever;
select public.listing_has_active_deal('c0290000-0000-0000-0000-000000000004') as l4_active,
       public.listing_ever_had_request('c0290000-0000-0000-0000-000000000004') as l4_ever;

\echo '===== CHECK 2: active deal — cosmetic name OK, locked fields rejected ====='
select listing_name, declared_moisture, variety_code, declared_purity_grade,
       remaining_quantity_kg, computed_price_per_kg as price_before
from public.croplisting where listing_id = 'c0290000-0000-0000-0000-000000000001';

select public.update_own_crop_listing(
  p_listing_id := 'c0290000-0000-0000-0000-000000000001',
  p_listing_name := 'L1 Renamed Cosmetic'
);

select listing_name from public.croplisting where listing_id = 'c0290000-0000-0000-0000-000000000001';

\echo '--- expect FAIL: moisture change with active deal ---'
do $$
begin
  begin
    perform public.update_own_crop_listing(
      p_listing_id := 'c0290000-0000-0000-0000-000000000001',
      p_declared_moisture := 'Wet'
    );
    raise exception 'UNEXPECTED: moisture update should have been rejected';
  exception
    when others then
      if sqlerrm like '%only listing_name is editable while listing has an active deal%' then
        raise notice 'OK rejected locked moisture: %', sqlerrm;
      else
        raise;
      end if;
  end;
end $$;

\echo '--- expect FAIL: quantity change with active deal ---'
do $$
begin
  begin
    perform public.update_own_crop_listing(
      p_listing_id := 'c0290000-0000-0000-0000-000000000001',
      p_remaining_quantity_kg := 500
    );
    raise exception 'UNEXPECTED: quantity update should have been rejected';
  exception
    when others then
      if sqlerrm like '%only listing_name is editable while listing has an active deal%' then
        raise notice 'OK rejected locked quantity: %', sqlerrm;
      else
        raise;
      end if;
  end;
end $$;

\echo '--- expect FAIL: variety/purity change with active deal ---'
do $$
begin
  begin
    perform public.update_own_crop_listing(
      p_listing_id := 'c0290000-0000-0000-0000-000000000001',
      p_variety_code := '218',
      p_declared_purity_grade := 'A'
    );
    raise exception 'UNEXPECTED: variety/purity update should have been rejected';
  exception
    when others then
      if sqlerrm like '%only listing_name is editable while listing has an active deal%' then
        raise notice 'OK rejected locked variety/purity: %', sqlerrm;
      else
        raise;
      end if;
  end;
end $$;

select listing_name, declared_moisture, variety_code, declared_purity_grade,
       remaining_quantity_kg
from public.croplisting where listing_id = 'c0290000-0000-0000-0000-000000000001';

\echo '===== CHECK 3: no active deal — full edit + price recompute ====='
select listing_name, declared_moisture, variety_code, declared_purity_grade,
       computed_price_per_kg as price_before
from public.croplisting where listing_id = 'c0290000-0000-0000-0000-000000000002';

select public.croplisting_compute_locked_price('Dry', 'OTHER', 'Ungraded') as expected_dry_other_ungraded,
       public.croplisting_compute_locked_price('Wet', '218', 'A') as expected_wet_218_a;

select public.update_own_crop_listing(
  p_listing_id := 'c0290000-0000-0000-0000-000000000002',
  p_listing_name := 'L2 Fully Edited',
  p_declared_moisture := 'Wet',
  p_variety_code := '218',
  p_declared_purity_grade := 'A',
  p_remaining_quantity_kg := 900
);

select listing_name, declared_moisture, variety_code, declared_purity_grade,
       remaining_quantity_kg, computed_price_per_kg as price_after,
       (computed_price_per_kg = public.croplisting_compute_locked_price('Wet', '218', 'A')) as price_matches_lock_fn
from public.croplisting where listing_id = 'c0290000-0000-0000-0000-000000000002';

\echo '===== CHECK 4: delete with zero requests — succeeds + photo cleanup ====='
select count(*) as photo_rows_before
from public.listingphoto where listing_id = 'c0290000-0000-0000-0000-000000000003';
select count(*) as storage_objects_before
from storage.objects
where bucket_id = 'listing-photos'
  and name like 'c0290000-0000-0000-0000-000000000003/%';

select public.delete_own_crop_listing('c0290000-0000-0000-0000-000000000003');

select exists(
  select 1 from public.croplisting where listing_id = 'c0290000-0000-0000-0000-000000000003'
) as listing_still_exists;
select count(*) as photo_rows_after
from public.listingphoto where listing_id = 'c0290000-0000-0000-0000-000000000003';
select count(*) as storage_objects_after
from storage.objects
where bucket_id = 'listing-photos'
  and name like 'c0290000-0000-0000-0000-000000000003/%';

\echo '===== CHECK 5: delete with past Rejected request — blocked ====='
do $$
begin
  begin
    perform public.delete_own_crop_listing('c0290000-0000-0000-0000-000000000004');
    raise exception 'UNEXPECTED: delete with past request should have been blocked';
  exception
    when others then
      if sqlerrm like '%cannot delete listing that has ever had a purchase request%' then
        raise notice 'OK delete blocked: %', sqlerrm;
      else
        raise;
      end if;
  end;
end $$;

select exists(
  select 1 from public.croplisting where listing_id = 'c0290000-0000-0000-0000-000000000004'
) as l4_still_exists;

\echo '===== CHECK 6: archive with active deal — blocked ====='
do $$
begin
  begin
    perform public.archive_own_crop_listing('c0290000-0000-0000-0000-000000000005');
    raise exception 'UNEXPECTED: archive with active deal should have been blocked';
  exception
    when others then
      if sqlerrm like '%cannot archive listing while it has an active deal%' then
        raise notice 'OK archive blocked: %', sqlerrm;
      else
        raise;
      end if;
  end;
end $$;

select status from public.croplisting where listing_id = 'c0290000-0000-0000-0000-000000000005';

\echo '===== CHECK 6b: archive without active deal — succeeds ====='
select public.archive_own_crop_listing('c0290000-0000-0000-0000-000000000006');
select status from public.croplisting where listing_id = 'c0290000-0000-0000-0000-000000000006';

\echo '===== CHECK 7: buyer marketplace query excludes Archived ====='
-- Same filter as marketplace-service.ts fetchMarketplaceListings
select listing_id, listing_name, status
from public.croplisting
where status = 'Available'
  and listing_id in (
    'c0290000-0000-0000-0000-000000000002',
    'c0290000-0000-0000-0000-000000000006'
  )
order by listing_id;

select
  exists(
    select 1 from public.croplisting
    where listing_id = 'c0290000-0000-0000-0000-000000000006' and status = 'Available'
  ) as archived_l6_in_available_query,
  exists(
    select 1 from public.croplisting
    where listing_id = 'c0290000-0000-0000-0000-000000000002' and status = 'Available'
  ) as available_l2_in_available_query;

\echo '===== CHECK 8: auto_soldout does not overwrite Archived ====='
update public.croplisting
  set remaining_quantity_kg = 0
  where listing_id = 'c0290000-0000-0000-0000-000000000006';
select listing_id, status, remaining_quantity_kg
from public.croplisting where listing_id = 'c0290000-0000-0000-0000-000000000006';

\echo '===== DONE ====='

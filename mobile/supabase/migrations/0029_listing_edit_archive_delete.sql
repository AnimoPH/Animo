-- Farmer listing Edit / Archive / Delete.
--
-- 1) Add Archived to croplisting.status CHECK.
-- 2) Keep Archived out of auto Sold_Out overwrites.
-- 3) Extract shared price computation from croplisting_lock_price so full
--    edits can recompute with the same formula (no new pricing logic).
-- 4) Owner RPCs: active-deal / ever-had-request guards, update (cosmetic vs
--    full), archive, delete — server-enforced, not UI-only.
-- 5) Revoke direct UPDATE/DELETE on croplisting from authenticated so those
--    paths cannot bypass the RPC locks (same defense-in-depth as 0009 on
--    purchaserequest). INSERT + SELECT stay on RLS for create/browse.

-- ---------------------------------------------------------------------------
-- Status CHECK: add Archived
-- ---------------------------------------------------------------------------

alter table public.croplisting
  drop constraint croplisting_status_check;

alter table public.croplisting
  add constraint croplisting_status_check
  check (status in ('Draft', 'Available', 'Sold_Out', 'Cancelled', 'Archived'));

-- ---------------------------------------------------------------------------
-- Auto sold-out: never overwrite Archived (or Cancelled / Sold_Out)
-- ---------------------------------------------------------------------------

create or replace function public.croplisting_auto_soldout()
returns trigger
language plpgsql
as $$
begin
  if new.remaining_quantity_kg <= 0
     and new.status not in ('Cancelled', 'Sold_Out', 'Archived') then
    new.status := 'Sold_Out';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Shared locked-price computation (same body as 0001 croplisting_lock_price).
-- Trigger keeps calling this; full-edit RPC recomputes through it too.
-- ---------------------------------------------------------------------------

create or replace function public.croplisting_compute_locked_price(
  p_declared_moisture text,
  p_variety_code text,
  p_declared_purity_grade text
)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  base_price numeric;
  premium numeric;
begin
  select case
           when p_declared_moisture = 'Wet' then wet_base_price_per_kg
           else dry_base_price_per_kg
         end
    into base_price
    from public.marketpricefeed
    order by effective_date desc
    limit 1;

  select premium_per_kg into premium
    from public.varietypricepremium
    where variety_code = p_variety_code and grade = p_declared_purity_grade;

  if premium is null then
    select premium_per_kg into premium
      from public.varietypricepremium
      where variety_code = 'OTHER' and grade = 'Ungraded';
  end if;

  return coalesce(base_price, 0) + coalesce(premium, 0);
end;
$$;

create or replace function public.croplisting_lock_price()
returns trigger
language plpgsql
as $$
begin
  if new.computed_price_per_kg is null then
    new.computed_price_per_kg := public.croplisting_compute_locked_price(
      new.declared_moisture,
      new.variety_code,
      new.declared_purity_grade
    );
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Defense in depth: no direct client UPDATE/DELETE on croplisting
-- ---------------------------------------------------------------------------

drop policy if exists "Farmers manage own listings" on public.croplisting;

create policy "Farmers can view own listings"
  on public.croplisting for select
  using (auth.uid() = farmer_id);

create policy "Farmers can insert own listings"
  on public.croplisting for insert
  with check (auth.uid() = farmer_id);

revoke update, delete on public.croplisting from authenticated;

-- ---------------------------------------------------------------------------
-- Guard helpers
-- ---------------------------------------------------------------------------

create or replace function public.listing_has_active_deal(p_listing_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_farmer_id uuid;
begin
  select farmer_id into v_farmer_id
    from public.croplisting
    where listing_id = p_listing_id;

  if v_farmer_id is null then
    raise exception 'listing not found';
  end if;
  if auth.uid() is distinct from v_farmer_id then
    raise exception 'not authorized';
  end if;

  return exists (
    select 1
      from public.purchaserequest
     where listing_id = p_listing_id
       and status = 'Pending'
  ) or exists (
    select 1
      from public.transactionmatch
     where listing_id = p_listing_id
       and status in ('Pending_Payment', 'Payment_Confirmed', 'Delivered')
  );
end;
$$;

revoke all on function public.listing_has_active_deal(uuid) from public, anon;
grant execute on function public.listing_has_active_deal(uuid) to authenticated;

create or replace function public.listing_ever_had_request(p_listing_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_farmer_id uuid;
begin
  select farmer_id into v_farmer_id
    from public.croplisting
    where listing_id = p_listing_id;

  if v_farmer_id is null then
    raise exception 'listing not found';
  end if;
  if auth.uid() is distinct from v_farmer_id then
    raise exception 'not authorized';
  end if;

  return exists (
    select 1
      from public.purchaserequest
     where listing_id = p_listing_id
  );
end;
$$;

revoke all on function public.listing_ever_had_request(uuid) from public, anon;
grant execute on function public.listing_ever_had_request(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- update_own_crop_listing
-- NULL args mean "leave unchanged". With an active deal, only listing_name
-- may be supplied; any other non-null arg is rejected server-side.
-- Photos stay on the existing uploadListingPhoto path (RLS), not this RPC.
-- ---------------------------------------------------------------------------

create or replace function public.update_own_crop_listing(
  p_listing_id uuid,
  p_listing_name text default null,
  p_declared_variety text default null,
  p_declared_variety_custom text default null,
  p_variety_code text default null,
  p_specific_variety_name text default null,
  p_specific_variety_name_custom text default null,
  p_declared_moisture text default null,
  p_declared_purity_grade text default null,
  p_gross_weight_kg numeric default null,
  p_tare_weight_kg numeric default null,
  p_remaining_quantity_kg numeric default null,
  p_minimum_request_kg numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.croplisting%rowtype;
  v_active boolean;
  v_listing_name text;
  v_declared_variety text;
  v_declared_variety_custom text;
  v_variety_code text;
  v_specific_variety_name text;
  v_specific_variety_name_custom text;
  v_declared_moisture text;
  v_declared_purity_grade text;
  v_gross_weight_kg numeric;
  v_tare_weight_kg numeric;
  v_remaining_quantity_kg numeric;
  v_minimum_request_kg numeric;
  v_price numeric;
  v_recompute_price boolean := false;
  v_net numeric;
begin
  select * into v_row
    from public.croplisting
    where listing_id = p_listing_id
    for update;

  if not found then
    raise exception 'listing not found';
  end if;
  if auth.uid() is distinct from v_row.farmer_id then
    raise exception 'not authorized';
  end if;
  if v_row.status = 'Archived' then
    raise exception 'archived listings cannot be edited';
  end if;

  v_active := public.listing_has_active_deal(p_listing_id);

  if v_active then
    if p_declared_variety is not null
       or p_declared_variety_custom is not null
       or p_variety_code is not null
       or p_specific_variety_name is not null
       or p_specific_variety_name_custom is not null
       or p_declared_moisture is not null
       or p_declared_purity_grade is not null
       or p_gross_weight_kg is not null
       or p_tare_weight_kg is not null
       or p_remaining_quantity_kg is not null
       or p_minimum_request_kg is not null
    then
      raise exception 'only listing_name is editable while listing has an active deal';
    end if;

    if p_listing_name is null then
      raise exception 'nothing to update';
    end if;

    v_listing_name := btrim(p_listing_name);
    if v_listing_name = '' then
      raise exception 'listing_name must not be blank';
    end if;

    update public.croplisting
      set listing_name = v_listing_name
      where listing_id = p_listing_id;
    return;
  end if;

  -- Full edit path (no active deal)
  v_listing_name := coalesce(nullif(btrim(p_listing_name), ''), v_row.listing_name);
  if btrim(v_listing_name) = '' then
    raise exception 'listing_name must not be blank';
  end if;

  v_declared_variety := coalesce(p_declared_variety, v_row.declared_variety);
  v_variety_code := coalesce(p_variety_code, v_row.variety_code);
  v_declared_moisture := coalesce(p_declared_moisture, v_row.declared_moisture);
  v_declared_purity_grade := coalesce(p_declared_purity_grade, v_row.declared_purity_grade);
  v_gross_weight_kg := coalesce(p_gross_weight_kg, v_row.gross_weight_kg);
  v_tare_weight_kg := coalesce(p_tare_weight_kg, v_row.tare_weight_kg);
  v_remaining_quantity_kg := coalesce(p_remaining_quantity_kg, v_row.remaining_quantity_kg);
  v_minimum_request_kg := coalesce(p_minimum_request_kg, v_row.minimum_request_kg);

  if v_declared_variety = 'Others' then
    v_declared_variety_custom := coalesce(p_declared_variety_custom, v_row.declared_variety_custom);
  else
    v_declared_variety_custom := null;
  end if;

  -- specific_variety_name: null arg = leave unchanged; explicit empty clears
  if p_specific_variety_name is null and p_specific_variety_name_custom is null then
    v_specific_variety_name := v_row.specific_variety_name;
    v_specific_variety_name_custom := v_row.specific_variety_name_custom;
  else
    v_specific_variety_name := nullif(p_specific_variety_name, '');
    if v_specific_variety_name = 'Iba pa' then
      v_specific_variety_name_custom := coalesce(p_specific_variety_name_custom, v_row.specific_variety_name_custom);
    else
      v_specific_variety_name_custom := null;
    end if;
  end if;

  v_net := v_gross_weight_kg - v_tare_weight_kg;
  if not (v_net > 0) then
    raise exception 'gross_weight_kg must be greater than tare_weight_kg';
  end if;
  if v_remaining_quantity_kg < 0 then
    raise exception 'remaining_quantity_kg must be >= 0';
  end if;
  if v_remaining_quantity_kg > v_net then
    raise exception 'remaining_quantity_kg (%) cannot exceed net weight (%)',
      v_remaining_quantity_kg, v_net;
  end if;
  if v_minimum_request_kg <= 0 then
    raise exception 'minimum_request_kg must be greater than zero';
  end if;

  v_recompute_price :=
    (v_declared_moisture is distinct from v_row.declared_moisture)
    or (v_variety_code is distinct from v_row.variety_code)
    or (v_declared_purity_grade is distinct from v_row.declared_purity_grade);

  if v_recompute_price then
    v_price := public.croplisting_compute_locked_price(
      v_declared_moisture,
      v_variety_code,
      v_declared_purity_grade
    );
  else
    v_price := v_row.computed_price_per_kg;
  end if;

  update public.croplisting
    set listing_name = v_listing_name,
        declared_variety = v_declared_variety,
        declared_variety_custom = v_declared_variety_custom,
        variety_code = v_variety_code,
        specific_variety_name = v_specific_variety_name,
        specific_variety_name_custom = v_specific_variety_name_custom,
        declared_moisture = v_declared_moisture,
        declared_purity_grade = v_declared_purity_grade,
        gross_weight_kg = v_gross_weight_kg,
        tare_weight_kg = v_tare_weight_kg,
        remaining_quantity_kg = v_remaining_quantity_kg,
        minimum_request_kg = v_minimum_request_kg,
        computed_price_per_kg = v_price
    where listing_id = p_listing_id;
end;
$$;

revoke all on function public.update_own_crop_listing(
  uuid, text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric
) from public, anon;
grant execute on function public.update_own_crop_listing(
  uuid, text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric
) to authenticated;

-- ---------------------------------------------------------------------------
-- archive_own_crop_listing — blocked when an active deal exists
-- ---------------------------------------------------------------------------

create or replace function public.archive_own_crop_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer_id uuid;
  v_status text;
begin
  select farmer_id, status into v_farmer_id, v_status
    from public.croplisting
    where listing_id = p_listing_id
    for update;

  if v_farmer_id is null then
    raise exception 'listing not found';
  end if;
  if auth.uid() is distinct from v_farmer_id then
    raise exception 'not authorized';
  end if;
  if v_status = 'Archived' then
    raise exception 'listing is already archived';
  end if;
  if public.listing_has_active_deal(p_listing_id) then
    raise exception 'cannot archive listing while it has an active deal';
  end if;

  update public.croplisting
    set status = 'Archived'
    where listing_id = p_listing_id;
end;
$$;

revoke all on function public.archive_own_crop_listing(uuid) from public, anon;
grant execute on function public.archive_own_crop_listing(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- delete_own_crop_listing — hard delete only if never had a purchaserequest
-- ---------------------------------------------------------------------------

create or replace function public.delete_own_crop_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer_id uuid;
begin
  select farmer_id into v_farmer_id
    from public.croplisting
    where listing_id = p_listing_id
    for update;

  if v_farmer_id is null then
    raise exception 'listing not found';
  end if;
  if auth.uid() is distinct from v_farmer_id then
    raise exception 'not authorized';
  end if;
  if exists (
    select 1 from public.purchaserequest where listing_id = p_listing_id
  ) then
    raise exception 'cannot delete listing that has ever had a purchase request; archive instead';
  end if;

  -- listingphoto rows CASCADE; croplisting_delete_photos_cascade (0008)
  -- removes storage.objects under this listing_id folder.
  delete from public.croplisting where listing_id = p_listing_id;
end;
$$;

revoke all on function public.delete_own_crop_listing(uuid) from public, anon;
grant execute on function public.delete_own_crop_listing(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Fix 0008 storage cascade: storage.protect_delete (FOR EACH STATEMENT) blocks
-- any DELETE on storage.objects unless storage.allow_delete_query = true, even
-- when zero rows match. Without this, delete_own_crop_listing fails as soon as
-- the AFTER DELETE trigger runs. Same allow flag the Storage API sets.
-- ---------------------------------------------------------------------------

create or replace function public.croplisting_delete_photos_cascade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.objects
    where bucket_id = 'listing-photos'
      and (storage.foldername(name))[1] = old.listing_id::text;
  return old;
end;
$$;

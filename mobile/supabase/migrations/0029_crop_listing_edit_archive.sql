-- Reconciliation migration — captures a listing-edit/archive feature that
-- was applied directly against production (hosted SQL editor) rather than
-- through a tracked migration, discovered via `supabase db diff --linked`
-- while investigating an unrelated push failure. Content here matches what
-- was already live verbatim; this file exists so a fresh local database (or
-- anyone else's) matches production instead of drifting from it. Excludes a
-- separate, unrelated broad anon/authenticated default-privilege reset also
-- found in that diff — that looked like an accidental blanket grant, not
-- part of this feature, and is being tracked/cleaned up separately rather
-- than codified here.
--
-- The shape: direct client UPDATE/DELETE on croplisting is revoked (same
-- "funnel mutations through a validated RPC" pattern already used for
-- purchaserequest in 0009) — update/delete/archive now go through
-- update_own_crop_listing / delete_own_crop_listing / archive_own_crop_listing,
-- which enforce the "only listing_name editable once there's an active
-- deal" and "can't delete a listing that ever had a request" rules that a
-- raw client UPDATE could never safely express.

-- ---------------------------------------------------------------------------
-- updated_at tracking on purchaserequest / transactionmatch — lets a client
-- detect "this row changed" without re-diffing every column.
-- ---------------------------------------------------------------------------
create function public.touch_purchaserequest_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

alter table public.purchaserequest add column updated_at timestamptz not null default now();

create trigger purchaserequest_touch_updated_at
  before update on public.purchaserequest
  for each row execute function public.touch_purchaserequest_updated_at();

create function public.touch_transactionmatch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

alter table public.transactionmatch add column updated_at timestamptz not null default now();

create trigger transactionmatch_touch_updated_at
  before update on public.transactionmatch
  for each row execute function public.touch_transactionmatch_updated_at();

-- ---------------------------------------------------------------------------
-- 'Archived' — a farmer-initiated retirement of a listing, distinct from
-- Sold_Out (ran out of stock) or Cancelled. croplisting_auto_soldout (0001)
-- must not un-arch an archived row just because remaining_quantity_kg hits 0.
-- ---------------------------------------------------------------------------
alter table public.croplisting drop constraint croplisting_status_check;
alter table public.croplisting add constraint croplisting_status_check
  check (status = any (array['Draft', 'Available', 'Sold_Out', 'Cancelled', 'Archived']));

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
-- listing_has_active_deal / listing_ever_had_request — shared guards the
-- three mutation RPCs below all rely on, each independently auth-checked
-- (SECURITY DEFINER, but re-verifies auth.uid() = farmer_id itself) since
-- callers may invoke them directly.
-- ---------------------------------------------------------------------------
create function public.listing_has_active_deal(p_listing_id uuid)
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

revoke all on function public.listing_has_active_deal(uuid) from public;
grant execute on function public.listing_has_active_deal(uuid) to authenticated;

create function public.listing_ever_had_request(p_listing_id uuid)
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

revoke all on function public.listing_ever_had_request(uuid) from public;
grant execute on function public.listing_ever_had_request(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- archive_own_crop_listing — farmer-initiated retirement, blocked while a
-- deal is in flight (same guard as delete/update below).
-- ---------------------------------------------------------------------------
create function public.archive_own_crop_listing(p_listing_id uuid)
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

revoke all on function public.archive_own_crop_listing(uuid) from public;
grant execute on function public.archive_own_crop_listing(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- delete_own_crop_listing — a listing that ever had a purchase request keeps
-- that history around (archive instead); only a request-free listing can be
-- hard-deleted. listingphoto rows CASCADE; croplisting_delete_photos_cascade
-- (0008) removes the matching storage.objects.
-- ---------------------------------------------------------------------------
create function public.delete_own_crop_listing(p_listing_id uuid)
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

  delete from public.croplisting where listing_id = p_listing_id;
end;
$$;

revoke all on function public.delete_own_crop_listing(uuid) from public;
grant execute on function public.delete_own_crop_listing(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- update_own_crop_listing — while a deal is active, only listing_name may
-- change (everything else null); otherwise a full edit, recomputing the
-- locked price only when moisture/variety_code/purity actually changed.
-- ---------------------------------------------------------------------------
create function public.update_own_crop_listing(
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

revoke all on function public.update_own_crop_listing(uuid, text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric) from public;
grant execute on function public.update_own_crop_listing(uuid, text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- Direct client UPDATE/DELETE on croplisting is retired in favor of the
-- three RPCs above — same "funnel through a validated RPC" convention 0009
-- already established for purchaserequest.
-- ---------------------------------------------------------------------------
drop policy "Farmers manage own listings" on public.croplisting;

create policy "Farmers can insert own listings"
  on public.croplisting for insert
  with check (auth.uid() = farmer_id);

create policy "Farmers can view own listings"
  on public.croplisting for select
  using (auth.uid() = farmer_id);

revoke update, delete on public.croplisting from authenticated;

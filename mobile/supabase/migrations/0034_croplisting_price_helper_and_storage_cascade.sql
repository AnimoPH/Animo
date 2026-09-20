-- Backfill two tweaks/UI pieces already live on hosted that develop's
-- numbered history never recorded: the shared locked-price helper (so
-- croplisting_lock_price and update_own_crop_listing share one formula) and
-- the storage.allow_delete_query GUC in croplisting_delete_photos_cascade
-- (so listing photo cleanup on delete is not blocked by storage.protect_delete).
--
-- Does not re-touch status CHECK, owner RPCs, or croplisting GRANTs — those
-- are already in develop via 0029.

-- ---------------------------------------------------------------------------
-- Shared locked-price computation (same formula as 0001 croplisting_lock_price).
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

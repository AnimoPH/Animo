-- The listing price always comes from the feed. Until now the lock trigger only
-- filled computed_price_per_kg when it was empty, and the app roles can insert
-- that column, so a client calling the table directly could store its own
-- peso. The trigger now overwrites whatever was sent, for every insert.
--
-- Only INSERT is affected. A listing already up keeps its peso, and the edit
-- RPC still sets the price itself when the moisture, variety code or grade
-- changes (update_own_crop_listing, migrations 0029 and 0032).

create or replace function public.croplisting_lock_price()
returns trigger
language plpgsql
as $$
begin
  new.computed_price_per_kg := public.croplisting_compute_locked_price(
    new.declared_moisture,
    new.variety_code,
    new.declared_purity_grade
  );
  return new;
end;
$$;

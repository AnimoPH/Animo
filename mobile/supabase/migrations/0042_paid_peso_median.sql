-- Paid-peso rule for the next new listing (Project Context Section 0, Price).
--
--   1. A completed trade now records the peso that was actually paid per kilo
--      (the confirmed payment amount divided by the kilos), not a copy of the
--      locked price. When no confirmed payment is found it falls back to the
--      agreed price, as before.
--   2. transaction_price_history.premium_per_kg keeps the premium that was
--      inside that peso (5 for NSIC Rc218 Grade A, 0 otherwise), so the median
--      is taken on the paid base and the premium is not added twice.
--   3. effective_base_price(moisture) is the base a new listing locks. While
--      this calendar month (Asia/Manila) has fewer than 5 paid trades of that
--      moisture it is the starting base on marketpricefeed. From the fifth it
--      is (25 * starting base + n * median paid base) / (25 + n). Wet and dry
--      trades are kept apart. The feed row itself is never rewritten, so the
--      model refresh and the NFA flag work as before.
--   4. croplisting_compute_locked_price reads that base. A listing that is
--      already up keeps the peso it locked. Nothing here changes a row.
--   5. effective_base_prices() hands the two current bases to the phone so the
--      saved price feed matches what the server will lock.
--
-- effective_base_price is SECURITY DEFINER because the history table has no
-- grant for the app roles. It returns only the blended base, not trades.

alter table public.transaction_price_history
  add column premium_per_kg numeric not null default 0;

comment on column public.transaction_price_history.price_per_kg is
  'Peso actually paid per kilo: confirmed payment amount / quantity_kg (agreed price when no confirmed payment exists).';
comment on column public.transaction_price_history.premium_per_kg is
  'Premium inside price_per_kg (5 for NSIC Rc218 Grade A, else 0). price_per_kg - premium_per_kg is the paid base used by the median.';

-- Existing rows: fill the premium from their listing. Their price_per_kg stays
-- the agreed price they were written with.
update public.transaction_price_history h
set premium_per_kg = coalesce(
  (select p.premium_per_kg from public.varietypricepremium p
    where p.variety_code = cl.variety_code and p.grade = cl.declared_purity_grade),
  (select p.premium_per_kg from public.varietypricepremium p
    where p.variety_code = 'OTHER' and p.grade = 'Ungraded'),
  0
)
from public.transactionmatch tm
join public.croplisting cl on cl.listing_id = tm.listing_id
where tm.transaction_id = h.transaction_id;

create or replace function public.write_transaction_price_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_moisture text;
  v_variety text;
  v_grade text;
  v_amount numeric;
  v_paid numeric;
  v_premium numeric;
begin
  if new.status = 'Completed' and old.status is distinct from 'Completed' then
    select declared_moisture, variety_code, declared_purity_grade
      into v_moisture, v_variety, v_grade
      from public.croplisting
      where listing_id = new.listing_id;

    select amount into v_amount
      from public.payment
      where transaction_id = new.transaction_id and status = 'Confirmed'
      order by farmer_confirmed_at desc nulls last
      limit 1;

    v_paid := case
      when v_amount is not null and new.quantity_kg > 0 then v_amount / new.quantity_kg
      else new.agreed_price_per_kg
    end;

    select coalesce(
      (select premium_per_kg from public.varietypricepremium
        where variety_code = v_variety and grade = v_grade),
      (select premium_per_kg from public.varietypricepremium
        where variety_code = 'OTHER' and grade = 'Ungraded'),
      0
    ) into v_premium;

    insert into public.transaction_price_history (
      transaction_id, price_per_kg, premium_per_kg, moisture, quantity_kg, completed_at
    ) values (
      new.transaction_id, v_paid, v_premium, v_moisture, new.quantity_kg, new.date_completed
    )
    on conflict (transaction_id) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.effective_base_price(p_moisture text)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start numeric;
  v_from timestamptz;
  v_to timestamptz;
  v_n integer;
  v_median numeric;
begin
  select case when p_moisture = 'Wet' then wet_base_price_per_kg else dry_base_price_per_kg end
    into v_start
    from public.marketpricefeed
    order by effective_date desc
    limit 1;

  if v_start is null then
    return null;
  end if;

  v_from := date_trunc('month', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila';
  v_to := (date_trunc('month', now() at time zone 'Asia/Manila') + interval '1 month') at time zone 'Asia/Manila';

  select count(*), percentile_cont(0.5) within group (order by price_per_kg - premium_per_kg)
    into v_n, v_median
    from public.transaction_price_history
    where moisture = case when p_moisture = 'Wet' then 'Wet' else 'Dry' end
      and completed_at >= v_from and completed_at < v_to;

  if v_n < 5 then
    return v_start;
  end if;

  return (25 * v_start + v_n * v_median) / (25 + v_n);
end;
$$;

revoke all on function public.effective_base_price(text) from public, anon;
grant execute on function public.effective_base_price(text) to authenticated, service_role;

create or replace function public.effective_base_prices()
returns table (dry_base_price_per_kg numeric, wet_base_price_per_kg numeric)
language sql
stable
security definer
set search_path = public
as $$
  select public.effective_base_price('Dry'), public.effective_base_price('Wet');
$$;

revoke all on function public.effective_base_prices() from public, anon;
grant execute on function public.effective_base_prices() to authenticated, service_role;

-- Same arithmetic as 0034, with the base read through effective_base_price.
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
  base_price := public.effective_base_price(p_declared_moisture);

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

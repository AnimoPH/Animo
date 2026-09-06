-- User Trust Profiling System — Research Notes Sec. AC, Project Context
-- Sec. 5.4. Replaces the farmer-only `credibilityscore` (§11) with a single
-- table covering both roles, and moves trust-stat computation from live
-- client-side aggregation (mobile/src/services/farmer-public-profile.ts) to
-- a stored, trigger-refreshed table — same source data
-- (transactionmatch + rating + purchaserequest), computed once on the
-- relevant write instead of on every profile view.
--
-- Full recompute-from-source on every trigger fire (not incremental
-- +1/-1 counters): self-healing if a formula or a source row ever changes
-- out from under it, no concurrent-increment locking to get right. At this
-- app's transaction volume the extra read cost is negligible; swapping the
-- internals for incremental counters later (if it's ever needed) doesn't
-- change this table's columns or the get_trust_profile() contract below.

create table public.user_trust_profile (
  user_id uuid primary key references public."user" (user_id) on delete cascade,
  role text not null check (role in ('Farmer', 'Buyer')),

  completed_transactions integer not null default 0,
  average_rating numeric not null default 0,
  rating_count integer not null default 0,

  -- Farmer-only; null for Buyer rows.
  completion_rate_pct numeric,
  active_listings_count integer,
  total_sold_kg numeric,

  -- Buyer-only; null for Farmer rows.
  payment_confirmation_rate_pct numeric,
  purchase_request_cancel_rate_pct numeric,
  total_bought_kg numeric,

  last_updated timestamptz not null default now()
);

alter table public.user_trust_profile enable row level security;

-- Trust stats are meant to be visible before a purchase-request accept
-- (Sec. AC.1) — same "anyone can view" posture as credibilityscore/rating.
create policy "Anyone can view trust profiles"
  on public.user_trust_profile for select
  using (true);

-- No client INSERT/UPDATE/DELETE — rows are only ever written by
-- refresh_trust_profile() below, which runs SECURITY DEFINER.
revoke insert, update, delete on public.user_trust_profile from authenticated;

-- ---------------------------------------------------------------------------
-- refresh_trust_profile: recomputes and upserts one user's row from source
-- tables. Single place the formulas live — both triggers below and any
-- manual/seed call go through this, so there is exactly one definition of
-- each counter (Sec. AC.2).
-- ---------------------------------------------------------------------------
create or replace function public.refresh_trust_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_completed_transactions integer;
  v_average_rating numeric;
  v_rating_count integer;
  v_completion_rate_pct numeric;
  v_active_listings_count integer;
  v_total_sold_kg numeric;
  v_payment_confirmation_rate_pct numeric;
  v_purchase_request_cancel_rate_pct numeric;
  v_total_bought_kg numeric;
  v_total_transactions integer;
  v_total_requests integer;
  v_cancelled_requests integer;
  v_payment_confirmed_or_later integer;
begin
  select role into v_role from public."user" where user_id = p_user_id;
  if v_role is null then
    raise exception 'user % not found', p_user_id;
  end if;
  if v_role not in ('Farmer', 'Buyer') then
    -- LGU officials have no trust profile.
    return;
  end if;

  select count(*) filter (where score is not null), coalesce(avg(score), 0)
    into v_rating_count, v_average_rating
    from public.rating
    where rated_id = p_user_id;

  if v_role = 'Farmer' then
    select count(*) filter (where status = 'Completed'), count(*),
           coalesce(sum(quantity_kg) filter (where status = 'Completed'), 0)
      into v_completed_transactions, v_total_transactions, v_total_sold_kg
      from public.transactionmatch
      where farmer_id = p_user_id;

    v_completion_rate_pct := case when v_total_transactions > 0
      then round(v_completed_transactions * 100.0 / v_total_transactions, 1)
      else 0 end;

    select count(*) into v_active_listings_count
      from public.croplisting
      where farmer_id = p_user_id and status = 'Available';

    v_payment_confirmation_rate_pct := null;
    v_purchase_request_cancel_rate_pct := null;
    v_total_bought_kg := null;
  else
    select count(*) filter (where status = 'Completed'), count(*),
           count(*) filter (where status in ('Payment_Confirmed', 'Delivered', 'Completed')),
           coalesce(sum(quantity_kg) filter (where status = 'Completed'), 0)
      into v_completed_transactions, v_total_transactions, v_payment_confirmed_or_later, v_total_bought_kg
      from public.transactionmatch
      where buyer_id = p_user_id;

    v_payment_confirmation_rate_pct := case when v_total_transactions > 0
      then round(v_payment_confirmed_or_later * 100.0 / v_total_transactions, 1)
      else 0 end;

    select count(*) filter (where status = 'Cancelled'), count(*)
      into v_cancelled_requests, v_total_requests
      from public.purchaserequest
      where buyer_id = p_user_id;

    v_purchase_request_cancel_rate_pct := case when v_total_requests > 0
      then round(v_cancelled_requests * 100.0 / v_total_requests, 1)
      else 0 end;

    v_completion_rate_pct := null;
    v_active_listings_count := null;
    v_total_sold_kg := null;
  end if;

  insert into public.user_trust_profile (
    user_id, role, completed_transactions, average_rating, rating_count,
    completion_rate_pct, active_listings_count, total_sold_kg,
    payment_confirmation_rate_pct, purchase_request_cancel_rate_pct, total_bought_kg,
    last_updated
  ) values (
    p_user_id, v_role, v_completed_transactions, v_average_rating, v_rating_count,
    v_completion_rate_pct, v_active_listings_count, v_total_sold_kg,
    v_payment_confirmation_rate_pct, v_purchase_request_cancel_rate_pct, v_total_bought_kg,
    now()
  )
  on conflict (user_id) do update set
    role = excluded.role,
    completed_transactions = excluded.completed_transactions,
    average_rating = excluded.average_rating,
    rating_count = excluded.rating_count,
    completion_rate_pct = excluded.completion_rate_pct,
    active_listings_count = excluded.active_listings_count,
    total_sold_kg = excluded.total_sold_kg,
    payment_confirmation_rate_pct = excluded.payment_confirmation_rate_pct,
    purchase_request_cancel_rate_pct = excluded.purchase_request_cancel_rate_pct,
    total_bought_kg = excluded.total_bought_kg,
    last_updated = excluded.last_updated;
end;
$$;

revoke all on function public.refresh_trust_profile(uuid) from public, anon;
grant execute on function public.refresh_trust_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers: refresh on the two events Sec. AC.3 names — a transaction
-- reaching Completed, and a new rating. A completed transaction changes
-- both parties' stats (their own completed_transactions/rate), so both are
-- refreshed; a rating only changes the rated party's stats.
-- ---------------------------------------------------------------------------
create or replace function public.trg_refresh_trust_on_transaction_complete()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Completed' and old.status is distinct from 'Completed' then
    perform public.refresh_trust_profile(new.farmer_id);
    perform public.refresh_trust_profile(new.buyer_id);
  end if;
  return new;
end;
$$;

create trigger transactionmatch_refresh_trust_profile
  after update on public.transactionmatch
  for each row execute function public.trg_refresh_trust_on_transaction_complete();

create or replace function public.trg_refresh_trust_on_rating_insert()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_trust_profile(new.rated_id);
  return new;
end;
$$;

create trigger rating_refresh_trust_profile
  after insert on public.rating
  for each row execute function public.trg_refresh_trust_on_rating_insert();

-- ---------------------------------------------------------------------------
-- get_trust_profile: public read RPC. Explicit column whitelist (rather
-- than a view over "user"/"farmer") so a public trust lookup can never
-- expose contact_number even if either table gains columns later — Postgres
-- RLS is row-level only, this is the column-level guard (Sec. AC.3).
-- member_since / barangay are read live from "user"/"farmer" here rather
-- than duplicated into user_trust_profile, since they don't change with
-- transactions/ratings and so have nothing to refresh.
-- ---------------------------------------------------------------------------
create or replace function public.get_trust_profile(p_user_id uuid)
returns table (
  user_id uuid,
  role text,
  completed_transactions integer,
  average_rating numeric,
  rating_count integer,
  completion_rate_pct numeric,
  active_listings_count integer,
  total_sold_kg numeric,
  payment_confirmation_rate_pct numeric,
  purchase_request_cancel_rate_pct numeric,
  total_bought_kg numeric,
  member_since date,
  barangay text,
  last_updated timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    tp.user_id,
    tp.role,
    tp.completed_transactions,
    tp.average_rating,
    tp.rating_count,
    tp.completion_rate_pct,
    tp.active_listings_count,
    tp.total_sold_kg,
    tp.payment_confirmation_rate_pct,
    tp.purchase_request_cancel_rate_pct,
    tp.total_bought_kg,
    u.date_registered as member_since,
    f.barangay,
    tp.last_updated
  from public.user_trust_profile tp
  join public."user" u on u.user_id = tp.user_id
  left join public.farmer f on f.user_id = tp.user_id and tp.role = 'Farmer'
  where tp.user_id = p_user_id;
$$;

revoke all on function public.get_trust_profile(uuid) from public, anon;
grant execute on function public.get_trust_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- credibilityscore is superseded by user_trust_profile above. Its only
-- reader (farmer-public-profile.ts) is cut over to get_trust_profile() in
-- this same branch, so nothing is left depending on it.
-- ---------------------------------------------------------------------------
drop trigger if exists credibilityscore_farmer_role_check on public.credibilityscore;
drop table if exists public.credibilityscore;

-- ---------------------------------------------------------------------------
-- Backfill: seed a row for every existing Farmer/Buyer from current data,
-- so the table isn't empty for accounts that transacted before this
-- migration (no seed rows for accounts with no history — same
-- "missing data is zero, never padded" rule farmer-public-profile.ts
-- already follows).
-- ---------------------------------------------------------------------------
do $$
declare
  v_user_id uuid;
begin
  for v_user_id in select user_id from public."user" where role in ('Farmer', 'Buyer') loop
    perform public.refresh_trust_profile(v_user_id);
  end loop;
end;
$$;

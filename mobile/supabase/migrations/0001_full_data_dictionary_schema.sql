-- ANIMO Data Dictionary (Revised, Aug 2026) — full schema, squashed to a
-- single initial migration (previously 0001_init_auth.sql +
-- 0002_align_data_dictionary.sql + 0003_full_data_dictionary_schema.sql;
-- squashed once those were the only history and nothing but test data
-- depended on them).
--
-- Implements every entity: §1 USER + §1a/1b/1c extension tables through
-- §14 VARIETYPRICEPREMIUM.
--
-- Table names are copied literally from the text beside each dictionary
-- section number (lowercase, no separators) — "user", "farmer", "buyer",
-- "lguofficial", "farm", "cropcycle", "advisoryrecommendation", "croplisting",
-- "listingphoto", "purchaserequest", "transactionmatch", "payment", "receipt",
-- "credibilityscore", "rating", "marketpricefeed", "varietypricepremium".
-- `"user"` is a reserved word — always double-quoted below.
--
-- No WALLETS table: the dictionary has no such entity, only a
-- `wallet_address` field on FARMER/BUYER, which is all farmer/buyer carry.
-- Custodial key material isn't stored in this database at all — that's
-- moving to Alchemy (their API custodies the wallet; this app only ever
-- needs the resulting address). Until that integration lands, nothing in
-- this schema signs transactions — see
-- supabase/functions/complete-registration for the current placeholder.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared trigger: enforce that a FK column actually points at a "user" row
-- of the expected role. The dictionary repeatedly types these FKs as
-- "-> User" even though only one role makes sense (e.g. CROPLISTING.farmer_id)
-- — this is the integrity check that assumption relies on.
-- ---------------------------------------------------------------------------
create function public.enforce_user_role()
returns trigger
language plpgsql
as $$
declare
  col_name text := tg_argv[0];
  expected_role text := tg_argv[1];
  target_id uuid;
  actual_role text;
begin
  execute format('select ($1).%I', col_name) into target_id using new;
  -- Nullable FK columns (e.g. MARKETPRICEFEED.toggled_by) have nothing to
  -- check when unset.
  if target_id is null then
    return new;
  end if;
  select role into actual_role from "user" where user_id = target_id;
  if actual_role is distinct from expected_role then
    raise exception '% must reference a user with role % (got %)', col_name, expected_role, actual_role;
  end if;
  return new;
end;
$$;

-- =============================================================================
-- §1 USER
-- =============================================================================

create table public."user" (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('Farmer', 'Buyer', 'LGU_Official')),
  contact_number text not null,
  account_status text not null default 'Active' check (account_status in ('Active', 'Suspended')),
  suspended_by uuid references public."user" (user_id),
  suspended_at timestamptz,
  date_registered date not null default current_date,
  constraint user_suspended_at_requires_status
    check (account_status = 'Active' or suspended_at is not null)
);

comment on table public."user" is 'ANIMO Data Dictionary §1 USER.';

-- Role is chosen once at registration and is immutable afterward ("locked
-- after verification" per the user stories) — enforced here, not just by
-- omitting a role-edit screen client-side.
create function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'role cannot be changed after registration';
  end if;
  return new;
end;
$$;

create trigger user_role_immutable
  before update on public."user"
  for each row
  execute function public.prevent_role_change();

alter table public."user" enable row level security;

create policy "Users can view own row"
  on public."user" for select
  using (auth.uid() = user_id);

create policy "Users can update own row"
  on public."user" for update
  using (auth.uid() = user_id);

revoke update on public."user" from authenticated;
grant update (full_name) on public."user" to authenticated;

-- §8 gates USER.contact_number visibility on a TRANSACTIONMATCH existing
-- between the caller and the target row, not before. Pre-transaction
-- identity browsing (a buyer needs to see *who's* selling before requesting)
-- goes through the `listing_farmer_public` view near §5, which projects
-- full_name only — never contact_number — so it stays safe regardless of
-- this table's RLS. (Policy body references transactionmatch, created in §8
-- below — added there, once that table exists.)

-- =============================================================================
-- §1a FARMER / §1b BUYER / §1c LGUOFFICIAL
-- =============================================================================

create table public.farmer (
  user_id uuid primary key references public."user" (user_id) on delete cascade,
  wallet_address varchar(42),
  gcash_number varchar(11),
  barangay text
);

create table public.buyer (
  user_id uuid primary key references public."user" (user_id) on delete cascade,
  wallet_address varchar(42),
  gcash_number varchar(11)
);

create table public.lguofficial (
  user_id uuid primary key references public."user" (user_id) on delete cascade
);

alter table public.farmer enable row level security;
alter table public.buyer enable row level security;

-- Own-row visibility only. This isn't just informational: the marketpricefeed
-- "LGU officials can toggle NFA intervention" policy below does
-- `exists (select ... from lguofficial where user_id = auth.uid())` — with
-- zero policies at all that subquery is unconditionally empty (RLS applies
-- inside subqueries the same as top-level ones), which would lock every LGU
-- official out permanently.
alter table public.lguofficial enable row level security;

create policy "LGU officials can view own row"
  on public.lguofficial for select
  using (auth.uid() = user_id);

create policy "Farmers can view own farmer row"
  on public.farmer for select
  using (auth.uid() = user_id);

create policy "Farmers can update own farmer row"
  on public.farmer for update
  using (auth.uid() = user_id);

create policy "Buyers can view own buyer row"
  on public.buyer for select
  using (auth.uid() = user_id);

create policy "Buyers can update own buyer row"
  on public.buyer for update
  using (auth.uid() = user_id);

-- gcash_number/barangay are the only client-editable columns; wallet_address
-- is server-set only (by whatever creates the custodial wallet — the Edge
-- Function today, Alchemy's API next).
revoke update on public.farmer from authenticated;
grant update (barangay, gcash_number) on public.farmer to authenticated;
revoke update on public.buyer from authenticated;
grant update (gcash_number) on public.buyer to authenticated;

create trigger farmer_role_check
  before insert or update on public.farmer
  for each row execute function public.enforce_user_role('user_id', 'Farmer');

create trigger buyer_role_check
  before insert or update on public.buyer
  for each row execute function public.enforce_user_role('user_id', 'Buyer');

create trigger lguofficial_role_check
  before insert or update on public.lguofficial
  for each row execute function public.enforce_user_role('user_id', 'LGU_Official');

-- =============================================================================
-- §2 FARM
-- =============================================================================

create table public.farm (
  farm_id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public."user" (user_id),
  location text,
  land_area_hectares numeric,
  rice_variety text
);

alter table public.farm enable row level security;

create policy "Farmers manage own farms"
  on public.farm for all
  using (auth.uid() = farmer_id)
  with check (auth.uid() = farmer_id);

create trigger farm_farmer_role_check
  before insert or update on public.farm
  for each row execute function public.enforce_user_role('farmer_id', 'Farmer');

create index farm_farmer_id_idx on public.farm (farmer_id);

-- =============================================================================
-- §3 CROPCYCLE
-- =============================================================================

create table public.cropcycle (
  cropcycle_id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farm (farm_id) on delete cascade,
  planting_date date,
  expected_harvest_date date,
  status text not null default 'Growing' check (status in ('Growing', 'Harvested')),
  -- New field, confirmed Aug 2026: feeds the Advisory Module's maturity-days
  -- lookup, distinct from FARM.rice_variety / CROPLISTING.declared_variety.
  rice_type_category text check (rice_type_category in ('Hybrid', 'Inbred', 'Organic', 'Specialty'))
);

alter table public.cropcycle enable row level security;

create policy "Farmers manage own crop cycles"
  on public.cropcycle for all
  using (exists (select 1 from public.farm f where f.farm_id = cropcycle.farm_id and f.farmer_id = auth.uid()))
  with check (exists (select 1 from public.farm f where f.farm_id = cropcycle.farm_id and f.farmer_id = auth.uid()));

create index cropcycle_farm_id_idx on public.cropcycle (farm_id);

-- =============================================================================
-- §4 ADVISORYRECOMMENDATION
-- =============================================================================

create table public.advisoryrecommendation (
  advisory_id uuid primary key default gen_random_uuid(),
  cropcycle_id uuid not null references public.cropcycle (cropcycle_id) on delete cascade,
  type text not null check (type in ('CareTip', 'RainAdvisory')),
  trigger_source text not null check (trigger_source in ('Calendar', 'WeatherFeed')),
  recommended_action text,
  date_issued date not null default current_date
);

alter table public.advisoryrecommendation enable row level security;

-- System-generated (Calendar/WeatherFeed triggers) — read-only for the
-- owning farmer; only the service role writes these.
create policy "Farmers view own advisories"
  on public.advisoryrecommendation for select
  using (exists (
    select 1 from public.cropcycle cc
    join public.farm f on f.farm_id = cc.farm_id
    where cc.cropcycle_id = advisoryrecommendation.cropcycle_id and f.farmer_id = auth.uid()
  ));

create index advisoryrecommendation_cropcycle_id_idx on public.advisoryrecommendation (cropcycle_id);

-- =============================================================================
-- §5 CROPLISTING
-- =============================================================================

create table public.croplisting (
  listing_id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public."user" (user_id),
  date_listed timestamptz not null default now(),
  declared_variety text not null
    check (declared_variety in ('Inbred', 'Hybrid', 'Traditional_or_Heirloom', 'Mix_of_Varieties', 'Others')),
  -- Populated only when declared_variety = Others.
  declared_variety_custom text,
  variety_code text not null default 'OTHER',
  declared_moisture text not null check (declared_moisture in ('Wet', 'Dry')),
  declared_purity_grade text not null default 'Ungraded' check (declared_purity_grade in ('A', 'B', 'C', 'Ungraded')),
  gross_weight_kg numeric not null,
  tare_weight_kg numeric not null,
  net_weight_kg numeric generated always as (gross_weight_kg - tare_weight_kg) stored,
  remaining_quantity_kg numeric not null,
  minimum_request_kg numeric not null default 50,
  is_remainder_tagged boolean generated always as (remaining_quantity_kg < minimum_request_kg) stored,
  -- Locked from MARKETPRICEFEED + VARIETYPRICEPREMIUM at insert time by the
  -- croplisting_lock_price trigger below; never recomputed after that.
  computed_price_per_kg numeric,
  reading_timestamp timestamptz,
  milling_yield_note text not null default 'Approximately 70% (PhilRice reference).',
  status text not null default 'Draft' check (status in ('Draft', 'Available', 'Sold_Out', 'Cancelled')),
  constraint croplisting_custom_variety_only_when_others
    check (declared_variety_custom is null or declared_variety = 'Others')
);

alter table public.croplisting enable row level security;

create policy "Farmers manage own listings"
  on public.croplisting for all
  using (auth.uid() = farmer_id)
  with check (auth.uid() = farmer_id);

-- Buyers browse anything the farmer has actually posted (not Draft).
create policy "Anyone can view non-draft listings"
  on public.croplisting for select
  using (status <> 'Draft');

create trigger croplisting_farmer_role_check
  before insert or update on public.croplisting
  for each row execute function public.enforce_user_role('farmer_id', 'Farmer');

-- Farmer identity for browsing buyers, projected without contact_number —
-- §8 gates contact_number on a TRANSACTIONMATCH existing, this view must not
-- leak it. Runs as the view owner (bypasses "user" RLS by design), which is
-- safe purely because the projection itself excludes contact_number.
create view public.listing_farmer_public as
select cl.listing_id, u.user_id as farmer_id, u.full_name as farmer_name
from public.croplisting cl
join public."user" u on u.user_id = cl.farmer_id
where cl.status <> 'Draft';

grant select on public.listing_farmer_public to authenticated;

create index croplisting_farmer_id_idx on public.croplisting (farmer_id);
create index croplisting_status_idx on public.croplisting (status);

-- =============================================================================
-- §6 LISTINGPHOTO
-- =============================================================================

create table public.listingphoto (
  photo_id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.croplisting (listing_id) on delete cascade,
  storage_uri text not null,
  photo_type text not null check (photo_type in ('BeforeHarvest', 'AfterHarvestUnsacked', 'Overview')),
  upload_timestamp timestamptz not null default now(),
  unique (listing_id, photo_type)
);

alter table public.listingphoto enable row level security;

create policy "Farmers manage own listing photos"
  on public.listingphoto for all
  using (exists (select 1 from public.croplisting cl where cl.listing_id = listingphoto.listing_id and cl.farmer_id = auth.uid()))
  with check (exists (select 1 from public.croplisting cl where cl.listing_id = listingphoto.listing_id and cl.farmer_id = auth.uid()));

create policy "Anyone can view photos of non-draft listings"
  on public.listingphoto for select
  using (exists (select 1 from public.croplisting cl where cl.listing_id = listingphoto.listing_id and cl.status <> 'Draft'));

create index listingphoto_listing_id_idx on public.listingphoto (listing_id);

-- =============================================================================
-- §7 PURCHASEREQUEST
-- =============================================================================

create table public.purchaserequest (
  request_id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.croplisting (listing_id),
  buyer_id uuid not null references public."user" (user_id),
  requested_quantity_kg numeric not null,
  status text not null default 'Pending'
    check (status in ('Pending', 'Accepted', 'Partially_Accepted', 'Rejected', 'Cancelled', 'No_Quantity_Remaining')),
  accepted_quantity_kg numeric,
  submitted_at timestamptz not null default now(),
  -- submitted_at + 30 seconds. Not a generated column: timestamptz + interval
  -- is STABLE (timezone-dependent in general), not IMMUTABLE, which Postgres
  -- requires for generated columns — set via trigger instead, below.
  cancel_deadline timestamptz
);

create function public.purchaserequest_set_cancel_deadline()
returns trigger
language plpgsql
as $$
begin
  new.cancel_deadline := new.submitted_at + interval '30 seconds';
  return new;
end;
$$;

create trigger purchaserequest_set_cancel_deadline_trigger
  before insert on public.purchaserequest
  for each row execute function public.purchaserequest_set_cancel_deadline();

alter table public.purchaserequest enable row level security;

create policy "Buyers manage own purchase requests"
  on public.purchaserequest for all
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

create policy "Farmers view and decide requests on their listings"
  on public.purchaserequest for select
  using (exists (select 1 from public.croplisting cl where cl.listing_id = purchaserequest.listing_id and cl.farmer_id = auth.uid()));

create policy "Farmers update requests on their listings"
  on public.purchaserequest for update
  using (exists (select 1 from public.croplisting cl where cl.listing_id = purchaserequest.listing_id and cl.farmer_id = auth.uid()));

create trigger purchaserequest_buyer_role_check
  before insert or update on public.purchaserequest
  for each row execute function public.enforce_user_role('buyer_id', 'Buyer');

create index purchaserequest_listing_id_idx on public.purchaserequest (listing_id);
create index purchaserequest_buyer_id_idx on public.purchaserequest (buyer_id);

-- =============================================================================
-- §8 TRANSACTIONMATCH
-- =============================================================================

create table public.transactionmatch (
  transaction_id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.croplisting (listing_id),
  created_at timestamptz not null default now(),
  request_id uuid not null references public.purchaserequest (request_id),
  buyer_id uuid not null references public."user" (user_id),
  farmer_id uuid not null references public."user" (user_id),
  agreed_price_per_kg numeric not null,
  quantity_kg numeric not null,
  total_amount numeric generated always as (agreed_price_per_kg * quantity_kg) stored,
  status text not null default 'Pending_Payment'
    check (status in ('Pending_Payment', 'Payment_Confirmed', 'Delivered', 'Completed', 'Cancelled', 'Failed')),
  date_completed timestamptz
);

alter table public.transactionmatch enable row level security;

create policy "Parties can view own transactions"
  on public.transactionmatch for select
  using (auth.uid() = buyer_id or auth.uid() = farmer_id);

create policy "Parties can update own transactions"
  on public.transactionmatch for update
  using (auth.uid() = buyer_id or auth.uid() = farmer_id);

create trigger transactionmatch_buyer_role_check
  before insert or update on public.transactionmatch
  for each row execute function public.enforce_user_role('buyer_id', 'Buyer');

create trigger transactionmatch_farmer_role_check
  before insert or update on public.transactionmatch
  for each row execute function public.enforce_user_role('farmer_id', 'Farmer');

-- Confirmed Aug 2026: Completed is system-derived once Payment_Confirmed and
-- Delivered are both true (see PAYMENT below for the other half of this).
create function public.transactionmatch_check_completed()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Delivered' and exists (
    select 1 from public.payment p where p.transaction_id = new.transaction_id and p.status = 'Confirmed'
  ) then
    new.status := 'Completed';
    new.date_completed := now();
  end if;
  return new;
end;
$$;

-- (Trigger attached after `payment` exists — see below.)

-- §8 gates USER.contact_number visibility on this table's existence.
create policy "Counterpart contact revealed after a transaction match"
  on public."user" for select
  using (exists (
    select 1 from public.transactionmatch tm
    where (tm.buyer_id = auth.uid() and tm.farmer_id = "user".user_id)
       or (tm.farmer_id = auth.uid() and tm.buyer_id = "user".user_id)
  ));

create index transactionmatch_listing_id_idx on public.transactionmatch (listing_id);
create index transactionmatch_buyer_id_idx on public.transactionmatch (buyer_id);
create index transactionmatch_farmer_id_idx on public.transactionmatch (farmer_id);

create trigger transactionmatch_auto_complete
  before update on public.transactionmatch
  for each row execute function public.transactionmatch_check_completed();

-- =============================================================================
-- §9 PAYMENT — renamed from GCASHPAYMENT (Aug 2026): now GCash or Cash.
-- =============================================================================

create table public.payment (
  payment_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactionmatch (transaction_id),
  gcash_reference_number text,
  payment_mode text not null check (payment_mode in ('GCash', 'Cash')),
  amount numeric not null,
  buyer_confirmed_at timestamptz,
  farmer_confirmed_at timestamptz,
  payer_id uuid not null references public."user" (user_id),
  payee_id uuid not null references public."user" (user_id),
  status text not null default 'Pending' check (status in ('Pending', 'Confirmed', 'Failed')),
  "timestamp" timestamptz,
  constraint payment_gcash_reference_only_when_gcash
    check (gcash_reference_number is null or payment_mode = 'GCash')
);

alter table public.payment enable row level security;

create policy "Parties can view own payments"
  on public.payment for select
  using (auth.uid() = payer_id or auth.uid() = payee_id);

create policy "Buyer marks payment sent, farmer confirms received"
  on public.payment for update
  using (auth.uid() = payer_id or auth.uid() = payee_id);

create policy "Buyer records a payment on their transaction"
  on public.payment for insert
  with check (auth.uid() = payer_id);

create trigger payment_payer_role_check
  before insert or update on public.payment
  for each row execute function public.enforce_user_role('payer_id', 'Buyer');

create trigger payment_payee_role_check
  before insert or update on public.payment
  for each row execute function public.enforce_user_role('payee_id', 'Farmer');

-- Confirmed Aug 2026: PAYMENT.status = Failed cascades directly to
-- TRANSACTIONMATCH.status = Failed — not an independent fact.
create function public.payment_failed_cascade()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Failed' and old.status is distinct from 'Failed' then
    update public.transactionmatch set status = 'Failed' where transaction_id = new.transaction_id;
  end if;
  return new;
end;
$$;

create trigger payment_status_failed_cascade
  after update on public.payment
  for each row execute function public.payment_failed_cascade();

-- Other half of the Completed derivation: payment confirmed after the
-- transaction was already marked Delivered.
create function public.payment_check_completed()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Confirmed' and old.status is distinct from 'Confirmed' then
    update public.transactionmatch
      set status = 'Completed', date_completed = now()
      where transaction_id = new.transaction_id and status = 'Delivered';
  end if;
  return new;
end;
$$;

create trigger payment_status_confirmed_complete
  after update on public.payment
  for each row execute function public.payment_check_completed();

create index payment_transaction_id_idx on public.payment (transaction_id);

-- =============================================================================
-- §10 RECEIPT — renamed from BlockchainReceipt; only tx_hash survived the
-- Aug 2026 simplification (contract_address/block_number/ipfs_metadata_cid/
-- timestamp_recorded were dropped as redundant).
-- =============================================================================

create table public.receipt (
  receipt_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactionmatch (transaction_id),
  tx_hash text not null
);

alter table public.receipt enable row level security;

create policy "Parties can view own receipts"
  on public.receipt for select
  using (exists (
    select 1 from public.transactionmatch tm
    where tm.transaction_id = receipt.transaction_id and (tm.buyer_id = auth.uid() or tm.farmer_id = auth.uid())
  ));

create index receipt_transaction_id_idx on public.receipt (transaction_id);

-- =============================================================================
-- §11 CREDIBILITYSCORE — renumbered Aug 2026 after FraudDetectionRecord was
-- removed (its mismatch_count input no longer exists).
-- =============================================================================

create table public.credibilityscore (
  score_id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null unique references public."user" (user_id),
  total_transactions integer not null default 0,
  pass_rate_pct numeric not null default 0,
  last_updated timestamptz not null default now()
);

alter table public.credibilityscore enable row level security;

-- A trust signal buyers need to see before dealing with a farmer — visible
-- to any authenticated user, not just the farmer themselves.
create policy "Anyone can view credibility scores"
  on public.credibilityscore for select
  using (true);

create trigger credibilityscore_farmer_role_check
  before insert or update on public.credibilityscore
  for each row execute function public.enforce_user_role('farmer_id', 'Farmer');

-- =============================================================================
-- §12 RATING — replaces "Dispute Flagging" / DisputeCase entirely.
-- =============================================================================

create table public.rating (
  rating_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactionmatch (transaction_id),
  rater_id uuid not null references public."user" (user_id),
  rated_id uuid not null references public."user" (user_id),
  score integer not null check (score between 1 and 5),
  comment text,
  flagged_word_hit boolean not null default false,
  -- Monitoring signal only — surfaces to the LGU dashboard, no case
  -- management or LGU override capability (per §12 / Open Items).
  reported boolean not null default false,
  report_reason text,
  constraint rating_report_reason_only_when_reported
    check (report_reason is null or reported = true)
);

alter table public.rating enable row level security;

-- Reviews inform trust the same way credibilityscore does — visible broadly.
create policy "Anyone can view ratings"
  on public.rating for select
  using (true);

create policy "A transaction party can rate the other party"
  on public.rating for insert
  with check (
    auth.uid() = rater_id
    and exists (
      select 1 from public.transactionmatch tm
      where tm.transaction_id = rating.transaction_id
        and ((tm.buyer_id = rater_id and tm.farmer_id = rated_id) or (tm.farmer_id = rater_id and tm.buyer_id = rated_id))
    )
  );

create index rating_transaction_id_idx on public.rating (transaction_id);
create index rating_rated_id_idx on public.rating (rated_id);

-- =============================================================================
-- §13 MARKETPRICEFEED
-- =============================================================================

create table public.marketpricefeed (
  feed_id uuid primary key default gen_random_uuid(),
  -- LSTM-GRU forecast output (dry-palay only; PSA has no wet-palay series).
  dry_base_price_per_kg numeric,
  -- Manually maintained by ops/dev from DA/NFA announcements. ₱15.50 is the
  -- midpoint of the team's own farmer-survey ₱14–17/kg bracket (question A2.4).
  wet_base_price_per_kg numeric not null default 15.50,
  nfa_intervention_active boolean not null default false,
  toggled_by uuid references public."user" (user_id),
  toggled_at timestamptz,
  effective_date date not null default current_date
);

alter table public.marketpricefeed enable row level security;

-- Everyone needs to see current prices; only an LGU_Official may toggle the
-- NFA-intervention observation (§13 / Open Items — an out-of-app ops/dev
-- function otherwise, not an LGU price judgment).
create policy "Anyone can view the price feed"
  on public.marketpricefeed for select
  using (true);

revoke update on public.marketpricefeed from authenticated;
grant update (nfa_intervention_active, toggled_by, toggled_at) on public.marketpricefeed to authenticated;

create policy "LGU officials can toggle NFA intervention"
  on public.marketpricefeed for update
  using (exists (select 1 from public.lguofficial lo where lo.user_id = auth.uid()))
  with check (exists (select 1 from public.lguofficial lo where lo.user_id = auth.uid()));

create trigger marketpricefeed_toggled_by_role_check
  before insert or update on public.marketpricefeed
  for each row execute function public.enforce_user_role('toggled_by', 'LGU_Official');

-- =============================================================================
-- §14 VARIETYPRICEPREMIUM — new table, confirmed Aug 2026 with the
-- agriculture specialist. Deliberately just two rows, not a full catalog.
-- =============================================================================

create table public.varietypricepremium (
  variety_code text not null,
  grade text not null check (grade in ('A', 'B', 'C', 'Ungraded')),
  premium_per_kg numeric,
  primary key (variety_code, grade)
);

alter table public.varietypricepremium enable row level security;

create policy "Anyone can view variety price premiums"
  on public.varietypricepremium for select
  using (true);

-- NSIC Rc218 ("218") is the only variety confirmed to carry a premium
-- (aromatic, supply-limited — farmer-reported ₱4-5/kg, upper bound used).
-- Every other variety resolves to the OTHER/Ungraded catch-all at ₱0.
insert into public.varietypricepremium (variety_code, grade, premium_per_kg) values
  ('218', 'A', 5),
  ('OTHER', 'Ungraded', 0);

-- =============================================================================
-- §5 (cont.) — CROPLISTING price-locking and auto-transition triggers, added
-- last since they read from marketpricefeed/varietypricepremium/purchaserequest.
-- =============================================================================

create function public.croplisting_lock_price()
returns trigger
language plpgsql
as $$
declare
  base_price numeric;
  premium numeric;
begin
  if new.computed_price_per_kg is null then
    select case when new.declared_moisture = 'Wet' then wet_base_price_per_kg else dry_base_price_per_kg end
      into base_price
      from public.marketpricefeed
      order by effective_date desc
      limit 1;

    select premium_per_kg into premium
      from public.varietypricepremium
      where variety_code = new.variety_code and grade = new.declared_purity_grade;

    if premium is null then
      select premium_per_kg into premium
        from public.varietypricepremium
        where variety_code = 'OTHER' and grade = 'Ungraded';
    end if;

    new.computed_price_per_kg := coalesce(base_price, 0) + coalesce(premium, 0);
  end if;
  return new;
end;
$$;

create trigger croplisting_lock_price_trigger
  before insert on public.croplisting
  for each row execute function public.croplisting_lock_price();

-- Confirmed Aug 2026: status auto-transitions to Sold_Out once
-- remaining_quantity_kg reaches 0 following an accepted purchase request.
create function public.croplisting_auto_soldout()
returns trigger
language plpgsql
as $$
begin
  if new.remaining_quantity_kg <= 0 and new.status not in ('Cancelled', 'Sold_Out') then
    new.status := 'Sold_Out';
  end if;
  return new;
end;
$$;

create trigger croplisting_soldout_trigger
  before update on public.croplisting
  for each row execute function public.croplisting_auto_soldout();

-- No_Quantity_Remaining added Aug 2026: auto-set on any other still-pending
-- request once the listing sells out, distinct from a farmer-issued Rejected.
create function public.listing_soldout_cascade()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Sold_Out' and old.status is distinct from 'Sold_Out' then
    update public.purchaserequest
      set status = 'No_Quantity_Remaining'
      where listing_id = new.listing_id and status = 'Pending';
  end if;
  return new;
end;
$$;

create trigger croplisting_soldout_cascade
  after update on public.croplisting
  for each row execute function public.listing_soldout_cascade();

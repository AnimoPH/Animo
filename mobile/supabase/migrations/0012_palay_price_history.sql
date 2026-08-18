-- Palay price history table, feeding the pricing_service's `last_prices`
-- input. Additive migration on top of 0001_full_data_dictionary_schema.sql —
-- does not touch marketpricefeed (that table is a single current-price row,
-- not a monthly history series) or any other existing table.
--
-- Rows are entered manually by an LGU official for now (see `source`
-- default). A PSA OpenSTAT API integration may replace manual entry later
-- without a schema change — it would just insert rows with source = 'psa_api'.

create table public.palay_price_history (
  price_id uuid primary key default gen_random_uuid(),
  province text not null default 'Rizal',
  price_month date not null,           -- always day 1 of the month, e.g. 2026-07-01
  price_per_kg numeric not null,       -- PSA farmgate dry palay price
  source text not null default 'manual_admin' check (source in ('manual_admin', 'psa_api')),
  entered_by uuid references public."user" (user_id),
  created_at timestamptz not null default now(),
  unique (province, price_month)
);

comment on table public.palay_price_history is 'Monthly PSA farmgate palay price history, used by the pricing_service to build last_prices input (12 trailing months required).';

alter table public.palay_price_history enable row level security;

-- Everyone needs to read price history (mobile app + LGU dashboard both
-- query "last 12 months"); only an LGU_Official may add/edit rows, same
-- split as marketpricefeed's read-everyone/write-LGU_Official pattern.
--
-- Explicit SELECT grant here (marketpricefeed relies on a project-level
-- default privilege that the hosted Supabase project apparently has but
-- the local CLI's Postgres image does not replicate - confirmed locally:
-- `set role service_role; select * from marketpricefeed;` fails the same
-- way without this grant). Granting it directly keeps this table correct
-- regardless of that assumption.
grant select on public.palay_price_history to anon, authenticated, service_role;

create policy "Anyone can view price history"
  on public.palay_price_history for select
  using (true);

-- service_role also needs explicit write grants (not just authenticated):
-- sync-psa-prices runs as service_role and writes on behalf of whichever
-- LGU official triggered it, same "edge function is the only writer"
-- pattern as complete-registration's user/farmer/buyer inserts.
revoke insert, update, delete on public.palay_price_history from authenticated, service_role;
grant insert, update, delete on public.palay_price_history to authenticated, service_role;

create policy "LGU officials can manage price history"
  on public.palay_price_history for all
  using (exists (select 1 from public.lguofficial lo where lo.user_id = auth.uid()))
  with check (exists (select 1 from public.lguofficial lo where lo.user_id = auth.uid()));

create trigger palay_price_history_entered_by_role_check
  before insert or update on public.palay_price_history
  for each row execute function public.enforce_user_role('entered_by', 'LGU_Official');

create index palay_price_history_province_month_idx
  on public.palay_price_history (province, price_month desc);

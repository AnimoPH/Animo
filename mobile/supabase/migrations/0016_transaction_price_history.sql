-- Empty ANIMO trade-price series for later Stage 2/3. Not read by
-- pricing/ (FastAPI stays on palay_price_history / PSA). Not written yet —
-- no transactionmatch completion hook; rows will be inserted manually or
-- by a future trigger when status reaches 'Completed'.
--
-- Moisture and municipality are denormalized so a later listing/farm edit
-- cannot rewrite history. Municipality defaults to Antipolo (v1 scope).

create table public.transaction_price_history (
  trade_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.transactionmatch (transaction_id),
  price_per_kg numeric not null,
  moisture text not null check (moisture in ('Wet', 'Dry')),
  municipality text not null default 'Antipolo',
  quantity_kg numeric not null,
  completed_at timestamptz not null
);

comment on table public.transaction_price_history is
  'Completed ANIMO trade prices (wet/dry, Antipolo). Unused by the pricing model in v1; empty until a later completion hook.';

alter table public.transaction_price_history enable row level security;

grant select on public.transaction_price_history to service_role;
grant insert, update, delete on public.transaction_price_history to service_role;

revoke insert, update, delete on public.transaction_price_history from anon, authenticated;

create index transaction_price_history_completed_at_idx
  on public.transaction_price_history (completed_at desc);

create index transaction_price_history_municipality_idx
  on public.transaction_price_history (municipality, completed_at desc);

-- NFA intervention windows, replacing the hardcoded NFA_WINDOWS list that
-- used to live in pricing/api/main.py. Modeled as date
-- ranges (not a single boolean) because NFA intervention has happened more
-- than once historically with different start/end dates - a single toggle
-- can't represent that, only "is it active right now".
--
-- Same read-everyone/write-LGU_Official split as marketpricefeed's NFA
-- toggle and palay_price_history.

create table public.nfa_intervention_window (
  window_id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date,              -- null = still active/ongoing
  toggled_by uuid references public."user" (user_id),
  toggled_at timestamptz not null default now(),
  constraint nfa_intervention_window_valid_range check (end_date is null or end_date >= start_date)
);

comment on table public.nfa_intervention_window is 'Date ranges when NFA market intervention was active - feeds the nfa_active feature that used to be a hardcoded list in pricing/api/main.py.';

alter table public.nfa_intervention_window enable row level security;

grant select on public.nfa_intervention_window to anon, authenticated, service_role;
grant insert, update, delete on public.nfa_intervention_window to authenticated, service_role;

create policy "Anyone can view NFA intervention windows"
  on public.nfa_intervention_window for select
  using (true);

create policy "LGU officials can manage NFA intervention windows"
  on public.nfa_intervention_window for all
  using (exists (select 1 from public.lguofficial lo where lo.user_id = auth.uid()))
  with check (exists (select 1 from public.lguofficial lo where lo.user_id = auth.uid()));

create trigger nfa_intervention_window_toggled_by_role_check
  before insert or update on public.nfa_intervention_window
  for each row execute function public.enforce_user_role('toggled_by', 'LGU_Official');

create index nfa_intervention_window_dates_idx
  on public.nfa_intervention_window (start_date, end_date);

-- Preserve the two windows that were previously hardcoded in main.py as
-- historical record (toggled_by left null - these are a system migration
-- of pre-existing knowledge, not a live admin action).
insert into public.nfa_intervention_window (start_date, end_date) values
  ('2019-01-01', '2020-12-01'),
  ('2025-01-01', '2026-06-01');

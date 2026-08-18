-- LGU web console: authenticated LGU_Official read access (no anon views).
-- Replaces the pre-auth lgu_* registry views — callers must sign in.

create or replace function public.is_lgu_official()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lguofficial lo where lo.user_id = auth.uid()
  );
$$;

revoke all on function public.is_lgu_official() from public;
grant execute on function public.is_lgu_official() to authenticated;

drop view if exists public.lgu_farmer_registry;
drop view if exists public.lgu_buyer_registry;
drop view if exists public.lgu_user_profile;
drop view if exists public.lgu_user_reviews;
drop view if exists public.lgu_user_transactions;

create policy "LGU officials can view users for console"
  on public."user" for select
  using (public.is_lgu_official());

create policy "LGU officials can view farmers for console"
  on public.farmer for select
  using (public.is_lgu_official());

create policy "LGU officials can view buyers for console"
  on public.buyer for select
  using (public.is_lgu_official());

create policy "LGU officials can view listings for console"
  on public.croplisting for select
  using (public.is_lgu_official());

create policy "LGU officials can view purchase requests for console"
  on public.purchaserequest for select
  using (public.is_lgu_official());

create policy "LGU officials can view transactions for console"
  on public.transactionmatch for select
  using (public.is_lgu_official());

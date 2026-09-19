-- Account suspension — Project Context Sec. 5.4/7.4 ("LGU may suspend an
-- account following repeated reported transactions"), Research Notes line
-- 710 ("still undesigned: what actually triggers a suspension review").
--
-- Resolved: the reported-flag count stays informational only (surfaced to
-- the LGU official, who decides), never an automatic system action — same
-- "LGU is visibility/escalation, not control" pattern already used for
-- pricing (Sec. 7.4) and the NFA window toggle. account-review.tsx already
-- collects a suspension reason in its modal but only ever set local React
-- state with it (see that file's own "stays local until LGU auth lands"
-- comment) — this migration is the "LGU auth lands" part.

alter table public."user" add column suspension_reason text;

create or replace function public.suspend_account(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if not public.is_lgu_official() then
    raise exception 'LGU official required';
  end if;

  select role into v_role from public."user" where user_id = p_user_id;
  if v_role is null then
    raise exception 'user not found';
  end if;
  if v_role not in ('Farmer', 'Buyer') then
    raise exception 'only farmer/buyer accounts can be suspended';
  end if;

  update public."user"
    set account_status = 'Suspended',
        suspended_by = auth.uid(),
        suspended_at = now(),
        suspension_reason = p_reason
    where user_id = p_user_id;
end;
$$;

create or replace function public.unsuspend_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_lgu_official() then
    raise exception 'LGU official required';
  end if;

  update public."user"
    set account_status = 'Active',
        suspended_by = null,
        suspended_at = null,
        suspension_reason = null
    where user_id = p_user_id;
end;
$$;

revoke all on function public.suspend_account(uuid, text) from public, anon;
grant execute on function public.suspend_account(uuid, text) to authenticated;
revoke all on function public.unsuspend_account(uuid) from public, anon;
grant execute on function public.unsuspend_account(uuid) to authenticated;

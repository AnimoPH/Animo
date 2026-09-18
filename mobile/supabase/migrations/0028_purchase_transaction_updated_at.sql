-- Track last activity on purchase requests and transaction matches so
-- Transaksyon lists can sort by "most recently changed" rather than
-- creation-only timestamps. Mirrors buyer_preferences updated_at (0023):
-- column default now() on insert + BEFORE UPDATE trigger that retouches.
--
-- Also patches buyer_confirm_payment_sent: that RPC previously updated
-- payment only, so transactionmatch.updated_at would never advance when
-- the buyer marks payment sent. Touch the parent match row so the trigger
-- fires without changing transaction status.

alter table public.purchaserequest
  add column updated_at timestamptz not null default now();

alter table public.transactionmatch
  add column updated_at timestamptz not null default now();

create function public.touch_purchaserequest_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger purchaserequest_touch_updated_at
  before update on public.purchaserequest
  for each row execute function public.touch_purchaserequest_updated_at();

create function public.touch_transactionmatch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger transactionmatch_touch_updated_at
  before update on public.transactionmatch
  for each row execute function public.touch_transactionmatch_updated_at();

create or replace function public.buyer_confirm_payment_sent(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payer_id uuid;
  v_transaction_id uuid;
begin
  select payer_id, transaction_id into v_payer_id, v_transaction_id
    from public.payment where payment_id = p_payment_id;
  if v_payer_id is null then
    raise exception 'payment not found';
  end if;
  if auth.uid() <> v_payer_id then
    raise exception 'not authorized';
  end if;

  update public.payment set buyer_confirmed_at = now() where payment_id = p_payment_id;

  -- No status change — only retouch so updated_at advances via the trigger.
  update public.transactionmatch
    set updated_at = updated_at
    where transaction_id = v_transaction_id;
end;
$$;

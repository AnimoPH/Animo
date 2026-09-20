-- Restore the transactionmatch.updated_at retouch on buyer_confirm_payment_sent
-- that 0028 (tweaks/UI) / the hosted SQL-editor fix had landed, then 0032's
-- suspension-enforcement rewrite of the same function dropped.
--
-- Keep 0032's is_account_active() guard exactly as-is; only re-add the
-- no-status-change UPDATE that fires transactionmatch_touch_updated_at so
-- Transaksyon "most recently changed" sorting sees buyer-confirm events.

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
  if not public.is_account_active() then
    raise exception 'account is suspended';
  end if;

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

-- Security fix: the original payment/transactionmatch policies let either
-- party rewrite almost any column directly, including `status` and the
-- counterparty's confirmation fields. Concretely, a buyer alone could:
--
--   1. update transactionmatch set status = 'Delivered' where transaction_id = X;   -- passed RLS
--   2. insert into payment (transaction_id, payer_id, payee_id, status, ...)
--        values (X, auth.uid(), <any farmer>, 'Pending', ...);                       -- passed RLS
--   3. update payment set status = 'Confirmed' where payment_id = <new row>;         -- passed RLS
--
-- Step 3's AFTER UPDATE trigger (payment_check_completed, see 0001) then
-- auto-marks the transaction Completed — a buyer could self-attest a GCash
-- payment was made and confirmed, without the farmer ever confirming
-- anything and without money moving. This migration does not touch the
-- existing derivation triggers (they're correct); it removes the client's
-- ability to drive the state machine directly and replaces it with
-- SECURITY DEFINER RPCs that check the caller is the actual counterparty
-- before performing the write — the same pattern already used for the
-- wallet vault functions in 0002.

-- =============================================================================
-- payment: bind INSERT to the real transaction parties, force Pending on
-- insert, and remove direct client UPDATE entirely.
-- =============================================================================

drop policy if exists "Buyer records a payment on their transaction" on public.payment;
create policy "Buyer records a payment on their transaction"
  on public.payment for insert
  with check (
    auth.uid() = payer_id
    and status = 'Pending'
    and buyer_confirmed_at is null
    and farmer_confirmed_at is null
    and exists (
      select 1 from public.transactionmatch tm
      where tm.transaction_id = payment.transaction_id
        and tm.buyer_id = payment.payer_id
        and tm.farmer_id = payment.payee_id
    )
  );

drop policy if exists "Buyer marks payment sent, farmer confirms received" on public.payment;
revoke update on public.payment from authenticated;

-- =============================================================================
-- transactionmatch: remove direct client UPDATE entirely — status now only
-- advances through the RPCs below.
-- =============================================================================

drop policy if exists "Parties can update own transactions" on public.transactionmatch;
revoke update on public.transactionmatch from authenticated;

-- =============================================================================
-- RPCs — each checks auth.uid() against the actual counterparty on the row
-- before writing. SECURITY DEFINER lets these bypass the revokes above the
-- same way the table owner always could; EXECUTE is granted to authenticated
-- only (not anon), matching "must be signed in" for every one of these.
-- =============================================================================

-- Buyer records a payment against their own transaction. payer_id/payee_id
-- are derived from the transaction row itself, never taken from the caller,
-- so they can't be spoofed to point at an uninvolved farmer.
create or replace function public.record_payment(
  p_transaction_id uuid,
  p_payment_mode text,
  p_amount numeric,
  p_gcash_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid;
  v_farmer_id uuid;
  v_payment_id uuid;
begin
  select buyer_id, farmer_id into v_buyer_id, v_farmer_id
    from public.transactionmatch
    where transaction_id = p_transaction_id;

  if v_buyer_id is null then
    raise exception 'transaction not found';
  end if;
  if auth.uid() <> v_buyer_id then
    raise exception 'not authorized';
  end if;

  insert into public.payment (
    transaction_id, payer_id, payee_id, payment_mode, amount,
    gcash_reference_number, status
  ) values (
    p_transaction_id, v_buyer_id, v_farmer_id, p_payment_mode, p_amount,
    p_gcash_reference, 'Pending'
  )
  returning payment_id into v_payment_id;

  return v_payment_id;
end;
$$;

revoke all on function public.record_payment(uuid, text, numeric, text) from public, anon;
grant execute on function public.record_payment(uuid, text, numeric, text) to authenticated;

-- Buyer confirms they sent the payment (their own half only — never flips
-- `status`, which stays under the farmer's confirmation below).
create or replace function public.buyer_confirm_payment_sent(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payer_id uuid;
begin
  select payer_id into v_payer_id from public.payment where payment_id = p_payment_id;
  if v_payer_id is null then
    raise exception 'payment not found';
  end if;
  if auth.uid() <> v_payer_id then
    raise exception 'not authorized';
  end if;

  update public.payment set buyer_confirmed_at = now() where payment_id = p_payment_id;
end;
$$;

revoke all on function public.buyer_confirm_payment_sent(uuid) from public, anon;
grant execute on function public.buyer_confirm_payment_sent(uuid) to authenticated;

-- Farmer confirms they actually received the payment — the only path that
-- may set payment.status = 'Confirmed', and only the payee may call it.
-- Also advances transactionmatch to Payment_Confirmed so
-- farmer_mark_delivered (below) has a real prior state to require.
create or replace function public.farmer_confirm_payment_received(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payee_id uuid;
  v_transaction_id uuid;
begin
  select payee_id, transaction_id into v_payee_id, v_transaction_id
    from public.payment where payment_id = p_payment_id;
  if v_payee_id is null then
    raise exception 'payment not found';
  end if;
  if auth.uid() <> v_payee_id then
    raise exception 'not authorized';
  end if;

  update public.payment
    set farmer_confirmed_at = now(), status = 'Confirmed'
    where payment_id = p_payment_id;

  update public.transactionmatch
    set status = 'Payment_Confirmed'
    where transaction_id = v_transaction_id and status = 'Pending_Payment';
end;
$$;

revoke all on function public.farmer_confirm_payment_received(uuid) from public, anon;
grant execute on function public.farmer_confirm_payment_received(uuid) to authenticated;

-- Either party can report the payment as failed (e.g. a bounced GCash
-- transfer); the existing payment_failed_cascade trigger (0001) then fails
-- the transaction the same way it always did.
create or replace function public.report_payment_failed(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payer_id uuid;
  v_payee_id uuid;
begin
  select payer_id, payee_id into v_payer_id, v_payee_id
    from public.payment where payment_id = p_payment_id;
  if v_payer_id is null then
    raise exception 'payment not found';
  end if;
  if auth.uid() <> v_payer_id and auth.uid() <> v_payee_id then
    raise exception 'not authorized';
  end if;

  update public.payment set status = 'Failed' where payment_id = p_payment_id;
end;
$$;

revoke all on function public.report_payment_failed(uuid) from public, anon;
grant execute on function public.report_payment_failed(uuid) to authenticated;

-- Farmer marks the crop delivered — only after payment is confirmed, and
-- only the farmer on that transaction may call it. The existing
-- transactionmatch_check_completed trigger (0001) still derives Completed
-- from this the same way it always did.
create or replace function public.farmer_mark_delivered(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer_id uuid;
begin
  select farmer_id into v_farmer_id
    from public.transactionmatch where transaction_id = p_transaction_id;
  if v_farmer_id is null then
    raise exception 'transaction not found';
  end if;
  if auth.uid() <> v_farmer_id then
    raise exception 'not authorized';
  end if;

  update public.transactionmatch
    set status = 'Delivered'
    where transaction_id = p_transaction_id and status = 'Payment_Confirmed';
end;
$$;

revoke all on function public.farmer_mark_delivered(uuid) from public, anon;
grant execute on function public.farmer_mark_delivered(uuid) to authenticated;

-- Either party can cancel, but only before any payment has been recorded.
create or replace function public.cancel_transaction(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid;
  v_farmer_id uuid;
  v_status text;
begin
  select buyer_id, farmer_id, status into v_buyer_id, v_farmer_id, v_status
    from public.transactionmatch where transaction_id = p_transaction_id;
  if v_buyer_id is null then
    raise exception 'transaction not found';
  end if;
  if auth.uid() <> v_buyer_id and auth.uid() <> v_farmer_id then
    raise exception 'not authorized';
  end if;
  if v_status <> 'Pending_Payment' then
    raise exception 'cannot cancel after payment has started';
  end if;

  update public.transactionmatch set status = 'Cancelled' where transaction_id = p_transaction_id;
end;
$$;

revoke all on function public.cancel_transaction(uuid) from public, anon;
grant execute on function public.cancel_transaction(uuid) to authenticated;

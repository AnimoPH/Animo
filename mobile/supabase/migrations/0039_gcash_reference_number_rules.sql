-- GCash reference number: digits only, exactly gcash_ref_length() digits,
-- required for GCash, and never reused.
--
-- New rows only. The rule is a trigger on INSERT and on UPDATE OF
-- gcash_reference_number / payment_mode, not a CHECK. A CHECK (even NOT VALID)
-- runs on every UPDATE, so old rows with short test numbers could no longer be
-- confirmed. buyer_confirm_payment_sent, farmer_confirm_payment_received and
-- report_payment_failed only set buyer_confirmed_at, farmer_confirmed_at and
-- status, so the trigger never fires for them. Existing rows are not touched.
--
-- Cash with a number is already rejected by the CHECK
-- payment_gcash_reference_only_when_gcash (0001). The trigger repeats it so
-- record_payment and direct inserts get the same error text.
--
-- Before applying, check for duplicates among 13-digit numbers (the unique
-- index fails if any exist). Short repeated test numbers are fine:
--   select gcash_reference_number, count(*) from public.payment
--   where gcash_reference_number ~ '^[0-9]{13}$'
--   group by 1 having count(*) > 1;

-- ---------------------------------------------------------------------------
-- Length. The app has its own copy: GCASH_REF_LENGTH in
-- mobile/src/constants/payment.ts. Change both together.
-- ---------------------------------------------------------------------------
create or replace function public.gcash_ref_length()
returns integer
language sql
immutable
as $$
  select 13
$$;

comment on function public.gcash_ref_length() is
  'Digits in a GCash reference number. Keep equal to GCASH_REF_LENGTH in mobile/src/constants/payment.ts.';

-- ---------------------------------------------------------------------------
-- Rule for new rows.
-- ---------------------------------------------------------------------------
create or replace function public.payment_enforce_gcash_reference()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.payment_mode = 'GCash' then
    if new.gcash_reference_number is null or new.gcash_reference_number = '' then
      raise exception 'gcash reference required';
    end if;
    if new.gcash_reference_number !~ ('^[0-9]{' || public.gcash_ref_length() || '}$') then
      raise exception 'gcash reference invalid format';
    end if;
  elsif new.gcash_reference_number is not null then
    raise exception 'gcash reference not allowed for cash';
  end if;
  return new;
end;
$$;

create trigger payment_gcash_reference_rule
  before insert or update of gcash_reference_number, payment_mode on public.payment
  for each row execute function public.payment_enforce_gcash_reference();

-- ---------------------------------------------------------------------------
-- A GCash reference number cannot be reused.
--
-- Partial: only numbers that match the 13-digit rule. Older test rows hold
-- short numbers that repeat (e.g. 123456 five times). They stay as they are
-- and are not indexed. Every new GCash row matches the rule (trigger above),
-- so every new row is covered.
--
-- The 13 is a literal on purpose. Postgres does not rebuild an index when a
-- function in its predicate changes, so using gcash_ref_length() here would
-- leave a stale index after a length change. If the length changes, a new
-- migration must drop and recreate this index with the new pattern.
-- ---------------------------------------------------------------------------
create unique index payment_gcash_reference_number_key
  on public.payment (gcash_reference_number)
  where gcash_reference_number ~ '^[0-9]{13}$';

-- ---------------------------------------------------------------------------
-- record_payment: same signature and body as 0032, plus the reference checks
-- so the app gets a known message instead of raw constraint text. The
-- unique_violation handler covers two buyers sending the same number at once.
-- ---------------------------------------------------------------------------
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
  if not public.is_account_active() then
    raise exception 'account is suspended';
  end if;

  select buyer_id, farmer_id into v_buyer_id, v_farmer_id
    from public.transactionmatch
    where transaction_id = p_transaction_id;

  if v_buyer_id is null then
    raise exception 'transaction not found';
  end if;
  if auth.uid() <> v_buyer_id then
    raise exception 'not authorized';
  end if;

  if p_payment_mode = 'GCash' then
    if p_gcash_reference is null or p_gcash_reference = '' then
      raise exception 'gcash reference required';
    end if;
    if p_gcash_reference !~ ('^[0-9]{' || public.gcash_ref_length() || '}$') then
      raise exception 'gcash reference invalid format';
    end if;
    -- p_gcash_reference is already 13 digits here, so an equal row is also a
    -- 13-digit row covered by the unique index. Short legacy numbers never match.
    if exists (select 1 from public.payment where gcash_reference_number = p_gcash_reference) then
      raise exception 'gcash reference already used';
    end if;
  elsif p_gcash_reference is not null then
    raise exception 'gcash reference not allowed for cash';
  end if;

  begin
    insert into public.payment (
      transaction_id, payer_id, payee_id, payment_mode, amount,
      gcash_reference_number, status
    ) values (
      p_transaction_id, v_buyer_id, v_farmer_id, p_payment_mode, p_amount,
      p_gcash_reference, 'Pending'
    )
    returning payment_id into v_payment_id;
  exception
    when unique_violation then
      raise exception 'gcash reference already used';
  end;

  return v_payment_id;
end;
$$;

revoke all on function public.record_payment(uuid, text, numeric, text) from public, anon;
grant execute on function public.record_payment(uuid, text, numeric, text) to authenticated;

-- Offline outbox support, backend half. A phone that saved an action while
-- offline sends it again until the server answers, so every action needs a
-- key the server can recognise as "already sent":
--
--   croplisting, purchaserequest, payment get client_request_id with a
--   unique index. A repeat send returns the first record, it does not create
--   a second one.
--
--   create_crop_listing(...) replaces the direct listing insert for the
--   outbox. It does not take a peso. The phone sends the peso the farmer saw
--   on the cached feed, and the server accepts the listing only when its own
--   locked price still equals that peso. The locked price always comes from
--   the feed (croplisting_compute_locked_price), never from the phone. If the
--   feed changed while the phone was offline the listing is refused with
--   "price changed: <new peso>" and the farmer confirms the new peso.
--
--   record_payment gets an optional p_client_request_id (a repeat returns the
--   same payment_id). The two confirm RPCs keep the first confirmation time
--   when they run a second time.
--
-- Existing rows keep client_request_id null. The unique indexes ignore nulls.

alter table public.croplisting add column client_request_id uuid;
alter table public.purchaserequest add column client_request_id uuid;
alter table public.payment add column client_request_id uuid;

create unique index croplisting_client_request_id_key
  on public.croplisting (client_request_id) where client_request_id is not null;
create unique index purchaserequest_client_request_id_key
  on public.purchaserequest (client_request_id) where client_request_id is not null;
create unique index payment_client_request_id_key
  on public.payment (client_request_id) where client_request_id is not null;

-- ---------------------------------------------------------------------------
-- create_crop_listing. SECURITY INVOKER, so the insert policy (own listing,
-- active account) and the croplisting_lock_price trigger run as before.
-- ---------------------------------------------------------------------------
create or replace function public.create_crop_listing(
  p_client_request_id uuid,
  p_seen_price_per_kg numeric,
  p_listing_name text,
  p_declared_variety text,
  p_declared_variety_custom text,
  p_variety_code text,
  p_specific_variety_name text,
  p_specific_variety_name_custom text,
  p_declared_moisture text,
  p_declared_purity_grade text,
  p_gross_weight_kg numeric,
  p_tare_weight_kg numeric
)
returns public.croplisting
language plpgsql
set search_path = public
as $$
declare
  v_row public.croplisting;
  v_current numeric;
begin
  if p_client_request_id is null then
    raise exception 'client request id required';
  end if;

  select * into v_row
    from public.croplisting
    where client_request_id = p_client_request_id and farmer_id = auth.uid();
  if found then
    return v_row;
  end if;

  if p_seen_price_per_kg is not null then
    v_current := public.croplisting_compute_locked_price(
      p_declared_moisture, p_variety_code, p_declared_purity_grade
    );
    if abs(v_current - p_seen_price_per_kg) > 0.005 then
      raise exception 'price changed: %', v_current;
    end if;
  end if;

  begin
    insert into public.croplisting (
      farmer_id, listing_name, declared_variety, declared_variety_custom,
      variety_code, specific_variety_name, specific_variety_name_custom,
      declared_moisture, declared_purity_grade,
      gross_weight_kg, tare_weight_kg, remaining_quantity_kg,
      status, client_request_id
    ) values (
      auth.uid(), p_listing_name, p_declared_variety, p_declared_variety_custom,
      p_variety_code, p_specific_variety_name, p_specific_variety_name_custom,
      p_declared_moisture, p_declared_purity_grade,
      p_gross_weight_kg, p_tare_weight_kg, p_gross_weight_kg - p_tare_weight_kg,
      'Available', p_client_request_id
    )
    returning * into v_row;
  exception
    when unique_violation then
      select * into v_row
        from public.croplisting
        where client_request_id = p_client_request_id and farmer_id = auth.uid();
      if not found then
        raise;
      end if;
  end;

  return v_row;
end;
$$;

revoke all on function public.create_crop_listing(
  uuid, numeric, text, text, text, text, text, text, text, text, numeric, numeric
) from public, anon;
grant execute on function public.create_crop_listing(
  uuid, numeric, text, text, text, text, text, text, text, text, numeric, numeric
) to authenticated;

-- ---------------------------------------------------------------------------
-- record_payment with a repeat key. Same checks as 0039, in the same order,
-- after the replay lookup.
-- ---------------------------------------------------------------------------
drop function public.record_payment(uuid, text, numeric, text);

create or replace function public.record_payment(
  p_transaction_id uuid,
  p_payment_mode text,
  p_amount numeric,
  p_gcash_reference text default null,
  p_client_request_id uuid default null
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

  if p_client_request_id is not null then
    select payment_id into v_payment_id
      from public.payment
      where client_request_id = p_client_request_id and payer_id = v_buyer_id;
    if found then
      return v_payment_id;
    end if;
  end if;

  if p_payment_mode = 'GCash' then
    if p_gcash_reference is null or p_gcash_reference = '' then
      raise exception 'gcash reference required';
    end if;
    if p_gcash_reference !~ ('^[0-9]{' || public.gcash_ref_length() || '}$') then
      raise exception 'gcash reference invalid format';
    end if;
    if exists (select 1 from public.payment where gcash_reference_number = p_gcash_reference) then
      raise exception 'gcash reference already used';
    end if;
  elsif p_gcash_reference is not null then
    raise exception 'gcash reference not allowed for cash';
  end if;

  begin
    insert into public.payment (
      transaction_id, payer_id, payee_id, payment_mode, amount,
      gcash_reference_number, status, client_request_id
    ) values (
      p_transaction_id, v_buyer_id, v_farmer_id, p_payment_mode, p_amount,
      p_gcash_reference, 'Pending', p_client_request_id
    )
    returning payment_id into v_payment_id;
  exception
    when unique_violation then
      if p_client_request_id is not null then
        select payment_id into v_payment_id
          from public.payment
          where client_request_id = p_client_request_id and payer_id = v_buyer_id;
        if found then
          return v_payment_id;
        end if;
      end if;
      raise exception 'gcash reference already used';
  end;

  return v_payment_id;
end;
$$;

revoke all on function public.record_payment(uuid, text, numeric, text, uuid) from public, anon;
grant execute on function public.record_payment(uuid, text, numeric, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Confirm RPCs: a second call keeps the first confirmation time.
-- ---------------------------------------------------------------------------
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

  update public.payment
    set buyer_confirmed_at = coalesce(buyer_confirmed_at, now())
    where payment_id = p_payment_id;

  -- No status change, only retouch so updated_at advances via the trigger (0033).
  update public.transactionmatch
    set updated_at = updated_at
    where transaction_id = v_transaction_id;
end;
$$;

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
  if not public.is_account_active() then
    raise exception 'account is suspended';
  end if;

  select payee_id, transaction_id into v_payee_id, v_transaction_id
    from public.payment where payment_id = p_payment_id;
  if v_payee_id is null then
    raise exception 'payment not found';
  end if;
  if auth.uid() <> v_payee_id then
    raise exception 'not authorized';
  end if;

  update public.payment
    set farmer_confirmed_at = coalesce(farmer_confirmed_at, now()), status = 'Confirmed'
    where payment_id = p_payment_id;

  update public.transactionmatch
    set status = 'Payment_Confirmed'
    where transaction_id = v_transaction_id and status = 'Pending_Payment';
end;
$$;

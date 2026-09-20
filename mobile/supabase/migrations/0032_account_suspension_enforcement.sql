-- Account suspension enforcement — Sec. 21.4/AP.4's remaining open item.
-- 0028 added the flag and the LGU-facing suspend/unsuspend RPCs; nothing
-- since has ever read `account_status` to block anything. Scope (confirmed
-- with the team): suspension blocks new marketplace activity only — a
-- suspended user can still log in and view everything (listings, past
-- transactions, ratings, why they're suspended), matching the "visibility,
-- not a black hole" tone the rest of this project uses. This migration adds
-- that block at the RLS/RPC layer, same enforcement point as every other
-- write path in this schema (never at the client only).

create or replace function public.is_account_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public."user" u where u.user_id = auth.uid() and u.account_status = 'Active'
  );
$$;

revoke all on function public.is_account_active() from public;
grant execute on function public.is_account_active() to authenticated;

-- ---------------------------------------------------------------------------
-- Insert-time RLS: the three places a suspended user could still create a
-- new row directly (not through an RPC).
-- ---------------------------------------------------------------------------

drop policy "Farmers can insert own listings" on public.croplisting;
create policy "Farmers can insert own listings"
  on public.croplisting for insert
  with check (auth.uid() = farmer_id and public.is_account_active());

drop policy "Buyers can submit purchase requests" on public.purchaserequest;
create policy "Buyers can submit purchase requests"
  on public.purchaserequest for insert
  with check (
    auth.uid() = buyer_id
    and status = 'Pending'
    and accepted_quantity_kg is null
    and public.is_account_active()
  );

drop policy "A transaction party can rate the other party" on public.rating;
create policy "A transaction party can rate the other party"
  on public.rating for insert
  with check (
    auth.uid() = rater_id
    and public.is_account_active()
    and exists (
      select 1 from public.transactionmatch tm
      where tm.transaction_id = rating.transaction_id
        and ((tm.buyer_id = rater_id and tm.farmer_id = rated_id) or (tm.farmer_id = rater_id and tm.buyer_id = rated_id))
    )
  );

-- ---------------------------------------------------------------------------
-- RPCs — every one of them replaced in place to reject a suspended caller
-- before doing anything else. Bodies below are copied verbatim from their
-- current definitions (0009/0004/0029, as already amended by 0030's push
-- notification calls where applicable) with only the new check inserted
-- right after `begin`.
-- ---------------------------------------------------------------------------

create or replace function public.accept_purchase_request(
  p_request_id uuid,
  p_accepted_quantity_kg numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_buyer_id uuid;
  v_requested_quantity_kg numeric;
  v_status text;
  v_farmer_id uuid;
  v_remaining_quantity_kg numeric;
  v_price_per_kg numeric;
  v_transaction_id uuid;
begin
  if not public.is_account_active() then
    raise exception 'account is suspended';
  end if;

  if p_accepted_quantity_kg is null or p_accepted_quantity_kg <= 0 then
    raise exception 'p_accepted_quantity_kg must be greater than zero';
  end if;

  select listing_id, buyer_id, requested_quantity_kg, status
    into v_listing_id, v_buyer_id, v_requested_quantity_kg, v_status
    from public.purchaserequest
    where request_id = p_request_id
    for update;

  if v_listing_id is null then
    raise exception 'purchase request not found';
  end if;

  select farmer_id, remaining_quantity_kg, computed_price_per_kg
    into v_farmer_id, v_remaining_quantity_kg, v_price_per_kg
    from public.croplisting
    where listing_id = v_listing_id
    for update;

  if auth.uid() <> v_farmer_id then
    raise exception 'not authorized';
  end if;

  if v_status <> 'Pending' then
    raise exception 'purchase request is no longer pending (status: %)', v_status;
  end if;

  if p_accepted_quantity_kg > v_requested_quantity_kg then
    raise exception 'accepted quantity (%) cannot exceed requested quantity (%)', p_accepted_quantity_kg, v_requested_quantity_kg;
  end if;

  if p_accepted_quantity_kg > v_remaining_quantity_kg then
    raise exception 'accepted quantity (%) exceeds remaining listing quantity (%)', p_accepted_quantity_kg, v_remaining_quantity_kg;
  end if;

  insert into public.transactionmatch (
    listing_id, request_id, buyer_id, farmer_id, agreed_price_per_kg, quantity_kg, status
  ) values (
    v_listing_id, p_request_id, v_buyer_id, v_farmer_id, v_price_per_kg, p_accepted_quantity_kg, 'Pending_Payment'
  )
  returning transaction_id into v_transaction_id;

  update public.purchaserequest
    set status = case when p_accepted_quantity_kg = v_requested_quantity_kg then 'Accepted' else 'Partially_Accepted' end,
        accepted_quantity_kg = p_accepted_quantity_kg
    where request_id = p_request_id;

  update public.croplisting
    set remaining_quantity_kg = remaining_quantity_kg - p_accepted_quantity_kg
    where listing_id = v_listing_id;

  perform public.enqueue_push_notification(
    v_buyer_id,
    'Tinanggap ang Kahilingan',
    'Tinanggap ng magsasaka ang iyong purchase request.',
    jsonb_build_object('type', 'purchase_request_accepted', 'request_id', p_request_id, 'transaction_id', v_transaction_id)
  );

  return v_transaction_id;
end;
$$;

create or replace function public.reject_purchase_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_farmer_id uuid;
  v_buyer_id uuid;
  v_status text;
begin
  if not public.is_account_active() then
    raise exception 'account is suspended';
  end if;

  select listing_id, buyer_id, status into v_listing_id, v_buyer_id, v_status
    from public.purchaserequest
    where request_id = p_request_id
    for update;

  if v_listing_id is null then
    raise exception 'purchase request not found';
  end if;

  select farmer_id into v_farmer_id from public.croplisting where listing_id = v_listing_id;

  if auth.uid() <> v_farmer_id then
    raise exception 'not authorized';
  end if;

  if v_status <> 'Pending' then
    raise exception 'purchase request is no longer pending (status: %)', v_status;
  end if;

  update public.purchaserequest set status = 'Rejected' where request_id = p_request_id;

  perform public.enqueue_push_notification(
    v_buyer_id,
    'Tinanggihan ang Kahilingan',
    'Tinanggihan ng magsasaka ang iyong purchase request.',
    jsonb_build_object('type', 'purchase_request_rejected', 'request_id', p_request_id)
  );
end;
$$;

create or replace function public.cancel_purchase_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid;
  v_status text;
  v_cancel_deadline timestamptz;
begin
  if not public.is_account_active() then
    raise exception 'account is suspended';
  end if;

  select buyer_id, status, cancel_deadline
    into v_buyer_id, v_status, v_cancel_deadline
    from public.purchaserequest
    where request_id = p_request_id
    for update;

  if v_buyer_id is null then
    raise exception 'purchase request not found';
  end if;

  if auth.uid() <> v_buyer_id then
    raise exception 'not authorized';
  end if;

  if v_status <> 'Pending' then
    raise exception 'purchase request is no longer pending (status: %)', v_status;
  end if;

  if now() >= v_cancel_deadline then
    raise exception 'cancellation window has expired';
  end if;

  update public.purchaserequest set status = 'Cancelled' where request_id = p_request_id;
end;
$$;

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

create or replace function public.buyer_confirm_payment_sent(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payer_id uuid;
begin
  if not public.is_account_active() then
    raise exception 'account is suspended';
  end if;

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
    set farmer_confirmed_at = now(), status = 'Confirmed'
    where payment_id = p_payment_id;

  update public.transactionmatch
    set status = 'Payment_Confirmed'
    where transaction_id = v_transaction_id and status = 'Pending_Payment';
end;
$$;

create or replace function public.archive_own_crop_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer_id uuid;
  v_status text;
begin
  if not public.is_account_active() then
    raise exception 'account is suspended';
  end if;

  select farmer_id, status into v_farmer_id, v_status
    from public.croplisting
    where listing_id = p_listing_id
    for update;

  if v_farmer_id is null then
    raise exception 'listing not found';
  end if;
  if auth.uid() is distinct from v_farmer_id then
    raise exception 'not authorized';
  end if;
  if v_status = 'Archived' then
    raise exception 'listing is already archived';
  end if;
  if public.listing_has_active_deal(p_listing_id) then
    raise exception 'cannot archive listing while it has an active deal';
  end if;

  update public.croplisting
    set status = 'Archived'
    where listing_id = p_listing_id;
end;
$$;

create or replace function public.delete_own_crop_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer_id uuid;
begin
  if not public.is_account_active() then
    raise exception 'account is suspended';
  end if;

  select farmer_id into v_farmer_id
    from public.croplisting
    where listing_id = p_listing_id
    for update;

  if v_farmer_id is null then
    raise exception 'listing not found';
  end if;
  if auth.uid() is distinct from v_farmer_id then
    raise exception 'not authorized';
  end if;
  if exists (
    select 1 from public.purchaserequest where listing_id = p_listing_id
  ) then
    raise exception 'cannot delete listing that has ever had a purchase request; archive instead';
  end if;

  delete from public.croplisting where listing_id = p_listing_id;
end;
$$;

create or replace function public.update_own_crop_listing(
  p_listing_id uuid,
  p_listing_name text default null,
  p_declared_variety text default null,
  p_declared_variety_custom text default null,
  p_variety_code text default null,
  p_specific_variety_name text default null,
  p_specific_variety_name_custom text default null,
  p_declared_moisture text default null,
  p_declared_purity_grade text default null,
  p_gross_weight_kg numeric default null,
  p_tare_weight_kg numeric default null,
  p_remaining_quantity_kg numeric default null,
  p_minimum_request_kg numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.croplisting%rowtype;
  v_active boolean;
  v_listing_name text;
  v_declared_variety text;
  v_declared_variety_custom text;
  v_variety_code text;
  v_specific_variety_name text;
  v_specific_variety_name_custom text;
  v_declared_moisture text;
  v_declared_purity_grade text;
  v_gross_weight_kg numeric;
  v_tare_weight_kg numeric;
  v_remaining_quantity_kg numeric;
  v_minimum_request_kg numeric;
  v_price numeric;
  v_recompute_price boolean := false;
  v_net numeric;
begin
  if not public.is_account_active() then
    raise exception 'account is suspended';
  end if;

  select * into v_row
    from public.croplisting
    where listing_id = p_listing_id
    for update;

  if not found then
    raise exception 'listing not found';
  end if;
  if auth.uid() is distinct from v_row.farmer_id then
    raise exception 'not authorized';
  end if;
  if v_row.status = 'Archived' then
    raise exception 'archived listings cannot be edited';
  end if;

  v_active := public.listing_has_active_deal(p_listing_id);

  if v_active then
    if p_declared_variety is not null
       or p_declared_variety_custom is not null
       or p_variety_code is not null
       or p_specific_variety_name is not null
       or p_specific_variety_name_custom is not null
       or p_declared_moisture is not null
       or p_declared_purity_grade is not null
       or p_gross_weight_kg is not null
       or p_tare_weight_kg is not null
       or p_remaining_quantity_kg is not null
       or p_minimum_request_kg is not null
    then
      raise exception 'only listing_name is editable while listing has an active deal';
    end if;

    if p_listing_name is null then
      raise exception 'nothing to update';
    end if;

    v_listing_name := btrim(p_listing_name);
    if v_listing_name = '' then
      raise exception 'listing_name must not be blank';
    end if;

    update public.croplisting
      set listing_name = v_listing_name
      where listing_id = p_listing_id;
    return;
  end if;

  v_listing_name := coalesce(nullif(btrim(p_listing_name), ''), v_row.listing_name);
  if btrim(v_listing_name) = '' then
    raise exception 'listing_name must not be blank';
  end if;

  v_declared_variety := coalesce(p_declared_variety, v_row.declared_variety);
  v_variety_code := coalesce(p_variety_code, v_row.variety_code);
  v_declared_moisture := coalesce(p_declared_moisture, v_row.declared_moisture);
  v_declared_purity_grade := coalesce(p_declared_purity_grade, v_row.declared_purity_grade);
  v_gross_weight_kg := coalesce(p_gross_weight_kg, v_row.gross_weight_kg);
  v_tare_weight_kg := coalesce(p_tare_weight_kg, v_row.tare_weight_kg);
  v_remaining_quantity_kg := coalesce(p_remaining_quantity_kg, v_row.remaining_quantity_kg);
  v_minimum_request_kg := coalesce(p_minimum_request_kg, v_row.minimum_request_kg);

  if v_declared_variety = 'Others' then
    v_declared_variety_custom := coalesce(p_declared_variety_custom, v_row.declared_variety_custom);
  else
    v_declared_variety_custom := null;
  end if;

  if p_specific_variety_name is null and p_specific_variety_name_custom is null then
    v_specific_variety_name := v_row.specific_variety_name;
    v_specific_variety_name_custom := v_row.specific_variety_name_custom;
  else
    v_specific_variety_name := nullif(p_specific_variety_name, '');
    if v_specific_variety_name = 'Iba pa' then
      v_specific_variety_name_custom := coalesce(p_specific_variety_name_custom, v_row.specific_variety_name_custom);
    else
      v_specific_variety_name_custom := null;
    end if;
  end if;

  v_net := v_gross_weight_kg - v_tare_weight_kg;
  if not (v_net > 0) then
    raise exception 'gross_weight_kg must be greater than tare_weight_kg';
  end if;
  if v_remaining_quantity_kg < 0 then
    raise exception 'remaining_quantity_kg must be >= 0';
  end if;
  if v_remaining_quantity_kg > v_net then
    raise exception 'remaining_quantity_kg (%) cannot exceed net weight (%)',
      v_remaining_quantity_kg, v_net;
  end if;
  if v_minimum_request_kg <= 0 then
    raise exception 'minimum_request_kg must be greater than zero';
  end if;

  v_recompute_price :=
    (v_declared_moisture is distinct from v_row.declared_moisture)
    or (v_variety_code is distinct from v_row.variety_code)
    or (v_declared_purity_grade is distinct from v_row.declared_purity_grade);

  if v_recompute_price then
    v_price := public.croplisting_compute_locked_price(
      v_declared_moisture,
      v_variety_code,
      v_declared_purity_grade
    );
  else
    v_price := v_row.computed_price_per_kg;
  end if;

  update public.croplisting
    set listing_name = v_listing_name,
        declared_variety = v_declared_variety,
        declared_variety_custom = v_declared_variety_custom,
        variety_code = v_variety_code,
        specific_variety_name = v_specific_variety_name,
        specific_variety_name_custom = v_specific_variety_name_custom,
        declared_moisture = v_declared_moisture,
        declared_purity_grade = v_declared_purity_grade,
        gross_weight_kg = v_gross_weight_kg,
        tare_weight_kg = v_tare_weight_kg,
        remaining_quantity_kg = v_remaining_quantity_kg,
        minimum_request_kg = v_minimum_request_kg,
        computed_price_per_kg = v_price
    where listing_id = p_listing_id;
end;
$$;

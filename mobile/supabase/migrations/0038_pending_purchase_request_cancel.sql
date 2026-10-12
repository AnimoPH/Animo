-- A buyer may cancel a Pending purchase request until the farmer accepts.
-- cancel_deadline (submitted_at + 30 seconds) stays. It is the end of the
-- free period, not the last moment a cancel is allowed. A cancel is late
-- when cancelled_at > cancel_deadline. Only late cancels count toward
-- purchase_request_cancel_rate_pct. The denominator stays every purchase
-- request for that buyer.

alter table public.purchaserequest
  add column cancelled_at timestamptz;

comment on column public.purchaserequest.cancel_deadline is
  'End of the free cancel period (submitted_at + 30 seconds). Not the last moment a buyer may cancel.';

comment on column public.purchaserequest.cancelled_at is
  'When the buyer cancelled. Null unless status is Cancelled. Late when cancelled_at > cancel_deadline.';

-- Existing Cancelled rows were cancelled inside the old 30-second window,
-- so they stay free. cancelled_at = cancel_deadline is not greater than
-- cancel_deadline, and the rate filter ignores them.
update public.purchaserequest
  set cancelled_at = cancel_deadline
  where status = 'Cancelled'
    and cancelled_at is null;

-- ---------------------------------------------------------------------------
-- cancel_purchase_request: one conditional update. Accept locks the same row
-- with SELECT ... FOR UPDATE and refuses a non-Pending status before it
-- inserts transactionmatch (0032), so the two calls cannot both succeed.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_purchase_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_buyer_id uuid;
  v_farmer_id uuid;
begin
  if not public.is_account_active() then
    raise exception 'account is suspended';
  end if;

  update public.purchaserequest
    set status = 'Cancelled',
        cancelled_at = now()
    where request_id = p_request_id
      and buyer_id = auth.uid()
      and status = 'Pending'
    returning listing_id, buyer_id
    into v_listing_id, v_buyer_id;

  if v_listing_id is null then
    raise exception 'purchase request could not be cancelled';
  end if;

  select farmer_id into v_farmer_id
    from public.croplisting
    where listing_id = v_listing_id;

  if v_farmer_id is not null then
    perform public.enqueue_push_notification(
      v_farmer_id,
      'Kinansela ang Kahilingan',
      'Kinansela ng mamimili ang purchase request.',
      jsonb_build_object('type', 'purchase_request_cancelled', 'request_id', p_request_id)
    );
  end if;

  perform public.refresh_trust_profile(v_buyer_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Late cancels only. Denominator is still every purchase request.
-- ---------------------------------------------------------------------------
create or replace function public.refresh_trust_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_completed_transactions integer;
  v_average_rating numeric;
  v_rating_count integer;
  v_completion_rate_pct numeric;
  v_active_listings_count integer;
  v_total_sold_kg numeric;
  v_payment_confirmation_rate_pct numeric;
  v_purchase_request_cancel_rate_pct numeric;
  v_total_bought_kg numeric;
  v_total_transactions integer;
  v_total_requests integer;
  v_cancelled_requests integer;
  v_payment_confirmed_or_later integer;
begin
  select role into v_role from public."user" where user_id = p_user_id;
  if v_role is null then
    raise exception 'user % not found', p_user_id;
  end if;
  if v_role not in ('Farmer', 'Buyer') then
    return;
  end if;

  select count(*) filter (where score is not null), coalesce(avg(score), 0)
    into v_rating_count, v_average_rating
    from public.rating
    where rated_id = p_user_id;

  if v_role = 'Farmer' then
    select count(*) filter (where status = 'Completed'), count(*),
           coalesce(sum(quantity_kg) filter (where status = 'Completed'), 0)
      into v_completed_transactions, v_total_transactions, v_total_sold_kg
      from public.transactionmatch
      where farmer_id = p_user_id;

    v_completion_rate_pct := case when v_total_transactions > 0
      then round(v_completed_transactions * 100.0 / v_total_transactions, 1)
      else 0 end;

    select count(*) into v_active_listings_count
      from public.croplisting
      where farmer_id = p_user_id and status = 'Available';

    v_payment_confirmation_rate_pct := null;
    v_purchase_request_cancel_rate_pct := null;
    v_total_bought_kg := null;
  else
    select count(*) filter (where status = 'Completed'), count(*),
           count(*) filter (where status in ('Payment_Confirmed', 'Delivered', 'Completed')),
           coalesce(sum(quantity_kg) filter (where status = 'Completed'), 0)
      into v_completed_transactions, v_total_transactions, v_payment_confirmed_or_later, v_total_bought_kg
      from public.transactionmatch
      where buyer_id = p_user_id;

    v_payment_confirmation_rate_pct := case when v_total_transactions > 0
      then round(v_payment_confirmed_or_later * 100.0 / v_total_transactions, 1)
      else 0 end;

    select count(*) filter (
             where status = 'Cancelled'
               and cancelled_at > cancel_deadline
           ),
           count(*)
      into v_cancelled_requests, v_total_requests
      from public.purchaserequest
      where buyer_id = p_user_id;

    v_purchase_request_cancel_rate_pct := case when v_total_requests > 0
      then round(v_cancelled_requests * 100.0 / v_total_requests, 1)
      else 0 end;

    v_completion_rate_pct := null;
    v_active_listings_count := null;
    v_total_sold_kg := null;
  end if;

  insert into public.user_trust_profile (
    user_id, role, completed_transactions, average_rating, rating_count,
    completion_rate_pct, active_listings_count, total_sold_kg,
    payment_confirmation_rate_pct, purchase_request_cancel_rate_pct, total_bought_kg,
    last_updated
  ) values (
    p_user_id, v_role, v_completed_transactions, v_average_rating, v_rating_count,
    v_completion_rate_pct, v_active_listings_count, v_total_sold_kg,
    v_payment_confirmation_rate_pct, v_purchase_request_cancel_rate_pct, v_total_bought_kg,
    now()
  )
  on conflict (user_id) do update set
    role = excluded.role,
    completed_transactions = excluded.completed_transactions,
    average_rating = excluded.average_rating,
    rating_count = excluded.rating_count,
    completion_rate_pct = excluded.completion_rate_pct,
    active_listings_count = excluded.active_listings_count,
    total_sold_kg = excluded.total_sold_kg,
    payment_confirmation_rate_pct = excluded.payment_confirmation_rate_pct,
    purchase_request_cancel_rate_pct = excluded.purchase_request_cancel_rate_pct,
    total_bought_kg = excluded.total_bought_kg,
    last_updated = excluded.last_updated;
end;
$$;

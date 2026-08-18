-- Security fix + missing workflow: purchaserequest's buyer policy was a
-- blanket `for all` (auth.uid() = buyer_id) with no `with check` at all —
-- a buyer could rewrite their own request's status/accepted_quantity_kg to
-- anything, any time, including well past cancel_deadline, and could delete
-- the row outright. Meanwhile there was no path — RPC or otherwise — for a
-- farmer to actually accept/reject a request: transactionmatch has never
-- had an INSERT policy, so nothing could create one except service_role.
-- This closes the buyer gap and adds the missing accept/reject/cancel
-- workflow as SECURITY DEFINER RPCs, same pattern as the payment RPCs
-- in 0004.

-- ---------------------------------------------------------------------------
-- purchaserequest: buyers keep direct-client INSERT (submitting a request
-- stays a plain client insert) and SELECT of their own rows; every status
-- transition after that (Accepted/Partially_Accepted/Rejected/Cancelled)
-- goes through the RPCs below, which run SECURITY DEFINER and so bypass RLS
-- for their own internal UPDATEs. Farmers lose their direct UPDATE path too
-- — accept/reject only, never a raw column write.
-- ---------------------------------------------------------------------------

drop policy if exists "Buyers manage own purchase requests" on public.purchaserequest;

create policy "Buyers can view own purchase requests"
  on public.purchaserequest for select
  using (auth.uid() = buyer_id);

create policy "Buyers can submit purchase requests"
  on public.purchaserequest for insert
  with check (
    auth.uid() = buyer_id
    and status = 'Pending'
    and accepted_quantity_kg is null
  );

drop policy if exists "Farmers update requests on their listings" on public.purchaserequest;

-- "decide" no longer applies now that farmers only ever act through the
-- accept/reject RPCs below — renamed to match.
drop policy if exists "Farmers view and decide requests on their listings" on public.purchaserequest;
create policy "Farmers view requests on their listings"
  on public.purchaserequest for select
  using (exists (select 1 from public.croplisting cl where cl.listing_id = purchaserequest.listing_id and cl.farmer_id = auth.uid()));

-- RLS already denies these with no policy present; revoked explicitly too
-- (defense in depth, same reasoning as the UPDATE revokes in 0004) so the
-- RPC-only contract doesn't depend on a future policy staying absent.
revoke update, delete on public.purchaserequest from authenticated;

-- ---------------------------------------------------------------------------
-- Insert-time validation: nothing today stops a buyer requesting more than
-- a listing has left, or requesting against a listing that isn't even open
-- (Draft/Sold_Out/Cancelled). One trigger, same convention as
-- croplisting_lock_price / enforce_user_role in 0001. Not SECURITY DEFINER —
-- the inserting buyer already has SELECT on non-Draft listings via "Anyone
-- can view non-draft listings", which is all this needs.
-- ---------------------------------------------------------------------------

create function public.purchaserequest_validate_availability()
returns trigger
language plpgsql
as $$
declare
  v_status text;
  v_remaining numeric;
begin
  select status, remaining_quantity_kg into v_status, v_remaining
    from public.croplisting
    where listing_id = new.listing_id;

  if v_status is null then
    raise exception 'listing not found';
  end if;
  if v_status <> 'Available' then
    raise exception 'listing is not open for requests (status: %)', v_status;
  end if;
  if new.requested_quantity_kg <= 0 then
    raise exception 'requested_quantity_kg must be greater than zero';
  end if;
  if new.requested_quantity_kg > v_remaining then
    raise exception 'requested_quantity_kg (%) exceeds remaining_quantity_kg (%) on this listing', new.requested_quantity_kg, v_remaining;
  end if;

  return new;
end;
$$;

create trigger purchaserequest_validate_availability_trigger
  before insert on public.purchaserequest
  for each row execute function public.purchaserequest_validate_availability();

-- ---------------------------------------------------------------------------
-- transactionmatch: no direct client INSERT policy has ever existed here —
-- the only way a row gets created is accept_purchase_request below, which
-- runs SECURITY DEFINER (owned by a role that owns this table, so it
-- bypasses RLS entirely — this schema never uses FORCE ROW LEVEL SECURITY,
-- confirmed against 0001/0004, so owner bypass applies unconditionally, and
-- a superuser-owned function bypasses it even if FORCE were ever added).
-- Revoked explicitly anyway, same defense-in-depth reasoning as 0004's
-- UPDATE revoke on this table.
-- ---------------------------------------------------------------------------

revoke insert on public.transactionmatch from authenticated;

-- RPCs — SECURITY DEFINER, granted to authenticated only.

-- Farmer accepts (fully or partially) a pending request on their own
-- listing, spinning off a transactionmatch. Row-locks the request then the
-- listing (in that order, consistently, to avoid deadlocking against
-- cancel_purchase_request/reject_purchase_request below) so a concurrent
-- buyer cancellation, or a second request racing the same listing's
-- remaining_quantity_kg, can't slip past these checks. The farmer is not
-- blocked from accepting during the buyer's 30-second cancel window —
-- that window only bounds the buyer's unilateral cancel right; locking
-- already makes the accept-vs-cancel race safe and deterministic (whichever
-- commits first wins, the other sees a fresh status and fails cleanly).
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

  -- Locks the listing too, so a second request racing the same listing's
  -- remaining_quantity_kg blocks here until this transaction commits, then
  -- re-reads the already-decremented value below.
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

  -- croplisting_auto_soldout (before update) and croplisting_soldout_cascade
  -- (after update), both from 0001, fire on this UPDATE exactly as they
  -- would for any other caller — regular triggers always fire regardless of
  -- who/what issued the statement, so Sold_Out / No_Quantity_Remaining
  -- cascade here automatically.
  update public.croplisting
    set remaining_quantity_kg = remaining_quantity_kg - p_accepted_quantity_kg
    where listing_id = v_listing_id;

  return v_transaction_id;
end;
$$;

revoke all on function public.accept_purchase_request(uuid, numeric) from public, anon;
grant execute on function public.accept_purchase_request(uuid, numeric) to authenticated;

-- Farmer rejects a still-pending request outright. Only 'Pending' is
-- eligible: once a request is Partially_Accepted, a transactionmatch
-- already exists for the accepted portion, so there's no "remaining
-- unaccepted amount" left to reject as a whole.
create or replace function public.reject_purchase_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_farmer_id uuid;
  v_status text;
begin
  select listing_id, status into v_listing_id, v_status
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
end;
$$;

revoke all on function public.reject_purchase_request(uuid) from public, anon;
grant execute on function public.reject_purchase_request(uuid) to authenticated;

-- Buyer cancels their own still-pending request, only inside the 30-second
-- window set by purchaserequest_set_cancel_deadline_trigger (0001).
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

revoke all on function public.cancel_purchase_request(uuid) from public, anon;
grant execute on function public.cancel_purchase_request(uuid) to authenticated;

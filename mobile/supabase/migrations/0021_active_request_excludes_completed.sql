-- Bug: purchaserequest_one_active_per_buyer_listing (0010) treated
-- Accepted / Partially_Accepted as still "active", so a buyer who already
-- finished a deal on a listing could not buy leftover stock — Detalye ng
-- Listing kept greying out Bumili with "May aktibo ka nang request".
-- Accepted is a historical match record, not an open request.
--
-- Narrow the unique index to Pending only (at most one unanswered request
-- per buyer per listing). An in-flight match (payment / delivery not yet
-- settled) is still blocked in purchaserequest_validate_availability so
-- the same buyer cannot open a second deal on that listing until the
-- current one Completes, Cancels, or Fails.

drop index if exists public.purchaserequest_one_active_per_buyer_listing;

create unique index purchaserequest_one_active_per_buyer_listing
  on public.purchaserequest (listing_id, buyer_id)
  where status = 'Pending';

create or replace function public.purchaserequest_validate_availability()
returns trigger
language plpgsql
as $$
declare
  v_status text;
  v_remaining numeric;
  v_buyer_id uuid;
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

  v_buyer_id := coalesce(new.buyer_id, auth.uid());
  if exists (
    select 1
      from public.transactionmatch
     where listing_id = new.listing_id
       and buyer_id = v_buyer_id
       and status in ('Pending_Payment', 'Payment_Confirmed', 'Delivered')
  ) then
    raise exception 'buyer already has an in-flight transaction on this listing';
  end if;

  return new;
end;
$$;

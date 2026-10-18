-- The farmer gets a push when a buyer sends a purchase request on their listing.
-- Until now only the buyer heard back (accepted, rejected) and the farmer found
-- new requests by opening the Transaksyon tab.
create function public.notify_purchase_request_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer_id uuid;
begin
  select farmer_id into v_farmer_id from public.croplisting where listing_id = new.listing_id;

  if v_farmer_id is not null then
    perform public.enqueue_push_notification(
      v_farmer_id,
      'Bagong Kahilingan',
      'May bagong purchase request sa iyong listing.',
      jsonb_build_object('type', 'purchase_request_received', 'request_id', new.request_id, 'listing_id', new.listing_id)
    );
  end if;

  return new;
end;
$$;

create trigger purchaserequest_notify_received
  after insert on public.purchaserequest
  for each row execute function public.notify_purchase_request_received();

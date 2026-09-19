-- transaction_price_history completion hook — Sec. 21.4/AG.4's last remaining
-- "confirmed missing" backend item. 0016 created the table empty and said
-- "rows will be inserted manually or by a future trigger when status
-- reaches 'Completed'" — this is that trigger, same shape as 0030's
-- notify_transaction_completed (AFTER UPDATE on transactionmatch, fires once
-- per completion regardless of which path got it there: the delivery-then-
-- payment-confirmed path via transactionmatch_check_completed, or the
-- payment-confirmed-after-delivered path via payment_check_completed).
--
-- Moisture is denormalized off the listing at time of completion, per 0016's
-- own comment ("a later listing/farm edit cannot rewrite history") —
-- croplisting.declared_moisture is the only source, transactionmatch has no
-- moisture of its own. Municipality is left to its 'Antipolo' column default
-- (v1 scope, per 0016).

create function public.write_transaction_price_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_moisture text;
begin
  if new.status = 'Completed' and old.status is distinct from 'Completed' then
    select declared_moisture into v_moisture
      from public.croplisting
      where listing_id = new.listing_id;

    insert into public.transaction_price_history (
      transaction_id, price_per_kg, moisture, quantity_kg, completed_at
    ) values (
      new.transaction_id, new.agreed_price_per_kg, v_moisture, new.quantity_kg, new.date_completed
    )
    -- Defense in depth, not an expected case: transaction_id is unique and
    -- a transactionmatch only ever transitions into 'Completed' once
    -- (transactionmatch_status_check has no path back out of it), so this
    -- guards a hypothetical re-fire rather than a known one.
    on conflict (transaction_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger transactionmatch_write_price_history
  after update on public.transactionmatch
  for each row execute function public.write_transaction_price_history();

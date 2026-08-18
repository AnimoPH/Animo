-- Rating write path: 0001 already has public.rating + an INSERT policy
-- ("A transaction party can rate the other party"). This migration closes
-- two gaps that policy does not:
--
-- 1. Nothing stopped the same rater inserting a second row for the same
--    transaction (double-tap / revisit the review screen). Partial unique
--    index, same race-safe pattern as 0010_purchase_request_single_active.
-- 2. INSERT did not require transactionmatch.status = 'Completed', so a
--    party could rate before payment/delivery finished. Trigger, not a
--    SECURITY DEFINER RPC — RLS already pins rater_id to auth.uid() and
--    the counterpart pair; this only adds the Completed gate.
--
-- Detail-star rows on the review screens (quality, communication, …) stay
-- client UX. The table has a single `score` (1–5) plus optional comment.

create unique index rating_one_per_rater_per_transaction
  on public.rating (transaction_id, rater_id);

create function public.rating_require_completed_transaction()
returns trigger
language plpgsql
as $$
declare
  v_status text;
  v_buyer_id uuid;
  v_farmer_id uuid;
begin
  select status, buyer_id, farmer_id
    into v_status, v_buyer_id, v_farmer_id
    from public.transactionmatch
    where transaction_id = new.transaction_id;

  if v_status is null then
    raise exception 'transaction not found';
  end if;

  if v_status <> 'Completed' then
    raise exception 'can only rate a completed transaction (status: %)', v_status;
  end if;

  if not (
    (new.rater_id = v_buyer_id and new.rated_id = v_farmer_id)
    or (new.rater_id = v_farmer_id and new.rated_id = v_buyer_id)
  ) then
    raise exception 'rater and rated must be the two parties on this transaction';
  end if;

  if new.rater_id = new.rated_id then
    raise exception 'cannot rate yourself';
  end if;

  return new;
end;
$$;

create trigger rating_require_completed_transaction_trigger
  before insert on public.rating
  for each row execute function public.rating_require_completed_transaction();

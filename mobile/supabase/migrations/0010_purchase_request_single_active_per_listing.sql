-- Bug: nothing stopped the same buyer from submitting more than one
-- purchase request against the same listing — spamming "Kumpirmahin ang
-- Pagbili" (or just re-visiting the bid screen) created a new Pending row
-- every time, all against the same croplisting. A buyer should have at most
-- one active request per listing at a time.
--
-- Enforced as a partial unique index rather than a check-then-insert
-- trigger so it's race-safe: two concurrent inserts from the same buyer for
-- the same listing can't both slip through between the check and the write
-- the way a plpgsql "select ... then raise" guard could.

-- Existing data already has duplicates from the bug this migration fixes, so
-- clean those up first or the index creation fails. Per (listing_id,
-- buyer_id): keep an Accepted/Partially_Accepted row over a Pending one (it
-- already has a real transactionmatch, don't disturb it), otherwise keep the
-- most recently submitted Pending row; cancel the rest.
with ranked as (
  select request_id,
    row_number() over (
      partition by listing_id, buyer_id
      order by
        case status when 'Accepted' then 0 when 'Partially_Accepted' then 0 else 1 end,
        submitted_at desc
    ) as rn
  from public.purchaserequest
  where status in ('Pending', 'Accepted', 'Partially_Accepted')
)
update public.purchaserequest
  set status = 'Cancelled'
  where request_id in (select request_id from ranked where rn > 1);

create unique index purchaserequest_one_active_per_buyer_listing
  on public.purchaserequest (listing_id, buyer_id)
  where status in ('Pending', 'Accepted', 'Partially_Accepted');

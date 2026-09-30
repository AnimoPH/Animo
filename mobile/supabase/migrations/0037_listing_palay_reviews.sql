-- Public palay-review read for a listing. `rating` is already visible to any
-- signed-in user, but `transactionmatch` and buyer names are not, so a buyer
-- opening someone else's listing cannot join them from the client. This
-- function returns only the score, comment, kilograms, and a masked name.

create or replace function public.listing_palay_reviews(p_listing_id uuid)
returns table (
  rating_id uuid,
  score integer,
  comment text,
  quantity_kg numeric,
  masked_name text,
  reviewed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.rating_id,
    r.score,
    nullif(btrim(r.comment), '') as comment,
    tm.quantity_kg,
    case
      when u.full_name is null or length(btrim(u.full_name)) = 0 then 'B'
      when length(btrim(u.full_name)) = 1 then btrim(u.full_name)
      else left(btrim(u.full_name), 1)
        || repeat('*', greatest(length(btrim(u.full_name)) - 2, 1))
        || right(btrim(u.full_name), 1)
    end as masked_name,
    coalesce(tm.date_completed, tm.created_at) as reviewed_at
  from public.rating r
  join public.transactionmatch tm on tm.transaction_id = r.transaction_id
  join public."user" u on u.user_id = r.rater_id
  where tm.listing_id = p_listing_id
    and r.rater_id = tm.buyer_id
  order by coalesce(tm.date_completed, tm.created_at) desc;
$$;

revoke all on function public.listing_palay_reviews(uuid) from public, anon;
grant execute on function public.listing_palay_reviews(uuid) to authenticated;

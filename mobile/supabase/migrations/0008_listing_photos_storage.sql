-- §6 LISTINGPHOTO storage. The table (0001) only ever stored a `storage_uri`
-- pointer — no bucket existed for it to point at. Photo capture was deferred
-- during the initial Crop Listings backend pass (no image pipeline existed
-- anywhere in the app) and is being wired up now.
--
-- The bucket is PRIVATE, not public: listingphoto's own RLS already
-- distinguishes "owner can view any status, Draft included" from "anyone can
-- view only if non-draft" (0001, §6 policies). A public bucket would bypass
-- both policies entirely — Supabase serves public-bucket objects straight
-- from the CDN with no RLS evaluation at all — so display goes through
-- short-lived signed URLs instead, which do evaluate the policies below.
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', false);

-- Mirrors listingphoto's own two policies (0001, §6) exactly, just at the
-- storage layer. Photos are stored at "<listing_id>/<photo_type>.jpg", so
-- (storage.foldername(name))[1] is the listing_id segment. It's `text` while
-- croplisting.listing_id is `uuid` — the explicit cast below is required, or
-- the first real upload throws "operator does not exist: uuid = text".
create policy "Farmers manage own listing photos in storage"
  on storage.objects for all
  using (
    bucket_id = 'listing-photos'
    and exists (
      select 1 from public.croplisting cl
      where cl.listing_id = ((storage.foldername(name))[1])::uuid
        and cl.farmer_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'listing-photos'
    and exists (
      select 1 from public.croplisting cl
      where cl.listing_id = ((storage.foldername(name))[1])::uuid
        and cl.farmer_id = auth.uid()
    )
  );
-- `for all` (not just `for insert`) matters here: retaking a photo uploads
-- with `{ upsert: true }`, which performs an UPDATE at the storage layer once
-- the object already exists — an insert-only policy would 403 on the retake.

create policy "Anyone can view listing photos of non-draft listings"
  on storage.objects for select
  using (
    bucket_id = 'listing-photos'
    and exists (
      select 1 from public.croplisting cl
      where cl.listing_id = ((storage.foldername(name))[1])::uuid
        and cl.status <> 'Draft'
    )
  );

-- croplisting's own "Farmers manage own listings" policy (0001) is `for all`,
-- so a farmer can already delete their own listing row today even with no
-- delete/edit screen built yet. That only cascades the listingphoto *rows*
-- (`on delete cascade`) — the actual bytes in storage.objects are untouched
-- and would otherwise leak permanently. This schema's own habit (see
-- payment_failed_cascade, croplisting_soldout_cascade in 0001) is to close a
-- gap as soon as the underlying capability exists, not only once a screen
-- calls it.
create function public.croplisting_delete_photos_cascade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from storage.objects
    where bucket_id = 'listing-photos'
      and (storage.foldername(name))[1] = old.listing_id::text;
  return old;
end;
$$;

create trigger croplisting_delete_photos_cascade_trigger
  after delete on public.croplisting
  for each row execute function public.croplisting_delete_photos_cascade();

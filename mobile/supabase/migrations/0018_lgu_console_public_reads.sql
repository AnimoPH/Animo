-- LGU web console (pre-auth prototype): read-only farmer directory for the
-- monitoring dashboard. Exposes only farmers who have at least one non-Draft
-- listing — same privacy bar as listing_farmer_public (name + barangay, no
-- contact_number). Real LGU auth will gate writes later; anon SELECT is
-- enough for the demo console wired to VITE_SUPABASE_ANON_KEY.

create or replace view public.lgu_farmer_registry as
select
  f.user_id as farmer_id,
  u.full_name as farmer_name,
  coalesce(nullif(trim(f.barangay), ''), 'Hindi nakasaad') as barangay,
  u.date_registered,
  count(cl.listing_id) filter (where cl.status = 'Available') as active_listings,
  count(cl.listing_id) filter (where cl.status <> 'Draft') as total_listings
from public.farmer f
join public."user" u on u.user_id = f.user_id
left join public.croplisting cl on cl.farmer_id = f.user_id and cl.status <> 'Draft'
group by f.user_id, u.full_name, f.barangay, u.date_registered
having count(cl.listing_id) filter (where cl.status <> 'Draft') > 0;

grant select on public.lgu_farmer_registry to anon;
grant select on public.lgu_farmer_registry to authenticated;

-- Add listing_name (required, backfilled from date_listed) and optional
-- specific_variety_name / specific_variety_name_custom on CROPLISTING.
-- specific_variety_name is the CHECK-token from the second variety modal
-- (Inbred/Hybrid only). Custom text is allowed only when the token is
-- 'Iba pa' (one-way CHECK, same pattern as declared_variety_custom). Blank
-- custom on 'Iba pa' is rejected in the app, not here.

alter table public.croplisting add column listing_name text;

update public.croplisting
set listing_name = 'Palay Listing (' || to_char(date_listed at time zone 'Asia/Manila', 'YYYY-MM-DD') || ')'
where listing_name is null;

alter table public.croplisting
  alter column listing_name set not null;

alter table public.croplisting
  add constraint croplisting_listing_name_not_blank
  check (btrim(listing_name) <> '');

alter table public.croplisting
  add column specific_variety_name text
    check (
      specific_variety_name is null
      or specific_variety_name in (
        'Rc218', 'Rc216', 'Rc160', 'Rc222', 'Rc300', 'Rc512', 'Rc508', 'Rc480',
        'Rc204H', 'PSB Rc72H', 'Iba pa'
      )
    );

alter table public.croplisting
  add column specific_variety_name_custom text;

alter table public.croplisting
  add constraint croplisting_specific_variety_custom_only_when_iba_pa
  check (specific_variety_name_custom is null or specific_variety_name = 'Iba pa');

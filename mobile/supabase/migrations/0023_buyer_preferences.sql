-- Buyer Preferences — storage-only buyer-side counterpart to
-- CROPLISTING.declared_variety/variety_code/declared_moisture (§5). Lets a
-- buyer optionally record what they usually look for (variety, specific
-- variety, moisture, typical order size) from the onboarding Profile step
-- and again later from the Profile tab. Not part of the ANIMO Data
-- Dictionary — added ahead of any search/ranking use, which is a separate,
-- not-yet-scoped task (ranking must not read this table yet).
--
-- One row per buyer, fully optional: every preference column is nullable,
-- and a buyer with no row at all simply has no preferences saved.
--
-- preferred_variety_code deliberately stores the actual specific-variety
-- text (e.g. "NSIC Rc216"), not the '218'/'OTHER' price-premium code from
-- VARIETYPRICEPREMIUM — that binary is CROPLISTING's pricing concern, not a
-- buyer preference.

create table public.buyer_preferences (
  buyer_id uuid primary key references public."user" (user_id) on delete cascade,
  preferred_variety text
    check (preferred_variety in ('Inbred', 'Hybrid', 'Traditional_or_Heirloom', 'Mix_of_Varieties', 'Others')),
  -- Free text (e.g. "NSIC Rc216") — only meaningful when preferred_variety is Inbred/Hybrid.
  preferred_variety_code text,
  preferred_moisture text check (preferred_moisture in ('Wet', 'Dry')),
  typical_quantity_kg numeric check (typical_quantity_kg is null or typical_quantity_kg > 0),
  updated_at timestamptz not null default now(),
  constraint buyer_preferences_variety_code_only_when_inbred_or_hybrid
    check (preferred_variety_code is null or preferred_variety in ('Inbred', 'Hybrid'))
);

alter table public.buyer_preferences enable row level security;

create policy "Buyers manage own preferences"
  on public.buyer_preferences for all
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

create trigger buyer_preferences_buyer_role_check
  before insert or update on public.buyer_preferences
  for each row execute function public.enforce_user_role('buyer_id', 'Buyer');

create function public.touch_buyer_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger buyer_preferences_touch_updated_at
  before update on public.buyer_preferences
  for each row execute function public.touch_buyer_preferences_updated_at();

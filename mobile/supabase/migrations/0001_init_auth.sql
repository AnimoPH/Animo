-- Registration & authentication schema for Animo's Farmer (Magsasaka) and
-- Buyer (Mamimili) roles. Applied with `supabase db push` after `supabase link`.
--
-- All inserts into these tables happen inside the `complete-registration`
-- Edge Function under the service role (which bypasses RLS) — the client
-- never inserts directly. That's what makes the role lock and wallet
-- secrecy below actually hold, not just the RLS policies on their own.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('magsasaka', 'mamimili')),
  role_locked_at timestamptz not null default now(),
  full_name text not null,
  wallet_address text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Role is chosen once at registration and is immutable afterward ("locked
-- after verification" per the user stories) — enforced here, not just by
-- omitting a role-edit screen client-side.
create function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'role cannot be changed after registration';
  end if;
  return new;
end;
$$;

create trigger profiles_role_immutable
  before update on public.profiles
  for each row
  execute function public.prevent_role_change();

-- Farmer-only fields (charter's "vulnerability inputs").
create table public.farmer_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  age text not null,
  gender text not null check (gender in ('lalaki', 'babae')),
  municipality text not null,
  barangay text not null,
  farm_size text not null,
  experience_years text not null,
  household_size text not null,
  storm_damage boolean not null
);

alter table public.farmer_profiles enable row level security;

create policy "Farmers can view own farm profile"
  on public.farmer_profiles for select
  using (auth.uid() = profile_id);

-- Buyer-only fields — no location field per the user story (overrides the
-- charter's mention of buyer location).
create table public.buyer_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  age text not null,
  gender text not null check (gender in ('lalaki', 'babae')),
  business_name text not null
);

alter table public.buyer_profiles enable row level security;

create policy "Buyers can view own buyer profile"
  on public.buyer_profiles for select
  using (auth.uid() = profile_id);

-- Custodial Polygon wallet. RLS is enabled with *no* policies for
-- anon/authenticated — this table is unreachable from the client entirely;
-- only the Edge Function's service-role key (which bypasses RLS) can read or
-- write it. The private key never leaves this table unencrypted.
create table public.wallets (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  address text not null,
  encrypted_private_key text not null,
  chain text not null default 'polygon-amoy',
  created_at timestamptz not null default now()
);

alter table public.wallets enable row level security;

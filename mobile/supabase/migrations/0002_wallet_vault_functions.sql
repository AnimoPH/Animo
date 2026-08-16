-- Custodial wallet private-key storage via Supabase Vault (pgsodium-backed
-- encrypted secrets — `vault.secrets`/`vault.decrypted_secrets`), not a
-- column on farmer/buyer: those stay exactly §1a/§1b as defined, only
-- wallet_address. This is how the key actually gets stored today, ahead of
-- the planned move to Alchemy custody.
--
-- The secret is keyed by a deterministic name (`polygon-wallet:<user_id>`)
-- rather than a stored reference id, so there's no new column anywhere to
-- point at it — farmer/buyer's schema footprint doesn't change at all.
--
-- Both functions are SECURITY DEFINER (to reach the `vault` schema, which
-- client roles have no access to) but EXECUTE is revoked from PUBLIC and
-- granted only to service_role — the Edge Function is the only caller,
-- same as every other write path in this schema.

create or replace function public.create_wallet_secret(p_user_id uuid, p_private_key text)
returns uuid
language plpgsql
security definer
set search_path = vault, public
as $$
declare
  secret_id uuid;
begin
  secret_id := vault.create_secret(
    p_private_key,
    'polygon-wallet:' || p_user_id::text,
    'Custodial Polygon private key for user ' || p_user_id::text
  );
  return secret_id;
end;
$$;

-- `revoke ... from public` alone isn't enough: Supabase's default privileges
-- grant EXECUTE on new public-schema functions directly to anon/authenticated
-- too (separate from the PUBLIC pseudo-role) — confirmed both could call this
-- before these explicit revokes were added. Revoke each role by name.
revoke all on function public.create_wallet_secret(uuid, text) from public, anon, authenticated;
grant execute on function public.create_wallet_secret(uuid, text) to service_role;

create or replace function public.get_wallet_private_key(p_user_id uuid)
returns text
language sql
security definer
set search_path = vault, public
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'polygon-wallet:' || p_user_id::text;
$$;

revoke all on function public.get_wallet_private_key(uuid) from public, anon, authenticated;
grant execute on function public.get_wallet_private_key(uuid) to service_role;

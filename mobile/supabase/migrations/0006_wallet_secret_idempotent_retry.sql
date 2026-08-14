-- Bug fix: a failed registration attempt could leave an orphaned Vault
-- secret behind (its cleanup wasn't checked), and since secret names are
-- unique per user, every retry then failed the same way. Make this
-- idempotent: clear any stale secret for the user before creating a new one.
create or replace function public.create_wallet_secret(p_user_id uuid, p_private_key text)
returns uuid
language plpgsql
security definer
set search_path = vault, public
as $$
declare
  secret_id uuid;
begin
  delete from vault.secrets where name = 'polygon-wallet:' || p_user_id::text;

  secret_id := vault.create_secret(
    p_private_key,
    'polygon-wallet:' || p_user_id::text,
    'Custodial Polygon private key for user ' || p_user_id::text
  );
  return secret_id;
end;
$$;

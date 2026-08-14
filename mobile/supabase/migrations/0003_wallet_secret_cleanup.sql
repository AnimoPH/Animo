-- Companion to create_wallet_secret (0002): lets complete-registration clean
-- up an orphaned Vault secret if user/farmer/buyer insert fails after the
-- secret was already created (registration rolls back the row, but nothing
-- previously rolled back the secret).

create or replace function public.delete_wallet_secret(p_user_id uuid)
returns void
language sql
security definer
set search_path = vault, public
as $$
  delete from vault.secrets where name = 'polygon-wallet:' || p_user_id::text;
$$;

revoke all on function public.delete_wallet_secret(uuid) from public, anon, authenticated;
grant execute on function public.delete_wallet_secret(uuid) to service_role;

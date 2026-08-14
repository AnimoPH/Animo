-- Bug fix: a failed registration attempt can leave an orphaned Vault secret
-- behind. create_wallet_secret succeeds first, then a later step (the
-- user/farmer/buyer insert) can fail; the rollback in
-- complete-registration/index.ts calls delete_wallet_secret on that path,
-- but never checked whether the rollback itself succeeded. Since
-- vault.secrets.name is unique (secrets_name_idx), any retry after a
-- rollback that silently failed hits a duplicate-name violation on the
-- exact same deterministic name ('polygon-wallet:<user_id>') forever —
-- registration can never succeed again for that account.
--
-- Make create_wallet_secret idempotent instead of relying on the rollback
-- always working: clear any stale secret for this user first, so a retry
-- is always possible regardless of what happened on a previous attempt.
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

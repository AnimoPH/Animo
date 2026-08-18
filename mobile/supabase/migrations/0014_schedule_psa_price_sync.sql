-- Automates what the "sync now" LGU dashboard button (sync-psa-prices edge
-- function) does manually, on a monthly schedule, since PSA has historically
-- published a given month's farmgate data in the 2nd (sometimes 3rd) week of
-- the following month (e.g. May 2026 data -> released Jun 11 2026, Jun 2026
-- data -> released Jul 13 2026 - see sync-psa-prices' own comment).
--
-- The cron job calls sync-psa-prices as a system caller, using the
-- service-role key as its bearer token (see that function's isSystemCall
-- check) - the same key Supabase's own JWT verification already accepts,
-- this migration just wires pg_cron/pg_net to send it automatically.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The service-role key and the deployed function URL do NOT belong in this
-- migration file (secrets don't belong in source control - same reasoning
-- as the wallet private keys living in Vault, not a column, per
-- 0002_wallet_vault_functions.sql). After deploying this migration, an
-- operator must run ONCE via the SQL editor (not as a tracked migration):
--
--   select vault.create_secret('<the real service_role key>', 'psa_sync_service_role_key');
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/sync-psa-prices', 'psa_sync_function_url');
--
-- Until both secrets exist, the job below finds nothing and skips cleanly
-- (logs a notice) instead of failing loudly every run.
create or replace function public.trigger_psa_price_sync()
returns void
language plpgsql
security definer
set search_path = vault, public, extensions
as $$
declare
  service_key text;
  function_url text;
begin
  select decrypted_secret into service_key from vault.decrypted_secrets where name = 'psa_sync_service_role_key';
  select decrypted_secret into function_url from vault.decrypted_secrets where name = 'psa_sync_function_url';

  if service_key is null or function_url is null then
    raise notice 'psa price sync skipped: vault secrets (psa_sync_service_role_key / psa_sync_function_url) not configured yet';
    return;
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || service_key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.trigger_psa_price_sync() from public, anon, authenticated;

-- Runs on the 15th, then again on the 22nd as a simple retry in case PSA
-- hasn't published yet by the 15th - upserts are idempotent, so a spurious
-- extra run changes nothing.
select cron.schedule('psa-price-sync-mid-month', '0 6 15 * *', 'select public.trigger_psa_price_sync();');
select cron.schedule('psa-price-sync-retry', '0 6 22 * *', 'select public.trigger_psa_price_sync();');

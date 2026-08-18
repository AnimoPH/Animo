-- Lets refresh-dry-base (service_role) write marketpricefeed.dry_base_price_per_kg
-- after PSA sync and whenever nfa_intervention_window changes. Authenticated
-- RLS still cannot touch dry_base — 0001 only granted update on the leftover
-- nfa_intervention_active columns. Listings keep locking from this cached
-- dry_base via croplisting_lock_price; a failed refresh leaves the previous
-- value (0007's ₱18.83 until the first successful write).
--
-- pg_net + Vault follow 0013: secrets stay out of this file. Reuses
-- psa_sync_service_role_key. URL is refresh_dry_base_function_url if set,
-- otherwise derived from psa_sync_function_url by swapping the function name.
-- Until those exist, the NFA trigger skips with a notice (same as 0013).
--
--   select vault.create_secret('<the real service_role key>', 'psa_sync_service_role_key');
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/refresh-dry-base', 'refresh_dry_base_function_url');

grant select on public.marketpricefeed to service_role;
grant insert on public.marketpricefeed to service_role;
grant update (dry_base_price_per_kg, effective_date) on public.marketpricefeed to service_role;

create extension if not exists pg_net;

create or replace function public.trigger_refresh_dry_base()
returns trigger
language plpgsql
security definer
set search_path = vault, public, extensions
as $$
declare
  service_key text;
  function_url text;
  sync_url text;
begin
  select decrypted_secret into service_key from vault.decrypted_secrets where name = 'psa_sync_service_role_key';
  select decrypted_secret into function_url from vault.decrypted_secrets where name = 'refresh_dry_base_function_url';
  if function_url is null then
    select decrypted_secret into sync_url from vault.decrypted_secrets where name = 'psa_sync_function_url';
    if sync_url is not null then
      function_url := replace(sync_url, '/sync-psa-prices', '/refresh-dry-base');
    end if;
  end if;

  if service_key is null or function_url is null then
    raise notice 'refresh dry_base skipped: vault secrets (psa_sync_service_role_key / refresh_dry_base_function_url) not configured yet';
    return null;
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || service_key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  return null;
end;
$$;

revoke all on function public.trigger_refresh_dry_base() from public, anon, authenticated;

-- Statement-level so a bulk window edit is one refresh, not one HTTP call per row.
create trigger nfa_intervention_window_refresh_dry_base
  after insert or update or delete on public.nfa_intervention_window
  for each statement
  execute function public.trigger_refresh_dry_base();

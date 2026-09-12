-- Advisory Module — Research Notes Sec. L, Project Context Sec. 5.1/7.3.
-- ADVISORYRECOMMENDATION (§1 of 0001) already matches the locked v1 spec —
-- no change needed there. What's missing is somewhere to persist the raw
-- weather signal the rule engine reads, same reasoning as why
-- MARKETPRICEFEED exists separately from CROPLISTING: the input feed and
-- the computed-output-per-record are different lifecycles.

create table public.weather_forecast_feed (
  feed_id uuid primary key default gen_random_uuid(),
  precipitation_mm_h numeric not null,
  -- >= 7.5mm/h sustained across the 24-48h forecast window (PAGASA Yellow
  -- warning threshold) — computed by refresh-advisory, not by a trigger,
  -- since it depends on the raw OpenWeatherMap response shape.
  rain_expected boolean not null,
  -- True when a fetch failed and this row just repeats the last successful
  -- one's values (FR-ADV-01's fallback requirement) rather than the
  -- advisory going silent.
  is_stale boolean not null default false,
  fetched_at timestamptz not null default now()
);

alter table public.weather_forecast_feed enable row level security;

-- Same "anyone can view" posture as marketpricefeed/credibilityscore/rating —
-- a farmer needs to see today's forecast before it's tied to their own crop.
create policy "Anyone can view the weather forecast feed"
  on public.weather_forecast_feed for select
  using (true);

-- Only refresh-advisory (service role) writes this — service_role gets no
-- automatic write grant on a new table (see marketpricefeed in 0015,
-- transaction_price_history in 0016), so it's explicit here too.
revoke insert, update, delete on public.weather_forecast_feed from authenticated;
grant select, insert on public.weather_forecast_feed to service_role;

-- advisoryrecommendation (0001) has the same gap — its "system-generated"
-- comment assumed service_role could already write it, but 0001 never
-- granted that either.
grant insert on public.advisoryrecommendation to service_role;

-- refresh-advisory reads cropcycle directly (WHERE status = 'Growing');
-- same missing grant.
grant select on public.cropcycle to service_role;

create index weather_forecast_feed_fetched_at_idx on public.weather_forecast_feed (fetched_at desc);

-- Seed one row so the app has something to read before the first cron tick
-- runs — same reasoning as 0007's marketpricefeed seed. No rain assumed
-- until a real fetch says otherwise.
insert into public.weather_forecast_feed (precipitation_mm_h, rain_expected)
values (0, false);

-- ---------------------------------------------------------------------------
-- Scheduling — same pattern as 0014_schedule_psa_price_sync.sql: pg_cron +
-- pg_net calling the edge function as a system caller, service-role key and
-- function URL read from vault (not stored in this migration). After
-- deploying, an operator runs once via the SQL editor:
--
--   select vault.create_secret('<the real service_role key>', 'advisory_refresh_service_role_key');
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/refresh-advisory', 'advisory_refresh_function_url');
--
-- Until both secrets exist, the job below skips cleanly (logs a notice)
-- instead of failing loudly every run.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_advisory_refresh()
returns void
language plpgsql
security definer
set search_path = vault, public, extensions
as $$
declare
  service_key text;
  function_url text;
begin
  select decrypted_secret into service_key from vault.decrypted_secrets where name = 'advisory_refresh_service_role_key';
  select decrypted_secret into function_url from vault.decrypted_secrets where name = 'advisory_refresh_function_url';

  if service_key is null or function_url is null then
    raise notice 'advisory refresh skipped: vault secrets (advisory_refresh_service_role_key / advisory_refresh_function_url) not configured yet';
    return;
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || service_key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.trigger_advisory_refresh() from public, anon, authenticated;

select cron.schedule('advisory-refresh-every-6h', '0 */6 * * *', 'select public.trigger_advisory_refresh();');

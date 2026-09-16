-- Advisory Module follow-up — Research Notes Sec. L, Project Context Sec. 5.1/7.3.
--
-- refresh-advisory (0025) batches two different concerns into one 6-hourly
-- job: (1) fetch a fresh rain forecast (expensive, rate-limited, shared by
-- every farmer) and (2) recompute an advisory for every Growing cropcycle
-- from that forecast. Bundling them means a farmer who logs a planting right
-- after a tick sees nothing until the next one — up to ~6h with no
-- indication anything is wrong (the mobile client's own AdvisoryPendingCard
-- now at least says so honestly, but the wait itself was never necessary).
--
-- A first advisory for a newly-logged cropcycle doesn't need a fresh fetch —
-- it only needs whatever forecast is already sitting in
-- weather_forecast_feed. That's a free read + one insert, so it can run
-- immediately on insert without touching the rate-limited half of the job.
-- The 6-hourly cron is unchanged and still the only thing that calls
-- OpenWeatherMap or recomputes advisories for existing cropcycles.

create or replace function public.rice_maturity_days(category text)
returns int
language sql
immutable
as $$
  select case category
    when 'Hybrid' then 110
    when 'Inbred' then 120
    when 'Organic' then 120
    when 'Specialty' then 122
    else null
  end;
$$;

create or replace function public.generate_initial_advisory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  maturity_days int;
  ripeness numeric;
  feed record;
  already_advised boolean;
begin
  if new.status <> 'Growing' or new.planting_date is null or new.rice_type_category is null then
    return new;
  end if;

  select exists(
    select 1 from public.advisoryrecommendation where cropcycle_id = new.cropcycle_id
  ) into already_advised;
  if already_advised then
    return new;
  end if;

  maturity_days := public.rice_maturity_days(new.rice_type_category);
  if maturity_days is null then
    return new;
  end if;

  select rain_expected into feed
  from public.weather_forecast_feed
  order by fetched_at desc
  limit 1;

  -- No feed row at all (should only happen pre-seed) — the next 6h tick
  -- will pick this cropcycle up like any other, nothing to do here.
  if not found then
    return new;
  end if;

  ripeness := extract(epoch from (now() - new.planting_date::timestamptz)) / 86400.0 / maturity_days;

  insert into public.advisoryrecommendation (cropcycle_id, type, trigger_source, recommended_action)
  values (
    new.cropcycle_id,
    'RainAdvisory',
    'WeatherFeed',
    case
      when not feed.rain_expected then 'No_Action_Needed'
      when ripeness >= 0.85 then 'Advance_Cut'
      else 'Delayed_Harvest'
    end
  );

  return new;
end;
$$;

revoke all on function public.generate_initial_advisory() from public, anon, authenticated;

create trigger cropcycle_generate_initial_advisory
  after insert or update of status, planting_date, rice_type_category on public.cropcycle
  for each row
  execute function public.generate_initial_advisory();

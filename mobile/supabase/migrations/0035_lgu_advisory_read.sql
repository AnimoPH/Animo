-- LGU console advisory read. advisoryrecommendation stays farmer-scoped
-- (0001 "Farmers view own advisories"). This function is the only LGU path:
-- it checks is_lgu_official() and returns aggregated rows, not farm location
-- or land area. Weather is the single Antipolo forecast in
-- weather_forecast_feed, repeated on every group so the console can say the
-- rain figure is shared. Counts use the latest advisory on each Growing
-- cropcycle so the 6-hour refresh does not inflate them.

create or replace function public.lgu_advisory_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_precipitation numeric;
  v_rain_expected boolean;
  v_is_stale boolean;
  v_fetched_at timestamptz;
  v_groups jsonb;
begin
  if not public.is_lgu_official() then
    raise exception 'LGU official required';
  end if;

  select precipitation_mm_h, rain_expected, is_stale, fetched_at
    into v_precipitation, v_rain_expected, v_is_stale, v_fetched_at
    from public.weather_forecast_feed
    order by fetched_at desc
    limit 1;

  select coalesce(jsonb_agg(to_jsonb(g) order by g.barangay, g.recommended_action), '[]'::jsonb)
    into v_groups
    from (
      select
        la.barangay,
        la.recommended_action,
        count(distinct la.farmer_id) as farmer_count,
        max(la.date_issued) as latest_issued
      from (
        select distinct on (cc.cropcycle_id)
          f.farmer_id,
          coalesce(nullif(trim(fr.barangay), ''), 'Hindi nakasaad') as barangay,
          ar.recommended_action,
          ar.date_issued
        from public.advisoryrecommendation ar
        join public.cropcycle cc on cc.cropcycle_id = ar.cropcycle_id
        join public.farm f on f.farm_id = cc.farm_id
        join public.farmer fr on fr.user_id = f.farmer_id
        where cc.status = 'Growing'
          and ar.recommended_action in ('Advance_Cut', 'Delayed_Harvest', 'No_Action_Needed')
        order by cc.cropcycle_id, ar.date_issued desc
      ) la
      group by la.barangay, la.recommended_action
    ) g;

  return jsonb_build_object(
    'precipitation_mm_h', v_precipitation,
    'rain_expected', v_rain_expected,
    'is_stale', coalesce(v_is_stale, false),
    'forecast_fetched_at', v_fetched_at,
    'groups', v_groups
  );
end;
$$;

revoke all on function public.lgu_advisory_overview() from public, anon;
grant execute on function public.lgu_advisory_overview() to authenticated;

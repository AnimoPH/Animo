-- requires: 0044
-- Advisory push text (migration 0044): the farmer gets the Tagalog label, not the
-- stored state, and a No_Action_Needed advisory sends no push at all.
set session_replication_role = replica;
insert into public.farm(farm_id, farmer_id) values
  ('c0500000-4444-0000-0000-000000000001', 'c0500000-0000-0000-0000-000000000001');
insert into public.cropcycle(cropcycle_id, farm_id, planting_date, status, rice_type_category) values
  ('c0500000-5555-0000-0000-000000000001', 'c0500000-4444-0000-0000-000000000001', current_date - 100, 'Growing', 'Inbred');
set session_replication_role = origin;
delete from public.push_notification_queue;

do $$
declare n int; b text; t text;
begin
  insert into public.advisoryrecommendation(cropcycle_id, type, trigger_source, recommended_action, date_issued)
    values ('c0500000-5555-0000-0000-000000000001', 'RainAdvisory', 'WeatherFeed', 'Advance_Cut', current_date);
  select count(*), min(body), min(title) into n, b, t from public.push_notification_queue
    where user_id = 'c0500000-0000-0000-0000-000000000001';
  assert n = 1, 'FAIL Advance_Cut queued ' || n || ' notices, expected 1';
  assert b = 'Maagang Anihin', 'FAIL Advance_Cut text was ' || b;
  assert t = 'Babala sa Panahon', 'FAIL title was ' || t;
  raise notice 'PASS: Advance_Cut sends "Maagang Anihin" under "Babala sa Panahon"';
end $$;

delete from public.push_notification_queue;
delete from public.advisoryrecommendation;
do $$
declare b text;
begin
  insert into public.advisoryrecommendation(cropcycle_id, type, trigger_source, recommended_action, date_issued)
    values ('c0500000-5555-0000-0000-000000000001', 'RainAdvisory', 'WeatherFeed', 'Delayed_Harvest', current_date);
  select body into b from public.push_notification_queue where user_id = 'c0500000-0000-0000-0000-000000000001';
  assert b = 'Antalahin ang Anihan', 'FAIL Delayed_Harvest text was ' || coalesce(b, 'none');
  raise notice 'PASS: Delayed_Harvest sends "Antalahin ang Anihan"';
end $$;

delete from public.push_notification_queue;
delete from public.advisoryrecommendation;
do $$
declare n int;
begin
  insert into public.advisoryrecommendation(cropcycle_id, type, trigger_source, recommended_action, date_issued)
    values ('c0500000-5555-0000-0000-000000000001', 'RainAdvisory', 'WeatherFeed', 'No_Action_Needed', current_date);
  select count(*) into n from public.push_notification_queue where user_id = 'c0500000-0000-0000-0000-000000000001';
  assert n = 0, 'FAIL No_Action_Needed queued ' || n || ' notices, expected 0';
  assert not exists (select 1 from public.push_notification_queue where body ilike '%\_%'),
    'FAIL a notice still contains an underscore';
  raise notice 'PASS: No_Action_Needed sends no push';
end $$;

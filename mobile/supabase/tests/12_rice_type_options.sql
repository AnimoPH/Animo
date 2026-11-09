-- requires: 0047
-- Rice type categories (migration 0047): Hybrid, Inbred and Specialty are accepted,
-- Organic is refused, and the maturity days match the app and the edge function.
set session_replication_role = replica;
insert into public.farm(farm_id, farmer_id) values
  ('c0500000-4444-0000-0000-000000000002', 'c0500000-0000-0000-0000-000000000001');
set session_replication_role = origin;

do $$
declare t text; n int := 0;
begin
  foreach t in array array['Hybrid', 'Inbred', 'Specialty'] loop
    insert into public.cropcycle(farm_id, planting_date, status, rice_type_category)
      values ('c0500000-4444-0000-0000-000000000002', current_date - 10, 'Harvested', t);
    n := n + 1;
  end loop;
  assert n = 3, 'FAIL accepted ' || n || ' categories, expected 3';
  raise notice 'PASS: Hybrid, Inbred and Specialty are accepted';
end $$;

do $$
begin
  begin
    insert into public.cropcycle(farm_id, planting_date, status, rice_type_category)
      values ('c0500000-4444-0000-0000-000000000002', current_date - 10, 'Harvested', 'Organic');
    raise exception 'FAIL Organic was accepted';
  exception when check_violation then
    raise notice 'PASS: Organic is refused by the check constraint';
  end;
end $$;

do $$
begin
  assert public.rice_maturity_days('Hybrid') = 110, 'FAIL Hybrid days';
  assert public.rice_maturity_days('Inbred') = 120, 'FAIL Inbred days';
  assert public.rice_maturity_days('Specialty') = 122, 'FAIL Specialty days';
  assert public.rice_maturity_days('Organic') is null, 'FAIL Organic still has maturity days';
  raise notice 'PASS: maturity days are 110, 120, 122 and Organic has none';
end $$;

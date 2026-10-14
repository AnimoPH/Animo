-- requires: 0043
-- "The farmer does not type the price": a listing inserted straight into the
-- table, bypassing the app, still gets the price the feed gives. The feed in
-- 00_fixtures is dry 20.00, wet 15.50.
select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare dry numeric; wet numeric; prem numeric;
begin
  insert into public.croplisting(farmer_id, declared_variety, declared_moisture, declared_purity_grade, variety_code,
    gross_weight_kg, tare_weight_kg, remaining_quantity_kg, listing_name, status, computed_price_per_kg)
  values (auth.uid(), 'Inbred', 'Dry', 'Ungraded', 'OTHER', 100, 0, 100, 'Client price 1', 'Available', 1.00)
  returning computed_price_per_kg into dry;
  assert dry = 20.00, 'FAIL a client price of 1.00 was stored: ' || dry;
  raise notice 'PASS: a direct insert with a client price of 1.00 is stored at the feed price 20.00';

  insert into public.croplisting(farmer_id, declared_variety, declared_moisture, declared_purity_grade, variety_code,
    gross_weight_kg, tare_weight_kg, remaining_quantity_kg, listing_name, status, computed_price_per_kg)
  values (auth.uid(), 'Inbred', 'Wet', 'Ungraded', 'OTHER', 100, 0, 100, 'Client price 999', 'Available', 999)
  returning computed_price_per_kg into wet;
  assert wet = 15.50, 'FAIL a client price of 999 was stored: ' || wet;
  raise notice 'PASS: a direct insert with a client price of 999 is stored at the wet base 15.50';

  insert into public.croplisting(farmer_id, declared_variety, declared_moisture, declared_purity_grade, variety_code,
    gross_weight_kg, tare_weight_kg, remaining_quantity_kg, listing_name, status)
  values (auth.uid(), 'Inbred', 'Dry', 'A', '218', 100, 0, 100, 'No price', 'Available')
  returning computed_price_per_kg into prem;
  assert prem = 25.00, 'FAIL no price given: ' || prem;
  raise notice 'PASS: a direct insert with no price still locks the feed price plus the Rc218 Grade A premium';
end $$;

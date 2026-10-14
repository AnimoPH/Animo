-- Shared fixtures. Rows are added with triggers and foreign keys switched off
-- and the transaction is rolled back, so nothing stays in the database.
--   farmer  c0500000-0000-0000-0000-000000000001
--   buyer   c0500000-0000-0000-0000-000000000002
--   open listing (Dry, Inbred, OTHER, 1000 kg)   c0500000-1111-0000-0000-000000000001
--   completed transaction on it                  c0500000-2222-0000-0000-000000000001
set session_replication_role = replica;
insert into auth.users(id) values
  ('c0500000-0000-0000-0000-000000000001'), ('c0500000-0000-0000-0000-000000000002');
insert into public."user"(user_id, full_name, role, contact_number) values
  ('c0500000-0000-0000-0000-000000000001', 'Test Farmer', 'Farmer', '09170000091'),
  ('c0500000-0000-0000-0000-000000000002', 'Test Buyer', 'Buyer', '09170000092');
insert into public.farmer(user_id) values ('c0500000-0000-0000-0000-000000000001');
insert into public.buyer(user_id) values ('c0500000-0000-0000-0000-000000000002');
insert into public.croplisting(listing_id, farmer_id, declared_variety, declared_moisture, declared_purity_grade,
  variety_code, gross_weight_kg, tare_weight_kg, remaining_quantity_kg, listing_name, status, computed_price_per_kg)
values ('c0500000-1111-0000-0000-000000000001', 'c0500000-0000-0000-0000-000000000001', 'Inbred', 'Dry', 'Ungraded',
  'OTHER', 1000, 0, 1000, 'Fixture listing', 'Available', 20.00);
insert into public.purchaserequest(request_id, listing_id, buyer_id, requested_quantity_kg, status)
values ('c0500000-3333-0000-0000-000000000001', 'c0500000-1111-0000-0000-000000000001',
  'c0500000-0000-0000-0000-000000000002', 100, 'Accepted');
insert into public.transactionmatch(transaction_id, listing_id, request_id, buyer_id, farmer_id,
  agreed_price_per_kg, quantity_kg, status, date_completed)
values ('c0500000-2222-0000-0000-000000000001', 'c0500000-1111-0000-0000-000000000001',
  'c0500000-3333-0000-0000-000000000001', 'c0500000-0000-0000-0000-000000000002',
  'c0500000-0000-0000-0000-000000000001', 20.00, 100, 'Completed', now());
set session_replication_role = origin;
-- the local database has no table grants for the app roles, the hosted one does
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
-- one known feed row: dry 20.00, wet 15.50
delete from public.marketpricefeed;
insert into public.marketpricefeed(dry_base_price_per_kg, wet_base_price_per_kg, effective_date)
values (20.00, 15.50, current_date);

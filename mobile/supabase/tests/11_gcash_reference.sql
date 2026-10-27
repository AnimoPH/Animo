-- FT-10 (migrations 0039 and 0041): a GCash payment needs a reference number of
-- exactly 13 digits that no earlier payment used. Cash takes no number.
-- Each refused payment leaves no row. The fixture transaction is Completed and
-- belongs to the fixture buyer.
select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  tx uuid := 'c0500000-2222-0000-0000-000000000001';
  p uuid; n_before int; n_after int; msg text; stored text; mode_ text;
  bad text[] := array['100000000002', '10000000000003', '10000000000AB', '1000-000-00001'];
  b text;
begin
  select count(*) into n_before from public.payment where transaction_id = tx;

  p := public.record_payment(tx, 'GCash', 2000, '1000000000001', gen_random_uuid());
  select gcash_reference_number into stored from public.payment where payment_id = p;
  assert stored = '1000000000001', 'FT-10 the 13 digit number was not stored';
  raise notice 'PASS FT-10: a 13 digit GCash reference number is accepted and stored';

  foreach b in array bad loop
    begin
      perform public.record_payment(tx, 'GCash', 2000, b, gen_random_uuid());
      raise exception 'FT-10 accepted a bad reference number %', b;
    exception when others then
      get stacked diagnostics msg = message_text;
      assert msg = 'gcash reference invalid format', 'FT-10 wrong refusal for ' || b || ': ' || msg;
    end;
  end loop;
  raise notice 'PASS FT-10: 12 digits, 14 digits, letters, and dashes are each refused as an invalid format';

  begin
    perform public.record_payment(tx, 'GCash', 2000, null, gen_random_uuid());
    raise exception 'FT-10 accepted a GCash payment with no number';
  exception when others then
    get stacked diagnostics msg = message_text;
    assert msg = 'gcash reference required', 'FT-10 wrong refusal for no number: ' || msg;
  end;
  raise notice 'PASS FT-10: a GCash payment with no reference number is refused';

  begin
    perform public.record_payment(tx, 'GCash', 2000, '1000000000001', gen_random_uuid());
    raise exception 'FT-10 accepted a reused reference number';
  exception when others then
    get stacked diagnostics msg = message_text;
    assert msg = 'gcash reference already used', 'FT-10 wrong refusal for a reused number: ' || msg;
  end;
  raise notice 'PASS FT-10: a number an earlier payment already used is refused';

  select count(*) into n_after from public.payment where transaction_id = tx;
  assert n_after = n_before + 1, 'FT-10 a refused payment left a row (' || (n_after - n_before) || ' new rows)';
  raise notice 'PASS FT-10: the refused payments recorded nothing, one new payment in all';

  p := public.record_payment(tx, 'Cash', 2000, null, gen_random_uuid());
  select payment_mode, gcash_reference_number into mode_, stored from public.payment where payment_id = p;
  assert mode_ = 'Cash' and stored is null, 'FT-10 the cash payment was not stored without a number';
  raise notice 'PASS FT-10: a Cash payment is accepted without a number';

  begin
    perform public.record_payment(tx, 'Cash', 2000, '1000000000009', gen_random_uuid());
    raise exception 'FT-10 accepted a cash payment with a number';
  exception when others then
    get stacked diagnostics msg = message_text;
    assert msg = 'gcash reference not allowed for cash', 'FT-10 wrong refusal for cash with a number: ' || msg;
  end;
  raise notice 'PASS FT-10: a Cash payment with a number is refused';
end $$;
reset role;

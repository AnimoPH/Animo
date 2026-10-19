-- A suspended account is refused with a message the app can turn into "your account is
-- suspended, because ..." (src/lib/suspension.ts reads these): a row-level-security
-- refusal (SQLSTATE 42501) for new listings, requests and ratings, and the sentence
-- 'account is suspended' for the RPCs.
update public."user" set account_status = 'Suspended', suspended_at = now(), suspension_reason = 'Prueba lang'
  where user_id in ('c0500000-0000-0000-0000-000000000001', 'c0500000-0000-0000-0000-000000000002');

select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare state text; msg text;
begin
  begin
    perform public.create_crop_listing(gen_random_uuid(), 20.00, 'Blocked', 'Inbred', null, 'OTHER', null, null, 'Dry', 'Ungraded', 1000, 0);
    raise exception 'FAIL a suspended farmer created a listing';
  exception when others then
    get stacked diagnostics state = returned_sqlstate, msg = message_text;
    assert state = '42501', 'FAIL listing refusal was ' || state || ': ' || msg;
    raise notice 'PASS: a new listing is refused with 42501 (%)', msg;
  end;

  begin
    perform public.farmer_confirm_payment_received(gen_random_uuid());
    raise exception 'FAIL a suspended farmer confirmed a payment';
  exception when others then
    get stacked diagnostics msg = message_text;
    assert msg = 'account is suspended', 'FAIL payment confirm refusal was: ' || msg;
    raise notice 'PASS: confirming a payment is refused with "account is suspended"';
  end;

  begin
    perform public.reject_purchase_request(gen_random_uuid());
    raise exception 'FAIL a suspended farmer rejected a request';
  exception when others then
    get stacked diagnostics msg = message_text;
    assert msg = 'account is suspended', 'FAIL reject refusal was: ' || msg;
    raise notice 'PASS: rejecting a request is refused with "account is suspended"';
  end;
end $$;

select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare state text; msg text;
begin
  begin
    insert into public.purchaserequest(listing_id, buyer_id, requested_quantity_kg)
      values ('c0500000-1111-0000-0000-000000000001', 'c0500000-0000-0000-0000-000000000002', 100);
    raise exception 'FAIL a suspended buyer sent a request';
  exception when others then
    get stacked diagnostics state = returned_sqlstate, msg = message_text;
    assert state = '42501', 'FAIL request refusal was ' || state || ': ' || msg;
    raise notice 'PASS: a new purchase request is refused with 42501';
  end;

  begin
    insert into public.rating(transaction_id, rater_id, rated_id, score)
      values ('c0500000-2222-0000-0000-000000000001', 'c0500000-0000-0000-0000-000000000002', 'c0500000-0000-0000-0000-000000000001', 5);
    raise exception 'FAIL a suspended buyer rated';
  exception when others then
    get stacked diagnostics state = returned_sqlstate, msg = message_text;
    assert state = '42501', 'FAIL rating refusal was ' || state || ': ' || msg;
    raise notice 'PASS: a new rating is refused with 42501';
  end;

  begin
    perform public.record_payment('c0500000-2222-0000-0000-000000000001', 'Cash', 100, null);
    raise exception 'FAIL a suspended buyer recorded a payment';
  exception when others then
    get stacked diagnostics msg = message_text;
    assert msg = 'account is suspended', 'FAIL payment refusal was: ' || msg;
    raise notice 'PASS: recording a payment is refused with "account is suspended"';
  end;

  -- the suspended user can still read their own status and reason
  assert (select suspension_reason from public."user" where user_id = 'c0500000-0000-0000-0000-000000000002') = 'Prueba lang',
    'FAIL the suspended user cannot read the reason';
  raise notice 'PASS: a suspended user can read why';
end $$;

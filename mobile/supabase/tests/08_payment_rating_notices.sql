-- requires: 0046
-- Payment sent, payment confirmed and a new rating each notify the right person (migration 0046).
set session_replication_role = replica;
insert into public.payment(payment_id, transaction_id, payment_mode, amount, payer_id, payee_id, status)
values ('c0800000-1111-0000-0000-000000000001', 'c0500000-2222-0000-0000-000000000001', 'Cash', 100,
        'c0500000-0000-0000-0000-000000000002', 'c0500000-0000-0000-0000-000000000001', 'Pending');
set session_replication_role = origin;
delete from public.push_notification_queue;

do $$
declare n int; k text; buyer_n int;
begin
  update public.payment set buyer_confirmed_at = now() where payment_id = 'c0800000-1111-0000-0000-000000000001';
  select count(*), min(data->>'type') into n, k from public.push_notification_queue
    where user_id = 'c0500000-0000-0000-0000-000000000001' and data->>'type' = 'payment_sent';
  select count(*) into buyer_n from public.push_notification_queue
    where user_id = 'c0500000-0000-0000-0000-000000000002' and data->>'type' = 'payment_sent';
  assert n = 1, 'FAIL farmer got ' || n || ' payment_sent notices, expected 1';
  assert buyer_n = 0, 'FAIL buyer got a payment_sent notice';
  raise notice 'PASS: the buyer marking payment sent notifies the farmer once';
end $$;

do $$
declare n int; farmer_n int;
begin
  update public.payment set buyer_confirmed_at = now() where payment_id = 'c0800000-1111-0000-0000-000000000001';
  select count(*) into n from public.push_notification_queue where data->>'type' = 'payment_sent';
  assert n = 1, 'FAIL a second buyer confirm made another notice (' || n || ')';
  update public.payment set farmer_confirmed_at = now(), status = 'Confirmed' where payment_id = 'c0800000-1111-0000-0000-000000000001';
  select count(*) into n from public.push_notification_queue
    where user_id = 'c0500000-0000-0000-0000-000000000002' and data->>'type' = 'payment_confirmed';
  select count(*) into farmer_n from public.push_notification_queue
    where user_id = 'c0500000-0000-0000-0000-000000000001' and data->>'type' = 'payment_confirmed';
  assert n = 1, 'FAIL buyer got ' || n || ' payment_confirmed notices, expected 1';
  assert farmer_n = 0, 'FAIL farmer got a payment_confirmed notice';
  raise notice 'PASS: the farmer confirming payment notifies the buyer once, and a repeat does not notify twice';
end $$;

do $$
declare n int; other_n int;
begin
  delete from public.push_notification_queue;
  insert into public.rating(transaction_id, rater_id, rated_id, score)
    values ('c0500000-2222-0000-0000-000000000001', 'c0500000-0000-0000-0000-000000000002', 'c0500000-0000-0000-0000-000000000001', 5);
  select count(*) into n from public.push_notification_queue
    where user_id = 'c0500000-0000-0000-0000-000000000001' and data->>'type' = 'rating_received';
  select count(*) into other_n from public.push_notification_queue
    where user_id = 'c0500000-0000-0000-0000-000000000002' and data->>'type' = 'rating_received';
  assert n = 1, 'FAIL the rated farmer got ' || n || ' notices, expected 1';
  assert other_n = 0, 'FAIL the rater got a rating notice';
  assert not exists (select 1 from public.push_notification_queue where body ilike '%5%' or body ilike '%bituin%'),
    'FAIL the notice leaks the score';
  raise notice 'PASS: a new rating notifies only the rated person, without the score';
end $$;

-- Review screen (migration 0040): a flagged word marks the review for the LGU,
-- a clean review is left alone, and the client cannot clear the flag.
select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
do $$
declare r public.rating;
begin
  insert into public.rating(transaction_id, rater_id, rated_id, score, comment)
    values ('c0500000-2222-0000-0000-000000000001', auth.uid(), 'c0500000-0000-0000-0000-000000000001', 1, 'Ang gago mo')
    returning * into r;
  assert r.flagged_word_hit and r.reported, 'FAIL a flagged word was not flagged';
  assert (select count(*) from public.rating where rated_id = 'c0500000-0000-0000-0000-000000000001' and reported) = 1,
    'FAIL the LGU reported count did not rise';
  raise notice 'PASS: "Ang gago mo" is saved, flagged and reported, and the LGU reported count is 1';
end $$;
reset role;
delete from public.rating;
select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
do $$
declare r public.rating;
begin
  insert into public.rating(transaction_id, rater_id, rated_id, score, comment, flagged_word_hit)
    values ('c0500000-2222-0000-0000-000000000001', auth.uid(), 'c0500000-0000-0000-0000-000000000001', 1, 'putang ina', false)
    returning * into r;
  assert r.flagged_word_hit and r.reported, 'FAIL the client cleared the flag';
  raise notice 'PASS: a client sending flagged_word_hit = false is still flagged';
end $$;
reset role;
delete from public.rating;
select set_config('request.jwt.claims', '{"sub":"c0500000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
do $$
declare r public.rating;
begin
  insert into public.rating(transaction_id, rater_id, rated_id, score, comment)
    values ('c0500000-2222-0000-0000-000000000001', auth.uid(), 'c0500000-0000-0000-0000-000000000001', 5, 'Maganda ang palay, computer tangable')
    returning * into r;
  assert not r.flagged_word_hit and not r.reported, 'FAIL a clean review was flagged';
  raise notice 'PASS: a clean review (with words that only contain listed letters) is not flagged';
end $$;

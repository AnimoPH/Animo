-- Advisory Module follow-up #2 — fix a real duplication bug surfaced while
-- testing 0023/0024: refresh-advisory inserts a new advisoryrecommendation
-- row every time it runs, with no check for an existing same-day row, even
-- though date_issued (a plain `date`, 0001) already implies one advisory per
-- cropcycle per day. Repeated manual invocations while debugging the cron
-- (and any future double-fire of the scheduled job) produced duplicate
-- same-day rows for every Growing cropcycle. This constraint makes that
-- impossible going forward; refresh-advisory's insert is updated alongside
-- this migration to upsert against it instead of failing.

alter table public.advisoryrecommendation
  add constraint advisoryrecommendation_cropcycle_day_unique
  unique (cropcycle_id, date_issued, type, trigger_source);

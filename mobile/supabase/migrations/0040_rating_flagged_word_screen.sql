-- Review text screen. A rating comment that hits the kept word list sets
-- flagged_word_hit and reported = true so it shows in the LGU reported count.
-- Flag only: the rating is still saved and nothing is hidden or deleted.
--
-- The list lives in this function, not in a table, so the data dictionary
-- stays at 24 tables. To change the list, replace the function in a new
-- migration.
--
-- BEFORE INSERT overrides whatever the client sent for flagged_word_hit, so
-- a modified client cannot clear the flag. Matching is case-insensitive on
-- whole words (\y). Spaced or symbol-padded spellings are not caught.

create or replace function public.rating_screen_comment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_words constant text[] := array[
    -- Tagalog
    'putangina', 'putang ina', 'tangina', 'tang ina', 'puta', 'pota',
    'gago', 'gaga', 'tanga', 'bobo', 'ulol', 'tarantado', 'siraulo',
    'buwisit', 'bwisit', 'punyeta', 'lintik', 'leche', 'kupal',
    'walang hiya', 'hayop ka', 'animal ka', 'pakshet', 'pakyu',
    -- English
    'fuck', 'fucker', 'shit', 'bitch', 'asshole', 'bastard', 'cunt',
    'dick', 'idiot', 'stupid', 'moron'
  ];
  v_word text;
  v_text text := lower(coalesce(new.comment, ''));
  v_hit boolean := false;
begin
  if v_text <> '' then
    foreach v_word in array v_words loop
      if v_text ~ ('\y' || v_word || '\y') then
        v_hit := true;
        exit;
      end if;
    end loop;
  end if;

  new.flagged_word_hit := v_hit;
  if v_hit then
    new.reported := true;
    new.report_reason := coalesce(new.report_reason, 'Flagged word in review');
  end if;

  return new;
end;
$$;

drop trigger if exists rating_screen_comment on public.rating;
create trigger rating_screen_comment
  before insert on public.rating
  for each row execute function public.rating_screen_comment();

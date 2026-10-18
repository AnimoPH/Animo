-- The advisory push used the stored state as its text ("No_Action_Needed") and
-- went out every day for every crop, including days with nothing to do.
--
--   1. The text is now the same Tagalog label the Payo sa Bukid card shows:
--      Maagang Anihin or Antalahin ang Anihan.
--   2. No push for No_Action_Needed. That state stays on the card. Only a state
--      that asks the farmer to act sends a notice.
--
-- Only the trigger function changes. The trigger, the queue and the dispatcher
-- stay as they are, and notices already queued are not touched.

create or replace function public.notify_new_advisory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer_id uuid;
  v_body text;
begin
  if new.recommended_action = 'No_Action_Needed' then
    return new;
  end if;

  v_body := case new.recommended_action
    when 'Advance_Cut' then 'Maagang Anihin'
    when 'Delayed_Harvest' then 'Antalahin ang Anihan'
    else coalesce(new.recommended_action, 'May bagong payo para sa iyong pananim.')
  end;

  select f.farmer_id into v_farmer_id
    from public.cropcycle cc
    join public.farm f on f.farm_id = cc.farm_id
    where cc.cropcycle_id = new.cropcycle_id;

  if v_farmer_id is not null then
    perform public.enqueue_push_notification(
      v_farmer_id,
      case new.type when 'RainAdvisory' then 'Babala sa Panahon' else 'Payo sa Bukid' end,
      v_body,
      jsonb_build_object('type', 'advisory', 'advisory_id', new.advisory_id, 'cropcycle_id', new.cropcycle_id)
    );
  end if;

  return new;
end;
$$;

-- Three more push notices, so each side hears about the next step of a trade:
--   buyer says the payment was sent     -> the farmer
--   farmer confirms the payment arrived -> the buyer
--   a rating is posted                  -> the person who was rated
-- (A delivered notice is not needed: marking delivered completes the trade at once,
-- and the completed notice from 0030 already reaches both sides.)

create function public.notify_payment_sent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.buyer_confirmed_at is null and new.buyer_confirmed_at is not null then
    perform public.enqueue_push_notification(
      new.payee_id,
      'Nagbayad ang Mamimili',
      'Ipinadala na ng mamimili ang bayad. Pakikumpirma kung natanggap mo na.',
      jsonb_build_object('type', 'payment_sent', 'transaction_id', new.transaction_id, 'payment_id', new.payment_id)
    );
  end if;
  return new;
end;
$$;

create trigger payment_notify_sent
  after update of buyer_confirmed_at on public.payment
  for each row execute function public.notify_payment_sent();

create function public.notify_payment_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.farmer_confirmed_at is null and new.farmer_confirmed_at is not null then
    perform public.enqueue_push_notification(
      new.payer_id,
      'Natanggap ang Bayad',
      'Kinumpirma ng magsasaka na natanggap niya ang bayad mo.',
      jsonb_build_object('type', 'payment_confirmed', 'transaction_id', new.transaction_id, 'payment_id', new.payment_id)
    );
  end if;
  return new;
end;
$$;

create trigger payment_notify_confirmed
  after update of farmer_confirmed_at on public.payment
  for each row execute function public.notify_payment_confirmed();

create function public.notify_rating_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enqueue_push_notification(
    new.rated_id,
    'May Bagong Rating',
    'May nag-rate sa iyo sa isang nakumpletong transaksyon.',
    jsonb_build_object('type', 'rating_received', 'transaction_id', new.transaction_id, 'rating_id', new.rating_id)
  );
  return new;
end;
$$;

create trigger rating_notify_received
  after insert on public.rating
  for each row execute function public.notify_rating_received();

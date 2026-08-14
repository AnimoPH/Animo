-- Security fix: the OTP resend cooldown was client-only React state, not
-- enforced server-side — anyone with the anon key could send/verify OTPs
-- as fast as they liked. Backs real throttling + lockout for the
-- send-otp/verify-otp Edge Functions. Only service_role (those two
-- functions) can read or write this table.

create table public.otp_guard (
  phone text primary key,
  last_sent_at timestamptz,
  send_count_in_window integer not null default 0,
  window_started_at timestamptz,
  fail_count integer not null default 0,
  locked_until timestamptz
);

alter table public.otp_guard enable row level security;
revoke all on public.otp_guard from public, anon, authenticated;
grant all on public.otp_guard to service_role;

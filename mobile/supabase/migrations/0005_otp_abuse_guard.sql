-- Security fix: the app's only OTP resend "cooldown" was a 45s setTimeout
-- in React component state (src/components/animo/otp-verification.tsx) —
-- not a server-side control at all. Anyone calling
-- supabase.auth.signInWithOtp / verifyOtp directly with the public anon key
-- could send/verify as fast as they liked, enabling SMS-bombing of
-- arbitrary numbers and unlimited OTP-guessing attempts. This table backs
-- real server-side throttling + lockout, enforced by the send-otp/verify-otp
-- Edge Functions (which replace the client's direct auth.signInWithOtp /
-- auth.verifyOtp calls — see src/services/auth-service.ts).
--
-- RLS is enabled with zero policies granted to anon/authenticated: only the
-- service-role client inside those two Edge Functions may ever read or
-- write this table.

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

#!/usr/bin/env node
/**
 * One-time dev seed: LGU official auth user + profile rows.
 * Usage (from mobile/):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-lgu-dev.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.LGU_DEV_EMAIL ?? 'lgu@example.com';
const password = process.env.LGU_DEV_PASSWORD ?? process.env.EXPO_PUBLIC_DEV_FARMER_PASSWORD ?? 'AnimoDevs@2026';
const fullName = process.env.LGU_DEV_NAME ?? 'Ma. Reyes';
const contact = process.env.LGU_DEV_CONTACT ?? '+639170000000';

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existingList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const existing = existingList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

let userId = existing?.id;

if (!userId) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error('createUser failed:', error.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log('Created auth user', email);
} else {
  const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  if (error) {
    console.error('updateUser failed:', error.message);
    process.exit(1);
  }
  console.log('Updated existing auth user', email);
}

const { data: profile, error: profileError } = await admin
  .from('user')
  .select('user_id')
  .eq('user_id', userId)
  .maybeSingle();

if (profileError) {
  console.error('profile lookup failed:', profileError.message);
  process.exit(1);
}

if (!profile) {
  const { error: insertUserError } = await admin.from('user').insert({
    user_id: userId,
    full_name: fullName,
    role: 'LGU_Official',
    contact_number: contact,
    account_status: 'Active',
  });
  if (insertUserError) {
    console.error('user insert failed:', insertUserError.message);
    process.exit(1);
  }
  console.log('Inserted public.user row');
} else {
  console.log('public.user row already exists');
}

const { data: lguRow, error: lguLookupError } = await admin
  .from('lguofficial')
  .select('user_id')
  .eq('user_id', userId)
  .maybeSingle();

if (lguLookupError) {
  console.error('lguofficial lookup failed:', lguLookupError.message);
  process.exit(1);
}

if (!lguRow) {
  const { error: lguInsertError } = await admin.from('lguofficial').insert({ user_id: userId });
  if (lguInsertError) {
    console.error('lguofficial insert failed:', lguInsertError.message);
    process.exit(1);
  }
  console.log('Inserted lguofficial row');
} else {
  console.log('lguofficial row already exists');
}

console.log(`Done. Sign in at the LGU console with ${email}`);

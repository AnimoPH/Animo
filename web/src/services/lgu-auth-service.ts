import { supabase } from '@/lib/supabase';

export type LguSession = {
  userId: string;
  email: string;
  fullName: string;
};

export class LguAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LguAuthError';
  }
}

export async function signInLgu(email: string, password: string): Promise<LguSession> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new LguAuthError(error.message);
  if (!data.session?.user) throw new LguAuthError('Walang session pagkatapos mag-login.');

  const userId = data.session.user.id;
  const { data: profile, error: profileError } = await supabase
    .from('user')
    .select('full_name, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) throw new LguAuthError(profileError.message);
  if (!profile || profile.role !== 'LGU_Official') {
    await supabase.auth.signOut();
    throw new LguAuthError('Ang account na ito ay hindi LGU official.');
  }

  return {
    userId,
    email: data.session.user.email ?? email,
    fullName: profile.full_name as string,
  };
}

export async function signOutLgu(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new LguAuthError(error.message);
}

export async function getLguSession(): Promise<LguSession | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new LguAuthError(error.message);
  const user = data.session?.user;
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('user')
    .select('full_name, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) throw new LguAuthError(profileError.message);
  if (!profile || profile.role !== 'LGU_Official') {
    await supabase.auth.signOut();
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? '',
    fullName: profile.full_name as string,
  };
}

export function getDefaultLguCredentials() {
  return {
    email: import.meta.env.VITE_DEV_LGU_EMAIL ?? 'lgu@example.com',
    password:
      import.meta.env.VITE_DEV_LGU_PASSWORD ??
      import.meta.env.VITE_DEV_FARMER_PASSWORD ??
      '',
  };
}

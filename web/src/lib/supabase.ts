import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://odkygkehdlfyftiohkmy.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ka3lna2VoZGxmeWZ0aW9oa215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTI2MzMsImV4cCI6MjEwMjAyODYzM30.gBto81G3_EZ6f1tOyQrkcV4RNuEyGU8Bg4q03SfLsiM';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

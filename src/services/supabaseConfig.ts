/**
 * Where the real accounts live (Supabase project "Ovoprice").
 * The project URL and the *publishable* key are designed to be public: they ship in every browser
 * app, and the database is protected by row level security, not by hiding them.
 * NEVER put a `service_role` / secret key here or in any VITE_ variable.
 *
 * Override with VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Setting VITE_SUPABASE_URL to an
 * empty string switches accounts off (the app then behaves like a guest-only app).
 */
const DEFAULT_URL = 'https://tvoytveusenqoxxrunjr.supabase.co';
const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_CSiE3UsXQYQHzI17pslDaw_x7JG7BPA';

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  /** "Continue with Google" only works after Google is enabled in the Supabase dashboard. */
  googleEnabled: boolean;
  /** Same for Apple (needs a paid Apple Developer account). */
  appleEnabled: boolean;
}

export const readSupabaseConfig = (): SupabaseConfig | null => {
  const env = import.meta.env;
  const url = (env.VITE_SUPABASE_URL as string | undefined) ?? DEFAULT_URL;
  const publishableKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? DEFAULT_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey, googleEnabled: env.VITE_SUPABASE_GOOGLE === '1', appleEnabled: env.VITE_SUPABASE_APPLE === '1' };
};

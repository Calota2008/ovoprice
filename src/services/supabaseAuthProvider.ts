import { createClient, type User } from '@supabase/supabase-js';
import type { AuthFailure, AuthOptions, AuthProvider, AuthResult, AuthUser } from './authProvider';
import type { SupabaseConfig } from './supabaseConfig';
import { isValidEmail } from '../utils/email';
import { getLanguage, isLang, setLanguage } from '../i18n';
import { getCountry, isCountryCode, setCountry } from '../i18n/country';

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const toUser = (u: User): AuthUser => {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const email = u.email ?? '';
  const fromMeta = [meta.full_name, meta.name].find((v): v is string => typeof v === 'string' && v.trim() !== '');
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return {
    id: u.id,
    email,
    name: fromMeta ?? (local ? titleCase(local) : email),
    photoUrl: typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined,
  };
};

/** Maps a Supabase auth error to something the UI can explain. */
const failureOf = (error: { status?: number; code?: string; message?: string }): AuthFailure => {
  const code = error.code ?? '';
  const msg = (error.message ?? '').toLowerCase();
  if (error.status === 429 || code.includes('rate_limit') || msg.includes('rate limit') || msg.includes('only request this after')) return 'rate-limited';
  if (code === 'otp_disabled' || code === 'signup_disabled' || msg.includes('signups not allowed')) return 'no-account';
  if (code === 'otp_expired' || code === 'invalid_credentials' || msg.includes('expired') || msg.includes('invalid')) return 'invalid-code';
  return 'failed';
};

/** Real accounts through Supabase Auth: a six-digit code sent by e-mail (no password). */
export function createSupabaseAuthProvider(config: SupabaseConfig): AuthProvider {
  const client = createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const listeners = new Set<() => void>();
  let user: AuthUser | null = null;
  let profilePulledFor: string | null = null;

  const setUser = (next: AuthUser | null) => {
    if (user?.id === next?.id && user?.email === next?.email && user?.name === next?.name) return;
    user = next;
    listeners.forEach((l) => l());
  };

  /** The account is the source of truth for country and language once you are signed in. */
  const pullProfile = async (id: string, createdAt?: string) => {
    if (profilePulledFor === id) return;
    profilePulledFor = id;
    try {
      // A brand-new account (e.g. first Google sign-in) has only default values: keep what was chosen here.
      if (createdAt && Date.now() - Date.parse(createdAt) < 120_000) {
        await client.from('profiles').update({ country: getCountry(), language: getLanguage() }).eq('id', id);
        return;
      }
      const { data } = await client.from('profiles').select('country, language').eq('id', id).maybeSingle();
      if (!data) return;
      if (typeof data.language === 'string' && isLang(data.language)) setLanguage(data.language);
      if (typeof data.country === 'string' && isCountryCode(data.country)) setCountry(data.country);
    } catch {
      /* offline: the device settings stay as they are */
    }
  };

  void client.auth.getSession().then(({ data }) => {
    setUser(data.session ? toUser(data.session.user) : null);
    if (data.session) setTimeout(() => void pullProfile(data.session!.user.id, data.session!.user.created_at), 0);
  });
  client.auth.onAuthStateChange((event, session) => {
    setUser(session ? toUser(session.user) : null);
    if (!session) profilePulledFor = null;
    // Never await Supabase calls inside this callback; defer them.
    else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') setTimeout(() => void pullProfile(session.user.id, session.user.created_at), 0);
  });

  const fail = (reason: AuthFailure): AuthResult => ({ ok: false, reason });

  return {
    isConnected: true,
    syncsData: false,
    getUser: () => user,
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },

    signInWithGoogle: async () => {
      if (!config.googleEnabled) return fail('google-unavailable');
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        // select_account: Google shows the account picker, so signing in again is one tap.
        options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
      });
      return error ? fail(failureOf(error)) : { ok: true, redirecting: true };
    },

    signInWithApple: async () => {
      if (!config.appleEnabled) return fail('apple-unavailable');
      const { error } = await client.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: window.location.origin },
      });
      return error ? fail(failureOf(error)) : { ok: true, redirecting: true };
    },

    signInWithEmail: async (email: string, options?: AuthOptions) => {
      if (!isValidEmail(email)) return fail('invalid-email');
      const creating = options?.mode === 'create';
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: creating,
          data: creating ? { country: options?.country, language: getLanguage() } : undefined,
        },
      });
      return error ? fail(failureOf(error)) : { ok: true, codeSent: true };
    },

    verifyEmailCode: async (email: string, code: string) => {
      const token = code.replace(/\s+/g, '');
      if (!/^\d{6,8}$/.test(token)) return fail('invalid-code');
      const { data, error } = await client.auth.verifyOtp({ email: email.trim(), token, type: 'email' });
      if (error || !data.user) return fail(error ? failureOf(error) : 'failed');
      const u = toUser(data.user);
      setUser(u);
      return { ok: true, user: u };
    },

    updateProfile: async (patch) => {
      if (!user) return false;
      const { error } = await client.from('profiles').update(patch).eq('id', user.id);
      return !error;
    },

    signOut: async () => {
      await client.auth.signOut();
      setUser(null);
    },
  };
}

import { isValidEmail } from '../utils/email';
import { createSupabaseAuthProvider } from './supabaseAuthProvider';
import { readSupabaseConfig } from './supabaseConfig';

/**
 * Single access point for accounts. `pickProvider()` at the bottom chooses: the Supabase provider
 * (real accounts), or, when accounts are switched off, a provider with `isConnected: false` that never
 * pretends a user is signed in. The UI only talks to this interface.
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
}

/** `country` is only meaningful when creating an account (e.g. 'DE', 'AT'). */
export interface AuthOptions {
  mode?: 'sign-in' | 'create';
  country?: string;
}

export type AuthFailure =
  | 'not-connected'
  | 'invalid-email'
  | 'failed'
  | 'rate-limited'
  | 'no-account'
  | 'invalid-code'
  | 'google-unavailable'
  | 'apple-unavailable';

export type AuthResult =
  | { ok: true; user: AuthUser }
  /** A sign-in code was e-mailed; the user must enter it (see `verifyEmailCode`). */
  | { ok: true; codeSent: true }
  /** The browser is being sent to the identity provider (Google). */
  | { ok: true; redirecting: true }
  | { ok: false; reason: AuthFailure };

export interface AuthProvider {
  /** False while no backend is connected. */
  isConnected: boolean;
  /** True only for the local test account (development builds, explicit opt-in). */
  isPreview?: boolean;
  /** True once saved products, alerts and Reels are synced to the account (not yet). */
  syncsData?: boolean;
  getUser(): AuthUser | null;
  /** Calls `listener` whenever the signed-in user changes. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  signInWithGoogle(options?: AuthOptions): Promise<AuthResult>;
  signInWithApple(options?: AuthOptions): Promise<AuthResult>;
  /** Sends a sign-in code or link to this email (passwordless). */
  signInWithEmail(email: string, options?: AuthOptions): Promise<AuthResult>;
  /** Second step of the e-mail sign-in: checks the code from the e-mail. */
  verifyEmailCode?(email: string, code: string): Promise<AuthResult>;
  /** Saves country / language on the account (best effort). Returns false if it could not. */
  updateProfile?(patch: { country?: string; language?: string }): Promise<boolean>;
  signOut(): Promise<void>;
}

export { isValidEmail };

export const noBackendAuthProvider: AuthProvider = {
  isConnected: false,
  getUser: () => null,
  subscribe: () => () => undefined,
  signInWithGoogle: async () => ({ ok: false, reason: 'not-connected' }),
  signInWithApple: async () => ({ ok: false, reason: 'not-connected' }),
  signInWithEmail: async (email, _options) =>
    isValidEmail(email) ? { ok: false, reason: 'not-connected' } : { ok: false, reason: 'invalid-email' },
  signOut: async () => undefined,
};

/**
 * LOCAL TEST ACCOUNT, to check the signed-in screens before a backend exists.
 * It is available only in development builds and only after opening the app once with
 * `?previewAccount=1` (remembered for the browser session; `?previewAccount=0` turns it off).
 * Nothing is sent anywhere, no password or code is checked, and the UI labels it "TEST ACCOUNT".
 * Production builds never include it, so real visitors can't end up "signed in" by accident.
 */
const PREVIEW_FLAG_KEY = 'ovoprice_preview_account_v1';
const PREVIEW_USER_KEY = 'ovoprice_preview_user_v1';

export const previewAccountEnabled = (): boolean => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search).get('previewAccount');
    if (q === '1') sessionStorage.setItem(PREVIEW_FLAG_KEY, '1');
    if (q === '0') {
      sessionStorage.removeItem(PREVIEW_FLAG_KEY);
      sessionStorage.removeItem(PREVIEW_USER_KEY);
    }
    return sessionStorage.getItem(PREVIEW_FLAG_KEY) === '1';
  } catch {
    return false;
  }
};

export const createPreviewAuthProvider = (): AuthProvider => {
  const listeners = new Set<() => void>();
  const read = (): AuthUser | null => {
    try {
      const raw = sessionStorage.getItem(PREVIEW_USER_KEY);
      const u = raw ? (JSON.parse(raw) as Partial<AuthUser>) : null;
      return u && typeof u.id === 'string' && typeof u.name === 'string' && typeof u.email === 'string'
        ? { id: u.id, name: u.name, email: u.email }
        : null;
    } catch {
      return null;
    }
  };
  let user = read();
  const set = (next: AuthUser | null) => {
    user = next;
    try {
      if (next) sessionStorage.setItem(PREVIEW_USER_KEY, JSON.stringify(next));
      else sessionStorage.removeItem(PREVIEW_USER_KEY);
    } catch {
      /* private mode: the account lasts until reload */
    }
    listeners.forEach((l) => l());
  };
  const nameFromEmail = (email: string) => {
    const local = email.trim().split('@')[0].replace(/[._-]+/g, ' ').trim();
    return local ? local.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Test user';
  };
  return {
    isConnected: false,
    isPreview: true,
    getUser: () => user,
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    signInWithGoogle: async () => {
      const u = { id: 'preview-google', name: 'Test User', email: 'test.user@example.com' };
      set(u);
      return { ok: true, user: u };
    },
    signInWithApple: async () => {
      const u = { id: 'preview-apple', name: 'Test User', email: 'test.user@example.com' };
      set(u);
      return { ok: true, user: u };
    },
    signInWithEmail: async (email) => {
      if (!isValidEmail(email)) return { ok: false, reason: 'invalid-email' };
      const u = { id: 'preview-email', name: nameFromEmail(email), email: email.trim() };
      set(u);
      return { ok: true, user: u };
    },
    signOut: async () => set(null),
  };
};

// `import.meta.env.DEV` is a build-time constant: in production the test account code is removed.
const pickProvider = (): AuthProvider => {
  if (import.meta.env.DEV && previewAccountEnabled()) return createPreviewAuthProvider();
  const config = readSupabaseConfig();
  return config ? createSupabaseAuthProvider(config) : noBackendAuthProvider;
};

export const authProvider: AuthProvider = pickProvider();

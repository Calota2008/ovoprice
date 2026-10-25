/**
 * Single access point for accounts. Today there is no backend, so the provider reports
 * `isConnected: false` and never pretends a user is signed in. When the backend exists,
 * replace this object (Firebase Auth / Supabase / own API) and the UI keeps working.
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

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: 'not-connected' | 'invalid-email' | 'failed' };

export interface AuthProvider {
  /** False while no backend is connected. */
  isConnected: boolean;
  /** True only for the local test account (development builds, explicit opt-in). */
  isPreview?: boolean;
  getUser(): AuthUser | null;
  /** Calls `listener` whenever the signed-in user changes. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  signInWithGoogle(options?: AuthOptions): Promise<AuthResult>;
  /** Sends a sign-in code or link to this email (passwordless). */
  signInWithEmail(email: string, options?: AuthOptions): Promise<AuthResult>;
  signOut(): Promise<void>;
}

export const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) && value.trim().length <= 254;

export const noBackendAuthProvider: AuthProvider = {
  isConnected: false,
  getUser: () => null,
  subscribe: () => () => undefined,
  signInWithGoogle: async () => ({ ok: false, reason: 'not-connected' }),
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
export const authProvider: AuthProvider =
  import.meta.env.DEV && previewAccountEnabled() ? createPreviewAuthProvider() : noBackendAuthProvider;

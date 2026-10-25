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
  getUser(): AuthUser | null;
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
  signInWithGoogle: async () => ({ ok: false, reason: 'not-connected' }),
  signInWithEmail: async (email, _options) =>
    isValidEmail(email) ? { ok: false, reason: 'not-connected' } : { ok: false, reason: 'invalid-email' },
  signOut: async () => undefined,
};

export const authProvider: AuthProvider = noBackendAuthProvider;

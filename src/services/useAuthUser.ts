import { useSyncExternalStore } from 'react';
import { authProvider, AuthUser } from './authProvider';

/** The signed-in user (or null) and re-renders when it changes. */
export function useAuthUser(): AuthUser | null {
  return useSyncExternalStore(
    (listener) => authProvider.subscribe(listener),
    () => authProvider.getUser()
  );
}

export const userInitials = (user: AuthUser): string => {
  const parts = user.name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? user.email).slice(0, 2);
  return letters.toUpperCase();
};

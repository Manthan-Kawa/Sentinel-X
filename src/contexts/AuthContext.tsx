/**
 * AuthContext.tsx
 *
 * Provides the currently authenticated user (email + role) across the app.
 * Role is persisted in localStorage so it survives page refreshes.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { KEY_USER, KEY_USER_ROLE } from '@/utils/storageKeys';

export type UserRole = 'analyst' | 'user';

export interface AuthUser {
  email: string;
  role: UserRole;
  /** Display name derived from email */
  displayName: string;
  /** Two-letter initials for avatar */
  initials: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function deriveDisplayName(email: string): string {
  const local = email.split('@')[0];
  return local
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function deriveInitials(email: string): string {
  const parts = email.split('@')[0].replace(/[._-]/g, ' ').split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export function deriveRoleFromEmail(email: string): UserRole {
  const e = email.toLowerCase().trim();
  if (e === 'analyst@gmail.com' || e.includes('analyst')) return 'analyst';
  return 'user';
}

function buildUser(email: string, role?: UserRole): AuthUser {
  const resolvedRole = role || deriveRoleFromEmail(email);
  return {
    email,
    role: resolvedRole,
    displayName: deriveDisplayName(email),
    initials: deriveInitials(email),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<AuthUser | null>(() => {
    try {
      const email = localStorage.getItem(KEY_USER);
      let role = localStorage.getItem(KEY_USER_ROLE) as UserRole | null;
      if (email) {
        if (!role) {
          role = deriveRoleFromEmail(email);
          localStorage.setItem(KEY_USER_ROLE, role);
        }
        return buildUser(email, role);
      }
    } catch { /* ignore */ }
    return null;
  });

  function setCurrentUser(user: AuthUser | null) {
    if (user) {
      try {
        localStorage.setItem(KEY_USER, user.email);
        localStorage.setItem(KEY_USER_ROLE, user.role);
      } catch { /* ignore */ }
    }
    setCurrentUserState(user);
  }

  function signOut() {
    try {
      localStorage.removeItem(KEY_USER);
      localStorage.removeItem(KEY_USER_ROLE);
    } catch { /* ignore */ }
    setCurrentUserState(null);
  }

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Helper used by WelcomePage to build a user object after login */
export { buildUser };

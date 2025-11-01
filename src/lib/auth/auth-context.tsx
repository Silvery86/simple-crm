'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import type { User } from 'firebase/auth';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  isActive: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Purpose: Auth provider component to manage authentication state.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Purpose: Fetch authenticated user information from API endpoint.
   * Returns:
   *   - Promise<AuthUser | null> — User data or null if fetch fails.
   */
  const fetchUserInfo = async (): Promise<AuthUser | null> => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        return data.user;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  };

  /**
   * Purpose: Refresh current user information from database.
   * Returns:
   *   - Promise<void> — Resolves when user info is updated.
   */
  const refreshUser = async () => {
    if (firebaseUser) {
      const userInfo = await fetchUserInfo();
      setUser(userInfo);
    }
  };

  /**
   * Purpose: Handle user logout and clear authentication state.
   * Returns:
   *   - Promise<void> — Resolves when logout is complete.
   */
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      
      await signOut(auth);
      
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        const userInfo = await fetchUserInfo();
        setUser(userInfo);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Purpose: Hook to access authentication context and user state.
 * Returns:
 *   - AuthContextType — User, firebaseUser, loading state, logout, refreshUser functions.
 * Throws:
 *   - Error — When used outside AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Purpose: Hook to check if authenticated user has any of the specified roles.
 * Params:
 *   - roles: string[] — List of role names to check against.
 * Returns:
 *   - boolean — True if user has at least one role from the list, false otherwise.
 */
export function useHasRole(roles: string[]): boolean {
  const { user } = useAuth();
  
  if (!user || !user.roles) {
    return false;
  }
  
  return roles.some(role => user.roles.includes(role));
}

/**
 * Purpose: Hook to check if current user has admin role.
 * Returns:
 *   - boolean — True if user is admin, false otherwise.
 */
export function useIsAdmin(): boolean {
  return useHasRole(['admin']);
}

/**
 * Purpose: Hook to check if current user has manager role.
 * Returns:
 *   - boolean — True if user is manager, false otherwise.
 */
export function useIsManager(): boolean {
  return useHasRole(['admin', 'manager']);
}
import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../lib/firebase';
import type { CurrentUserProfile } from '../types/firebase';
import * as authService from '../services/authService';
import * as permissionService from '../services/permissionService';

interface AuthContextValue {
  user: CurrentUserProfile | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<CurrentUserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  hasPermission: (maQuyen: string) => boolean;
  hasAnyPermission: (listQuyen: string[]) => boolean;
  hasRole: (maVaiTro: string) => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUser(null);
      return;
    }

    const profile = await authService.getCurrentUserProfile(currentUser.uid);
    setUser(profile);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (!firebaseUser) {
          setUser(null);
          return;
        }

        const profile = await authService.getCurrentUserProfile(firebaseUser.uid);
        setUser(profile);
      } catch {
        setUser(null);
        setError('Không thể tải thông tin tài khoản.');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError('');
    try {
      const profile = await authService.login(email, password);
      setUser(profile);
      return profile;
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'Không thể đăng nhập.';
      setUser(null);
      setError(message);
      throw loginError;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      login: handleLogin,
      logout: handleLogout,
      refreshUser,
      clearError: () => setError(''),
      hasPermission: (maQuyen) => permissionService.hasPermission(user, maQuyen),
      hasAnyPermission: (listQuyen) => permissionService.hasAnyPermission(user, listQuyen),
      hasRole: (maVaiTro) => permissionService.hasRole(user, maVaiTro),
      isSuperAdmin: () => permissionService.hasRole(user, 'super_admin'),
    }),
    [error, handleLogin, handleLogout, loading, refreshUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

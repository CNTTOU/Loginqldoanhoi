import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../lib/firebase';
import type { CurrentUserProfile } from '../types/firebase';
import * as authService from '../services/authService';
import { hasAnyPermission, hasPermission, hasRole } from '../services/permissionService';

interface AuthContextValue {
  user: CurrentUserProfile | null;
  loading: boolean;
  authError: string;
  login: (email: string, password: string) => Promise<CurrentUserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (maQuyen: string) => boolean;
  hasAnyPermission: (listQuyen: string[]) => boolean;
  hasRole: (maVaiTro: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const refreshUser = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUser(null);
      return;
    }
    setUser(await authService.getCurrentUserProfile(currentUser.uid));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setAuthError('');
      try {
        if (!firebaseUser) {
          setUser(null);
          return;
        }
        const profile = await authService.getCurrentUserProfile(firebaseUser.uid);
        if (!profile) {
          setAuthError('Tài khoản chưa được cấp quyền trong hệ thống.');
          await authService.logout();
          setUser(null);
          return;
        }
        if (profile.trang_thai === 'tam_khoa' || profile.trang_thai === 'ngung_su_dung') {
          setAuthError(profile.trang_thai === 'tam_khoa' ? 'Tài khoản đang bị khóa.' : 'Tài khoản đã ngừng sử dụng.');
          await authService.logout();
          setUser(null);
          return;
        }
        setUser(profile);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      authError,
      login: async (email, password) => {
        const profile = await authService.login(email, password);
        setUser(profile);
        return profile;
      },
      logout: async () => {
        await authService.logout();
        setUser(null);
      },
      refreshUser,
      hasPermission: (maQuyen) => hasPermission(user, maQuyen),
      hasAnyPermission: (listQuyen) => hasAnyPermission(user, listQuyen),
      hasRole: (maVaiTro) => hasRole(user, maVaiTro),
    }),
    [user, loading, authError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

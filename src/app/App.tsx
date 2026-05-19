import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { SystemSelectPage } from './pages/SystemSelectPage';
import { UsersPage } from './pages/UsersPage';
import { getAdminUrl } from './utils/urls';

function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, hasRole } = useAuth();
  const canManageUsers = hasRole('super_admin');

  const handleLogout = async () => {
    await logout();
    window.location.replace('/login/?logout=1&reason=Bạn%20đã%20đăng%20xuất.');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Cổng tài khoản</h1>
            <p className="text-sm text-gray-500">{user?.ho_ten ?? 'Quản lý người dùng nội bộ'}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/chon-he-thong" className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Phân hệ
            </Link>
            {canManageUsers && (
              <Link to="/users" className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Người dùng
              </Link>
            )}
            <a href={getAdminUrl('/dashboard')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Vào QL hoạt động
            </a>
            <button onClick={handleLogout} className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/doi-mat-khau" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
          <Route path="/chon-he-thong" element={<ProtectedRoute><SystemSelectPage /></ProtectedRoute>} />
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRoles={['super_admin']}>
                <AccountLayout>
                  <UsersPage />
                </AccountLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

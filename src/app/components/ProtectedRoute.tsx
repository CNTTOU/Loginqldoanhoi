import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({
  children,
  anyPermissions = [],
  requiredRoles = [],
}: {
  children: React.ReactNode;
  anyPermissions?: string[];
  requiredRoles?: string[];
}) {
  const { user, loading, hasAnyPermission, hasRole } = useAuth();

  if (loading) return <div className="min-h-screen grid place-items-center text-gray-600">Đang kiểm tra phiên đăng nhập...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (requiredRoles.length > 0 && !requiredRoles.some((role) => hasRole(role))) {
    return <div className="min-h-screen grid place-items-center bg-gray-50 text-gray-700">Bạn không có quyền truy cập chức năng này.</div>;
  }
  if (anyPermissions.length > 0 && !hasAnyPermission(anyPermissions)) {
    return <div className="min-h-screen grid place-items-center bg-gray-50 text-gray-700">Bạn không có quyền truy cập chức năng này.</div>;
  }
  return <>{children}</>;
}

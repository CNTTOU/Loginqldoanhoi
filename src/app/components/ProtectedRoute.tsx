import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  anyPermissions?: string[];
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredPermissions = [], anyPermissions = [], requiredRoles = [] }: ProtectedRouteProps) {
  const { user, loading, hasPermission, hasAnyPermission, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-600">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/?redirect=${redirect}`} replace />;
  }

  const hasRequiredPermissions = requiredPermissions.every((permission) => hasPermission(permission));
  const hasAnyRequiredPermission = anyPermissions.length === 0 || hasAnyPermission(anyPermissions);
  const hasRequiredRole = requiredRoles.length === 0 || requiredRoles.some((role) => hasRole(role));

  if (!hasRequiredPermissions || !hasAnyRequiredPermission || !hasRequiredRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Không có quyền truy cập</h1>
          <p className="mt-2 text-sm text-gray-600">Tài khoản của bạn chưa được cấp quyền cho chức năng này.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

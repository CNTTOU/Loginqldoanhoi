import { Activity, ShieldCheck, Users, LogOut } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAdminUrl, getRedirectUrl } from '../utils/urls';

export function SystemSelectPage() {
  const { user, logout, hasAnyPermission, hasRole } = useAuth();
  const location = useLocation();
  const canManageUsers = hasRole('super_admin');
  const canOpenActivities =
    hasAnyPermission(['xem_hoat_dong', 'them_hoat_dong', 'duyet_hoat_dong']) || canManageUsers;

  const modules = [
    {
      key: 'users',
      title: 'Quản lý người dùng',
      description: 'Tạo tài khoản nội bộ, khóa/mở khóa và quản lý hồ sơ người dùng.',
      icon: Users,
      visible: canManageUsers,
      href: '/login/users',
      tone: 'from-slate-900 to-blue-800',
    },
    {
      key: 'activities',
      title: 'Quản lý hoạt động',
      description: 'Theo dõi hoạt động Đoàn - Hội, minh chứng, báo cáo và duyệt hoạt động.',
      icon: Activity,
      visible: canOpenActivities,
      href: location.search ? getRedirectUrl(location.search) : getAdminUrl('/dashboard'),
      tone: 'from-blue-700 to-cyan-600',
    },
  ].filter((item) => item.visible);

  const handleLogout = async () => {
    await logout();
    window.location.replace('/login/?logout=1&reason=Bạn%20đã%20đăng%20xuất.');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Chọn phân hệ làm việc</h1>
            <p className="text-sm text-gray-500">
              {user?.ho_ten} • {user?.ten_vai_tro}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-semibold text-gray-900">Bạn muốn vào phần nào?</h2>
          <p className="mt-2 max-w-2xl text-gray-600">
            Hệ thống chỉ hiển thị những phân hệ phù hợp với vai trò và quyền của tài khoản hiện tại.
          </p>
        </div>

        {modules.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <a
                  key={module.key}
                  href={module.href}
                  className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
                >
                  <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${module.tone} text-white shadow-md`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{module.title}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-gray-600">{module.description}</p>
                  <div className="mt-5 text-sm font-medium text-blue-700 group-hover:text-blue-800">
                    Vào phân hệ
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            Tài khoản của bạn chưa được cấp quyền vào phân hệ nào. Vui lòng liên hệ quản trị viên.
          </div>
        )}
      </main>
    </div>
  );
}

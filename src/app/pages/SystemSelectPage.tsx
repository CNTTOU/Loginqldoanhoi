import { ShieldCheck, Users, ClipboardList, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAdminUrl } from '../utils/urls';

export function SystemSelectPage() {
  const { user, logout, hasAnyPermission, isSuperAdmin } = useAuth();
  const canOpenActivity = isSuperAdmin() || hasAnyPermission(['xem_hoat_dong', 'them_hoat_dong', 'duyet_hoat_dong']);
  const canManageUsers = isSuperAdmin();

  async function handleLogout() {
    await logout();
    window.location.replace('/login/?logout=1&reason=Bạn%20đã%20đăng%20xuất.');
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-700">Chọn phân hệ</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Xin chào, {user?.ho_ten}</h1>
            <p className="mt-1 text-sm text-slate-600">{user?.ten_vai_tro} · {user?.ten_don_vi}</p>
          </div>
          <button onClick={handleLogout} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {canOpenActivity && (
            <a href={getAdminUrl('/dashboard')} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-slate-950">Quản lý hoạt động</h2>
              <p className="mt-2 text-sm text-slate-600">Theo dõi hoạt động, minh chứng, duyệt và báo cáo theo phân quyền.</p>
            </a>
          )}

          {canManageUsers && (
            <a href="/login/users" className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-slate-950">Quản lý người dùng</h2>
              <p className="mt-2 text-sm text-slate-600">Tạo tài khoản nội bộ, khóa/mở khóa và kiểm soát hồ sơ người dùng.</p>
            </a>
          )}

          {!canOpenActivity && !canManageUsers && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
              <ShieldCheck className="mb-4 h-7 w-7" />
              <h2 className="text-lg font-semibold">Chưa có phân hệ khả dụng</h2>
              <p className="mt-2 text-sm">Tài khoản của bạn đã đăng nhập nhưng chưa được cấp quyền vào các phân hệ quản trị.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

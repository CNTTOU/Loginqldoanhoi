import { ShieldCheck, Users, ClipboardList, LogOut } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAdminUrl } from '../utils/urls';
import { getSystems } from '../services/permissionAdminService';
import type { HeThong } from '../types/firebase';

export function SystemSelectPage() {
  const { user, logout, hasPermission, isSuperAdmin } = useAuth();
  const [systems, setSystems] = useState<HeThong[]>([]);
  const systemSet = useMemo(() => new Set(user?.danh_sach_he_thong ?? []), [user?.danh_sach_he_thong]);
  const canAccessAccount = isSuperAdmin() || systemSet.has('quan_tri_tai_khoan');
  const canManageUsers = canAccessAccount && (isSuperAdmin() || hasPermission('quan_ly_nguoi_dung'));
  const canViewUnits = canAccessAccount && hasPermission('quan_ly_don_vi');
  const canManageRoles = canAccessAccount && (isSuperAdmin() || hasPermission('quan_ly_phan_quyen'));
  const accountHref = canManageUsers ? '/login/users' : canManageRoles ? '/login/roles' : '/login/units';
  const canOpenAccount = canManageUsers || canViewUnits || canManageRoles;

  useEffect(() => {
    getSystems()
      .then(setSystems)
      .catch(() => {
        setSystems([]);
      });
  }, []);

  const availableSystems = useMemo(() => {
    if (!user) return [];
    return systems.filter((system) => {
      if (isSuperAdmin()) return true;
      return systemSet.has(system.ma_he_thong);
    });
  }, [isSuperAdmin, systemSet, systems, user]);

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
          {availableSystems.map((system) => (
            <a key={system.ma_he_thong} href={system.ma_he_thong === 'quan_ly_hoat_dong' ? getAdminUrl('/dashboard') : system.duong_dan} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-slate-950">{system.ten_he_thong}</h2>
              <p className="mt-2 text-sm text-slate-600">{system.mo_ta}</p>
            </a>
          ))}

          {canOpenAccount && (
            <a href={accountHref} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-slate-950">Quản trị tài khoản</h2>
              <p className="mt-2 text-sm text-slate-600">Quản lý người dùng, đơn vị và vai trò theo phân quyền được cấp.</p>
            </a>
          )}

          {availableSystems.length === 0 && !canOpenAccount && (
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

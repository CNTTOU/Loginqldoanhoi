import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Filter, Lock, Plus, Search, Unlock, Users, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createInternalUser, getRoles, getUnits, getUsers, lockUser, unlockUser } from '../services/userService';
import type { DonVi, NguoiDung, VaiTro } from '../types/firebase';

const statusLabels: Record<string, string> = {
  dang_hoat_dong: 'Đang hoạt động',
  tam_khoa: 'Tạm khóa',
  cho_doi_mat_khau: 'Chờ đổi mật khẩu',
  ngung_su_dung: 'Ngừng sử dụng',
};

const statusColors: Record<string, string> = {
  dang_hoat_dong: 'bg-green-100 text-green-700',
  tam_khoa: 'bg-red-100 text-red-700',
  cho_doi_mat_khau: 'bg-amber-100 text-amber-700',
  ngung_su_dung: 'bg-gray-100 text-gray-700',
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function UsersPage() {
  const { user, hasAnyPermission, hasPermission } = useAuth();
  const [users, setUsers] = useState<NguoiDung[]>([]);
  const [roles, setRoles] = useState<VaiTro[]>([]);
  const [units, setUnits] = useState<DonVi[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    ho_ten: '',
    email: '',
    mat_khau_tam_thoi: '',
    ma_don_vi: 'doan_khoa_cntt',
    ma_vai_tro: 'nguoi_xem',
    trang_thai: 'cho_doi_mat_khau',
  });

  const canCreate = hasAnyPermission(['tao_tai_khoan', 'quan_ly_nguoi_dung']);

  const loadData = async () => {
    setLoading(true);
    const [userRows, roleRows, unitRows] = await Promise.all([getUsers(), getRoles(), getUnits()]);
    setUsers(userRows);
    setRoles(roleRows);
    setUnits(unitRows);
    setLoading(false);
  };

  useEffect(() => {
    loadData().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Không thể tải danh sách người dùng.');
      setLoading(false);
    });
  }, []);

  const filteredUsers = useMemo(
    () =>
      users.filter((item) => {
        const matchesSearch = `${item.ho_ten} ${item.email} ${item.ten_don_vi}`.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = selectedRole === 'all' || item.ma_vai_tro === selectedRole;
        const matchesStatus = selectedStatus === 'all' || item.trang_thai === selectedStatus;
        return matchesSearch && matchesRole && matchesStatus;
      }),
    [users, searchQuery, selectedRole, selectedStatus],
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      await createInternalUser({
        ...form,
        bat_buoc_doi_mat_khau: true,
        trang_thai: form.trang_thai as 'cho_doi_mat_khau' | 'dang_hoat_dong',
      });
      setMessage('Tạo tài khoản nội bộ thành công.');
      setShowCreateForm(false);
      setForm({ ho_ten: '', email: '', mat_khau_tam_thoi: '', ma_don_vi: 'doan_khoa_cntt', ma_vai_tro: 'nguoi_xem', trang_thai: 'cho_doi_mat_khau' });
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tạo tài khoản thất bại.');
    }
  };

  const handleToggleLock = async (target: NguoiDung) => {
    if (!target.uid || target.uid === user?.uid) return;
    setMessage('');
    try {
      if (target.trang_thai === 'tam_khoa') await unlockUser(target.uid);
      else await lockUser(target.uid);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái tài khoản.');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Quản lý người dùng</h2>
        </div>
        <p className="text-sm text-gray-500">Quản lý tài khoản nội bộ, vai trò và quyền truy cập hệ thống.</p>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">Không có đăng ký công khai. Tài khoản chỉ được tạo bởi admin hoặc super admin.</p>
      </div>

      {message && <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {canCreate && (
          <button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-white shadow-lg shadow-blue-500/30">
            <Plus className="h-5 w-5" />
            <span>Tạo tài khoản</span>
          </button>
        )}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm kiếm người dùng..." className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-700">Lọc theo:</span>
        </div>
        <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
          <option value="all">Tất cả vai trò</option>
          {roles.map((role) => <option key={role.ma_vai_tro} value={role.ma_vai_tro}>{role.ten_vai_tro}</option>)}
        </select>
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {showCreateForm && canCreate && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Tạo tài khoản nội bộ</h3>
            <button onClick={() => setShowCreateForm(false)} className="rounded-lg p-2 hover:bg-gray-100"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={form.ho_ten} onChange={(event) => setForm({ ...form, ho_ten: event.target.value })} placeholder="Họ tên" className="rounded-lg border border-gray-300 px-4 py-2.5" required />
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" className="rounded-lg border border-gray-300 px-4 py-2.5" required />
            <input type="password" minLength={8} value={form.mat_khau_tam_thoi} onChange={(event) => setForm({ ...form, mat_khau_tam_thoi: event.target.value })} placeholder="Mật khẩu tạm thời" className="rounded-lg border border-gray-300 px-4 py-2.5" required />
            <select value={form.ma_don_vi} onChange={(event) => setForm({ ...form, ma_don_vi: event.target.value })} className="rounded-lg border border-gray-300 px-4 py-2.5">
              {units.map((unit) => <option key={unit.ma_don_vi} value={unit.ma_don_vi}>{unit.ten_don_vi}</option>)}
            </select>
            <select value={form.ma_vai_tro} onChange={(event) => setForm({ ...form, ma_vai_tro: event.target.value })} className="rounded-lg border border-gray-300 px-4 py-2.5">
              {roles.map((role) => <option key={role.ma_vai_tro} value={role.ma_vai_tro}>{role.ten_vai_tro}</option>)}
            </select>
            <select value={form.trang_thai} onChange={(event) => setForm({ ...form, trang_thai: event.target.value })} className="rounded-lg border border-gray-300 px-4 py-2.5">
              <option value="cho_doi_mat_khau">Chờ đổi mật khẩu</option>
              <option value="dang_hoat_dong">Đang hoạt động</option>
            </select>
            <div className="md:col-span-2">
              <button className="rounded-lg bg-blue-700 px-4 py-2.5 text-white hover:bg-blue-800">Tạo tài khoản</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-4 text-left text-sm text-gray-600">Người dùng</th>
              <th className="px-6 py-4 text-left text-sm text-gray-600">Đơn vị</th>
              <th className="px-6 py-4 text-left text-sm text-gray-600">Vai trò</th>
              <th className="px-6 py-4 text-center text-sm text-gray-600">Trạng thái</th>
              <th className="px-6 py-4 text-center text-sm text-gray-600">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Đang tải...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Chưa có người dùng phù hợp.</td></tr>
            ) : (
              filteredUsers.map((item) => (
                <tr key={item.uid} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-sm font-semibold text-white">{initials(item.ho_ten)}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.ho_ten}</p>
                        <p className="text-xs text-gray-500">{item.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.ten_don_vi}</td>
                  <td className="px-6 py-4"><span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">{item.ten_vai_tro}</span></td>
                  <td className="px-6 py-4 text-center"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusColors[item.trang_thai] ?? statusColors.ngung_su_dung}`}>{statusLabels[item.trang_thai] ?? item.trang_thai}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {hasPermission('khoa_tai_khoan') && (
                        <button disabled={item.uid === user?.uid} onClick={() => handleToggleLock(item)} className="rounded-lg p-2 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40" title={item.trang_thai === 'tam_khoa' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}>
                          {item.trang_thai === 'tam_khoa' ? <Unlock className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-orange-600" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Download, Edit3, Filter, KeyRound, Lock, Plus, Search, Trash2, Unlock, X } from 'lucide-react';
import type { DonVi, NguoiDung, TrangThaiNguoiDung } from '../types/firebase';
import { createInternalUser, deleteInternalUser, getUsers, lockUser, sendResetPassword, unlockUser, updateUser } from '../services/userService';
import { getUnits } from '../services/unitService';

const roleOptions = [
  { value: 'super_admin', label: 'Super Admin', color: 'bg-red-100 text-red-700' },
  { value: 'admin_doan_hoi', label: 'Admin Đoàn - Hội', color: 'bg-blue-100 text-blue-700' },
  { value: 'ban_chap_hanh', label: 'Ban Chấp hành', color: 'bg-purple-100 text-purple-700' },
  { value: 'can_bo_chi_doan_chi_hoi', label: 'Cán bộ Chi đoàn', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'cong_tac_vien', label: 'Cộng tác viên', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'nguoi_xem', label: 'Người xem', color: 'bg-slate-100 text-slate-700' },
];

const statusOptions: { value: TrangThaiNguoiDung; label: string }[] = [
  { value: 'dang_hoat_dong', label: 'Đang hoạt động' },
  { value: 'cho_doi_mat_khau', label: 'Chờ đổi mật khẩu' },
  { value: 'tam_khoa', label: 'Đã khóa' },
  { value: 'ngung_su_dung', label: 'Ngừng sử dụng' },
];

const emptyForm = {
  ho_ten: '',
  email: '',
  mat_khau_tam_thoi: '',
  ma_don_vi: '',
  ma_vai_tro: 'nguoi_xem',
  trang_thai: 'cho_doi_mat_khau' as TrangThaiNguoiDung,
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getRoleMeta(maVaiTro: string) {
  return roleOptions.find((role) => role.value === maVaiTro) ?? roleOptions[roleOptions.length - 1];
}

function getStatusMeta(trangThai: TrangThaiNguoiDung) {
  if (trangThai === 'tam_khoa' || trangThai === 'ngung_su_dung') {
    return { label: trangThai === 'tam_khoa' ? 'Đã khóa' : 'Ngừng sử dụng', color: 'bg-red-100 text-red-700' };
  }

  if (trangThai === 'cho_doi_mat_khau') {
    return { label: 'Chờ đổi mật khẩu', color: 'bg-amber-100 text-amber-700' };
  }

  return { label: 'Đang hoạt động', color: 'bg-emerald-100 text-emerald-700' };
}

export function UsersPage() {
  const [users, setUsers] = useState<NguoiDung[]>([]);
  const [units, setUnits] = useState<DonVi[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('tat_ca');
  const [statusFilter, setStatusFilter] = useState('tat_ca');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<NguoiDung | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function loadUsers() {
    setLoading(true);
    try {
      const [nextUsers, nextUnits] = await Promise.all([getUsers(), getUnits()]);
      setUsers(nextUsers);
      setUnits(nextUnits);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return users.filter((user) => {
      const matchesKeyword =
        !keyword ||
        user.ho_ten.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.ten_don_vi.toLowerCase().includes(keyword);
      const matchesRole = roleFilter === 'tat_ca' || user.ma_vai_tro === roleFilter;
      const matchesStatus = statusFilter === 'tat_ca' || user.trang_thai === statusFilter;
      return matchesKeyword && matchesRole && matchesStatus;
    });
  }, [roleFilter, searchText, statusFilter, users]);

  const activeCount = users.filter((user) => user.trang_thai === 'dang_hoat_dong' || user.trang_thai === 'cho_doi_mat_khau').length;
  const lockedCount = users.filter((user) => user.trang_thai === 'tam_khoa' || user.trang_thai === 'ngung_su_dung').length;
  const adminCount = users.filter((user) => user.ma_vai_tro === 'super_admin' || user.ma_vai_tro === 'admin_doan_hoi').length;

  function openCreateModal() {
    setEditingUser(null);
    setForm({ ...emptyForm, ma_don_vi: units[0]?.ma_don_vi ?? '' });
    setMessage('');
    setIsModalOpen(true);
  }

  function openEditModal(user: NguoiDung) {
    setEditingUser(user);
    setForm({
      ho_ten: user.ho_ten,
      email: user.email,
      mat_khau_tam_thoi: '',
      ma_don_vi: user.ma_don_vi,
      ma_vai_tro: user.ma_vai_tro,
      trang_thai: user.trang_thai,
    });
    setMessage('');
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage('');

    if (!form.ho_ten || !form.email || !form.ma_don_vi || !form.ma_vai_tro) {
      setMessage('Vui lòng nhập đầy đủ thông tin người dùng.');
      return;
    }

    if (!editingUser && form.mat_khau_tam_thoi.length < 8) {
      setMessage('Mật khẩu tạm thời cần tối thiểu 8 ký tự.');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.uid, {
          ho_ten: form.ho_ten,
          email: form.email,
          ten_dang_nhap: form.email.split('@')[0].trim().toLowerCase(),
          ma_don_vi: form.ma_don_vi,
          ma_vai_tro: form.ma_vai_tro,
          trang_thai: form.trang_thai,
        });
        setMessage('Cập nhật người dùng thành công.');
      } else {
        await createInternalUser({
          ho_ten: form.ho_ten,
          email: form.email,
          mat_khau_tam_thoi: form.mat_khau_tam_thoi,
          ma_don_vi: form.ma_don_vi,
          ma_vai_tro: form.ma_vai_tro,
          trang_thai: form.trang_thai,
          bat_buoc_doi_mat_khau: true,
        });
        setMessage('Tạo tài khoản thành công.');
      }

      setIsModalOpen(false);
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu thông tin người dùng.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleLock(user: NguoiDung) {
    setMessage('');
    if (user.trang_thai === 'tam_khoa') await unlockUser(user.uid);
    else await lockUser(user.uid);
    await loadUsers();
  }

  async function handleResetPassword(user: NguoiDung) {
    setMessage('');
    await sendResetPassword(user.uid, user.email);
    setMessage(`Đã gửi yêu cầu reset mật khẩu cho tài khoản ${user.email}.`);
    await loadUsers();
  }

  async function handleDelete(user: NguoiDung) {
    const confirmed = window.confirm(`Xóa vĩnh viễn tài khoản ${user.ho_ten}? Tài khoản sẽ bị xóa khỏi Firebase Auth và Firestore.`);
    if (!confirmed) return;

    setMessage('');
    await deleteInternalUser(user.uid);
    setMessage(`Đã xóa tài khoản ${user.ho_ten}.`);
    await loadUsers();
  }

  function exportUsers() {
    const rows = filteredUsers.map((user) => [user.ho_ten, user.email, user.ten_don_vi, user.ten_vai_tro, user.trang_thai]);
    const csv = [['Họ tên', 'Email', 'Đơn vị', 'Vai trò', 'Trạng thái'], ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'danh-sach-nguoi-dung.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-500/20">
            <Plus className="h-5 w-5" />
            Thêm người dùng
          </button>
          <button onClick={exportUsers} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
            <Download className="h-5 w-5" />
            Xuất danh sách
          </button>
        </div>

        <label className="relative block w-full xl:w-[448px]">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Tìm kiếm người dùng..."
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="inline-flex items-center gap-2 text-slate-600">
          <Filter className="h-5 w-5" />
          Lọc theo:
        </div>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="min-w-44 rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500">
          <option value="tat_ca">Tất cả vai trò</option>
          {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-44 rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500">
          <option value="tat_ca">Tất cả trạng thái</option>
          {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
      </div>

      {message && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold">Người dùng</th>
                <th className="px-6 py-4 font-semibold">Đơn vị</th>
                <th className="px-6 py-4 font-semibold">Vai trò</th>
                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                <th className="px-6 py-4 text-center font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-6 py-6 text-slate-500" colSpan={5}>Đang tải...</td></tr>
              ) : filteredUsers.map((user, index) => {
                const role = getRoleMeta(user.ma_vai_tro);
                const status = getStatusMeta(user.trang_thai);
                const avatarColors = ['bg-blue-900', 'bg-cyan-600', 'bg-violet-600', 'bg-sky-500', 'bg-emerald-500', 'bg-slate-500'];

                return (
                  <tr key={user.uid} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColors[index % avatarColors.length]}`}>
                          {getInitials(user.ho_ten)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-950">{user.ho_ten}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-800">{user.ten_don_vi || user.ma_don_vi}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${role.color}`}>
                        {user.ten_vai_tro || role.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-3 text-slate-400">
                        <button title="Sửa người dùng" onClick={() => openEditModal(user)} className="hover:text-blue-600">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button title={user.trang_thai === 'tam_khoa' ? 'Mở khóa' : 'Khóa tài khoản'} onClick={() => toggleLock(user)} className="hover:text-amber-600">
                          {user.trang_thai === 'tam_khoa' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </button>
                        <button title="Reset mật khẩu" onClick={() => handleResetPassword(user)} className="hover:text-cyan-600">
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button title="Xóa tài khoản" onClick={() => handleDelete(user)} className="hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tổng số người dùng</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{users.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Đang hoạt động</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-600">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Đã khóa</p>
          <p className="mt-3 text-2xl font-semibold text-red-600">{lockedCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Quản trị viên</p>
          <p className="mt-3 text-2xl font-semibold text-blue-600">{adminCount}</p>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-950">{editingUser ? 'Sửa người dùng' : 'Thêm người dùng'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 p-6 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Họ tên</span>
                <input value={form.ho_ten} onChange={(event) => setForm({ ...form, ho_ten: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
              </label>
              {!editingUser && (
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Mật khẩu tạm thời</span>
                  <input type="password" value={form.mat_khau_tam_thoi} onChange={(event) => setForm({ ...form, mat_khau_tam_thoi: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Đơn vị</span>
                <select value={form.ma_don_vi} onChange={(event) => setForm({ ...form, ma_don_vi: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500">
                  <option value="">Chọn đơn vị</option>
                  {units.map((unit) => <option key={unit.ma_don_vi} value={unit.ma_don_vi}>{unit.ten_don_vi}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Vai trò</span>
                <select value={form.ma_vai_tro} onChange={(event) => setForm({ ...form, ma_vai_tro: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500">
                  {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Trạng thái</span>
                <select value={form.trang_thai} onChange={(event) => setForm({ ...form, trang_thai: event.target.value as TrangThaiNguoiDung })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500">
                  {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </label>

              <div className="flex justify-end gap-3 md:col-span-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
                  Hủy
                </button>
                <button disabled={saving} type="submit" className="rounded-lg bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-70">
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

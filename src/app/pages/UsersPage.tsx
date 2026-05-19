import { FormEvent, useEffect, useState } from 'react';
import type { NguoiDung } from '../types/firebase';
import { createInternalUser, getUsers, lockUser, unlockUser } from '../services/userService';

const roleOptions = [
  { value: 'admin_doan_hoi', label: 'Admin Đoàn - Hội' },
  { value: 'ban_chap_hanh', label: 'Ban chấp hành' },
  { value: 'can_bo_chi_doan_chi_hoi', label: 'Cán bộ Chi đoàn/Chi hội' },
  { value: 'cong_tac_vien', label: 'Cộng tác viên' },
  { value: 'nguoi_xem', label: 'Người xem' },
];

export function UsersPage() {
  const [users, setUsers] = useState<NguoiDung[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    ho_ten: '',
    email: '',
    mat_khau_tam_thoi: '',
    ma_don_vi: 'doan_khoa_cntt',
    ma_vai_tro: 'nguoi_xem',
  });

  async function loadUsers() {
    setLoading(true);
    try {
      setUsers(await getUsers());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setMessage('');

    if (!form.ho_ten || !form.email || form.mat_khau_tam_thoi.length < 8) {
      setMessage('Vui lòng nhập đủ họ tên, email và mật khẩu tạm tối thiểu 8 ký tự.');
      return;
    }

    setSaving(true);
    try {
      await createInternalUser({ ...form, trang_thai: 'cho_doi_mat_khau', bat_buoc_doi_mat_khau: true });
      setForm({ ho_ten: '', email: '', mat_khau_tam_thoi: '', ma_don_vi: 'doan_khoa_cntt', ma_vai_tro: 'nguoi_xem' });
      setMessage('Tạo tài khoản thành công.');
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tạo tài khoản.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleLock(user: NguoiDung) {
    if (user.trang_thai === 'tam_khoa') await unlockUser(user.uid);
    else await lockUser(user.uid);
    await loadUsers();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Tạo tài khoản nội bộ</h2>
        <form className="mt-5 space-y-4" onSubmit={handleCreate}>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Họ tên" value={form.ho_ten} onChange={(event) => setForm({ ...form, ho_ten: event.target.value })} />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Mật khẩu tạm thời" type="password" value={form.mat_khau_tam_thoi} onChange={(event) => setForm({ ...form, mat_khau_tam_thoi: event.target.value })} />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Mã đơn vị" value={form.ma_don_vi} onChange={(event) => setForm({ ...form, ma_don_vi: event.target.value })} />
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.ma_vai_tro} onChange={(event) => setForm({ ...form, ma_vai_tro: event.target.value })}>
            {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          <button disabled={saving} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-70" type="submit">
            {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </form>
        {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Danh sách người dùng</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-3 pr-4 font-medium">Họ tên</th>
                <th className="py-3 pr-4 font-medium">Email</th>
                <th className="py-3 pr-4 font-medium">Vai trò</th>
                <th className="py-3 pr-4 font-medium">Đơn vị</th>
                <th className="py-3 pr-4 font-medium">Trạng thái</th>
                <th className="py-3 pr-4 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="py-4 text-slate-500" colSpan={6}>Đang tải...</td></tr>
              ) : users.map((user) => (
                <tr key={user.uid} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium text-slate-900">{user.ho_ten}</td>
                  <td className="py-3 pr-4 text-slate-600">{user.email}</td>
                  <td className="py-3 pr-4 text-slate-600">{user.ten_vai_tro || user.ma_vai_tro}</td>
                  <td className="py-3 pr-4 text-slate-600">{user.ten_don_vi || user.ma_don_vi}</td>
                  <td className="py-3 pr-4 text-slate-600">{user.trang_thai}</td>
                  <td className="py-3 pr-4">
                    <button onClick={() => toggleLock(user)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                      {user.trang_thai === 'tam_khoa' ? 'Mở khóa' : 'Khóa'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

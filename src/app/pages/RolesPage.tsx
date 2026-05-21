import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import type { HeThong, Quyen, VaiTro } from '../types/firebase';
import { getAllSystems, getPermissions, getRoleSystemIds, getRoles } from '../services/permissionAdminService';
import { deactivateRole, getRoleUsageCounts, saveRole } from '../services/roleService';

const emptyForm = {
  ma_vai_tro: '',
  ten_vai_tro: '',
  mo_ta: '',
  cap_do: 10,
  trang_thai: 'dang_hoat_dong',
  danh_sach_he_thong: [] as string[],
  danh_sach_quyen: [] as string[],
};

function getStatusMeta(status: string) {
  if (status === 'ngung_su_dung') return { label: 'Ngừng sử dụng', color: 'bg-red-100 text-red-700' };
  return { label: 'Đang sử dụng', color: 'bg-emerald-100 text-emerald-700' };
}

function getPermissionIdsBySystem(permissions: Quyen[], maHeThong: string) {
  return permissions.filter((permission) => permission.ma_he_thong === maHeThong).map((permission) => permission.ma_quyen);
}

export function RolesPage() {
  const [roles, setRoles] = useState<VaiTro[]>([]);
  const [systems, setSystems] = useState<HeThong[]>([]);
  const [permissions, setPermissions] = useState<Quyen[]>([]);
  const [usageCounts, setUsageCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<VaiTro | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function loadRoles() {
    setLoading(true);
    try {
      const [nextRoles, nextSystems, nextPermissions, nextUsageCounts] = await Promise.all([
        getRoles(),
        getAllSystems(),
        getPermissions(),
        getRoleUsageCounts(),
      ]);
      setRoles(nextRoles);
      setSystems(nextSystems);
      setPermissions(nextPermissions);
      setUsageCounts(nextUsageCounts);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải danh sách vai trò.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoles();
  }, []);

  const filteredRoles = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return roles.filter((role) => (
      !keyword ||
      role.ten_vai_tro.toLowerCase().includes(keyword) ||
      role.ma_vai_tro.toLowerCase().includes(keyword) ||
      role.mo_ta.toLowerCase().includes(keyword)
    ));
  }, [roles, searchText]);

  function openCreateModal() {
    setEditingRole(null);
    setForm(emptyForm);
    setMessage('');
    setIsModalOpen(true);
  }

  function openEditModal(role: VaiTro) {
    if (role.ma_vai_tro === 'super_admin') {
      setMessage('Vai trò Super Admin luôn toàn quyền và không thể chỉnh sửa.');
      return;
    }

    setEditingRole(role);
    setForm({
      ma_vai_tro: role.ma_vai_tro,
      ten_vai_tro: role.ten_vai_tro,
      mo_ta: role.mo_ta,
      cap_do: role.cap_do,
      trang_thai: role.trang_thai,
      danh_sach_he_thong: getRoleSystemIds(role, permissions),
      danh_sach_quyen: role.danh_sach_quyen ?? [],
    });
    setMessage('');
    setIsModalOpen(true);
  }

  function toggleSystem(maHeThong: string) {
    const enabled = form.danh_sach_he_thong.includes(maHeThong);
    const systemPermissions = getPermissionIdsBySystem(permissions, maHeThong);

    if (enabled) {
      setForm({
        ...form,
        danh_sach_he_thong: form.danh_sach_he_thong.filter((item) => item !== maHeThong),
        danh_sach_quyen: form.danh_sach_quyen.filter((item) => !systemPermissions.includes(item)),
      });
      return;
    }

    setForm({
      ...form,
      danh_sach_he_thong: [...form.danh_sach_he_thong, maHeThong],
    });
  }

  function togglePermission(maQuyen: string) {
    const enabled = form.danh_sach_quyen.includes(maQuyen);
    setForm({
      ...form,
      danh_sach_quyen: enabled
        ? form.danh_sach_quyen.filter((item) => item !== maQuyen)
        : [...form.danh_sach_quyen, maQuyen],
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      await saveRole(form, Boolean(editingRole));
      setIsModalOpen(false);
      setMessage(editingRole ? 'Cập nhật vai trò thành công.' : 'Tạo vai trò thành công.');
      await loadRoles();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu vai trò.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(role: VaiTro) {
    const confirmed = window.confirm(`Ngừng sử dụng vai trò ${role.ten_vai_tro}?`);
    if (!confirmed) return;

    setMessage('');
    setSaving(true);
    try {
      await deactivateRole(role);
      setMessage(`Đã ngừng sử dụng vai trò ${role.ten_vai_tro}.`);
      await loadRoles();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể ngừng sử dụng vai trò.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <button onClick={openCreateModal} className="inline-flex w-fit items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20">
          <Plus className="h-5 w-5" />
          Thêm vai trò
        </button>

        <label className="relative block w-full xl:w-[448px]">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Tìm kiếm vai trò..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-11 pr-4 outline-none focus:border-blue-500"
          />
        </label>
      </div>

      {message && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed text-left">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[30%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Vai trò</th>
                <th className="px-4 py-3 font-semibold">Mô tả</th>
                <th className="px-4 py-3 text-center font-semibold">Phân hệ</th>
                <th className="px-4 py-3 text-center font-semibold">Quyền</th>
                <th className="px-4 py-3 text-center font-semibold">User</th>
                <th className="px-4 py-3 text-center font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-4 py-5 text-slate-500" colSpan={6}>Đang tải...</td></tr>
              ) : filteredRoles.map((role) => {
                const status = getStatusMeta(role.trang_thai);
                const roleSystems = getRoleSystemIds(role, permissions);
                const isProtected = role.ma_vai_tro === 'super_admin';
                return (
                  <tr key={role.ma_vai_tro} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-950">{role.ten_vai_tro}</div>
                          <div className="truncate text-sm text-slate-500">{role.ma_vai_tro} · Cấp {role.cap_do}</div>
                          <span className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${status.color}`}>{status.label}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{role.mo_ta}</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-slate-900">{roleSystems.length}</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-slate-900">{role.danh_sach_quyen?.length ?? 0}</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-slate-900">{usageCounts.get(role.ma_vai_tro) ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1 text-slate-400">
                        <button disabled={isProtected} title={isProtected ? 'Super Admin không thể chỉnh sửa' : 'Sửa vai trò'} onClick={() => openEditModal(role)} className="rounded-md p-1.5 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button disabled={saving || isProtected} title={isProtected ? 'Super Admin không thể ngừng sử dụng' : 'Ngừng sử dụng vai trò'} onClick={() => handleDeactivate(role)} className="rounded-md p-1.5 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40">
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-950">{editingRole ? 'Sửa vai trò' : 'Thêm vai trò'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 p-6 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Mã vai trò</span>
                <input disabled={Boolean(editingRole)} value={form.ma_vai_tro} onChange={(event) => setForm({ ...form, ma_vai_tro: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Tên vai trò</span>
                <input value={form.ten_vai_tro} onChange={(event) => setForm({ ...form, ten_vai_tro: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Mô tả</span>
                <textarea value={form.mo_ta} onChange={(event) => setForm({ ...form, mo_ta: event.target.value })} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Cấp độ</span>
                <input type="number" value={form.cap_do} onChange={(event) => setForm({ ...form, cap_do: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Trạng thái</span>
                <select value={form.trang_thai} onChange={(event) => setForm({ ...form, trang_thai: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500">
                  <option value="dang_hoat_dong">Đang sử dụng</option>
                  <option value="ngung_su_dung">Ngừng sử dụng</option>
                </select>
              </label>

              <section className="md:col-span-2">
                <div className="mb-3">
                  <h3 className="font-semibold text-slate-950">Phân hệ và quyền của vai trò</h3>
                  <p className="text-sm text-slate-500">Bật phân hệ trước, sau đó chọn các quyền được cấp trong phân hệ đó.</p>
                </div>
                <div className="space-y-3">
                  {systems.map((system) => {
                    const systemEnabled = form.danh_sach_he_thong.includes(system.ma_he_thong);
                    const systemPermissions = permissions.filter((permission) => permission.ma_he_thong === system.ma_he_thong);
                    return (
                      <div key={system.ma_he_thong} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <label className="mb-3 flex items-start gap-3">
                          <input type="checkbox" checked={systemEnabled} onChange={() => toggleSystem(system.ma_he_thong)} className="mt-1 h-4 w-4 rounded border-slate-300" />
                          <span>
                            <span className="block font-semibold text-slate-900">{system.ten_he_thong}</span>
                            {system.mo_ta && <span className="block text-sm text-slate-500">{system.mo_ta}</span>}
                          </span>
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {systemPermissions.map((permission) => (
                            <label key={permission.ma_quyen} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={form.danh_sach_quyen.includes(permission.ma_quyen)}
                                disabled={!systemEnabled}
                                onChange={() => togglePermission(permission.ma_quyen)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 disabled:opacity-40"
                              />
                              <span>
                                <span className="block font-medium text-slate-900">{permission.ten_quyen}</span>
                                <span className="block text-xs text-slate-500">{permission.nhom_quyen}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

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

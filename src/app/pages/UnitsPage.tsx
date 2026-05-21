import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Award, Building2, Calendar, Edit, Filter, Mail, Plus, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { DonVi } from '../types/firebase';
import { createUnit, createUnitType, deactivateUnit, deleteOrDeactivateUnit, deleteUnitType, getUnits, getUnitTypes, type UnitType, updateUnit, updateUnitType } from '../services/unitService';

const emptyForm = {
  ma_don_vi: '',
  ten_don_vi: '',
  loai_don_vi: '',
  ma_don_vi_cha: '',
  nguoi_phu_trach: '',
  email_lien_he: '',
  so_dien_thoai: '',
  trang_thai: '',
};

const emptyTypeForm = {
  ma_loai: '',
  ten_loai: '',
  trang_thai: 'dang_hoat_dong',
};

function getTypeLabel(unitTypes: UnitType[], value: string) {
  return unitTypes.find((type) => type.ma_loai === value)?.ten_loai ?? value;
}

function getStatus(unit: DonVi) {
  return unit.trang_thai === 'ngung_hoat_dong' || unit.trang_thai === 'tam_ngung'
    ? { label: 'Tạm ngưng', color: 'bg-gray-100 text-gray-700' }
    : { label: 'Đang hoạt động', color: 'bg-green-100 text-green-700' };
}

function StatCard({ icon: Icon, title, value, iconColor, iconBg }: { icon: typeof Building2; title: string; value: number; iconColor: string; iconBg: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-3 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

const defaultVisibleStats: string[] = [];
export function UnitsPage() {
  const { hasRole } = useAuth();
  const [units, setUnits] = useState<DonVi[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<DonVi | null>(null);
  const [editingType, setEditingType] = useState<UnitType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [typeForm, setTypeForm] = useState(emptyTypeForm);
  const [visibleStats, setVisibleStats] = useState<string[]>(() => {
    try {
      const savedStats = localStorage.getItem('visible_unit_stats');
      return savedStats ? JSON.parse(savedStats) : defaultVisibleStats;
    } catch {
      return defaultVisibleStats;
    }
  });
  const canManage = hasRole('super_admin') || hasRole('admin_doan_hoi');

  async function loadUnits() {
    setLoading(true);
    try {
      setUnits(await getUnits());
      setUnitTypes(await getUnitTypes());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải danh sách đơn vị.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUnits();
  }, []);

  const filteredUnits = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return units.filter((unit) => {
      const matchesKeyword =
        !keyword ||
        unit.ten_don_vi.toLowerCase().includes(keyword) ||
        unit.nguoi_phu_trach.toLowerCase().includes(keyword) ||
        unit.email_lien_he.toLowerCase().includes(keyword);
      const matchesType = !typeFilter || unit.loai_don_vi === typeFilter;
      const matchesStatus = !statusFilter || unit.trang_thai === statusFilter;
      return matchesKeyword && matchesType && matchesStatus;
    });
  }, [searchText, statusFilter, typeFilter, units]);

  function openCreateModal() {
    setEditingUnit(null);
    setForm(emptyForm);
    setMessage('');
    setIsModalOpen(true);
  }

  function openCreateTypeModal() {
    setEditingType(null);
    setTypeForm(emptyTypeForm);
    setMessage('');
    setIsTypeModalOpen(true);
  }

  function openEditTypeModal(unitType: UnitType) {
    setEditingType(unitType);
    setTypeForm(unitType);
    setMessage('');
    setIsTypeModalOpen(true);
  }

  function openEditModal(unit: DonVi) {
    setEditingUnit(unit);
    setForm({
      ma_don_vi: unit.ma_don_vi,
      ten_don_vi: unit.ten_don_vi,
      loai_don_vi: unit.loai_don_vi,
      ma_don_vi_cha: unit.ma_don_vi_cha,
      nguoi_phu_trach: unit.nguoi_phu_trach,
      email_lien_he: unit.email_lien_he,
      so_dien_thoai: unit.so_dien_thoai,
      trang_thai: unit.trang_thai,
    });
    setMessage('');
    setIsModalOpen(true);
  }

  function validateForm() {
    if (!form.ma_don_vi || !form.ten_don_vi || !form.loai_don_vi) return 'Vui lòng nhập mã, tên và loại đơn vị.';
    if (form.email_lien_he && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_lien_he)) return 'Email liên hệ không hợp lệ.';
    if (form.ma_don_vi === form.ma_don_vi_cha) return 'Đơn vị cha không được trùng với chính đơn vị.';
    return '';
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return;

    const error = validateForm();
    if (error) {
      setMessage(error);
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      if (editingUnit) {
        await updateUnit(editingUnit.ma_don_vi, form, units);
        setMessage('Cập nhật đơn vị thành công.');
      } else {
        await createUnit(form, units);
        setMessage('Thêm đơn vị thành công.');
      }

      setIsModalOpen(false);
      await loadUnits();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : 'Không thể lưu đơn vị.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTypeSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return;

    if (!typeForm.ma_loai || !typeForm.ten_loai) {
      setMessage('Vui lòng nhập mã và tên loại đơn vị.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      if (editingType) {
        await updateUnitType(editingType.ma_loai, typeForm);
        setMessage('Cập nhật loại đơn vị thành công.');
      } else {
        await createUnitType(typeForm);
        setMessage('Thêm loại đơn vị thành công.');
      }

      setIsTypeModalOpen(false);
      setUnitTypes(await getUnitTypes());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu loại đơn vị.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteType(unitType: UnitType) {
    if (!canManage) return;
    const confirmed = window.confirm(`Xóa loại đơn vị ${unitType.ten_loai}?`);
    if (!confirmed) return;

    try {
      await deleteUnitType(unitType.ma_loai, unitType.ten_loai);
      setMessage(`Đã xóa loại đơn vị ${unitType.ten_loai}.`);
      setUnitTypes(await getUnitTypes());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xóa loại đơn vị.');
    }
  }

  async function handleDeactivate(unit: DonVi) {
    if (!canManage) return;
    await deactivateUnit(unit.ma_don_vi, unit.ten_don_vi);
    setMessage(`Đã ngừng sử dụng đơn vị ${unit.ten_don_vi}.`);
    await loadUnits();
  }

  async function handleDelete(unit: DonVi) {
    if (!canManage) return;
    const confirmed = window.confirm(`Xóa đơn vị ${unit.ten_don_vi}? Nếu đã có người dùng hoặc hoạt động, hệ thống sẽ chuyển sang ngừng sử dụng.`);
    if (!confirmed) return;

    const result = await deleteOrDeactivateUnit(unit);
    setMessage(result === 'deleted' ? `Đã xóa đơn vị ${unit.ten_don_vi}.` : `Đơn vị ${unit.ten_don_vi} đã có dữ liệu liên quan nên được chuyển sang ngừng sử dụng.`);
    await loadUnits();
  }

  const statOptions = useMemo(() => {
    return unitTypes
      .map((type) => ({
        key: type.ma_loai,
        title: type.ma_loai === 'cau_lac_bo' ? 'Câu Lạc Bộ' : type.ten_loai,
        value: units.filter((unit) => unit.loai_don_vi === type.ma_loai).length,
        icon: type.ma_loai === 'cau_lac_bo' ? Award : Building2,
        iconColor: type.ma_loai === 'cau_lac_bo' ? 'text-orange-600' : 'text-blue-600',
        iconBg: type.ma_loai === 'cau_lac_bo' ? 'bg-orange-100' : 'bg-blue-100',
      }));
  }, [unitTypes, units]);

  function toggleVisibleStat(key: string) {
    const nextStats = visibleStats.includes(key)
      ? visibleStats.filter((statKey) => statKey !== key)
      : [...visibleStats, key];

    setVisibleStats(nextStats);
    localStorage.setItem('visible_unit_stats', JSON.stringify(nextStats));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-1 text-gray-900">Quản lý đơn vị</h2>
          <p className="text-sm text-gray-500">Quản lý các đơn vị trực thuộc Đoàn - Hội</p>
        </div>
        {canManage && (
          <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-cyan-700">
            <Plus className="h-5 w-5" />
            <span>Thêm đơn vị</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Building2} title="Tổng số đơn vị" value={units.length} iconColor="text-blue-600" iconBg="bg-blue-100" />
        {statOptions.filter((stat) => visibleStats.includes(stat.key)).map((stat) => (
          <StatCard key={stat.key} icon={stat.icon} title={stat.title} value={stat.value} iconColor={stat.iconColor} iconBg={stat.iconBg} />
        ))}
        <StatCard icon={Award} title="Số loại đơn vị" value={unitTypes.length} iconColor="text-green-600" iconBg="bg-green-100" />
      </div>

      {canManage && (
        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-gray-900">Hiển thị ô thống kê</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {statOptions.map((stat) => (
              <label key={stat.key} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                <input type="checkbox" checked={visibleStats.includes(stat.key)} onChange={() => toggleVisibleStat(stat.key)} className="h-4 w-4 rounded border-gray-300" />
                {stat.title}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-gray-900">Bộ lọc</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <label className="mb-2 block text-sm text-gray-600">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input value={searchText} onChange={(event) => setSearchText(event.target.value)} type="text" placeholder="Tìm kiếm theo tên đơn vị, người phụ trách..." className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-600">Loại đơn vị</label>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tất cả loại</option>
              {unitTypes.map((type) => <option key={type.ma_loai} value={type.ma_loai}>{type.ten_loai}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-600">Cấp quản lý</label>
            <select value="" onChange={() => {}} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tất cả cấp</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-600">Trạng thái</label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tất cả trạng thái</option>
              <option value="dang_hoat_dong">Đang hoạt động</option>
              <option value="ngung_hoat_dong">Tạm ngưng</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-gray-900">Loại đơn vị</h3>
            <p className="text-sm text-gray-500">Quản lý danh mục loại đơn vị dùng trong form đơn vị</p>
          </div>
          {canManage && (
            <button onClick={openCreateTypeModal} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
              <Plus className="h-4 w-4" />
              Thêm loại
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {unitTypes.map((unitType) => (
            <div key={unitType.ma_loai} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{unitType.ten_loai}</p>
                <p className="text-xs text-gray-500">{unitType.ma_loai}</p>
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditTypeModal(unitType)} className="rounded-lg p-2 hover:bg-green-50" title="Sửa loại">
                    <Edit className="h-4 w-4 text-gray-400" />
                  </button>
                  <button onClick={() => handleDeleteType(unitType)} className="rounded-lg p-2 hover:bg-red-50" title="Xóa loại">
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {message && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] table-fixed">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[13%]" />
              <col className="w-[18%]" />
              <col className="w-[11%]" />
              <col className="w-[16%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tên đơn vị</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Loại đơn vị</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cấp quản lý</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Phụ trách</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td className="px-4 py-5 text-gray-500" colSpan={7}>Đang tải...</td></tr>
              ) : filteredUnits.map((unit) => {
                const status = getStatus(unit);
                return (
                  <tr key={unit.ma_don_vi} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3 align-top">
                      <div className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{unit.ten_don_vi}</div>
                      <div className="mt-1 text-xs text-slate-500">{unit.ma_don_vi}</div>
                    </td>
                    <td className="px-4 py-3 align-top"><span className="inline-flex whitespace-nowrap rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{getTypeLabel(unitTypes, unit.loai_don_vi)}</span></td>
                    <td className="px-4 py-3 align-top"><span className="line-clamp-2 text-sm leading-5 text-slate-600">{unit.ten_don_vi_cha || 'Cấp gốc'}</span></td>
                    <td className="px-4 py-3 align-top"><span className="text-sm text-slate-800">{unit.nguoi_phu_trach || '-'}</span></td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex min-w-0 items-center gap-2">
                        <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate text-sm text-slate-600">{unit.email_lien_he || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top"><span className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${status.color}`}>{status.label}</span></td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center justify-center gap-1">
                        {canManage && (
                          <>
                            <button onClick={() => openEditModal(unit)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Chỉnh sửa">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeactivate(unit)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600" title="Ngừng sử dụng">
                              <Calendar className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(unit)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Xóa">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <div className="text-sm text-gray-600">Hiển thị {filteredUnits.length} đơn vị</div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700">Trước</button>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">1</button>
            <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700">Sau</button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-gray-900">{editingUnit ? 'Sửa đơn vị' : 'Thêm đơn vị'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 p-6 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm text-gray-600">Mã đơn vị</span>
                <input disabled={Boolean(editingUnit)} value={form.ma_don_vi} onChange={(event) => setForm({ ...form, ma_don_vi: event.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-gray-600">Tên đơn vị</span>
                <input value={form.ten_don_vi} onChange={(event) => setForm({ ...form, ten_don_vi: event.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-gray-600">Loại đơn vị <span className="text-red-500">*</span></span>
                <select value={form.loai_don_vi} onChange={(event) => setForm({ ...form, loai_don_vi: event.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Chọn loại đơn vị</option>
                  {unitTypes.map((type) => <option key={type.ma_loai} value={type.ma_loai}>{type.ten_loai}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-gray-600">Đơn vị cha</span>
                <select value={form.ma_don_vi_cha} onChange={(event) => setForm({ ...form, ma_don_vi_cha: event.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Không có</option>
                  {units.filter((unit) => unit.ma_don_vi !== form.ma_don_vi).map((unit) => <option key={unit.ma_don_vi} value={unit.ma_don_vi}>{unit.ten_don_vi}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-gray-600">Người phụ trách</span>
                <input value={form.nguoi_phu_trach} onChange={(event) => setForm({ ...form, nguoi_phu_trach: event.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-gray-600">Email liên hệ</span>
                <input value={form.email_lien_he} onChange={(event) => setForm({ ...form, email_lien_he: event.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-gray-600">Số điện thoại</span>
                <input value={form.so_dien_thoai} onChange={(event) => setForm({ ...form, so_dien_thoai: event.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-gray-600">Trạng thái</span>
                <select value={form.trang_thai} onChange={(event) => setForm({ ...form, trang_thai: event.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="dang_hoat_dong">Đang hoạt động</option>
                  <option value="ngung_hoat_dong">Ngừng hoạt động</option>
                </select>
              </label>

              <div className="flex justify-end gap-3 md:col-span-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-gray-200 px-5 py-2.5 text-gray-700">Hủy</button>
                <button disabled={saving} type="submit" className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-2.5 text-white disabled:opacity-70">
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-gray-900">{editingType ? 'Sửa loại đơn vị' : 'Thêm loại đơn vị'}</h3>
              <button onClick={() => setIsTypeModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleTypeSubmit} className="space-y-4 p-6">
              <label className="block">
                <span className="mb-2 block text-sm text-gray-600">Mã loại</span>
                <input disabled={Boolean(editingType)} value={typeForm.ma_loai} onChange={(event) => setTypeForm({ ...typeForm, ma_loai: event.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-gray-600">Tên loại</span>
                <input value={typeForm.ten_loai} onChange={(event) => setTypeForm({ ...typeForm, ten_loai: event.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-gray-600">Trạng thái</span>
                <select value={typeForm.trang_thai} onChange={(event) => setTypeForm({ ...typeForm, trang_thai: event.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="dang_hoat_dong">Đang hoạt động</option>
                  <option value="ngung_hoat_dong">Ngừng hoạt động</option>
                </select>
              </label>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsTypeModalOpen(false)} className="rounded-lg border border-gray-200 px-5 py-2.5 text-gray-700">Hủy</button>
                <button disabled={saving} type="submit" className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-2.5 text-white disabled:opacity-70">
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

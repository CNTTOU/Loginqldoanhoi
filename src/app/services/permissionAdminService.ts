import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { HeThong, Quyen, VaiTro } from '../types/firebase';
import { getCached, invalidateCache } from './cache';

export const ACCOUNT_SYSTEM: HeThong = {
  ma_he_thong: 'quan_tri_tai_khoan',
  ten_he_thong: 'Quản trị tài khoản',
  mo_ta: 'Quản lý người dùng, đơn vị và phân quyền trong Firebase Login.',
  duong_dan: '/login/users',
  trang_thai: 'dang_su_dung',
  thu_tu: 0,
};

export async function getSystems() {
  return getCached('permissions:systems', 5 * 60 * 1000, async () => {
    const snapshot = await getDocs(query(collection(db, 'he_thong'), orderBy('thu_tu', 'asc')));
    return snapshot.docs
      .map((item) => ({ ...(item.data() as HeThong), ma_he_thong: item.id }))
      .filter((system) => system.trang_thai !== 'ngung_su_dung');
  });
}

export async function getAllSystems() {
  const systems = await getSystems();
  return [ACCOUNT_SYSTEM, ...systems.filter((system) => system.ma_he_thong !== ACCOUNT_SYSTEM.ma_he_thong)];
}

export async function getPermissions() {
  return getCached('permissions:permissions', 5 * 60 * 1000, async () => {
    const snapshot = await getDocs(query(collection(db, 'quyen'), orderBy('thu_tu', 'asc')));
    return snapshot.docs
      .map((item) => ({ ...(item.data() as Quyen), ma_quyen: item.id }))
      .filter((permission) => permission.trang_thai !== 'ngung_su_dung');
  });
}

export async function getRoles() {
  return getCached('permissions:roles', 5 * 60 * 1000, async () => {
    const snapshot = await getDocs(query(collection(db, 'vai_tro'), orderBy('cap_do', 'desc')));
    return snapshot.docs.map((item) => ({ ...(item.data() as VaiTro), ma_vai_tro: item.id }));
  });
}

export function getRoleSystemIds(role: Pick<VaiTro, 'danh_sach_he_thong' | 'danh_sach_quyen'>, permissions: Quyen[]) {
  if (Array.isArray(role.danh_sach_he_thong)) return role.danh_sach_he_thong;
  return getEnabledSystems(permissions, role.danh_sach_quyen ?? []);
}

export function invalidatePermissionAdminCache() {
  invalidateCache('permissions:');
}

export function buildEffectivePermissions(rolePermissions: string[], extraPermissions: string[] = [], blockedPermissions: string[] = [], maVaiTro = '') {
  const blocked = maVaiTro === 'super_admin' ? new Set<string>() : new Set(blockedPermissions);
  return Array.from(new Set([...rolePermissions, ...extraPermissions].filter((permission) => !blocked.has(permission))));
}

export function getEnabledSystems(permissions: Quyen[], effectivePermissions: string[], systems: HeThong[] = []) {
  const permissionSet = new Set(effectivePermissions);
  const systemSet = new Set(systems.map((system) => system.ma_he_thong));
  return Array.from(new Set(permissions
    .filter((permission) => permissionSet.has(permission.ma_quyen))
    .map((permission) => permission.ma_he_thong)
    .filter((maHeThong) => systemSet.size === 0 || systemSet.has(maHeThong))));
}

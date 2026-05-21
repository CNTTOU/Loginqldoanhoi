import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { CurrentUserProfile, NguoiDung, Quyen, VaiTro } from '../types/firebase';
import { getEnabledSystems, getPermissions } from './permissionAdminService';

export async function getRole(maVaiTro: string) {
  const roleSnap = await getDoc(doc(db, 'vai_tro', maVaiTro));
  if (!roleSnap.exists()) return null;
  return { ...(roleSnap.data() as VaiTro), ma_vai_tro: roleSnap.id };
}

export async function getRolePermissions(maVaiTro: string) {
  const role = await getRole(maVaiTro);
  return role?.danh_sach_quyen ?? [];
}

export function getRoleSystemIds(role: Pick<VaiTro, 'danh_sach_he_thong' | 'danh_sach_quyen'>, permissions: Quyen[]) {
  if (Array.isArray(role.danh_sach_he_thong)) return role.danh_sach_he_thong;
  return getEnabledSystems(permissions, role.danh_sach_quyen ?? []);
}

export async function getRoleAuthorization(maVaiTro: string) {
  const role = await getRole(maVaiTro);
  if (!role) return { permissions: [] as string[], systems: [] as string[] };
  const permissions = await getPermissions().catch(() => []);
  return {
    permissions: role.danh_sach_quyen ?? [],
    systems: getRoleSystemIds(role, permissions),
  };
}

export function buildEffectivePermissions(_profile: Pick<NguoiDung, 'ma_vai_tro' | 'quyen_bo_sung' | 'quyen_bi_chan'>, rolePermissions: string[]) {
  return Array.from(new Set(rolePermissions));
}

export function hasPermission(user: CurrentUserProfile | null | undefined, maQuyen: string) {
  return Boolean(user?.danh_sach_quyen?.includes(maQuyen));
}

export function hasAnyPermission(user: CurrentUserProfile | null | undefined, listQuyen: string[]) {
  return listQuyen.some((maQuyen) => hasPermission(user, maQuyen));
}

export function hasRole(user: CurrentUserProfile | null | undefined, maVaiTro: string) {
  return user?.ma_vai_tro === maVaiTro;
}

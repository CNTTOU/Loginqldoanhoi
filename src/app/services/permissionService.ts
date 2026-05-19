import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { CurrentUserProfile } from '../types/firebase';

export async function getRolePermissions(maVaiTro: string) {
  const roleSnap = await getDoc(doc(db, 'vai_tro', maVaiTro));
  if (!roleSnap.exists()) return [];
  return (roleSnap.data().danh_sach_quyen ?? []) as string[];
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

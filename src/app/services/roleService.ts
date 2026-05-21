import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { VaiTro } from '../types/firebase';
import { addLog } from './auditLogService';
import { invalidateCache } from './cache';
import { invalidatePermissionAdminCache } from './permissionAdminService';

export type SaveRoleInput = Pick<VaiTro, 'ma_vai_tro' | 'ten_vai_tro' | 'mo_ta' | 'cap_do' | 'trang_thai' | 'danh_sach_quyen' | 'danh_sach_he_thong'>;

export async function getRoleUsageCounts() {
  const snapshot = await getDocs(collection(db, 'nguoi_dung'));
  const counts = new Map<string, number>();
  snapshot.docs.forEach((item) => {
    const maVaiTro = String(item.data().ma_vai_tro ?? '');
    if (!maVaiTro) return;
    counts.set(maVaiTro, (counts.get(maVaiTro) ?? 0) + 1);
  });
  return counts;
}

function normalizeRole(data: SaveRoleInput) {
  const maVaiTro = data.ma_vai_tro.trim().toLowerCase();
  const danhSachQuyen = Array.from(new Set(data.danh_sach_quyen ?? []));
  const danhSachHeThong = Array.from(new Set(data.danh_sach_he_thong ?? []));

  if (!maVaiTro) throw new Error('Vui lòng nhập mã vai trò.');
  if (!/^[a-z0-9_]+$/.test(maVaiTro)) throw new Error('Mã vai trò chỉ được dùng chữ thường, số và dấu gạch dưới.');
  if (!data.ten_vai_tro.trim()) throw new Error('Vui lòng nhập tên vai trò.');
  if (maVaiTro !== 'super_admin' && danhSachHeThong.length === 0) throw new Error('Vai trò cần được bật ít nhất một phân hệ.');

  return {
    ...data,
    ma_vai_tro: maVaiTro,
    ten_vai_tro: data.ten_vai_tro.trim(),
    mo_ta: data.mo_ta.trim(),
    cap_do: Number(data.cap_do) || 0,
    danh_sach_quyen: danhSachQuyen,
    danh_sach_he_thong: danhSachHeThong,
  };
}

export async function saveRole(data: SaveRoleInput, isEditing: boolean) {
  const role = normalizeRole(data);
  const ref = doc(db, 'vai_tro', role.ma_vai_tro);
  const snap = await getDoc(ref);

  if (!isEditing && snap.exists()) throw new Error('Mã vai trò đã tồn tại.');
  if (role.ma_vai_tro === 'super_admin') throw new Error('Không chỉnh sửa vai trò Super Admin.');
  if (isEditing && role.trang_thai === 'ngung_su_dung') {
    const users = await getDocs(query(collection(db, 'nguoi_dung'), where('ma_vai_tro', '==', role.ma_vai_tro)));
    if (!users.empty) throw new Error('Không thể ngừng sử dụng vai trò đang được gán cho người dùng.');
  }

  await setDoc(ref, {
    ...role,
    la_mac_dinh: snap.exists() ? Boolean((snap.data() as VaiTro).la_mac_dinh) : false,
    ngay_cap_nhat: serverTimestamp(),
    ...(snap.exists() ? {} : { ngay_tao: serverTimestamp() }),
  }, { merge: true });

  invalidatePermissionAdminCache();
  invalidateCache(`role-name:${role.ma_vai_tro}`);
  await addLog({
    hanh_dong: isEditing ? 'cap_nhat_vai_tro' : 'tao_vai_tro',
    module: 'vai_tro',
    ma_doi_tuong: role.ma_vai_tro,
    noi_dung: `${isEditing ? 'Cập nhật' : 'Tạo'} vai trò ${role.ten_vai_tro}`,
  }).catch(() => undefined);
}

export async function deactivateRole(role: VaiTro) {
  if (role.ma_vai_tro === 'super_admin') throw new Error('Không thể ngừng sử dụng vai trò Super Admin.');

  const users = await getDocs(query(collection(db, 'nguoi_dung'), where('ma_vai_tro', '==', role.ma_vai_tro)));
  if (!users.empty) throw new Error('Không thể ngừng sử dụng vai trò đang được gán cho người dùng.');

  await updateDoc(doc(db, 'vai_tro', role.ma_vai_tro), {
    trang_thai: 'ngung_su_dung',
    ngay_cap_nhat: serverTimestamp(),
  });

  invalidatePermissionAdminCache();
  invalidateCache(`role-name:${role.ma_vai_tro}`);
  await addLog({
    hanh_dong: 'ngung_su_dung_vai_tro',
    module: 'vai_tro',
    ma_doi_tuong: role.ma_vai_tro,
    noi_dung: `Ngừng sử dụng vai trò ${role.ten_vai_tro}`,
    muc_do: 'canh_bao',
  }).catch(() => undefined);
}

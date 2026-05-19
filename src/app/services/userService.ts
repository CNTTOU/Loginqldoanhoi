import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../lib/firebase';
import type { CreateInternalUserInput, DonVi, NguoiDung, VaiTro } from '../types/firebase';
import { addLog } from './auditLogService';
import { getCurrentUserProfile } from './authService';
import { hasAnyPermission } from './permissionService';

export async function getUsers() {
  const snap = await getDocs(query(collection(db, 'nguoi_dung'), orderBy('ngay_tao', 'desc')));
  return snap.docs.map((item) => ({ uid: item.id, ...(item.data() as NguoiDung) }));
}

export async function getRoles() {
  const snap = await getDocs(query(collection(db, 'vai_tro'), orderBy('cap_do', 'desc')));
  return snap.docs.map((item) => item.data() as VaiTro);
}

export async function getUnits() {
  const snap = await getDocs(query(collection(db, 'don_vi'), orderBy('ten_don_vi')));
  return snap.docs.map((item) => item.data() as DonVi);
}

async function getDenormalizedLabels(maDonVi: string, maVaiTro: string) {
  const [unitSnap, roleSnap] = await Promise.all([
    getDoc(doc(db, 'don_vi', maDonVi)),
    getDoc(doc(db, 'vai_tro', maVaiTro)),
  ]);
  const unit = unitSnap.data() as DonVi | undefined;
  const role = roleSnap.data() as VaiTro | undefined;
  return {
    ten_don_vi: unit?.ten_don_vi ?? maDonVi,
    ten_vai_tro: role?.ten_vai_tro ?? maVaiTro,
  };
}

export async function createInternalUser(data: CreateInternalUserInput) {
  const adminUid = auth.currentUser?.uid;
  if (!adminUid) throw new Error('Bạn cần đăng nhập để tạo tài khoản.');

  const adminProfile = await getCurrentUserProfile(adminUid);
  if (!hasAnyPermission(adminProfile, ['tao_tai_khoan', 'quan_ly_nguoi_dung'])) {
    throw new Error('Bạn không có quyền tạo tài khoản.');
  }

  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.mat_khau_tam_thoi);
    const uid = credential.user.uid;
    const labels = await getDenormalizedLabels(data.ma_don_vi, data.ma_vai_tro);

    await setDoc(doc(db, 'nguoi_dung', uid), {
      uid,
      ho_ten: data.ho_ten,
      email: data.email,
      ten_dang_nhap: data.email,
      ma_don_vi: data.ma_don_vi,
      ten_don_vi: labels.ten_don_vi,
      ma_vai_tro: data.ma_vai_tro,
      ten_vai_tro: labels.ten_vai_tro,
      trang_thai: data.trang_thai ?? 'cho_doi_mat_khau',
      bat_buoc_doi_mat_khau: data.bat_buoc_doi_mat_khau ?? true,
      lan_dang_nhap_cuoi: null,
      ngay_tao: serverTimestamp(),
      nguoi_tao: adminUid,
      ngay_cap_nhat: serverTimestamp(),
    });

    await addLog({
      hanh_dong: 'tao_tai_khoan',
      module: 'nguoi_dung',
      ma_doi_tuong: uid,
      noi_dung: `Tạo tài khoản nội bộ cho ${data.ho_ten}`,
    }).catch(() => undefined);

    return uid;
  } finally {
    await signOut(secondaryAuth).catch(() => undefined);
    await deleteApp(secondaryApp).catch(() => undefined);
  }
}

export async function updateUser(uid: string, data: Partial<NguoiDung>) {
  const restricted = { ...data };
  delete restricted.uid;
  await updateDoc(doc(db, 'nguoi_dung', uid), {
    ...restricted,
    ngay_cap_nhat: serverTimestamp(),
  });
}

export async function lockUser(uid: string) {
  await updateUser(uid, { trang_thai: 'tam_khoa' });
  await addLog({ hanh_dong: 'khoa_tai_khoan', module: 'nguoi_dung', ma_doi_tuong: uid, noi_dung: 'Khóa tài khoản người dùng', muc_do: 'canh_bao' });
}

export async function unlockUser(uid: string) {
  await updateUser(uid, { trang_thai: 'dang_hoat_dong' });
  await addLog({ hanh_dong: 'mo_khoa_tai_khoan', module: 'nguoi_dung', ma_doi_tuong: uid, noi_dung: 'Mở khóa tài khoản người dùng' });
}

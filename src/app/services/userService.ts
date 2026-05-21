import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../lib/firebase';
import type { CreateInternalUserInput, DonVi, NguoiDung, VaiTro } from '../types/firebase';
import { addLog } from './auditLogService';
import { getCached } from './cache';

function buildUsername(email: string) {
  return email.split('@')[0].trim().toLowerCase();
}

async function getUnitName(maDonVi: string) {
  return getCached(`unit-name:${maDonVi}`, 5 * 60 * 1000, async () => {
    const snap = await getDoc(doc(db, 'don_vi', maDonVi));
    if (!snap.exists()) return '';
    return (snap.data() as DonVi).ten_don_vi ?? '';
  });
}

async function getRoleName(maVaiTro: string) {
  return getCached(`role-name:${maVaiTro}`, 5 * 60 * 1000, async () => {
    const snap = await getDoc(doc(db, 'vai_tro', maVaiTro));
    if (!snap.exists()) return '';
    return (snap.data() as VaiTro).ten_vai_tro ?? maVaiTro;
  });
}

export async function getUsers() {
  const snapshot = await getDocs(query(collection(db, 'nguoi_dung'), orderBy('ngay_tao', 'desc')));
  return snapshot.docs.map((item) => ({ ...(item.data() as NguoiDung), uid: item.id }));
}

async function createAuthUserWithSecondaryApp(email: string, password: string) {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await signOut(secondaryAuth).catch(() => undefined);
    return credential.user.uid;
  } finally {
    await deleteApp(secondaryApp).catch(() => undefined);
  }
}

export async function createInternalUser(data: CreateInternalUserInput) {
  const currentAdmin = auth.currentUser;
  if (!currentAdmin) throw new Error('Bạn cần đăng nhập để tạo tài khoản.');

  const uid = await createAuthUserWithSecondaryApp(data.email, data.mat_khau_tam_thoi);
  const tenDonVi = await getUnitName(data.ma_don_vi);
  const tenVaiTro = await getRoleName(data.ma_vai_tro);

  const profile: NguoiDung = {
    uid,
    ho_ten: data.ho_ten,
    email: data.email,
    ten_dang_nhap: buildUsername(data.email),
    ma_don_vi: data.ma_don_vi,
    ten_don_vi: tenDonVi,
    ma_vai_tro: data.ma_vai_tro,
    ten_vai_tro: tenVaiTro,
    trang_thai: data.trang_thai ?? 'cho_doi_mat_khau',
    bat_buoc_doi_mat_khau: data.bat_buoc_doi_mat_khau ?? true,
    lan_dang_nhap_cuoi: null,
    nguoi_tao: currentAdmin.uid,
    quyen_bo_sung: data.quyen_bo_sung ?? [],
    quyen_bi_chan: data.quyen_bi_chan ?? [],
    danh_sach_he_thong: data.danh_sach_he_thong ?? [],
  };

  await setDoc(doc(db, 'nguoi_dung', uid), {
    ...profile,
    ngay_tao: serverTimestamp(),
    ngay_cap_nhat: serverTimestamp(),
  });

  await addLog({
    hanh_dong: 'tao_tai_khoan',
    module: 'nguoi_dung',
    ma_doi_tuong: uid,
    noi_dung: `Tạo tài khoản nội bộ cho ${data.ho_ten}`,
  }).catch(() => undefined);

  return profile;
}

export async function updateUser(uid: string, data: Partial<NguoiDung>) {
  const nextData = { ...data };

  if (data.ma_don_vi) {
    nextData.ten_don_vi = await getUnitName(data.ma_don_vi);
  }

  if (data.ma_vai_tro) {
    nextData.ten_vai_tro = await getRoleName(data.ma_vai_tro);
  }

  await updateDoc(doc(db, 'nguoi_dung', uid), {
    ...nextData,
    ngay_cap_nhat: serverTimestamp(),
  });
}

export async function sendResetPassword(uid: string, email: string) {
  await updateDoc(doc(db, 'nguoi_dung', uid), {
    bat_buoc_doi_mat_khau: true,
    trang_thai: 'cho_doi_mat_khau',
    ngay_cap_nhat: serverTimestamp(),
  });

  await addLog({
    hanh_dong: 'reset_mat_khau',
    module: 'nguoi_dung',
    ma_doi_tuong: uid,
    noi_dung: `Yêu cầu reset mật khẩu cho ${email}`,
  }).catch(() => undefined);
}

export async function deleteInternalUser(uid: string) {
  await updateUser(uid, {
    trang_thai: 'ngung_su_dung',
    bat_buoc_doi_mat_khau: true,
  });
  await addLog({
    hanh_dong: 'ngung_su_dung_tai_khoan',
    module: 'nguoi_dung',
    ma_doi_tuong: uid,
    noi_dung: `Ngừng sử dụng tài khoản ${uid}`,
    muc_do: 'canh_bao',
  }).catch(() => undefined);
}

export async function lockUser(uid: string) {
  await updateUser(uid, { trang_thai: 'tam_khoa' });
  await addLog({ hanh_dong: 'khoa_tai_khoan', module: 'nguoi_dung', ma_doi_tuong: uid, noi_dung: `Khóa tài khoản ${uid}`, muc_do: 'canh_bao' }).catch(() => undefined);
}

export async function unlockUser(uid: string) {
  await updateUser(uid, { trang_thai: 'dang_hoat_dong' });
  await addLog({ hanh_dong: 'mo_khoa_tai_khoan', module: 'nguoi_dung', ma_doi_tuong: uid, noi_dung: `Mở khóa tài khoản ${uid}` }).catch(() => undefined);
}

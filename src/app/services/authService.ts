import { signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { CurrentUserProfile, NguoiDung } from '../types/firebase';
import { addLog } from './auditLogService';
import { getRolePermissions } from './permissionService';

export class FriendlyAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FriendlyAuthError';
  }
}

function mapFirebaseLoginError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (
    code.includes('auth/invalid-credential') ||
    code.includes('auth/user-not-found') ||
    code.includes('auth/wrong-password') ||
    code.includes('auth/invalid-email')
  ) {
    return 'Email hoặc mật khẩu không đúng.';
  }
  return 'Không thể đăng nhập. Vui lòng thử lại sau.';
}

function assertLoginStatus(profile: NguoiDung) {
  if (profile.trang_thai === 'tam_khoa') throw new FriendlyAuthError('Tài khoản đang bị khóa.');
  if (profile.trang_thai === 'ngung_su_dung') throw new FriendlyAuthError('Tài khoản đã ngừng sử dụng.');
  if (!['dang_hoat_dong', 'cho_doi_mat_khau'].includes(profile.trang_thai)) {
    throw new FriendlyAuthError('Tài khoản chưa sẵn sàng để đăng nhập.');
  }
}

export async function getCurrentUserProfile(uid: string): Promise<CurrentUserProfile | null> {
  const userSnap = await getDoc(doc(db, 'nguoi_dung', uid));
  if (!userSnap.exists()) return null;
  const profile = userSnap.data() as NguoiDung;
  const danh_sach_quyen = await getRolePermissions(profile.ma_vai_tro);
  return { ...profile, uid, danh_sach_quyen };
}

export async function login(email: string, password: string) {
  let uid = '';
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    uid = credential.user.uid;
  } catch (error) {
    throw new FriendlyAuthError(mapFirebaseLoginError(error));
  }

  const profile = await getCurrentUserProfile(uid);
  if (!profile) {
    await signOut(auth);
    throw new FriendlyAuthError('Tài khoản chưa được cấp quyền trong hệ thống.');
  }

  try {
    assertLoginStatus(profile);
  } catch (error) {
    await addLog({
      ma_nguoi_dung: profile.uid,
      ten_nguoi_dung: profile.ho_ten,
      hanh_dong: 'dang_nhap_bi_tu_choi',
      module: 'nguoi_dung',
      ma_doi_tuong: profile.uid,
      noi_dung: `Đăng nhập bị từ chối cho ${profile.ho_ten}`,
      muc_do: 'canh_bao',
    }).catch(() => undefined);
    await signOut(auth);
    throw error;
  }

  await updateDoc(doc(db, 'nguoi_dung', uid), {
    lan_dang_nhap_cuoi: serverTimestamp(),
    ngay_cap_nhat: serverTimestamp(),
  }).catch(() => undefined);
  await addLog({
    ma_nguoi_dung: profile.uid,
    ten_nguoi_dung: profile.ho_ten,
    hanh_dong: 'dang_nhap_thanh_cong',
    module: 'nguoi_dung',
    ma_doi_tuong: profile.uid,
    noi_dung: `Đăng nhập thành công: ${profile.ho_ten}`,
  }).catch(() => undefined);

  return profile;
}

export async function logout() {
  await signOut(auth);
}

export async function changeFirstPassword(newPassword: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new FriendlyAuthError('Phiên đăng nhập không còn hợp lệ.');

  await updatePassword(currentUser, newPassword);
  await updateDoc(doc(db, 'nguoi_dung', currentUser.uid), {
    bat_buoc_doi_mat_khau: false,
    trang_thai: 'dang_hoat_dong',
    ngay_cap_nhat: serverTimestamp(),
  });
  await addLog({
    hanh_dong: 'doi_mat_khau_lan_dau',
    module: 'nguoi_dung',
    ma_doi_tuong: currentUser.uid,
    noi_dung: 'Người dùng đổi mật khẩu lần đầu',
  }).catch(() => undefined);
}

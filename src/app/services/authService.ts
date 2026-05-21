import { signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { CurrentUserProfile, NguoiDung } from '../types/firebase';
import { addLog } from './auditLogService';
import { getRoleAuthorization } from './permissionService';

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

function mapFirestoreProfileError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message : '';

  if (code.includes('permission-denied')) {
    return 'Không có quyền đọc dữ liệu người dùng trên Firebase Login. Vui lòng kiểm tra Firestore Rules.';
  }

  if (code.includes('unavailable') || message.includes('client is offline')) {
    return 'Không kết nối được Firestore của Firebase Login. Vui lòng kiểm tra Firestore Database đã được tạo/bật và cấu hình .env đúng project.';
  }

  return 'Không đọc được dữ liệu người dùng từ Firebase Login. Vui lòng thử lại sau.';
}

function mapChangePasswordError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.includes('auth/requires-recent-login')) return 'Phiên đăng nhập đã quá lâu. Vui lòng đăng xuất, đăng nhập lại rồi đổi mật khẩu.';
  if (code.includes('auth/weak-password')) return 'Mật khẩu mới chưa đủ mạnh. Vui lòng dùng ít nhất 8 ký tự.';
  if (code.includes('permission-denied')) return 'Không có quyền cập nhật trạng thái tài khoản. Vui lòng deploy lại Firestore Rules.';
  return 'Không thể đổi mật khẩu. Vui lòng đăng nhập lại và thử tiếp.';
}

export async function getCurrentUserProfile(uid: string): Promise<CurrentUserProfile | null> {
  try {
    const userSnap = await getDoc(doc(db, 'nguoi_dung', uid));
    if (!userSnap.exists()) return null;
    const profile = userSnap.data() as NguoiDung;
    const authorization = await getRoleAuthorization(profile.ma_vai_tro);
    return {
      ...profile,
      uid,
      danh_sach_quyen: authorization.permissions,
      danh_sach_he_thong: authorization.systems,
    };
  } catch (error) {
    throw new FriendlyAuthError(mapFirestoreProfileError(error));
  }
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

  try {
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
  } catch (error) {
    throw new FriendlyAuthError(mapChangePasswordError(error));
  }
}

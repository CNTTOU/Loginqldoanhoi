import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { addLog } from './auditLogService';

export interface LoginAppearanceSettings {
  anh_dang_nhap_url: string;
  anh_dang_nhap_alt: string;
  tieu_de_phu: string;
  ten_don_vi: string;
}

export const defaultLoginAppearanceSettings: LoginAppearanceSettings = {
  anh_dang_nhap_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop',
  anh_dang_nhap_alt: 'Sinh viên làm việc nhóm',
  tieu_de_phu: 'Hệ thống quản lý Đoàn - Hội',
  ten_don_vi: 'Đoàn - Hội Khoa Công nghệ Thông tin',
};

function normalizeSettings(data: Partial<LoginAppearanceSettings>): LoginAppearanceSettings {
  return {
    ...defaultLoginAppearanceSettings,
    ...data,
    anh_dang_nhap_url: String(data.anh_dang_nhap_url || defaultLoginAppearanceSettings.anh_dang_nhap_url).trim(),
    anh_dang_nhap_alt: String(data.anh_dang_nhap_alt || defaultLoginAppearanceSettings.anh_dang_nhap_alt).trim(),
    tieu_de_phu: String(data.tieu_de_phu || defaultLoginAppearanceSettings.tieu_de_phu).trim(),
    ten_don_vi: String(data.ten_don_vi || defaultLoginAppearanceSettings.ten_don_vi).trim(),
  };
}

export async function getLoginAppearanceSettings() {
  try {
    const snap = await getDoc(doc(db, 'cai_dat_dang_nhap', 'giao_dien'));
    if (!snap.exists()) return defaultLoginAppearanceSettings;
    return normalizeSettings(snap.data() as Partial<LoginAppearanceSettings>);
  } catch {
    return defaultLoginAppearanceSettings;
  }
}

export async function updateLoginAppearanceSettings(data: LoginAppearanceSettings) {
  const nextSettings = normalizeSettings(data);
  await setDoc(
    doc(db, 'cai_dat_dang_nhap', 'giao_dien'),
    {
      ...nextSettings,
      ngay_cap_nhat: serverTimestamp(),
    },
    { merge: true },
  );

  await addLog({
    hanh_dong: 'cap_nhat_giao_dien_dang_nhap',
    module: 'cai_dat_dang_nhap',
    ma_doi_tuong: 'giao_dien',
    noi_dung: 'Cập nhật ảnh và nội dung trang đăng nhập',
  }).catch(() => undefined);
}

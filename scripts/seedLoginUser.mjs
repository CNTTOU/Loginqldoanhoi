import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSign } from 'node:crypto';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  const content = readFileSync(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

function getRequiredEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Thiếu biến môi trường ${key}. Kiểm tra file .env của Loginqldoanhoi.`);
  return value;
}

function buildUsername(email) {
  return email.split('@')[0].trim().toLowerCase();
}

function toFirestoreValue(value) {
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }

  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: value };
  if (value === null) return { nullValue: null };
  return { stringValue: String(value) };
}

function toFirestoreFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)]));
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = data?.error?.message || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  return `${unsignedToken}.${base64Url(signer.sign(serviceAccount.private_key))}`;
}

async function getServiceAccountAccessToken(filePath) {
  const serviceAccount = JSON.parse(readFileSync(filePath, 'utf8'));
  const assertion = signJwt(serviceAccount);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const data = await requestJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return data.access_token;
}

async function createOrLoginUser(apiKey, email, password) {
  const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
  const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const body = JSON.stringify({ email, password, returnSecureToken: true });

  try {
    console.log(`Đang tạo tài khoản Auth: ${email}`);
    return await requestJson(signUpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch (error) {
    if (!String(error.message).includes('EMAIL_EXISTS')) throw error;

    console.log('Email đã tồn tại, đăng nhập lại để cập nhật profile Firestore.');
    return requestJson(signInUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }
}

async function setDocument(projectId, accessToken, path, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`;
  await requestJson(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
}

loadEnv();

const apiKey = getRequiredEnv('VITE_IDENTITY_FIREBASE_API_KEY');
const projectId = getRequiredEnv('VITE_IDENTITY_FIREBASE_PROJECT_ID');
const serviceAccountFile = process.env.SEED_SERVICE_ACCOUNT_FILE || resolve(process.cwd(), '..', 'keys', 'login-qldoanhoi.json');

const seedUser = {
  ho_ten: process.env.SEED_HO_TEN || 'Admin Đoàn Hội',
  email: process.env.SEED_EMAIL || 'admin@ou.edu.vn',
  mat_khau: process.env.SEED_PASSWORD || 'Admin@123456',
  ma_don_vi: process.env.SEED_MA_DON_VI || 'cap-goc',
  ten_don_vi: process.env.SEED_TEN_DON_VI || 'Cấp gốc',
  ma_vai_tro: process.env.SEED_MA_VAI_TRO || 'super_admin',
  ten_vai_tro: process.env.SEED_TEN_VAI_TRO || 'Super Admin',
};

const systems = [
  {
    ma_he_thong: 'quan_ly_hoat_dong',
    ten_he_thong: 'Quản lý hoạt động',
    mo_ta: 'Theo dõi hoạt động, minh chứng, duyệt và báo cáo theo phân quyền.',
    duong_dan: '/hoat-dong/dashboard',
  },
];

const permissions = [
  ['quan_ly_nguoi_dung', 'Quản lý người dùng', 'quan_tri_tai_khoan', 'nguoi_dung', false],
  ['tao_tai_khoan', 'Tạo tài khoản', 'quan_tri_tai_khoan', 'nguoi_dung', false],
  ['khoa_tai_khoan', 'Khóa tài khoản', 'quan_tri_tai_khoan', 'nguoi_dung', true],
  ['quan_ly_don_vi', 'Quản lý đơn vị', 'quan_tri_tai_khoan', 'don_vi', false],
  ['quan_ly_phan_quyen', 'Quản lý phân quyền', 'quan_tri_tai_khoan', 'he_thong', true],
  ['xem_hoat_dong', 'Xem hoạt động', 'quan_ly_hoat_dong', 'hoat_dong', false],
  ['them_hoat_dong', 'Thêm hoạt động', 'quan_ly_hoat_dong', 'hoat_dong', false],
  ['sua_hoat_dong', 'Sửa hoạt động', 'quan_ly_hoat_dong', 'hoat_dong', false],
  ['xoa_hoat_dong', 'Xóa hoạt động', 'quan_ly_hoat_dong', 'hoat_dong', true],
  ['gui_duyet_hoat_dong', 'Gửi duyệt hoạt động', 'quan_ly_hoat_dong', 'hoat_dong', false],
  ['duyet_hoat_dong', 'Duyệt hoạt động', 'quan_ly_hoat_dong', 'hoat_dong', false],
  ['yeu_cau_bo_sung_hoat_dong', 'Yêu cầu bổ sung hoạt động', 'quan_ly_hoat_dong', 'hoat_dong', false],
  ['tu_choi_hoat_dong', 'Từ chối hoạt động', 'quan_ly_hoat_dong', 'hoat_dong', false],
  ['quan_ly_minh_chung', 'Quản lý minh chứng', 'quan_ly_hoat_dong', 'minh_chung', false],
  ['xem_bao_cao', 'Xem báo cáo', 'quan_ly_hoat_dong', 'bao_cao', false],
  ['tao_bao_cao', 'Tạo báo cáo', 'quan_ly_hoat_dong', 'bao_cao', false],
  ['cai_dat_he_thong', 'Cài đặt hệ thống', 'quan_ly_hoat_dong', 'he_thong', true],
  ['quan_ly_hoat_dong_noi_bat', 'Chỉnh sửa hoạt động nổi bật', 'quan_ly_hoat_dong', 'he_thong', false],
  ['tao_goi_luu_tru', 'Tạo gói lưu trữ', 'quan_ly_hoat_dong', 'luu_tru', true],
  ['xoa_du_lieu_nam_hoc', 'Xóa dữ liệu năm học', 'quan_ly_hoat_dong', 'luu_tru', true],
];

const defaultPermissions = permissions.map(([maQuyen]) => maQuyen);

const roles = [
  ['super_admin', 'Super Admin', 'Toàn quyền hệ thống', 100, defaultPermissions, ['quan_tri_tai_khoan', 'quan_ly_hoat_dong']],
  ['admin_doan_hoi', 'Admin Đoàn - Hội', 'Quản trị nghiệp vụ Đoàn - Hội', 80, defaultPermissions.filter((permission) => permission !== 'xoa_du_lieu_nam_hoc'), ['quan_tri_tai_khoan', 'quan_ly_hoat_dong']],
  ['ban_chap_hanh', 'Ban Chấp hành', 'Quản lý hoạt động đơn vị', 60, ['xem_hoat_dong', 'them_hoat_dong', 'sua_hoat_dong', 'gui_duyet_hoat_dong', 'quan_ly_minh_chung', 'xem_bao_cao'], ['quan_ly_hoat_dong']],
  ['can_bo_chi_doan_chi_hoi', 'Cán bộ Chi đoàn/Chi hội', 'Tạo hoạt động và minh chứng đơn vị', 40, ['xem_hoat_dong', 'them_hoat_dong', 'sua_hoat_dong', 'gui_duyet_hoat_dong', 'quan_ly_minh_chung'], ['quan_ly_hoat_dong']],
  ['cong_tac_vien', 'Cộng tác viên', 'Nhập nháp hoạt động được phân công', 20, ['xem_hoat_dong', 'them_hoat_dong'], ['quan_ly_hoat_dong']],
  ['nguoi_xem', 'Người xem', 'Chỉ xem dữ liệu được duyệt', 10, ['xem_hoat_dong'], ['quan_ly_hoat_dong']],
];

async function main() {
  const credential = await createOrLoginUser(apiKey, seedUser.email, seedUser.mat_khau);
  const uid = credential.localId;
  console.log(`Đang lấy quyền ghi Firestore bằng service account: ${serviceAccountFile}`);
  const firestoreAccessToken = await getServiceAccountAccessToken(serviceAccountFile);
  const now = new Date().toISOString();

  for (const [index, system] of systems.entries()) {
    console.log(`Đang tạo phân hệ: he_thong/${system.ma_he_thong}`);
    await setDocument(projectId, firestoreAccessToken, `he_thong/${system.ma_he_thong}`, {
      ...system,
      trang_thai: 'dang_su_dung',
      thu_tu: index + 1,
      ngay_tao: now,
      ngay_cap_nhat: now,
    });
  }

  console.log('Đang tạo cấu hình: cai_dat_dang_nhap/giao_dien');
  await setDocument(projectId, firestoreAccessToken, 'cai_dat_dang_nhap/giao_dien', {
    anh_dang_nhap_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop',
    anh_dang_nhap_alt: 'Sinh viên làm việc nhóm',
    tieu_de_phu: 'Hệ thống quản lý Đoàn - Hội',
    ten_don_vi: 'Đoàn - Hội Khoa Công nghệ Thông tin',
    ngay_cap_nhat: now,
  });

  for (const [index, [ma_quyen, ten_quyen, ma_he_thong, nhom_quyen, la_quyen_nguy_hiem]] of permissions.entries()) {
    console.log(`Đang tạo quyền: quyen/${ma_quyen}`);
    await setDocument(projectId, firestoreAccessToken, `quyen/${ma_quyen}`, {
      ma_quyen,
      ma_he_thong,
      ten_quyen,
      nhom_quyen,
      mo_ta: ten_quyen,
      la_quyen_nguy_hiem,
      trang_thai: 'dang_su_dung',
      thu_tu: index + 1,
      ngay_tao: now,
      ngay_cap_nhat: now,
    });
  }

  console.log(`Đang tạo đơn vị: don_vi/${seedUser.ma_don_vi}`);
  await setDocument(projectId, firestoreAccessToken, `don_vi/${seedUser.ma_don_vi}`, {
    ma_don_vi: seedUser.ma_don_vi,
    ten_don_vi: seedUser.ten_don_vi,
    loai_don_vi: 'cap_goc',
    ma_don_vi_cha: '',
    ten_don_vi_cha: '',
    nguoi_phu_trach: seedUser.ho_ten,
    email_lien_he: seedUser.email,
    so_dien_thoai: '',
    trang_thai: 'dang_hoat_dong',
    ngay_tao: now,
    ngay_cap_nhat: now,
  });

  for (const [ma_vai_tro, ten_vai_tro, mo_ta, cap_do, danh_sach_quyen, danh_sach_he_thong] of roles) {
    console.log(`Đang tạo vai trò: vai_tro/${ma_vai_tro}`);
    await setDocument(projectId, firestoreAccessToken, `vai_tro/${ma_vai_tro}`, {
      ma_vai_tro,
      ten_vai_tro,
      mo_ta,
      cap_do,
      la_mac_dinh: ma_vai_tro !== 'super_admin',
      trang_thai: 'dang_hoat_dong',
      danh_sach_quyen,
      danh_sach_he_thong,
      ngay_tao: now,
      ngay_cap_nhat: now,
    });
  }

  console.log(`Đang ghi profile Firestore: nguoi_dung/${uid}`);
  await setDocument(projectId, firestoreAccessToken, `nguoi_dung/${uid}`, {
    uid,
    ho_ten: seedUser.ho_ten,
    email: seedUser.email,
    ten_dang_nhap: buildUsername(seedUser.email),
    ma_don_vi: seedUser.ma_don_vi,
    ten_don_vi: seedUser.ten_don_vi,
    ma_vai_tro: seedUser.ma_vai_tro,
    ten_vai_tro: seedUser.ten_vai_tro,
    trang_thai: 'dang_hoat_dong',
    bat_buoc_doi_mat_khau: false,
    quyen_bo_sung: [],
    quyen_bi_chan: [],
    danh_sach_he_thong: ['quan_tri_tai_khoan', ...systems.map((system) => system.ma_he_thong)],
    lan_dang_nhap_cuoi: null,
    nguoi_tao: 'seed',
    ngay_tao: now,
    ngay_cap_nhat: now,
  });

  console.log(`Đã seed tài khoản Login: ${seedUser.email}`);
  console.log(`UID: ${uid}`);
}

main().catch((error) => {
  console.error('Seed thất bại:', error.message);
  if (error?.data) console.error(JSON.stringify(error.data, null, 2));
  process.exitCode = 1;
});

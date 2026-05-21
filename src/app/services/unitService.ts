import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { DonVi } from '../types/firebase';
import { addLog } from './auditLogService';
import { getCached, invalidateCache } from './cache';

export type UnitSaveInput = Omit<DonVi, 'ten_don_vi_cha'>;
export interface UnitType {
  ma_loai: string;
  ten_loai: string;
  trang_thai: string;
}

export async function getUnits() {
  return getCached('units:all', 2 * 60 * 1000, async () => {
    const snapshot = await getDocs(query(collection(db, 'don_vi'), orderBy('ngay_tao', 'desc')));
    return snapshot.docs.map((item) => ({ ...(item.data() as DonVi), ma_don_vi: item.id }));
  });
}

export async function getUnitTypes() {
  return getCached('unit-types:all', 5 * 60 * 1000, async () => {
    const snapshot = await getDocs(query(collection(db, 'loai_don_vi'), orderBy('ten_loai', 'asc')));
    const unitTypes = snapshot.docs.map((item) => ({ ...(item.data() as UnitType), ma_loai: item.id }));
    return unitTypes.length > 0 ? unitTypes : defaultUnitTypes;
  });
}

export async function createUnitType(data: UnitType) {
  invalidateCache('unit-types:');
  await setDoc(doc(db, 'loai_don_vi', data.ma_loai), {
    ...data,
    ngay_tao: serverTimestamp(),
    ngay_cap_nhat: serverTimestamp(),
  });

  await addLog({
    hanh_dong: 'them_loai_don_vi',
    module: 'don_vi',
    ma_doi_tuong: data.ma_loai,
    noi_dung: `Thêm loại đơn vị ${data.ten_loai}`,
  }).catch(() => undefined);
}

export async function updateUnitType(maLoai: string, data: UnitType) {
  invalidateCache('unit-types:');
  await updateDoc(doc(db, 'loai_don_vi', maLoai), {
    ...data,
    ngay_cap_nhat: serverTimestamp(),
  });

  await addLog({
    hanh_dong: 'sua_loai_don_vi',
    module: 'don_vi',
    ma_doi_tuong: maLoai,
    noi_dung: `Cập nhật loại đơn vị ${data.ten_loai}`,
  }).catch(() => undefined);
}

export async function deleteUnitType(maLoai: string, tenLoai: string) {
  invalidateCache('unit-types:');
  const units = await getDocs(query(collection(db, 'don_vi'), where('loai_don_vi', '==', maLoai), limit(1)));
  if (!units.empty) throw new Error('Không thể xóa loại đơn vị đang được sử dụng.');

  await deleteDoc(doc(db, 'loai_don_vi', maLoai));
  await addLog({
    hanh_dong: 'xoa_loai_don_vi',
    module: 'don_vi',
    ma_doi_tuong: maLoai,
    noi_dung: `Xóa loại đơn vị ${tenLoai}`,
    muc_do: 'canh_bao',
  }).catch(() => undefined);
}

async function hasRelatedData(maDonVi: string) {
  const users = await getDocs(query(collection(db, 'nguoi_dung'), where('ma_don_vi', '==', maDonVi), limit(1)));
  return !users.empty;
}

function getParentName(units: DonVi[], maDonViCha: string) {
  if (!maDonViCha) return '';
  return units.find((unit) => unit.ma_don_vi === maDonViCha)?.ten_don_vi ?? '';
}

export async function createUnit(data: UnitSaveInput, units: DonVi[]) {
  invalidateCache('units:');
  const tenDonViCha = getParentName(units, data.ma_don_vi_cha);

  await setDoc(doc(db, 'don_vi', data.ma_don_vi), {
    ...data,
    ten_don_vi_cha: tenDonViCha,
    ngay_tao: serverTimestamp(),
    ngay_cap_nhat: serverTimestamp(),
  });

  await addLog({
    hanh_dong: 'them_don_vi',
    module: 'don_vi',
    ma_doi_tuong: data.ma_don_vi,
    noi_dung: `Thêm đơn vị ${data.ten_don_vi}`,
  }).catch(() => undefined);
}

export async function updateUnit(maDonVi: string, data: UnitSaveInput, units: DonVi[]) {
  invalidateCache('units:');
  const tenDonViCha = getParentName(units, data.ma_don_vi_cha);

  await updateDoc(doc(db, 'don_vi', maDonVi), {
    ...data,
    ten_don_vi_cha: tenDonViCha,
    ngay_cap_nhat: serverTimestamp(),
  });

  await addLog({
    hanh_dong: 'sua_don_vi',
    module: 'don_vi',
    ma_doi_tuong: maDonVi,
    noi_dung: `Cập nhật đơn vị ${data.ten_don_vi}`,
  }).catch(() => undefined);
}

export async function deactivateUnit(maDonVi: string, tenDonVi: string) {
  invalidateCache('units:');
  await updateDoc(doc(db, 'don_vi', maDonVi), {
    trang_thai: 'ngung_hoat_dong',
    ngay_cap_nhat: serverTimestamp(),
  });

  await addLog({
    hanh_dong: 'khoa_don_vi',
    module: 'don_vi',
    ma_doi_tuong: maDonVi,
    noi_dung: `Ngừng sử dụng đơn vị ${tenDonVi}`,
    muc_do: 'canh_bao',
  }).catch(() => undefined);
}

export async function deleteOrDeactivateUnit(unit: DonVi) {
  invalidateCache('units:');
  if (await hasRelatedData(unit.ma_don_vi)) {
    await deactivateUnit(unit.ma_don_vi, unit.ten_don_vi);
    return 'deactivated' as const;
  }

  await deleteDoc(doc(db, 'don_vi', unit.ma_don_vi));
  await addLog({
    hanh_dong: 'xoa_don_vi',
    module: 'don_vi',
    ma_doi_tuong: unit.ma_don_vi,
    noi_dung: `Xóa đơn vị ${unit.ten_don_vi}`,
    muc_do: 'nguy_hiem',
  }).catch(() => undefined);

  return 'deleted' as const;
}

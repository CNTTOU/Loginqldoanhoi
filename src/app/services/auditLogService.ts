import { addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuditLogInput {
  hanh_dong: string;
  module: string;
  ma_doi_tuong?: string;
  noi_dung: string;
  muc_do?: string;
  ma_nguoi_dung?: string;
  ten_nguoi_dung?: string;
}

export async function addLog(input: AuditLogInput) {
  const currentUser = auth.currentUser;
  const ref = await addDoc(collection(db, 'nhat_ky_he_thong'), {
    ma_nguoi_dung: input.ma_nguoi_dung ?? currentUser?.uid ?? '',
    ten_nguoi_dung: input.ten_nguoi_dung ?? currentUser?.displayName ?? currentUser?.email ?? '',
    hanh_dong: input.hanh_dong,
    module: input.module,
    ma_doi_tuong: input.ma_doi_tuong ?? '',
    noi_dung: input.noi_dung,
    muc_do: input.muc_do ?? 'thong_tin',
    dia_chi_ip: '',
    thoi_gian: serverTimestamp(),
  });
  await updateDoc(ref, { ma_nhat_ky: ref.id }).catch(() => undefined);
}

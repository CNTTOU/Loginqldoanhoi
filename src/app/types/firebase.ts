import type { Timestamp } from 'firebase/firestore';

export type TrangThaiNguoiDung =
  | 'dang_hoat_dong'
  | 'tam_khoa'
  | 'cho_doi_mat_khau'
  | 'ngung_su_dung';

export interface NguoiDung {
  uid: string;
  ho_ten: string;
  email: string;
  ten_dang_nhap: string;
  ma_don_vi: string;
  ten_don_vi: string;
  ma_vai_tro: string;
  ten_vai_tro: string;
  trang_thai: TrangThaiNguoiDung;
  bat_buoc_doi_mat_khau: boolean;
  lan_dang_nhap_cuoi?: Timestamp | null;
  ngay_tao?: Timestamp;
  nguoi_tao?: string;
  ngay_cap_nhat?: Timestamp;
}

export interface CurrentUserProfile extends NguoiDung {
  danh_sach_quyen: string[];
}

export interface VaiTro {
  ma_vai_tro: string;
  ten_vai_tro: string;
  mo_ta: string;
  cap_do: number;
  la_mac_dinh: boolean;
  trang_thai: string;
  danh_sach_quyen: string[];
}

export interface DonVi {
  ma_don_vi: string;
  ten_don_vi: string;
  loai_don_vi: string;
  ma_don_vi_cha: string;
  ten_don_vi_cha: string;
  nguoi_phu_trach: string;
  email_lien_he: string;
  so_dien_thoai: string;
  trang_thai: string;
}

export interface CreateInternalUserInput {
  ho_ten: string;
  email: string;
  mat_khau_tam_thoi: string;
  ma_don_vi: string;
  ma_vai_tro: string;
  trang_thai?: TrangThaiNguoiDung;
  bat_buoc_doi_mat_khau?: boolean;
}

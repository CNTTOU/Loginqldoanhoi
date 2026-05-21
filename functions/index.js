const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

async function getRequesterProfile(uid) {
  const snap = await admin.firestore().doc(`nguoi_dung/${uid}`).get();
  if (!snap.exists) return null;
  return { uid, ...snap.data() };
}

async function getRolePermissions(maVaiTro) {
  if (!maVaiTro) return [];
  const snap = await admin.firestore().doc(`vai_tro/${maVaiTro}`).get();
  if (!snap.exists) return [];
  const permissions = snap.data()?.danh_sach_quyen;
  return Array.isArray(permissions) ? permissions : [];
}

exports.deleteUserAccount = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Bạn cần đăng nhập để thực hiện thao tác này.");
    }

    const requester = await getRequesterProfile(request.auth.uid);
    const requesterPermissions = await getRolePermissions(requester?.ma_vai_tro);
    const canManageUsers = requester?.ma_vai_tro === "super_admin" || requesterPermissions.includes("quan_ly_nguoi_dung");
    if (!requester || !canManageUsers) {
      throw new HttpsError("permission-denied", "Bạn không có quyền xóa tài khoản.");
    }

    const uid = String(request.data?.uid ?? "").trim();
    if (!uid) {
      throw new HttpsError("invalid-argument", "Thiếu uid tài khoản cần xóa.");
    }

    if (uid === request.auth.uid) {
      throw new HttpsError("failed-precondition", "Không thể tự xóa tài khoản đang đăng nhập.");
    }

    const targetRef = admin.firestore().doc(`nguoi_dung/${uid}`);
    const targetSnap = await targetRef.get();
    const target = targetSnap.exists ? targetSnap.data() : null;
    if (!target) {
      throw new HttpsError("not-found", "Không tìm thấy tài khoản cần xóa.");
    }

    if (target.ma_vai_tro === "super_admin" && requester.ma_vai_tro !== "super_admin") {
      throw new HttpsError("permission-denied", "Chỉ super_admin được xóa tài khoản super_admin.");
    }

    await admin.auth().deleteUser(uid).catch((error) => {
      if (error.code !== "auth/user-not-found") throw error;
    });

    await targetRef.delete();

    await admin.firestore().collection("nhat_ky_he_thong").add({
      ma_nguoi_dung: request.auth.uid,
      ten_nguoi_dung: requester.ho_ten ?? "",
      hanh_dong: "xoa_tai_khoan",
      module: "nguoi_dung",
      ma_doi_tuong: uid,
      noi_dung: `Xóa tài khoản ${target?.ho_ten ?? uid}`,
      muc_do: "nguy_hiem",
      dia_chi_ip: "",
      thoi_gian: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("deleteUserAccount failed", error);
    throw new HttpsError("internal", error?.message || "Không thể xóa tài khoản do lỗi Cloud Function.");
  }
});

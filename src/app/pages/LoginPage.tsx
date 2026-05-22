import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Database,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { defaultLoginAppearanceSettings, getLoginAppearanceSettings, type LoginAppearanceSettings } from "../services/loginAppearanceService";

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, error, login, logout, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [appearance, setAppearance] = useState<LoginAppearanceSettings>(defaultLoginAppearanceSettings);
  const reason = params.get("reason") ?? "";
  const hasLogoutFlag = params.get("logout") === "1";

  const message = useMemo(
    () => localError || error || reason,
    [error, localError, reason],
  );

  useEffect(() => {
    getLoginAppearanceSettings().then(setAppearance).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hasLogoutFlag) return;
    logout().finally(() => {
      const nextReason = reason ? `?reason=${encodeURIComponent(reason)}` : "";
      navigate(`/${nextReason}`, { replace: true });
    });
  }, [hasLogoutFlag, logout, navigate, reason]);

  useEffect(() => {
    if (!user || hasLogoutFlag) return;
    if (user.bat_buoc_doi_mat_khau || user.trang_thai === "cho_doi_mat_khau") {
      navigate("/doi-mat-khau", { replace: true });
      return;
    }
    navigate("/chon-he-thong", { replace: true });
  }, [hasLogoutFlag, navigate, user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    clearError();
    setLocalError("");

    if (!email.trim() || !password) {
      setLocalError("Vui lòng nhập email và mật khẩu.");
      return;
    }

    try {
      const profile = await login(email.trim(), password);
      if (
        profile.bat_buoc_doi_mat_khau ||
        profile.trang_thai === "cho_doi_mat_khau"
      ) {
        navigate("/doi-mat-khau", { replace: true });
        return;
      }
      navigate("/chon-he-thong", { replace: true });
    } catch (loginError) {
      const friendlyMessage =
        loginError instanceof Error
          ? loginError.message
          : "Đăng nhập không thành công.";
      setLocalError(friendlyMessage);
    }
  }

  return (
    <main className="flex min-h-screen bg-gray-50">
      <section className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 lg:flex">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex w-full flex-col items-center justify-center px-16 text-white">
          <div className="mb-12 overflow-hidden rounded-2xl border-4 border-white/20 shadow-2xl">
            <img
              src={appearance.anh_dang_nhap_url}
              alt={appearance.anh_dang_nhap_alt}
              className="h-64 w-full object-cover"
            />
          </div>

          <div className="grid w-full max-w-md grid-cols-2 gap-6">
            <div className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
              <Database className="mb-3 h-10 w-10 text-cyan-300" />
              <h3 className="mb-2 text-lg font-semibold">Lưu trữ dữ liệu</h3>
              <p className="text-sm text-white/80">Quản lý tài liệu an toàn</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
              <ImageIcon className="mb-3 h-10 w-10 text-yellow-300" />
              <h3 className="mb-2 text-lg font-semibold">Hình ảnh</h3>
              <p className="text-sm text-white/80">Kho ảnh hoạt động</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
              <FileText className="mb-3 h-10 w-10 text-cyan-300" />
              <h3 className="mb-2 text-lg font-semibold">Báo cáo</h3>
              <p className="text-sm text-white/80">Tổng hợp hoạt động</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
              <FileSpreadsheet className="mb-3 h-10 w-10 text-yellow-300" />
              <h3 className="mb-2 text-lg font-semibold">Tra cứu</h3>
              <p className="text-sm text-white/80">Tìm kiếm nhanh chóng</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <h2 className="mb-2 text-2xl font-semibold text-cyan-200">
              {appearance.tieu_de_phu}
            </h2>
            <p className="text-white/80">{appearance.ten_don_vi}</p>
          </div>
        </div>
      </section>

      <section className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-cyan-600 shadow-lg">
              <User className="h-12 w-12 text-white" />
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-2xl font-semibold text-blue-900">
                Đăng nhập hệ thống
              </h1>
              <p className="text-gray-600">Hệ thống quản lý Đoàn - Hội</p>
            </div>

            {message && (
              <div
                className={`mb-5 rounded-lg border px-4 py-3 text-sm ${localError || error ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}
              >
                {message}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  className="mb-2 block font-medium text-gray-700"
                  htmlFor="email"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-12 pr-4 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label
                  className="mb-2 block font-medium text-gray-700"
                  htmlFor="password"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-12 pr-12 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-cyan-600 transition-colors hover:text-cyan-700"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button
                disabled={loading || hasLogoutFlag}
                className="w-full rounded-xl bg-gradient-to-r from-blue-900 to-cyan-700 py-3 font-semibold text-white shadow-lg transition-all hover:from-blue-800 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-70"
                type="submit"
              >
                {loading || hasLogoutFlag ? "Đang xử lý..." : "Đăng nhập"}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              © 2026 Đoàn - Hội Khoa Công nghệ Thông tin
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

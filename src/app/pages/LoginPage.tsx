import {
  Mail,
  Lock,
  User,
  FileText,
  Database,
  Image as ImageIcon,
  FileSpreadsheet,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, user, loading, authError, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isLogoutFlow = searchParams.get('logout') === '1';
  const reason = searchParams.get('reason');
  const systemSelectUrl = `/login/chon-he-thong${location.search}`;

  useEffect(() => {
    if (!isLogoutFlow || loading) return;

    let cancelled = false;

    const finishLogoutFlow = async () => {
      if (user) {
        await logout().catch(() => undefined);
      }

      if (!cancelled) {
        const nextSearch = reason ? `?reason=${encodeURIComponent(reason)}` : '';
        navigate(`/${nextSearch}`, { replace: true });
      }
    };

    void finishLogoutFlow();

    return () => {
      cancelled = true;
    };
  }, [isLogoutFlow, loading, user, logout, navigate, reason]);

  if (!loading && user && !isLogoutFlow) {
    if (user.bat_buoc_doi_mat_khau || user.trang_thai === 'cho_doi_mat_khau') {
      return <Navigate to="/doi-mat-khau" replace />;
    }
    return <Navigate to={`/chon-he-thong${location.search}`} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const profile = await login(email, password);
      if (profile.bat_buoc_doi_mat_khau || profile.trang_thai === 'cho_doi_mat_khau') {
        navigate('/doi-mat-khau', { replace: true });
        return;
      }
      window.location.replace(systemSelectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="size-full min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-cyan-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-20 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl"></div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-16 text-white">
          <div className="mb-12 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop"
              alt="Sinh viên làm việc nhóm"
              className="w-full h-64 object-cover"
            />
          </div>

          <div className="grid grid-cols-2 gap-6 w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <Database className="w-10 h-10 mb-3 text-cyan-300" />
              <h3 className="mb-2">Lưu trữ dữ liệu</h3>
              <p className="text-sm text-white/80">Quản lý tài liệu an toàn</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <ImageIcon className="w-10 h-10 mb-3 text-yellow-300" />
              <h3 className="mb-2">Hình ảnh</h3>
              <p className="text-sm text-white/80">Kho ảnh hoạt động</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <FileText className="w-10 h-10 mb-3 text-cyan-300" />
              <h3 className="mb-2">Báo cáo</h3>
              <p className="text-sm text-white/80">Tổng hợp hoạt động</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <FileSpreadsheet className="w-10 h-10 mb-3 text-yellow-300" />
              <h3 className="mb-2">Tra cứu</h3>
              <p className="text-sm text-white/80">Tìm kiếm nhanh chóng</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <h2 className="mb-2 text-cyan-200">Hệ thống quản lý Đoàn - Hội</h2>
            <p className="text-white/80">Đoàn - Hội Khoa Công nghệ Thông tin</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-900 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
              <User className="w-12 h-12 text-white" />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-200">
            <div className="text-center mb-8">
              <h1 className="text-blue-900 mb-2">Đăng nhập hệ thống</h1>
              <p className="text-gray-600">Cổng tài khoản nội bộ</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {(error || authError || reason) && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error || authError || reason}
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-gray-700 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="your.email@example.com" className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" required />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-gray-700 mb-2">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-blue-900 to-cyan-700 text-white py-3 rounded-xl hover:from-blue-800 hover:to-cyan-600 transition-all shadow-lg disabled:cursor-not-allowed disabled:opacity-70">
                {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">© 2026 Đoàn - Hội Khoa Công nghệ Thông tin</p>
          </div>
        </div>
      </div>
    </div>
  );
}

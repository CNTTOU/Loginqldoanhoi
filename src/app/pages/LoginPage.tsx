import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRedirectAfterLogin } from '../utils/urls';

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, error, login, logout, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const reason = params.get('reason') ?? '';
  const hasLogoutFlag = params.get('logout') === '1';

  const message = useMemo(() => localError || error || reason, [error, localError, reason]);

  useEffect(() => {
    if (!hasLogoutFlag) return;
    logout().finally(() => {
      const nextReason = reason ? `?reason=${encodeURIComponent(reason)}` : '';
      navigate(`/${nextReason}`, { replace: true });
    });
  }, [hasLogoutFlag, logout, navigate, reason]);

  useEffect(() => {
    if (!user || hasLogoutFlag) return;
    if (user.bat_buoc_doi_mat_khau || user.trang_thai === 'cho_doi_mat_khau') {
      navigate('/doi-mat-khau', { replace: true });
      return;
    }
    window.location.replace(getRedirectAfterLogin(window.location.search));
  }, [hasLogoutFlag, navigate, user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    clearError();
    setLocalError('');

    if (!email.trim() || !password) {
      setLocalError('Vui lòng nhập email và mật khẩu.');
      return;
    }

    try {
      const profile = await login(email.trim(), password);
      if (profile.bat_buoc_doi_mat_khau || profile.trang_thai === 'cho_doi_mat_khau') {
        navigate('/doi-mat-khau', { replace: true });
        return;
      }
      window.location.replace(getRedirectAfterLogin(window.location.search));
    } catch (loginError) {
      const friendlyMessage = loginError instanceof Error ? loginError.message : 'Đăng nhập không thành công.';
      setLocalError(friendlyMessage);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-7">
          <p className="text-sm font-medium uppercase tracking-wide text-blue-700">Quản lý Đoàn - Hội</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Đăng nhập hệ thống</h1>
          <p className="mt-2 text-sm text-slate-600">Tài khoản nội bộ do quản trị viên cấp, không hỗ trợ tự đăng ký.</p>
        </div>

        {message && (
          <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${localError || error ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
            {message}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <span className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:border-blue-600">
              <Mail className="h-4 w-4 text-slate-400" />
              <input className="w-full bg-transparent text-sm outline-none" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Mật khẩu</span>
            <span className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:border-blue-600">
              <Lock className="h-4 w-4 text-slate-400" />
              <input className="w-full bg-transparent text-sm outline-none" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
              <button type="button" className="text-slate-500" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          <button disabled={loading || hasLogoutFlag} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70" type="submit">
            {loading || hasLogoutFlag ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>
      </section>
    </main>
  );
}

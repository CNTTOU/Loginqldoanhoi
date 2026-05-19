import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changeFirstPassword } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Mật khẩu mới cần tối thiểu 8 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setLoading(true);
    try {
      await changeFirstPassword(password);
      await refreshUser();
      navigate('/chon-he-thong', { replace: true });
    } catch {
      setError('Không thể đổi mật khẩu. Vui lòng đăng nhập lại và thử tiếp.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">Đổi mật khẩu lần đầu</h1>
        <p className="mt-2 text-sm text-slate-600">Bạn cần đặt mật khẩu mới trước khi vào hệ thống.</p>

        {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Mật khẩu mới</span>
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nhập lại mật khẩu mới</span>
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </label>
          <button disabled={loading} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-70" type="submit">
            {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </button>
        </form>
      </section>
    </main>
  );
}

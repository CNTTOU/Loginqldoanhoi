import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { changeFirstPassword } from '../services/authService';

export function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (newPassword.length < 8) return setError('Mật khẩu mới phải có tối thiểu 8 ký tự.');
    if (newPassword !== confirmPassword) return setError('Mật khẩu nhập lại không khớp.');

    setLoading(true);
    try {
      await changeFirstPassword(newPassword);
      await refreshUser();
      navigate('/chon-he-thong', { replace: true });
    } catch {
      setError('Không thể đổi mật khẩu. Vui lòng đăng nhập lại rồi thử tiếp.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 grid place-items-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-700 text-white">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Đổi mật khẩu lần đầu</h1>
          <p className="mt-2 text-sm text-gray-500">Vui lòng đặt mật khẩu mới trước khi vào hệ thống.</p>
        </div>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <label className="mb-2 block text-sm text-gray-700" htmlFor="new-password">Mật khẩu mới</label>
        <input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3" required />
        <label className="mb-2 block text-sm text-gray-700" htmlFor="confirm-password">Nhập lại mật khẩu mới</label>
        <input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mb-6 w-full rounded-lg border border-gray-300 px-4 py-3" required />
        <button disabled={loading} className="w-full rounded-lg bg-blue-700 px-4 py-3 text-white hover:bg-blue-800 disabled:opacity-70">{loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</button>
        <button type="button" onClick={() => navigate('/')} className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 hover:bg-gray-50">Quay lại đăng nhập</button>
      </form>
    </div>
  );
}

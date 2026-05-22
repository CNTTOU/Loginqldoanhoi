import { FormEvent, useEffect, useState } from 'react';
import { Image, Save } from 'lucide-react';
import {
  defaultLoginAppearanceSettings,
  getLoginAppearanceSettings,
  updateLoginAppearanceSettings,
  type LoginAppearanceSettings,
} from '../services/loginAppearanceService';

export function LoginAppearancePage() {
  const [settings, setSettings] = useState<LoginAppearanceSettings>(defaultLoginAppearanceSettings);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLoginAppearanceSettings()
      .then(setSettings)
      .catch(() => setMessage('Không thể tải cấu hình trang đăng nhập.'));
  }, []);

  function updateField(field: keyof LoginAppearanceSettings, value: string) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!settings.anh_dang_nhap_url.trim()) {
      setMessage('Vui lòng nhập URL ảnh đăng nhập.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      await updateLoginAppearanceSettings(settings);
      setMessage('Đã lưu cấu hình trang đăng nhập.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu cấu hình trang đăng nhập.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Image className="h-7 w-7 text-blue-700" />
          <h1 className="text-2xl font-semibold text-slate-950">Giao diện đăng nhập</h1>
        </div>
        <p className="mt-1 text-sm text-slate-600">Hiệu chỉnh ảnh và nội dung hiển thị ở màn hình đăng nhập.</p>
      </div>

      {message && <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">URL ảnh đăng nhập</span>
              <input
                value={settings.anh_dang_nhap_url}
                onChange={(event) => updateField('anh_dang_nhap_url', event.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Mô tả ảnh</span>
              <input
                value={settings.anh_dang_nhap_alt}
                onChange={(event) => updateField('anh_dang_nhap_alt', event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Tiêu đề phụ</span>
              <input
                value={settings.tieu_de_phu}
                onChange={(event) => updateField('tieu_de_phu', event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Tên đơn vị</span>
              <input
                value={settings.ten_don_vi}
                onChange={(event) => updateField('ten_don_vi', event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
              <Save className="h-4 w-4" />
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-950">Xem trước</h2>
          <div className="overflow-hidden rounded-2xl border-4 border-slate-100 shadow-lg">
            <img
              src={settings.anh_dang_nhap_url || defaultLoginAppearanceSettings.anh_dang_nhap_url}
              alt={settings.anh_dang_nhap_alt || defaultLoginAppearanceSettings.anh_dang_nhap_alt}
              className="h-56 w-full object-cover"
            />
          </div>
          <div className="mt-5 rounded-xl bg-gradient-to-br from-blue-900 to-cyan-700 p-5 text-center text-white">
            <h3 className="text-xl font-semibold text-cyan-100">{settings.tieu_de_phu}</h3>
            <p className="mt-2 text-sm text-white/80">{settings.ten_don_vi}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

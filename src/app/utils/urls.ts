const ADMIN_BASE_PATH = '/hoat-dong';

export function getAdminUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${ADMIN_BASE_PATH}${normalizedPath}`;
}

export function getRedirectAfterLogin(search: string) {
  const params = new URLSearchParams(search);
  const redirect = params.get('redirect');
  if (!redirect) return '/login/chon-he-thong';
  if (redirect.startsWith('/hoat-dong/')) return redirect;
  if (redirect.startsWith('/login/')) return redirect;
  return '/login/chon-he-thong';
}

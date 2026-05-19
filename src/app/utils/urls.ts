function getAdminBase() {
  const adminAppUrl = import.meta.env.VITE_ADMIN_APP_URL || "/hoat-dong";
  const normalized = adminAppUrl.endsWith("/") ? adminAppUrl : `${adminAppUrl}/`;
  return new URL(normalized, window.location.origin);
}

export function getAdminUrl(path = "dashboard") {
  const base = getAdminBase();
  const relative = path.replace(/^\/+/, "");
  return new URL(relative, base).toString();
}

function isPublicAdminPath(pathname: string) {
  const adminPath = getAdminBase().pathname.replace(/\/$/, "");
  const normalized = pathname.replace(/\/$/, "") || adminPath;
  return normalized === adminPath || normalized === `${adminPath}/featured`;
}

export function getRedirectUrl(search: string) {
  const dashboardUrl = getAdminUrl("dashboard");
  const params = new URLSearchParams(search);
  const redirect = params.get("redirect");
  if (!redirect) return dashboardUrl;

  const target = new URL(redirect, window.location.origin);
  if (isPublicAdminPath(target.pathname)) {
    return dashboardUrl;
  }

  const adminPath = getAdminBase().pathname.replace(/\/$/, "");

  if (
    target.pathname === adminPath ||
    target.pathname.startsWith(`${adminPath}/`)
  ) {
    return target.toString();
  }

  return getAdminUrl(redirect);
}

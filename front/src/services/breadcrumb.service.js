let current = null;

export function setBreadcrumbContext(data) {
  const pathname = window.location.pathname;
  current = { pathname, data };
  window.dispatchEvent(new CustomEvent("musimo:breadcrumb-context", { detail: current }));
}

export function getBreadcrumbContext(pathname) {
  return current?.pathname === pathname ? current.data : null;
}

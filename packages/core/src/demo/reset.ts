/** Bắt đầu demo như người mới: xóa tiến độ chơi thử cũ (cookie `sc_guest`) trước khi ứng dụng đọc nó. */
export function resetDemoProgress(): void {
  if (typeof document === 'undefined') return;
  const past = 'Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = `sc_guest=; expires=${past}; path=/`;
  const host = location.hostname.split('.');
  if (host.length > 1) document.cookie = `sc_guest=; expires=${past}; path=/; domain=.${host.slice(-2).join('.')}`;
}

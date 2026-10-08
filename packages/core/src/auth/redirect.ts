/**
 * Hàm thuần: chỉ chấp nhận đường dẫn trong cùng trang ("/ho-so", "/lang/lang-giay/man/1?x=1").
 * Từ chối địa chỉ ngoài ("https://…", "//…", "/\\…") để không bị dẫn sang trang lạ sau khi đăng nhập.
 * Không hợp lệ thì trả null.
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (/[\u0000-\u001f]/.test(raw)) return null;
  return raw;
}

/** Địa chỉ trang đăng nhập kèm nơi sẽ quay lại sau khi đăng nhập xong. */
export function loginPathFor(next: string | null | undefined): string {
  const n = safeNext(next);
  return n ? `/dang-nhap?next=${encodeURIComponent(n)}` : '/dang-nhap';
}

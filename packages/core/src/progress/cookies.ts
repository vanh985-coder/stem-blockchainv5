import { AUTH_CONFIG } from '../auth/config';

export const GUEST_COOKIE = 'sc_guest';
export const PENDING_COOKIE = 'sc_pending';
export const COOKIE_DAYS = 180;

export interface CookieOptions {
  /** Tên miền cha (VITE_COOKIE_DOMAIN); trống khi chạy localhost */
  domain?: string;
  /** Chỉ thêm Secure khi trang chạy https, để localhost vẫn chạy */
  secure?: boolean;
  days?: number;
}

/** Hàm thuần: chuỗi Set-Cookie cho document.cookie. Path=/; SameSite=Lax; 180 ngày. */
export function buildCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const days = opts.days ?? COOKIE_DAYS;
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax', `Max-Age=${Math.round(days * 86400)}`];
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

/** Hàm thuần: chuỗi xóa cookie (cùng Path và Domain với lúc ghi). */
export function buildCookieRemoval(name: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=`, 'Path=/', 'SameSite=Lax', 'Max-Age=0'];
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

/** Hàm thuần: lấy giá trị một cookie từ chuỗi document.cookie. */
export function readCookie(header: string, name: string): string | null {
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

/** Cookie trong trình duyệt thật. */
export const browserCookies = {
  get(name: string): string | null {
    return typeof document === 'undefined' ? null : readCookie(document.cookie, name);
  },
  set(name: string, value: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = buildCookie(name, value, { domain: AUTH_CONFIG.cookieDomain, secure: location.protocol === 'https:' });
  },
  remove(name: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = buildCookieRemoval(name, { domain: AUTH_CONFIG.cookieDomain, secure: location.protocol === 'https:' });
  },
};

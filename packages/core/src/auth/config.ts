export interface AuthEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_USERNAME_EMAIL_DOMAIN?: string;
  VITE_COOKIE_DOMAIN?: string;
}

export interface AuthConfig {
  /** Có đủ địa chỉ Supabase và khóa công khai (publishable/anon) */
  configured: boolean;
  /** Tài khoản tên đăng nhập dùng được: đã cấu hình và có tên miền email nội bộ */
  usernameEnabled: boolean;
  url: string;
  anonKey: string;
  /** Tên miền của email nội bộ cho tài khoản tên đăng nhập; trống thì chưa dùng được tài khoản tên đăng nhập */
  emailDomain: string;
  /** Tên miền của cookie phiên (ví dụ .ten-mien.vn); trống khi chạy localhost */
  cookieDomain: string | undefined;
}

const clean = (v: string | undefined) => (v ?? '').trim();

/** Hàm thuần: đọc cấu hình đăng nhập từ biến môi trường. Thiếu URL hoặc khóa thì configured = false, app vẫn chạy. */
export function readAuthConfig(env: AuthEnv): AuthConfig {
  const url = clean(env.VITE_SUPABASE_URL).replace(/\/+$/, '');
  const anonKey = clean(env.VITE_SUPABASE_ANON_KEY);
  const emailDomain = clean(env.VITE_USERNAME_EMAIL_DOMAIN).replace(/^@+/, '');
  return {
    configured: url !== '' && anonKey !== '',
    usernameEnabled: url !== '' && anonKey !== '' && emailDomain !== '',
    url,
    anonKey,
    emailDomain,
    cookieDomain: clean(env.VITE_COOKIE_DOMAIN) || undefined,
  };
}

/**
 * Hàm thuần: tùy chọn cookie phiên Supabase (spec 02 mục 2). Có VITE_COOKIE_DOMAIN thì cookie dùng chung mọi subdomain;
 * trang chạy https thì thêm Secure (localhost http thì không, để vẫn chạy được).
 */
export function sessionCookieOptions(cookieDomain: string | undefined, protocol: string) {
  return {
    domain: cookieDomain, // để trống trên localhost
    path: '/',
    sameSite: 'lax' as const,
    secure: protocol === 'https:',
  };
}

// Vite thay chuỗi import.meta.env.VITE_* lúc build.
export const AUTH_CONFIG: AuthConfig = readAuthConfig({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_USERNAME_EMAIL_DOMAIN: import.meta.env.VITE_USERNAME_EMAIL_DOMAIN,
  VITE_COOKIE_DOMAIN: import.meta.env.VITE_COOKIE_DOMAIN,
});

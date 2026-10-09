import { describe, expect, it } from 'vitest';
import { GUEST_COOKIE, PENDING_COOKIE, buildCookie, buildCookieRemoval } from '../progress/cookies';
import { readAuthConfig, sessionCookieOptions } from './config';

// Cấu hình thật khi chạy trên https://*.blockchainptit.com (docs/DEPLOY.md)
const PROD = readAuthConfig({
  VITE_SUPABASE_URL: 'https://x.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_x',
  VITE_USERNAME_EMAIL_DOMAIN: 'hs.blockchainptit.com',
  VITE_COOKIE_DOMAIN: '.blockchainptit.com',
});

describe('cookie dùng chung .blockchainptit.com', () => {
  it('cookie phiên Supabase: Domain=.blockchainptit.com và Secure khi trang chạy https', () => {
    expect(sessionCookieOptions(PROD.cookieDomain, 'https:')).toEqual({
      domain: '.blockchainptit.com',
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
  });

  it('chạy localhost (http, không có VITE_COOKIE_DOMAIN): không Domain, không Secure', () => {
    const local = readAuthConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' });
    expect(sessionCookieOptions(local.cookieDomain, 'http:')).toEqual({ domain: undefined, path: '/', sameSite: 'lax', secure: false });
  });

  it.each([GUEST_COOKIE, PENDING_COOKIE])('cookie %s: Domain=.blockchainptit.com, Secure, Path=/, SameSite=Lax', (name) => {
    const set = buildCookie(name, '{"v":1}', { domain: PROD.cookieDomain, secure: true });
    expect(set).toContain('Domain=.blockchainptit.com');
    expect(set).toContain('Secure');
    expect(set).toContain('Path=/');
    expect(set).toContain('SameSite=Lax');
    // Xóa cookie phải cùng Domain và Secure thì trình duyệt mới xóa đúng cookie đó
    const del = buildCookieRemoval(name, { domain: PROD.cookieDomain, secure: true });
    expect(del).toContain('Domain=.blockchainptit.com');
    expect(del).toContain('Secure');
    expect(del).toContain('Max-Age=0');
  });

  it('http (localhost) thì không thêm Secure để vẫn ghi được', () => {
    expect(buildCookie(GUEST_COOKIE, 'x', { secure: false })).not.toContain('Secure');
  });
});

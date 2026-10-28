import { describe, expect, it } from 'vitest';
import { readAuthConfig, sessionCookieOptions } from '../auth/config';
import { LEVELS } from '../content/levels';
import { decodeProgress, encodeProgress } from './compact';
import { GUEST_COOKIE, buildCookie, buildCookieRemoval, readCookie } from './cookies';

/**
 * Gộp 4 làng vào hub (bước G1, spec 10 mục 2): các làng và hub dùng chung một tên miền cha qua `VITE_COOKIE_DOMAIN` ngay từ đầu (spec 02 mục 2), nên gộp web KHÔNG đổi tên cookie, `Domain`, `Path` hay định dạng tiến độ:
 * người chơi cũ có `sc_guest` và cookie phiên ghi ở tên miền chung vẫn đọc được ở web chính. Các ca dưới đây khóa lại điều đó.
 */
describe('cookie và tiến độ khi gộp web', () => {
  const DOMAIN = '.blockchainptit.com';

  it('chuỗi ghi cookie tiến độ giữ nguyên (tên, Path, SameSite, 180 ngày, Domain tên miền cha, Secure)', () => {
    expect(GUEST_COOKIE).toBe('sc_guest');
    expect(buildCookie(GUEST_COOKIE, '{"v":1}', { domain: DOMAIN, secure: true })).toBe(`sc_guest=${encodeURIComponent('{"v":1}')}; Path=/; SameSite=Lax; Max-Age=15552000; Domain=${DOMAIN}; Secure`);
    expect(buildCookieRemoval(GUEST_COOKIE, { domain: DOMAIN, secure: true })).toBe(`sc_guest=; Path=/; SameSite=Lax; Max-Age=0; Domain=${DOMAIN}; Secure`);
  });

  it('cấu hình cookie phiên không phụ thuộc VITE_MERGED: cùng tên miền cha, Path /, SameSite lax, Secure khi https', () => {
    const cfg = readAuthConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k', VITE_USERNAME_EMAIL_DOMAIN: 'hs.vn', VITE_COOKIE_DOMAIN: DOMAIN, VITE_MERGED: 'true' } as Parameters<typeof readAuthConfig>[0]);
    expect(Object.keys(cfg).sort()).toEqual(['anonKey', 'configured', 'cookieDomain', 'emailDomain', 'url', 'usernameEnabled']);
    expect(cfg.cookieDomain).toBe(DOMAIN);
    expect(sessionCookieOptions(cfg.cookieDomain, 'https:')).toEqual({ domain: DOMAIN, path: '/', sameSite: 'lax', secure: true });
    expect(sessionCookieOptions(undefined, 'http:')).toEqual({ domain: undefined, path: '/', sameSite: 'lax', secure: false });
  });

  it('người chơi cũ: cookie sc_guest ghi từ trước (nằm lẫn cookie khác) vẫn đọc ra đúng tiến độ ở web chính', () => {
    // một người đã chơi xong màn 1 (3 sao) và màn 2 (2 sao, 300 điểm) ở sb-lang-giay, định dạng v1 như các bản trước khi gộp
    const old = '{"v":1,"lv":{"1":[1,1,3,3,3],"2":[1,1,2,300]},"gp":1,"c":50,"u":1700000000000}';
    const header = `theme=sang; sb-abc-auth-token=xyz; ${GUEST_COOKIE}=${encodeURIComponent(old)}; other=1`;
    const p = decodeProgress(readCookie(header, GUEST_COOKIE));
    expect(p.game.goldenPages).toBe(1);
    expect(p.game.coins).toBe(50);
    expect(p.levels[1]?.completed).toBe(true);
    expect(p.levels[2]?.completed).toBe(true);
    expect(p.levels[2]?.bestScore).toBe(300);
    // các cờ thêm sau này (cảnh làng, thẻ Em có biết...) không có trong cookie cũ: mặc định, không lỗi
    expect(p.game.data).toBeDefined();
  });

  it('ghi rồi đọc lại (mã hóa gọn của tiến độ không phụ thuộc nơi chạy): vòng đi vòng về giữ nguyên', () => {
    const p = decodeProgress('{"v":1,"lv":{"1":[1,1,3,3,3],"4":[1,1,3,3,3]},"gp":2,"c":120,"u":1700000000001,"st":3,"ks":7}');
    const again = decodeProgress(encodeProgress(p));
    expect(again.game.goldenPages).toBe(p.game.goldenPages);
    expect(again.game.coins).toBe(p.game.coins);
    expect(Object.keys(again.levels).sort()).toEqual(Object.keys(p.levels).sort());
    for (const l of LEVELS) expect(again.levels[l.id]?.completed, `màn ${l.id}`).toBe(p.levels[l.id]?.completed);
  });

  it('cookie hỏng hay thiếu thì trả tiến độ rỗng, không lỗi', () => {
    expect(decodeProgress(readCookie('a=1', GUEST_COOKIE)).game.goldenPages).toBe(0);
    expect(decodeProgress('khong phai json').game.goldenPages).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { ui } from '../content/ui';
import { readAuthConfig } from './config';
import { mapAuthError } from './errors';
import { loginPathFor, safeNext } from './redirect';
import {
  cleanDisplayName,
  normalizeUsername,
  usernameToEmail,
  validateDisplayName,
  validatePassword,
  validateUsername,
} from './validate';

describe('validateUsername', () => {
  it('chấp nhận 3 đến 20 ký tự a-z 0-9 _', () => {
    for (const ok of ['abc', 'an_01', 'a_b', '123', 'a'.repeat(20), '___']) {
      expect(validateUsername(ok).ok, ok).toBe(true);
    }
  });

  it('từ chối quá ngắn, quá dài, chữ hoa, dấu, khoảng trắng, ký tự lạ', () => {
    for (const bad of ['', 'ab', 'a'.repeat(21), 'Abc', 'an-01', 'an 01', 'nguyễn', 'a.b', 'a@b', ' abc', 'abc ']) {
      const r = validateUsername(bad);
      expect(r.ok, JSON.stringify(bad)).toBe(false);
      if (!r.ok) expect(r.message).toBe(ui.auth.kiemTra.tenDangNhap);
    }
  });

  it('normalizeUsername bỏ khoảng trắng đầu cuối và đổi chữ thường', () => {
    expect(normalizeUsername('  Lan_01 ')).toBe('lan_01');
    expect(validateUsername(normalizeUsername('  Lan_01 ')).ok).toBe(true);
  });
});

describe('validateDisplayName', () => {
  it('1 đến 40 ký tự sau khi bỏ khoảng trắng đầu cuối', () => {
    expect(validateDisplayName('A').ok).toBe(true);
    expect(validateDisplayName('  Nguyễn Văn An  ').ok).toBe(true);
    expect(validateDisplayName('x'.repeat(40)).ok).toBe(true);
    expect(validateDisplayName(' ' + 'x'.repeat(40) + ' ').ok).toBe(true); // đủ 40 sau khi bỏ khoảng trắng
    expect(validateDisplayName('x'.repeat(41)).ok).toBe(false);
  });

  it('từ chối rỗng hoặc toàn dấu cách', () => {
    expect(validateDisplayName('').ok).toBe(false);
    expect(validateDisplayName('     ').ok).toBe(false);
    expect(validateDisplayName('\t\n ').ok).toBe(false);
    expect(cleanDisplayName('  An  ')).toBe('An');
  });
});

describe('validatePassword', () => {
  it('ít nhất 8 ký tự', () => {
    expect(validatePassword('1234567').ok).toBe(false);
    expect(validatePassword('12345678').ok).toBe(true);
    expect(validatePassword('').ok).toBe(false);
    expect(validatePassword('mật khẩu dài')).toEqual({ ok: true });
  });
});

describe('usernameToEmail', () => {
  it('ghép <ten>@<tên miền cấu hình>, không viết cứng tên miền', () => {
    expect(usernameToEmail('lan_01', 'hs.example.test')).toBe('lan_01@hs.example.test');
  });
});

describe('mapAuthError', () => {
  it('tên đăng nhập đã có (nhiều dạng lỗi của Supabase)', () => {
    const msg = ui.auth.loi.tenDaCo;
    expect(msg).toBe('Tên đăng nhập này đã có người dùng. Em thử tên khác nhé.');
    expect(mapAuthError({ name: 'AuthApiError', code: 'user_already_exists', status: 422, message: 'User already registered' }, 'signUp')).toBe(msg);
    expect(mapAuthError({ code: 'email_exists', message: 'x' }, 'signUp')).toBe(msg);
    expect(mapAuthError(new Error('A user with this email address has already been registered'), 'signUp')).toBe(msg);
    expect(mapAuthError({ status: 500, message: 'Database error saving new user' }, 'signUp')).toBe(msg);
  });

  it('"Database error saving new user" chỉ coi là trùng tên khi đang đăng ký', () => {
    expect(mapAuthError({ message: 'Database error saving new user' }, 'signIn')).toBe(ui.auth.loi.chung);
  });

  it('sai tên đăng nhập hoặc mật khẩu', () => {
    const msg = ui.auth.loi.saiDangNhap;
    expect(msg).toBe('Sai tên đăng nhập hoặc mật khẩu. Quên mật khẩu thì nhờ thầy cô đặt lại.');
    expect(mapAuthError({ name: 'AuthApiError', code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' }, 'signIn')).toBe(msg);
    expect(mapAuthError({ message: 'Invalid login credentials' }, 'signIn')).toBe(msg);
  });

  it('lỗi mạng', () => {
    const msg = ui.auth.loi.mang;
    expect(mapAuthError(new TypeError('Failed to fetch'), 'signIn')).toBe(msg);
    expect(mapAuthError({ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }, 'signIn')).toBe(msg);
    expect(mapAuthError({ message: 'NetworkError when attempting to fetch resource.' }, 'other')).toBe(msg);
    expect(mapAuthError({ message: 'Load failed' }, 'other')).toBe(msg);
  });

  it('mã lớp không đúng', () => {
    expect(mapAuthError({ code: 'P0001', message: 'Mã lớp không đúng' }, 'joinClass')).toBe(ui.auth.loi.maLopSai);
    expect(ui.auth.loi.maLopSai).toContain('Mã lớp không đúng');
    expect(mapAuthError({ message: 'Cần đăng nhập' }, 'joinClass')).toBe(ui.auth.loi.canDangNhap);
  });

  it('lỗi lạ: một câu chung, không lộ chữ tiếng Anh', () => {
    for (const e of [null, undefined, 42, 'boom', {}, new Error('relation "profiles" does not exist'), { message: 'JWT expired' }]) {
      expect(mapAuthError(e, 'other')).toBe(ui.auth.loi.chung);
    }
  });
});

describe('readAuthConfig', () => {
  it('thiếu URL hoặc khóa: chưa cấu hình, không lỗi', () => {
    expect(readAuthConfig({}).configured).toBe(false);
    expect(readAuthConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' }).configured).toBe(false);
    expect(readAuthConfig({ VITE_SUPABASE_ANON_KEY: 'sb_publishable_x' }).configured).toBe(false);
    expect(readAuthConfig({ VITE_SUPABASE_URL: '  ', VITE_SUPABASE_ANON_KEY: 'k' }).configured).toBe(false);
  });

  it('đủ URL và khóa: đã cấu hình; tên đăng nhập cần thêm tên miền email', () => {
    const base = { VITE_SUPABASE_URL: 'https://x.supabase.co/', VITE_SUPABASE_ANON_KEY: 'sb_publishable_x' };
    const a = readAuthConfig(base);
    expect(a.configured).toBe(true);
    expect(a.usernameEnabled).toBe(false);
    expect(a.url).toBe('https://x.supabase.co');
    const b = readAuthConfig({ ...base, VITE_USERNAME_EMAIL_DOMAIN: '@hs.example.test', VITE_COOKIE_DOMAIN: '' });
    expect(b.usernameEnabled).toBe(true);
    expect(b.emailDomain).toBe('hs.example.test');
    expect(b.cookieDomain).toBeUndefined();
    expect(readAuthConfig({ ...base, VITE_COOKIE_DOMAIN: '.ten-mien.vn' }).cookieDomain).toBe('.ten-mien.vn');
  });
});

describe('safeNext / loginPathFor', () => {
  it('chỉ nhận đường dẫn trong cùng trang', () => {
    expect(safeNext('/ho-so')).toBe('/ho-so');
    expect(safeNext('/lang/lang-giay/man/1?a=1')).toBe('/lang/lang-giay/man/1?a=1');
    for (const bad of [null, undefined, '', 'ho-so', 'https://xau.example/', '//xau.example', '/\\xau.example', 'javascript:alert(1)', '/a\nb']) {
      expect(safeNext(bad), String(bad)).toBeNull();
    }
  });

  it('loginPathFor gắn next đã mã hóa, bỏ next không hợp lệ', () => {
    expect(loginPathFor('/ho-so')).toBe('/dang-nhap?next=%2Fho-so');
    expect(loginPathFor('https://xau.example')).toBe('/dang-nhap');
    expect(loginPathFor(null)).toBe('/dang-nhap');
  });
});

import { describe, expect, it } from 'vitest';
import { hubMapUrl, hubPageUrl, levelPath, levelUrl, openLevel, resolveUrls, villageWorldUrl } from './urls';

describe('resolveUrls', () => {
  it('không có biến môi trường thì dùng cổng localhost của spec 01 mục 8', () => {
    const u = resolveUrls({});
    expect(u.hub).toBe('http://localhost:5173');
    expect(u.villages['lang-giay']).toBe('http://localhost:5174');
    expect(u.villages['lang-det']).toBe('http://localhost:5175');
    expect(u.villages['lang-khac-dau']).toBe('http://localhost:5176');
    expect(u.villages['lang-bac']).toBe('http://localhost:5177');
  });

  it('bỏ dấu / ở cuối và bỏ qua giá trị rỗng', () => {
    const u = resolveUrls({ VITE_HUB_URL: 'https://ten-mien.vn/', VITE_LANG_GIAY_URL: '  ' });
    expect(u.hub).toBe('https://ten-mien.vn');
    expect(u.villages['lang-giay']).toBe('http://localhost:5174');
  });

  it('ghép địa chỉ bản đồ và màn bài học', () => {
    const u = resolveUrls({ VITE_HUB_URL: 'https://ten-mien.vn', VITE_LANG_BAC_URL: 'https://lang-bac.ten-mien.vn/' });
    expect(hubMapUrl(u)).toBe('https://ten-mien.vn/ban-do');
    expect(levelUrl(u, 'lang-bac', 10)).toBe('https://lang-bac.ten-mien.vn/lang/lang-bac/man/10');
  });
});

describe('hubPageUrl', () => {
  it('ghép địa chỉ hub với đường dẫn trang, không thừa dấu /', () => {
    const u = resolveUrls({ VITE_HUB_URL: 'https://ten-mien.vn/' });
    expect(hubPageUrl(u, '/')).toBe('https://ten-mien.vn/');
    expect(hubPageUrl(u, '/giao-vien')).toBe('https://ten-mien.vn/giao-vien');
    expect(hubPageUrl(u, 'giao-vien')).toBe('https://ten-mien.vn/giao-vien');
  });
});

describe('villageWorldUrl', () => {
  it('về thế giới mở ở hub, vào thẳng làng', () => {
    const u = resolveUrls({ VITE_HUB_URL: 'https://ten-mien.vn/' });
    expect(villageWorldUrl(u, 'lang-giay', false)).toBe('https://ten-mien.vn/cho?tu=lang-giay');
    expect(villageWorldUrl(u, 'lang-bac', true)).toBe('/cho?tu=lang-bac');
  });
});

describe('levelPath và openLevel (bước G1: điều hướng nội bộ khi đã gộp web)', () => {
  const urls = resolveUrls({ VITE_HUB_URL: 'https://stem-block.example', VITE_LANG_BAC_URL: 'https://sb-lang-bac.example' });

  it('levelPath là đường dẫn nội bộ, cùng dạng ở vỏ làng riêng và ở web gộp', () => {
    expect(levelPath('lang-bac', 12)).toBe('/lang/lang-bac/man/12');
    expect(levelUrl(urls, 'lang-bac', 12)).toBe(`https://sb-lang-bac.example${levelPath('lang-bac', 12)}`);
  });

  it('đã gộp: gọi navigate với đường dẫn nội bộ, không tải lại trang', () => {
    const calls: string[] = [];
    const assigned: string[] = [];
    const real = globalThis.window;
    globalThis.window = { location: { assign: (u: string) => assigned.push(u) } } as unknown as Window & typeof globalThis;
    try {
      openLevel((to) => calls.push(to), 'lang-giay', 2, true, urls);
      expect(calls).toEqual(['/lang/lang-giay/man/2']);
      expect(assigned).toEqual([]);
      // chưa gộp: mở địa chỉ của làng (tải trang)
      openLevel((to) => calls.push(to), 'lang-bac', 11, false, urls);
      expect(calls).toHaveLength(1);
      expect(assigned).toEqual(['https://sb-lang-bac.example/lang/lang-bac/man/11']);
    } finally {
      globalThis.window = real;
    }
  });
});

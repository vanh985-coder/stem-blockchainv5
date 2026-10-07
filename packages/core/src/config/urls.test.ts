import { describe, expect, it } from 'vitest';
import { hubMapUrl, levelUrl, resolveUrls } from './urls';

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

import { describe, expect, it } from 'vitest';
import manifest from '../../../../assets-build/manifest.json';
import hotspotsSource from './banDoHotspots.ts?raw';
import { CHARACTER_IDS, EXTRA_VARS, fmt } from './characters';
import { BAN_DO_HOTSPOTS, formatHotspotsBlock } from './banDoHotspots';
import { STORY } from './story';

const ALLOWED = new Set<string>(['ten', 'Ten', ...CHARACTER_IDS.filter((id) => id !== 'hocSinh'), ...EXTRA_VARS]);

describe('story.ts', () => {
  it('đủ 14 lời truyện, đánh số 1 đến 14, không lời nào rỗng', () => {
    expect(STORY).toHaveLength(14);
    expect(STORY.map((s) => s.n)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    for (const s of STORY) expect(s.text.trim(), `ảnh ${s.n}`).not.toBe('');
  });

  it('chỉ dùng chỗ giữ tên hợp lệ; không còn chữ "Tí" viết cứng', () => {
    for (const s of STORY) {
      for (const m of s.text.matchAll(/\{([^}]*)\}/g)) expect(ALLOWED.has(m[1]), `ảnh ${s.n}: {${m[1]}}`).toBe(true);
      expect(s.text, `ảnh ${s.n}`).not.toMatch(/(^|[^\p{L}])Tí(?![\p{L}])/u);
    }
  });

  it('{ten} và {Ten}: chơi thử là "em"/"Em", có tên thì dùng tên; {phanDien} đổi thành tên phản diện', () => {
    expect(fmt(STORY[0].text)).toContain('Tối trước bài kiểm tra về blockchain, em học mãi');
    expect(fmt(STORY[2].text)).toMatch(/^Em mở mắt/);
    expect(fmt(STORY[0].text, { ten: 'Lan' })).toContain('blockchain, Lan học mãi');
    expect(fmt(STORY[2].text, { ten: 'lan' })).toMatch(/^Lan mở mắt/);
    expect(fmt(STORY[4].text)).toMatch(/^Tí, cậu thiếu niên/);
    expect(fmt(STORY[12].text, { ten: 'Lan' })).toBe(
      'Lan tỉnh giấc. Ở trang cuối cuốn vở có một con dấu tím mà Lan không nhớ mình đã đóng.',
    );
  });

  it('mọi ảnh có trong assets-build/manifest.json', () => {
    const keys = new Set(Object.keys(manifest));
    for (const s of STORY) expect(keys.has(s.image), s.image).toBe(true);
  });
});

describe('banDoHotspots.ts', () => {
  it('tọa độ nằm trong 0 đến 100%', () => {
    for (const h of Object.values(BAN_DO_HOTSPOTS)) {
      expect(h.x).toBeGreaterThanOrEqual(0);
      expect(h.x).toBeLessThanOrEqual(100);
      expect(h.y).toBeGreaterThanOrEqual(0);
      expect(h.y).toBeLessThanOrEqual(100);
    }
  });

  it('nút "Chép" ra đúng khối đang nằm trong file banDoHotspots.ts', () => {
    const file = hotspotsSource.replace(/\r\n/g, '\n');
    expect(file).toContain(formatHotspotsBlock(BAN_DO_HOTSPOTS));
  });

  it('làm tròn 1 chữ số thập phân', () => {
    const block = formatHotspotsBlock({ ...BAN_DO_HOTSPOTS, 'lang-bac': { x: 12.3456, y: 99.99 } });
    expect(block).toContain("'lang-bac': { x: 12.3, y: 100 },");
  });
});

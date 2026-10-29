import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { banDoThe } from '../../../../packages/core/src/content/minimap';
import { villageMapData } from '../../../../packages/core/src/three/world/map/banDoScrolls';
import VillageScrollMap from './VillageScrollMap';

const render = (village: Parameters<typeof villageMapData>[0], mask: number) => renderToStaticMarkup(<VillageScrollMap village={village} mask={mask} />);
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

describe('vùng bản đồ làng trên /ban-do (dựng tĩnh)', () => {
  it('chưa nhặt: 4 hình thẻ đúng tọa độ chiếu, có số, tên khu và chú thích bằng chữ', () => {
    for (const id of ['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac'] as const) {
      const html = render(id, 0);
      expect(count(html, /data-testid="ban-do-the"/g)).toBe(4);
      expect(count(html, /data-glyph="scroll"/g)).toBe(5); // 4 thẻ + ký hiệu ở chú thích
      for (const s of villageMapData(id, 0).scrolls) expect(html).toContain(`data-index="${s.index}" data-px="${s.px.toFixed(2)}" data-py="${s.py.toFixed(2)}"`);
      const text = html.replace(/&quot;/g, '"');
      expect(text).toContain(banDoThe.chuThich);
      expect(text).toContain('Còn 4/4 thẻ');
      expect(count(html, /<li /g)).toBe(4);
    }
  });

  it('nhặt xong một phần: chỉ còn thẻ chưa nhặt; nhặt đủ: không có bản đồ, chỉ có lời báo', () => {
    const some = render('lang-giay', 0b0101);
    expect(count(some, /data-testid="ban-do-the"/g)).toBe(2);
    expect(some).toContain('data-index="1"');
    expect(some).not.toContain('data-index="0"');
    expect(some.replace(/&quot;/g, '"')).toContain('Còn 2/4 thẻ');
    const none = render('lang-giay', 15);
    expect(count(none, /data-testid="ban-do-the"/g)).toBe(0);
    expect(none).not.toContain('<svg');
    expect(none).toContain('ban-do-the-het');
  });

  it('không dùng bóng, bộ lọc hay hiệu ứng chuyển động', () => {
    expect(render('lang-bac', 0)).not.toMatch(/box-shadow|text-shadow|filter|drop-shadow|animate-|<animate/i);
  });
});

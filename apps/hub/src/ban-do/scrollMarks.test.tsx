import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { banDoThe } from '../../../../packages/core/src/content/minimap';
import ScrollMarks, { scrollGlyphSize } from './ScrollMarks';

const RATIO = 1920 / 1047;
const render = (masks: Record<string, number>, mapW = 0) => renderToStaticMarkup(<ScrollMarks masks={masks} ratio={RATIO} mapW={mapW} />);
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

describe('thẻ chưa nhặt trên /ban-do (dựng tĩnh)', () => {
  it('khách mới: 16 biểu tượng (4 làng × 4), có chú thích bằng chữ và số còn lại', () => {
    const html = render({});
    expect(count(html, /data-testid="ban-do-the"/g)).toBe(16);
    for (const v of ['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac']) expect(count(html, new RegExp(`data-village="${v}"`, 'g'))).toBe(4);
    const text = html.replace(/&quot;/g, '"');
    expect(text).toContain(banDoThe.chuThich);
    expect(text).toContain('còn 16/16 thẻ');
    expect(count(html, /data-glyph="scroll"/g)).toBe(17); // 16 thẻ + 1 ký hiệu ở chú thích
  });

  it('đã nhặt một phần hay tất cả: chỉ còn thẻ chưa nhặt', () => {
    const some = render({ 'lang-giay': 0b0101, 'lang-det': 15, 'lang-bac': 0b1000 });
    expect(count(some, /data-testid="ban-do-the"/g)).toBe(9);
    expect(some).not.toContain('data-village="lang-det"');
    expect(some).toContain('data-village="lang-giay" data-index="1"');
    expect(some).not.toContain('data-village="lang-giay" data-index="0"');
    expect(some.replace(/&quot;/g, '"')).toContain('còn 9/16 thẻ');
    const none = render({ 'lang-giay': 15, 'lang-det': 15, 'lang-khac-dau': 15, 'lang-bac': 15 });
    expect(count(none, /data-testid="ban-do-the"/g)).toBe(0);
    expect(none).toContain(banDoThe.het);
  });

  it('lớp phủ ẩn khỏi trình đọc màn hình nhưng có lời đọc theo làng; không bắt chuột, không đổ bóng hay bộ lọc', () => {
    const html = render({});
    expect(html).toContain('pointer-events-none');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-testid="ban-do-the-doc"');
    expect(count(html, /còn 4 thẻ/g)).toBe(4);
    expect(html).not.toMatch(/box-shadow|text-shadow|filter|drop-shadow/i);
  });

  it('cỡ hình theo bản đồ, không nhỏ hơn 20 px và không quá 30 px', () => {
    expect(scrollGlyphSize(300)).toBe(20);
    expect(scrollGlyphSize(900)).toBe(25);
    expect(scrollGlyphSize(5000)).toBe(30);
  });
});

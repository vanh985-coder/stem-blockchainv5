import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  FLOATERS,
  NenTrangTri,
  PORTRAIT_SIZE_NARROW,
  PORTRAIT_SIZE_WIDE,
  STORY,
  VnDialog,
  toVnTurns,
  type VnTurn,
} from '@so-chung/core';

const turns: VnTurn[] = [
  { speaker: 'Bác An', portrait: 'bac-an', text: 'Lời thứ nhất.' },
  { speaker: 'Bác An', portrait: 'bac-an', text: 'Lời thứ hai.' },
  { speaker: 'Bác An', portrait: 'bac-an', text: 'Lời cuối.' },
];
const noop = () => {};

describe('VnDialog', () => {
  it('hiện tên người nói, lời, tiến trình x/n, nút "Tiếp ›", "‹" và "Bỏ qua"', () => {
    const html = renderToStaticMarkup(<VnDialog turns={turns} onFinish={noop} />);
    expect(html).toContain('Bác An');
    expect(html).toContain('Lời thứ nhất.');
    expect(html).toContain('1/3');
    expect(html).toContain('Tiếp ›');
    expect(html).toContain('‹');
    expect(html).toContain('Bỏ qua');
    expect(html).not.toContain('Lời thứ hai.'); // mỗi lượt một lần
  });

  it('chân dung lớn: từ 160px trên máy tính, từ 112px trên điện thoại; hộp rộng tối đa 960px', () => {
    expect(PORTRAIT_SIZE_WIDE).toBeGreaterThanOrEqual(160);
    expect(PORTRAIT_SIZE_NARROW).toBeGreaterThanOrEqual(112);
    const html = renderToStaticMarkup(<VnDialog turns={turns} onFinish={noop} />);
    expect(html).toContain('max-w-[960px]');
  });

  it('chữ lời từ 18px trên máy tính (sm:text-lg) và 16px trên điện thoại (text-base)', () => {
    const html = renderToStaticMarkup(<VnDialog turns={turns} onFinish={noop} />);
    expect(html).toMatch(/text-base[^"]*sm:text-lg/);
  });

  it('có nền (overlay) thì phủ cả màn hình và là hộp thoại; không có nền thì nằm trong trang', () => {
    const inline = renderToStaticMarkup(<VnDialog turns={turns} onFinish={noop} />);
    expect(inline).not.toContain('fixed inset-0');
    expect(inline).toContain('role="region"');
    const overlay = renderToStaticMarkup(<VnDialog turns={turns} onFinish={noop} background="scenes/bai-hoc-lang-giay" />);
    expect(overlay).toContain('fixed inset-0');
    expect(overlay).toContain('role="dialog"');
    expect(overlay).toContain('bg-chu/45'); // lớp tối nhẹ phủ lên ảnh nền mờ
  });

  it('nút ở lượt cuối do nơi gọi đặt tên; còn ở các lượt trước vẫn là "Tiếp ›"', () => {
    const one = renderToStaticMarkup(<VnDialog turns={turns.slice(0, 1)} onFinish={noop} finishLabel="Bắt đầu hành trình" />);
    expect(one).toContain('Bắt đầu hành trình');
    expect(one).not.toContain('Tiếp ›');
    const many = renderToStaticMarkup(<VnDialog turns={turns} onFinish={noop} finishLabel="Bắt đầu hành trình" />);
    expect(many).toContain('Tiếp ›');
  });

  it('lượt có ảnh minh họa thì hiện ảnh (khung 16:9); thiếu ảnh vẫn không lỗi', () => {
    const html = renderToStaticMarkup(<VnDialog turns={[{ image: 'story/01-ngu-guc', text: 'Truyện.' }]} onFinish={noop} />);
    expect(html).toContain('aspect-video');
    expect(html).toContain('Truyện.');
  });

  it('không có lượt nào thì không vẽ gì', () => {
    expect(renderToStaticMarkup(<VnDialog turns={[]} onFinish={noop} />)).toBe('');
  });
});

describe('DialogueBox → VnDialog', () => {
  it('đổi lượt theo nhân vật: tên viết hoa, chân dung, lời qua fmt, lời phụ', () => {
    const out = toVnTurns(
      [
        { characterId: 'bacAn', text: 'Chào {ten}!' },
        { characterId: 'bacAn', text: 'Đêm qua {phanDien} lẻn vào.', aside: { characterId: 'phanDien', text: 'Hì hì!' } },
      ],
      { ten: 'Lan' },
    );
    expect(out[0]).toMatchObject({ speaker: 'Bác An', portrait: 'bac-an', text: 'Chào Lan!' });
    expect(out[1].text).toBe('Đêm qua Tí lẻn vào.');
    expect(out[1].aside).toEqual({ portrait: 'ti', speaker: 'Tí', text: 'Hì hì!' });
  });
});

describe('truyện dùng VnDialog', () => {
  it('có đúng 14 lượt, mỗi lượt một ảnh', () => {
    expect(STORY).toHaveLength(14);
    expect(new Set(STORY.map((f) => f.image)).size).toBe(14);
  });
});

describe('NenTrangTri', () => {
  const html = renderToStaticMarkup(<NenTrangTri />);

  it('5 đến 8 icon, aria-hidden, không nhận bấm, nằm dưới mọi bảng', () => {
    expect(FLOATERS.length).toBeGreaterThanOrEqual(5);
    expect(FLOATERS.length).toBeLessThanOrEqual(8);
    expect(html.match(/<svg/g)?.length).toBe(FLOATERS.length);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('pointer-events-none');
    expect(html).toContain('-z-10');
  });

  it('chỉ trang trí: không có nút, liên kết hay chữ', () => {
    expect(html).not.toMatch(/<(button|a|input)\b/);
    expect(html.replace(/<[^>]*>/g, '')).toBe('');
  });

  it('tắt khi prefers-reduced-motion (motion-reduce:hidden) và có animation CSS', () => {
    expect(html).toContain('motion-reduce:hidden');
    expect(html).toContain('animate-trang-tri-troi');
  });
});

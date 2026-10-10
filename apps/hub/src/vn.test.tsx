import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  NenTrangTri,
  PORTRAIT_SIZE_NARROW,
  PORTRAIT_SIZE_WIDE,
  STORY,
  VnDialog,
  toVnTurns,
  withMoods,
  type VnTurn,
} from '@so-chung/core';
import Icons from '../../../packages/core/src/ui/nenTrangTriIcons';
import { bai1Lesson } from '@so-chung/core/content/lessons/bai-1';
import { bai2Lesson } from '@so-chung/core/content/lessons/bai-2';
import { bai3Lesson } from '@so-chung/core/content/lessons/bai-3';
import { bai4Lesson } from '@so-chung/core/content/lessons/bai-4';

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
    expect(html).toContain('object-contain'); // ảnh hiện trọn, không cắt
    expect(html).not.toContain('object-cover');
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

describe('NenTrangTri (vỏ)', () => {
  const html = renderToStaticMarkup(<NenTrangTri />);

  it('aria-hidden, không nhận bấm, nằm dưới mọi bảng', () => {
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('pointer-events-none');
    expect(html).toContain('-z-10');
  });

  it('chỉ trang trí: không có nút, liên kết hay chữ', () => {
    expect(html).not.toMatch(/<(button|a|input)\b/);
    expect(html.replace(/<[^>]*>/g, '')).toBe('');
  });

  it('icon tải sau (chunk riêng): bản dựng đầu không có icon nào', () => {
    expect(html).not.toContain('<svg');
  });

  it('chỉ icon (image=null) thì không có nền ảnh và nền giấy', () => {
    const bare = renderToStaticMarkup(<NenTrangTri image={null} />);
    expect(bare).not.toContain('bg-giay');
  });
});

describe('NenTrangTri (icon)', () => {
  const svgs = (h: string) => h.match(/<svg/g)?.length ?? 0;
  const themes = ['mo', 'lang', 'hoi', 'giay', 'det', 'khacdau', 'bac'] as const;

  it.each(themes)('bộ %s: 8–12 icon rải ở rìa, trôi chậm bằng CSS, ẩn bớt ở màn hẹp', (theme) => {
    const h = renderToStaticMarkup(<Icons theme={theme} variant="full" />);
    expect(svgs(h)).toBeGreaterThanOrEqual(8);
    expect(svgs(h)).toBeLessThanOrEqual(12);
    expect(h).toContain('animate-trang-tri-troi');
    expect(h.match(/max-sm:hidden/g)?.length).toBe(svgs(h) - 5); // màn dưới 640px: tối đa 5 icon
  });

  it('trang bài học: chỉ ở 2 khoảng trống hai bên (từ 1296px), tối đa 4 icon mỗi bên', () => {
    const h = renderToStaticMarkup(<Icons theme="det" variant="sides" />);
    expect(svgs(h)).toBe(8);
    expect(h).toContain('min-[1296px]:block');
    expect(h).toContain('hidden'); // dưới 1296px không hiện
    expect(h).toContain('calc((100vw - 1200px) / 2)'); // đúng bề rộng khoảng trống bên cạnh bảng 1200px
    expect(h.match(/left-0/g)?.length).toBe(1);
    expect(h.match(/right-0/g)?.length).toBe(1);
  });

  it('trang giáo viên: icon đứng yên (không animation), rất mờ', () => {
    const h = renderToStaticMarkup(<Icons theme="lang" variant="still" />);
    expect(svgs(h)).toBeGreaterThanOrEqual(8);
    expect(h).not.toContain('animate-trang-tri-troi');
    expect(h).toContain('opacity-[0.28]');
  });

  it('cảnh trao Trang Sổ Vàng và giới thiệu làng: thêm tia sáng lấp lánh', () => {
    const plain = renderToStaticMarkup(<Icons theme="giay" variant="full" />);
    const spark = renderToStaticMarkup(<Icons theme="giay" variant="full" sparkle />);
    expect(svgs(spark) - svgs(plain)).toBe(7);
    expect(spark).toContain('animate-trang-tri-lap-lanh');
    // màn dưới 640px: icon bớt còn 3 và chỉ 2 tia, tổng tối đa 5 hình
    expect(spark.match(/max-sm:hidden/g)?.length).toBe(svgs(spark) - 5);
    expect(plain).not.toContain('animate-trang-tri-lap-lanh');
  });
});

describe('nhân vật "sống" trong VnDialog', () => {
  it('lượt mới bắt đầu hiện dần: chữ nhìn thấy còn trống, trình đọc màn hình đọc cả câu ngay', () => {
    const html = renderToStaticMarkup(<VnDialog turns={turns} onFinish={noop} />);
    const visible = html.match(/data-testid="vn-text"[^>]*>(.*?)<\/p>/)?.[1] ?? '';
    expect(visible).toContain('class="invisible">Lời thứ nhất.</span>'); // giữ chỗ nhưng chưa hiện
    expect(visible.replace(/<[^>]*>/g, '').trim()).toBe('Lời thứ nhất.'); // chữ thật nằm trong phần chưa hiện
    expect(html).toContain('aria-hidden="true" data-testid="vn-text"'); // chữ hiện dần không bị đọc từng chữ
    expect(html).toMatch(/<p aria-live="polite" class="sr-only">Lời thứ nhất\.<\/p>/); // đọc cả câu
  });

  it('khi đang hiện lời, chân dung nhún (animate-vn-talk); chưa có ảnh nên giữ khung chân dung', () => {
    const html = renderToStaticMarkup(<VnDialog turns={turns} onFinish={noop} />);
    expect(html).toContain('animate-vn-talk');
  });

  it('lượt không có chân dung (truyện) thì không có hiệu ứng thở hay nhún', () => {
    const html = renderToStaticMarkup(<VnDialog turns={[{ image: 'story/01-ngu-guc', text: 'Truyện.' }]} onFinish={noop} />);
    expect(html).not.toContain('animate-vn-talk');
    expect(html).not.toContain('animate-vn-breathe');
  });

  it('mood vui đi từ lượt thoại sang hộp thoại', () => {
    const out = toVnTurns([{ characterId: 'bacAn', text: 'Chào em!', mood: 'vui' }, { characterId: 'bacAn', text: 'Ừ.' }]);
    expect(out[0].mood).toBe('vui');
    expect(out[1].mood).toBeUndefined();
  });

  it('gắn mood vui cho câu chào đầu bài, lời kết bài và lời trao Trang Sổ Vàng của cả 4 bài (nội dung bài không đổi)', () => {
    for (const lesson of [bai1Lesson, bai2Lesson, bai3Lesson, bai4Lesson]) {
      const dau = withMoods(lesson.dialogue.dauBai, 'dauBai');
      expect(dau[0].mood).toBe('vui');
      expect(dau.slice(1).every((t) => t.mood === undefined)).toBe(true);
      expect(withMoods(lesson.dialogue.cuoiBai, 'cuoiBai').every((t) => t.mood === 'vui')).toBe(true);
      expect(withMoods(lesson.award.loi, 'award').every((t) => t.mood === 'vui')).toBe(true);
      // lời giữa bài (trước Trung bình, trước Khó) không đổi tâm trạng
      expect(withMoods(lesson.dialogue.truocTb, 'truocTb')).toEqual(lesson.dialogue.truocTb);
      expect(withMoods(lesson.dialogue.truocKho, 'truocKho')).toEqual(lesson.dialogue.truocKho);
      // nội dung gốc của bài không bị sửa
      expect(lesson.dialogue.dauBai[0].mood).toBeUndefined();
    }
  });
});

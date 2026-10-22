import { describe, expect, it } from 'vitest';
import { GUIDE_ART_IDS, GUIDE_SECTIONS, GUIDE_SECTION_IDS, GUIDE_SHOT_IDS, guideFigure, guideSection, guideSectionsFor, guideSectionOfLevel, guideText, huongDan, type GuidePage } from './huongDan';

const pages: { section: string; page: GuidePage }[] = GUIDE_SECTIONS.flatMap((s) => (s.trang as readonly GuidePage[]).map((page) => ({ section: s.id, page })));
const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean);
const TOUCH_WORDS = /vuốt|chạm|cần điều khiển|nút bàn tay/i;
const KEY_WORDS = /phím|chuột|Shift|Space|Esc|bấm E\b/;

describe('cấu trúc Hướng dẫn chơi', () => {
  it('đủ 6 phần của đề bài, id không trùng, thứ tự bit cố định (chỉ được thêm vào cuối)', () => {
    expect(GUIDE_SECTION_IDS.slice(0, 6)).toEqual(['di-lai', 'noi-chuyen', 'bai-hoc', 'man-2', 'man-3', 'trang-vang']);
    expect(new Set(GUIDE_SECTION_IDS).size).toBe(GUIDE_SECTION_IDS.length);
    expect(GUIDE_SECTION_IDS.length).toBeLessThanOrEqual(31); // cờ lưu theo số bit
  });
  it('mỗi phần 2 đến 5 trang (phần Đi lại có 5 trang từ bước X4)', () => {
    for (const s of GUIDE_SECTIONS) {
      expect(s.trang.length, s.id).toBeGreaterThanOrEqual(2);
      expect(s.trang.length, s.id).toBeLessThanOrEqual(5);
    }
  });
  it('mỗi trang một hình và 1 đến 2 câu ngắn, cho cả hai thiết bị', () => {
    for (const { section, page } of pages) {
      for (const dev of ['may', 'dt'] as const) {
        const t = guideText(page, dev);
        expect(t.length, `${section}: ${t}`).toBeGreaterThan(10);
        expect(t.length, `${section}: ${t}`).toBeLessThanOrEqual(200);
        const n = sentences(t).length;
        expect(n, `${section}: ${t}`).toBeGreaterThanOrEqual(1);
        expect(n, `${section}: ${t}`).toBeLessThanOrEqual(3); // 2 câu, thêm 1 khi có chấm trong "E: …" hay dấu ba chấm
        const f = guideFigure(page, dev);
        expect('shot' in f || 'art' in f).toBe(true);
      }
    }
  });
  it('hình dẫn tới id có thật; mọi ảnh chụp và mọi hình vẽ đều được dùng ít nhất một lần', () => {
    const shots = new Set<string>();
    const arts = new Set<string>();
    for (const { page } of pages) {
      for (const f of [page.hinh, page.hinhDt]) {
        if (!f) continue;
        if ('shot' in f) {
          expect(GUIDE_SHOT_IDS).toContain(f.shot);
          shots.add(f.shot);
        } else {
          expect(GUIDE_ART_IDS).toContain(f.art);
          arts.add(f.art);
        }
      }
    }
    expect([...shots].sort()).toEqual([...GUIDE_SHOT_IDS].sort());
    expect([...arts].sort()).toEqual([...GUIDE_ART_IDS].sort());
  });
  it('lời cho điện thoại không nhắc phím hay chuột; lời chung (không có bản điện thoại) không nhắc riêng một thiết bị', () => {
    for (const { section, page } of pages) {
      if (page.dt) {
        expect(page.dt, `${section} dt`).not.toMatch(KEY_WORDS);
        expect(page.may, `${section} may`).not.toMatch(TOUCH_WORDS);
      } else {
        expect(page.may, `${section} chung`).not.toMatch(KEY_WORDS);
        expect(page.may, `${section} chung`).not.toMatch(TOUCH_WORDS);
      }
    }
  });
  it('trang có hình riêng cho điện thoại thì cũng có lời riêng', () => {
    for (const { section, page } of pages) if (page.hinhDt) expect(page.dt, section).toBeTruthy();
  });
});

describe('chọn theo thiết bị và theo màn', () => {
  it('máy tính dùng hinh và may; điện thoại dùng hinhDt và dt nếu có, không thì dùng chung', () => {
    const p: GuidePage = { hinh: { art: 'phim-e' }, hinhDt: { art: 'nut-tay' }, may: 'Bấm E.', dt: 'Chạm nút.' };
    expect(guideFigure(p, 'may')).toEqual({ art: 'phim-e' });
    expect(guideFigure(p, 'dt')).toEqual({ art: 'nut-tay' });
    expect(guideText(p, 'may')).toBe('Bấm E.');
    expect(guideText(p, 'dt')).toBe('Chạm nút.');
    const q: GuidePage = { hinh: { shot: 'bien-go' }, may: 'Chung.' };
    expect(guideFigure(q, 'dt')).toEqual({ shot: 'bien-go' });
    expect(guideText(q, 'dt')).toBe('Chung.');
  });
  it('thẻ bắt đầu của màn 2 và màn 3 mở thẳng phần của game; màn khác thì không', () => {
    expect(guideSectionOfLevel(2)).toBe('man-2');
    expect(guideSectionOfLevel(3)).toBe('man-3');
    expect(guideSectionOfLevel(1)).toBeNull();
    expect(guideSectionOfLevel(99)).toBeNull();
  });
  it('tra phần theo id', () => {
    expect(guideSection('man-2')?.tieuDe).toContain('{phanDien}');
    expect(guideSection('khong-co')).toBeUndefined();
  });
  it('nhãn phím trong hình là tên phím', () => {
    expect(Object.values(huongDan.phim)).toEqual(['W', 'A', 'S', 'D', 'E', 'M', 'Shift', 'Space', 'Esc']);
  });
});

describe('hộp chung chỉ hiện các phần chung (bước X1)', () => {
  it('thứ tự và mã các phần cũ không đổi (cờ lưu theo bit): di-lai, noi-chuyen, bai-hoc, man-2, man-3, trang-vang', () => {
    expect([...GUIDE_SECTION_IDS]).toEqual(['di-lai', 'noi-chuyen', 'bai-hoc', 'man-2', 'man-3', 'trang-vang']);
  });
  it('hộp chung (không id, id lạ, id phần chung): chỉ Đi lại và Nói chuyện, đúng thứ tự', () => {
    for (const id of [undefined, 'khong-co', 'di-lai', 'noi-chuyen']) expect(guideSectionsFor(id).map((s) => s.id)).toEqual(['di-lai', 'noi-chuyen']);
  });
  it('phần riêng (thẻ bắt đầu màn 2, màn 3): hộp chỉ có đúng phần đó; Bài học và Trang Sổ Vàng cũng là phần riêng, ẩn khỏi hộp chung', () => {
    expect(guideSectionsFor('man-2').map((s) => s.id)).toEqual(['man-2']);
    expect(guideSectionsFor('man-3').map((s) => s.id)).toEqual(['man-3']);
    const rieng = GUIDE_SECTIONS.filter((s) => (s as { rieng?: true }).rieng).map((s) => s.id);
    expect(rieng).toEqual(['bai-hoc', 'man-2', 'man-3', 'trang-vang']);
    for (const id of rieng) expect(guideSectionsFor(undefined).some((s) => s.id === id)).toBe(false);
  });
  it('mọi phần mở từ thẻ bắt đầu của game (có man) là phần riêng: không lọt vào hộp chung', () => {
    for (const s of GUIDE_SECTIONS) if ((s as { man?: readonly number[] }).man) expect((s as { rieng?: true }).rieng, s.id).toBe(true);
  });
});

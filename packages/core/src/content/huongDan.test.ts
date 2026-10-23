import { describe, expect, it } from 'vitest';
import { fmt } from './characters';
import { GUIDE_ART_IDS, GUIDE_SECTIONS, GUIDE_SECTION_IDS, GUIDE_SHOT_IDS, guideFigure, guideSection, guideSectionsFor, guideSectionOfLevel, guideText, huongDan, type GuidePage } from './huongDan';

const pages: { section: string; page: GuidePage }[] = GUIDE_SECTIONS.flatMap((s) => (s.trang as readonly GuidePage[]).map((page) => ({ section: s.id, page })));
const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean);
const TOUCH_WORDS = /vuốt|chạm|cần điều khiển|nút bàn tay/i;
const KEY_WORDS = /phím|bấm chuột|nhấp chuột|rê chuột|Shift|Space|Esc|bấm E\b/;

describe('cấu trúc Hướng dẫn chơi', () => {
  it('đủ các phần (6 phần của đề bài, rồi màn 8, màn 12 từ bước HD, màn 5 từ bước B7), id không trùng, thứ tự bit cố định (chỉ được thêm vào cuối)', () => {
    expect(GUIDE_SECTION_IDS.slice(0, 6)).toEqual(['di-lai', 'noi-chuyen', 'bai-hoc', 'man-2', 'man-3', 'trang-vang']);
    expect(GUIDE_SECTION_IDS.slice(6)).toEqual(['man-8', 'man-12', 'man-5']);
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
    expect(guideSectionOfLevel(5)).toBe('man-5');
    expect(guideSectionOfLevel(8)).toBe('man-8');
    expect(guideSectionOfLevel(12)).toBe('man-12');
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
    expect([...GUIDE_SECTION_IDS]).toEqual(['di-lai', 'noi-chuyen', 'bai-hoc', 'man-2', 'man-3', 'trang-vang', 'man-8', 'man-12', 'man-5']);
  });
  it('hộp chung (không id, id lạ, id phần chung): chỉ Đi lại và Nói chuyện, đúng thứ tự', () => {
    for (const id of [undefined, 'khong-co', 'di-lai', 'noi-chuyen']) expect(guideSectionsFor(id).map((s) => s.id)).toEqual(['di-lai', 'noi-chuyen']);
  });
  it('phần riêng (thẻ bắt đầu màn 2, màn 3): hộp chỉ có đúng phần đó; Bài học và Trang Sổ Vàng cũng là phần riêng, ẩn khỏi hộp chung', () => {
    expect(guideSectionsFor('man-2').map((s) => s.id)).toEqual(['man-2']);
    expect(guideSectionsFor('man-3').map((s) => s.id)).toEqual(['man-3']);
    expect(guideSectionsFor('man-8').map((s) => s.id)).toEqual(['man-8']);
    expect(guideSectionsFor('man-12').map((s) => s.id)).toEqual(['man-12']);
    const rieng = GUIDE_SECTIONS.filter((s) => (s as { rieng?: true }).rieng).map((s) => s.id);
    expect(guideSectionsFor('man-5').map((s) => s.id)).toEqual(['man-5']);
    expect(rieng).toEqual(['bai-hoc', 'man-2', 'man-3', 'trang-vang', 'man-8', 'man-12', 'man-5']);
    for (const id of rieng) expect(guideSectionsFor(undefined).some((s) => s.id === id)).toBe(false);
  });
  it('mọi phần mở từ thẻ bắt đầu của game (có man) là phần riêng: không lọt vào hộp chung', () => {
    for (const s of GUIDE_SECTIONS) if ((s as { man?: readonly number[] }).man) expect((s as { rieng?: true }).rieng, s.id).toBe(true);
  });
});

describe('hướng dẫn riêng của màn 8 và màn 12 (bước HD)', () => {
  const man8 = guideSectionsFor('man-8')[0];
  const man12 = guideSectionsFor('man-12')[0];
  it('mỗi phần 3 đến 4 trang, mỗi trang một hình vẽ bằng code (SVG, không dùng ảnh chụp)', () => {
    for (const s of [man8, man12]) {
      expect(s.trang.length, s.id).toBeGreaterThanOrEqual(3);
      expect(s.trang.length, s.id).toBeLessThanOrEqual(4);
      for (const p of s.trang) {
        expect('art' in p.hinh, s.id).toBe(true);
        if (p.hinhDt) expect('art' in p.hinhDt, s.id).toBe(true);
      }
    }
  });
  it('màn 8 nói đủ: lật 2 thẻ mỗi lượt, Khuôn tập x ghép Mẫu công khai 5^x mod 23 (ví dụ 3 và 10), Máy tính mod, vòng 3 tráo 2 thẻ đang úp', () => {
    const all = fmt(man8.trang.map((p) => guideText(p, 'may')).join(' '));
    expect(all).toMatch(/lật 2 thẻ/);
    expect(all).toMatch(/Khuôn tập x ghép với thẻ Mẫu công khai 5\^\^x\^\^ mod 23/);
    expect(all).toMatch(/Khuôn tập 3 ghép với Mẫu công khai 10/);
    expect(5 ** 3 % 23).toBe(10);
    expect(all).toMatch(/Máy tính mod/);
    expect(all).toMatch(/vòng 3/i);
    expect(all).toMatch(/tráo chỗ 2 thẻ đang úp/);
    expect(all).toContain('Tí');
  });
  it('màn 12 nói đủ: đèn lồng ghi Sổ và Nay, chọn cái có hai số khác nhau, bật đúng lúc đèn tới trên đầu, nắm nhầm mất 1 tim, trượt mất 2 đồng, tầng lá bắt {phanDien}', () => {
    const all = man12.trang.map((p) => guideText(p, 'may')).join(' ');
    expect(all).toMatch(/đèn lồng ghi số Sổ và số Nay/);
    expect(all).toMatch(/hai số khác nhau/);
    expect(all).toMatch(/ngay trên đầu/);
    expect(all).toMatch(/mất 1 tim/);
    expect(all).toMatch(/mất 2 đồng/);
    expect(all).toMatch(/tầng lá/);
    expect(all).toContain('{phanDien}');
  });
  it('màn 12: cách bật khác nhau theo thiết bị (máy tính: chuột hoặc Space; điện thoại: chạm); các trang khác dùng lời chung', () => {
    const p = man12.trang[1];
    expect(guideText(p, 'may')).toMatch(/Space/);
    expect(guideText(p, 'dt')).toMatch(/chạm/);
    expect(guideText(p, 'dt')).not.toMatch(/Space|chuột/);
    expect(guideFigure(p, 'may')).not.toEqual(guideFigure(p, 'dt'));
  });
  it('màn 8: lời cho điện thoại nói chạm, lời cho máy tính nói phím mũi tên và Enter', () => {
    const p = man8.trang[0];
    expect(guideText(p, 'may')).toMatch(/phím mũi tên và Enter/);
    expect(guideText(p, 'dt')).toMatch(/Chạm/);
  });
});

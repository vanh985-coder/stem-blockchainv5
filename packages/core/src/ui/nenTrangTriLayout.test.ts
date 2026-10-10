import { describe, expect, it } from 'vitest';
import { LEVELS } from '../content/levels';
import { PAGE_THEME, STORY_THEME_RANGES, VILLAGE_THEME, storyTheme } from '../content/nenTrangTri';
import {
  BOARD_WIDTH,
  MAX_ICONS,
  MIN_GUTTER,
  MIN_ICONS,
  NARROW_MAX,
  NARROW_SPARKLES,
  SIDES_MIN_SCREEN,
  SIDE_MAX,
  SPARKLES,
  THEME_KINDS,
  floatersFor,
  visibleCount,
} from './nenTrangTriLayout';

const THEMES = Object.keys(THEME_KINDS) as (keyof typeof THEME_KINDS)[];

describe('bộ icon nền trang trí', () => {
  it('có 7 bộ: mo, lang, hoi và 4 bộ theo làng', () => {
    expect([...THEMES].sort()).toEqual(['bac', 'det', 'giay', 'hoi', 'khacdau', 'lang', 'mo']);
  });

  it.each(THEMES)('bộ %s có 8 đến 12 icon', (t) => {
    expect(THEME_KINDS[t].length).toBeGreaterThanOrEqual(MIN_ICONS);
    expect(THEME_KINDS[t].length).toBeLessThanOrEqual(MAX_ICONS);
    expect(floatersFor(t, 'full')).toHaveLength(THEME_KINDS[t].length);
  });

  it('bộ theo làng đúng chủ đề (giấy dó, khung phơi, lá tre; thoi, cuộn chỉ, vải; con dấu, khuôn gỗ, mực; đồng bạc, lá, cành)', () => {
    const has = (t: keyof typeof THEME_KINDS, ...k: string[]) => k.every((x) => (THEME_KINDS[t] as readonly string[]).includes(x));
    expect(has('giay', 'giay', 'khungphoi', 'la')).toBe(true);
    expect(has('det', 'thoi', 'cuonchi', 'manhvai')).toBe(true);
    expect(has('khacdau', 'condau', 'khuongo', 'muc')).toBe(true);
    expect(has('bac', 'dongbac', 'lacay', 'canh')).toBe(true);
  });

  it('bố trí xác định: cùng đầu vào thì cùng kết quả; vị trí nằm trong màn hình', () => {
    expect(floatersFor('lang', 'full')).toEqual(floatersFor('lang', 'full'));
    for (const t of THEMES) {
      for (const f of floatersFor(t, 'full')) {
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.x).toBeLessThanOrEqual(100);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.y).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('hai khoảng trống hai bên bảng bài học', () => {
  it('tối đa 4 icon mỗi bên, chia đều trái và phải', () => {
    for (const t of THEMES) {
      const list = floatersFor(t, 'sides');
      expect(list.filter((f) => f.side === 'l')).toHaveLength(SIDE_MAX);
      expect(list.filter((f) => f.side === 'r')).toHaveLength(SIDE_MAX);
    }
  });

  it('chỉ hiện khi mỗi bên còn ≥ 48px: màn hình từ 1296px (bảng 1200px)', () => {
    expect(BOARD_WIDTH).toBe(1200);
    expect(SIDES_MIN_SCREEN).toBe(BOARD_WIDTH + 2 * MIN_GUTTER);
    expect(SIDES_MIN_SCREEN).toBe(1296);
  });

  it('trôi rất chậm: mỗi vòng ≥ 45 giây, quãng trôi ngắn', () => {
    for (const f of floatersFor('bac', 'sides')) {
      expect(f.dur).toBeGreaterThanOrEqual(45);
      expect(Math.abs(f.dx)).toBeLessThanOrEqual(10);
      expect(Math.abs(f.dy)).toBeLessThanOrEqual(10);
    }
    // 'full' trôi nhanh hơn
    expect(Math.max(...floatersFor('bac', 'full').map((f) => f.dur))).toBeLessThan(45);
  });
});

describe('màn hình hẹp và tia sáng', () => {
  it('dưới 640px tối đa 5 icon', () => {
    expect(NARROW_MAX).toBe(5);
    expect(visibleCount(10, true)).toBe(5);
    expect(visibleCount(3, true)).toBe(3);
    expect(visibleCount(10, false)).toBe(10);
    expect(NARROW_MAX - NARROW_SPARKLES + NARROW_SPARKLES).toBe(5);
  });

  it('có vài tia sáng lấp lánh cho cảnh trao Trang Sổ Vàng', () => {
    expect(SPARKLES.length).toBeGreaterThanOrEqual(5);
  });
});

describe('bảng gán bộ icon theo trang', () => {
  it('trang chủ, hồ sơ, đăng nhập, đăng ký, quyền riêng tư, bản đồ, giáo viên: bộ "lang"', () => {
    expect(PAGE_THEME).toEqual({
      trangChu: 'lang',
      hoSo: 'lang',
      dangNhap: 'lang',
      dangKy: 'lang',
      quyenRiengTu: 'lang',
      banDo: 'lang',
      giaoVien: 'lang',
    });
  });

  it('mỗi làng một bộ icon riêng, đủ cho cả 4 bài học (màn 1, 4, 7, 10)', () => {
    expect(VILLAGE_THEME).toEqual({ 'lang-giay': 'giay', 'lang-det': 'det', 'lang-khac-dau': 'khacdau', 'lang-bac': 'bac' });
    for (const l of LEVELS.filter((x) => x.kind === 'lesson')) expect(VILLAGE_THEME[l.lang]).toBeDefined();
  });

  it('truyện đổi bộ theo lượt: 1–5 mo, 6–11 lang, 12–14 hoi; phủ kín 14 lượt', () => {
    const got = Array.from({ length: 14 }, (_, i) => storyTheme(i + 1));
    expect(got).toEqual(['mo', 'mo', 'mo', 'mo', 'mo', 'lang', 'lang', 'lang', 'lang', 'lang', 'lang', 'hoi', 'hoi', 'hoi']);
    expect(STORY_THEME_RANGES[0].from).toBe(1);
    expect(STORY_THEME_RANGES[STORY_THEME_RANGES.length - 1].to).toBe(14);
    expect(storyTheme(0)).toBe('mo');
    expect(storyTheme(99)).toBe('hoi');
  });
});

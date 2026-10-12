import { describe, expect, it } from 'vitest';
import {
  BOARD_BASE_WIDTH,
  BOARD_ZOOM_MAX,
  FRAME_MARGIN,
  FRAME_MAX_HEIGHT,
  FRAME_MAX_WIDTH,
  FRAME_MIN_WIDTH,
  LESSON_FPS_MIN,
  MIN_VIEWPORT_WIDTH,
  boardZoomFor,
  frameWidthFor,
  isWeakDevice,
  lessonFrameLayout,
  shouldHideForFps,
  shouldReserveFrameLayout,
  shouldShowLessonFrames,
  type FrameVisibilityInput,
} from './frames';

const base: FrameVisibilityInput = { viewportWidth: 1920, viewportHeight: 1080, reducedMotion: false, level: 'medium' };

describe('bề rộng khung f = 14% màn, kẹp 180 đến 280px', () => {
  it('các cỡ màn thường gặp', () => {
    expect(frameWidthFor(1280)).toBe(180); // 14% = 179,2 → kẹp lên 180
    expect(frameWidthFor(1366)).toBe(191);
    expect(frameWidthFor(1536)).toBe(215);
    expect(frameWidthFor(1920)).toBe(269);
  });
  it('kẹp ở hai đầu', () => {
    expect(frameWidthFor(800)).toBe(FRAME_MIN_WIDTH);
    expect(frameWidthFor(3840)).toBe(FRAME_MAX_WIDTH);
  });
});

describe('hệ số phóng của bảng s (chừa chỗ cho khung)', () => {
  it('s = (rộng màn − 2 × (f + 16)) / rộng gốc của bảng, tối đa 1,35', () => {
    expect(boardZoomFor(1280, 180)).toBeCloseTo((1280 - 2 * (180 + FRAME_MARGIN)) / BOARD_BASE_WIDTH, 10);
    expect(boardZoomFor(1280, 180)).toBeCloseTo(1.0183, 3);
    expect(boardZoomFor(1366, 191)).toBeCloseTo(1.0917, 3);
    expect(boardZoomFor(1536, 215)).toBeCloseTo(1.2317, 3);
    expect(boardZoomFor(1920, 269)).toBe(BOARD_ZOOM_MAX);
  });
});

describe('kích thước và chỗ đặt hai khung', () => {
  it('1280×900: f 180, s ≈ 1,0, khung nằm giữa khoảng trống 196px mỗi bên', () => {
    const l = lessonFrameLayout(1280, 900)!;
    expect(l.width).toBe(180);
    expect(l.zoom).toBeGreaterThanOrEqual(1);
    expect(l.zoom).toBeCloseTo(1.0, 1);
    expect(l.inset).toBe(8);
  });
  it('1366: f ≈ 191; 1536: f ≈ 215; 1920: s đạt giới hạn 1,35', () => {
    expect(lessonFrameLayout(1366, 900)!.width).toBe(191);
    expect(lessonFrameLayout(1536, 900)!.width).toBe(215);
    const l = lessonFrameLayout(1920, 1080)!;
    expect(l.zoom).toBe(1.35);
    expect(l).toEqual({ width: 269, height: 420, bottom: 16, inset: 51, zoom: 1.35 });
  });
  it('màn rộng hơn nữa vẫn tối đa 280×420 và s = 1,35', () => {
    const l = lessonFrameLayout(3840, 2160)!;
    expect(l.width).toBe(FRAME_MAX_WIDTH);
    expect(l.height).toBe(FRAME_MAX_HEIGHT);
    expect(l.zoom).toBe(BOARD_ZOOM_MAX);
  });
  it('mọi cỡ màn từ 1280 đến 3840: s từ 1 đến 1,35; khung nằm trọn trong khoảng trống, không đè bảng, cách bảng ít nhất 8px', () => {
    for (let w = MIN_VIEWPORT_WIDTH; w <= 3840; w += 4) {
      const l = lessonFrameLayout(w, 1000);
      expect(l, `vw=${w}`).not.toBeNull();
      const { zoom, width, inset } = l!;
      expect(zoom, `vw=${w}`).toBeGreaterThanOrEqual(1);
      expect(zoom, `vw=${w}`).toBeLessThanOrEqual(BOARD_ZOOM_MAX);
      const gap = (w - BOARD_BASE_WIDTH * zoom) / 2;
      expect(inset, `vw=${w}`).toBeGreaterThanOrEqual(8);
      expect(inset + width + 8, `vw=${w}`).toBeLessThanOrEqual(gap + 1e-6);
    }
  });
  it('có thanh cuộn dọc thì tính trên phần còn lại; còn lại không đủ chỗ thì bố cục cũ', () => {
    const noBar = lessonFrameLayout(1366, 900)!;
    const bar = lessonFrameLayout(1366, 900, 15)!;
    expect(bar.zoom).toBeLessThan(noBar.zoom);
    expect(bar.width).toBe(frameWidthFor(1351));
    expect(lessonFrameLayout(1280, 900, 30)).toBeNull(); // 1250px còn lại: s ≈ 0,984 < 0,99
  });
  it('thanh cuộn 17px (Windows) ở đúng 1280px: s hơi dưới 1 vẫn dùng 1, có khung', () => {
    const l = lessonFrameLayout(1280, 900, 17)!;
    expect(boardZoomFor(1263, frameWidthFor(1263))).toBeLessThan(1);
    expect(l.zoom).toBe(1);
    expect(l.inset).toBeGreaterThanOrEqual(6);
    expect(l.inset + l.width).toBeLessThan((1263 - BOARD_BASE_WIDTH) / 2); // vẫn không đè lên bảng
  });
  it('dưới 1280px luôn không có khung, kể cả không có số', () => {
    expect(lessonFrameLayout(1279, 2000)).toBeNull();
    expect(lessonFrameLayout(Number.NaN, 1000)).toBeNull();
  });
  it('cửa sổ thấp thì khung thấp theo; quá thấp thì ẩn', () => {
    expect(lessonFrameLayout(1920, 500)!.height).toBe(500 - 16 - 80);
    expect(lessonFrameLayout(1920, 300)).toBeNull();
  });
});

describe('có hiện hai khung không (spec 03 mục 4)', () => {
  it('máy khỏe, màn rộng, không giảm chuyển động: hiện', () => {
    expect(shouldShowLessonFrames(base)).toBe(true);
    expect(shouldShowLessonFrames({ ...base, level: 'high' })).toBe(true);
  });
  it('ẩn khi màn dưới 1280px', () => {
    expect(shouldShowLessonFrames({ ...base, viewportWidth: 1279 })).toBe(false);
    expect(shouldShowLessonFrames({ ...base, viewportWidth: 375 })).toBe(false);
  });
  it('ẩn khi bật "Giảm chuyển động"', () => {
    expect(shouldShowLessonFrames({ ...base, reducedMotion: true })).toBe(false);
  });
  it('ẩn khi bật "Chữ to" (bảng giữ cỡ cũ)', () => {
    expect(shouldShowLessonFrames({ ...base, largeText: true })).toBe(false);
    expect(shouldReserveFrameLayout({ ...base, largeText: true })).toBe(false);
  });
  it('ẩn khi máy yếu = mức Thấp', () => {
    expect(isWeakDevice('low')).toBe(true);
    expect(isWeakDevice('medium')).toBe(false);
    expect(shouldShowLessonFrames({ ...base, level: 'low' })).toBe(false);
  });
  it('ẩn khi tải lỗi, khi FPS thấp, hoặc khi tạm dừng (cảnh trao trang)', () => {
    expect(shouldShowLessonFrames({ ...base, failed: true })).toBe(false);
    expect(shouldShowLessonFrames({ ...base, tooSlow: true })).toBe(false);
    expect(shouldShowLessonFrames({ ...base, suspended: true })).toBe(false);
  });
  it('mọi điều kiện ẩn đều thắng, dù các điều kiện khác thỏa', () => {
    const bad: Partial<FrameVisibilityInput>[] = [{ viewportWidth: 1000 }, { reducedMotion: true }, { largeText: true }, { level: 'low' }, { failed: true }, { tooSlow: true }, { suspended: true }];
    for (const b of bad) expect(shouldShowLessonFrames({ ...base, ...b })).toBe(false);
  });
});

describe('dành chỗ cho khung (bố cục quyết định lúc mở trang)', () => {
  it('dành chỗ khi đủ điều kiện lúc mở trang', () => {
    expect(shouldReserveFrameLayout(base)).toBe(true);
    expect(shouldReserveFrameLayout({ ...base, viewportWidth: 1280 })).toBe(true);
  });
  it('không dành chỗ: màn dưới 1280px, Giảm chuyển động, Chữ to, máy yếu', () => {
    expect(shouldReserveFrameLayout({ ...base, viewportWidth: 1279 })).toBe(false);
    expect(shouldReserveFrameLayout({ ...base, reducedMotion: true })).toBe(false);
    expect(shouldReserveFrameLayout({ ...base, largeText: true })).toBe(false);
    expect(shouldReserveFrameLayout({ ...base, level: 'low' })).toBe(false);
  });
  it('tải lỗi, FPS thấp hay cảnh trao trang chỉ ẩn khung, KHÔNG đổi bố cục (bảng không nhảy)', () => {
    for (const x of [{ failed: true }, { tooSlow: true }, { suspended: true }]) {
      expect(shouldShowLessonFrames({ ...base, ...x })).toBe(false);
      expect(shouldReserveFrameLayout({ ...base, ...x })).toBe(true);
    }
  });
});

describe('FPS thấp thì ẩn và dọn', () => {
  it('ngưỡng 30: dưới thì ẩn, đúng 30 hoặc hơn thì giữ', () => {
    expect(LESSON_FPS_MIN).toBe(30);
    expect(shouldHideForFps(29.9)).toBe(true);
    expect(shouldHideForFps(30)).toBe(false);
    expect(shouldHideForFps(60)).toBe(false);
  });
});

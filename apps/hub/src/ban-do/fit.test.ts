import { describe, expect, it } from 'vitest';
import { BIG_MIN_WIDTH, GAP, MAP_RATIO, PANEL_W, fitMap, markerScale } from './fit';

describe('cỡ bản đồ /ban-do từ 1024px', () => {
  it('tỉ lệ ảnh 1920×1047, bảng làng 360px', () => {
    expect(MAP_RATIO).toBeCloseTo(1.8338, 3);
    expect(PANEL_W).toBe(360);
    expect(BIG_MIN_WIDTH).toBe(1024);
  });

  it('màn hình thấp: bản đồ lấy theo chiều cao còn lại, giữ đúng tỉ lệ', () => {
    const f = fitMap(3000, 600);
    expect(f.h).toBe(600);
    expect(f.w).toBe(Math.floor(600 * MAP_RATIO));
    expect(Math.abs(f.w / f.h - MAP_RATIO)).toBeLessThan(0.01);
  });

  it('màn hình hẹp: bản đồ lấy theo chiều ngang, đã trừ bảng làng và khoảng cách', () => {
    const f = fitMap(1000, 2000);
    expect(f.w).toBe(1000 - PANEL_W - GAP);
    expect(f.h).toBe(Math.floor(f.w / MAP_RATIO));
    expect(f.total).toBeLessThanOrEqual(1000);
  });

  it('cả cụm không vượt vùng khả dụng ở các cỡ màn hình thường gặp', () => {
    // vùng khả dụng = màn hình trừ thanh trên và lề (ước lượng)
    for (const [w, h] of [[1920 - 32, 1080 - 150], [1366 - 32, 768 - 150], [1024 - 32, 768 - 150]]) {
      const f = fitMap(w, h);
      expect(f.total).toBeLessThanOrEqual(w);
      expect(f.h).toBeLessThanOrEqual(h);
      expect(f.w).toBeGreaterThan(0);
    }
  });

  it('bị giới hạn bởi chiều cao khi màn hình đủ rộng; bởi chiều ngang khi không đủ', () => {
    const tall = fitMap(1920 - 32, 700);
    expect(tall.h).toBe(700); // theo chiều cao
    const wide = fitMap(1920 - 32, 1080 - 150);
    expect(wide.w).toBe(1920 - 32 - PANEL_W - GAP); // theo chiều ngang
    const mid = fitMap(1366 - 32, 768 - 150);
    expect(mid.w).toBe(1366 - 32 - PANEL_W - GAP);
  });

  it('không gian âm hoặc quá nhỏ thì cỡ 0, không lỗi', () => {
    expect(fitMap(100, 100)).toMatchObject({ w: 0, h: 0 });
    expect(fitMap(-5, -5).w).toBe(0);
  });
});

describe('nhãn làng phóng theo cỡ bản đồ', () => {
  it('lớn dần theo bản đồ nhưng có giới hạn dưới và trên', () => {
    const small = markerScale(300);
    const mid = markerScale(900);
    const large = markerScale(1700);
    expect(mid.font).toBeGreaterThan(small.font);
    expect(large.font).toBeGreaterThanOrEqual(mid.font);
    expect(small.font).toBe(14);
    expect(large.font).toBe(24);
    expect(small.dot).toBe(24);
    expect(large.dot).toBe(38);
    expect(large.gold).toBeLessThanOrEqual(52);
  });

  it('vùng bấm luôn ≥ 44px và chữ nhãn ≥ 14px', () => {
    for (const w of [0, 200, 616, 958, 1500, 3000]) {
      const s = markerScale(w);
      expect(s.target).toBeGreaterThanOrEqual(44);
      expect(s.font).toBeGreaterThanOrEqual(14);
    }
  });
});

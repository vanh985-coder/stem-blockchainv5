import { describe, expect, it } from 'vitest';
import { BUBBLE_SPEC } from './bubbleConfig';
import { FIELD_H, FIELD_W, angleFromPoint, eggFontPx, fitField, modeFor } from './bubbleLayout';
import { launcherPoint } from './bubbleLogic';

describe('bubbleLayout: bố cục khung chơi', () => {
  it('khung ngang cho PC và điện thoại xoay ngang, khung dọc cho điện thoại dọc và máy tính bảng dọc', () => {
    expect(modeFor(1366, 768)).toBe('wide');
    expect(modeFor(1920, 1080)).toBe('wide');
    expect(modeFor(844, 390)).toBe('wide');
    expect(modeFor(360, 800)).toBe('tall');
    expect(modeFor(768, 1024)).toBe('tall');
  });

  it('vùng chơi vừa khít khung, giữ tỉ lệ, không tràn', () => {
    for (const [w, h] of [[600, 700], [344, 600], [330, 340], [420, 300], [800, 900]] as const) {
      const f = fitField(w, h);
      expect(f.w).toBeLessThanOrEqual(w + 1e-6);
      expect(f.h).toBeLessThanOrEqual(h + 1e-6);
      expect(f.ox).toBeGreaterThanOrEqual(0);
      expect(f.oy).toBeGreaterThanOrEqual(0);
      expect(f.w / f.h).toBeCloseTo(FIELD_W / FIELD_H, 5);
    }
  });

  it('số trên trứng không dưới 14 điểm ảnh ở 360×800 (bàn rộng 344) và ở cỡ nhỏ nhất', () => {
    const tall = fitField(344, 600);
    expect(tall.scale).toBeGreaterThan(30);
    expect(eggFontPx(tall.scale)).toBeGreaterThanOrEqual(14);
    expect(eggFontPx(10)).toBe(14);
  });

  it('cột giữa ở 1366×768 và 1920×1080 chiếm khoảng 40 đến 45% chiều rộng và trứng đủ lớn', () => {
    for (const [W, H] of [[1366, 768], [1920, 1080]] as const) {
      const col = W * 0.44;
      const f = fitField(col - 16, H - 16 - 64);
      expect(col / W).toBeGreaterThanOrEqual(0.4);
      expect(col / W).toBeLessThanOrEqual(0.45);
      expect(f.scale).toBeGreaterThan(40);
    }
  });

  it('góc ngắm: trỏ thẳng lên là 90 độ, sang trái lớn hơn, sang phải nhỏ hơn, kẹp trong 12 đến 168', () => {
    const f = fitField(500, 600);
    const l = launcherPoint();
    const px = f.ox + l.x * f.scale;
    const py = f.oy + l.y * f.scale;
    expect(angleFromPoint(f, px, py - 100)).toBeCloseTo(90, 5);
    expect(angleFromPoint(f, px - 100, py - 100)).toBeCloseTo(135, 5);
    expect(angleFromPoint(f, px + 100, py - 100)).toBeCloseTo(45, 5);
    expect(angleFromPoint(f, px + 500, py + 50)).toBe(BUBBLE_SPEC.minAngle);
    expect(angleFromPoint(f, px - 500, py + 50)).toBe(BUBBLE_SPEC.maxAngle);
  });
});

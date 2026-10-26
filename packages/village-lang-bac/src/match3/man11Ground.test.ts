import { describe, expect, it } from 'vitest';
import { cutoutWhite, shade } from './man11Ground';

/** Ảnh thử w × h: trời xanh (trên), cỏ xanh lá (giữa), nền trắng (dưới); `island` là một mảng trắng nằm trong trời (mây), không nối với mép dưới. */
function image(w: number, h: number, grassTop: number, island = true): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const sky = y < h * 0.3;
      const white = y >= grassTop;
      const [r, g, b] = white ? [255, 255, 255] : sky ? [150, 200, 240] : [110, 170, 70];
      d[p] = r;
      d[p + 1] = g;
      d[p + 2] = b;
      d[p + 3] = 255;
    }
  }
  if (island) {
    for (let y = 4; y < 10; y++) for (let x = 10; x < 20; x++) d.set([252, 252, 252, 255], (y * w + x) * 4);
  }
  return d;
}

describe('man11Ground: làm trong suốt nền trắng của ảnh nền', () => {
  const w = 120;
  const h = 80;
  const top = 52;

  it('phần trắng nối với mép dưới thành trong suốt; cỏ, trời và mảng trắng không nối mép (mây) giữ nguyên', () => {
    const d = image(w, h, top);
    const cut = cutoutWhite(d, w, h);
    const alpha = (x: number, y: number) => d[(y * w + x) * 4 + 3];
    expect(alpha(60, h - 1)).toBe(0);
    expect(alpha(60, top + 6)).toBe(0);
    expect(alpha(60, 20)).toBe(255); // trời
    expect(alpha(60, top - 6)).toBe(255); // cỏ cách mép 6 điểm ảnh
    expect(alpha(14, 6)).toBe(255); // mây trắng nằm trong trời: giữ
    expect(cut.cleared).toBeGreaterThan(w * (h - top) - 4 * w);
    expect(cut.cleared).toBeLessThan(w * (h - top) + 4 * w); // bóc thêm vài điểm ảnh quanh mép, không hơn
  });

  it('bóc 2 điểm ảnh quanh vùng trắng (hết viền trắng nhạt) và làm mờ mép 1 điểm ảnh', () => {
    const d = image(w, h, top, false);
    cutoutWhite(d, w, h);
    const alpha = (y: number) => d[(y * w + 60) * 4 + 3];
    expect(alpha(top - 1)).toBe(0);
    expect(alpha(top - 2)).toBe(0);
    expect(alpha(top - 3)).toBe(140); // mép mờ
    expect(alpha(top - 4)).toBe(255);
  });

  it('màu cỏ lấy từ phía trên mép và vị trí mép tính theo tỉ lệ chiều cao', () => {
    const d = image(w, h, top);
    const cut = cutoutWhite(d, w, h);
    expect(cut.grass).toEqual([110, 170, 70]);
    expect(cut.top).toBeCloseTo(top / h, 5);
  });

  it('ảnh không có nền trắng: không làm trong suốt gì, màu cỏ mặc định', () => {
    const d = new Uint8ClampedArray(w * h * 4).fill(120);
    for (let p = 3; p < d.length; p += 4) d[p] = 255;
    const cut = cutoutWhite(d, w, h);
    expect(cut.cleared).toBe(0);
    expect(cut.top).toBe(1);
    expect(cut.grass).toEqual([140, 190, 90]);
  });

  it('shade nhân màu và giữ trong khoảng 0 đến 255', () => {
    expect(shade([100, 200, 50], 0.5)).toBe('rgb(50, 100, 25)');
    expect(shade([200, 200, 200], 2)).toBe('rgb(255, 255, 255)');
  });
});

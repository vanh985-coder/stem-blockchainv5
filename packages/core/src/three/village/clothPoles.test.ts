import { describe, expect, it } from 'vitest';
import { createMulberry32 } from '../../lib/rng';
import { CLOTH_MIN_LENGTH, CLOTH_PALETTE, CLOTH_SLOTS, clothCode, clothPoleTint, decodeClothCode } from './clothPoles';

/** Độ bão hòa HSV của một màu sRGB (0 đến 1): để kiểm màu nhuộm bớt chói. */
function saturation(hex: number): number {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  const mx = Math.max(r, g, b);
  return mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
}

describe('vải trên sào phơi (clothPoles.ts)', () => {
  it('sáu màu nhuộm tự nhiên (đỏ son, hồng, chàm, vàng nghệ, nâu, trắng mộc), không màu nào chói (bão hòa dưới 0,75)', () => {
    expect(CLOTH_PALETTE).toHaveLength(6);
    expect(new Set(CLOTH_PALETTE).size).toBe(6);
    for (const hex of CLOTH_PALETTE) expect(saturation(hex), hex.toString(16)).toBeLessThan(0.75);
  });

  it('mã chỗ treo: 0 là trống; còn lại mã hóa và giải mã được màu và độ dài, nằm trong (0, 0,875]', () => {
    expect(decodeClothCode(0)).toEqual({ on: false, color: -1, length: 0 });
    for (let c = 0; c < 6; c++) {
      for (const l of [0, 0.25, 0.5, 0.99]) {
        const code = clothCode(c, l);
        expect(code).toBeGreaterThan(0);
        expect(code).toBeLessThanOrEqual(0.875);
        const d = decodeClothCode(code);
        expect(d.on).toBe(true);
        expect(d.color).toBe(c);
        expect(d.length).toBeCloseTo(CLOTH_MIN_LENGTH + (1 - CLOTH_MIN_LENGTH) * l, 5);
      }
    }
    expect(decodeClothCode(clothCode(2, 0)).length).toBeCloseTo(CLOTH_MIN_LENGTH, 9);
  });

  it('chọn vải bằng rng cố định: cùng seed cùng kết quả, khác seed khác kết quả', () => {
    const run = (seed: number) => {
      const rng = createMulberry32(seed);
      return Array.from({ length: 30 }, () => clothPoleTint(rng));
    };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
  });

  it('mỗi sào để trống hoặc có 1 đến 3 tấm, mỗi tấm MỘT màu; đủ cả sáu màu, dài ngắn khác nhau, tỉ lệ sào trống khoảng 12%', () => {
    const rng = createMulberry32(20260212);
    const N = 2000;
    const counts = [0, 0, 0, 0];
    const colors = new Set<number>();
    const lengths: number[] = [];
    for (let i = 0; i < N; i++) {
      const slots = clothPoleTint(rng).map(decodeClothCode);
      expect(slots).toHaveLength(CLOTH_SLOTS);
      const on = slots.filter((s) => s.on);
      counts[on.length]++;
      for (const s of on) {
        expect(s.color).toBeGreaterThanOrEqual(0);
        expect(s.color).toBeLessThan(6);
        expect(s.length).toBeGreaterThanOrEqual(CLOTH_MIN_LENGTH);
        expect(s.length).toBeLessThanOrEqual(1);
        colors.add(s.color);
        lengths.push(s.length);
      }
    }
    expect(counts[0] / N).toBeGreaterThan(0.08);
    expect(counts[0] / N).toBeLessThan(0.16);
    for (const k of [1, 2, 3]) expect(counts[k], `${k} tấm`).toBeGreaterThan(N * 0.2);
    expect(colors.size).toBe(6);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeGreaterThan(0.45);
  });
});

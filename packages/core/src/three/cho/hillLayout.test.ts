import { describe, expect, it } from 'vitest';
import { VILLAGE_FRAMES } from '../world/worldFrames';
import { reservedCenter } from '../world/worldLayout';
import { hillExtent, layoutHills, type HillAvoid } from './hillLayout';

const WORLD_HILLS = { minDistance: 400, spread: 60, size: 80, sizeVar: 60, height: 28, heightVar: 20 };
const AVOID: HillAvoid[] = VILLAGE_FRAMES.map((f) => ({ ...reservedCenter(f), r: 125 + 8 }));

describe('layoutHills (đồi xa của thế giới mở)', () => {
  it('không có vòng tránh thì đúng như chỗ cũ (đồi đầu ở khoảng (399; 51), chín đồi)', () => {
    const hills = layoutHills(WORLD_HILLS);
    expect(hills).toHaveLength(9);
    expect(hills[0].x).toBeCloseTo(399, 0);
    expect(hills[0].z).toBeCloseTo(51, 0);
  });

  it('có một đồi lấn sâu vào Làng Khắc Dấu khi không tránh (cách tâm 209, rộng 170)', () => {
    const khacDau = AVOID[2];
    const hills = layoutHills(WORLD_HILLS);
    const worst = Math.min(...hills.map((h) => Math.hypot(h.x - khacDau.x, h.z - khacDau.z) - hillExtent(h, (h.x - khacDau.x) / Math.hypot(h.x - khacDau.x, h.z - khacDau.z), (h.z - khacDau.z) / Math.hypot(h.x - khacDau.x, h.z - khacDau.z))));
    expect(worst).toBeLessThan(125);
  });

  it('có vòng tránh: mép mọi đồi cách mọi làng ít nhất bán kính làng (125) cộng chừa', () => {
    const hills = layoutHills(WORLD_HILLS, AVOID);
    for (const c of AVOID) {
      for (const h of hills) {
        const dist = Math.hypot(h.x - c.x, h.z - c.z);
        expect(dist - hillExtent(h, (h.x - c.x) / dist, (h.z - c.z) / dist)).toBeGreaterThanOrEqual(c.r - 1e-6);
      }
    }
  });

  it('chỉ đồi lấn mới bị dời; số đồi và seed không đổi', () => {
    const before = layoutHills(WORLD_HILLS);
    const after = layoutHills(WORLD_HILLS, AVOID);
    expect(after).toHaveLength(before.length);
    let moved = 0;
    before.forEach((h, i) => {
      if (Math.hypot(h.x - after[i].x, h.z - after[i].z) > 1e-6) moved++;
      expect(after[i].sx).toBe(h.sx);
      expect(after[i].sy).toBe(h.sy);
    });
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThan(before.length);
  });
});

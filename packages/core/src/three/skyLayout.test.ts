import { describe, expect, it } from 'vitest';
import { HEMI_GROUND, HEMI_SKY, SKY_HORIZON, SKY_RADIUS, SKY_ZENITH, SUN_COLOR, createCloudLayout, skyMix } from './skyLayout';

describe('màu trời và ánh sáng (spec 03 mục 2)', () => {
  it('đúng các mã màu của spec', () => {
    expect(SKY_HORIZON).toBe('#E8F6FF');
    expect(SKY_ZENITH).toBe('#8FCBFF');
    expect(HEMI_SKY).toBe('#FFFFFF');
    expect(HEMI_GROUND).toBe('#B5D68A');
    expect(SUN_COLOR).toBe('#FFF4E0');
  });
  it('chuyển màu: chân trời 0, đỉnh 1, tăng dần và không lố', () => {
    expect(skyMix(0)).toBe(0);
    expect(skyMix(-0.5)).toBe(0);
    expect(skyMix(1)).toBe(1);
    expect(skyMix(2)).toBe(1);
    let prev = -1;
    for (let y = 0; y <= 1; y += 0.1) {
      const m = skyMix(y);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });
});

describe('mây tròn do code dựng', () => {
  it('số cục mây = số đám × số cục mỗi đám', () => {
    expect(createCloudLayout(1, 9, 4)).toHaveLength(36);
    expect(createCloudLayout(1, 3, 5)).toHaveLength(15);
  });
  it('tất định theo seed, khác seed thì khác', () => {
    expect(createCloudLayout(7)).toEqual(createCloudLayout(7));
    expect(createCloudLayout(7)).not.toEqual(createCloudLayout(8));
  });
  it('nằm trên cao, trong khối cầu trời, bán kính dương', () => {
    for (const p of createCloudLayout(3)) {
      expect(p.y).toBeGreaterThan(40);
      expect(Math.hypot(p.x, p.y, p.z)).toBeLessThan(SKY_RADIUS);
      expect(p.r).toBeGreaterThan(0);
    }
  });
});

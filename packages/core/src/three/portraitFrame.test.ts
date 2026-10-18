import { describe, expect, it } from 'vitest';
import { PORTRAIT_ITEMS, PORTRAIT_SHARE, portraitCamera } from './portraitFrame';

describe('portraitCamera', () => {
  it('điểm nhìn ở giữa 35% phía trên khối bao', () => {
    const c = portraitCamera(1.7);
    expect(c.target[0]).toBe(0);
    expect(c.target[1]).toBeCloseTo(1.7 - (0.35 * 1.7) / 2, 6);
    expect(PORTRAIT_SHARE).toBe(0.35);
  });

  it('vùng thấy được tại điểm nhìn cao đúng share·height·pad', () => {
    const c = portraitCamera(1.7, { fov: 30, pad: 1 });
    const dx = c.position[0] - c.target[0];
    const dy = c.position[1] - c.target[1];
    const dz = c.position[2] - c.target[2];
    const dist = Math.hypot(dx, dy, dz);
    expect(dist * Math.tan((15 * Math.PI) / 180)).toBeCloseTo(0.35 * 1.7 * 0.5, 6);
    expect(c.halfExtent).toBeCloseTo(0.35 * 1.7 * 0.5, 6);
  });

  it('camera ở phía trước (z dương) và lệch sang một bên theo góc 3/4', () => {
    const c = portraitCamera(1.7, { yawDeg: 25, pitchDeg: 0 });
    expect(c.position[2]).toBeGreaterThan(0);
    const angle = (Math.atan2(c.position[0] - c.target[0], c.position[2] - c.target[2]) * 180) / Math.PI;
    expect(angle).toBeCloseTo(25, 6);
  });

  it('cúi nhìn xuống: camera cao hơn điểm nhìn', () => {
    const c = portraitCamera(1.7, { pitchDeg: 4 });
    expect(c.position[1]).toBeGreaterThan(c.target[1]);
  });

  it('khối bao đo thật: đáy, tâm ngang và đỉnh lệch khỏi gốc thì camera đi theo', () => {
    const c = portraitCamera(1.5, { base: 0.1, center: [0.2, 0.3], pad: 1 });
    const span = 0.35 * 1.4;
    expect(c.target[0]).toBeCloseTo(0.2, 9);
    expect(c.target[2]).toBeCloseTo(0.3, 9);
    expect(c.target[1]).toBeCloseTo(1.5 - span / 2, 9);
    expect(c.halfExtent).toBeCloseTo(span / 2, 9);
  });

  it('cao gấp đôi thì lùi xa gấp đôi', () => {
    const a = portraitCamera(1);
    const b = portraitCamera(2);
    expect(Math.hypot(b.position[0] - b.target[0], b.position[2] - b.target[2])).toBeCloseTo(2 * Math.hypot(a.position[0] - a.target[0], a.position[2] - a.target[2]), 6);
  });
});

describe('PORTRAIT_ITEMS', () => {
  it('có đủ 11 tên file của spec (10 nhân vật và Bi), không trùng', () => {
    const names = PORTRAIT_ITEMS.map((i) => i.name);
    for (const n of ['hoc-sinh-nam', 'ti', 'bac-an', 'cu-binh', 'co-chi', 'chu-dung', 'thay-linh', 'lai-buon', 'ba-cu', 'nong-dan', 'bi']) expect(names).toContain(n);
    expect(new Set(names).size).toBe(names.length);
  });
});

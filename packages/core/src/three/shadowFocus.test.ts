import { describe, expect, it } from 'vitest';
import { SHADOW_RANGE, normalizeInto, snapToLightTexel, type Vec3 } from './shadowFocus';

const dir = normalizeInto({ x: 26, y: 46, z: 18 }, { x: 0, y: 0, z: 0 });
const TEXEL = (2 * SHADOW_RANGE) / 1024;
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
/** Trục phải và trục lên của máy ảnh bóng (như Matrix4.lookAt của three, trục đứng (0, 1, 0)) */
function axes(d: Vec3) {
  const rl = Math.hypot(d.x, d.z);
  const r = { x: d.z / rl, y: 0, z: -d.x / rl };
  const u = { x: d.y * r.z - d.z * r.y, y: d.z * r.x - d.x * r.z, z: d.x * r.y - d.y * r.x };
  return { r, u };
}

describe('bóng bám theo người chơi', () => {
  it('vùng bóng nửa cạnh 25', () => {
    expect(SHADOW_RANGE).toBe(25);
  });

  it('chuẩn hóa hướng mặt trời về độ dài 1; vectơ không thì hướng lên', () => {
    expect(Math.hypot(dir.x, dir.y, dir.z)).toBeCloseTo(1, 12);
    expect(normalizeInto({ x: 0, y: 0, z: 0 }, { x: 9, y: 9, z: 9 })).toEqual({ x: 0, y: 1, z: 0 });
  });

  it('làm tròn theo texel: hình chiếu lên hai trục của máy ảnh bóng là bội số của texel; phần dọc theo tia sáng không đổi', () => {
    const { r, u } = axes(dir);
    for (const f of [{ x: 0, y: 0, z: -10 }, { x: 13.37, y: 0.4, z: 7.77 }, { x: -22.1, y: 0, z: 31.9 }]) {
      const s = snapToLightTexel(f, dir, TEXEL, { x: 0, y: 0, z: 0 });
      expect(dot(s, r) / TEXEL, 'trục phải').toBeCloseTo(Math.round(dot(s, r) / TEXEL), 6);
      expect(dot(s, u) / TEXEL, 'trục lên').toBeCloseTo(Math.round(dot(s, u) / TEXEL), 6);
      expect(dot(s, dir)).toBeCloseTo(dot(f, dir), 9);
      // lệch tối đa nửa texel mỗi trục
      expect(Math.hypot(s.x - f.x, s.y - f.y, s.z - f.z)).toBeLessThanOrEqual(TEXEL * Math.SQRT1_2 + 1e-9);
    }
  });

  it('ổn định: đi nhích dưới nửa texel thì vị trí bóng không đổi (không nhấp nháy); đi qua nửa texel thì nhảy đúng một texel', () => {
    const { r } = axes(dir);
    const a = snapToLightTexel({ x: 5, y: 0, z: 5 }, dir, TEXEL, { x: 0, y: 0, z: 0 });
    // dịch theo trục phải 0,2 texel
    const nudged = { x: 5 + r.x * TEXEL * 0.2, y: 0, z: 5 + r.z * TEXEL * 0.2 };
    const b = snapToLightTexel(nudged, dir, TEXEL, { x: 0, y: 0, z: 0 });
    // cùng ô hoặc nhảy một texel
    const jump = Math.abs(dot(b, r) - dot(a, r)) / TEXEL;
    expect(Math.min(jump, Math.abs(jump - 1))).toBeLessThan(1e-6);
    // dịch lớn theo trục phải: nhảy đúng bội của texel
    const far = snapToLightTexel({ x: 5 + r.x * TEXEL * 10.4, y: 0, z: 5 + r.z * TEXEL * 10.4 }, dir, TEXEL, { x: 0, y: 0, z: 0 });
    const k = (dot(far, r) - dot(a, r)) / TEXEL;
    expect(k).toBeCloseTo(Math.round(k), 6);
  });

  it('idempotent: làm tròn lần nữa không đổi', () => {
    const s = snapToLightTexel({ x: 3.3, y: 0, z: -8.8 }, dir, TEXEL, { x: 0, y: 0, z: 0 });
    const s2 = snapToLightTexel(s, dir, TEXEL, { x: 0, y: 0, z: 0 });
    expect(s2.x).toBeCloseTo(s.x, 9);
    expect(s2.z).toBeCloseTo(s.z, 9);
  });

  it('ánh sáng thẳng đứng: làm tròn theo x và z', () => {
    const s = snapToLightTexel({ x: 0.123, y: 2, z: 0.456 }, { x: 0, y: 1, z: 0 }, 0.1, { x: 0, y: 0, z: 0 });
    expect(s.x).toBeCloseTo(0.1, 9);
    expect(s.z).toBeCloseTo(0.5, 9);
    expect(s.y).toBe(2);
  });
});

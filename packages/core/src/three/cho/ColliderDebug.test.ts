import { describe, expect, it } from 'vitest';
import { circle, box, obox } from '../collision';
import { DEBUG_HEIGHT, colliderLines, deckGridLines } from './ColliderDebug';
import { DECK_TOP, DOCK_END_X, DOCK_HALF_WIDTH, RAMP_START_X, groundHeight } from './marketLayout';

const points = (a: number[]) => {
  const out: [number, number, number][] = [];
  for (let i = 0; i < a.length; i += 3) out.push([a[i], a[i + 1], a[i + 2]]);
  return out;
};

describe('khung xem vùng va chạm', () => {
  it('hộp xoay: 12 cạnh (đáy 4, đỉnh 4, đứng 4), góc đúng theo xoay của three', () => {
    const lines = colliderLines(obox(10, 20, 2, 1, Math.PI / 2), 5);
    expect(lines.length / 6).toBe(12);
    const pts = points(lines);
    // xoay 90°: hx (theo x của hộp) thành theo z của cảnh: x ∈ [9, 11], z ∈ [18, 22]
    const xs = pts.map((p) => p[0]);
    const zs = pts.map((p) => p[2]);
    expect(Math.min(...xs)).toBeCloseTo(9, 6);
    expect(Math.max(...xs)).toBeCloseTo(11, 6);
    expect(Math.min(...zs)).toBeCloseTo(18, 6);
    expect(Math.max(...zs)).toBeCloseTo(22, 6);
  });
  it('chỉ vẽ tới 1,5 từ mặt đất dù vật cao hơn; vật thấp thì vẽ tới đúng chiều cao', () => {
    const maxY = (a: number[]) => Math.max(...points(a).map((p) => p[1]));
    expect(maxY(colliderLines(box(0, 4, 0, 4), 12))).toBeCloseTo(DEBUG_HEIGHT, 6);
    expect(maxY(colliderLines(circle(0, 0, 1), 0.9))).toBeCloseTo(0.9, 6);
  });
  it('vòng tròn: đỉnh nằm trên đường tròn bán kính r quanh tâm', () => {
    for (const p of points(colliderLines(circle(3, -2, 1.5), 1))) expect(Math.hypot(p[0] - 3, p[2] + 2)).toBeCloseTo(1.5, 6);
  });
  it('lưới mặt cầu tàu bám đúng groundHeight: ở dốc cao dần, trên sàn cao bằng sàn (cộng nhấc nhẹ)', () => {
    const pts = points(deckGridLines());
    expect(pts.length).toBeGreaterThan(100);
    for (const [x, y, z] of pts) {
      expect(y, `(${x}, ${z})`).toBeCloseTo(groundHeight(x, Math.min(DOCK_HALF_WIDTH, Math.abs(z)) * Math.sign(z)) + 0.04, 6);
      expect(x).toBeGreaterThanOrEqual(DOCK_END_X - 1e-9);
      expect(x).toBeLessThanOrEqual(RAMP_START_X + 0.5 + 1e-9);
    }
    expect(Math.max(...pts.map((p) => p[1]))).toBeCloseTo(DECK_TOP + 0.04, 6);
  });
});

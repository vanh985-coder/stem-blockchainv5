import { describe, expect, it } from 'vitest';
import { PLAYER_RADIUS, box, circle, pullIntoBounds, pushOutOfBox, pushOutOfCircle, resolveCollisions, type BoxObstacle, type Obstacle, type Point2 } from './collision';

const R = PLAYER_RADIUS;

describe('va chạm: 3 ca trong bảng spec 03 mục 3.7', () => {
  it('nhân vật (0, 0) r 0,4; vật tròn tâm (0,5, 0) r 0,5 → bị đẩy tới (−0,4, 0)', () => {
    const p: Point2 = { x: 0, z: 0 };
    expect(pushOutOfCircle(p, 0.4, circle(0.5, 0, 0.5))).toBe(true);
    expect(p.x).toBeCloseTo(-0.4, 4);
    expect(p.z).toBeCloseTo(0, 6);
  });

  it('nhân vật (0,8, 0) r 0,4; hộp x ∈ [1, 3], z ∈ [−1, 1] → bị đẩy tới (0,6, 0)', () => {
    const p: Point2 = { x: 0.8, z: 0 };
    expect(pushOutOfBox(p, 0.4, box(1, 3, -1, 1))).toBe(true);
    expect(p.x).toBeCloseTo(0.6, 4);
    expect(p.z).toBeCloseTo(0, 6);
  });

  it('biên bán kính 60; nhân vật (61, 0) → bị kéo về (59,6, 0)', () => {
    const p: Point2 = { x: 61, z: 0 };
    expect(pullIntoBounds(p, 0.4, 60)).toBe(true);
    expect(p.x).toBeCloseTo(59.6, 6);
    expect(p.z).toBeCloseTo(0, 6);
  });
});

describe('va chạm: các trường hợp khác', () => {
  it('không chạm thì không đổi', () => {
    const p: Point2 = { x: 5, z: 5 };
    expect(resolveCollisions(p, R, [circle(0, 0, 1), box(1, 3, -1, 1)], 60)).toBe(false);
    expect(p).toEqual({ x: 5, z: 5 });
  });

  it('chạm vừa khít (cách đúng tổng bán kính) không bị đẩy', () => {
    const p: Point2 = { x: 0.9, z: 0 };
    expect(pushOutOfCircle(p, 0.4, circle(0, 0, 0.5))).toBe(false);
  });

  it('tâm nhân vật nằm trong hộp thì bị đẩy ra mặt gần nhất', () => {
    const p: Point2 = { x: 2.8, z: 0.1 };
    pushOutOfBox(p, 0.4, box(1, 3, -1, 1));
    expect(p.x).toBeGreaterThanOrEqual(3.4);
    expect(p.z).toBeCloseTo(0.1, 6);
  });

  it('trùng tâm vật tròn thì vẫn được đẩy ra (không NaN)', () => {
    const p: Point2 = { x: 2, z: 2 };
    pushOutOfCircle(p, 0.4, circle(2, 2, 0.5));
    expect(Number.isFinite(p.x) && Number.isFinite(p.z)).toBe(true);
    expect(Math.hypot(p.x - 2, p.z - 2)).toBeGreaterThanOrEqual(0.9);
  });

  it('kẹt giữa vật tròn và biên: sau khi giải quyết không còn xuyên cái nào', () => {
    const obstacles: Obstacle[] = [circle(9.5, 0, 0.8)];
    const p: Point2 = { x: 9.5, z: 0.3 };
    resolveCollisions(p, R, obstacles, 10);
    expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(10 - R + 1e-6);
    expect(Math.hypot(p.x - 9.5, p.z)).toBeGreaterThanOrEqual(0.8 + R - 1e-3);
  });

  it('khe giữa hai hộp vừa đủ rộng: bị đẩy ra khỏi cả hai', () => {
    const obstacles: Obstacle[] = [box(-3, -0.5, -1, 1), box(0.5, 3, -1, 1)];
    const p: Point2 = { x: 0.45, z: 0 };
    resolveCollisions(p, R, obstacles, Infinity);
    expect(p.x).toBeLessThanOrEqual(0.1 + 1e-4);
    expect(p.x).toBeGreaterThanOrEqual(-0.1 - 1e-4);
  });
});

/** Đi với vận tốc không đổi (vx, vz) đơn vị/giây từ (x0, z0) trong `frames` khung hình, giải quyết va chạm mỗi khung. */
function walk(x0: number, z0: number, vx: number, vz: number, frames: number, obstacles: readonly Obstacle[], dt = 1 / 60): Point2[] {
  const p: Point2 = { x: x0, z: z0 };
  const path: Point2[] = [{ x: p.x, z: p.z }];
  for (let i = 0; i < frames; i++) {
    p.x += vx * dt;
    p.z += vz * dt;
    resolveCollisions(p, R, obstacles, 60);
    path.push({ x: p.x, z: p.z });
  }
  return path;
}

describe('đi xéo vào góc hộp: không kẹt, không rung', () => {
  const wall = box(0, 4, 0, 4); // góc gần người đi tới nhất là (0, 0)

  /** Khoảng cách từ tâm nhân vật tới hộp. */
  const gap = (p: Point2, b: BoxObstacle = wall) => {
    const cx = Math.min(Math.max(p.x, b.minX), b.maxX);
    const cz = Math.min(Math.max(p.z, b.minZ), b.maxZ);
    return Math.hypot(p.x - cx, p.z - cz);
  };

  /** Số khung hình mà nhân vật bị lùi ngược hướng đang đi quá 0,1 mm (rung hoặc bật ngược). */
  const backward = (path: Point2[], vx: number, vz: number) => {
    const len = Math.hypot(vx, vz);
    let n = 0;
    for (let i = 1; i < path.length; i++) {
      const dot = ((path[i].x - path[i - 1].x) * vx + (path[i].z - path[i - 1].z) * vz) / len;
      if (dot < -1e-4) n++;
    }
    return n;
  };

  const SQ = 4 * Math.SQRT1_2;

  it('đi chéo 45° vào giữa mặt hộp: trượt dọc mặt hộp, không xuyên, tiến đều', () => {
    // tới từ phía −x, chéo lên +z, đâm vào mặt x = 0 của hộp
    const path = walk(-3, 1, SQ, SQ, 180, [wall]);
    for (const p of path) expect(gap(p)).toBeGreaterThanOrEqual(R - 1e-4);
    const touch = path.findIndex((p) => gap(p) < R + 1e-3);
    expect(touch).toBeGreaterThan(0);
    for (let i = touch + 1; i < path.length; i++) {
      expect(path[i].z - path[i - 1].z, `khung ${i}`).toBeGreaterThan(0.04); // ≈ 4 × 0,707 / 60 = 0,047: vẫn đi đều
    }
    expect(backward(path, SQ, SQ)).toBe(0);
  });

  it('đi lướt qua góc hộp (chạm góc rồi lệch ra): thoát qua góc, mỗi khung hình đều tiến, không lùi', () => {
    const dir = Math.hypot(1, 0.1);
    const vx = 4 / dir;
    const vz = (-4 * 0.1) / dir;
    const path = walk(-3, 0.2, vx, vz, 300, [wall]);
    for (const p of path) expect(gap(p)).toBeGreaterThanOrEqual(R - 1e-4);
    expect(path[path.length - 1].x).toBeGreaterThan(4.5); // đã đi qua hết hộp
    expect(backward(path, vx, vz)).toBe(0);
    for (let i = 1; i < path.length; i++) expect(path[i].x - path[i - 1].x, `khung ${i}`).toBeGreaterThan(0);
  });

  it('đâm đúng vào góc: không xuyên; sau khi dừng thì đứng yên hẳn (không rung)', () => {
    const path = walk(-3, -3, SQ, SQ, 240, [wall]);
    for (const p of path) expect(gap(p)).toBeGreaterThanOrEqual(R - 1e-4);
    expect(backward(path, SQ, SQ)).toBe(0);
    for (let i = path.length - 30; i < path.length; i++) {
      expect(Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z), `khung ${i}`).toBeLessThan(1e-3);
    }
  });

  it('đâm gần góc (lệch 0,05): trượt dọc theo mặt hộp thay vì bị giữ ở góc, không rung', () => {
    const path = walk(-3, -3 + 0.05, SQ, SQ, 300, [wall]);
    for (const p of path) expect(gap(p)).toBeGreaterThanOrEqual(R - 1e-4);
    expect(backward(path, SQ, SQ)).toBe(0);
    expect(path[path.length - 1].z).toBeGreaterThan(3); // đã đi dọc mặt hộp
  });

  it('đi xéo vào góc trong của chữ L (hai hộp vuông góc): không xuyên, rồi đứng yên ổn định', () => {
    const l: BoxObstacle[] = [box(0, 5, 0, 1), box(0, 1, 0, 5)];
    const path = walk(4, 4, -SQ, -SQ, 240, l);
    for (const p of path) for (const o of l) expect(gap(p, o)).toBeGreaterThanOrEqual(R - 1e-4);
    expect(backward(path, -SQ, -SQ)).toBe(0);
    const n = path.length;
    expect(Math.hypot(path[n - 1].x - path[n - 2].x, path[n - 1].z - path[n - 2].z)).toBeLessThan(1e-3);
  });
});

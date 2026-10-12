import { describe, expect, it } from 'vitest';
import { createMulberry32 } from '../lib/rng';
import { DEFAULT_WANDER, WALK_ALIGN, createWanderState, dwellTime, pickNextIndex, stepWander, type WanderParams, type Waypoint } from './wander';

const SQUARE: Waypoint[] = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
];
const P: WanderParams = { ...DEFAULT_WANDER, speed: 1, dwellMin: 1, dwellMax: 2 };

/** Chạy mô phỏng `seconds` giây với bước `dt`, gọi `each` sau mỗi bước. */
function simulate(waypoints: readonly Waypoint[], params: WanderParams, seconds: number, seed = 1, dt = 1 / 60, each?: (s: ReturnType<typeof createWanderState>, t: number) => void) {
  const rng = createMulberry32(seed);
  const s = createWanderState(waypoints, 0, rng, params);
  for (let t = 0; t < seconds; t += dt) {
    stepWander(s, waypoints, params, dt, rng);
    each?.(s, t);
  }
  return s;
}

describe('chọn điểm mốc kế tiếp', () => {
  it('loop: lần lượt rồi quay vòng', () => {
    const rng = () => 0.5;
    expect([0, 1, 2, 3].map((i) => pickNextIndex(i, 4, rng, 'loop'))).toEqual([1, 2, 3, 0]);
  });
  it('random: luôn khác điểm hiện tại và nằm trong khoảng', () => {
    const rng = createMulberry32(5);
    for (let i = 0; i < 500; i++) {
      const cur = i % 5;
      const next = pickNextIndex(cur, 5, rng, 'random');
      expect(next).not.toBe(cur);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(5);
    }
  });
  it('random: rải đều, mọi điểm khác đều có lúc được chọn', () => {
    const rng = createMulberry32(9);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) seen.add(pickNextIndex(2, 5, rng, 'random'));
    expect([...seen].sort()).toEqual([0, 1, 3, 4]);
  });
  it('1 điểm hoặc không có điểm thì là điểm 0', () => {
    expect(pickNextIndex(0, 1, () => 0.3, 'random')).toBe(0);
    expect(pickNextIndex(0, 0, () => 0.3, 'loop')).toBe(0);
  });
  it('2 điểm: random luôn chọn điểm còn lại', () => {
    for (const r of [0, 0.4, 0.99]) {
      expect(pickNextIndex(0, 2, () => r, 'random')).toBe(1);
      expect(pickNextIndex(1, 2, () => r, 'random')).toBe(0);
    }
  });
});

describe('thời gian đứng lại', () => {
  it('nằm trong [dwellMin, dwellMax]', () => {
    const rng = createMulberry32(3);
    for (let i = 0; i < 200; i++) {
      const d = dwellTime(rng, P);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(2);
    }
  });
});

describe('dân làng đi theo điểm mốc', () => {
  it('bắt đầu đứng ở điểm đầu, chế độ idle, đích là điểm kế tiếp', () => {
    const s = createWanderState(SQUARE, 0, () => 0.5, P);
    expect([s.x, s.z]).toEqual([0, 0]);
    expect(s.mode).toBe('idle');
    expect(s.target).toBe(1);
    expect(s.timer).toBeGreaterThanOrEqual(1);
  });

  it('đứng lại hết giờ thì mới đi (idle → walk)', () => {
    const rng = createMulberry32(1);
    const s = createWanderState(SQUARE, 0, rng, P);
    const wait = s.timer;
    stepWander(s, SQUARE, P, wait - 0.01, rng);
    expect(s.mode).toBe('idle');
    stepWander(s, SQUARE, P, 0.02, rng);
    expect(s.mode).toBe('walk');
  });

  it('đi tới điểm mốc rồi đứng lại đúng chỗ, và hướng sang điểm tiếp theo', () => {
    const seen: string[] = [];
    let last = 'idle';
    simulate(SQUARE, P, 60, 1, 1 / 60, (s) => {
      if (s.mode !== last) {
        if (s.mode === 'idle') seen.push(`${s.x.toFixed(2)},${s.z.toFixed(2)}`);
        last = s.mode;
      }
    });
    // lần lượt (4,0) (4,4) (0,4) (0,0) rồi lại (4,0)
    expect(seen.slice(0, 5)).toEqual(['4.00,0.00', '4.00,4.00', '0.00,4.00', '0.00,0.00', '4.00,0.00']);
  });

  it('không bao giờ vượt tốc độ đi', () => {
    const rng = createMulberry32(2);
    const s = createWanderState(SQUARE, 0, rng, P);
    let px = s.x;
    let pz = s.z;
    let maxStep = 0;
    const dt = 1 / 60;
    for (let t = 0; t < 120; t += dt) {
      stepWander(s, SQUARE, P, dt, rng);
      maxStep = Math.max(maxStep, Math.hypot(s.x - px, s.z - pz));
      px = s.x;
      pz = s.z;
    }
    expect(maxStep).toBeLessThanOrEqual(P.speed * dt + 1e-9);
    expect(maxStep).toBeGreaterThan(P.speed * dt * 0.99); // và có đi với tốc độ đó
  });

  it('khi đi, mặt hướng về phía đang đi (sai lệch không quá ngưỡng quay)', () => {
    let worst = 0;
    let px = 0;
    let pz = 0;
    simulate(SQUARE, P, 90, 4, 1 / 60, (s) => {
      const mx = s.x - px;
      const mz = s.z - pz;
      px = s.x;
      pz = s.z;
      if (s.mode === 'walk' && Math.hypot(mx, mz) > 1e-6) {
        const heading = Math.atan2(mx, mz);
        let d = Math.abs(heading - s.yaw) % (Math.PI * 2);
        if (d > Math.PI) d = Math.PI * 2 - d;
        worst = Math.max(worst, d);
      }
    });
    expect(worst).toBeLessThanOrEqual(WALK_ALIGN + 1e-6);
  });

  it('quay mặt đủ rồi mới đi: đi về phía +X thì yaw cuối cùng là π/2', () => {
    const s = simulate([[0, 0], [10, 0]], P, 8, 1);
    expect(s.yaw).toBeCloseTo(Math.PI / 2, 2);
  });

  it('đứng lại mỗi lần ở điểm mốc trong khoảng dwellMin–dwellMax', () => {
    const rng = createMulberry32(7);
    const s = createWanderState(SQUARE, 0, rng, P);
    const dt = 1 / 60;
    let idleFor = 0;
    let started = false;
    const durations: number[] = [];
    for (let t = 0; t < 200; t += dt) {
      const before = s.mode;
      stepWander(s, SQUARE, P, dt, rng);
      if (s.mode === 'idle') {
        if (before === 'walk') {
          started = true;
          idleFor = 0;
        }
        idleFor += dt;
      } else if (before === 'idle' && started) {
        durations.push(idleFor);
      }
    }
    expect(durations.length).toBeGreaterThan(5);
    for (const d of durations) {
      expect(d).toBeGreaterThanOrEqual(1 - 2 * dt);
      expect(d).toBeLessThanOrEqual(2 + 2 * dt);
    }
  });

  it('chế độ random: vẫn chỉ đứng ở các điểm mốc', () => {
    const params: WanderParams = { ...P, order: 'random' };
    const at = new Set<string>();
    let last = 'idle';
    simulate(SQUARE, params, 200, 8, 1 / 30, (s) => {
      if (s.mode !== last) {
        if (s.mode === 'idle') at.add(`${Math.round(s.x)},${Math.round(s.z)}`);
        last = s.mode;
      }
    });
    for (const p of at) expect(['4,0', '4,4', '0,4', '0,0']).toContain(p);
    expect(at.size).toBeGreaterThanOrEqual(3);
  });

  it('dưới 2 điểm mốc thì đứng yên mãi', () => {
    const s = simulate([[3, 3]], P, 30);
    expect([s.x, s.z, s.mode]).toEqual([3, 3, 'idle']);
    const none = simulate([], P, 5);
    expect(none.mode).toBe('idle');
  });

  it('cùng seed thì đi y hệt nhau (tất định)', () => {
    const a = simulate(SQUARE, P, 40, 11);
    const b = simulate(SQUARE, P, 40, 11);
    expect(a).toEqual(b);
  });

  it('bước thời gian lớn không làm vọt qua điểm mốc', () => {
    const rng = createMulberry32(1);
    const s = createWanderState([[0, 0], [1, 0]], 0, rng, { ...P, dwellMin: 0, dwellMax: 0 });
    for (let i = 0; i < 400; i++) {
      stepWander(s, [[0, 0], [1, 0]], { ...P, dwellMin: 0, dwellMax: 0 }, 0.5, rng);
      expect(s.x).toBeGreaterThanOrEqual(-1e-9);
      expect(s.x).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

/**
 * Dân làng đi lại theo điểm mốc (spec 04 mục 3, spec 03 mục 3.1): đi (walk) giữa các điểm, tới nơi thì đứng lại (idle)
 * một lúc rồi đi tiếp. Toàn bộ là hàm thuần; trạng thái nằm trong một đối tượng có sẵn nên gọi được trong useFrame.
 */
import { angleDiff, turnToward } from './staticMotion';

/** Điểm mốc trên mặt đất: [x, z]. */
export type Waypoint = readonly [number, number];

export interface WanderParams {
  /** Tốc độ đi (đơn vị/giây). Nên bằng tốc độ ngầm của clip walk để chân không trượt. */
  speed: number;
  /** Tốc độ quay (radian/giây) */
  turnRate: number;
  /** Đứng lại bao lâu ở mỗi điểm (giây), chọn ngẫu nhiên trong khoảng này */
  dwellMin: number;
  dwellMax: number;
  /** Thứ tự đi: "loop" lần lượt rồi quay vòng; "random" chọn điểm khác ngẫu nhiên */
  order: 'loop' | 'random';
}

export const DEFAULT_WANDER: Readonly<WanderParams> = {
  speed: 0.8,
  turnRate: Math.PI * 1.5,
  dwellMin: 2,
  dwellMax: 4,
  order: 'loop',
};

export interface WanderState {
  x: number;
  z: number;
  /** Hướng mặt (radian quanh trục đứng, 0 là +Z) */
  yaw: number;
  /** Chỉ số điểm mốc đang đi tới */
  target: number;
  mode: 'walk' | 'idle';
  /** Còn bao nhiêu giây đứng lại (khi mode = idle) */
  timer: number;
}

/** Bắt đầu đứng ở điểm `startIndex`, đứng lại một lúc rồi đi tới điểm kế tiếp. */
export function createWanderState(waypoints: readonly Waypoint[], startIndex = 0, rng: () => number = () => 0.5, params: WanderParams = DEFAULT_WANDER): WanderState {
  const n = waypoints.length;
  const i = n === 0 ? 0 : ((startIndex % n) + n) % n;
  const [x, z] = waypoints[i] ?? [0, 0];
  return { x, z, yaw: 0, target: pickNextIndex(i, n, rng, params.order), mode: 'idle', timer: dwellTime(rng, params) };
}

/** Điểm mốc kế tiếp sau `current` trong `n` điểm. "random" luôn chọn điểm khác `current` (nếu có từ 2 điểm). */
export function pickNextIndex(current: number, n: number, rng: () => number, order: 'loop' | 'random'): number {
  if (n <= 1) return 0;
  if (order === 'loop') return (current + 1) % n;
  const k = Math.min(n - 2, Math.floor(rng() * (n - 1)));
  return k >= current ? k + 1 : k;
}

/** Thời gian đứng lại ngẫu nhiên trong [dwellMin, dwellMax]. */
export function dwellTime(rng: () => number, p: Pick<WanderParams, 'dwellMin' | 'dwellMax'>): number {
  return p.dwellMin + rng() * (p.dwellMax - p.dwellMin);
}

/** Chỉ đi khi mặt đã quay gần đúng hướng đi (dưới góc này), nếu không thì quay tại chỗ trước. */
export const WALK_ALIGN = 0.4;

/**
 * Tiến trạng thái thêm `dt` giây. Chỉ ghi vào `s`, không cấp phát. Dưới 2 điểm mốc thì đứng yên.
 * - idle: đếm ngược; hết giờ thì chuyển sang walk.
 * - walk: quay mặt về điểm đích; khi đã quay đúng thì đi thẳng tới đó; tới nơi thì đứng lại và chọn điểm kế tiếp.
 */
export function stepWander(s: WanderState, waypoints: readonly Waypoint[], p: WanderParams, dt: number, rng: () => number): void {
  if (waypoints.length < 2 || dt <= 0) return;
  if (s.mode === 'idle') {
    s.timer -= dt;
    if (s.timer <= 0) {
      s.mode = 'walk';
      s.timer = 0;
    }
    return;
  }
  const [tx, tz] = waypoints[s.target % waypoints.length];
  const dx = tx - s.x;
  const dz = tz - s.z;
  const dist = Math.hypot(dx, dz);
  const desired = Math.atan2(dx, dz);
  s.yaw = turnToward(s.yaw, desired, p.turnRate * dt);
  if (Math.abs(angleDiff(s.yaw, desired)) <= WALK_ALIGN) {
    const step = Math.min(dist, p.speed * dt);
    if (step >= dist) {
      // tới nơi: đứng đúng điểm mốc, đứng lại một lúc rồi chọn điểm kế tiếp
      s.x = tx;
      s.z = tz;
      s.mode = 'idle';
      s.timer = dwellTime(rng, p);
      s.target = pickNextIndex(s.target, waypoints.length, rng, p.order);
      return;
    }
    s.x += (dx / dist) * step;
    s.z += (dz / dist) * step;
  }
}

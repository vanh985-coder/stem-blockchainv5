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
  /** Đang dừng lại nhường người chơi đứng chắn đường (mode = idle, quay mặt về người chơi) */
  yielding: boolean;
  /** Đã chờ bao nhiêu giây khi nhường đường */
  yieldWait: number;
  /** Người chơi đã đi khỏi bao lâu (giây) khi đang nhường: đủ `RESUME_DELAY` thì đi tiếp */
  clearFor: number;
  /** Còn bao nhiêu giây đi vòng (lệch hướng sang một bên để tránh người chơi) */
  detour: number;
  /** Bên đi vòng: +1 hoặc −1 (cộng vào góc hướng đi) */
  detourSide: 1 | -1;
}

/** Người chơi (hoặc vật khác) mà dân làng nhường đường: vị trí trên đất. */
export interface Other {
  x: number;
  z: number;
}

/** Người chơi đứng chắn đường trong khoảng này ở phía trước thì dân làng dừng lại (spec bước 8). */
export const YIELD_RANGE = 1.5;
/** Phía trước là trong góc này so với hướng đi (± radian). */
export const YIELD_CONE = Math.PI / 3;
/** Người chơi ra xa hơn khoảng này thì coi là hết chắn đường. */
export const YIELD_RELEASE = 2.0;
/** Hết chắn đường bấy lâu (giây) thì đi tiếp. */
export const RESUME_DELAY = 0.6;
/** Chờ bấy lâu (giây) mà người chơi vẫn chắn thì đi vòng. */
export const YIELD_WAIT = 3;
/** Đi vòng trong bấy lâu (giây), lệch hướng một góc `DETOUR_ANGLE`. */
export const DETOUR_TIME = 1.8;
export const DETOUR_ANGLE = 1.2;

/** Bắt đầu đứng ở điểm `startIndex`, đứng lại một lúc rồi đi tới điểm kế tiếp. */
export function createWanderState(waypoints: readonly Waypoint[], startIndex = 0, rng: () => number = () => 0.5, params: WanderParams = DEFAULT_WANDER): WanderState {
  const n = waypoints.length;
  const i = n === 0 ? 0 : ((startIndex % n) + n) % n;
  const [x, z] = waypoints[i] ?? [0, 0];
  return { x, z, yaw: 0, target: pickNextIndex(i, n, rng, params.order), mode: 'idle', timer: dwellTime(rng, params), yielding: false, yieldWait: 0, clearFor: 0, detour: 0, detourSide: 1 };
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

/** Người `other` có đang chắn đường (trong `range`, ở phía trước trong `YIELD_CONE` so với hướng mặt) không. */
export function isBlockedBy(s: Pick<WanderState, 'x' | 'z' | 'yaw'>, other: Other, range: number = YIELD_RANGE): boolean {
  const dx = other.x - s.x;
  const dz = other.z - s.z;
  const d = Math.hypot(dx, dz);
  if (d > range) return false;
  if (d < 1e-6) return true;
  return Math.abs(angleDiff(s.yaw, Math.atan2(dx, dz))) <= YIELD_CONE;
}

/** Quay mặt về `other` (mà không đi). */
function faceOther(s: WanderState, other: Other, p: WanderParams, dt: number): void {
  const dx = other.x - s.x;
  const dz = other.z - s.z;
  if (dx * dx + dz * dz < 1e-8) return;
  s.yaw = turnToward(s.yaw, Math.atan2(dx, dz), p.turnRate * dt);
}

/**
 * Tiến trạng thái thêm `dt` giây. Chỉ ghi vào `s`, không cấp phát. Dưới 2 điểm mốc thì đứng yên.
 * - idle: đếm ngược; hết giờ thì chuyển sang walk.
 * - walk: quay mặt về điểm đích; khi đã quay đúng thì đi thẳng tới đó; tới nơi thì đứng lại và chọn điểm kế tiếp.
 * Có `other` (người chơi): đang đi mà người chơi đứng chắn trong `YIELD_RANGE` ở phía trước thì dừng lại (idle), quay mặt về người chơi và chờ; người chơi
 * tránh ra (xa hơn `YIELD_RELEASE`) quá `RESUME_DELAY` giây thì đi tiếp; chờ quá `YIELD_WAIT` giây mà vẫn bị chắn thì đi vòng (lệch hướng sang bên không có người
 * chơi trong `DETOUR_TIME` giây). `hold` (người chơi đang nói chuyện với dân làng này): đứng yên, quay mặt về người chơi cho tới khi hết `hold`.
 */
export function stepWander(s: WanderState, waypoints: readonly Waypoint[], p: WanderParams, dt: number, rng: () => number, other?: Other | null, hold = false): void {
  if (dt <= 0) return;
  if (hold && other) {
    s.mode = 'idle';
    s.yielding = false;
    s.detour = 0;
    faceOther(s, other, p, dt);
    return;
  }
  if (waypoints.length < 2) return;

  if (s.yielding) {
    // đang nhường: đứng yên, quay mặt về người chơi
    if (other) faceOther(s, other, p, dt);
    const away = !other || Math.hypot(other.x - s.x, other.z - s.z) > YIELD_RELEASE;
    if (away) {
      s.clearFor += dt;
      if (s.clearFor >= RESUME_DELAY) {
        s.yielding = false;
        s.mode = 'walk';
        s.timer = 0;
      }
      return;
    }
    s.clearFor = 0;
    s.yieldWait += dt;
    if (s.yieldWait >= YIELD_WAIT && other) {
      // vẫn bị chắn: đi vòng sang bên đối diện với người chơi
      // (so với hướng tới điểm mốc, vì lúc này mặt đang quay về người chơi)
      const [tx, tz] = waypoints[s.target % waypoints.length];
      const heading = Math.atan2(tx - s.x, tz - s.z);
      const toOther = Math.atan2(other.x - s.x, other.z - s.z);
      s.detourSide = angleDiff(heading, toOther) >= 0 ? -1 : 1;
      s.detour = DETOUR_TIME;
      s.yielding = false;
      s.mode = 'walk';
      s.timer = 0;
    }
    return;
  }

  if (s.mode === 'idle') {
    s.timer -= dt;
    if (s.timer <= 0) {
      s.mode = 'walk';
      s.timer = 0;
    }
    return;
  }

  // đang đi: có người chắn đường (không tính lúc đang đi vòng) thì dừng lại nhường
  if (other && s.detour <= 0 && isBlockedBy(s, other)) {
    s.mode = 'idle';
    s.yielding = true;
    s.yieldWait = 0;
    s.clearFor = 0;
    return;
  }

  const [tx, tz] = waypoints[s.target % waypoints.length];
  const dx = tx - s.x;
  const dz = tz - s.z;
  const dist = Math.hypot(dx, dz);
  let desired = Math.atan2(dx, dz);
  const detouring = s.detour > 0;
  if (detouring) {
    desired += s.detourSide * DETOUR_ANGLE;
    s.detour = Math.max(0, s.detour - dt);
  }
  s.yaw = turnToward(s.yaw, desired, p.turnRate * dt);
  if (Math.abs(angleDiff(s.yaw, desired)) <= WALK_ALIGN) {
    const step = Math.min(dist, p.speed * dt);
    if (!detouring && step >= dist) {
      // tới nơi: đứng đúng điểm mốc, đứng lại một lúc rồi chọn điểm kế tiếp
      s.x = tx;
      s.z = tz;
      s.mode = 'idle';
      s.timer = dwellTime(rng, p);
      s.target = pickNextIndex(s.target, waypoints.length, rng, p.order);
      return;
    }
    if (detouring) {
      s.x += Math.sin(desired) * p.speed * dt;
      s.z += Math.cos(desired) * p.speed * dt;
    } else {
      s.x += (dx / dist) * step;
      s.z += (dz / dist) * step;
    }
  }
}

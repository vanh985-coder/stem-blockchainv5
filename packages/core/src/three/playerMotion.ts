/**
 * Di chuyển và nhảy của người chơi ở cảnh đi lại (spec 03 mục 3.7). Hàm thuần, không import three; trạng thái nằm trong một
 * đối tượng có sẵn (`PlayerState`) nên gọi được trong useFrame mà không cấp phát.
 */
import { dampFactor } from './biMotion';
import { PLAYER_RADIUS, resolveCollisions, type Obstacle } from './collision';
import type { ClipName } from './clips';
import { turnToward } from './staticMotion';

/** Tốc độ đi và chạy (đơn vị/giây). */
export const WALK_SPEED = 4;
export const RUN_SPEED = 7;
/** Nhảy: vận tốc đầu và trọng lực (đơn vị/giây, đơn vị/giây²). Đỉnh nhảy cao 6²/(2 × 18) = 1 đơn vị, ở trên không 2/3 giây. */
export const JUMP_VELOCITY = 6;
export const GRAVITY = 18;
/** Bấm nhảy hơi sớm (lúc sắp chạm đất) vẫn được tính, trong ngần này giây. */
export const JUMP_BUFFER = 0.12;
/** Tốc độ quay mặt về hướng đi (radian/giây). */
export const TURN_RATE = 10;
/** Độ gắt khi tăng/giảm tốc (càng lớn càng đổi vận tốc nhanh; ~0,2 giây để đạt tốc độ). */
export const ACCEL_RATE = 14;
/** Thời gian ở trên không của một cú nhảy trên đất bằng (giây). */
export const AIR_TIME = (2 * JUMP_VELOCITY) / GRAVITY;

export interface PlayerState {
  x: number;
  z: number;
  /** Độ cao so với đất (0 là đứng trên đất) */
  y: number;
  vx: number;
  vz: number;
  vy: number;
  /** Hướng mặt (radian quanh trục đứng, 0 là +Z) */
  yaw: number;
  grounded: boolean;
  /** Còn bao nhiêu giây thì lệnh nhảy đã bấm còn được tính */
  jumpBuffer: number;
  /** Đang có lệnh đi (cần điều khiển hoặc phím), kể cả khi bị chặn bởi vật cản */
  moving: boolean;
  /** Đang chạy (có lệnh đi và giữ Shift, hoặc đẩy cần điều khiển quá 80%) */
  running: boolean;
}

export function createPlayerState(x = 0, z = 0, yaw = 0): PlayerState {
  return { x, z, y: 0, vx: 0, vz: 0, vy: 0, yaw, grounded: true, jumpBuffer: 0, moving: false, running: false };
}

/** Lệnh của một khung hình. `x` sang phải, `y` tiến lên (−1 đến 1, độ lớn tối đa 1). `jump` là vừa bấm nhảy. */
export interface MoveInput {
  x: number;
  y: number;
  run: boolean;
  jump: boolean;
}

export interface World {
  obstacles: readonly Obstacle[];
  /** Bán kính biên quanh gốc tọa độ (Infinity nếu không có) */
  boundsRadius: number;
  /** Bán kính nhân vật khi va chạm (mặc định `PLAYER_RADIUS`) */
  radius?: number;
}

/** Điểm hai chiều dùng làm kết quả (ghi vào, không cấp phát). */
export interface Dir2 {
  x: number;
  z: number;
}

/**
 * Hướng đi trong cảnh từ lệnh (x sang phải, y tiến lên) và hướng camera nhìn `camYaw`: "tiến lên" là hướng camera nhìn,
 * "sang phải" là bên phải màn hình. Ghi vào `out` vectơ đơn vị, hoặc (0, 0) nếu không có lệnh. Trả về độ lớn lệnh (đã chặn ở 1).
 */
export function moveDirection(ix: number, iy: number, camYaw: number, out: Dir2): number {
  const mag = Math.hypot(ix, iy);
  if (mag < 1e-6) {
    out.x = 0;
    out.z = 0;
    return 0;
  }
  const sin = Math.sin(camYaw);
  const cos = Math.cos(camYaw);
  // tiến = (sin, cos); phải = (−cos, sin)
  const dx = sin * iy - cos * ix;
  const dz = cos * iy + sin * ix;
  const len = Math.hypot(dx, dz);
  out.x = dx / len;
  out.z = dz / len;
  return Math.min(1, mag);
}

const dir: Dir2 = { x: 0, z: 0 };

/**
 * Tiến người chơi thêm `dt` giây (sửa `s` tại chỗ, không cấp phát). Trả về true nếu vừa bắt đầu nhảy trong khung hình này.
 * - Đi 4, chạy 7 theo hướng camera; tăng và giảm tốc mượt; mặt quay mượt về hướng đi.
 * - Nhảy: vận tốc đầu 6, trọng lực 18; chỉ nhảy khi đang đứng trên đất; nhảy trên không bị bỏ; lệnh bấm sớm 0,12 giây vẫn tính.
 * - Va chạm với vật cản và biên (xem `resolveCollisions`).
 * `paused` (đang mở hộp thoại hoặc menu): bỏ lệnh đi và nhảy, nhưng đang ở trên không thì vẫn rơi xuống.
 */
export function stepPlayer(s: PlayerState, input: MoveInput, camYaw: number, dt: number, world: World, paused = false): boolean {
  if (dt <= 0) return false;
  const mag = paused ? 0 : moveDirection(input.x, input.y, camYaw, dir);
  if (paused) {
    dir.x = 0;
    dir.z = 0;
  }
  const moving = mag > 0;
  const speed = moving ? (input.run ? RUN_SPEED : WALK_SPEED) : 0;
  s.moving = moving;
  s.running = moving && input.run;

  // vận tốc ngang tiến về vận tốc mong muốn
  const k = dampFactor(dt, ACCEL_RATE);
  s.vx += (dir.x * speed - s.vx) * k;
  s.vz += (dir.z * speed - s.vz) * k;
  if (!moving && Math.abs(s.vx) + Math.abs(s.vz) < 0.01) {
    s.vx = 0;
    s.vz = 0;
  }
  if (moving) s.yaw = turnToward(s.yaw, Math.atan2(dir.x, dir.z), TURN_RATE * dt);

  s.x += s.vx * dt;
  s.z += s.vz * dt;
  resolveCollisions(s, world.radius ?? PLAYER_RADIUS, world.obstacles, world.boundsRadius);

  // nhảy
  if (!paused && input.jump) s.jumpBuffer = JUMP_BUFFER;
  let jumped = false;
  if (s.grounded && s.jumpBuffer > 0) {
    s.vy = JUMP_VELOCITY;
    s.grounded = false;
    s.jumpBuffer = 0;
    jumped = true;
  }
  if (!s.grounded) {
    s.vy -= GRAVITY * dt;
    s.y += s.vy * dt;
    if (s.y <= 0) {
      s.y = 0;
      s.vy = 0;
      s.grounded = true;
    }
  }
  if (s.jumpBuffer > 0) s.jumpBuffer = Math.max(0, s.jumpBuffer - dt);
  return jumped;
}

/** Clip nên phát: đang ở trên không → jump; đang đi → walk hoặc run; không thì idle. */
export function animationFor(s: Pick<PlayerState, 'grounded' | 'moving' | 'running'>): ClipName {
  if (!s.grounded) return 'jump';
  if (s.moving) return s.running ? 'run' : 'walk';
  return 'idle';
}

/** Giới hạn hệ số tốc độ phát clip để chân không quá chậm hay quá cuống. */
export const TIME_SCALE_MIN = 0.6;
export const TIME_SCALE_MAX = 2.4;

/**
 * Hệ số tốc độ phát clip (walk, run) để nhịp bước khớp tốc độ đi: tốc độ đi / tốc độ ngầm của clip. Chưa biết tốc độ
 * ngầm (null hoặc quá nhỏ) thì 1. Kẹp trong [0,6, 2,4].
 */
export function locomotionTimeScale(speed: number, natural: number | null): number {
  if (natural === null || !(natural > 0.05)) return 1;
  return Math.min(TIME_SCALE_MAX, Math.max(TIME_SCALE_MIN, speed / natural));
}

/** Hệ số để clip jump (đoạn đã cắt dài `clipSeconds` giây) vừa đúng thời gian ở trên không. */
export function jumpTimeScale(clipSeconds: number | null): number {
  if (clipSeconds === null || !(clipSeconds > 0.05)) return 1;
  return Math.min(TIME_SCALE_MAX, Math.max(TIME_SCALE_MIN, clipSeconds / AIR_TIME));
}

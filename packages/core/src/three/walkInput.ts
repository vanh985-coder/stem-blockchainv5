/**
 * Phần thuần của điều khiển ở cảnh đi lại (spec 03 mục 3.7): ánh xạ phím, vectơ từ phím, cần điều khiển động trên điện thoại.
 * Không import React hay three; phần gắn sự kiện thật nằm ở `WalkControls.tsx`.
 */

/** Cần điều khiển: đẩy quá 80% bán kính là chạy. */
export const RUN_THRESHOLD = 0.8;
/** Vùng chết của cần (tỉ lệ bán kính): đẩy nhẹ hơn thì coi như không đẩy. */
export const STICK_DEADZONE = 0.12;
/** Bán kính cần điều khiển (pixel): kéo xa hơn mức này thì cần chạm đầu. */
export const STICK_RADIUS = 56;
/** Vùng bấm tối thiểu của nút trên điện thoại (pixel). */
export const MIN_TOUCH_TARGET = 44;

export type KeyAction = 'forward' | 'back' | 'left' | 'right' | 'run' | 'jump' | 'interact' | 'menu';

/** Phím (KeyboardEvent.code) → hành động. */
export const KEY_MAP: Readonly<Record<string, KeyAction>> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Space: 'jump',
  KeyE: 'interact',
  Escape: 'menu',
};

export function actionForKey(code: string): KeyAction | null {
  return KEY_MAP[code] ?? null;
}

/**
 * Trạng thái các phím di chuyển. Đếm số phím đang giữ cho mỗi hướng (hai phím cùng hướng như W và ↑ không làm kẹt khi nhả một
 * phím) nên dùng bộ đếm thay vì cờ.
 */
export interface KeyState {
  forward: number;
  back: number;
  left: number;
  right: number;
  run: number;
}

export function createKeyState(): KeyState {
  return { forward: 0, back: 0, left: 0, right: 0, run: 0 };
}

const HELD_ACTIONS: readonly (keyof KeyState)[] = ['forward', 'back', 'left', 'right', 'run'];

/** Đặt lại về không giữ phím nào (mất focus, tạm dừng). */
export function clearKeys(k: KeyState): void {
  for (const a of HELD_ACTIONS) k[a] = 0;
}

/**
 * Ghi nhận một phím nhấn hoặc nhả. Chỉ phím di chuyển (và Shift) thay đổi `k`; trả về hành động của phím (hoặc null) để
 * nơi gọi xử lý nhảy, tương tác, menu. `held` là tập phím đang giữ (để bỏ qua sự kiện lặp và nhả lẻ loi).
 */
export function applyKey(k: KeyState, held: Set<string>, code: string, down: boolean): KeyAction | null {
  const action = actionForKey(code);
  if (!action) return null;
  const isHeldAction = (HELD_ACTIONS as readonly string[]).includes(action);
  if (down) {
    if (held.has(code)) return null; // lặp phím: bỏ qua
    held.add(code);
    if (isHeldAction) k[action as keyof KeyState]++;
  } else {
    if (!held.delete(code)) return null; // nhả phím chưa từng nhấn trong trang này
    if (isHeldAction) k[action as keyof KeyState] = Math.max(0, k[action as keyof KeyState] - 1);
  }
  return action;
}

export interface Axis {
  /** Sang phải dương */
  x: number;
  /** Tiến lên dương */
  y: number;
}

/** Vectơ đi từ phím: hai hướng ngược nhau triệt tiêu; đi chéo được chuẩn hóa về độ dài 1. */
export function keyAxis(k: Pick<KeyState, 'forward' | 'back' | 'left' | 'right'>, out: Axis): Axis {
  const x = (k.right > 0 ? 1 : 0) - (k.left > 0 ? 1 : 0);
  const y = (k.forward > 0 ? 1 : 0) - (k.back > 0 ? 1 : 0);
  const len = Math.hypot(x, y);
  out.x = len > 0 ? x / len : 0;
  out.y = len > 0 ? y / len : 0;
  return out;
}

/**
 * Cần điều khiển động: từ điểm chạm đầu (gốc cần) tới điểm hiện tại, `dx`, `dy` pixel (y màn hình hướng xuống). Ghi vào `out`
 * vectơ (x sang phải, y tiến lên), độ lớn tối đa 1 (kéo xa hơn `radius` thì chặn ở 1), có vùng chết. Trả về độ lớn.
 */
export function stickFromDrag(dx: number, dy: number, radius: number, out: Axis): number {
  const raw = Math.hypot(dx, dy) / radius;
  if (raw < STICK_DEADZONE) {
    out.x = 0;
    out.y = 0;
    return 0;
  }
  const mag = Math.min(1, raw);
  out.x = (dx / Math.hypot(dx, dy)) * mag;
  out.y = (-dy / Math.hypot(dx, dy)) * mag;
  return mag;
}

/** Đẩy cần quá 80% thì chạy. */
export function runFromStick(magnitude: number): boolean {
  return magnitude > RUN_THRESHOLD;
}

/** Vị trí núm cần (so với gốc cần, pixel) khi đã chặn trong bán kính `radius`: để vẽ núm. Ghi vào `out`. */
export function knobOffset(dx: number, dy: number, radius: number, out: { x: number; y: number }): void {
  const len = Math.hypot(dx, dy);
  const k = len > radius ? radius / len : 1;
  out.x = dx * k;
  out.y = dy * k;
}

/** Điểm chạm ở nửa trái màn hình (cần điều khiển) hay nửa phải (xoay camera). */
export function isLeftHalf(clientX: number, width: number): boolean {
  return clientX < width / 2;
}

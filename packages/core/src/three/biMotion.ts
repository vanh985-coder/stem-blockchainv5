/** Chuyển động của Bi (spec 03 mục 3.5). Hàm thuần, không import three. */

/** Màu muc-tim của giao diện (theme.css). */
export const BI_COLOR = '#5B3FD6';
/** Cạnh khối hộp bo tròn ~0,5. */
export const BI_SIZE = 0.5;
/** Bay lơ lửng nhấp nhô: biên độ 0,1, chu kỳ 2 giây. */
export const BOB_AMPLITUDE = 0.1;
export const BOB_PERIOD = 2;
/** Chớp mắt mỗi 3–5 giây. */
export const BLINK_MIN = 3;
export const BLINK_MAX = 5;
/** Một lần chớp kéo dài bao lâu (giây). */
export const BLINK_DURATION = 0.14;
/** Khi vui xoay một vòng trong ngần này giây. */
export const SPIN_DURATION = 0.8;

/** Độ cao nhấp nhô lúc `t` giây. */
export function bobOffset(t: number): number {
  return BOB_AMPLITUDE * Math.sin((Math.PI * 2 * t) / BOB_PERIOD);
}

/** Thời gian chờ tới lần chớp kế tiếp, từ số ngẫu nhiên r trong [0, 1): 3 đến 5 giây. */
export function nextBlinkDelay(r: number): number {
  return BLINK_MIN + r * (BLINK_MAX - BLINK_MIN);
}

/** Độ mở mắt (scale Y) `since` giây sau khi bắt đầu chớp: 1 (mở) → 0,1 (nhắm) → 1. since < 0 hoặc đã chớp xong thì 1. */
export function blinkScale(since: number): number {
  if (since < 0 || since >= BLINK_DURATION) return 1;
  const half = BLINK_DURATION / 2;
  const k = since < half ? since / half : (BLINK_DURATION - since) / half;
  return 1 - 0.9 * k;
}

/** Góc đã xoay (radian) `since` giây sau khi bắt đầu vui: 0 → 2π, mượt hai đầu. Ngoài khoảng xoay thì 0 (đã về vị trí cũ). */
export function spinAngle(since: number): number {
  if (since < 0 || since >= SPIN_DURATION) return 0;
  const u = since / SPIN_DURATION;
  const eased = u * u * (3 - 2 * u);
  return eased * Math.PI * 2;
}

/** Hệ số làm mượt không phụ thuộc tốc độ khung hình: tỉ lệ đi được tới đích sau `dt` giây với độ gắt `rate`. */
export function dampFactor(dt: number, rate: number): number {
  return 1 - Math.exp(-rate * dt);
}

/**
 * Vị trí Bi so với người chơi, trong hệ tọa độ của người chơi: sau vai phải, hơi cao hơn đầu. Nhân vật quay mặt về +Z
 * nên bên phải của họ là −X (và phía sau là −Z).
 */
export const BI_FOLLOW_OFFSET: readonly [number, number, number] = [-0.75, 2.0, -0.55];

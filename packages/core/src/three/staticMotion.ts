/**
 * Chuyển động do code làm cho 6 nhân vật không có xương (spec 03 mục 3.4). Hàm thuần, không import three.
 * Các hàm ghi vào đối tượng `out` có sẵn (không cấp phát) để gọi được trong useFrame.
 */

const DEG = Math.PI / 180;

/** Đứng yên: nhún như thở, scale Y dao động ±2%, chu kỳ 2 giây. */
export const BREATH_AMPLITUDE = 0.02;
export const BREATH_PERIOD = 2;
/** Đứng yên: lắc nhẹ ±2° quanh trục Z. */
export const SWAY_AMPLITUDE = 2 * DEG;
export const SWAY_PERIOD = 3.2;
/** Khi nói: nghiêng đầu (xoay cả model) ±4°. */
export const TALK_TILT = 4 * DEG;
export const TALK_PERIOD = 1.4;
/** Khi vui: bật lên 0,15 hai lần. */
export const HOP_HEIGHT = 0.15;
export const HOP_COUNT = 2;
export const HOP_DURATION = 0.3;

export type Mood = 'idle' | 'talking';

export interface StaticPose {
  /** Hệ số scale theo trục đứng (quanh chân) */
  scaleY: number;
  /** Góc nghiêng quanh trục Z (radian) */
  rollZ: number;
  /** Độ cao bật lên (đơn vị) */
  hopY: number;
}

export function createStaticPose(): StaticPose {
  return { scaleY: 1, rollZ: 0, hopY: 0 };
}

/** Pha ngẫu nhiên trong [0, 2π) từ một số ngẫu nhiên r trong [0, 1) (mỗi người lệch pha để không nhún đồng loạt). */
export function phaseFrom(r: number): number {
  return r * Math.PI * 2;
}

/** Độ cao bật lên `since` giây sau khi bắt đầu vui. since < 0 (chưa vui) hoặc đã bật xong thì 0. */
export function hopHeight(since: number): number {
  if (since < 0 || since >= HOP_COUNT * HOP_DURATION) return 0;
  return HOP_HEIGHT * Math.abs(Math.sin((Math.PI * since) / HOP_DURATION));
}

/**
 * Tư thế lúc `t` giây của một người có pha `phase`.
 * `mood`: "talking" thì nghiêng đầu ±4° thay cho lắc nhẹ. `sinceHappy`: số giây từ lúc vui (âm nếu chưa vui).
 */
export function staticPose(out: StaticPose, t: number, phase: number, mood: Mood, sinceHappy: number): StaticPose {
  out.scaleY = 1 + BREATH_AMPLITUDE * Math.sin((Math.PI * 2 * t) / BREATH_PERIOD + phase);
  out.rollZ =
    mood === 'talking'
      ? TALK_TILT * Math.sin((Math.PI * 2 * t) / TALK_PERIOD + phase)
      : SWAY_AMPLITUDE * Math.sin((Math.PI * 2 * t) / SWAY_PERIOD + phase * 1.7);
  out.hopY = hopHeight(sinceHappy);
  return out;
}

/** Góc xoay quanh trục đứng để mặt (+Z) quay từ (fromX, fromZ) về (toX, toZ). */
export function yawTowards(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(toX - fromX, toZ - fromZ);
}

/** Góc chênh lệch ngắn nhất từ `from` tới `to`, trong (-π, π]. */
export function angleDiff(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  else if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Xoay từ `current` về `target` theo đường ngắn nhất, tối đa `maxStep` radian. */
export function turnToward(current: number, target: number, maxStep: number): number {
  const d = angleDiff(current, target);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

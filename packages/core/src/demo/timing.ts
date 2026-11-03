/** Hàm thuần cho nhịp của demo: thời gian gõ, thời gian "đọc", đường đi con trỏ. Không import React hay DOM. */
import { createMulberry32 } from '../lib/rng';

export const TYPE_MIN_MS = 120;
export const TYPE_MAX_MS = 200;

/** Độ trễ (mili giây) trước mỗi ký tự khi gõ `length` ký tự: trong [120, 200], tất định theo `seed`. */
export function typingDelays(length: number, seed = 1, range: readonly [number, number] = [TYPE_MIN_MS, TYPE_MAX_MS]): number[] {
  const rnd = createMulberry32(seed);
  return Array.from({ length: Math.max(0, length) }, () => Math.round(range[0] + rnd() * (range[1] - range[0])));
}

/** Tổng thời gian gõ chuỗi (mili giây). */
export function typingDuration(length: number, seed = 1): number {
  return typingDelays(length, seed).reduce((a, b) => a + b, 0);
}

export const READ_MIN_MS = 1000;
export const READ_MAX_MS = 2000;
/** Thời gian "đọc" một đoạn chữ: 1 đến 2 giây, dài chữ thì lâu hơn (chia cho nhịp `speed`). */
export function readTime(text: string, speed = 1, range: readonly [number, number] = [READ_MIN_MS, READ_MAX_MS]): number {
  const raw = range[0] + Math.min(1, text.length / 160) * (range[1] - range[0]);
  return Math.round(raw / speed);
}

export interface Pt {
  x: number;
  y: number;
}

/** Làm mượt hai đầu (0 đến 1). */
export function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** Thời gian di con trỏ theo khoảng cách (mili giây): 350 đến 1100, chia cho nhịp. */
export function cursorDuration(a: Pt, b: Pt, speed = 1): number {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  return Math.round(Math.min(1100, 350 + d * 0.6) / speed);
}

/** Điểm trên đường con trỏ tại tiến độ t (0 đến 1): đường cong nhẹ, bắt đầu và kết thúc chậm. Kết thúc đúng tại `b`. */
export function cursorPoint(a: Pt, b: Pt, t: number): Pt {
  const e = easeInOut(t);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const bow = Math.min(40, Math.hypot(dx, dy) * 0.08) * Math.sin(Math.PI * e);
  const len = Math.hypot(dx, dy) || 1;
  return { x: a.x + dx * e - (dy / len) * bow, y: a.y + dy * e + (dx / len) * bow };
}

/** Danh sách điểm (mỗi khung) của đường di chuyển, tới điểm cuối là `b` chính xác. */
export function cursorPath(a: Pt, b: Pt, steps: number): Pt[] {
  const n = Math.max(1, Math.floor(steps));
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? { x: b.x, y: b.y } : cursorPoint(a, b, (i + 1) / n)));
}

/** Góc quay (radian) từ yaw hiện tại về yaw đích, tối đa `maxStep` mỗi bước; đi đường ngắn nhất qua ±π. */
export function turnToward(yaw: number, target: number, maxStep: number): number {
  let d = target - yaw;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return yaw + Math.max(-maxStep, Math.min(maxStep, d));
}

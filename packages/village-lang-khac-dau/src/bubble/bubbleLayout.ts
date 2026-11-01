/**
 * Bố cục màn 9 "Bắn trứng khắc dấu" (hàm thuần, có test): khung chơi chia ba cột khi ngang (trái: khóa riêng và máy tính; giữa: bàn trứng khoảng 40 đến 45% chiều rộng; phải: điểm, tim, đợt, {phanDien}) và dải trên/dưới khi dọc.
 * Toạ độ bàn tính bằng đơn vị trứng (xem `bubbleLogic.ts`); `fitField` đổi sang điểm ảnh của canvas.
 */
import { BUBBLE_SPEC } from './bubbleConfig';
import { clampAngle, launcherPoint } from './bubbleLogic';

export type BubbleMode = 'wide' | 'tall';

/** Khung ngang khi rộng hơn cao 1,1 lần trở lên (PC, điện thoại xoay ngang); còn lại là khung dọc */
export function modeFor(w: number, h: number): BubbleMode {
  return w >= h * 1.1 ? 'wide' : 'tall';
}

/** Chiều cao vùng chơi (đơn vị trứng): từ mép trên tới dưới máy bắn */
export const FIELD_H = BUBBLE_SPEC.limitRow * BUBBLE_SPEC.rowH + 3.2;
export const FIELD_W = BUBBLE_SPEC.width;

export interface Fit {
  /** Điểm ảnh cho mỗi đơn vị trứng (đường kính một quả) */
  scale: number;
  /** Góc trên trái của vùng chơi trong canvas (điểm ảnh) */
  ox: number;
  oy: number;
  /** Cỡ vùng chơi (điểm ảnh) */
  w: number;
  h: number;
}

/** Đặt vùng chơi vừa khít (giữ tỉ lệ) vào canvas rộng `cw` cao `ch`, căn giữa ngang và sát trên */
export function fitField(cw: number, ch: number): Fit {
  const scale = Math.max(1, Math.min(cw / FIELD_W, ch / FIELD_H));
  const w = FIELD_W * scale;
  const h = FIELD_H * scale;
  return { scale, ox: (cw - w) / 2, oy: Math.max(0, (ch - h) / 2), w, h };
}

/** Góc ngắm (độ) khi trỏ vào điểm ảnh (px, py) của canvas; luôn nằm trong khoảng cho phép */
export function angleFromPoint(fit: Fit, px: number, py: number): number {
  const l = launcherPoint();
  const dx = (px - fit.ox) / fit.scale - l.x;
  const dy = l.y - (py - fit.oy) / fit.scale;
  // trỏ xuống dưới máy bắn thì coi như sát mặt ngang về bên trái hay phải
  return clampAngle((Math.atan2(Math.max(0, dy), dx) * 180) / Math.PI);
}

/** Cỡ chữ số trên trứng (điểm ảnh): không dưới 14 */
export function eggFontPx(scale: number): number {
  return Math.max(14, Math.round(scale * 0.5));
}

/** Bước góc của phím mũi tên (độ), nhỏ hơn khi giữ Shift */
export const AIM_STEP = 2;
export const AIM_STEP_FINE = 0.5;

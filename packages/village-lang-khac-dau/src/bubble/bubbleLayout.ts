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

/**
 * Khung bàn `khung-ban` (1147×1371, tỉ lệ 0,837): phần lòng trong suốt chiếm các tỉ lệ dưới đây của ảnh (đo từ ảnh gốc). Vẽ ĐỀU (giữ tỉ lệ ảnh, không kéo méo) sao cho
 * bề rộng lòng khung bằng đúng bề rộng bàn (10 quả), nên viền gỗ nằm ngoài vùng chơi và không đè lên trứng hàng đầu.
 */
export const FRAME_ART = { aspect: 1147 / 1371, innerL: 190 / 1147, innerR: 957 / 1147, innerT: 201 / 1371, innerB: 1165 / 1371 } as const;
/** Máy bắn `may-ban` (1122×1402, tỉ lệ 0,8): vẽ cao `height` quả, giữ tỉ lệ ảnh; `pivotY` là chỗ trứng nằm trong túi da (tỉ lệ chiều cao từ trên xuống), trùng điểm đặt trứng và tâm xoay của máy */
export const LAUNCHER_ART = { aspect: 1122 / 1402, height: 2.7, pivotY: 0.48 } as const;
/** Viền khung ngoài vùng chơi cần chừa trong khung vẽ (đơn vị trứng): hai bên chỉ chừa một phần (khung hẹp thì viền ngoài bị cắt bởi mép khung vẽ, trứng vẫn đủ lớn), phía trên chừa đủ để thấy trọn viền */
const FRAME_PAD = { side: 0.7, top: 2 } as const;

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

/** Đặt vùng chơi (giữ tỉ lệ) vào canvas rộng `cw` cao `ch`, căn giữa cùng phần viền khung chừa quanh nó (`FRAME_PAD`) */
export function fitField(cw: number, ch: number): Fit {
  const scale = Math.max(1, Math.min(cw / (FIELD_W + 2 * FRAME_PAD.side), ch / (FIELD_H + FRAME_PAD.top)));
  const w = FIELD_W * scale;
  const h = FIELD_H * scale;
  return { scale, ox: (cw - w) / 2, oy: Math.max(0, (ch - h - FRAME_PAD.top * scale) / 2) + FRAME_PAD.top * scale, w, h };
}

/** Hình chữ nhật (điểm ảnh) để vẽ ảnh `khung-ban`: lòng khung khớp vùng chơi, giữ tỉ lệ ảnh */
export function frameRect(fit: Fit): { x: number; y: number; w: number; h: number } {
  const w = fit.w / (FRAME_ART.innerR - FRAME_ART.innerL);
  const h = w / FRAME_ART.aspect;
  return { x: fit.ox - FRAME_ART.innerL * w, y: fit.oy - FRAME_ART.innerT * h, w, h };
}

/** Góc ngắm (độ) khi trỏ vào điểm ảnh (px, py) của canvas; luôn nằm trong khoảng cho phép */
export function angleFromPoint(fit: Fit, px: number, py: number): number {
  const l = launcherPoint();
  const dx = (px - fit.ox) / fit.scale - l.x;
  const dy = l.y - (py - fit.oy) / fit.scale;
  // trỏ xuống dưới máy bắn thì coi như sát mặt ngang về bên trái hay phải
  return clampAngle((Math.atan2(Math.max(0, dy), dx) * 180) / Math.PI);
}

/** Điểm ảnh (px, py) của canvas cách máy bắn `r` đơn vị trứng theo góc ngắm `angle` (độ): nghịch đảo của `angleFromPoint` (dùng cho bot demo rê chuột tới đúng góc) */
export function pointFromAngle(fit: Fit, angle: number, r = 8): { px: number; py: number } {
  const l = launcherPoint();
  const a = (angle * Math.PI) / 180;
  return { px: fit.ox + fit.scale * (l.x + r * Math.cos(a)), py: fit.oy + fit.scale * (l.y - r * Math.sin(a)) };
}

/** Cỡ chữ số trên trứng (điểm ảnh): không dưới 14 */
export function eggFontPx(scale: number): number {
  return Math.max(14, Math.round(scale * 0.5));
}

/** Bước góc của phím mũi tên (độ), nhỏ hơn khi giữ Shift */
export const AIM_STEP = 2;
export const AIM_STEP_FINE = 0.5;

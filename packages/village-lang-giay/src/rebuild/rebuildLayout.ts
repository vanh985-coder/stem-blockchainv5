/**
 * Bố cục màn 3 trong khung 16:9 của Scene25D (hàm thuần, đơn vị là phần trăm bề rộng khung, `cqw`, trừ khi ghi khác). Mọi vùng chạm là thẻ hoặc nút cao tối thiểu 44 điểm
 * ảnh ở khung điện thoại ngang (844 × 390, khung 693 × 390). Từ trên xuống: thanh trên, hàng chuỗi, dải giữa (nhân vật, rổ trang giả, lời Bi, ô soi công thức), khay.
 */
import { frameToWorld, worldSize } from '@so-chung/core/three/scene25d/layout25d';

export interface Box {
  x0: number;
  x1: number;
  /** Phần trăm bề cao khung */
  y0: number;
  y1: number;
}

/** Vùng của từng phần: x tính theo phần trăm bề rộng khung, y theo phần trăm bề cao khung. */
export const AREAS = {
  hud: { x0: 1, x1: 99, y0: 1, y1: 10 },
  chain: { x0: 18, x1: 96, y0: 14, y1: 34 },
  /** Dải giữa: nhân vật đứng, lời Bi, ô soi công thức, banner hết vòng */
  mid: { x0: 18, x1: 78, y0: 35, y1: 65 },
  basket: { x0: 80, x1: 97, y0: 36, y1: 64 },
  tray: { x0: 18, x1: 96, y0: 67, y1: 89 },
} as const satisfies Record<string, Box>;

/** Bề cao khung tính theo bề rộng (khung 16:9): 1cqw = 1 phần trăm bề rộng; 100 phần trăm bề cao = 56,25cqw. */
export const FRAME_HEIGHT_CQW = 100 * (9 / 16);
export const GAP_CQW = 0.8;
export const CARD_ASPECT = 1.3;
export const CARD_MAX_CQW = 8.6;
export const CARD_MIN_CQW = 6.2;
/** Điện thoại ngang 844 × 390: khung 693 điểm ảnh rộng. */
export const PHONE_FRAME_PX = 693;
export const MIN_TOUCH_PX = 44;

/** Bề rộng một thẻ (cqw) để `slots` ô nằm vừa một hàng bề rộng `span` (cqw). Số ô chuỗi và số thẻ ở khay đều nhiều nhất 10. */
export function cardWidth(slots: number, span: number = AREAS.chain.x1 - AREAS.chain.x0): number {
  const w = span / Math.max(1, slots) - GAP_CQW;
  return Math.min(CARD_MAX_CQW, Math.max(CARD_MIN_CQW, w));
}

/** Bề cao thẻ (cqw). */
export const cardHeight = (width: number): number => width * CARD_ASPECT;

/** Cạnh trái (cqw) của ô thứ `i` (từ 0) trong hàng `slots` ô bắt đầu từ `x0`. */
export function slotLeft(i: number, width: number, x0: number = AREAS.chain.x0): number {
  return x0 + i * (width + GAP_CQW);
}

/** Số cqw đổi sang phần trăm bề cao khung. */
export const cqwToHeightPct = (cqw: number): number => (cqw / FRAME_HEIGHT_CQW) * 100;

/** Tâm của một vùng theo tỉ lệ khung [0..1] (x, y). */
export function center(b: Box): { fx: number; fy: number } {
  return { fx: (b.x0 + b.x1) / 200, fy: (b.y0 + b.y1) / 200 };
}

/** Tọa độ thế giới (x, y) của điểm (fx, fy) theo tỉ lệ khung, để đặt nhân vật và hình rời của Scene25D khớp với lớp HTML. */
export function worldPoint(fx: number, fy: number): { x: number; y: number } {
  return frameToWorld(fx, fy, worldSize('landscape'));
}

/** Chiều cao (đơn vị thế giới) ứng với `pct` phần trăm bề cao khung. */
export const worldHeightOf = (pct: number): number => (pct / 100) * worldSize('landscape').height;

/** Chỗ đứng các nhân vật (tỉ lệ khung của chân) và cỡ (phần trăm bề cao khung). */
export const ACTORS = {
  bacAn: { fx: 0.055, fy: 0.97, heightPct: 52 },
  student: { fx: 0.135, fy: 0.97, heightPct: 46 },
  /** Tí chạy dọc dải giữa (xa hơn nên nhỏ hơn); điểm dừng khi nhét trang */
  villainStop: { fx: 0.62, fy: 0.64, heightPct: 31 },
  villainOffscreen: { fx: 1.12, fy: 0.64 },
} as const;

/**
 * Tiến trình {phanDien} nhét trang giả (giây, ở tốc độ bình thường): chạy vào (run) → đứng cười (cheer) và thả trang → chạy ra (run) → trang giả vào khay.
 * Mọi mốc là thời điểm kể từ lúc bắt đầu.
 */
export const VILLAIN_TIMING = {
  /** Hết chạy vào */
  enterEnd: 1.2,
  /** Thả trang (thẻ bay vào khay) */
  dropAt: 1.9,
  /** Bắt đầu chạy ra */
  exitStart: 2.7,
  /** Hết chạy ra: trang giả hiện trong khay, em chơi tiếp */
  end: 3.8,
} as const;

/** Chia thời gian khi bật "giảm chuyển động": rút ngắn còn một phần tư. */
export const REDUCED_MOTION_SCALE = 0.25;

export type VillainStage = 'idle' | 'enter' | 'cheer' | 'exit' | 'gone';

/** Giai đoạn của {phanDien} sau `t` giây kể từ lúc bắt đầu (`scale` = 1 bình thường, REDUCED_MOTION_SCALE khi giảm chuyển động). */
export function villainStageAt(t: number, scale = 1): VillainStage {
  const k = scale;
  if (t < 0) return 'idle';
  if (t < VILLAIN_TIMING.enterEnd * k) return 'enter';
  if (t < VILLAIN_TIMING.exitStart * k) return 'cheer';
  if (t < VILLAIN_TIMING.end * k) return 'exit';
  return 'gone';
}

/** Vị trí ngang (tỉ lệ khung) của {phanDien} sau `t` giây: chạy từ ngoài khung bên phải tới điểm dừng, đứng đó, rồi chạy ra lại. Làm mượt (ease in-out). */
export function villainFx(t: number, scale = 1): number {
  const k = scale;
  const a = ACTORS.villainOffscreen.fx;
  const b = ACTORS.villainStop.fx;
  const ease = (u: number) => u * u * (3 - 2 * u);
  if (t < VILLAIN_TIMING.enterEnd * k) return a + (b - a) * ease(Math.max(0, t / (VILLAIN_TIMING.enterEnd * k)));
  if (t < VILLAIN_TIMING.exitStart * k) return b;
  const u = Math.min(1, (t - VILLAIN_TIMING.exitStart * k) / ((VILLAIN_TIMING.end - VILLAIN_TIMING.exitStart) * k));
  return b + (a - b) * ease(u);
}

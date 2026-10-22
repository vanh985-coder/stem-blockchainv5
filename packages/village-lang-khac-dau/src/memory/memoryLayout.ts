/**
 * Bố cục cảnh màn 8 trên Scene25D (hàm thuần, không import three). Đơn vị thế giới như Scene25D: khung ngang 16 × 9, khung dọc 9 × 16, gốc ở tâm, y hướng lên.
 *
 * - Khung ngang (máy tính, điện thoại xoay ngang): cột trái là thanh trên (nút Máy tính mod, vòng, điểm, số lần sai, dòng "5^x mod 23 = y"), giữa là bàn thẻ, mép phải chừa chỗ
 *   cho {phanDien} ló ra.
 * - Khung dọc (điện thoại xoay dọc): dải trên là thanh trên, giữa là bàn thẻ, góc dưới phải là chỗ {phanDien} ló ra.
 * Thẻ vuông (ảnh mặt thẻ vuông). Cỡ chữ trên mặt thẻ tính theo số điểm ảnh thật của thẻ để không nhỏ hơn 14 px.
 */

export type MemoryFrame = 'landscape' | 'portrait';

export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export const WORLD: Record<MemoryFrame, { width: number; height: number }> = {
  landscape: { width: 16, height: 9 },
  portrait: { width: 9, height: 16 },
};

/** Vùng bàn thẻ (đơn vị thế giới). */
export const GRID_AREA: Record<MemoryFrame, Box> = {
  landscape: { x0: -4.4, x1: 4.6, y0: -4.3, y1: 4.3 },
  portrait: { x0: -4.45, x1: 4.45, y0: -3.6, y1: 5.3 },
};

/** Vùng thanh trên (HTML): khung ngang là cột trái, khung dọc là dải trên. */
export const HUD_AREA: Record<MemoryFrame, Box> = {
  landscape: { x0: -8, x1: -4.6, y0: -4.5, y1: 4.5 },
  portrait: { x0: -4.5, x1: 4.5, y0: 5.45, y1: 8 },
};

/** Chỗ {phanDien} ló ra: x khi ló, x khi nấp (ngoài khung), y của chân, chiều cao. */
export const VILLAIN_SPOT: Record<MemoryFrame, { x: number; hiddenX: number; y: number; height: number }> = {
  landscape: { x: 6.6, hiddenX: 10, y: -4.6, height: 4.4 },
  portrait: { x: 2.9, hiddenX: 6.5, y: -8.1, height: 4.4 },
};

/** Thẻ chiếm phần này của ô lưới (phần còn lại là khe giữa các thẻ). */
export const CARD_FILL = 0.93;

export interface GridLayout {
  /** Cạnh một ô lưới và cạnh thẻ (đơn vị thế giới) */
  cell: number;
  card: number;
  /** Tâm của từng chỗ (theo thứ tự chỗ: hàng trên trước, trái sang phải) */
  slots: readonly { x: number; y: number }[];
}

/** Lưới `cols` × `rows` thẻ vuông, nằm giữa vùng bàn thẻ. */
export function gridLayout(frame: MemoryFrame, cols: number, rows: number): GridLayout {
  const a = GRID_AREA[frame];
  const cell = Math.min((a.x1 - a.x0) / cols, (a.y1 - a.y0) / rows);
  const cx = (a.x0 + a.x1) / 2;
  const cy = (a.y0 + a.y1) / 2;
  const slots: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({ x: cx + (c - (cols - 1) / 2) * cell, y: cy - (r - (rows - 1) / 2) * cell });
    }
  }
  return { cell, card: cell * CARD_FILL, slots };
}

/** Đổi điểm thế giới sang phần trăm của khung (0,0 là góc trên trái) để đặt lớp HTML. */
export function framePct(frame: MemoryFrame, x: number, y: number): { left: number; top: number } {
  const w = WORLD[frame];
  return { left: ((x + w.width / 2) / w.width) * 100, top: ((w.height / 2 - y) / w.height) * 100 };
}

/** Số điểm ảnh CSS của một đơn vị thế giới khi khung rộng `framePx` điểm ảnh. */
export function pxPerUnit(frame: MemoryFrame, framePx: number): number {
  return framePx / WORLD[frame].width;
}

/** Cỡ chữ nhỏ nhất trên mặt thẻ (px CSS), theo spec giao diện; "Chữ to" nhân 1,15. */
export const MIN_LABEL_PX = 14;
export const LARGE_TEXT_SCALE = 1.15;

/** Cỡ chữ trên mặt thẻ (px CSS) theo cạnh thẻ trên màn hình: nhãn ≥ 14 px, số to gấp rưỡi nhãn; cùng tăng theo thẻ to. */
export function cardFonts(cardPx: number, largeText: boolean): { label: number; number: number } {
  const k = largeText ? LARGE_TEXT_SCALE : 1;
  const label = Math.max(MIN_LABEL_PX * k, cardPx * 0.15);
  return { label, number: Math.max(label * 1.5, cardPx * 0.3) };
}

/** Vệt tím lúc {phanDien} tráo: mặt phẳng cùng tâm thẻ, cạnh bằng cạnh thẻ nhân số này (rộng hơn thẻ 6% mỗi cạnh); viền sáng vẽ sát mép thẻ, tỏa ra phần dư. */
export const GLOW_SCALE = 1.12;

/** Chọn khung theo kích thước màn hình: cao hơn rộng thì dọc. */
export function frameOf(width: number, height: number): MemoryFrame {
  return height > width ? 'portrait' : 'landscape';
}

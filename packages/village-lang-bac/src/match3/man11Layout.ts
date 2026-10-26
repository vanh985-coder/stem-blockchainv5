/**
 * Bố cục cảnh màn 11 trên Scene25D (hàm thuần, không import three; như `climbLayout.ts` và `chickenLayout.ts`). Đơn vị thế giới của Scene25D: khung ngang 16 × 9, khung dọc 9 × 16, gốc ở tâm khung, y hướng lên.
 *
 * Khung ngang: bàn 7 × 7 bên trái, cây bên phải. Khung dọc (màn này chơi được khung dọc, không nhắc xoay): cây ở trên, bàn ở dưới. HUD (vòng, lượt, cây xong, điểm) là một dải HTML ở mép trên khung;
 * nút "?" của khung chơi (cố định ở góc trên bên phải màn hình, 44 điểm ảnh cộng lề) là vùng cấm. {phanDien} ló ra từ mép dưới khung, cạnh mép bàn, rồi rụt lại: không chiếm chỗ cố định.
 *
 * Cỡ ô cố định theo đơn vị thế giới và được chọn để ô lá ≥ 40 điểm ảnh CSS ở 360 × 640 (khung dọc: 40 điểm ảnh mỗi đơn vị) và 640 × 360 (khung ngang: 40 điểm ảnh mỗi đơn vị). HUD và vùng cấm tính theo điểm ảnh
 * (cỡ chữ cố định theo rem) nên đổi theo `framePx`.
 */
import { slotUvs, nodeUv, TREE_ART, TREE_CROP_ASPECT, type Uv } from './man11Slots';

export type Man11Frame = 'landscape' | 'portrait';

export const WORLD: Record<Man11Frame, { width: number; height: number }> = {
  landscape: { width: 16, height: 9 },
  portrait: { width: 9, height: 16 },
};

/** Hộp bao theo trục (thế giới, y hướng lên: `y0` < `y1`) */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const boxesOverlap = (a: Rect, b: Rect, gap = 0): boolean => a.x0 < b.x1 + gap && a.x1 > b.x0 - gap && a.y0 < b.y1 + gap && a.y1 > b.y0 - gap;
export const rectInside = (inner: Rect, outer: Rect): boolean => inner.x0 >= outer.x0 && inner.x1 <= outer.x1 && inner.y0 >= outer.y0 && inner.y1 <= outer.y1;

/** Các bố cục cần kiểm: cỡ cửa sổ (điểm ảnh) */
export const CHECK_VIEWPORTS: readonly { width: number; height: number }[] = [
  { width: 360, height: 640 },
  { width: 640, height: 360 },
  { width: 844, height: 390 },
  { width: 1366, height: 768 },
];

/** Cao hơn rộng thì khung dọc. */
export const frameOfViewport = (width: number, height: number): Man11Frame => (height > width ? 'portrait' : 'landscape');

/** Bề rộng (điểm ảnh) của khung nằm gọn trong cửa sổ `width` × `height`. */
export function framePxWidth(width: number, height: number): number {
  return frameOfViewport(width, height) === 'portrait' ? Math.min(width, (height * 9) / 16) : Math.min(width, (height * 16) / 9);
}

/** Số điểm ảnh CSS của một đơn vị thế giới. */
export const pxPerUnit = (frame: Man11Frame, framePx: number): number => framePx / WORLD[frame].width;

/** Lưới 7 × 7 (khớp `MATCH3_SPEC.size`). */
export const GRID = 7;
/** Ô lá nhỏ nhất (điểm ảnh CSS) mà bố cục phải đảm bảo ở 360 × 640. */
export const MIN_CELL_PX = 40;

/** Cạnh ô (đơn vị thế giới). */
export const CELL: Record<Man11Frame, number> = { landscape: 1.05, portrait: 1.12 };
/** Lề của khay quanh lưới. */
export const PANEL_PAD = 0.14;
/**
 * Cỡ khung ảnh của từng mặt so với cạnh ô (rộng, cao): hình lá, ô gió, hoa sen có viền trong suốt quanh phần có hình (đo ở alpha > 100 trên bản đã tách nền trong `assets-build`: lá thường chiếm khoảng 60% khung,
 * lá giả khoảng 33% bề rộng của khung 1024 × 559, ô gió khoảng 58%, hoa sen khoảng 70%), nên khung phải lớn hơn ô để phần có hình đầy khoảng 85% ô. Chỉ số theo số hiệu mặt: 0 đến 5 lá, 6 lá giả, 7 ô gió.
 */
export const FACE_QUAD: readonly { w: number; h: number }[] = [
  { w: 1.4, h: 1.4 },
  { w: 1.4, h: 1.4 },
  { w: 1.4, h: 1.4 },
  { w: 1.4, h: 1.4 },
  { w: 1.4, h: 1.4 },
  { w: 1.4, h: 1.4 },
  { w: 2.55, h: 1.39 },
  { w: 1.45, h: 1.45 },
];
/** Hoa sen vẽ phủ lên lá: khung vuông cỡ này (so với ô), nhỏ hơn lá để viền lá lộ ra quanh hoa. */
export const LOTUS_QUAD = 1.0;
/** Khung ảnh của hình lá khi nằm ở ô cây trên cây (đơn vị thế giới; phần có hình khoảng `SLOT_SIZE`). */
export const SLOT_QUAD = 1.5;
/** Cỡ ô cây (hình lá nhỏ) trên cây. */
export const SLOT_SIZE = 0.95;

/**
 * Dải HUD ở mép trên, cách mép 6 điểm ảnh: khung ngang một hàng bốn ô (cao 40 điểm ảnh); khung dọc hẹp nên hai hàng hai ô (cao 64). Vùng cấm của nút "?": 44 điểm ảnh cộng lề 8 ở góc trên bên phải.
 */
export const HUD_PX: Record<Man11Frame, number> = { landscape: 40, portrait: 64 };
export const HUD_MARGIN_PX = 6;
export const HELP_PX = 52;

/** Chỗ {phanDien} ló ra: tâm ngang, chiều cao thân, và độ cao chân lúc ẩn (hẳn dưới mép khung) và lúc ló (chân ở trên mép khung một chút để thấy nửa thân trên). */
export interface VillainSpot {
  x: number;
  height: number;
  hiddenY: number;
  peekY: number;
}

export interface Man11Layout {
  frame: Man11Frame;
  /** Điểm ảnh CSS mỗi đơn vị */
  ppu: number;
  cell: number;
  /** Phần lưới 7 × 7 */
  board: Rect;
  /** Khay nền quanh lưới */
  panel: Rect;
  /** Phần cây đã cắt (hình vẽ phủ đúng hộp này) */
  tree: Rect;
  hud: Rect;
  /** Vùng cấm của nút "?" */
  help: Rect;
  villain: VillainSpot;
}

const VILLAIN_HEIGHT = 2.4;

export function man11Layout(frame: Man11Frame, framePx: number): Man11Layout {
  const w = WORLD[frame];
  const ppu = pxPerUnit(frame, framePx > 0 ? framePx : w.width * 40);
  const cell = CELL[frame];
  const size = cell * GRID;
  const halfW = w.width / 2;
  const halfH = w.height / 2;
  const hudH = HUD_PX[frame] / ppu;
  const hudTop = halfH - HUD_MARGIN_PX / ppu;
  const help: Rect = { x0: halfW - HELP_PX / ppu, y0: halfH - HELP_PX / ppu, x1: halfW, y1: halfH };

  let board: Rect;
  let tree: Rect;
  let hud: Rect;
  let villainX: number;
  if (frame === 'landscape') {
    const x0 = -halfW + PANEL_PAD + 0.3;
    const y1 = 3.15;
    board = { x0, y0: y1 - size, x1: x0 + size, y1 };
    const tw = 6.8;
    tree = { x0: 0.6, x1: 0.6 + tw, y0: -3.1, y1: -3.1 + tw / TREE_CROP_ASPECT };
    hud = { x0: -halfW + 0.2, x1: help.x0 - 0.1, y0: hudTop - hudH, y1: hudTop };
    villainX = board.x1 + PANEL_PAD + 0.62;
  } else {
    board = { x0: -size / 2, x1: size / 2, y1: 0.5, y0: 0.5 - size };
    const tw = 6.4;
    tree = { x0: -tw / 2, x1: tw / 2, y0: 0.8, y1: 0.8 + tw / TREE_CROP_ASPECT };
    hud = { x0: -halfW + 0.2, x1: help.x0 - 0.1, y0: hudTop - hudH, y1: hudTop };
    villainX = size / 2 - 0.9;
  }
  const panel: Rect = { x0: board.x0 - PANEL_PAD, x1: board.x1 + PANEL_PAD, y0: board.y0 - PANEL_PAD, y1: board.y1 + PANEL_PAD };
  const bottom = -halfH;
  return {
    frame,
    ppu,
    cell,
    board,
    panel,
    tree,
    hud,
    help,
    villain: { x: villainX, height: VILLAIN_HEIGHT, hiddenY: bottom - VILLAIN_HEIGHT - 0.3, peekY: bottom - VILLAIN_HEIGHT * (frame === 'landscape' ? 0.12 : 0.32) },
  };
}

/** Tâm ô (hàng r từ trên xuống, cột c từ trái sang), đơn vị thế giới. `r` và `c` có thể lẻ (đang chuyển động) hay âm (lá mới rơi từ trên xuống). */
export function cellCenter(l: Pick<Man11Layout, 'board' | 'cell'>, r: number, c: number): { x: number; y: number } {
  return { x: l.board.x0 + (c + 0.5) * l.cell, y: l.board.y1 - (r + 0.5) * l.cell };
}

/** Ô chứa điểm (x, y) của thế giới; null nếu ngoài lưới. */
export function cellAt(l: Pick<Man11Layout, 'board' | 'cell'>, x: number, y: number): [number, number] | null {
  const c = Math.floor((x - l.board.x0) / l.cell);
  const r = Math.floor((l.board.y1 - y) / l.cell);
  return r >= 0 && r < GRID && c >= 0 && c < GRID ? [r, c] : null;
}

/** Điểm của ảnh cây (u, v) trong thế giới, theo phần cây đã cắt phủ đúng hộp `tree`. */
export function treePoint(l: Pick<Man11Layout, 'tree'>, uv: Uv): { x: number; y: number } {
  const fu = (uv.u - TREE_ART.u0) / (TREE_ART.u1 - TREE_ART.u0);
  const fv = (uv.v - TREE_ART.v0) / (TREE_ART.v1 - TREE_ART.v0);
  return { x: l.tree.x0 + fu * (l.tree.x1 - l.tree.x0), y: l.tree.y1 - fv * (l.tree.y1 - l.tree.y0) };
}

/** Tâm ô cây `i` của cây `count` ô. */
export const slotPoint = (l: Pick<Man11Layout, 'tree'>, count: number, i: number): { x: number; y: number } => treePoint(l, slotUvs(count)[i]);

/** Tâm nút gộp (mức từ 1, chỉ số `index`) của cây `count` ô; mức cao nhất là gốc. */
export const nodePoint = (l: Pick<Man11Layout, 'tree'>, count: number, level: number, index: number): { x: number; y: number } => treePoint(l, nodeUv(count, level, index));

/** Hộp bao của ô cây. */
export function slotBox(l: Pick<Man11Layout, 'tree'>, count: number, i: number): Rect {
  const p = slotPoint(l, count, i);
  return { x0: p.x - SLOT_SIZE / 2, x1: p.x + SLOT_SIZE / 2, y0: p.y - SLOT_SIZE / 2, y1: p.y + SLOT_SIZE / 2 };
}

/** Cỡ chữ HUD nhỏ nhất (điểm ảnh CSS); "Chữ to" nhân 1,15. */
export const HUD_FONT_PX = 14;
export const LARGE_TEXT_SCALE = 1.15;

/** Cỡ ô tính bằng điểm ảnh CSS. */
export const cellPx = (l: Pick<Man11Layout, 'cell' | 'ppu'>): number => l.cell * l.ppu;

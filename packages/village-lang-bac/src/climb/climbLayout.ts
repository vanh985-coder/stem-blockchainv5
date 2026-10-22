/**
 * Bố cục cảnh màn 12 trên Scene25D (hàm thuần, không import three). Đơn vị thế giới như Scene25D: khung dọc 9 × 16, khung ngang 16 × 9, gốc ở tâm khung, y hướng lên.
 *
 * Cây mọc từ dưới lên: thanh ngang của tầng k (tầng 0 là gốc) ở độ cao `barY(k)` trong hệ của cây; camera đi theo người chơi bằng cách dời cả cây xuống (`cameraY`).
 * Ở mỗi tầng: thanh ngang (`canh-ngang`), tay nắm (`tay-nam`) treo dưới thanh, nhãn hai dòng "Sổ / Nay" ở ngay trên thanh, đúng chỗ tay nắm. Người chơi treo ở x = 0, dưới tay nắm đang giữ.
 * Tiền đồng: 2 đồng treo trên thân giữa hai tầng. Hình cắt theo khung chứa phần có hình của ảnh gốc (ảnh 1024 × 572 có viền trống).
 */

import { HANG } from '@so-chung/core/three/poses';

export type ClimbFrame = 'portrait' | 'landscape';

export const WORLD: Record<ClimbFrame, { width: number; height: number }> = {
  portrait: { width: 9, height: 16 },
  landscape: { width: 16, height: 9 },
};

/** Khoảng cách giữa hai tầng. */
export const LEVEL_GAP = 3.6;
/** Độ cao thanh ngang của tầng k trong hệ của cây. */
export const barY = (k: number): number => k * LEVEL_GAP;

/** Thanh ngang: hai tay nắm chạy trong [−3; 3] (c ± 1,5 với c trong [−1,5; 1,5]); thanh rộng hơn chút. */
export const BAR = { width: 7, height: 0.55 } as const;
/** Tay nắm treo dưới thanh: tâm thấp hơn thanh nửa chiều cao. Tầng trên cùng là lá (hình vuông). */
export const HANDLE = { width: 0.78, height: 1.3 } as const;
export const LEAF = { size: 1.25 } as const;
export const handleY = (k: number): number => barY(k) - HANDLE.height / 2 + 0.05;
/** Nhãn "Sổ / Nay": ngay trên thanh, cùng x với tay nắm. Hai nhãn cách nhau 3 (bằng khoảng cách hai tay nắm) nên rộng tối đa 2,7. */
export const LABEL = { width: 2.7, height: 1.2, above: 0.82 } as const;
export const labelY = (k: number): number => barY(k) + LABEL.above;
/**
 * Người chơi: cao `height`, treo bằng tư thế `hang` dựng bằng code (core/three/poses.ts): hai lòng bàn tay ở độ cao `HANG.handsRatio` × chiều cao trên chân, nên chân ở
 * `feetY(k)` = chỗ nắm − `HANG.handsRatio` × `height`. Chỗ nắm ở dưới thanh `GRIP_BELOW_BAR` = 0,95: đáy thân đèn lồng của `tay-nam` (đèn cao 1,3, thân đèn tới 0,94 dưới đỉnh); hai bàn tay nắm vào đó và đầu nằm hẳn dưới đèn (đỉnh đầu thấp hơn chỗ nắm chừng 0,1).
 */
export const PLAYER = { height: 2.0 } as const;
export const GRIP_BELOW_BAR = 0.95;
export const handsY = (k: number): number => barY(k) - GRIP_BELOW_BAR;
export const feetY = (k: number): number => handsY(k) - HANG.handsRatio * PLAYER.height;
/** Điểm cao nhất của người chơi lúc treo ở tầng k (đỉnh ngón tay giữa; đầu thấp hơn chút). */
export const playerTopY = (k: number): number => handsY(k) + (HANG.fingersRatio - HANG.handsRatio) * PLAYER.height;
/** Cú bật: tới đỉnh thì tay lên gần tới tầng trên (tỉ lệ khoảng cách tầng). */
export const JUMP_RISE = 0.82;

/** Tiền đồng: 2 đồng trên thân giữa tầng k và k + 1 (cao hơn nhãn của tầng k, thấp hơn tay nắm của tầng k + 1). */
export const COIN = { size: 0.5 } as const;
export function coinSpots(k: number): readonly { x: number; y: number }[] {
  const y0 = labelY(k) + LABEL.height / 2 + 0.35;
  return [
    { x: 0, y: y0 },
    { x: 0, y: y0 + 0.6 },
  ];
}

/** Thân cây ghép từ các khúc `than-cay` (đã cắt bỏ đầu tròn): rộng 1,0, mỗi khúc cao theo tỉ lệ ảnh. */
export const TRUNK = { width: 1.0, tile: 1.73 } as const;
/** Gốc cây (dưới cùng) và ngọn cây (trên cùng). */
export const ROOT = { width: 5.2, height: 3.3 } as const;
export const CROWN = { width: 7.4, height: 4.9 } as const;
export const rootY = (): number => barY(0) - 2.6;
export const topY = (depth: number): number => barY(depth) + 2.6;
/** {phanDien} ngồi trên ngọn cây, ôm chiếc lá giả. */
export const VILLAIN = { height: 1.9 } as const;
export const villainY = (depth: number): number => topY(depth) + 0.9;

/** Số khúc thân và độ cao từng khúc, từ trên gốc tới chân ngọn. */
export function trunkTiles(depth: number): number[] {
  const from = rootY() + ROOT.height / 2 - 0.4;
  const to = topY(depth) - CROWN.height / 2 + 0.6;
  const out: number[] = [];
  for (let y = from + TRUNK.tile / 2; y - TRUNK.tile / 2 < to; y += TRUNK.tile * 0.98) out.push(y);
  return out;
}

/** Camera nhìn tầng người chơi đang giữ: khung dọc thấy cả tầng trên và tầng trên nữa; khung ngang chật hơn nên nhích lên ít hơn. */
export function cameraY(frame: ClimbFrame, level: number): number {
  return barY(level) + (frame === 'portrait' ? 2.2 : 1.1);
}

/** Cắt ảnh theo khung có hình (u0, u1, v0, v1 theo tọa độ ảnh: v = 0 ở trên). */
export const CROPS = {
  trunk: { u0: 0.4, u1: 0.6, v0: 0.2, v1: 0.82 },
  bar: { u0: 0.077, u1: 0.922, v0: 0.406, v1: 0.583 },
  handle: { u0: 0.364, u1: 0.635, v0: 0.086, v1: 0.921 },
  root: { u0: 0.172, u1: 0.851, v0: 0.129, v1: 0.904 },
  crown: { u0: 0.215, u1: 0.769, v0: 0.152, v1: 0.841 },
} as const;

/** Số điểm ảnh CSS của một đơn vị thế giới khi khung rộng `framePx` điểm ảnh. */
export const pxPerUnit = (frame: ClimbFrame, framePx: number): number => framePx / WORLD[frame].width;

/** Cỡ chữ nhỏ nhất trên nhãn (px CSS); "Chữ to" nhân 1,15. */
export const MIN_LABEL_PX = 14;
export const LARGE_TEXT_SCALE = 1.15;

/**
 * Cỡ chữ nhãn (px CSS): hai dòng chiếm khoảng 72% chiều cao nhãn, không dưới 14 (Chữ to: 16,1); rồi thu cho vừa bề rộng chuỗi dài nhất (`widthAt1px`: bề rộng chuỗi ở cỡ 1 px),
 * vẫn không dưới 14.
 */
export function labelFontPx(ppu: number, largeText: boolean, widthAt1px: number): number {
  const k = largeText ? LARGE_TEXT_SCALE : 1;
  const floor = MIN_LABEL_PX;
  const want = Math.max(floor * k, LABEL.height * ppu * 0.36);
  const fitW = (LABEL.width * ppu * 0.9) / Math.max(widthAt1px, 1e-6);
  return Math.max(floor, Math.min(want, fitW));
}

/**
 * Nhãn của tay nắm đang giữ có hiện không: ẩn từ lúc bật lên (`peakAt` khác null) tới khi người chơi về xong chỗ treo (`tweenEnd`: lúc kết thúc đoạn chuyển động của người chơi, ms), vì nhãn
 * nằm trên thanh đúng chỗ người chơi bay qua khi bật hay tụt về. Về tay nắm cũ (ngõ cụt, hụt) hay sang tầng mới thì hiện lại.
 */
export const heldLabelVisible = (peakAt: number | null, now: number, tweenEnd: number): boolean => peakAt === null && now >= tweenEnd;

/** Chọn khung theo kích thước màn hình: cao hơn rộng thì dọc. */
export const frameOf = (width: number, height: number): ClimbFrame => (height > width ? 'portrait' : 'landscape');

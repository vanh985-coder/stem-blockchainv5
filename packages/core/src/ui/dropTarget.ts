/**
 * Chọn ô nhận khi thả một thẻ kéo (hàm thuần, không import React hay dnd-kit).
 * Ô nhận khi: phần giao giữa thẻ và ô ≥ 30% diện tích thẻ, HOẶC tâm thẻ nằm trong ô. Chồng nhiều ô thì lấy ô giao nhiều nhất
 * (bằng nhau thì ô có tâm gần tâm thẻ hơn). Không quan tâm con trỏ nằm ở đâu: thả thẻ đè lên ô là đủ.
 */

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DropCandidate {
  id: string;
  rect: Box;
}

/** Tỉ lệ phần giao trên diện tích thẻ để ô nhận thẻ. */
export const DROP_OVERLAP_RATIO = 0.3;

/** Diện tích phần giao của hai hộp (0 nếu không chạm). */
export function intersectionArea(a: Box, b: Box): number {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Tâm của `card` nằm trong `slot` (kể cả sát mép). */
export function centerInside(card: Box, slot: Box): boolean {
  const cx = card.left + card.width / 2;
  const cy = card.top + card.height / 2;
  return cx >= slot.left && cx <= slot.left + slot.width && cy >= slot.top && cy <= slot.top + slot.height;
}

/** Ô đủ điều kiện nhận thẻ không (xem đầu file). */
export function acceptsCard(card: Box, slot: Box): boolean {
  const cardArea = card.width * card.height;
  if (!(cardArea > 0)) return false;
  return intersectionArea(card, slot) / cardArea >= DROP_OVERLAP_RATIO || centerInside(card, slot);
}

/** Chọn ô nhận trong `slots`, hoặc null nếu thả ra ngoài mọi ô (thẻ về chỗ cũ). */
export function pickDropSlot(card: Box, slots: readonly DropCandidate[]): string | null {
  let best: { id: string; area: number; dist: number } | null = null;
  const cx = card.left + card.width / 2;
  const cy = card.top + card.height / 2;
  for (const s of slots) {
    if (!acceptsCard(card, s.rect)) continue;
    const area = intersectionArea(card, s.rect);
    const dist = Math.hypot(s.rect.left + s.rect.width / 2 - cx, s.rect.top + s.rect.height / 2 - cy);
    if (best === null || area > best.area || (area === best.area && dist < best.dist)) best = { id: s.id, area, dist };
  }
  return best ? best.id : null;
}

/**
 * Hệ số phóng thực của một phần tử so với bố cục (zoom hoặc scale của tổ tiên): bề rộng vẽ ra chia bề rộng bố cục.
 * Dùng để quy khoảng kéo (px màn hình) về px bố cục khi gán `transform` cho thẻ nằm trong khối được phóng.
 */
export function layoutScale(rectWidth: number, layoutWidth: number): number {
  return rectWidth > 0 && layoutWidth > 0 && Number.isFinite(rectWidth / layoutWidth) ? rectWidth / layoutWidth : 1;
}

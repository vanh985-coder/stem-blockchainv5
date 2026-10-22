/**
 * Thẻ "Em có biết?" rải trong làng (bước X3): hàm thuần cho id vật tương tác, id nút đồ thị đường, chọn thẻ gần nhất chưa nhặt (cho mũi tên và lời gợi ý của Bi). Không import three.
 */
import { countKnowCards, hasKnowCard } from '../../progress/knowCards';
import type { VillageId } from '../../village';
import type { VillageScroll } from './villageLayout';

export const scrollTargetId = (village: VillageId, index: number): string => `scroll:${village}:${index}`;
/** Nút đồ thị đường ở chỗ đứng cạnh thẻ (xem `buildWorldGraph`). */
export const scrollNodeId = (village: VillageId, index: number): string => `scroll:${village}:${index}`;

export function parseScrollTarget(id: string): { village: VillageId; index: number } | null {
  const m = /^scroll:(lang-[a-z-]+):(\d+)$/.exec(id);
  return m ? { village: m[1] as VillageId, index: Number(m[2]) } : null;
}

/** Thẻ chưa nhặt (theo mặt nạ bit), giữ thứ tự. */
export function uncollectedScrolls(scrolls: readonly VillageScroll[], mask: number): VillageScroll[] {
  return scrolls.filter((s) => !hasKnowCard(mask, s.index));
}

/** Số thẻ đã nhặt trong số thẻ của làng. */
export function collectedCount(scrolls: readonly VillageScroll[], mask: number): number {
  return countKnowCards(mask, scrolls.length === 0 ? 0 : Math.max(...scrolls.map((s) => s.index)) + 1);
}

/** Thẻ chưa nhặt gần (x, z) nhất theo đường chim bay, hoặc null nếu đã đủ. Chỉ số nhỏ hơn thắng khi bằng nhau. */
export function nearestScroll(scrolls: readonly VillageScroll[], mask: number, x: number, z: number): VillageScroll | null {
  let best: VillageScroll | null = null;
  let bestD = Infinity;
  for (const s of scrolls) {
    if (hasKnowCard(mask, s.index)) continue;
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/** Cột sáng cao bấy nhiêu và hình cuộn giấy nhấp nhô quanh độ cao này (xem KnowScrolls). */
export const BEAM_HEIGHT = 36;
export const SCROLL_HOVER_Y = 1.15;

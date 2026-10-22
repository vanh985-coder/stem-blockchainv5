/**
 * Nhiệm vụ và đích của mũi tên ở thế giới mở (mốc 2, bước W1). Hàm thuần, không import three.
 * Ở ngoài làng (chợ, đường): đích là cổng của làng cần tới theo số Trang Sổ Vàng (spec 04 mục 3). Trong làng còn việc: đích là biển của việc tiếp theo trong làng đó (spec 03 mục 6); làng xong việc thì quay
 * lại nhiệm vụ theo số Trang Sổ Vàng (đi ra cổng để sang làng kế tiếp).
 */
import { VILLAGE_ORDER } from '../../content/levels';
import type { VillageId } from '../../village';

import { clampPages, questGate } from '../cho/marketQuest';
import { scrollNodeId } from '../village/scrollTargets';
import { boardNodeId, gateNodeId } from './worldLayout';

/**
 * Số trang dùng cho dòng nhiệm vụ và mũi tên: đang chờ chiếu cảnh trao trang (vừa xong làng cuối, chưa chiếu) thì chưa tính trang mới, để dòng nhiệm vụ đổi ngay SAU cảnh trao trang
 * (cảnh trao trang chạy trong làng; xem `shouldShowGolden`). Ô trang trên HUD vẫn đếm đủ.
 */
export function effectivePages(goldenPages: number, ceremonyPending: boolean): number {
  const p = clampPages(goldenPages);
  return ceremonyPending && p > 0 ? p - 1 : p;
}

/** Làng vừa trao trang cuối cùng (làng thứ `pages`, từ 1), hoặc null nếu chưa có trang. */
export function lastGiver(goldenPages: number): VillageId | null {
  const p = clampPages(goldenPages);
  return p >= 1 ? VILLAGE_ORDER[p - 1] : null;
}

export interface TargetInput {
  /** Làng người chơi đang ở trong (đã qua cổng), hoặc null */
  inVillage: VillageId | null;
  /** Số màn của việc tiếp theo trong làng đó (biển cần tới), hoặc null nếu làng đã xong việc */
  nextBoard: number | null;
  /** Số Trang Sổ Vàng dùng cho nhiệm vụ (đã qua `effectivePages`) */
  pages: number;
  /** Chỉ số thẻ "Em có biết?" chưa nhặt gần nhất trong làng đang ở (bước X3), hoặc null/bỏ trống nếu không còn thẻ phải tìm (hoặc không phải bắt tìm) */
  scroll?: number | null;
}

/** Id nút đích của mũi tên (xem `buildWorldGraph`), hoặc null khi không có đích (đủ 4 trang, hội làng). */
export function targetNodeId(i: TargetInput): string | null {
  if (i.inVillage && i.scroll !== undefined && i.scroll !== null && i.scroll >= 0) return scrollNodeId(i.inVillage, i.scroll);
  if (i.inVillage && i.nextBoard !== null) return boardNodeId(i.nextBoard);
  const gate = questGate(i.pages);
  return gate ? gateNodeId(gate) : null;
}


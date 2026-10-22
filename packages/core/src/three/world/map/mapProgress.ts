/**
 * Tóm tắt tiến độ từng làng cho bản đồ lớn (mốc 2, bước X4): số màn đã xong trên tổng, thẻ "Em có biết?" đã nhặt trên tổng (làng có thẻ rải), và Trang Sổ Vàng đã nhận hay chưa. Hàm thuần.
 */
import { VILLAGE_ORDER, levelsOfVillage } from '../../../content/levels';
import { countKnowCards } from '../../../progress/knowCards';
import type { LevelState } from '../../../progress/unlock';
import type { VillageId } from '../../../village';

export interface VillageProgress {
  id: VillageId;
  levelsDone: number;
  levelsTotal: number;
  /** Thẻ đã nhặt và tổng số thẻ rải trong làng; null nếu làng chưa có thẻ rải (làng chưa dựng) */
  cards: { got: number; total: number } | null;
  /** Đã nhận Trang Sổ Vàng của làng này */
  page: boolean;
}

export interface ProgressInput {
  /** Trạng thái hiện của từng màn */
  levelStates: Readonly<Record<number, LevelState | undefined>>;
  /** Mặt nạ thẻ đã nhặt (hiệu lực) và số thẻ rải theo làng */
  knowMasks: Readonly<Record<string, number>>;
  scrollTotals: Readonly<Record<string, number>>;
  /** Số Trang Sổ Vàng đã có (0 đến 4): trang thứ i là của làng thứ i theo `VILLAGE_ORDER` */
  goldenPages: number;
}

export function villageProgress(input: ProgressInput): VillageProgress[] {
  return VILLAGE_ORDER.map((id, i) => {
    const levels = levelsOfVillage(id);
    const total = input.scrollTotals[id] ?? 0;
    return {
      id,
      levelsDone: levels.filter((l) => input.levelStates[l.id] === 'done').length,
      levelsTotal: levels.length,
      cards: total > 0 ? { got: countKnowCards(input.knowMasks[id] ?? 0, total), total } : null,
      page: input.goldenPages > i,
    };
  });
}

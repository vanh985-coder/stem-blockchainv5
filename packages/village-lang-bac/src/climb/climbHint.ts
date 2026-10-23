/**
 * Câu nhắc của nút "?" ở màn 12 (bước HD): hàm thuần theo trạng thái ván, CHỈ TRẢ KHÓA (chữ nằm ở `content/huongDanGame.ts`, màn 12, mục `nhac`). KHÔNG lộ đáp án: không nói đèn lồng nào (trái hay phải),
 * số nào hay lúc nào nên bật; chỉ nhắc cách so Sổ và Nay, cách canh giờ, và nhắc tầng lá. Tầng lá là lúc cặp đèn lồng phía trên là hai chiếc lá; mới lên tầng (trong `LOOK_SECONDS` giây đầu) thì nhắc so số,
 * sau đó nhắc canh giờ.
 */
import type { NhacKey } from '@so-chung/core';
import type { ClimbState } from './climbLogic';

/** Mới lên tầng trong chừng này giây (tự chọn) thì nhắc "so Sổ và Nay"; sau đó nhắc "chờ đèn lồng tới đầu". */
export const LOOK_SECONDS = 4;
export type ClimbHintKey = NhacKey<12>;

export function hintFor(s: Pick<ClimbState, 'phase' | 'level' | 'tree' | 'hearts' | 'time' | 'arrivedAt'>): readonly ClimbHintKey[] {
  if (s.phase === 'roundDone' || s.phase === 'won') return ['xongVong'];
  if (s.phase === 'lost') return ['hetVan'];
  if (s.level + 1 >= s.tree.depth) return ['tangLa'];
  if (s.hearts === 1) return ['motTim'];
  return [s.time - s.arrivedAt < LOOK_SECONDS ? 'soSanh' : 'canGio'];
}

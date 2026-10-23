/**
 * Câu nhắc của nút "?" ở màn 12 (bước HD): hàm thuần theo trạng thái ván. Chữ ở `content/gameHints.ts` (`gameHints.man12`). KHÔNG lộ đáp án: không nói đèn lồng nào (trái hay phải), số nào hay lúc nào
 * nên bật; chỉ nhắc cách so Sổ và Nay, cách canh giờ, và nhắc tầng lá. Tầng lá là lúc cặp đèn lồng phía trên là hai chiếc lá; mới lên tầng (trong `LOOK_SECONDS` giây đầu) thì nhắc so số, sau đó nhắc canh giờ.
 */
import { gameHints } from '@so-chung/core';
import type { ClimbState } from './climbLogic';

/** Mới lên tầng trong chừng này giây (tự chọn) thì nhắc "so Sổ và Nay"; sau đó nhắc "chờ đèn lồng tới đầu". */
export const LOOK_SECONDS = 4;

export function hintFor(s: Pick<ClimbState, 'phase' | 'level' | 'tree' | 'hearts' | 'time' | 'arrivedAt'>): string {
  const h = gameHints.man12;
  if (s.phase === 'roundDone' || s.phase === 'won') return h.xongVong;
  if (s.phase === 'lost') return h.het;
  if (s.level + 1 >= s.tree.depth) return h.tangLa;
  if (s.hearts === 1) return h.motTim;
  return s.time - s.arrivedAt < LOOK_SECONDS ? h.soSanh : h.canGio;
}

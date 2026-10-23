/**
 * Câu nhắc của nút "?" ở màn 8 (bước HD): hàm thuần theo trạng thái ván. Chữ ở `content/gameHints.ts` (`gameHints.man8`). KHÔNG lộ đáp án: chỉ nói em đang cầm loại thẻ nào và nhắc luật ghép
 * (5^x mod 23), không bao giờ nói thẻ nào, số nào hay vị trí nào. Vòng 3 thêm câu {phanDien} tráo thẻ.
 */
import { gameHints } from '@so-chung/core';
import type { MemoryState } from './memoryLogic';

type HintState = Pick<MemoryState, 'phase' | 'round' | 'cards' | 'flippedIndices' | 'waitingFlipBack'>;

export function hintFor(state: HintState): string {
  const h = gameHints.man8;
  if (state.phase === 'gameOver') return h.het;
  if (state.phase === 'roundDone') return h.xongVong;
  let line: string;
  if (state.waitingFlipBack || state.flippedIndices.length >= 2) line = h.luatSai;
  else if (state.flippedIndices.length === 1) line = state.cards[state.flippedIndices[0]]?.type === 'khuon' ? h.catKhuon : h.catMau;
  else line = h.chuaLat;
  return state.round === 2 ? `${line} ${h.vong3}` : line;
}

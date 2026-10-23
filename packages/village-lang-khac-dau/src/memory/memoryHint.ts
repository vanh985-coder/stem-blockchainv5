/**
 * Câu nhắc của nút "?" ở màn 8 (bước HD): hàm thuần theo trạng thái ván, CHỈ TRẢ KHÓA (chữ nằm ở `content/huongDanGame.ts`, màn 8, mục `nhac`). KHÔNG lộ đáp án: chỉ nói em đang cầm loại thẻ nào
 * và nhắc luật ghép, không bao giờ nói thẻ nào, số nào hay vị trí nào. Vòng 3 thêm khóa `vong3` (câu {phanDien} tráo thẻ), nối vào sau câu chính.
 */
import type { NhacKey } from '@so-chung/core';
import type { MemoryState } from './memoryLogic';

type HintState = Pick<MemoryState, 'phase' | 'round' | 'cards' | 'flippedIndices' | 'waitingFlipBack'>;
export type MemoryHintKey = NhacKey<8>;

export function hintFor(state: HintState): readonly MemoryHintKey[] {
  if (state.phase === 'gameOver') return ['hetVan'];
  if (state.phase === 'roundDone') return ['xongVong'];
  let key: MemoryHintKey;
  if (state.waitingFlipBack || state.flippedIndices.length >= 2) key = 'choUp';
  else if (state.flippedIndices.length === 1) key = state.cards[state.flippedIndices[0]]?.type === 'khuon' ? 'dangCamKhuon' : 'dangCamMau';
  else key = 'chuaLat';
  return state.round === 2 ? [key, 'vong3'] : [key];
}

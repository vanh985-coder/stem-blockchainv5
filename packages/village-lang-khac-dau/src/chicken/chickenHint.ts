/**
 * Câu nhắc của nút "?" ở màn 9 (bước B11): hàm thuần theo trạng thái ván, CHỈ TRẢ KHÓA (chữ nằm ở `content/huongDanGame.ts`, màn 9, mục `nhac`). KHÔNG lộ đáp án: không nói thuốc nào chữa thẻ nào,
 * không nói nhãn nào vào lọ nào, không nói con gà nào cần bắn; chỉ nhắc luật và công thức. Thứ tự ưu tiên: hết ván, nạp đạn (đã đủ nhãn thì nhắc bấm bắt đầu), gà trùm (kèm câu "một tim" nếu chỉ còn một tim),
 * chỉ còn một tim, đợt gà chưa có con nào trên đường, rồi câu chung của đợt gà.
 */
import type { NhacKey } from '@so-chung/core';
import type { ChickenState } from './chickenLogic';

export type ChickenHintKey = NhacKey<9>;

type HintState = Pick<ChickenState, 'phase' | 'hearts' | 'chickens' | 'round' | 'loads'>;

export function hintFor(s: HintState): readonly ChickenHintKey[] {
  if (s.phase === 'ended') return ['hetVan'];
  if (s.phase === 'load') return [s.loads[s.round].slots.every((x) => x !== null) ? 'napXong' : 'napDan'];
  if (s.phase === 'boss') return s.hearts === 1 ? ['trum', 'motTim'] : ['trum'];
  if (s.hearts === 1) return ['motTim'];
  if (s.chickens.length === 0) return ['choGa'];
  return ['dotGa'];
}

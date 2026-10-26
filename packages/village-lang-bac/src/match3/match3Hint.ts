/**
 * Câu nhắc của nút "?" ở màn 11 (spec 03 mục 3.8 và 6): hàm thuần theo trạng thái ván, CHỈ TRẢ KHÓA (chữ nằm ở `content/huongDanGame.ts`, màn 11, mục `nhac`). KHÔNG chỉ nước đi cụ thể: không nói ô nào,
 * hàng nào, đổi với ô nào, hay cần loại lá nào; chỉ nhắc cách chơi và nhắc nhìn cây.
 *
 * Thứ tự ưu tiên: hết vòng, hết ván; còn ít lượt (≤ `LOW_TURNS`); có lá giả trên bàn; có hoa sen, ô gió xoáy (nhắc cách dùng); còn lại nhắc cách đổi ô và nhìn cây.
 */
import type { NhacKey } from '@so-chung/core';
import type { Match3State } from './match3Logic';

export type Match3HintKey = NhacKey<11>;
/** Còn chừng này lượt hay ít hơn thì nhắc "sắp hết lượt" (tự chọn). */
export const LOW_TURNS = 3;

export function hintFor(s: Pick<Match3State, 'phase' | 'turnsLeft' | 'board'>): readonly Match3HintKey[] {
  if (s.phase === 'roundEnd') return ['xongVong'];
  if (s.phase === 'ended') return ['hetVan'];
  if (s.turnsLeft <= LOW_TURNS) return ['sapHet'];
  let fake = false;
  let lotus = false;
  let wind = false;
  for (const row of s.board) {
    for (const x of row) {
      if (x.kind === 'fake') fake = true;
      else if (x.kind === 'wind') wind = true;
      else if (x.lotus) lotus = true;
    }
  }
  if (wind) return ['gioXoay'];
  if (lotus) return ['hoaSen'];
  if (fake) return ['laGia'];
  return ['doiO', 'nhinCay'];
}

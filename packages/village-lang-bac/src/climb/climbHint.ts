/**
 * Câu nhắc của nút "?" ở màn 12 "Leo bậc gỗ": hàm thuần theo trạng thái ván, CHỈ TRẢ KHÓA (chữ nằm ở `content/huongDanGame.ts`, màn 12, mục `nhac`). KHÔNG lộ đáp án: không nói bậc nào,
 * số nào hay lúc nào nên nhảy; chỉ nhắc cách tính (trái rồi tới phải), cách nhảy và lái, và nhắc tầng cuối.
 */
import type { NhacKey } from '@so-chung/core';
import type { ClimbState } from './climbLogic';

export type ClimbHintKey = NhacKey<12>;

export function hintFor(s: Pick<ClimbState, 'phase' | 'level' | 'tree' | 'hearts' | 'mode' | 'player'>): readonly ClimbHintKey[] {
  if (s.phase === 'roundDone' || s.phase === 'won') return ['xongVong'];
  if (s.phase === 'lost') return ['hetVan'];
  if (s.mode !== 'free') return ['lamLai'];
  if (s.hearts === 1) return ['motTim'];
  if (s.level + 1 >= s.tree.depth) return ['tangGoc'];
  return [s.player.grounded ? 'soSanh' : 'laiTrenKhong'];
}

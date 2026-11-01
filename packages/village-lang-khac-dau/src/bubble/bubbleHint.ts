/**
 * Câu nhắc của nút "?" ở màn 9 (hàm thuần theo trạng thái ván): CHỈ TRẢ KHÓA (chữ nằm ở `content/huongDanGame.ts`, màn 9, mục `nhac`). KHÔNG lộ đáp án: không nói trứng nào đúng,
 * không nói khóa nào ra mẫu nào, không chỉ chỗ nên bắn; chỉ nhắc luật và công thức. Thứ tự ưu tiên: hết ván, nạp trứng (đủ trứng thì nhắc bấm bắt đầu), chưa chọn loại trứng,
 * chỉ còn một tim, sắp hạ bàn, rồi câu chung.
 */
import type { NhacKey } from '@so-chung/core';
import { loadComplete, shotsToDescend, type BubbleState } from './bubbleLogic';

export type BubbleHintKey = NhacKey<9>;

export function hintFor(s: BubbleState): readonly BubbleHintKey[] {
  if (s.phase === 'ended') return ['hetVan'];
  if (s.phase === 'load') return [loadComplete(s) ? 'napXong' : 'napDan'];
  if (s.selected === null) return ['chuaChon'];
  if (s.hearts === 1) return ['motTim'];
  if (shotsToDescend(s) <= 2) return ['sapHa'];
  return ['ngamBan'];
}

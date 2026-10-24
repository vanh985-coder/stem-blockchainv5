/**
 * Câu nhắc của nút "?" ở màn 6 (bước B9): hàm thuần theo trạng thái ván, CHỈ TRẢ KHÓA (chữ nằm ở `content/huongDanGame.ts`, màn 6, mục `nhac`). KHÔNG lộ đáp án: không nói đáp án câu hỏi nào đúng, không chỉ độ cao
 * cần bay tới; chỉ nhắc luật và việc cần làm. Thứ tự ưu tiên: hết ván, đang hỏi ở cổng, chỉ còn một tim, khe kế có diều đen (còn trong tầm nhìn), cổng làng ở phía trước (trong tầm nhìn), những giây đầu ván, rồi câu chung.
 */
import type { NhacKey } from '@so-chung/core';
import { gateXOf, type KiteState } from './kiteLogic';

/** Diều đen hay cổng cách chừng này (đơn vị bay) thì mới nhắc: gần bằng một màn hình phía trước */
export const AHEAD = 9;
/** Những giây đầu ván (tự chọn): nhắc cách chơi */
export const FIRST_SECONDS = 10;
export type KiteHintKey = NhacKey<6>;

export function hintFor(s: Pick<KiteState, 'phase' | 'hearts' | 'gaps' | 'passed' | 'x' | 'time' | 'gatesDone' | 'gateAfter'>): readonly KiteHintKey[] {
  if (s.phase === 'ended') return ['hetVan'];
  if (s.phase === 'quiz') return ['cauHoi'];
  if (s.hearts === 1) return ['motTim'];
  const next = s.gaps[Math.min(s.passed, s.gaps.length - 1)];
  if (next && next.black && next.x - s.x < AHEAD) return ['dieuDen'];
  if (s.gatesDone < s.gateAfter.length && gateXOf(s as KiteState, s.gatesDone) - s.x < AHEAD) return ['cong'];
  if (s.phase === 'ready' || s.time < FIRST_SECONDS) return ['dauVan'];
  return ['chay'];
}

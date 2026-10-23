/**
 * Câu nhắc của nút "?" ở màn 2 (bước HD): hàm thuần theo trạng thái ván, CHỈ TRẢ KHÓA (chữ nằm ở `content/huongDanGame.ts`, màn 2, mục `nhac`). KHÔNG lộ đáp án: không nói làn nào an toàn, vật cản
 * nào sắp tới hay đáp án của câu hỏi; chỉ nhắc luật và việc cần làm. Thứ tự ưu tiên khi đang chạy: còn một tim, đang có đồ hỗ trợ, những giây đầu ván, rồi câu chung.
 */
import type { NhacKey } from '@so-chung/core';
import type { RunnerState } from './runnerLogic';

/** Những giây đầu của vòng 1 (tự chọn) thì nhắc cả cách điều khiển. */
export const FIRST_SECONDS = 6;
export type RunnerHintKey = NhacKey<2>;

export function hintFor(s: Pick<RunnerState, 'phase' | 'quiz' | 'hearts' | 'shield' | 'boots' | 'magnet' | 'round' | 'roundTime'>): readonly RunnerHintKey[] {
  switch (s.phase) {
    case 'over':
      return ['hetVan'];
    case 'quiz':
      return [s.quiz && s.quiz.answered !== null ? 'daTraLoi' : 'hoi'];
    case 'slow':
      return ['chamLai'];
    case 'resume':
      return ['chayLai'];
    default:
      if (s.hearts <= 1) return ['motTim'];
      if (s.shield > 0 || s.boots > 0 || s.magnet > 0) return ['hoTro'];
      if (s.round === 0 && s.roundTime < FIRST_SECONDS) return ['dauVan'];
      return ['chay'];
  }
}

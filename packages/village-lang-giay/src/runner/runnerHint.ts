/**
 * Câu nhắc của nút "?" ở màn 2 (bước HD): hàm thuần theo trạng thái ván. Chữ ở `content/gameHints.ts` (`gameHints.man2`). KHÔNG lộ đáp án: không nói làn nào an toàn, vật cản nào sắp tới hay đáp án
 * của câu hỏi; chỉ nhắc luật và việc cần làm. Thứ tự ưu tiên khi đang chạy: còn một tim, đang có đồ hỗ trợ, những giây đầu ván, rồi câu chung.
 */
import { gameHints } from '@so-chung/core';
import type { RunnerState } from './runnerLogic';

/** Những giây đầu của vòng 1 (tự chọn) thì nhắc cả cách điều khiển. */
export const FIRST_SECONDS = 6;

export function hintFor(s: Pick<RunnerState, 'phase' | 'quiz' | 'hearts' | 'shield' | 'boots' | 'magnet' | 'round' | 'roundTime'>): string {
  const h = gameHints.man2;
  switch (s.phase) {
    case 'over':
      return h.het;
    case 'quiz':
      return s.quiz && s.quiz.answered !== null ? h.daTraLoi : h.hoi;
    case 'slow':
      return h.chamLai;
    case 'resume':
      return h.chayLai;
    default:
      if (s.hearts <= 1) return h.motTim;
      if (s.shield > 0 || s.boots > 0 || s.magnet > 0) return h.hoTro;
      if (s.round === 0 && s.roundTime < FIRST_SECONDS) return h.dauVan;
      return h.chay;
  }
}

/**
 * Câu nhắc của nút "?" ở màn 5 (bước B7): hàm thuần theo trạng thái ván, CHỈ TRẢ KHÓA (chữ nằm ở `content/huongDanGame.ts`, màn 5, mục `nhac`). KHÔNG lộ đáp án: không nói câu hỏi nào đúng,
 * không chỉ làn nào cần đập; chỉ nhắc luật và việc cần làm. Thứ tự ưu tiên: hết ván, đang hỏi, trùm đang chạy xuống, sổ sắp đầy (còn 1 hay 2 chỗ), có chuột to trên sân, có đồng tiền,
 * những giây đầu ván (chưa đập trúng con nào), rồi câu chung.
 */
import type { NhacKey } from '@so-chung/core';
import { WHACK_SPEC } from './whackConfig';
import type { WhackState } from './whackLogic';

/** Những giây đầu ván (tự chọn) mà chưa đập trúng con nào thì nhắc cách đập. */
export const FIRST_SECONDS = 10;
export type WhackHintKey = NhacKey<5>;

export function hintFor(s: Pick<WhackState, 'phase' | 'ink' | 'mice' | 'coin' | 'clock' | 'stats'>): readonly WhackHintKey[] {
  if (s.phase === 'ended') return ['hetVan'];
  if (s.phase === 'quiz') return ['trumHoi'];
  if (s.phase === 'bossRun') return ['trumChay'];
  const room = WHACK_SPEC.inkMax - s.ink;
  if (room >= 1 && room <= 2) return ['soSapDay'];
  if (s.mice.some((m) => m.kind === 'to')) return ['chuotTo'];
  if (s.coin) return ['dongTien'];
  if (s.clock < FIRST_SECONDS && s.stats.hits === 0) return ['dauVan'];
  return ['chay'];
}

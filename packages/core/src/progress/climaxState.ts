/**
 * Cảnh cao trào sau màn 12, xét theo tiến độ (P3a, hoàn thiện). Hàm thuần.
 *
 * Cổng làng mở độc lập nên màn 12 có thể xong trước các làng khác; lúc đó em CHƯA đủ 4 Trang Sổ Vàng và cảnh chưa được nói "đủ 4 trang". Cảnh xem được khi
 * đã có đủ 4 trang VÀ đã chơi màn 12 (kết quả màn 12 đã ghi). Chưa chiếu (`climaxSeen` chưa có) thì cảnh "đang chờ" em: màn kết quả của game vừa làm đủ trang và bảng Làng Bạc
 * ở `/ban-do` có nút xem, không bắt chơi lại màn 12.
 */
import { hasSeenClimax } from './gameTips';
import type { Progress } from './types';

/** Số màn cuối của câu chuyện (game leo cây Làng Bạc). */
export const CLIMAX_LEVEL = 12;
/** Số Trang Sổ Vàng cần để cảnh được nói "đủ 4 trang". */
export const CLIMAX_PAGES = 4;

/** Xem được cảnh cao trào: đủ 4 trang và đã chơi màn 12. */
export function canWatchClimax(progress: Pick<Progress, 'levels' | 'game'>): boolean {
  return Math.floor(progress.game.goldenPages) >= CLIMAX_PAGES && progress.levels[CLIMAX_LEVEL]?.played === true;
}

/** Cảnh đang chờ em: xem được và chưa chiếu lần nào (cờ `climaxSeen`). */
export function climaxPending(progress: Pick<Progress, 'levels' | 'game'>): boolean {
  return canWatchClimax(progress) && !hasSeenClimax(progress.game.data);
}

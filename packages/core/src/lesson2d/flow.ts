import type { DialogueTurn } from '../ui/DialogueBox';
import { recordLevelResult, type ProgressOptions } from '../progress/record';
import type { Progress, Stars } from '../progress/types';
import { STATION_ORDER, type LessonDialogue, type Moment, type StationId } from './types';

/** Hàm thuần: lời người dẫn nói trước trạm thứ i (0 = Dễ → đầu bài, 1 → trước Trung bình, 2 → trước Khó). */
export function momentBeforeStation(index: number): Moment {
  return index <= 0 ? 'dauBai' : index === 1 ? 'truocTb' : 'truocKho';
}

/** Hàm thuần: các lượt nói của một thời điểm. */
export function dialogueFor(dialogue: LessonDialogue, moment: Moment): DialogueTurn[] {
  return dialogue[moment];
}

/**
 * Hàm thuần: có trao Trang Sổ Vàng của làng này không?
 * Chỉ khi số trang đang đứng trước lúc lưu CHƯA tới trang của làng, và sau khi lưu đã tới.
 * Học lại (đã có trang rồi) thì không trao nữa.
 * @param villageIndex vị trí làng theo thứ tự Giấy, Dệt, Khắc Dấu, Bạc (0 đến 3)
 */
export function goldenPageAwarded(before: number, after: number, villageIndex: number): boolean {
  const pageNumber = villageIndex + 1;
  return before < pageNumber && after >= pageNumber;
}

/** Hàm thuần: sao chung của cả bài = trung bình sao 3 trạm (làm tròn), tối thiểu 1. */
export function lessonStars(stars: Partial<Record<StationId, number>>): 1 | 2 | 3 {
  const sum = STATION_ORDER.reduce((s, id) => s + (stars[id] ?? 0), 0);
  const avg = Math.round(sum / STATION_ORDER.length);
  return avg >= 3 ? 3 : avg <= 1 ? 1 : 2;
}

/**
 * Hàm thuần: ghi kết quả một trạm vào tiến độ (đúng một khóa sao của bài).
 * Mỗi trạm xong được ghi ngay, để bỏ dở giữa chừng vẫn giữ sao các trạm đã xong.
 * Xu: +10 cho mỗi sao MỚI so với lần trước; học lại không cộng thêm.
 */
export function applyStationResult(
  progress: Progress,
  levelId: number,
  station: StationId,
  stars: number,
  now: number,
  opts: ProgressOptions = {},
): { progress: Progress; coinsEarned: number } {
  return recordLevelResult(progress, levelId, { stars: { [station]: stars } as Stars }, now, opts);
}

type SavedStars = Partial<Record<StationId, number>>;

/** Hàm thuần: trạm bắt đầu khi vào lại màn = trạm đầu tiên chưa có sao; đã xong cả 3 thì bắt đầu ở trạm Dễ (0). */
export function startStationIndex(saved: SavedStars): number {
  const i = STATION_ORDER.findIndex((id) => (saved[id] ?? 0) <= 0);
  return i === -1 ? 0 : i;
}

/**
 * Hàm thuần: trạm thứ index có bấm chọn được không?
 * Trạm Dễ luôn mở. Trạm khác mở khi chính nó đã có sao hoặc trạm liền trước đã có sao.
 */
export function stationOpen(saved: SavedStars, index: number): boolean {
  if (index < 0 || index >= STATION_ORDER.length) return false;
  if (index === 0) return true;
  return (saved[STATION_ORDER[index]] ?? 0) > 0 || (saved[STATION_ORDER[index - 1]] ?? 0) > 0;
}

/** Hàm thuần: sao của cả bài khi xong, gộp sao lần học này với sao đã có từ trước (trạm không học lần này lấy sao cũ). */
export function finalLessonStars(base: SavedStars, thisRun: SavedStars): 1 | 2 | 3 {
  const merged: SavedStars = {};
  for (const id of STATION_ORDER) merged[id] = thisRun[id] ?? base[id] ?? 0;
  return lessonStars(merged);
}

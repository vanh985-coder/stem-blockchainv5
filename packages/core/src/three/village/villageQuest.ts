/**
 * Nhiệm vụ và việc tiếp theo ở cảnh làng 3D (spec 03 mục 6). Hàm thuần, không import three.
 * Việc tiếp theo là màn đầu tiên (theo thứ tự trong làng) đang MỞ: bài học, rồi game 1, rồi game 2. Màn khóa chưa tới lượt, màn xong và màn sắp ra mắt thì bỏ qua
 * (sắp ra mắt được tính như đã qua và không chặn màn sau).
 */
import type { LevelState } from '../../progress/unlock';

export type GuideTopic = 'lesson' | 'game1' | 'game2' | 'done';

/** Số màn của việc tiếp theo, hoặc null nếu cả làng đã xong (không còn màn nào mở). `levelIds` theo thứ tự trong làng. */
export function nextLevel(levelIds: readonly number[], stateOf: (id: number) => LevelState | undefined): number | null {
  for (const id of levelIds) if (stateOf(id) === 'open') return id;
  return null;
}

/** Chủ đề người dẫn nhắc: theo vị trí của việc tiếp theo trong làng (0: bài học, 1: game 1, 2: game 2); không còn việc thì `done`. */
export function guideTopic(levelIds: readonly number[], next: number | null): GuideTopic {
  if (next === null) return 'done';
  const i = levelIds.indexOf(next);
  return i === 0 ? 'lesson' : i === 1 ? 'game1' : i === 2 ? 'game2' : 'done';
}

/** Màn đang khóa kèm lý do: màn cần xong trước (từ computeUnlock). */
export function lockedBy(levelId: number, unlockLevels: readonly { id: number; state: LevelState; lockedBy?: number }[]): number | undefined {
  return unlockLevels.find((u) => u.id === levelId)?.lockedBy;
}

/** Dải trạng thái vẽ trên biển gỗ: đã xong, khóa, sắp ra mắt; màn đang mở thì không có dải. */
export type BoardBadge = 'xong' | 'khoa' | 'sap' | null;
export function boardBadge(state: LevelState | undefined): BoardBadge {
  return state === 'done' ? 'xong' : state === 'locked' || state === undefined ? 'khoa' : state === 'coming-soon' ? 'sap' : null;
}

import { hasProgress, type Progress } from './types';

/**
 * Cờ "đã đọc cốt truyện" (mốc 2, bước X1): `game_state.data.storySeen = true` (cột jsonb sẵn có, không cần migration); chơi thử: trường "st" của cookie `sc_guest` (0 hay 1).
 * Lần đầu vào chơi (đăng ký, đăng nhập, "Chơi thử") phải đọc hết truyện (/truyen, 14 trang, không có "Bỏ qua") rồi mới vào /cho. Toàn hàm thuần, không sửa dữ liệu đầu vào.
 */
export const STORY_SEEN_KEY = 'storySeen';

export const hasReadStory = (data: Record<string, unknown> | undefined): boolean => data?.[STORY_SEEN_KEY] === true;

/** Data mới đã đánh dấu là đã đọc truyện (giữ nguyên các khóa khác). */
export const withStoryRead = (data: Record<string, unknown> | undefined): Record<string, unknown> => ({ ...(data ?? {}), [STORY_SEEN_KEY]: true });

/** Hợp hai bản cờ: một trong hai bên đã đọc thì coi là đã đọc. Không bên nào đọc thì giữ nguyên `base`. */
export function mergeStorySeen(base: Record<string, unknown>, other: Record<string, unknown>): Record<string, unknown> {
  if (!hasReadStory(base) && !hasReadStory(other)) return base;
  return { ...base, [STORY_SEEN_KEY]: true };
}

/** Cờ thành 0 hay 1 (cho cookie). */
export const storyMask = (data: Record<string, unknown> | undefined): number => (hasReadStory(data) ? 1 : 0);

/** 0 hay 1 thành data (trả {} nếu chưa đọc). */
export function storyDataFromMask(mask: unknown): Record<string, unknown> {
  return typeof mask === 'number' && Number.isFinite(mask) && Math.floor(mask) >= 1 ? { [STORY_SEEN_KEY]: true } : {};
}

/**
 * Người chơi đã có từ trước (tiến độ nào đó, hoặc đã có một cờ nào đó như đã xem giới thiệu làng, hướng dẫn): coi như đã đọc truyện, không bắt đọc. Tài khoản và khách thật sự mới thì data trống và chưa có
 * tiến độ.
 */
export function isReturningPlayer(progress: Progress): boolean {
  return hasProgress(progress) || Object.keys(progress.game.data).length > 0;
}

export type StoryGate = 'wait' | 'read' | 'ok';

export interface StoryGateInput {
  /** Trạng thái của ProgressProvider: 'loading' khi chưa biết đăng nhập hay chơi thử */
  mode: 'loading' | 'guest' | 'user';
  /** Đã kéo xong tiến độ từ máy chủ (chỉ có nghĩa khi đã đăng nhập) */
  synced: boolean;
  /** Đang kiểm tra phiên đăng nhập, hoặc đã có phiên mà hồ sơ chưa đọc xong */
  authLoading: boolean;
  isTeacher: boolean;
  progress: Progress;
}

/**
 * Có phải đọc truyện trước khi vào /cho không:
 * - 'wait': chưa biết (đang tải phiên, hồ sơ hay tiến độ): chưa chuyển trang, chưa dựng cảnh;
 * - 'ok': không phải đọc (giáo viên, đã đọc, hoặc đã có tiến độ từ trước);
 * - 'read': phải đọc, chuyển tới /truyen.
 */
export function storyGate(i: StoryGateInput): StoryGate {
  if (i.authLoading || i.mode === 'loading' || (i.mode === 'user' && !i.synced)) return 'wait';
  if (i.isTeacher || hasReadStory(i.progress.game.data) || isReturningPlayer(i.progress)) return 'ok';
  return 'read';
}

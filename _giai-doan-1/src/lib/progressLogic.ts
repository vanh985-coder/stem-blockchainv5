/**
 * Các hàm thuần (pure functions) quản lý tính toán tiến độ học tập, điểm thưởng và điều kiện mở khóa.
 * Không đụng đến localStorage, không import React, không có side-effects.
 */

export type LevelId = 'easy' | 'medium' | 'hard';
export type Stars = 0 | 1 | 2 | 3;
export type Difficulty = LevelId; // Bí danh tương thích

export interface LevelProgress {
  completed: boolean;
  stars: Stars;
  bestTime?: number; // millisecond hoặc giây
}

export interface UserSettings {
  soundEnabled: boolean;
  reducedMotion: boolean;
  presentationFont: boolean;
  teacherMode: boolean;
}

export interface AppProgressData {
  version: number;
  userName: string;
  settings: UserSettings;
  totalXp: number;
  levels: Record<string, LevelProgress>;
  didYouKnowViewed: Record<number, boolean>;
  lessonData: Record<string, unknown>;
  firstVisitDone: boolean;
}

/**
 * Tính số sao đạt được dựa trên số lỗi:
 * 0 lỗi -> 3 sao; 1-2 lỗi -> 2 sao; >=3 lỗi -> 1 sao
 */
export function starsFromMistakes(mistakes: number): 1 | 2 | 3 {
  if (mistakes <= 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

/**
 * Tính XP nhận được theo mức độ và số sao:
 * 0 sao -> 0 XP; còn lại base + 5*(stars - 1) với base: easy 10, medium 15, hard 20
 */
export function xpForStars(level: LevelId, stars: Stars): number {
  if (stars <= 0) return 0;
  const base = level === 'easy' ? 10 : level === 'medium' ? 15 : 20;
  return base + 5 * (stars - 1);
}

/**
 * Tính độ chênh lệch XP khi đạt kỷ lục sao mới:
 * xpForStars(new) - xpForStars(old) nếu new > old, ngược lại 0
 */
export function xpDelta(level: LevelId, oldStars: Stars, newStars: Stars): number {
  if (newStars <= oldStars) return 0;
  return xpForStars(level, newStars) - xpForStars(level, oldStars);
}

/**
 * Kiểm tra xem một bài học có được mở khóa không:
 * - Nếu teacherMode -> true
 * - Bài 1 luôn mở mặc định
 * - Bài N (N > 1) mở khi mức Khó (hard) của Bài N-1 đã hoàn thành
 */
export function isLessonUnlocked(
  state: AppProgressData,
  lesson: number,
  teacherMode: boolean = false
): boolean {
  const isTeacher = teacherMode || Boolean(state?.settings?.teacherMode);
  if (isTeacher) return true;
  if (lesson <= 1) return true;

  const prevLessonHardKey = `${lesson - 1}_hard`;
  return Boolean(state?.levels?.[prevLessonHardKey]?.completed);
}

/**
 * Kiểm tra xem một mức cụ thể (easy / medium / hard) của một bài có được mở khóa không:
 * - Nếu teacherMode -> true
 * - Nếu bài chưa mở -> false
 * - Mức easy mở ngay khi bài mở
 * - Mức medium mở khi easy đã hoàn thành
 * - Mức hard mở khi medium đã hoàn thành
 */
export function isLevelUnlocked(
  state: AppProgressData,
  lesson: number,
  level: LevelId,
  teacherMode: boolean = false
): boolean {
  const isTeacher = teacherMode || Boolean(state?.settings?.teacherMode);
  if (isTeacher) return true;
  if (!isLessonUnlocked(state, lesson, isTeacher)) return false;

  if (level === 'easy') return true;
  if (level === 'medium') {
    return Boolean(state?.levels?.[`${lesson}_easy`]?.completed);
  }
  if (level === 'hard') {
    return Boolean(state?.levels?.[`${lesson}_medium`]?.completed);
  }
  return false;
}

/**
 * Kiểm tra xem trang Tổng kết có được mở khóa không:
 * - Nếu teacherMode -> true
 * - Mở khi Bài 5 mức Khó (5_hard) đã hoàn thành
 */
export function isSummaryUnlocked(
  state: AppProgressData,
  teacherMode: boolean = false
): boolean {
  const isTeacher = teacherMode || Boolean(state?.settings?.teacherMode);
  if (isTeacher) return true;
  return Boolean(state?.levels?.['5_hard']?.completed);
}

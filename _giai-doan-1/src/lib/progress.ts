/**
 * Quản lý lưu trữ tiến độ học tập, điểm XP và thiết lập người dùng qua safeStorage.
 * Tích hợp các hàm thuần từ progressLogic.ts.
 */

import { GAME_CONFIG } from '../config/gameConfig';
import { safeStorage } from './storage';
import { sound } from './sound';
import {
  LevelId,
  Stars,
  Difficulty,
  LevelProgress,
  UserSettings,
  AppProgressData,
  starsFromMistakes,
  xpForStars,
  xpDelta,
  isLessonUnlocked,
  isLevelUnlocked,
  isSummaryUnlocked,
} from './progressLogic';

export type {
  LevelId,
  Stars,
  Difficulty,
  LevelProgress,
  UserSettings,
  AppProgressData,
};

export {
  starsFromMistakes,
  xpForStars,
  xpDelta,
  isLessonUnlocked,
  isLevelUnlocked,
  isSummaryUnlocked,
};

const STORAGE_KEY = GAME_CONFIG.storageKey;
const CURRENT_VERSION = GAME_CONFIG.version;

export function getDefaultProgress(): AppProgressData {
  return {
    version: CURRENT_VERSION,
    userName: '',
    settings: {
      soundEnabled: true,
      reducedMotion: false,
      presentationFont: false,
      teacherMode: false,
    },
    totalXp: 0,
    levels: {},
    didYouKnowViewed: {},
    lessonData: {},
    firstVisitDone: false,
  };
}

/**
 * Kiểm tra xem chế độ giáo viên có được kích hoạt qua URL hay không (?giaovien=1)
 */
export function checkUrlTeacherMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('giaovien') === '1') return true;

    const hash = window.location.hash;
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
      const hashParams = new URLSearchParams(hash.slice(qIndex));
      if (hashParams.get('giaovien') === '1') return true;
    }
  } catch {
    // Bỏ qua
  }
  return false;
}

/**
 * Đọc tiến độ hiện tại từ safeStorage
 */
export function loadProgress(): AppProgressData {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppProgressData>;
      const base = getDefaultProgress();

      const progress: AppProgressData = {
        ...base,
        ...parsed,
        settings: {
          ...base.settings,
          ...(parsed.settings || {}),
        },
        levels: { ...(parsed.levels || {}) },
        didYouKnowViewed: { ...(parsed.didYouKnowViewed || {}) },
        lessonData: { ...(parsed.lessonData || {}) },
      };

      if (checkUrlTeacherMode()) {
        progress.settings.teacherMode = true;
      }

      return progress;
    }
  } catch (err) {
    console.warn('[Sổ Chung] Không thể đọc tiến độ từ localStorage:', err);
  }

  const fresh = getDefaultProgress();
  if (checkUrlTeacherMode()) {
    fresh.settings.teacherMode = true;
  }
  return fresh;
}

type Listener = (data: AppProgressData) => void;
const listeners = new Set<Listener>();

export function subscribeProgress(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function saveProgress(data: AppProgressData): void {
  try {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[Sổ Chung] Không thể lưu tiến độ vào localStorage:', err);
  }
  listeners.forEach((fn) => {
    try {
      fn(data);
    } catch (e) {
      console.error(e);
    }
  });
}

/**
 * Hoàn thành một màn chơi:
 * Expose chuẩn completeLevel(lesson, level, { stars, timeMs }) -> { xpGained, isNewBest }
 */
export function completeLevel(
  lesson: number,
  level: LevelId,
  result: { stars?: Stars; mistakes?: number; timeMs?: number }
): { starsEarned: 1 | 2 | 3; xpGained: number; isNewBest: boolean } {
  const current = loadProgress();
  const key = `${lesson}_${level}`;
  const existing = current.levels[key];

  const starsEarned: 1 | 2 | 3 =
    result.stars !== undefined
      ? (Math.max(1, Math.min(3, result.stars)) as 1 | 2 | 3)
      : starsFromMistakes(result.mistakes ?? 0);

  const prevStars = existing?.stars ?? 0;
  const isNewBest = starsEarned > prevStars;
  const gained = xpDelta(level, prevStars, Math.max(prevStars, starsEarned) as Stars);

  const bestTime =
    result.timeMs !== undefined
      ? existing?.bestTime !== undefined
        ? Math.min(existing.bestTime, result.timeMs)
        : result.timeMs
      : existing?.bestTime;

  const updated: AppProgressData = {
    ...current,
    totalXp: current.totalXp + gained,
    levels: {
      ...current.levels,
      [key]: {
        completed: true,
        stars: Math.max(prevStars, starsEarned) as Stars,
        bestTime,
      },
    },
  };

  saveProgress(updated);
  return { starsEarned, xpGained: gained, isNewBest };
}

/**
 * Đánh dấu đã xem Em có biết?
 */
export function markDidYouKnowSeen(lesson: number): void {
  const current = loadProgress();
  if (current.didYouKnowViewed[lesson]) return;

  const updated: AppProgressData = {
    ...current,
    didYouKnowViewed: {
      ...current.didYouKnowViewed,
      [lesson]: true,
    },
  };
  saveProgress(updated);
}

/**
 * Cập nhật thiết lập người dùng
 */
export function updateSettings(settings: Partial<UserSettings>): void {
  const current = loadProgress();
  const updated: AppProgressData = {
    ...current,
    settings: {
      ...current.settings,
      ...settings,
    },
  };

  if (settings.soundEnabled !== undefined) {
    sound.setEnabled(settings.soundEnabled);
  }

  saveProgress(updated);
}

/**
 * Cập nhật tên người dùng
 */
export function setName(name: string): void {
  const current = loadProgress();
  saveProgress({
    ...current,
    userName: name.trim(),
    firstVisitDone: true,
  });
}

/**
 * Lấy dữ liệu riêng của bài học
 */
export function getLessonData<T = unknown>(key: string): T | undefined {
  const current = loadProgress();
  return current.lessonData[key] as T | undefined;
}

/**
 * Lưu dữ liệu riêng của bài học
 */
export function setLessonData(key: string, data: unknown): void {
  const current = loadProgress();
  saveProgress({
    ...current,
    lessonData: {
      ...current.lessonData,
      [key]: data,
    },
  });
}

/**
 * Xóa toàn bộ tiến độ (reset về mặc định)
 */
export function resetProgress(): void {
  const fresh = getDefaultProgress();
  saveProgress(fresh);
}

/**
 * Tìm mục tiêu học kế tiếp cho người dùng
 */
export function getNextStudyTarget(progress: AppProgressData): {
  lessonId: number;
  difficulty: LevelId;
  isSummary: boolean;
} {
  const difficulties: LevelId[] = ['easy', 'medium', 'hard'];

  for (let l = 1; l <= 5; l++) {
    if (!isLessonUnlocked(progress, l)) break;

    for (const diff of difficulties) {
      if (!isLevelUnlocked(progress, l, diff)) break;
      const key = `${l}_${diff}`;
      if (!progress.levels[key]?.completed) {
        return { lessonId: l, difficulty: diff, isSummary: false };
      }
    }
  }

  return { lessonId: 5, difficulty: 'hard', isSummary: isSummaryUnlocked(progress) };
}

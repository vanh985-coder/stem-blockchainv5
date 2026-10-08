import { LEVELS, type LevelDef, type LevelStatus } from '../content/levels';
import { computeUnlock, type UnlockResult } from './unlock';
import {
  STARS_GAME,
  STARS_LESSON,
  STARS_PER_COIN_BATCH,
  emptyLevel,
  type LevelResult,
  type Progress,
  type StarKey,
  type Stars,
} from './types';

export interface ProgressOptions {
  /** Ghi đè trạng thái từng màn (test, hoặc khi một màn đổi sang 'ready') */
  statuses?: Readonly<Partial<Record<number, LevelStatus>>>;
  levels?: readonly LevelDef[];
}

const kindOf = (id: number, levels: readonly LevelDef[]) => levels.find((l) => l.id === id)?.kind;

const clampStar = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) ? Math.min(3, Math.max(0, Math.floor(n))) : 0);

/**
 * Hàm thuần: ghi kết quả một màn.
 * - played = true (chơi xong, thắng hay thua đều tính là đã chơi);
 * - bài học: completed khi đủ 3 trạm de, tb, kho đều có sao; game: completed khi kết quả báo thắng;
 * - sao lấy max từng khóa, best_score lấy max;
 * - xu: +10 cho MỖI sao mới (chỉ phần tăng so với sao cũ, chơi lại không cộng thêm);
 * - cập nhật luôn số Trang Sổ Vàng.
 * Trả về tiến độ mới và số xu vừa nhận. Màn không hợp lệ thì trả về nguyên tiến độ cũ.
 */
export function recordLevelResult(
  progress: Progress,
  levelId: number,
  result: LevelResult,
  now: number,
  opts: ProgressOptions = {},
): { progress: Progress; coinsEarned: number } {
  const levels = opts.levels ?? LEVELS;
  const kind = kindOf(levelId, levels);
  if (!kind) return { progress, coinsEarned: 0 };

  const old = progress.levels[levelId] ?? emptyLevel();
  const allowed: readonly StarKey[] = kind === 'lesson' ? STARS_LESSON : STARS_GAME;

  const stars: Stars = { ...old.stars };
  let newStars = 0;
  for (const k of allowed) {
    const incoming = clampStar(result.stars?.[k]);
    const before = stars[k] ?? 0;
    if (incoming > before) {
      newStars += incoming - before;
      stars[k] = incoming;
    }
  }

  const completed =
    kind === 'lesson'
      ? STARS_LESSON.every((k) => (stars[k] ?? 0) >= 1)
      : old.completed || result.completed === true;

  const level = {
    played: true,
    completed: old.completed || completed,
    stars,
    bestScore: Math.max(old.bestScore, Math.max(0, Math.floor(result.score ?? 0))),
    updatedAt: now,
  };

  const coinsEarned = newStars * STARS_PER_COIN_BATCH;
  const next: Progress = {
    levels: { ...progress.levels, [levelId]: level },
    game: {
      ...progress.game,
      coins: progress.game.coins + coinsEarned,
      updatedAt: coinsEarned > 0 ? now : progress.game.updatedAt,
    },
  };
  return { progress: withGoldenPages(next, now, opts), coinsEarned };
}

/** Các màn đã qua, để đưa vào computeUnlock: bài học khi đủ 3 trạm, game khi đã chơi. */
export function doneLevels(progress: Progress, opts: ProgressOptions = {}): number[] {
  const levels = opts.levels ?? LEVELS;
  return Object.entries(progress.levels)
    .filter(([id, lv]) => (kindOf(Number(id), levels) === 'lesson' ? lv.completed : lv.played))
    .map(([id]) => Number(id))
    .sort((a, b) => a - b);
}

/** Tính mở khóa từ tiến độ (kèm Trang Sổ Vàng đã lưu). */
export function unlockOf(progress: Progress, opts: ProgressOptions & { isTeacher?: boolean } = {}): UnlockResult {
  return computeUnlock({
    doneLevels: doneLevels(progress, opts),
    goldenPages: progress.game.goldenPages,
    isTeacher: opts.isTeacher,
    statuses: opts.statuses,
    levels: opts.levels,
  });
}

/**
 * Trang Sổ Vàng = max(số đã lưu, số tính được), rồi ghi lại vào tiến độ.
 * Trang đã trao thì không bao giờ bị thu lại.
 */
export function withGoldenPages(progress: Progress, now: number, opts: ProgressOptions = {}): Progress {
  const computed = unlockOf(progress, { ...opts, isTeacher: false }).goldenPages;
  if (computed <= progress.game.goldenPages) return progress;
  return { ...progress, game: { ...progress.game, goldenPages: computed, updatedAt: now } };
}

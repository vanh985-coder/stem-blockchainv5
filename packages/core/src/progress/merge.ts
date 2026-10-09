import { mergeIntroSeen } from './villageIntro';
import { emptyLevel, type GameState, type LevelProgress, type Progress, type StarKey, type Stars } from './types';

const maxStars = (a: Stars, b: Stars): Stars => {
  const out: Stars = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<StarKey>) {
    out[k] = Math.max(a[k] ?? 0, b[k] ?? 0);
  }
  return out;
};

export function mergeLevel(a: LevelProgress, b: LevelProgress): LevelProgress {
  return {
    played: a.played || b.played,
    completed: a.completed || b.completed,
    stars: maxStars(a.stars, b.stars),
    bestScore: Math.max(a.bestScore, b.bestScore),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

export function mergeGame(local: GameState, remote: GameState): GameState {
  // data: lấy nguyên bản có updatedAt mới hơn (bằng nhau thì lấy bản của server).
  // coins: lấy giá trị lớn hơn (xu chỉ tăng, chưa có chỗ tiêu). Nếu sau này có cửa hàng thì phải xem lại.
  const localNewer = local.updatedAt > remote.updatedAt;
  const winner = localNewer ? local : remote;
  return {
    goldenPages: Math.max(local.goldenPages, remote.goldenPages),
    coins: Math.max(local.coins, remote.coins),
    // Cờ "đã xem giới thiệu làng" thì hợp hai bên: xem ở máy nào cũng tính là đã xem.
    data: mergeIntroSeen(winner.data, winner === local ? remote.data : local.data),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  };
}

/**
 * Hàm thuần: gộp tiến độ trên máy (local) với tiến độ trên server (remote), spec 02 mục 4:
 * - sao từng trạm, best_score: lấy giá trị lớn hơn;
 * - played, completed: bên nào true thì true;
 * - golden_pages: lấy giá trị lớn hơn;
 * - coins: lấy giá trị lớn hơn; data: lấy bản có updated_at mới hơn.
 * Không sửa dữ liệu đầu vào.
 */
export function mergeProgress(local: Progress, remote: Progress): Progress {
  const levels: Progress['levels'] = {};
  for (const id of new Set([...Object.keys(local.levels), ...Object.keys(remote.levels)].map(Number))) {
    levels[id] = mergeLevel(local.levels[id] ?? emptyLevel(), remote.levels[id] ?? emptyLevel());
  }
  return { levels, game: mergeGame(local.game, remote.game) };
}

/** So hai bản của một màn, bỏ qua updatedAt (dùng để biết có cần đẩy lên server không). */
export function sameLevel(a: LevelProgress | undefined, b: LevelProgress | undefined): boolean {
  if (!a || !b) return a === b;
  if (a.played !== b.played || a.completed !== b.completed || a.bestScore !== b.bestScore) return false;
  const keys = new Set([...Object.keys(a.stars), ...Object.keys(b.stars)]) as Set<StarKey>;
  for (const k of keys) if ((a.stars[k] ?? 0) !== (b.stars[k] ?? 0)) return false;
  return true;
}

export function sameGame(a: GameState, b: GameState): boolean {
  return a.goldenPages === b.goldenPages && a.coins === b.coins && JSON.stringify(a.data) === JSON.stringify(b.data);
}

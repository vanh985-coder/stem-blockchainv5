/**
 * Mốc điểm và ghi kết quả của game phụ (spec 03 mục 6, spec 02 bảng level_progress). Hàm thuần, có test.
 * Game phụ có một khóa sao duy nhất "game": 0 (chưa đạt mốc), 1 Đồng, 2 Bạc, 3 Vàng.
 */
import type { LevelResult } from '../progress/types';

/** Ba mốc điểm Đồng, Bạc, Vàng (tăng dần). */
export type MedalThresholds = readonly [number, number, number];
export type Medal = 0 | 1 | 2 | 3;

/** Mốc đạt được: điểm ≥ mốc nào cao nhất thì được mốc đó; chưa tới mốc Đồng thì 0. */
export function medalOf(score: number, t: MedalThresholds): Medal {
  if (!Number.isFinite(score)) return 0;
  if (score >= t[2]) return 3;
  if (score >= t[1]) return 2;
  if (score >= t[0]) return 1;
  return 0;
}

/**
 * Tóm tắt một lần chơi cho màn kết quả: điểm làm tròn xuống, mốc đạt được, và có phải kỷ lục mới không
 * (điểm cao hơn điểm cao nhất cũ `bestBefore`; chưa chơi lần nào thì điểm > 0 là kỷ lục).
 */
export function summarizeGame(score: number, t: MedalThresholds, bestBefore: number): { score: number; medal: Medal; newBest: boolean } {
  const s = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  return { score: s, medal: medalOf(s, t), newBest: s > Math.max(0, bestBefore) };
}

/** Kết quả đưa cho lớp tiến độ: played luôn bật (do recordLevelResult), sao "game" theo mốc, điểm làm tròn xuống, `completed` khi đạt ít nhất mốc Đồng. */
export function gameResultOf(score: number, t: MedalThresholds): LevelResult {
  const s = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  const medal = medalOf(s, t);
  return { stars: { game: medal }, score: s, completed: medal >= 1 };
}

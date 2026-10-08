/**
 * Kiểu dữ liệu tiến độ, khớp bảng level_progress và game_state (spec 02 mục 3).
 * Thời điểm (updatedAt) lưu dạng mili giây từ 1970; đổi sang timestamptz ở lớp nói chuyện với Supabase.
 */

/** Khóa sao: bài học có 3 trạm de, tb, kho; game chỉ có mốc điểm "game" (0 đến 3 = chưa, đồng, bạc, vàng). */
export type StarKey = 'de' | 'tb' | 'kho' | 'game';
export type Stars = Partial<Record<StarKey, number>>;

export interface LevelProgress {
  played: boolean;
  completed: boolean;
  stars: Stars;
  bestScore: number;
  updatedAt: number;
}

export interface GameState {
  /** 0 đến 4 */
  goldenPages: number;
  coins: number;
  /** Cờ truyện, cài đặt, đồ mặc… (cột jsonb data) */
  data: Record<string, unknown>;
  updatedAt: number;
}

export interface Progress {
  /** Khóa là số màn 1 đến 12; màn chưa chơi thì không có mặt */
  levels: Record<number, LevelProgress>;
  game: GameState;
}

/** Kết quả một lần chơi xong một màn, đưa vào recordLevelResult. */
export interface LevelResult {
  /** Sao từng trạm (bài học) hoặc mốc điểm (game) lần này đạt được */
  stars?: Stars;
  /** Điểm lần này (game) */
  score?: number;
  /** Game: thắng (true) hay chưa. Bài học tự tính từ 3 trạm. */
  completed?: boolean;
}

export const STARS_PER_COIN_BATCH = 10;

export const STARS_LESSON: readonly StarKey[] = ['de', 'tb', 'kho'];
export const STARS_GAME: readonly StarKey[] = ['game'];

export function emptyLevel(): LevelProgress {
  return { played: false, completed: false, stars: {}, bestScore: 0, updatedAt: 0 };
}

export function emptyProgress(): Progress {
  return { levels: {}, game: { goldenPages: 0, coins: 0, data: {}, updatedAt: 0 } };
}

/** Có dữ liệu đáng giữ không (đã chơi màn nào, hoặc có xu, hoặc có Trang Sổ Vàng). */
export function hasProgress(p: Progress): boolean {
  return Object.keys(p.levels).length > 0 || p.game.coins > 0 || p.game.goldenPages > 0;
}

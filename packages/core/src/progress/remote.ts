import { getSupabase } from '../auth/client';
import type { RemoteApi } from './manager';
import { emptyLevel, emptyProgress, type GameState, type LevelProgress, type Progress, type Stars } from './types';

// ---- Đổi qua lại giữa dạng trong app và dạng của bảng (spec 02 mục 3). Hàm thuần, có test. ----

export interface LevelRow {
  level_id: number;
  played: boolean;
  completed: boolean;
  stars: Stars;
  best_score: number;
  updated_at: string;
}

export interface GameRow {
  golden_pages: number;
  coins: number;
  data: Record<string, unknown>;
  updated_at: string;
}

const toMs = (iso: unknown): number => {
  const t = typeof iso === 'string' ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : 0;
};

export function levelFromRow(row: LevelRow): LevelProgress {
  return {
    ...emptyLevel(),
    played: !!row.played,
    completed: !!row.completed,
    stars: row.stars && typeof row.stars === 'object' ? row.stars : {},
    bestScore: Number(row.best_score) || 0,
    updatedAt: toMs(row.updated_at),
  };
}

export function levelToRow(userId: string, levelId: number, lv: LevelProgress) {
  return {
    user_id: userId,
    level_id: levelId,
    played: lv.played,
    completed: lv.completed,
    stars: lv.stars,
    best_score: lv.bestScore,
    updated_at: new Date(lv.updatedAt || Date.now()).toISOString(),
  };
}

export function gameFromRow(row: GameRow | null | undefined): GameState {
  if (!row) return emptyProgress().game;
  return {
    goldenPages: Number(row.golden_pages) || 0,
    coins: Number(row.coins) || 0,
    data: row.data && typeof row.data === 'object' ? row.data : {},
    updatedAt: toMs(row.updated_at),
  };
}

export function gameToRow(userId: string, g: GameState) {
  return {
    user_id: userId,
    golden_pages: Math.min(4, Math.max(0, Math.floor(g.goldenPages))),
    coins: Math.max(0, Math.floor(g.coins)),
    data: g.data,
    updated_at: new Date(g.updatedAt || Date.now()).toISOString(),
  };
}

export function progressFromRows(levels: LevelRow[], game: GameRow | null | undefined): Progress {
  const p = emptyProgress();
  for (const row of levels) p.levels[row.level_id] = levelFromRow(row);
  p.game = gameFromRow(game);
  return p;
}

// ---- Bản thật nói chuyện với Supabase (thư viện nạp lười, nằm ở chunk riêng) ----

async function client() {
  const sb = await getSupabase();
  if (!sb) throw new Error('supabase-not-configured');
  return sb;
}

export const supabaseRemote: RemoteApi = {
  async fetchProgress(userId) {
    const sb = await client();
    const [lv, gs] = await Promise.all([
      sb.from('level_progress').select('level_id, played, completed, stars, best_score, updated_at').eq('user_id', userId),
      sb.from('game_state').select('golden_pages, coins, data, updated_at').eq('user_id', userId).maybeSingle(),
    ]);
    if (lv.error) throw lv.error;
    if (gs.error) throw gs.error;
    return progressFromRows((lv.data ?? []) as LevelRow[], gs.data as GameRow | null);
  },

  async upsertLevels(userId, rows) {
    const sb = await client();
    const { error } = await sb
      .from('level_progress')
      .upsert(rows.map((r) => levelToRow(userId, r.levelId, r.progress)), { onConflict: 'user_id,level_id' });
    if (error) throw error;
  },

  async upsertGame(userId, game) {
    const sb = await client();
    const { error } = await sb.from('game_state').upsert(gameToRow(userId, game), { onConflict: 'user_id' });
    if (error) throw error;
  },

  async insertQuizAnswer(userId, levelId, questionId, correct) {
    const sb = await client();
    const { error } = await sb
      .from('quiz_answers')
      .insert({ user_id: userId, level_id: levelId, question_id: questionId, correct });
    if (error) throw error;
  },
};

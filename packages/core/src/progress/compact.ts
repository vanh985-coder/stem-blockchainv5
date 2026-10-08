import { LEVELS, type LevelDef } from '../content/levels';
import { emptyProgress, type Progress } from './types';

/**
 * Dạng gọn để ghi vào cookie (sc_guest, sc_pending): {"v":1,"lv":{"1":[1,1,3,2,1]},"gp":1,"c":40,"u":1730000000000}
 * - bài học (màn 1, 4, 7, 10): [đã chơi, xong, sao de, sao tb, sao kho]
 * - game: [đã chơi, xong, mốc điểm, điểm cao nhất]
 * - gp: Trang Sổ Vàng; c: xu; u: lúc cập nhật cuối (mili giây), dùng khi gộp coins.
 * Cả 12 màn vẫn dưới 1 KB (cookie giới hạn 4 KB).
 */
export const COMPACT_VERSION = 1;

interface CompactShape {
  v: number;
  lv: Record<string, number[]>;
  gp: number;
  c: number;
  u: number;
  o?: string;
}

const b = (v: boolean) => (v ? 1 : 0);
const int = (v: unknown, max = Number.MAX_SAFE_INTEGER): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0;

function toShape(p: Progress, levels: readonly LevelDef[]): CompactShape {
  const lv: Record<string, number[]> = {};
  let u = p.game.updatedAt;
  for (const [idStr, l] of Object.entries(p.levels)) {
    const def = levels.find((d) => d.id === Number(idStr));
    if (!def) continue;
    lv[idStr] =
      def.kind === 'lesson'
        ? [b(l.played), b(l.completed), l.stars.de ?? 0, l.stars.tb ?? 0, l.stars.kho ?? 0]
        : [b(l.played), b(l.completed), l.stars.game ?? 0, l.bestScore];
    u = Math.max(u, l.updatedAt);
  }
  return { v: COMPACT_VERSION, lv, gp: p.game.goldenPages, c: p.game.coins, u };
}

function fromShape(s: CompactShape, levels: readonly LevelDef[]): Progress {
  const p = emptyProgress();
  const u = int(s.u);
  for (const [idStr, arr] of Object.entries(s.lv)) {
    const id = Number(idStr);
    const def = levels.find((d) => d.id === id);
    if (!def || !Array.isArray(arr)) continue;
    const played = arr[0] === 1;
    const completed = arr[1] === 1;
    p.levels[id] =
      def.kind === 'lesson'
        ? { played, completed, stars: { de: int(arr[2], 3), tb: int(arr[3], 3), kho: int(arr[4], 3) }, bestScore: 0, updatedAt: u }
        : { played, completed, stars: { game: int(arr[2], 3) }, bestScore: int(arr[3]), updatedAt: u };
  }
  p.game = { goldenPages: int(s.gp, 4), coins: int(s.c), data: {}, updatedAt: u };
  return p;
}

/** Tiến độ thành chuỗi gọn (JSON). */
export function encodeProgress(p: Progress, levels: readonly LevelDef[] = LEVELS): string {
  return JSON.stringify(toShape(p, levels));
}

/** Chuỗi gọn thành tiến độ. Chuỗi hỏng hoặc sai phiên bản thì trả tiến độ rỗng, không lỗi. */
export function decodeProgress(raw: string | null | undefined, levels: readonly LevelDef[] = LEVELS): Progress {
  const parsed = parseShape(raw);
  return parsed ? fromShape(parsed, levels) : emptyProgress();
}

function parseShape(raw: string | null | undefined): CompactShape | null {
  if (!raw) return null;
  try {
    const s: unknown = JSON.parse(raw);
    if (!s || typeof s !== 'object') return null;
    const o = s as Partial<CompactShape>;
    if (o.v !== COMPACT_VERSION || !o.lv || typeof o.lv !== 'object' || Array.isArray(o.lv)) return null;
    return { v: o.v, lv: o.lv, gp: int(o.gp), c: int(o.c), u: int(o.u), o: typeof o.o === 'string' ? o.o : undefined };
  } catch {
    return null;
  }
}

/** Bản tóm tắt chờ đẩy (cookie sc_pending): giống dạng gọn, thêm "o" = userId của chủ. */
export function encodePending(p: Progress, owner: string, levels: readonly LevelDef[] = LEVELS): string {
  return JSON.stringify({ ...toShape(p, levels), o: owner });
}

/** Đọc sc_pending: trả chủ và tiến độ; hỏng thì null. */
export function decodePending(raw: string | null | undefined, levels: readonly LevelDef[] = LEVELS): { owner: string; progress: Progress } | null {
  const s = parseShape(raw);
  if (!s || !s.o) return null;
  return { owner: s.o, progress: fromShape(s, levels) };
}

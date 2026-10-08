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

/** Một phần chờ đẩy trong sc_pending: tiến độ tóm tắt của một người, và lúc ghi (để bỏ bản cũ nhất khi cookie quá lớn). */
export interface PendingEntry {
  progress: Progress;
  /** Lúc ghi, mili giây */
  t: number;
}

/** Cookie sc_pending không được vượt 3 KB (sau khi mã hóa %): vượt thì bỏ bản cũ nhất. */
export const PENDING_MAX_BYTES = 3072;

/**
 * sc_pending dạng map { "<userId>": bản tóm tắt gọn + "t" }. Nhiều học sinh dùng chung máy không ghi đè lên nhau.
 * Mục hỏng bị bỏ qua; cả chuỗi hỏng thì trả map rỗng.
 */
export function decodePendingMap(raw: string | null | undefined, levels: readonly LevelDef[] = LEVELS): Record<string, PendingEntry> {
  const out: Record<string, PendingEntry> = {};
  if (!raw) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return out;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return out;
  for (const [owner, value] of Object.entries(parsed as Record<string, unknown>)) {
    const shape = parseShape(JSON.stringify(value));
    if (!shape) continue;
    const t = (value as { t?: unknown }).t;
    out[owner] = { progress: fromShape(shape, levels), t: int(t) };
  }
  return out;
}

/** Map thành chuỗi. Quá 3 KB thì bỏ lần lượt bản cũ nhất (không bỏ bản mới nhất). */
export function encodePendingMap(
  entries: Record<string, PendingEntry>,
  levels: readonly LevelDef[] = LEVELS,
  maxBytes: number = PENDING_MAX_BYTES,
): string {
  const owners = Object.keys(entries).sort((a, b) => entries[a].t - entries[b].t); // cũ nhất trước
  const build = (list: string[]) =>
    JSON.stringify(Object.fromEntries(list.map((o) => [o, { ...toShape(entries[o].progress, levels), t: entries[o].t }])));
  let list = owners;
  while (list.length > 1 && encodeURIComponent(build(list)).length > maxBytes) list = list.slice(1);
  return build(list);
}

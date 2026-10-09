import { LEVELS, VILLAGE_ORDER, type LevelDef } from '../content/levels';
import { teacherTexts } from '../content/teacher';
import { STARS_LESSON, type Stars } from '../progress/types';
import type { VillageId } from '../village';

/**
 * Các hàm thuần cho tab Tiến độ của trang giáo viên (spec 09 mục 1).
 * Dữ liệu vào là kết quả hàm Postgres class_progress(cid): mỗi dòng là một học sinh với MỘT màn
 * (học sinh chưa chơi màn nào vẫn có một dòng với level_id = null).
 */

const T = teacherTexts;

export interface ClassProgressRow {
  student_id: string;
  display_name: string;
  level_id: number | null;
  played: boolean | null;
  completed: boolean | null;
  stars: Record<string, unknown> | null;
  best_score: number | null;
  /** timestamptz dạng chuỗi ISO */
  updated_at: string | null;
  golden_pages: number | null;
}

export interface StudentLevel {
  levelId: number;
  played: boolean;
  completed: boolean;
  stars: Stars;
  bestScore: number;
  /** mili giây từ 1970; 0 nếu không rõ */
  updatedAt: number;
}

export interface StudentRow {
  id: string;
  name: string;
  /** Khóa là số màn 1 đến 12; màn chưa chơi thì không có mặt */
  levels: Record<number, StudentLevel>;
  goldenPages: number;
  /** Tổng sao của các bài học (không tính mốc của game) */
  totalStars: number;
  /** Lần chơi gần nhất (mili giây), null nếu chưa chơi màn nào */
  lastPlayed: number | null;
}

/** Số nguyên trong [lo, hi]; không phải số thì 0. */
function clampInt(v: unknown, lo: number, hi: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(hi, Math.max(lo, Math.trunc(n)));
}

function cleanStars(raw: Record<string, unknown> | null): Stars {
  const out: Stars = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of ['de', 'tb', 'kho', 'game'] as const) {
    if (key in raw) out[key] = clampInt(raw[key], 0, 3);
  }
  return out;
}

/** So tên tiếng Việt, không phân biệt hoa thường. */
const collator = new Intl.Collator('vi', { sensitivity: 'base' });

function totalLessonStars(s: StudentRow): number {
  let sum = 0;
  for (const def of LEVELS) {
    if (def.kind !== 'lesson') continue;
    const lv = s.levels[def.id];
    if (!lv) continue;
    for (const k of STARS_LESSON) sum += lv.stars[k] ?? 0;
  }
  return sum;
}

/**
 * Gom các dòng của class_progress thành mỗi học sinh một hàng, xếp theo tên.
 * Không sửa mảng đầu vào. Dòng thiếu student_id bị bỏ qua.
 */
export function buildProgressTable(rows: readonly ClassProgressRow[]): StudentRow[] {
  const byId = new Map<string, StudentRow>();
  for (const r of rows) {
    if (!r.student_id) continue;
    let s = byId.get(r.student_id);
    if (!s) {
      s = { id: r.student_id, name: r.display_name ?? '', levels: {}, goldenPages: 0, totalStars: 0, lastPlayed: null };
      byId.set(r.student_id, s);
    }
    s.goldenPages = Math.max(s.goldenPages, clampInt(r.golden_pages, 0, 4));
    if (r.level_id === null || r.level_id === undefined) continue;
    const levelId = clampInt(r.level_id, 0, 12);
    if (levelId < 1) continue;
    const updatedAt = r.updated_at ? Date.parse(r.updated_at) : 0;
    const level: StudentLevel = {
      levelId,
      played: Boolean(r.played),
      completed: Boolean(r.completed),
      stars: cleanStars(r.stars),
      bestScore: clampInt(r.best_score, 0, Number.MAX_SAFE_INTEGER),
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    };
    s.levels[levelId] = level;
    if (level.played || level.completed) {
      s.lastPlayed = Math.max(s.lastPlayed ?? 0, level.updatedAt);
    }
  }
  const students = [...byId.values()];
  for (const s of students) s.totalStars = totalLessonStars(s);
  return students.sort((a, b) => collator.compare(a.name, b.name) || (a.id < b.id ? -1 : 1));
}

/** Nội dung một ô của bảng tiến độ. */
export type CellView =
  | { kind: 'empty' }
  /** Sao của trạm Dễ, Trung bình, Khó (0 đến 3) */
  | { kind: 'lesson'; stars: [number, number, number] }
  /** medal: 0 chưa có mốc, 1 đồng, 2 bạc, 3 vàng */
  | { kind: 'game'; medal: number };

export function levelCell(def: LevelDef, lv: StudentLevel | undefined): CellView {
  if (!lv) return { kind: 'empty' };
  if (def.kind === 'lesson') {
    const [de, tb, kho] = STARS_LESSON.map((k) => lv.stars[k] ?? 0);
    const started = lv.played || lv.completed || de + tb + kho > 0;
    return started ? { kind: 'lesson', stars: [de, tb, kho] } : { kind: 'empty' };
  }
  const medal = lv.stars.game ?? 0;
  return lv.played || lv.completed || medal > 0 ? { kind: 'game', medal } : { kind: 'empty' };
}

/** Chữ trong ô, dùng cho cả bảng và file CSV. Ô trống thì trả chuỗi rỗng. */
export function cellText(cell: CellView): string {
  if (cell.kind === 'empty') return '';
  if (cell.kind === 'lesson') return cell.stars.map((n) => T.o.sao.replace('{so}', String(n))).join(' ');
  const moc = T.o.moc[cell.medal] ?? '';
  return moc ? T.o.gameMoc.replace('{moc}', moc) : T.o.game;
}

/** Bài học xong khi `completed`; game xong khi đã chơi (thắng hay thua đều tính, như spec 03 mục 6). */
function levelDone(def: LevelDef, lv: StudentLevel | undefined): boolean {
  if (!lv) return false;
  return def.kind === 'lesson' ? lv.completed : lv.played || lv.completed;
}

/**
 * Học sinh đã xong làng chưa? Mọi màn 'ready' của làng đều xong. Màn 'coming-soon' không tính
 * (giống cách mở khóa ở spec 03 mục 6). Làng chưa có màn nào 'ready' thì coi là xong.
 */
export function isVillageDone(s: StudentRow, village: VillageId, levels: readonly LevelDef[] = LEVELS): boolean {
  return levels.filter((l) => l.lang === village && l.status === 'ready').every((l) => levelDone(l, s.levels[l.id]));
}

/** Bỏ dấu, hạ chữ thường, để tìm "an" ra "An" và "Ân". */
export function normalizeName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
    .toLowerCase()
    .trim();
}

export interface ProgressFilter {
  /** Tìm theo tên, không phân biệt hoa thường và dấu */
  query?: string;
  /** Chỉ giữ học sinh CHƯA xong làng này */
  notDoneVillage?: VillageId | null;
}

/** Lọc danh sách học sinh theo tên và theo làng chưa xong. Không sửa mảng đầu vào, giữ nguyên thứ tự. */
export function filterStudents(students: readonly StudentRow[], filter: ProgressFilter, levels: readonly LevelDef[] = LEVELS): StudentRow[] {
  const q = normalizeName(filter.query ?? '');
  return students.filter((s) => {
    if (q && !normalizeName(s.name).includes(q)) return false;
    if (filter.notDoneVillage && isVillageDone(s, filter.notDoneVillage, levels)) return false;
    return true;
  });
}

/** 4 làng theo thứ tự, dùng cho ô lọc. */
export const VILLAGES_FOR_FILTER: readonly VillageId[] = VILLAGE_ORDER;

/** Chữ "dd/mm/yyyy hh:mm" theo giờ máy; rỗng nếu chưa chơi. */
export function formatDateTime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms <= 0) return '';
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Tiêu đề các cột của bảng tiến độ / file CSV (tên, màn 1 đến 12, Trang Sổ Vàng, tổng sao, lần chơi gần nhất). */
export function progressHeaders(levels: readonly LevelDef[] = LEVELS): string[] {
  return [
    T.tienDo.cotTen,
    ...levels.map((l) => T.tienDo.cotMan.replace('{so}', String(l.id))),
    T.tienDo.cotSoVang,
    T.tienDo.cotTongSao,
    T.tienDo.cotLanCuoi,
  ];
}

/** Một hàng chữ cho bảng/CSV, cùng thứ tự với progressHeaders. */
export function progressRowText(s: StudentRow, levels: readonly LevelDef[] = LEVELS): string[] {
  return [
    s.name,
    ...levels.map((l) => cellText(levelCell(l, s.levels[l.id]))),
    String(s.goldenPages),
    String(s.totalStars),
    formatDateTime(s.lastPlayed),
  ];
}

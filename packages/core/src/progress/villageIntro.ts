import { LEVELS, VILLAGE_ORDER, type LevelDef, type LevelKind } from '../content/levels';
import type { VillageId } from '../village';
import type { LevelState, LevelUnlock } from './unlock';

/**
 * Cờ "đã xem giới thiệu làng" nằm trong game_state.data (jsonb): { villageIntroSeen: { "lang-giay": true, ... } }.
 * Chơi thử: cờ đi theo cookie sc_guest dưới dạng số bit (trường "vi" của dạng gọn, mỗi làng một bit theo VILLAGE_ORDER).
 * Toàn hàm thuần, không sửa dữ liệu đầu vào.
 */
export const INTRO_SEEN_KEY = 'villageIntroSeen';

export type IntroSeen = Partial<Record<VillageId, true>>;

/** Đọc cờ từ data; mọi thứ không hợp lệ (không phải object, làng lạ) bị bỏ qua. */
export function introSeenOf(data: Record<string, unknown> | undefined): IntroSeen {
  const raw = data?.[INTRO_SEEN_KEY];
  const out: IntroSeen = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const id of VILLAGE_ORDER) {
    if ((raw as Record<string, unknown>)[id] === true) out[id] = true;
  }
  return out;
}

export function hasSeenIntro(data: Record<string, unknown> | undefined, village: VillageId): boolean {
  return introSeenOf(data)[village] === true;
}

/** Có hiện giới thiệu khi học sinh bấm vào làng không: lần đầu thì có, đã xem thì không. */
export function shouldShowIntro(data: Record<string, unknown> | undefined, village: VillageId): boolean {
  return !hasSeenIntro(data, village);
}

/** Data mới đã đánh dấu làng này là đã xem (giữ nguyên các khóa khác). */
export function withIntroSeen(data: Record<string, unknown> | undefined, village: VillageId): Record<string, unknown> {
  return { ...(data ?? {}), [INTRO_SEEN_KEY]: { ...introSeenOf(data), [village]: true } };
}

/** Hợp hai bản cờ: làng nào một trong hai bên đã xem thì coi là đã xem. Không có cờ nào thì giữ nguyên `base`. */
export function mergeIntroSeen(base: Record<string, unknown>, other: Record<string, unknown>): Record<string, unknown> {
  const merged: IntroSeen = { ...introSeenOf(other), ...introSeenOf(base) };
  if (Object.keys(merged).length === 0) return base;
  return { ...base, [INTRO_SEEN_KEY]: merged };
}

/** Cờ thành số bit (bit i ứng với làng thứ i trong VILLAGE_ORDER), dùng trong cookie. */
export function introMask(data: Record<string, unknown> | undefined): number {
  const seen = introSeenOf(data);
  return VILLAGE_ORDER.reduce((mask, id, i) => (seen[id] ? mask | (1 << i) : mask), 0);
}

/** Số bit thành data (trả {} nếu không có làng nào). */
export function introDataFromMask(mask: unknown): Record<string, unknown> {
  const m = typeof mask === 'number' && Number.isFinite(mask) ? Math.floor(mask) : 0;
  const seen: IntroSeen = {};
  VILLAGE_ORDER.forEach((id, i) => {
    if (m & (1 << i)) seen[id] = true;
  });
  return Object.keys(seen).length === 0 ? {} : { [INTRO_SEEN_KEY]: seen };
}

// ---------------------------------------------------------------------------
// Cảnh mở đầu lần đầu vào làng 3D (mốc 2, bước 9): cờ riêng, cùng cách lưu với cờ giới thiệu làng ở bản đồ.

/**
 * Cờ "đã xem cảnh mở đầu của làng" nằm trong game_state.data: { villageSceneSeen: { "lang-giay": true } }; chơi thử: trường "vs" của cookie sc_guest (một bit mỗi làng).
 */
export const SCENE_SEEN_KEY = 'villageSceneSeen';

function seenOf(data: Record<string, unknown> | undefined, key: string): IntroSeen {
  const raw = data?.[key];
  const out: IntroSeen = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const id of VILLAGE_ORDER) if ((raw as Record<string, unknown>)[id] === true) out[id] = true;
  return out;
}
export const sceneSeenOf = (data: Record<string, unknown> | undefined): IntroSeen => seenOf(data, SCENE_SEEN_KEY);
export const hasSeenScene = (data: Record<string, unknown> | undefined, village: VillageId): boolean => sceneSeenOf(data)[village] === true;
/** Có chiếu cảnh mở đầu khi vào làng không: lần đầu thì có, đã xem thì không. */
export const shouldShowScene = (data: Record<string, unknown> | undefined, village: VillageId): boolean => !hasSeenScene(data, village);
export function withSceneSeen(data: Record<string, unknown> | undefined, village: VillageId): Record<string, unknown> {
  return { ...(data ?? {}), [SCENE_SEEN_KEY]: { ...sceneSeenOf(data), [village]: true } };
}
/** Hợp hai bản cờ cảnh mở đầu (một bên đã xem thì coi là đã xem). */
export function mergeSceneSeen(base: Record<string, unknown>, other: Record<string, unknown>): Record<string, unknown> {
  const merged: IntroSeen = { ...sceneSeenOf(other), ...sceneSeenOf(base) };
  if (Object.keys(merged).length === 0) return base;
  return { ...base, [SCENE_SEEN_KEY]: merged };
}
export function sceneMask(data: Record<string, unknown> | undefined): number {
  const seen = sceneSeenOf(data);
  return VILLAGE_ORDER.reduce((mask, id, i) => (seen[id] ? mask | (1 << i) : mask), 0);
}
export function sceneDataFromMask(mask: unknown): Record<string, unknown> {
  const m = typeof mask === 'number' && Number.isFinite(mask) ? Math.floor(mask) : 0;
  const seen: IntroSeen = {};
  VILLAGE_ORDER.forEach((id, i) => {
    if (m & (1 << i)) seen[id] = true;
  });
  return Object.keys(seen).length === 0 ? {} : { [SCENE_SEEN_KEY]: seen };
}

/** Một nhiệm vụ (màn) trong danh sách của lượt cuối giới thiệu làng. `ten` chưa qua fmt() (có {phanDien}). */
export interface IntroTask {
  id: number;
  ten: string;
  kind: LevelKind;
  state: LevelState;
}

/** Ghép danh sách 3 màn của làng (từ levels.ts) với trạng thái khóa/mở/xong/sắp ra mắt hiện tại. Thiếu thông tin thì coi là khóa. */
export function introTasks(village: VillageId, unlockLevels: readonly LevelUnlock[], levels: readonly LevelDef[] = LEVELS): IntroTask[] {
  return levels
    .filter((l) => l.lang === village)
    .map((l) => ({ id: l.id, ten: l.ten, kind: l.kind, state: unlockLevels.find((u) => u.id === l.id)?.state ?? 'locked' }));
}

/** Trang Sổ Vàng làng này trao: thứ tự làng tính từ 1. */
export function goldenPageNumber(village: VillageId): number {
  return VILLAGE_ORDER.indexOf(village) + 1;
}

// ---------------------------------------------------------------------------
// Cảnh trao Trang Sổ Vàng và hiệu ứng mở cổng làng kế tiếp (mốc 2, bước 15a): hai cờ riêng theo làng, cùng cách lưu với cờ giới thiệu và cờ cảnh mở đầu.

/** Cờ "đã chiếu cảnh người dẫn trao Trang Sổ Vàng của làng này" (game_state.data.goldenSeen; chơi thử: trường "gs" của cookie, một bit mỗi làng). */
export const GOLDEN_SEEN_KEY = 'goldenSeen';
/** Cờ "đã chiếu hiệu ứng mở cổng làng kế tiếp sau Trang Sổ Vàng của làng này" (game_state.data.gateOpenSeen; cookie: trường "go"). */
export const GATE_SEEN_KEY = 'gateOpenSeen';

function withSeen(data: Record<string, unknown> | undefined, key: string, village: VillageId): Record<string, unknown> {
  return { ...(data ?? {}), [key]: { ...seenOf(data, key), [village]: true } };
}
function mergeSeen(base: Record<string, unknown>, other: Record<string, unknown>, key: string): Record<string, unknown> {
  const merged: IntroSeen = { ...seenOf(other, key), ...seenOf(base, key) };
  if (Object.keys(merged).length === 0) return base;
  return { ...base, [key]: merged };
}
function maskOf(data: Record<string, unknown> | undefined, key: string): number {
  const seen = seenOf(data, key);
  return VILLAGE_ORDER.reduce((mask, id, i) => (seen[id] ? mask | (1 << i) : mask), 0);
}
function dataFromMask(mask: unknown, key: string): Record<string, unknown> {
  const m = typeof mask === 'number' && Number.isFinite(mask) ? Math.floor(mask) : 0;
  const seen: IntroSeen = {};
  VILLAGE_ORDER.forEach((id, i) => {
    if (m & (1 << i)) seen[id] = true;
  });
  return Object.keys(seen).length === 0 ? {} : { [key]: seen };
}

export const goldenSeenOf = (data: Record<string, unknown> | undefined): IntroSeen => seenOf(data, GOLDEN_SEEN_KEY);
export const hasSeenGolden = (data: Record<string, unknown> | undefined, village: VillageId): boolean => goldenSeenOf(data)[village] === true;
export const withGoldenSeen = (data: Record<string, unknown> | undefined, village: VillageId): Record<string, unknown> => withSeen(data, GOLDEN_SEEN_KEY, village);
export const mergeGoldenSeen = (base: Record<string, unknown>, other: Record<string, unknown>): Record<string, unknown> => mergeSeen(base, other, GOLDEN_SEEN_KEY);
export const goldenMask = (data: Record<string, unknown> | undefined): number => maskOf(data, GOLDEN_SEEN_KEY);
export const goldenDataFromMask = (mask: unknown): Record<string, unknown> => dataFromMask(mask, GOLDEN_SEEN_KEY);

export const gateSeenOf = (data: Record<string, unknown> | undefined): IntroSeen => seenOf(data, GATE_SEEN_KEY);
export const hasSeenGateOpen = (data: Record<string, unknown> | undefined, village: VillageId): boolean => gateSeenOf(data)[village] === true;
export const withGateOpenSeen = (data: Record<string, unknown> | undefined, village: VillageId): Record<string, unknown> => withSeen(data, GATE_SEEN_KEY, village);
export const mergeGateSeen = (base: Record<string, unknown>, other: Record<string, unknown>): Record<string, unknown> => mergeSeen(base, other, GATE_SEEN_KEY);
export const gateMask = (data: Record<string, unknown> | undefined): number => maskOf(data, GATE_SEEN_KEY);
export const gateDataFromMask = (mask: unknown): Record<string, unknown> => dataFromMask(mask, GATE_SEEN_KEY);

// ---------------------------------------------------------------------------
// Thẻ "Em có biết?" tự hiện lần đầu vào làng (mốc 2, bước 16): cờ riêng theo làng (game_state.data.knowSeen; cookie: trường "ks").

/** Cờ "đã tự hiện các thẻ 'Em có biết?' của làng này khi vào làng lần đầu". Xem lại bất cứ lúc nào ở menu làng. */
export const KNOW_SEEN_KEY = 'knowSeen';
export const knowSeenOf = (data: Record<string, unknown> | undefined): IntroSeen => seenOf(data, KNOW_SEEN_KEY);
export const hasSeenKnow = (data: Record<string, unknown> | undefined, village: VillageId): boolean => knowSeenOf(data)[village] === true;
export const withKnowSeen = (data: Record<string, unknown> | undefined, village: VillageId): Record<string, unknown> => withSeen(data, KNOW_SEEN_KEY, village);
export const mergeKnowSeen = (base: Record<string, unknown>, other: Record<string, unknown>): Record<string, unknown> => mergeSeen(base, other, KNOW_SEEN_KEY);
export const knowMask = (data: Record<string, unknown> | undefined): number => maskOf(data, KNOW_SEEN_KEY);
export const knowDataFromMask = (mask: unknown): Record<string, unknown> => dataFromMask(mask, KNOW_SEEN_KEY);

/** Có tự hiện thẻ "Em có biết?" khi vào làng không: lần đầu thì có (sau cảnh mở đầu), đã hiện rồi thì không. */
export const shouldShowKnow = (data: Record<string, unknown> | undefined, village: VillageId): boolean => !hasSeenKnow(data, village);

/**
 * Có chiếu cảnh người dẫn trao Trang Sổ Vàng khi em vào làng này không: đã có Trang Sổ Vàng của làng (`goldenPages` ≥ số trang của làng) và chưa chiếu lần nào. Chiếu một lần, lưu theo tiến độ.
 * Mọi trường hợp nhận trang theo bảng mở khóa (chơi xong màn ready cuối của làng, hoặc làng chỉ còn bài học ready) đều làm `goldenPages` tăng nên đều qua hàm này.
 */
export function shouldShowGolden(data: Record<string, unknown> | undefined, village: VillageId, goldenPages: number): boolean {
  return goldenPages >= goldenPageNumber(village) && !hasSeenGolden(data, village);
}

/**
 * Hiệu ứng mở cổng chờ chiếu khi về chợ: có k Trang Sổ Vàng (1 đến 3) thì cổng của làng thứ k + 1 mới mở; chiếu một lần (cờ theo làng vừa trao trang). Trả về làng đã trao trang
 * (cờ cần ghi), hoặc null nếu không có gì để chiếu (chưa có trang, đã chiếu, hoặc đủ 4 trang: lúc đó mở hội, không còn cổng nào mới).
 */
export function pendingGateOpening(data: Record<string, unknown> | undefined, goldenPages: number): VillageId | null {
  const k = Math.floor(goldenPages);
  if (!(k >= 1) || k >= VILLAGE_ORDER.length) return null;
  const giver = VILLAGE_ORDER[k - 1];
  return hasSeenGateOpen(data, giver) ? null : giver;
}

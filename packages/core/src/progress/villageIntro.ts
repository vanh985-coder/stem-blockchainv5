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

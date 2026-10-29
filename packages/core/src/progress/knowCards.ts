import { VILLAGE_ORDER, levelsOfVillage } from '../content/levels';
import type { VillageId } from '../village';

/**
 * Thẻ "Em có biết?" nhặt trong làng (mốc 2, bước X3): mỗi làng có n thẻ (thẻ của bài học làng đó, thường 4); mỗi thẻ là một bit. Cờ nằm trong game_state.data (jsonb):
 * `{ knowCards: { "lang-giay": 5 } }` (5 = thẻ 1 và thẻ 3 đã nhặt); chơi thử: trường "kc" của cookie sc_guest, một số mỗi làng theo thứ tự VILLAGE_ORDER.
 * Toàn hàm thuần, không sửa dữ liệu đầu vào. Dùng chung cho cả 4 làng (mốc 3 chỉ việc đặt thẻ vào 3 làng còn lại).
 */
export const KNOW_CARDS_KEY = 'knowCards';
/** Nhiều nhất bấy nhiêu thẻ mỗi làng (một số nguyên 31 bit). */
export const MAX_KNOW_CARDS = 16;

export type KnowCardMasks = Partial<Record<VillageId, number>>;

const sane = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(2 ** MAX_KNOW_CARDS - 1, Math.max(0, Math.floor(v))) : 0);

/** Đọc cờ từ data; mọi thứ không hợp lệ (không phải object, làng lạ, số xấu) bị bỏ qua. */
export function knowCardMasksOf(data: Record<string, unknown> | undefined): KnowCardMasks {
  const raw = data?.[KNOW_CARDS_KEY];
  const out: KnowCardMasks = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const id of VILLAGE_ORDER) {
    const m = sane((raw as Record<string, unknown>)[id]);
    if (m > 0) out[id] = m;
  }
  return out;
}

/** Mặt nạ bit các thẻ đã nhặt của một làng (chỉ phần cờ đã lưu, chưa tính "coi như đủ"). */
export const knowCardMaskOf = (data: Record<string, unknown> | undefined, village: VillageId): number => knowCardMasksOf(data)[village] ?? 0;

/** Mặt nạ đủ `total` thẻ. */
export const fullKnowMask = (total: number): number => (total <= 0 ? 0 : 2 ** Math.min(MAX_KNOW_CARDS, Math.floor(total)) - 1);

/** Số bit bật trong `mask`, chỉ tính `total` bit thấp. */
export function countKnowCards(mask: number, total: number): number {
  let n = 0;
  for (let i = 0; i < Math.min(MAX_KNOW_CARDS, total); i++) if (mask & (1 << i)) n++;
  return n;
}

export const hasKnowCard = (mask: number, index: number): boolean => index >= 0 && index < MAX_KNOW_CARDS && (mask & (1 << index)) !== 0;

/** Data mới đã nhặt thẻ `index` (từ 0) của làng (giữ nguyên các khóa khác). Chỉ số ngoài khoảng thì giữ nguyên data. */
export function withKnowCard(data: Record<string, unknown> | undefined, village: VillageId, index: number): Record<string, unknown> {
  if (!(index >= 0 && index < MAX_KNOW_CARDS) || !Number.isInteger(index)) return data ?? {};
  const masks = knowCardMasksOf(data);
  return { ...(data ?? {}), [KNOW_CARDS_KEY]: { ...masks, [village]: (masks[village] ?? 0) | (1 << index) } };
}

/** Data mới đã nhặt đủ `total` thẻ của làng (đọc ở khung giới thiệu làng trên /ban-do, hoặc đã xong màn 1). */
export function withAllKnowCards(data: Record<string, unknown> | undefined, village: VillageId, total: number): Record<string, unknown> {
  const masks = knowCardMasksOf(data);
  return { ...(data ?? {}), [KNOW_CARDS_KEY]: { ...masks, [village]: (masks[village] ?? 0) | fullKnowMask(total) } };
}

/** Hợp hai bản cờ (OR từng bit): nhặt ở máy nào cũng tính là đã nhặt. Không bên nào có cờ thì giữ nguyên `base`. */
export function mergeKnowCards(base: Record<string, unknown>, other: Record<string, unknown>): Record<string, unknown> {
  const a = knowCardMasksOf(base);
  const b = knowCardMasksOf(other);
  const merged: KnowCardMasks = {};
  for (const id of VILLAGE_ORDER) {
    const m = (a[id] ?? 0) | (b[id] ?? 0);
    if (m > 0) merged[id] = m;
  }
  if (Object.keys(merged).length === 0) return base;
  return { ...base, [KNOW_CARDS_KEY]: merged };
}

/** Các mặt nạ thành mảng số (một số mỗi làng theo VILLAGE_ORDER), dùng trong cookie; trả undefined nếu chưa có thẻ nào. */
export function knowCardsMask(data: Record<string, unknown> | undefined): number[] | undefined {
  const masks = knowCardMasksOf(data);
  const arr = VILLAGE_ORDER.map((id) => masks[id] ?? 0);
  return arr.some((m) => m > 0) ? arr : undefined;
}

/** Mảng số (từ cookie) thành data (trả {} nếu không hợp lệ hoặc không có thẻ nào). */
export function knowCardsDataFromMask(arr: unknown): Record<string, unknown> {
  if (!Array.isArray(arr)) return {};
  const out: KnowCardMasks = {};
  VILLAGE_ORDER.forEach((id, i) => {
    const m = sane(arr[i]);
    if (m > 0) out[id] = m;
  });
  return Object.keys(out).length === 0 ? {} : { [KNOW_CARDS_KEY]: out };
}

export interface KnowCardsInput {
  data: Record<string, unknown> | undefined;
  village: VillageId;
  /** Số thẻ của làng */
  total: number;
  /** Đã xong màn 1 (bài học) của làng: coi như đã có đủ thẻ (người chơi từ trước) */
  lessonDone: boolean;
  /** Đã từng xem hộp "Em có biết?" tự hiện cũ (cờ `knowSeen`): cũng coi như đủ */
  seenOld: boolean;
}

/** Mặt nạ thẻ hiệu lực của một làng: đã nhặt, hoặc đủ cả nếu đã xong màn 1 hay đã xem hộp cũ. */
export function effectiveKnowMask(i: KnowCardsInput): number {
  if (i.lessonDone || i.seenOld) return fullKnowMask(i.total);
  return knowCardMaskOf(i.data, i.village) & fullKnowMask(i.total);
}

/** Đã đủ thẻ chưa (làng không có thẻ để nhặt: coi là đủ). */
export function knowCardsComplete(i: KnowCardsInput): boolean {
  return i.total <= 0 || countKnowCards(effectiveKnowMask(i), i.total) >= i.total;
}

/** Id màn 1 của làng (bài học đầu tiên), để biết "đã xong màn 1". */
export function firstLevelIdOf(village: VillageId): number | undefined {
  return levelsOfVillage(village)[0]?.id;
}

/**
 * Bài học đầu của làng chỉ có cờ "tự hoàn thành" (P3b)? Khi đó điều kiện chặn bài học/game của làng vì chưa đủ thẻ được BỎ QUA (giáo viên/bản dev đi tiếp được),
 * nhưng KHÔNG ghi là đã nhặt thẻ nào: mặt nạ thẻ (`effectiveKnowMask`) vẫn chỉ theo thẻ thật đã nhặt, nên ký hiệu thẻ trên bản đồ và số "n/4" không đổi.
 */
export function knowBypassedByAuto(levels: readonly { id: number; state: string; auto?: boolean }[], village: VillageId): boolean {
  const first = firstLevelIdOf(village);
  return first !== undefined && levels.some((l) => l.id === first && l.state === 'done' && l.auto === true);
}

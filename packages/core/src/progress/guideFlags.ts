import { GUIDE_SECTION_IDS } from '../content/huongDan';

/**
 * Cờ "đã mở tự động phần này của Hướng dẫn chơi" (mốc 2, bước 16): `game_state.data.guideSeen = { "di-lai": true }`; chơi thử: trường "hd" của cookie `sc_guest`,
 * một bit mỗi phần theo thứ tự `GUIDE_SECTION_IDS` (chỉ được thêm phần vào cuối). Toàn hàm thuần, không sửa dữ liệu đầu vào.
 */
export const GUIDE_SEEN_KEY = 'guideSeen';

export type GuideSeen = Record<string, true>;

/** Đọc cờ từ data; phần lạ hoặc giá trị không phải true bị bỏ qua. */
export function guideSeenOf(data: Record<string, unknown> | undefined): GuideSeen {
  const raw = data?.[GUIDE_SEEN_KEY];
  const out: GuideSeen = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const id of GUIDE_SECTION_IDS) if ((raw as Record<string, unknown>)[id] === true) out[id] = true;
  return out;
}

export const hasSeenGuide = (data: Record<string, unknown> | undefined, section: string): boolean => guideSeenOf(data)[section] === true;

/** Có tự mở phần này không: lần đầu thì có, đã mở rồi thì không. */
export const shouldAutoOpenGuide = (data: Record<string, unknown> | undefined, section: string): boolean => !hasSeenGuide(data, section);

/** Data mới đã đánh dấu phần này là đã mở tự động (giữ nguyên các khóa khác). */
export function withGuideSeen(data: Record<string, unknown> | undefined, section: string): Record<string, unknown> {
  return { ...(data ?? {}), [GUIDE_SEEN_KEY]: { ...guideSeenOf(data), [section]: true } };
}

/** Hợp hai bản cờ: phần nào một trong hai bên đã mở thì coi là đã mở. Không có cờ nào thì giữ nguyên `base`. */
export function mergeGuideSeen(base: Record<string, unknown>, other: Record<string, unknown>): Record<string, unknown> {
  const merged: GuideSeen = { ...guideSeenOf(other), ...guideSeenOf(base) };
  if (Object.keys(merged).length === 0) return base;
  return { ...base, [GUIDE_SEEN_KEY]: merged };
}

/** Cờ thành số bit (bit i ứng với phần thứ i trong `GUIDE_SECTION_IDS`), dùng trong cookie. */
export function guideMask(data: Record<string, unknown> | undefined): number {
  const seen = guideSeenOf(data);
  return GUIDE_SECTION_IDS.reduce((mask, id, i) => (seen[id] ? mask | (1 << i) : mask), 0);
}

/** Số bit thành data (trả {} nếu không có phần nào). */
export function guideDataFromMask(mask: unknown): Record<string, unknown> {
  const m = typeof mask === 'number' && Number.isFinite(mask) ? Math.floor(mask) : 0;
  const seen: GuideSeen = {};
  GUIDE_SECTION_IDS.forEach((id, i) => {
    if (m & (1 << i)) seen[id] = true;
  });
  return Object.keys(seen).length === 0 ? {} : { [GUIDE_SEEN_KEY]: seen };
}

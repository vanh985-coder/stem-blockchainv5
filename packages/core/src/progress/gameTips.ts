/**
 * Cờ "đã nghe lời giới thiệu lần đầu của game phụ" (mốc 3, bước B4: màn 12, Bi giải thích "Trên bảng thì gốc vẽ ở trên cùng…"): `game_state.data.gameTipSeen = { "12": true }`
 * (cột jsonb sẵn có, không cần migration); chơi thử: trường "gt" của cookie `sc_guest`, bit (số màn − 1). Toàn hàm thuần, không sửa dữ liệu đầu vào.
 */
export const GAME_TIP_KEY = 'gameTipSeen';
/**
 * Cờ "đã chiếu cảnh cao trào sau màn 12" (mốc 3, bước B5): `game_state.data.climaxSeen = true`; chơi thử: bit 12 của trường "gt" (bit 0 đến 11 là cờ lời giới thiệu của màn 1 đến 12).
 * Lần đầu cảnh tự chạy (hết cảnh hay bấm "Bỏ qua" thì ghi cờ); những lần sau không tự chạy, màn kết quả có nút "Xem lại cảnh cuối".
 */
export const CLIMAX_SEEN_KEY = 'climaxSeen';
const CLIMAX_BIT = 12;

/** Số màn hợp lệ (1 đến 12). */
const LEVEL_IDS = Array.from({ length: 12 }, (_, i) => i + 1);

export type GameTipSeen = Record<string, true>;

/** Đọc cờ từ data; số màn lạ hoặc giá trị không phải true bị bỏ qua. */
export function gameTipSeenOf(data: Record<string, unknown> | undefined): GameTipSeen {
  const raw = data?.[GAME_TIP_KEY];
  const out: GameTipSeen = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const id of LEVEL_IDS) if ((raw as Record<string, unknown>)[String(id)] === true) out[String(id)] = true;
  return out;
}

export const hasSeenGameTip = (data: Record<string, unknown> | undefined, levelId: number): boolean => gameTipSeenOf(data)[String(levelId)] === true;

/** Data mới đã đánh dấu màn này là đã nghe lời giới thiệu (giữ nguyên các khóa khác). */
export function withGameTipSeen(data: Record<string, unknown> | undefined, levelId: number): Record<string, unknown> {
  if (!LEVEL_IDS.includes(levelId)) return { ...(data ?? {}) };
  return { ...(data ?? {}), [GAME_TIP_KEY]: { ...gameTipSeenOf(data), [String(levelId)]: true } };
}

export const hasSeenClimax = (data: Record<string, unknown> | undefined): boolean => data?.[CLIMAX_SEEN_KEY] === true;

/** Data mới đã đánh dấu cảnh cao trào là đã chiếu (giữ nguyên các khóa khác). */
export const withClimaxSeen = (data: Record<string, unknown> | undefined): Record<string, unknown> => ({ ...(data ?? {}), [CLIMAX_SEEN_KEY]: true });

/** Hợp hai bản cờ: màn nào một trong hai bên đã nghe thì coi là đã nghe; cảnh cao trào một bên đã chiếu thì coi là đã chiếu. Không có cờ nào thì giữ nguyên `base`. */
export function mergeGameTipSeen(base: Record<string, unknown>, other: Record<string, unknown>): Record<string, unknown> {
  const merged: GameTipSeen = { ...gameTipSeenOf(other), ...gameTipSeenOf(base) };
  const climax = hasSeenClimax(base) || hasSeenClimax(other);
  if (Object.keys(merged).length === 0 && !climax) return base;
  return { ...base, ...(Object.keys(merged).length > 0 ? { [GAME_TIP_KEY]: merged } : {}), ...(climax ? { [CLIMAX_SEEN_KEY]: true } : {}) };
}

/** Cờ thành số bit (bit i ứng với màn i + 1), dùng trong cookie. */
export function gameTipMask(data: Record<string, unknown> | undefined): number {
  const seen = gameTipSeenOf(data);
  const tips = LEVEL_IDS.reduce((mask, id) => (seen[String(id)] ? mask | (1 << (id - 1)) : mask), 0);
  return hasSeenClimax(data) ? tips | (1 << CLIMAX_BIT) : tips;
}

/** Số bit thành data (trả {} nếu không có màn nào). */
export function gameTipDataFromMask(mask: unknown): Record<string, unknown> {
  const m = typeof mask === 'number' && Number.isFinite(mask) ? Math.floor(mask) : 0;
  const seen: GameTipSeen = {};
  for (const id of LEVEL_IDS) if (m & (1 << (id - 1))) seen[String(id)] = true;
  return { ...(Object.keys(seen).length === 0 ? {} : { [GAME_TIP_KEY]: seen }), ...(m & (1 << CLIMAX_BIT) ? { [CLIMAX_SEEN_KEY]: true } : {}) };
}

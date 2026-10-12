import { isQualityChoice, type QualityChoice } from '../three/quality';

/** Cài đặt của máy này (không phải tiến độ học). Lưu ở localStorage. */
export const SETTINGS_KEY = 'sochung.v3.settings';

export interface Settings {
  reducedMotion: boolean;
  largeText: boolean;
  /** Âm thanh (tiếng bấm, đúng/sai, chúc mừng) */
  soundEnabled: boolean;
  /** Chất lượng đồ họa 3D: "auto" để máy tự chọn (spec 03 mục 2) */
  quality: QualityChoice;
}

/** Những gì người dùng đã chọn rõ ràng. Mục nào chưa chọn thì không có. */
export type StoredSettings = Partial<Settings>;

/** Hàm thuần: đọc chuỗi đã lưu, bỏ qua mọi thứ không hợp lệ. */
export function parseStored(raw: string | null | undefined): StoredSettings {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return {};
    const o = data as Record<string, unknown>;
    const out: StoredSettings = {};
    if (typeof o.reducedMotion === 'boolean') out.reducedMotion = o.reducedMotion;
    if (typeof o.largeText === 'boolean') out.largeText = o.largeText;
    if (typeof o.soundEnabled === 'boolean') out.soundEnabled = o.soundEnabled;
    if (isQualityChoice(o.quality)) out.quality = o.quality;
    return out;
  } catch {
    return {};
  }
}

/** Hàm thuần: "Giảm chuyển động" chưa chọn thì theo prefers-reduced-motion của máy. */
export function resolveSettings(stored: StoredSettings, prefersReducedMotion: boolean): Settings {
  return {
    reducedMotion: stored.reducedMotion ?? prefersReducedMotion,
    largeText: stored.largeText ?? false,
    soundEnabled: stored.soundEnabled ?? true,
    quality: stored.quality ?? 'auto',
  };
}

export function serializeStored(stored: StoredSettings): string {
  return JSON.stringify(stored);
}

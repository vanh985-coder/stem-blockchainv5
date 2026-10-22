import { isQualityChoice, type QualityChoice } from '../three/quality';

/** Cài đặt của máy này (không phải tiến độ học). Lưu ở localStorage. */
export const SETTINGS_KEY = 'sochung.v3.settings';

/** "Độ nhạy chuột" khi xoay camera ở cảnh đi lại (hệ số nhân với độ nhạy gốc): từ 0,3 đến 3, mặc định 1. */
export const MOUSE_SENSITIVITY_MIN = 0.3;
export const MOUSE_SENSITIVITY_MAX = 3;
export const MOUSE_SENSITIVITY_DEFAULT = 1;
export const MOUSE_SENSITIVITY_STEP = 0.1;

/** Hàm thuần: đưa độ nhạy về khoảng cho phép, làm tròn tới 0,1; không phải số thì về mặc định. */
export function clampMouseSensitivity(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return MOUSE_SENSITIVITY_DEFAULT;
  const clamped = Math.min(MOUSE_SENSITIVITY_MAX, Math.max(MOUSE_SENSITIVITY_MIN, v));
  return Math.round(Math.round(clamped / MOUSE_SENSITIVITY_STEP) * MOUSE_SENSITIVITY_STEP * 10) / 10;
}

export interface Settings {
  reducedMotion: boolean;
  largeText: boolean;
  /** Âm thanh (tiếng bấm, đúng/sai, chúc mừng) */
  soundEnabled: boolean;
  /** Chất lượng đồ họa 3D: "auto" để máy tự chọn (spec 03 mục 2) */
  quality: QualityChoice;
  /** Độ nhạy chuột khi xoay camera (máy tính), xem `clampMouseSensitivity` */
  mouseSensitivity: number;
  /** Bản đồ nhỏ xoay theo hướng nhìn (mặc định tắt: hướng bắc luôn ở trên), xem `MiniMap` */
  rotateMap: boolean;
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
    if (typeof o.rotateMap === 'boolean') out.rotateMap = o.rotateMap;
    if (typeof o.mouseSensitivity === 'number' && Number.isFinite(o.mouseSensitivity)) out.mouseSensitivity = clampMouseSensitivity(o.mouseSensitivity);
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
    mouseSensitivity: stored.mouseSensitivity ?? MOUSE_SENSITIVITY_DEFAULT,
    rotateMap: stored.rotateMap ?? false,
  };
}

export function serializeStored(stored: StoredSettings): string {
  return JSON.stringify(stored);
}

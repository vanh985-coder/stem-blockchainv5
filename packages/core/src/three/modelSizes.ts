/**
 * Bảng cỡ model (spec 03 mục 2). Hàm thuần, không import three.
 * Mọi model trong file đều có cạnh dài nhất ~1 đơn vị; cảnh đặt tỉ lệ từng loại theo bảng này.
 * Bước sau thêm cỡ đồ vật (nhà, cổng…) vào `MODEL_SIZES`.
 */

/** Chiều cao mọi nhân vật trong cảnh (đơn vị), kể cả nhân vật có xương và đứng yên. */
export const CHARACTER_HEIGHT = 1.7;

export interface ModelSize {
  /** Chiều cao mong muốn trong cảnh (đơn vị); chân ở y = 0 */
  height: number;
  /** Góc xoay quanh trục đứng (radian) để mặt quay về +Z. 0 nếu trong file mặt đã quay +Z. */
  facingYaw: number;
}

const character = (facingYaw = 0): ModelSize => ({ height: CHARACTER_HEIGHT, facingYaw });

/** Nhân vật: 4 có xương (`hoc-sinh-nam`, `ti`, `dan-lang-ba-cu`, `dan-lang-nong-dan`) và 6 đứng yên. */
export const MODEL_SIZES: Readonly<Record<string, ModelSize>> = {
  'characters/hoc-sinh-nam': character(),
  'characters/ti': character(),
  'characters/dan-lang-ba-cu': character(),
  'characters/dan-lang-nong-dan': character(),
  'characters/bac-an': character(),
  'characters/cu-binh': character(),
  'characters/co-chi': character(),
  'characters/chu-dung': character(),
  'characters/thay-linh': character(),
  'characters/lai-buon': character(),
};

/** 6 nhân vật không có xương (đứng yên, spec 03 mục 3.4). */
export const STATIC_CHARACTER_IDS: readonly string[] = [
  'characters/bac-an',
  'characters/cu-binh',
  'characters/co-chi',
  'characters/chu-dung',
  'characters/thay-linh',
  'characters/lai-buon',
];

/** 4 nhân vật có xương Mixamo. */
export const RIGGED_CHARACTER_IDS: readonly string[] = [
  'characters/hoc-sinh-nam',
  'characters/ti',
  'characters/dan-lang-ba-cu',
  'characters/dan-lang-nong-dan',
];

export function isCharacterId(id: string): boolean {
  return id.startsWith('characters/');
}

/** Cỡ của model; id không có trong bảng thì nhân vật dùng cỡ chung, còn lại undefined. */
export function sizeOf(id: string): ModelSize | undefined {
  return MODEL_SIZES[id] ?? (isCharacterId(id) ? character() : undefined);
}

export interface Fit {
  /** Hệ số phóng để cao đúng `targetHeight` */
  scale: number;
  /** Dịch theo trục đứng (đã tính theo `scale`) để chân ở y = 0 */
  offsetY: number;
}

/**
 * Phóng và dịch để model có chiều cao `targetHeight` và chân ở y = 0, từ khung bao đo được (minY, maxY).
 * Khung bao hỏng (cao 0 hoặc không hữu hạn) thì không phóng, không dịch.
 */
export function fitToHeight(minY: number, maxY: number, targetHeight: number): Fit {
  const h = maxY - minY;
  if (!Number.isFinite(h) || h <= 1e-6 || !Number.isFinite(minY)) return { scale: 1, offsetY: 0 };
  const scale = targetHeight / h;
  return { scale, offsetY: -minY * scale };
}

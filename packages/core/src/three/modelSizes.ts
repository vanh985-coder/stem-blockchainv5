/**
 * Bảng cỡ model (spec 03 mục 2). Hàm thuần, không import three.
 * Mọi model trong file đều có cạnh dài nhất ~1 đơn vị; cảnh đặt tỉ lệ từng loại theo bảng này.
 * Đồ vật (nhà, cổng, cây…) cũng có cỡ thật trong `MODEL_SIZES`, so với nhân vật cao 1,7 (spec 03 mục 2).
 */

/** Chiều cao mọi nhân vật trong cảnh (đơn vị), kể cả nhân vật có xương và đứng yên. */
export const CHARACTER_HEIGHT = 1.7;

export interface ModelSize {
  /** Chiều cao mong muốn trong cảnh (đơn vị); chân ở y = 0 */
  height: number;
  /** Góc xoay quanh trục đứng (radian) để mặt quay về +Z. 0 nếu trong file mặt đã quay +Z. */
  facingYaw: number;
  /**
   * Kích thước khung bao [x, y, z] của model đã chuẩn hóa trong file (cạnh dài nhất ~1; đo bằng gltf-transform từ
   * assets-build/). Có giá trị này thì `sizeInScene` tính được bề rộng và bề sâu thật trong cảnh (để đặt vật cản và tránh chồng nhau).
   */
  dims?: readonly [number, number, number];
}

const character = (facingYaw = 0): ModelSize => ({ height: CHARACTER_HEIGHT, facingYaw });

/** Đồ vật cao `height` đơn vị cảnh; `dims` là khung bao đo được trong file. */
const prop = (height: number, dims: readonly [number, number, number]): ModelSize => ({ height, facingYaw: 0, dims });

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

  // Đồ vật ở chợ phiên (spec 03 mục 2, bảng "Cỡ thật của đồ vật"). Cao tính theo đơn vị cảnh (nhân vật cao 1,7).
  'env/cay-da': prop(12, [1, 0.633, 0.67]),
  'env/cong-lang-giay': prop(5, [0.98, 0.568, 0.252]),
  'env/cong-lang-det': prop(5, [0.979, 0.703, 0.35]),
  'env/cong-lang-khac-dau': prop(5, [0.979, 0.548, 0.346]),
  'env/cong-lang-bac': prop(5, [0.979, 0.576, 0.371]),
  'env/nha-mai-ngoi': prop(4.5, [0.979, 0.838, 0.89]),
  'env/nha-mai-tranh': prop(4, [0.979, 0.74, 0.916]),
  'env/leu-cho': prop(3.2, [0.976, 0.824, 0.781]),
  'env/gieng-lang': prop(2.4, [0.978, 0.978, 0.931]),
  'env/bui-tre': prop(5.5, [0.976, 0.906, 0.874]),
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

/** Cỡ của model; id không có trong bảng thì nhân vật dùng cỡ chung, còn lại undefined. Bản xa ("-xa") dùng cỡ của bản chính. */
export function sizeOf(id: string): ModelSize | undefined {
  const base = id.endsWith('-xa') ? id.slice(0, -3) : id;
  return MODEL_SIZES[base] ?? (isCharacterId(base) ? character() : undefined);
}

/** Kích thước thật [rộng x, cao y, sâu z] trong cảnh của một đồ vật (nhân thêm `scale` nếu đặt phóng to hay thu nhỏ); undefined nếu chưa có `dims`. */
export function sizeInScene(id: string, scale = 1): readonly [number, number, number] | undefined {
  const size = sizeOf(id);
  if (!size?.dims) return undefined;
  const k = (size.height / size.dims[1]) * scale;
  return [size.dims[0] * k, size.dims[1] * k, size.dims[2] * k];
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

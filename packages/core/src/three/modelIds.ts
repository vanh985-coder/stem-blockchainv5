/** Hàm thuần về tên model. Không import three. */

/** Đuôi của bản xa (spec 01 mục 5): `env/cong-lang-giay` có bản xa `env/cong-lang-giay-xa`. */
export const LOD_SUFFIX = '-xa';
/** Texture lớn hơn mức này lúc chạy thì ghi cảnh báo (spec 03 mục 9). */
export const MAX_RUNTIME_TEXTURE = 2048;

/** Khóa manifest của model. `id` là đường dẫn trong models/, ví dụ "characters/bac-an", "env/cay-da". */
export function modelPath(id: string): string {
  return `models/${id}`;
}

export function lodId(id: string): string {
  return id + LOD_SUFFIX;
}

export function isLodId(id: string): boolean {
  return id.endsWith(LOD_SUFFIX);
}

/** Id của bản chính, từ id bất kỳ (bản chính hoặc bản xa). */
export function baseId(id: string): string {
  return isLodId(id) ? id.slice(0, -LOD_SUFFIX.length) : id;
}

/** Hình thay thế khi thiếu file: nhân vật là capsule, còn lại là khối. */
export function placeholderKind(id: string): 'capsule' | 'box' {
  return id.startsWith('characters/') ? 'capsule' : 'box';
}

/** Màu thay thế ổn định theo id (HSL, độ sáng vừa phải để nhìn rõ trên nền trời). */
export function placeholderHsl(id: string): [number, number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return [h, 0.5, 0.6];
}

export interface TextureSize {
  width: number;
  height: number;
}

/** Texture có cạnh dài hơn `max`. */
export function oversizedTextures<T extends TextureSize>(textures: readonly T[], max: number = MAX_RUNTIME_TEXTURE): T[] {
  return textures.filter((t) => Math.max(t.width, t.height) > max);
}

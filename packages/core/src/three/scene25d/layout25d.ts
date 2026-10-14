/**
 * Bố cục của Scene25D (spec 03 mục 0, loại cảnh C): hàm thuần, không import three. Khung hình 16:9 co giãn theo cha, ảnh nền kiểu `cover`, hình rời sắp lớp theo
 * trục Z, nhắc "Xoay ngang để chơi" khi điện thoại xoay dọc.
 *
 * Đơn vị thế giới của cảnh: khung ngang cao `WORLD_UNIT` = 9 và rộng 16 (đúng 16:9); gốc tọa độ ở tâm khung, x sang phải, y lên trên. Camera trực giao đặt ở z dương nhìn về
 * −z, nên z càng lớn càng gần người xem. Khung dọc (màn 12) đổi chỗ hai cạnh: rộng 9, cao 16.
 */

/** Tỉ lệ khung ngang. */
export const FRAME_ASPECT = 16 / 9;
/** Cạnh ngắn của khung theo đơn vị thế giới (9): khung ngang 16 × 9, khung dọc 9 × 16. */
export const WORLD_UNIT = 9;
/** Điện thoại: cạnh ngắn của màn hình dưới số điểm ảnh này thì coi là điện thoại (cửa sổ máy tính hẹp vẫn chơi trong khung thu nhỏ, không nhắc xoay). */
export const PHONE_SHORT_SIDE = 600;

export interface Size {
  width: number;
  height: number;
}

export interface FrameRect extends Size {
  left: number;
  top: number;
}

/**
 * Khung lớn nhất tỉ lệ `aspect` (rộng/cao) nằm gọn trong phần tử cha `parent`, căn giữa (dải đen hai bên hoặc trên dưới). Cha có kích thước 0 thì khung 0.
 */
export function fitFrame(parent: Size, aspect: number): FrameRect {
  if (!(parent.width > 0) || !(parent.height > 0) || !(aspect > 0)) return { width: 0, height: 0, left: 0, top: 0 };
  let width = parent.width;
  let height = width / aspect;
  if (height > parent.height) {
    height = parent.height;
    width = height * aspect;
  }
  return { width, height, left: (parent.width - width) / 2, top: (parent.height - height) / 2 };
}

export type FrameMode =
  /** Khung ngang 16:9 */
  | 'landscape'
  /** Khung dọc 9:16 (chỉ khi cảnh cho phép, màn 12) */
  | 'portrait'
  /** Điện thoại đang xoay dọc mà cảnh chỉ chơi ngang: hiện nhắc "Xoay ngang để chơi" */
  | 'rotate';

/**
 * Chế độ khung theo kích thước cha. Cha cao hơn rộng là "xoay dọc": cảnh cho phép khung dọc thì dùng khung 9:16; không thì ở điện thoại (cạnh ngắn dưới
 * `PHONE_SHORT_SIDE`) hiện nhắc xoay ngang, còn cửa sổ máy tính hẹp vẫn giữ khung ngang thu nhỏ.
 */
export function frameMode(parent: Size, allowPortrait: boolean): FrameMode {
  const portrait = parent.height > parent.width;
  if (!portrait) return 'landscape';
  if (allowPortrait) return 'portrait';
  return Math.min(parent.width, parent.height) < PHONE_SHORT_SIDE ? 'rotate' : 'landscape';
}

/** Tỉ lệ khung theo chế độ ('rotate' vẫn giữ khung ngang ở phía sau lời nhắc). */
export function aspectOf(mode: FrameMode): number {
  return mode === 'portrait' ? 1 / FRAME_ASPECT : FRAME_ASPECT;
}

/** Kích thước khung theo đơn vị thế giới: ngang 16 × 9, dọc 9 × 16. */
export function worldSize(mode: FrameMode): Size {
  return mode === 'portrait' ? { width: WORLD_UNIT, height: WORLD_UNIT * FRAME_ASPECT } : { width: WORLD_UNIT * FRAME_ASPECT, height: WORLD_UNIT };
}

/** Khung nhìn của camera trực giao: phủ đúng khung thế giới, tâm ở gốc (camera dùng `manual` nên không tự đổi theo kích thước canvas). */
export function frustum(world: Size): { left: number; right: number; top: number; bottom: number } {
  return { left: -world.width / 2, right: world.width / 2, top: world.height / 2, bottom: -world.height / 2 };
}

/**
 * Cỡ mặt phẳng ảnh nền kiểu `cover`: phủ kín khung (`frame`, đơn vị thế giới), giữ tỉ lệ ảnh, phần thừa bị cắt đều hai bên. Ảnh không có kích thước thì phủ đúng khung.
 */
export function coverSize(image: Size, frame: Size): Size {
  if (!(image.width > 0) || !(image.height > 0)) return { width: frame.width, height: frame.height };
  const k = Math.max(frame.width / image.width, frame.height / image.height);
  return { width: image.width * k, height: image.height * k };
}

/** Cỡ hình rời theo đơn vị thế giới: cho `height` hoặc `width` (cạnh kia theo tỉ lệ ảnh); cho cả hai thì dùng cả hai; không cho thì cao 1. */
export function spriteSize(image: Size, spec: { width?: number; height?: number }): Size {
  const ratio = image.width > 0 && image.height > 0 ? image.width / image.height : 1;
  if (spec.width !== undefined && spec.height !== undefined) return { width: spec.width, height: spec.height };
  if (spec.height !== undefined) return { width: spec.height * ratio, height: spec.height };
  if (spec.width !== undefined) return { width: spec.width, height: spec.width / ratio };
  return { width: ratio, height: 1 };
}

/**
 * Các lớp theo trục Z, từ xa tới gần. Nhân vật 3D đứng ở lớp `actors` (và các lớp lân cận, cách nhau ≥ 1 đơn vị để thân nhân vật dày ~1 đơn vị không xuyên vào nhau).
 */
export const LAYERS = {
  background: -10,
  far: -5,
  back: -2,
  actorsBack: -1,
  actors: 0,
  actorsFront: 1.2,
  front: 3,
  near: 5,
} as const;

export type LayerName = keyof typeof LAYERS;

/** Z của một lớp, cộng độ lệch nhỏ `bias` để sắp thứ tự trong cùng lớp. */
export function layerZ(layer: LayerName, bias = 0): number {
  return LAYERS[layer] + bias;
}

/** Vị trí camera trên trục Z (xa hơn mọi lớp) và khoảng cắt gần/xa bao hết các lớp. */
export const CAMERA_Z = 20;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 60;

/** Góc thế giới của khung từ tâm: đổi vị trí theo tỉ lệ khung [0..1] (0,0 là góc trên trái) sang tọa độ thế giới (y hướng lên). */
export function frameToWorld(fx: number, fy: number, world: Size): { x: number; y: number } {
  return { x: (fx - 0.5) * world.width, y: (0.5 - fy) * world.height };
}

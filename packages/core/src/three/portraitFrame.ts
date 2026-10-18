/**
 * Khung chụp chân dung từ model 3D (spec 03 mục 3.6). Hàm thuần, không import three.
 * Khung vuông lấy `share` (35%) phía trên khối bao của nhân vật (đầu và vai), camera nhìn góc 3/4 từ phía trước, hơi cao hơn tâm khung.
 */

/** Phần chiều cao phía trên khối bao được đưa vào khung */
export const PORTRAIT_SHARE = 0.35;
/** Cạnh ảnh chân dung xuất ra (px) */
export const PORTRAIT_PX = 512;

export interface PortraitCameraOptions {
  /** Phần phía trên khối bao lấy vào khung (mặc định 0,35) */
  share?: number;
  /** Góc nhìn dọc của camera (độ, mặc định 24) */
  fov?: number;
  /** Góc lệch ngang so với chính diện (độ, mặc định 25: góc 3/4) */
  yawDeg?: number;
  /** Góc cúi nhìn xuống (độ, mặc định 4) */
  pitchDeg?: number;
  /** Chừa viền quanh khung: 1 là khít, 1,12 là chừa 6% mỗi phía (mặc định 1,12) */
  pad?: number;
  /** Đáy khối bao (mặc định 0, chân ở y = 0): chiều cao khối bao là `height` − `base` */
  base?: number;
  /** Tâm ngang (x, z) của khối bao, để camera nhìn đúng đầu nhân vật lúc đầu lệch khỏi gốc (ví dụ cúi người) */
  center?: readonly [number, number];
}

export interface PortraitCamera {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  /** Nửa chiều cao vùng nhìn thấy tại điểm nhìn (đơn vị cảnh) */
  halfExtent: number;
}

/**
 * Camera chụp đầu và vai của nhân vật có đỉnh khối bao ở y = `height` (mặc định chân ở y = 0, mặt quay +Z; đo khối bao thật thì truyền thêm `base` và `center`).
 * Điểm nhìn ở giữa phần khung lấy: y = height − share·(height − base)/2. Khoảng cách chọn để vùng thấy được tại điểm nhìn cao `share·(height − base)·pad`.
 */
export function portraitCamera(height: number, opts: PortraitCameraOptions = {}): PortraitCamera {
  const share = opts.share ?? PORTRAIT_SHARE;
  const fov = opts.fov ?? 24;
  const yaw = ((opts.yawDeg ?? 25) * Math.PI) / 180;
  const pitch = ((opts.pitchDeg ?? 4) * Math.PI) / 180;
  const pad = opts.pad ?? 1.12;
  const base = opts.base ?? 0;
  const [cx, cz] = opts.center ?? [0, 0];
  const span = share * (height - base);
  const halfExtent = (span * pad) / 2;
  const distance = halfExtent / Math.tan(((fov / 2) * Math.PI) / 180);
  const ty = height - span / 2;
  return {
    position: [cx + distance * Math.sin(yaw) * Math.cos(pitch), ty + distance * Math.sin(pitch), cz + distance * Math.cos(yaw) * Math.cos(pitch)],
    target: [cx, ty, cz],
    fov,
    halfExtent,
  };
}

/** Một mục trong danh sách chụp. `model` là đường dẫn trong models/ ("bi" là khối do code dựng). */
export interface PortraitItem {
  /** Tên file xuất ra (không đuôi) */
  name: string;
  model: string;
  /** Tư thế đứng yên của người đứng yên: "talking" nghiêng đầu nhẹ (dùng cho bản "cười" của bác An) */
  mood?: 'idle' | 'talking';
  /** Phần phía trên khối bao lấy vào khung, thay cho mặc định 0,35: dùng khi đầu nhân vật to hơn hẳn các người khác (bà cụ) để vẫn thấy cả khăn và vai */
  share?: number;
}

/** 11 chân dung của spec 03 mục 3.6 (10 nhân vật và Bi) và bản "vui" của bác An (bac-an-cuoi, dùng khi lời thoại ở trạng thái vui) */
export const PORTRAIT_ITEMS: readonly PortraitItem[] = [
  { name: 'hoc-sinh-nam', model: 'characters/hoc-sinh-nam' },
  { name: 'ti', model: 'characters/ti' },
  { name: 'bac-an', model: 'characters/bac-an' },
  { name: 'bac-an-cuoi', model: 'characters/bac-an', mood: 'talking' },
  { name: 'cu-binh', model: 'characters/cu-binh' },
  { name: 'co-chi', model: 'characters/co-chi' },
  { name: 'chu-dung', model: 'characters/chu-dung' },
  { name: 'thay-linh', model: 'characters/thay-linh' },
  { name: 'lai-buon', model: 'characters/lai-buon' },
  { name: 'ba-cu', model: 'characters/dan-lang-ba-cu', share: 0.48 },
  { name: 'nong-dan', model: 'characters/dan-lang-nong-dan' },
  { name: 'bi', model: 'bi' },
];

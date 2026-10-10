/**
 * Cỡ bản đồ /ban-do ở màn hình từ 1024px (hàm thuần).
 * Bản đồ giữ đúng tỉ lệ ảnh; to hết mức có thể: theo chiều cao còn lại, hoặc theo chiều ngang (đã trừ bảng làng bên cạnh).
 */

/** Tỉ lệ ảnh ui/ban-do (1920×1047) khi manifest chưa có kích thước. */
export const MAP_RATIO = 1920 / 1047;
/** Bảng làng bên phải */
export const PANEL_W = 360;
/** Khoảng cách giữa bản đồ và bảng làng */
export const GAP = 16;
/** Từ chiều ngang này (px) mới dùng cách bố trí vừa màn hình; dưới đó giữ như cũ. */
export const BIG_MIN_WIDTH = 1024;

export interface MapFit {
  /** Rộng và cao của bản đồ (px), đúng tỉ lệ ảnh */
  w: number;
  h: number;
  /** Rộng cả cụm (bản đồ + khoảng cách + bảng làng), để căn giữa */
  total: number;
}

/** Cỡ bản đồ lớn nhất vừa trong vùng availW × availH (px), chừa chỗ cho bảng làng và khoảng cách. */
export function fitMap(availW: number, availH: number, ratio: number = MAP_RATIO, panelW: number = PANEL_W, gap: number = GAP): MapFit {
  const maxByWidth = Math.max(0, Math.floor(availW - panelW - gap));
  const maxByHeight = Math.max(0, Math.floor(availH));
  // Bị giới hạn bởi chiều cao thì giữ đúng chiều cao còn lại; ngược lại theo chiều ngang.
  const heightBound = maxByHeight * ratio <= maxByWidth;
  const w = heightBound ? Math.floor(maxByHeight * ratio) : maxByWidth;
  const h = heightBound ? maxByHeight : Math.floor(w / ratio);
  return { w, h, total: w + gap + panelW };
}

export interface MarkerScale {
  /** Cỡ chữ nhãn làng (px) */
  font: number;
  /** Cạnh chấm trạng thái (px) */
  dot: number;
  /** Cạnh icon Trang Sổ Vàng trên nhãn (px) */
  gold: number;
  /** Vùng bấm tối thiểu của nhãn làng (px), luôn ≥ 44 */
  target: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Nhãn làng, chấm và icon phóng theo cỡ bản đồ (có giới hạn trên và dưới). */
export function markerScale(mapW: number): MarkerScale {
  return {
    font: Math.round(clamp(mapW / 62, 14, 24)),
    dot: Math.round(clamp(mapW / 45, 24, 40)),
    gold: Math.round(clamp(mapW / 32, 28, 52)),
    target: 44,
  };
}

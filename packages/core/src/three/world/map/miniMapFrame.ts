/**
 * Một nhịp cập nhật của bản đồ nhỏ (mười lần mỗi giây), tách ra thành hàm thuần để kiểm bằng test: đặt khung nhìn theo vị trí và hướng nhìn, tính chỗ đặt của từng ký hiệu. Không cấp phát đối tượng mới
 * ngoài chuỗi `transform` (nơi gọi truyền sẵn các đối tượng nháp).
 */
import { pinToCircle, project, rotationFor, viewRadiusFor, type MapView, type Pinned, type Point } from './mapProjection';

/** Điểm đến ngoài vòng bị kéo về mép, cách mép bấy nhiêu pixel. */
export const PIN_MARGIN = 8;

/** Đặt khung nhìn: tâm là vị trí em, thu phóng theo việc đang ở trong làng hay không, xoay theo hướng nhìn nếu bật. */
export function placeView(view: MapView, p: { x: number; z: number }, yaw: number, rotate: boolean, inside: boolean, size: number): MapView {
  view.cx = p.x;
  view.cz = p.z;
  view.size = size;
  view.radius = viewRadiusFor(inside);
  view.rotation = rotationFor(rotate, yaw);
  return view;
}

export interface Scratch {
  pt: Point;
  pin: Pinned;
}

export const newScratch = (): Scratch => ({ pt: { x: 0, y: 0 }, pin: { x: 0, y: 0, clamped: false, angle: 0 } });

export interface MarkerPlacement {
  transform: string;
  /** Chỉ có ý nghĩa với điểm đến: đã bị kéo về mép vòng (nên hiện mũi tên chỉ hướng) và góc mũi tên (độ) */
  pinned: boolean;
  pinAngle: number;
  /** Ký hiệu có nằm trong vòng đang vẽ không (điểm đến luôn hiện vì được kéo về mép). Ngoài vòng thì ẩn hẳn, không vẽ phần bị cắt. */
  visible: boolean;
}

/** Ký hiệu cách tâm khung quá `bán kính khung + biên` (pixel) thì coi là ngoài vòng. Biên cho nửa cỡ ký hiệu nhô vào vòng. */
export const VISIBLE_MARGIN = 6;

/**
 * Chỗ đặt một ký hiệu trên màn hình bản đồ. Điểm đến (`target`) nằm ngoài vòng thì được kéo về mép giữ nguyên hướng; ký hiệu khác nằm ngoài vòng thì cứ ở đúng chỗ (phần ngoài vòng bị cắt đi).
 */
export function placeMarker(view: MapView, target: boolean, x: number, z: number, scratch: Scratch, out: MarkerPlacement): MarkerPlacement {
  project(view, x, z, scratch.pt);
  if (target) {
    pinToCircle(scratch.pt, view.size, PIN_MARGIN, scratch.pin);
    out.transform = `translate(${scratch.pin.x.toFixed(1)} ${scratch.pin.y.toFixed(1)})`;
    out.pinned = scratch.pin.clamped;
    out.pinAngle = scratch.pin.angle;
    out.visible = true;
  } else {
    out.transform = `translate(${scratch.pt.x.toFixed(1)} ${scratch.pt.y.toFixed(1)})`;
    out.pinned = false;
    out.pinAngle = 0;
    const half = view.size / 2;
    out.visible = Math.hypot(scratch.pt.x - half, scratch.pt.y - half) <= half + VISIBLE_MARGIN;
  }
  return out;
}

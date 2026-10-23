/**
 * 4 làn của màn 5 "Đập {phanDien}" (spec 06, mục "Màn 5"): mỗi làn là một đoạn thẳng từ điểm trên (đầu làn, cổng đình) tới điểm dưới (cuốn sổ trên bàn), tính theo TỌA ĐỘ CHUẨN HÓA của ảnh nền
 * `scenes/man-05-san-det` (u từ trái sang phải, v từ trên xuống dưới, cả hai trong 0 đến 1), khớp 4 dải vải đỏ, xanh đen, vàng, xanh lá.
 *
 * CHỦ DỰ ÁN CHỈNH Ở ĐÂY: mở trang `/dev/man-05-lanes` (chạy `pnpm dev:lang-det`, cổng 5175), bấm chọn điểm trên ảnh, rồi chép khối "MAN05_LANES" xuất ra đè vào dưới đây.
 * Vị trí trên làn là `pos` của logic (0 là đầu làn, 10 là sổ; vùng đập [6,5; 9]); chuột càng lên trên càng nhỏ (`LANE_SCALE`).
 */
import { WHACK_SPEC } from './whackConfig';

/** Kích thước ảnh nền gốc (điểm ảnh) */
export const MAN05_IMAGE = { width: 1376, height: 768 } as const;

export interface LanePoint2 {
  /** 0 đến 1 từ trái sang phải ảnh */
  u: number;
  /** 0 đến 1 từ trên xuống dưới ảnh */
  v: number;
}

export interface LaneSegment {
  /** Đầu làn (pos = 0) */
  top: LanePoint2;
  /** Cuối làn, chỗ cuốn sổ (pos = 10) */
  bottom: LanePoint2;
}

/** Giá trị ban đầu do xem ảnh đặt: đường giữa của từng dải vải (đỏ, xanh đen, vàng, xanh lá), từ cổng đình xuống bàn đặt sổ. */
export const MAN05_LANES: readonly [LaneSegment, LaneSegment, LaneSegment, LaneSegment] = [
  { top: { u: 0.323, v: 0.384 }, bottom: { u: 0.411, v: 0.742 } },
  { top: { u: 0.374, v: 0.38 }, bottom: { u: 0.527, v: 0.762 } },
  { top: { u: 0.43, v: 0.378 }, bottom: { u: 0.65, v: 0.714 } },
  { top: { u: 0.485, v: 0.367 }, bottom: { u: 0.734, v: 0.683 } },
];

/** Hệ số cỡ hình theo phối cảnh: ở đầu làn (cổng đình, xa) nhỏ, ở sổ (gần) cỡ đầy đủ. */
export const LANE_SCALE = { top: 0.45, bottom: 1 } as const;

/** Chỗ cuốn sổ trên bàn (tâm các vết mực), tọa độ chuẩn hóa của ảnh */
export const BOOK_POINT: LanePoint2 = { u: 0.61, v: 0.835 };

/** Khung thế giới của Scene25D (16 × 9) và kích thước ảnh nền sau khi phủ kín khung kiểu `cover` (cao 9, rộng theo tỉ lệ ảnh, thừa cắt đều hai bên). */
export const WORLD_FRAME = { width: 16, height: 9 } as const;
export const IMAGE_WORLD = {
  width: (WORLD_FRAME.height * MAN05_IMAGE.width) / MAN05_IMAGE.height,
  height: WORLD_FRAME.height,
} as const;

export interface WorldXY {
  x: number;
  y: number;
}

/** Đổi tọa độ chuẩn hóa của ảnh nền (u, v) sang tọa độ thế giới của khung (gốc ở tâm, y lên trên). Ghi vào `out`. */
export function imageToWorld(u: number, v: number, out: WorldXY = { x: 0, y: 0 }): WorldXY {
  out.x = (u - 0.5) * IMAGE_WORLD.width;
  out.y = (0.5 - v) * IMAGE_WORLD.height;
  return out;
}

/** Ngược lại: từ tọa độ thế giới về tọa độ chuẩn hóa của ảnh nền. */
export function worldToImage(x: number, y: number): LanePoint2 {
  return { u: x / IMAGE_WORLD.width + 0.5, v: 0.5 - y / IMAGE_WORLD.height };
}

export interface LanePose {
  x: number;
  y: number;
  /** Hệ số cỡ theo phối cảnh */
  scale: number;
}

/**
 * Điểm trên làn `lane` ở vị trí `pos` của logic (0 đến 10, kẹp lại): tọa độ thế giới và hệ số cỡ. Ghi vào `out` (không cấp phát, dùng được trong useFrame).
 * Nội suy tuyến tính theo `pos` từ đầu làn xuống sổ.
 */
export function lanePose(lane: number, pos: number, out: LanePose, lanes: readonly LaneSegment[] = MAN05_LANES): LanePose {
  const seg = lanes[Math.min(Math.max(Math.round(lane), 0), lanes.length - 1)];
  const t = Math.min(Math.max(pos / WHACK_SPEC.laneLength, 0), 1.2);
  const u = seg.top.u + (seg.bottom.u - seg.top.u) * t;
  const v = seg.top.v + (seg.bottom.v - seg.top.v) * t;
  out.x = (u - 0.5) * IMAGE_WORLD.width;
  out.y = (0.5 - v) * IMAGE_WORLD.height;
  out.scale = LANE_SCALE.top + (LANE_SCALE.bottom - LANE_SCALE.top) * Math.min(t, 1.1);
  return out;
}

/** Góc xoay (radian, quanh Z) để đầu con chuột hướng xuống sổ dọc làn: hình chuột gốc nằm ngang, đầu ở bên TRÁI. */
export function laneHeading(lane: number, lanes: readonly LaneSegment[] = MAN05_LANES): number {
  const seg = lanes[Math.min(Math.max(Math.round(lane), 0), lanes.length - 1)];
  const dx = (seg.bottom.u - seg.top.u) * IMAGE_WORLD.width;
  const dy = -(seg.bottom.v - seg.top.v) * IMAGE_WORLD.height;
  return Math.atan2(-dy, -dx);
}

/** Làn gần điểm (x, y) của thế giới nhất (khoảng cách tới đường thẳng của làn, kéo dài hai đầu); `maxDistance` thế giới, xa hơn thì −1. Dùng để chạm hay bấm chuột vào làn. */
export function laneAt(x: number, y: number, maxDistance = 1.6, lanes: readonly LaneSegment[] = MAN05_LANES): number {
  let best = -1;
  let bestD = maxDistance;
  for (let i = 0; i < lanes.length; i++) {
    const ax = (lanes[i].top.u - 0.5) * IMAGE_WORLD.width;
    const ay = (0.5 - lanes[i].top.v) * IMAGE_WORLD.height;
    const bx = (lanes[i].bottom.u - 0.5) * IMAGE_WORLD.width;
    const by = (0.5 - lanes[i].bottom.v) * IMAGE_WORLD.height;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    // chiếu lên đường thẳng, kẹp trong [−0,1; 1,15] để chạm hơi quá hai đầu vẫn trúng
    const t = Math.min(Math.max(((x - ax) * dx + (y - ay) * dy) / len2, -0.1), 1.15);
    const px = ax + dx * t;
    const py = ay + dy * t;
    const d = Math.hypot(x - px, y - py);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Chữ khối mã để chép vào file này (trang /dev/man-05-lanes xuất ra). */
export function lanesSource(lanes: readonly LaneSegment[]): string {
  const f = (n: number) => (Math.round(n * 1000) / 1000).toString();
  const rows = lanes.map((l) => `  { top: { u: ${f(l.top.u)}, v: ${f(l.top.v)} }, bottom: { u: ${f(l.bottom.u)}, v: ${f(l.bottom.v)} } },`);
  return ['export const MAN05_LANES: readonly [LaneSegment, LaneSegment, LaneSegment, LaneSegment] = [', ...rows, '];'].join('\n');
}

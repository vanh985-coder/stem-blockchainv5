/**
 * 3 làn của màn 9 "Chữa đàn gà" (spec 07, mục "Màn 9"): mỗi làn là một đoạn thẳng từ điểm trên (cuối đường, xa, `pos` = 0) tới điểm dưới (gần cổng làng, `pos` = 10), tính theo TỌA ĐỘ CHUẨN HÓA của ảnh nền
 * `scenes/man-09-duong-lang` (u từ trái sang phải, v từ trên xuống dưới, cả hai trong 0 đến 1). Ba làn khớp ba dải đường đất giữa các hàng rào tre: làn 1 bên trái, làn 2 ở giữa, làn 3 bên phải. Ba dải tỏa
 * ra phía người xem nên cả ba chạy chếch xuống bên trái.
 *
 * CHỦ DỰ ÁN CHỈNH Ở ĐÂY: mở trang `/dev/man-09-lanes` (chạy `pnpm dev:lang-khac-dau`, cổng 5176), bấm chọn điểm trên ảnh, rồi chép khối "MAN09_LANES" xuất ra đè vào dưới đây.
 * Vị trí trên làn là `pos` của logic (0 là cuối đường, 10 là cổng); gà càng xa càng nhỏ (`LANE_SCALE`).
 */
import { CHICKEN_SPEC } from './chickenConfig';

/** Kích thước ảnh nền gốc (điểm ảnh) */
export const MAN09_IMAGE = { width: 1376, height: 768 } as const;

export interface LanePoint2 {
  /** 0 đến 1 từ trái sang phải ảnh */
  u: number;
  /** 0 đến 1 từ trên xuống dưới ảnh */
  v: number;
}

export interface LaneSegment {
  /** Cuối đường (pos = 0), xa người xem */
  top: LanePoint2;
  /** Gần cổng làng (pos = 10) */
  bottom: LanePoint2;
  /** Nửa bề rộng dải đường theo u, ở đầu và ở cuối làn (chỉ để vẽ hình thang làn và kiểm bố cục, không ảnh hưởng đường chạy) */
  half: { top: number; bottom: number };
}

/**
 * Giá trị ban đầu do xem ảnh đặt (đo trên ảnh: hàng rào 1 chạy từ (0, 480) tới (790, 190), hàng rào 2 từ (480, 450) tới (900, 190), hàng rào 3 từ (725, 480) tới (995, 200), hàng rào bên phải ở x chừng 1050 đến 1090):
 * đường giữa của từng dải, từ cuối đường xuống gần cổng.
 */
export const MAN09_LANES: readonly [LaneSegment, LaneSegment, LaneSegment] = [
  { top: { u: 0.55, v: 0.3 }, bottom: { u: 0.25, v: 0.69 }, half: { top: 0.045, bottom: 0.08 } },
  { top: { u: 0.654, v: 0.3 }, bottom: { u: 0.41, v: 0.7 }, half: { top: 0.04, bottom: 0.07 } },
  { top: { u: 0.748, v: 0.3 }, bottom: { u: 0.6, v: 0.69 }, half: { top: 0.04, bottom: 0.08 } },
];

/** Hệ số cỡ hình theo phối cảnh: ở cuối đường (xa) nhỏ, gần cổng cỡ đầy đủ. */
export const LANE_SCALE = { top: 0.38, bottom: 1 } as const;

/** Chuồng gà: cái chòi tre ở mép trái đường (cửa chòi, chỗ gà khỏi bệnh chạy tới), tọa độ chuẩn hóa của ảnh nền */
export const COOP_POINT: LanePoint2 = { u: 0.165, v: 0.47 };

/** Khung thế giới của Scene25D (16 × 9) và kích thước ảnh nền sau khi phủ kín khung kiểu `cover` (cao 9, rộng theo tỉ lệ ảnh, thừa cắt đều hai bên). */
export const WORLD_FRAME = { width: 16, height: 9 } as const;
export const IMAGE_WORLD = {
  width: (WORLD_FRAME.height * MAN09_IMAGE.width) / MAN09_IMAGE.height,
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

const clampLane = (lane: number, lanes: readonly LaneSegment[]): number => Math.min(Math.max(Math.round(lane), 0), lanes.length - 1);

/**
 * Điểm trên làn `lane` ở vị trí `pos` của logic (0 đến 10, kẹp lại ở 1,2 lần chiều dài): tọa độ thế giới và hệ số cỡ. Ghi vào `out` (không cấp phát, dùng được trong useFrame).
 * Nội suy tuyến tính theo `pos` từ cuối đường xuống gần cổng.
 */
export function lanePose(lane: number, pos: number, out: LanePose, lanes: readonly LaneSegment[] = MAN09_LANES): LanePose {
  const seg = lanes[clampLane(lane, lanes)];
  const t = Math.min(Math.max(pos / CHICKEN_SPEC.laneLength, 0), 1.2);
  const u = seg.top.u + (seg.bottom.u - seg.top.u) * t;
  const v = seg.top.v + (seg.bottom.v - seg.top.v) * t;
  out.x = (u - 0.5) * IMAGE_WORLD.width;
  out.y = (0.5 - v) * IMAGE_WORLD.height;
  out.scale = LANE_SCALE.top + (LANE_SCALE.bottom - LANE_SCALE.top) * Math.min(t, 1.1);
  return out;
}

/**
 * Hình thang của làn `lane` từ vị trí `posA` tới `posB` (pos của logic, `posA` < `posB`), bám hai mép dải đường, tọa độ thế giới. Thứ tự đỉnh: trái ở `posA`, phải ở `posA`, phải ở `posB`, trái ở `posB`
 * (y hướng lên nên cạnh `posA` ở phía trên).
 */
export function laneQuad(lane: number, posA: number, posB: number, lanes: readonly LaneSegment[] = MAN09_LANES): [WorldXY, WorldXY, WorldXY, WorldXY] {
  const seg = lanes[clampLane(lane, lanes)];
  const corner = (pos: number, side: -1 | 1): WorldXY => {
    const t = Math.min(Math.max(pos / CHICKEN_SPEC.laneLength, 0), 1.2);
    const u = seg.top.u + (seg.bottom.u - seg.top.u) * t + side * (seg.half.top + (seg.half.bottom - seg.half.top) * t);
    const v = seg.top.v + (seg.bottom.v - seg.top.v) * t;
    return imageToWorld(u, v);
  };
  return [corner(posA, -1), corner(posA, 1), corner(posB, 1), corner(posB, -1)];
}

/** Chữ khối mã để chép vào file này (trang /dev/man-09-lanes xuất ra). */
export function lanesSource(lanes: readonly LaneSegment[]): string {
  const f = (n: number) => (Math.round(n * 1000) / 1000).toString();
  const rows = lanes.map((l) => `  { top: { u: ${f(l.top.u)}, v: ${f(l.top.v)} }, bottom: { u: ${f(l.bottom.u)}, v: ${f(l.bottom.v)} }, half: { top: ${f(l.half.top)}, bottom: ${f(l.half.bottom)} } },`);
  return ['export const MAN09_LANES: readonly [LaneSegment, LaneSegment, LaneSegment] = [', ...rows, '];'].join('\n');
}

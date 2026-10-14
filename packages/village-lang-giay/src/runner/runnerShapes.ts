/**
 * Hình dáng chướng ngại của game chạy (spec 05 Màn 2): từ một `Cell` của `runnerLogic` ra danh sách phần phải vẽ (model có sẵn, phóng theo từng trục để khớp đúng kích thước trong
 * `runnerConfig`; và hộp do code dựng). Hàm thuần, không import three: nơi vẽ đưa vào một `Emitter` (không cấp phát).
 *
 * Kích thước khớp số trong `RUNNER_TUNING` (rộng một làn = 2 × `laneHalfWidth`; cao, dài theo từng loại):
 *  - thấp (cao 0,8): `sap-thap` hoặc đống rơm (hộp do code dựng);
 *  - cao (sào ngang từ 1,0 đến 1,5): do code dựng (hai cột, sào tre, rèm giấy);
 *  - chắn làn (cao 2,5): `xe-bo` chất rơm cao, hoặc ba tầng phên `env/phen-phoi-giay` giữa bốn cột;
 *  - xe chở hàng (nóc cao 0,9, dài `truck.length`): `xe-cho-hang` chỉnh tỉ lệ cho đúng nóc.
 */
import { sizeInScene, sizeOf } from '@so-chung/core/three/modelSizes';
import { RUNNER_SPEC as SPEC, RUNNER_TUNING as T } from './runnerConfig';
import type { Cell } from './runnerLogic';

export type ModelKey = 'sap' | 'xe-bo' | 'xe-cho-hang' | 'phen';
export const MODEL_IDS: Readonly<Record<ModelKey, string>> = {
  sap: 'games/man-02-duoi-ti/sap-thap',
  'xe-bo': 'games/man-02-duoi-ti/xe-bo',
  'xe-cho-hang': 'games/man-02-duoi-ti/xe-cho-hang',
  phen: 'env/phen-phoi-giay',
};

/** Màu hộp ở không gian tuyến tính (r, g, b từ 0 đến 1), dùng cho màu từng bản của InstancedMesh. */
export type BoxColor = readonly [number, number, number];

/** Đổi màu sRGB (0 đến 255) sang tuyến tính để ghi vào màu từng bản (three không tự đổi màu bản nhân). */
export function srgbToLinear(r: number, g: number, b: number): BoxColor {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return [f(r), f(g), f(b)];
}

export const COLORS = {
  tre: srgbToLinear(214, 178, 100),
  treSam: srgbToLinear(150, 108, 58),
  giay: srgbToLinear(244, 238, 220),
  ro: srgbToLinear(222, 184, 92),
  roSam: srgbToLinear(196, 156, 70),
  roNhat: srgbToLinear(236, 204, 120),
  go: srgbToLinear(112, 76, 44),
  trang: srgbToLinear(248, 248, 240),
} as const satisfies Record<string, BoxColor>;

export interface Emitter {
  /** Một bản model: vị trí chân (x, y, z), góc xoay quanh trục đứng, hệ số phóng theo trục model (trước khi xoay) */
  model(key: ModelKey, x: number, y: number, z: number, yaw: number, sx: number, sy: number, sz: number): void;
  /** Một hộp: tâm (x, y, z), kích thước (sx, sy, sz), góc xoay quanh trục đứng, màu */
  box(x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw: number, color: BoxColor): void;
}

const HALF_PI = Math.PI / 2;

/** Khung bao [x, y, z] của model gốc ở hệ số phóng 1 (đo từ file, qua bảng cỡ). */
function dims(key: ModelKey): readonly [number, number, number] {
  const d = sizeInScene(MODEL_IDS[key]);
  if (!d) throw new Error(`Missing model size: ${MODEL_IDS[key]}`);
  return d;
}

/** Rộng một chướng ngại theo làn (bằng làn trừ chút khe để hai chướng ngại cạnh nhau không dính). */
export const OBSTACLE_WIDTH = 2 * T.laneHalfWidth;
/** Rộng xe chở hàng (hơi hẹp hơn làn để chạy trên nóc nhìn rõ mép). */
export const TRUCK_WIDTH = OBSTACLE_WIDTH - 0.2;
/** Cao thân xe bò (phần dưới rơm). */
export const CART_BODY_HEIGHT = 1.0;

/**
 * Đưa mọi phần của một chướng ngại ở làn có tâm x = `laneX` vào `e`. Chiều dọc đường lấy từ chính `cell` (z0, z1), nên hình luôn trùng vùng va chạm.
 */
export function emitCell(cell: Cell, laneX: number, e: Emitter): void {
  const zc = (cell.z0 + cell.z1) / 2;
  const depth = cell.z1 - cell.z0;
  switch (cell.kind) {
    case 'low': {
      if (cell.variant === 1) {
        // đống rơm: một khối thấp hai tầng
        e.box(laneX, T.low.height * 0.3, zc, OBSTACLE_WIDTH * 0.95, T.low.height * 0.6, depth * 0.95, 0, COLORS.ro);
        e.box(laneX, T.low.height * 0.78, zc, OBSTACLE_WIDTH * 0.7, T.low.height * 0.44, depth * 0.7, 0, COLORS.ro);
        return;
      }
      // sạp thấp: trục dài của model là z, xoay 90° cho nằm ngang làn
      const d = dims('sap');
      e.model('sap', laneX, 0, zc, HALF_PI, depth / d[0], T.low.height / d[1], OBSTACLE_WIDTH / d[2]);
      return;
    }
    case 'high': {
      // sào phơi giấy bắc ngang: hai cột, sào tre ở đỉnh, rèm giấy treo xuống tới đáy 1,0
      const h = T.high;
      const post = 0.1;
      e.box(laneX - T.laneHalfWidth + post / 2, h.top / 2, zc, post, h.top + 0.1, post, 0, COLORS.treSam);
      e.box(laneX + T.laneHalfWidth - post / 2, h.top / 2, zc, post, h.top + 0.1, post, 0, COLORS.treSam);
      e.box(laneX, h.top + 0.04, zc, OBSTACLE_WIDTH, 0.08, 0.1, 0, COLORS.tre);
      e.box(laneX, (h.top + h.bottom) / 2, zc, OBSTACLE_WIDTH - 0.3, h.top - h.bottom, Math.min(depth, 0.08), 0, COLORS.giay);
      return;
    }
    case 'block': {
      if (cell.variant === 1) {
        // phên chắn làn: ba tầng phên giấy giữa bốn cột tre, cao đúng bằng chướng ngại
        const d = dims('phen');
        const sx = OBSTACLE_WIDTH / d[0];
        const sz = depth / d[2];
        // model phên tự nhấc lên `lift` (đặt trên giá); ở đây trừ đi để tầng dưới cùng nằm ở độ cao 0,8
        const lift = sizeOf(MODEL_IDS.phen)?.lift ?? 0;
        for (let i = 0; i < 3; i++) e.model('phen', laneX, 0.8 + i * 0.7 - lift, zc, 0, sx, 1, sz);
        const post = 0.1;
        for (const sxn of [-1, 1]) for (const szn of [-1, 1]) e.box(laneX + sxn * (T.laneHalfWidth - post / 2), T.block.height / 2, zc + szn * (depth / 2 - post / 2), post, T.block.height, post, 0, COLORS.treSam);
        return;
      }
      // xe bò chất rơm cao: thân là model, rơm là hộp lên tới đỉnh chướng ngại
      const d = dims('xe-bo');
      e.model('xe-bo', laneX, 0, zc, 0, OBSTACLE_WIDTH / d[0], CART_BODY_HEIGHT / d[1], depth / d[2]);
      // rơm chất thành ba tầng thu nhỏ dần (đống rơm cao), tầng cao nhất chạm đỉnh chướng ngại
      const load = T.block.height - CART_BODY_HEIGHT;
      const tiers: readonly (readonly [number, number, BoxColor])[] = [
        [0.5, 0.88, COLORS.ro],
        [0.3, 0.7, COLORS.roSam],
        [0.2, 0.5, COLORS.roNhat],
      ];
      let y0 = CART_BODY_HEIGHT;
      for (const [share, w, color] of tiers) {
        e.box(laneX, y0 + (load * share) / 2, zc, OBSTACLE_WIDTH * w, load * share, depth * (0.55 + 0.3 * w), 0, color);
        y0 += load * share;
      }
      return;
    }
    case 'truck': {
      // xe chở hàng: trục dài của model là x, xoay 90° cho nằm dọc đường; cao đúng bằng nóc (0,9)
      const d = dims('xe-cho-hang');
      e.model('xe-cho-hang', laneX, 0, zc, HALF_PI, depth / d[0], SPEC.roofHeight / d[1], TRUCK_WIDTH / d[2]);
      return;
    }
  }
}

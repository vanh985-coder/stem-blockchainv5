/**
 * Hình dáng chướng ngại của game chạy (spec 05 Màn 2): từ một `Cell` của `runnerLogic` ra danh sách phần phải vẽ (model có sẵn phóng ĐỀU, và hộp, đống rơm do code dựng).
 * Hàm thuần, không import three: nơi vẽ đưa vào một `Emitter` (không cấp phát). Kích thước khớp số trong `runnerConfig`; mọi model chỉ phóng đều, tỉ lệ giữa các trục lệch tối đa 1,3.
 *
 *  - thấp (cao 0,8): đống rơm (code dựng, hai kiểu). Model `sap-thap` không dùng: phóng đều cho cao 0,8 thì dài 3,0, rộng hơn một làn (1,8).
 *  - cao (sào ngang từ 1,0 đến 1,5): do code dựng (hai cột, sào tre, rèm giấy).
 *  - chắn làn (cao 2,5): `xe-bo` xoay cho con bò ở đầu, quay về phía người chơi chạy tới, thùng xe chất đống rơm cao (code dựng); hoặc ba tầng phên `env/phen-phoi-giay` giữa bốn cột.
 *  - xe chở hàng (nóc cao đúng 0,9): `units` xe `xe-cho-hang` nối đuôi, càng xe quay về phía người chơi, thành một khối chạy trên nóc liên tục.
 *
 * Hướng trong file model (đo từ các điểm của model): `xe-bo` có con bò ở phía x âm (x từ −0,49 tới 0), thùng xe ở phía x dương; `xe-cho-hang` có thùng xe ở phía x âm (x từ −0,49 tới 0,22)
 * và hai càng xe thấp ở phía x dương. Xoay quanh trục đứng một góc θ đưa điểm x về z' = −x·sin θ (cộng z·cos θ), nên θ = +π/2 đưa phía x dương về −z (phía người chơi đang chạy tới)
 * cho xe chở hàng, và θ = −π/2 đưa phía x âm về −z cho xe bò.
 */
import { sizeInScene, sizeOf } from '@so-chung/core/three/modelSizes';
import { RUNNER_SPEC as SPEC, RUNNER_TUNING as T } from './runnerConfig';
import type { Cell } from './runnerLogic';

export type ModelKey = 'xe-bo' | 'xe-cho-hang' | 'phen';
export const MODEL_IDS: Readonly<Record<ModelKey, string>> = {
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
  /** Một đống rơm (hình tròn xoay): chân (x, y, z), bán kính theo x (`rx`) và z (`rz`), chiều cao thật `h`, màu */
  hay(x: number, y: number, z: number, rx: number, h: number, rz: number, color: BoxColor): void;
}

const HALF_PI = Math.PI / 2;

/** Khung bao [x, y, z] của model gốc ở hệ số phóng 1 (đo từ file, qua bảng cỡ). */
function dims(key: ModelKey): readonly [number, number, number] {
  const d = sizeInScene(MODEL_IDS[key]);
  if (!d) throw new Error(`Missing model size: ${MODEL_IDS[key]}`);
  return d;
}

/** Rộng một chướng ngại theo làn. */
export const OBSTACLE_WIDTH = 2 * T.laneHalfWidth;

/** Đo từ file `xe-cho-hang`: thùng xe từ x = −0,49 tới 0,22; kiện hàng cao nhất 0,76; phần x dương là hai càng xe (đầu xe). */
export const TRUCK_MODEL = { bedFront: 0.22, bedLength: 0.71, topY: 0.756 } as const;
/** Đo từ file `xe-bo`: con bò từ x = −0,49 tới 0 (cao 0,33), thùng xe từ 0 tới 0,49 (cao 0,42); cả xe dài 0,98. */
export const CART_MODEL = { cartTop: 0.42, oxTop: 0.33, length: 0.98 } as const;

/** Hệ số phóng đều của xe bò: cả xe dài 0,98 × 2,4 = 2,35 = 2 × `block.halfDepth` (thùng xe rộng 0,5 × 2,4 = 1,2). */
export const CART_SCALE = (2 * T.block.halfDepth) / (sizeInScene(MODEL_IDS['xe-bo'])?.[0] ?? CART_MODEL.length);
/** Độ cao mặt trên thùng xe bò (nơi đống rơm bắt đầu). */
export const CART_TOP = CART_MODEL.cartTop * CART_SCALE;

/**
 * Đưa mọi phần của một chướng ngại ở làn có tâm x = `laneX` vào `e`. Chiều dọc đường lấy từ chính `cell` (z0, z1), nên hình luôn trùng vùng va chạm.
 */
export function emitCell(cell: Cell, laneX: number, e: Emitter): void {
  const zc = (cell.z0 + cell.z1) / 2;
  const depth = cell.z1 - cell.z0;
  switch (cell.kind) {
    case 'low': {
      // đống rơm thấp: kiểu 0 một đống rộng bằng làn, kiểu 1 (rơm {phanDien} ném) hai đống nhỏ cạnh nhau
      if (cell.variant === 1) {
        for (const sx of [-1, 1]) e.hay(laneX + sx * 0.4, 0, zc, 0.45, T.low.height, depth * 0.48, COLORS.ro);
        return;
      }
      e.hay(laneX, 0, zc, OBSTACLE_WIDTH * 0.47, T.low.height, depth * 0.48, COLORS.roNhat);
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
        // phên chắn làn: ba tầng phên giấy giữa bốn cột tre, cao đúng bằng chướng ngại; phóng đều theo bề rộng làn
        const d = dims('phen');
        const k = OBSTACLE_WIDTH / d[0];
        // model phên tự nhấc lên `lift` (đặt trên giá); ở đây trừ đi để tầng dưới cùng nằm ở độ cao 0,8
        const lift = sizeOf(MODEL_IDS.phen)?.lift ?? 0;
        for (let i = 0; i < 3; i++) e.model('phen', laneX, 0.8 + i * 0.7 - lift, zc, 0, k, k, k);
        const post = 0.1;
        const dz = (d[2] * k) / 2;
        for (const sxn of [-1, 1]) for (const szn of [-1, 1]) e.box(laneX + sxn * (T.laneHalfWidth - post / 2), T.block.height / 2, zc + szn * (dz - post / 2), post, T.block.height, post, 0, COLORS.treSam);
        return;
      }
      // xe bò: con bò ở đầu (phía z nhỏ, quay về người chơi), thùng xe phía sau chất đống rơm tới đỉnh chướng ngại
      e.model('xe-bo', laneX, 0, zc, -HALF_PI, CART_SCALE, CART_SCALE, CART_SCALE);
      const rear0 = cell.z0 + cell.frontLen;
      const rearLen = cell.z1 - rear0;
      e.hay(laneX, CART_TOP - 0.05, rear0 + rearLen / 2, T.laneHalfWidth * 0.78, T.block.height - CART_TOP + 0.05, rearLen * 0.5, COLORS.ro);
      return;
    }
    case 'truck': {
      // xe chở hàng: `units` xe nối đuôi, càng xe quay về phía người chơi (z nhỏ); phóng đều theo x, z và theo y cho đỉnh kiện hàng đúng 0,9
      const s = T.truck.scale;
      const sy = SPEC.roofHeight / TRUCK_MODEL.topY;
      const unit = TRUCK_MODEL.bedLength * s;
      for (let i = 0; i < T.truck.units; i++) {
        e.model('xe-cho-hang', laneX, 0, cell.z0 + TRUCK_MODEL.bedFront * s + i * unit, HALF_PI, s, sy, s);
      }
      return;
    }
  }
}

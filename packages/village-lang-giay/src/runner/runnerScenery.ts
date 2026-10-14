/**
 * Cảnh hai bên đường làng cuộn vô tận của game chạy (spec 05 Màn 2): nhà ngói, nhà tranh, bụi tre, phên phơi giấy, lặp lại theo từng đoạn dài 40 đơn vị.
 * Hàm thuần, không import three. Một số mẫu đoạn (sinh một lần từ seed) được dùng lại cho mọi đoạn: đoạn thứ `i` dùng mẫu `i mod n`, đôi khi lật trái phải,
 * nên đường không cần tạo vật mới khi chạy (chỉ ghi lại ma trận của các bản đã có).
 */
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { RUNNER_TUNING as T } from './runnerConfig';

/** Chiều dài một đoạn đường (spec 05: đoạn dài 40 đơn vị). */
export const SEGMENT_LENGTH = 40;
/** Số mẫu đoạn. */
export const TEMPLATE_COUNT = 6;

export type SceneryModel = 'nha-ngoi' | 'nha-tranh' | 'bui-tre';
export const SCENERY_IDS: Readonly<Record<SceneryModel, string>> = {
  'nha-ngoi': 'env/nha-mai-ngoi',
  'nha-tranh': 'env/nha-mai-tranh',
  'bui-tre': 'env/bui-tre',
};

/** Một vật trong mẫu đoạn: x là khoảng lệch ngang (+ là bên trái màn hình), z là vị trí trong đoạn (0 đến 40). */
export type SceneryItem =
  | { kind: 'model'; model: SceneryModel; x: number; z: number; yaw: number; scale: number; /** thứ hạng 0 đến 1: vật có hạng cao hơn `density` của mức chất lượng thì bỏ (máy yếu vẽ ít vật hơn) */ rank: number }
  | { kind: 'rack'; x: number; z: number; yaw: number; rank: number };

/**
 * Mật độ cảnh hai bên theo mức chất lượng (phần các vật được vẽ, 0 đến 1) và số phên mỗi giá phơi (1 đến 4). Nhà bản xa 8.000 tam giác, bụi tre 7.900, phên 8.000 mỗi tấm, nên
 * mức Thấp vẽ ít vật và giá phơi chỉ một phên để giữ dưới 300.000 tam giác (spec 03 mục 2).
 */
export const SCENERY_DENSITY: Readonly<Record<'low' | 'medium' | 'high', { density: number; sheets: number }>> = {
  low: { density: 0.4, sheets: 1 },
  medium: { density: 0.75, sheets: 2 },
  high: { density: 1, sheets: 4 },
};

export interface SceneryTemplate {
  items: readonly SceneryItem[];
}

/** Rộng nửa đường: ngoài khoảng này mới đặt nhà, tre, phên. */
export const ROAD_HALF_WIDTH = 3 * T.laneHalfWidth + 0.4;

/** Phên phơi giấy trên giá: cỡ mỗi phên (rộng, sâu), hai hàng hai phên, bốn chân cao 0,85 (như sân phơi ở làng). */
export const RACK_LEG_HEIGHT = 0.85;

/**
 * Sinh các mẫu đoạn: mỗi bên đường (trái, phải) có 1 đến 2 nhà, 2 bụi tre, và đôi khi một giá phơi giấy sát đường. Vị trí dùng seed nên cùng seed cùng mẫu.
 */
export function buildTemplates(seed: number, count: number = TEMPLATE_COUNT): SceneryTemplate[] {
  const rng = createMulberry32(seed);
  const out: SceneryTemplate[] = [];
  for (let t = 0; t < count; t++) {
    const items: SceneryItem[] = [];
    for (const side of [-1, 1]) {
      const houses = 1 + (rng() < 0.55 ? 1 : 0);
      for (let h = 0; h < houses; h++) {
        const z = (h + 0.5) * (SEGMENT_LENGTH / houses) + (rng() - 0.5) * 6;
        items.push({
          kind: 'model',
          model: rng() < 0.5 ? 'nha-ngoi' : 'nha-tranh',
          x: side * (ROAD_HALF_WIDTH + 5.2 + rng() * 2.4),
          z,
          yaw: -side * (Math.PI / 2) + (rng() - 0.5) * 0.3, // mặt nhà quay ra đường
          scale: 0.95 + rng() * 0.15,
          rank: h === 0 ? 0.2 : 0.7,
        });
      }
      for (let b = 0; b < 2; b++) {
        items.push({ kind: 'model', model: 'bui-tre', x: side * (ROAD_HALF_WIDTH + 2.2 + rng() * 5), z: rng() * SEGMENT_LENGTH, yaw: rng() * Math.PI * 2, scale: 0.9 + rng() * 0.3, rank: b === 0 ? 0.35 : 0.85 });
      }
      if (rng() < 0.55) items.push({ kind: 'rack', x: side * (ROAD_HALF_WIDTH + 2.4 + rng() * 0.6), z: 4 + rng() * (SEGMENT_LENGTH - 8), yaw: rng() < 0.5 ? 0 : Math.PI / 2, rank: 0.45 });
    }
    out.push({ items });
  }
  return out;
}

/** Đoạn `index` dùng mẫu nào và có lật trái phải không (xác định theo chỉ số, không ngẫu nhiên). */
export function templateFor(index: number, count: number = TEMPLATE_COUNT): { template: number; mirror: boolean } {
  const i = ((index % count) + count) % count;
  // băm nhẹ để dãy lật không lặp đều với chu kỳ của dãy mẫu
  const h = Math.imul(index | 0, 2654435761) >>> 0;
  return { template: i, mirror: ((h >>> 16) & 1) === 1 };
}

/** Chỉ số đoạn chứa vị trí z. */
export const segmentOf = (z: number): number => Math.floor(z / SEGMENT_LENGTH);

/** Các đoạn cần vẽ khi nhân vật ở z: từ `behind` mét phía sau tới `ahead` mét phía trước (chỉ số đầu và cuối, gồm cả hai). */
export function segmentRange(z: number, behind: number, ahead: number): { first: number; last: number } {
  return { first: segmentOf(z - behind), last: segmentOf(z + ahead) };
}

export interface SceneryEmitter {
  model(model: SceneryModel, x: number, y: number, z: number, yaw: number, scale: number): void;
  /** Một phên phơi giấy (model `env/phen-phoi-giay` tự nhấc lên giá) */
  sheet(x: number, z: number, yaw: number): void;
  /** Chân giá: hộp cao `RACK_LEG_HEIGHT` */
  leg(x: number, z: number): void;
}

/** Cỡ một phên (rộng theo trục x của model, sâu theo trục z) để xếp 2 × 2 phên trên một giá; khớp `MODEL_SIZES` ('env/phen-phoi-giay'). */
export const SHEET_W = 2.43;
export const SHEET_D = 1.64;

/**
 * Đưa mọi vật của đoạn `index` vào `e`, đã cộng vị trí đoạn (`index × 40`). Không cấp phát (chỉ tính số).
 */
export function emitSegment(index: number, templates: readonly SceneryTemplate[], e: SceneryEmitter, density = 1, sheetsPerRack = 4): void {
  const { template, mirror } = templateFor(index, templates.length);
  const base = index * SEGMENT_LENGTH;
  const sgn = mirror ? -1 : 1;
  const items = templates[template].items;
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it.rank > density) continue;
    const x = it.x * sgn;
    const z = base + it.z;
    if (it.kind === 'model') {
      e.model(it.model, x, 0, z, mirror ? -it.yaw : it.yaw, it.scale);
      continue;
    }
    // giá phơi: 2 × 2 phên trên bốn chân (xoay theo yaw quanh tâm giá)
    const c = Math.cos(it.yaw);
    const s = Math.sin(it.yaw);
    let placed = 0;
    for (let a = -1; a <= 1 && placed < sheetsPerRack; a += 2) {
      for (let b = -1; b <= 1 && placed < sheetsPerRack; b += 2) {
        const lx = a * (SHEET_W / 2 + 0.05);
        const lz = b * (SHEET_D / 2 + 0.05);
        e.sheet(x + lx * c + lz * s, z - lx * s + lz * c, it.yaw);
        placed++;
      }
    }
    for (let a = -1; a <= 1; a += 2) {
      for (let b = -1; b <= 1; b += 2) {
        const lx = a * (SHEET_W + 0.05);
        const lz = b * (SHEET_D + 0.05);
        e.leg(x + lx * c + lz * s, z - lx * s + lz * c);
      }
    }
  }
}

/** Số bản model và số hộp tối đa của một đoạn (để cấp bộ đệm đủ chỗ): đếm theo mẫu có nhiều vật nhất. */
export function segmentCapacity(templates: readonly SceneryTemplate[]): { houses: number; bamboo: number; sheets: number; legs: number } {
  let houses = 0;
  let bamboo = 0;
  let racks = 0;
  for (const t of templates) {
    let h = 0;
    let b = 0;
    let r = 0;
    for (const it of t.items) {
      if (it.kind === 'rack') r++;
      else if (it.model === 'bui-tre') b++;
      else h++;
    }
    houses = Math.max(houses, h);
    bamboo = Math.max(bamboo, b);
    racks = Math.max(racks, r);
  }
  return { houses, bamboo, sheets: racks * 4, legs: racks * 4 };
}

import { createMulberry32 } from '../../../lib/rng';
import { MODEL_BAMBOO, MODEL_HOUSE_THATCH, MODEL_HOUSE_TILE, MODEL_PAPER_RACK, MODEL_TREE, MODEL_WELL, PROP_SIZES, type Placement, type PropKind, type PropPlacement } from '../../cho/marketLayout';
import { footprintRadiusOf } from '../../cho/footprints';
import type { VillageBoardDef, VillageFenceRun, VillageField, VillageGuideDef, VillageLayoutInput, VillagePaths, VillagePond, VillageRoad, VillagerLoop } from '../../village/villageLayout';

/**
 * Bố cục Làng Giấy từ bước W2 (spec 05 mục "Cảnh làng", xếp theo ảnh concept-lang-giay): làng bán kính 35 mở ra phía sau cổng. Chỉ là dữ liệu (không import three), tọa độ như chợ: +Z là phía bắc của làng
 * (người chơi vào cổng nhìn về +Z thì bên phải màn hình là −X). Gốc là tâm làng; cổng ở (0, −35) nên tâm làng cách tâm chợ 72 + 35 = 107.
 *
 * Các khu, nối bằng đường đất nhỏ:
 * - Đại lộ từ cổng (0, −35) lên sân giữa làng, hai bên có nhà và bụi tre.
 * - Khu giữa làng (sân đất ở (0, −7)): ba biển gỗ quay mặt về cổng, bàn chép sổ có cuốn Sổ Chung và bác An ở phía tây.
 * - Xưởng làm giấy (phía đông, +X): sân phơi giấy lớn (14 phên), ba bể ngâm dó, hai bếp nấu dó, ba cối giã dó, chồng giấy thành phẩm trước hai nhà xưởng.
 * - Khu nhà ở (phía tây và dọc đại lộ): 10 nhà ngói và nhà tranh (đổi màu, tỉ lệ, góc xoay), sân, chum vại, rơm, khóm hoa, hàng rào tre ngắn.
 * - Ao làng có bờ cỏ, đình nhỏ quay mặt ra ao, cây đa lớn và giếng ở phía bắc.
 * - Ruộng lúa và bụi tre ở rìa; 3 dân làng đi lại giữa các khu.
 */

// ---------------------------------------------------------------------------
// Hằng và hàm giúp

export const GIAY_RADIUS = 35;
/** Cổng cách tâm làng bấy nhiêu (về phía nam). */
export const GIAY_GATE_Z = -35;
const FENCE_RADIUS = 36.5;
/** Đồ không được vượt qua bán kính này (tính cả cỡ chân): còn chừa chỗ cho hàng rào. */
const KEEP_INSIDE = 34.4;
/** Bụi tre ở rìa được lấn sát hàng rào hơn (tán lá mảnh, vật cản tre chỉ ở thân). */
const KEEP_INSIDE_BAMBOO = 35.5;

const tile = (x: number, z: number, face: readonly [number, number], scale: number, tint: readonly [number, number, number], twist = 0): Placement => house(MODEL_HOUSE_TILE, x, z, face, scale, tint, twist);
const thatch = (x: number, z: number, face: readonly [number, number], scale: number, tint: readonly [number, number, number], twist = 0): Placement => house(MODEL_HOUSE_THATCH, x, z, face, scale, tint, twist);

/** Nhà đặt ở (x, z), mặt trước (+Z của model) quay về điểm `face`, xoay thêm `twist`. */
function house(model: string, x: number, z: number, face: readonly [number, number], scale: number, tint: readonly [number, number, number], twist: number): Placement {
  return { model, x, z, yaw: Math.atan2(face[0] - x, face[1] - z) + twist, scale, tint };
}

const rack = (x: number, z: number, yaw = 0): Placement => ({ model: MODEL_PAPER_RACK, x, z, yaw, scale: 1, tint: [1, 1, 1] });
const prop = (kind: PropKind, x: number, z: number, yaw = 0, scale = 1, tint: readonly [number, number, number] = [1, 1, 1]): PropPlacement => ({ kind, x, z, yaw, scale, tint });

// ---------------------------------------------------------------------------
// Khu giữa làng: sân, ba biển gỗ, bác An và bàn chép sổ

const BOARDS: VillageBoardDef[] = [
  { level: 1, icon: 'ui/icons/trang-vang', x: 4.6, z: -10, yaw: Math.PI },
  { level: 2, icon: 'ui/icons/guoc-moc', x: 0, z: -8.8, yaw: Math.PI },
  { level: 3, icon: 'ui/icons/ngoi-sao', x: -4.6, z: -10, yaw: Math.PI },
];
const DESK = { x: -6.5, z: -0.5, yaw: 0.3 };
const GUIDE: VillageGuideDef = { character: 'bacAn', x: -6.7, z: 1.2, yaw: Math.PI };

// ---------------------------------------------------------------------------
// Xưởng làm giấy

/** Sân phơi giấy chính: 4 cột × 2 hàng ở phía đông đại lộ, rồi 3 × 2 phên ở phía bắc đường ngang. Mỗi phên 4 chân giá. */
const RACKS: Placement[] = [
  ...[13.5, 16.7, 19.9, 23.1].flatMap((x, i) => [-11.6, -8.4].map((z, j) => rack(x + (j ? 0.06 : 0), z, (i + j) % 2 ? 0.04 : -0.03))),
  ...[9.5, 12.7, 15.9].flatMap((x, i) => [0.5, 3.7].map((z, j) => rack(x, z + (i === 1 ? 0.06 : 0), (i + j) % 2 ? -0.05 : 0.04))),
];

const RACK_LEGS: readonly (readonly [number, number])[] = [
  [-1.0, -0.6],
  [-1.0, 0.6],
  [1.0, -0.6],
  [1.0, 0.6],
];
const rackLegs: PropPlacement[] = RACKS.flatMap((r) =>
  RACK_LEGS.map(([lx, lz]) => {
    const c = Math.cos(r.yaw);
    const s = Math.sin(r.yaw);
    return prop('chan', r.x + lx * c + lz * s, r.z - lx * s + lz * c);
  }),
);

const WORKSHOP_PROPS: PropPlacement[] = [
  // ba bể ngâm dó (đá, có mặt nước)
  ...[10.5, 14.2, 17.9].flatMap((x) => [prop('be-ngam', x, 12.5), prop('nuoc', x, 12.5)]),
  // hai bếp nấu dó
  prop('bep-do', 22.4, 11.4, -0.3),
  prop('bep-do', 22.6, 15.4, 0.2),
  // ba cối giã dó
  prop('coi-gia', 11.5, 17.2, 0.1),
  prop('coi-gia', 15.2, 17.7, -0.12),
  prop('coi-gia', 18.9, 17.3, 0.15),
  // chồng giấy thành phẩm: cạnh sân phơi, bể ngâm và trước hai nhà xưởng
  prop('giay', 25.6, -2.2, 0.4),
  prop('giay', 26.4, -0.9, -0.2),
  prop('giay', 8.4, 9.2, 0.3),
  prop('giay', 20.6, 18.4, 0.5),
  prop('giay', 16.2, 20.9, -0.4),
  prop('giay', 24.4, 7.0, 0.2),
  prop('giay', 25.2, 8.3, -0.3),
  prop('giay', 9.0, 7.0, 0.1),
  // chum vại và đống rơm cạnh xưởng
  prop('chum', 8.2, 13.8, 0, 1.05),
  prop('chum', 20.8, 12.8, 0, 0.95),
  prop('rom', 25.5, 18.6, 0.4, 0.95),
];

// ---------------------------------------------------------------------------
// Nhà ở: 10 nhà ngói và nhà tranh dọc đại lộ và hai bên đường ngang phía tây; 2 nhà xưởng ở phía đông

const HOUSES: Placement[] = [
  // dọc đại lộ (mặt quay ra đại lộ)
  tile(-12.5, -27, [0, -27], 1.05, [1, 0.97, 0.94], 0.12),
  thatch(12, -28.5, [0, -28.5], 0.98, [1, 0.98, 0.92], -0.1),
  tile(21, -23, [8, -19], 0.95, [0.98, 1, 1], 0.1),
  // đường ngang phía tây: nhà phía nam quay về phía bắc, nhà phía bắc quay về phía nam
  tile(-14, -10, [-14, -3.5], 1.0, [1, 0.97, 0.94]),
  thatch(-23.5, -10, [-23.5, -3.5], 0.94, [0.96, 0.96, 0.94], 0.15),
  tile(-23.5, 3, [-23.5, -3.5], 1.08, [0.98, 1, 1], -0.12),
  thatch(-14.5, 4, [-14.5, -3.5], 1.0, [1, 0.98, 0.92], 0.1),
  tile(-18, 11.8, [-10, 8], 0.96, [1, 0.97, 0.9], 0.2),
  thatch(-27, 12.5, [-19, 8], 1.02, [0.96, 0.96, 0.94], -0.1),
  tile(-22, -19.5, [-14, -12], 0.97, [0.97, 0.99, 1], 0.1),
  // hai nhà xưởng (phía đông)
  tile(21, 23, [17, 17], 1.05, [1, 0.96, 0.9], 0.08),
  thatch(27.2, 3.5, [20, 3], 1.0, [1, 0.97, 0.9], -0.05),
];

// ---------------------------------------------------------------------------
// Ao, đình, cây đa, giếng

const PONDS: VillagePond[] = [
  { x: -9, z: 20.5, r: 4.8 },
  { x: -14.2, z: 19.2, r: 3.2 },
  { x: -4.2, z: 22.2, r: 3 },
];
const PAVILION = prop('dinh', -7, 30.2, Math.PI);
const TREE: Placement = { model: MODEL_TREE, x: 11.5, z: 28, yaw: 0.6, scale: 0.5, tint: [1, 1, 1] };
const WELL: Placement = { model: MODEL_WELL, x: -2.5, z: 9.5, yaw: 0.5, scale: 1, tint: [1, 1, 1] };

// ---------------------------------------------------------------------------
// Ruộng lúa, hàng rào ngắn, đường đất

const FIELDS: VillageField[] = [
  { x: -29.2, z: -2, hx: 2.6, hz: 7.5, yaw: 0.05 },
  { x: -21, z: 26.5, hx: 3.5, hz: 2.6, yaw: 0.55 },
  { x: 30, z: -9.5, hx: 2.4, hz: 6.5, yaw: -0.05 },
  { x: 2, z: 31.8, hx: 3.6, hz: 1.8, yaw: 0 },
];

const FENCE_RUNS: VillageFenceRun[] = [
  { x0: -28, z0: -1.6, x1: -20.5, z1: -1.6 },
  { x0: -17.4, z0: -1.6, x1: -11.2, z1: -1.6 },
  { x0: 28.6, z0: -5, x1: 28.6, z1: 0.5 },
  { x0: 6.4, z0: 14.8, x1: 6.4, z1: 22.5 },
];

const ROADS: VillageRoad[] = [
  { x0: 0, z0: -36.5, x1: 0, z1: -9, width: 4.4 }, // đại lộ từ cổng
  { x0: -28, z0: -3.5, x1: 27, z1: -3.5, width: 2.4 }, // đường ngang: phía tây tới khu nhà ở, phía đông tới xưởng
  { x0: 0, z0: -3.5, x1: 2.5, z1: 8, width: 2.4 }, // đường lên phía bắc
  { x0: 2.5, z0: 8, x1: 2.5, z1: 26, width: 2.4 },
  { x0: 2.5, z0: 8, x1: 12, z1: 10.2, width: 2.2 }, // vào sân xưởng
  { x0: -19, z0: -3.5, x1: -19, z1: 7.5, width: 2.2 }, // lối vào nhà ở phía bắc đường ngang
  { x0: 0, z0: -3.5, x1: -4.9, z1: 1.2, width: 2.2 }, // tới bác An
];

const YARDS = [
  { x: 0, z: -7, r: 8.5 }, // sân giữa làng
  { x: 17, z: 14, r: 9.5 }, // sân xưởng
  { x: 18, z: -10, r: 8.8 }, // sân phơi giấy
  { x: 8, z: 1.5, r: 5.5 },
  { x: -7, z: 29.5, r: 6.2 }, // sân đình
  { x: -19, z: 3, r: 6 }, // sân nhà ở phía tây
  { x: -19, z: -9, r: 6 },
];

// ---------------------------------------------------------------------------
// Dân làng và đường nhỏ cho mũi tên

const VILLAGERS: VillagerLoop[] = [
  // bà cụ quanh sân giữa làng và đại lộ
  [
    [-2.3, -30],
    [-2.3, -16.5],
    [-9.2, -13],
    [-9.4, -6.5],
    [-2.3, -6.2],
  ],
  // chú nông dân giữa sân phơi giấy và khu nhà ở
  [
    [7, -3.5],
    [25, -3.5],
    [12, -3.5],
    [-12, -3.5],
    [-25, -3.5],
  ],
  // bà cụ dọc đường lên ao, đình
  [
    [3.9, 9],
    [3.9, 24],
    [0.8, 12],
    [-0.5, 16],
  ],
];

const NODES: VillagePaths['nodes'] = [
  { id: 'A', x: 0, z: -24 },
  { id: 'S', x: 0, z: -14 },
  { id: 'W1', x: 2.3, z: -10.4 },
  { id: 'W2', x: 2.3, z: -6 },
  { id: 'C', x: 0, z: -3.5 },
  { id: 'E', x: 9, z: -3.5 },
  { id: 'W', x: -12, z: -3.5 },
  { id: 'N', x: 2.5, z: 12 },
];
const PATHS: VillagePaths = {
  nodes: NODES,
  links: [
    ['A', 'S'],
    ['S', 'W1'],
    ['W1', 'W2'],
    ['W2', 'C'],
    ['C', 'E'],
    ['C', 'W'],
    ['C', 'N'],
  ],
  entry: 'A',
  boardJoin: 'S',
  guideStand: { x: -4.9, z: 1.2, join: 'C' },
};

// ---------------------------------------------------------------------------
// Bụi tre, hoa, chum, rơm: rải có hạt giống, tránh mọi thứ đã đặt

interface Spot {
  x: number;
  z: number;
  r: number;
}

function anchors(): Spot[] {
  const out: Spot[] = [];
  for (const p of [...HOUSES, ...RACKS, TREE, WELL]) out.push({ x: p.x, z: p.z, r: footprintRadiusOf(p.model) * p.scale });
  for (const p of [...WORKSHOP_PROPS, PAVILION]) {
    if (p.kind === 'chan' || p.kind === 'nuoc') continue;
    out.push({ x: p.x, z: p.z, r: PROP_SIZES[p.kind].r * p.scale });
  }
  for (const b of BOARDS) out.push({ x: b.x, z: b.z, r: 1.4 });
  out.push({ x: DESK.x, z: DESK.z, r: 1.4 }, { x: GUIDE.x, z: GUIDE.z, r: 1 });
  for (const p of PONDS) out.push({ x: p.x, z: p.z, r: p.r + 1.4 });
  return out;
}

/** Khoảng cách từ (x, z) tới đoạn đường đất (bằng 0 nếu nằm trên đường). */
function distToRoad(x: number, z: number, r: VillageRoad): number {
  const dx = r.x1 - r.x0;
  const dz = r.z1 - r.z0;
  const t = Math.max(0, Math.min(1, ((x - r.x0) * dx + (z - r.z0) * dz) / (dx * dx + dz * dz)));
  return Math.max(0, Math.hypot(x - (r.x0 + dx * t), z - (r.z0 + dz * t)) - r.width / 2);
}

/** Khoảng cách từ (x, z) tới đoạn thẳng (ax, az)-(bx, bz). */
function distToSegment(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

/** Khoảng cách tới lối đi của dân làng và tới các đoạn đường nhỏ của mũi tên: đồ rải ngẫu nhiên không được chắn các lối này. */
function distToLanes(x: number, z: number): number {
  let best = Infinity;
  for (const loop of VILLAGERS) for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    best = Math.min(best, distToSegment(x, z, a[0], a[1], b[0], b[1]));
  }
  const byId = new Map(NODES.map((n) => [n.id, n]));
  for (const [p, q] of PATHS.links) {
    const a = byId.get(p)!;
    const b = byId.get(q)!;
    best = Math.min(best, distToSegment(x, z, a.x, a.z, b.x, b.z));
  }
  return best;
}

function fillers(): { placements: Placement[]; props: PropPlacement[] } {
  const rng = createMulberry32(20260110);
  const taken = anchors();
  const placements: Placement[] = [];
  const props: PropPlacement[] = [];
  const onGround = (x: number, z: number, r: number, limit: number = KEEP_INSIDE) => {
    if (Math.hypot(x, z) + r > limit) return false;
    if (Math.hypot(x - 0, z - GIAY_GATE_Z) < 9) return false; // lối quanh cổng
    for (const t of taken) if (Math.hypot(x - t.x, z - t.z) < t.r + r + 0.4) return false;
    for (const rd of ROADS) if (distToRoad(x, z, rd) < r + 0.6) return false;
    if (distToLanes(x, z) < r + 1.0) return false;
    for (const f of FIELDS) if (Math.abs(x - f.x) < f.hx + r && Math.abs(z - f.z) < f.hz + r && Math.hypot(x - f.x, z - f.z) < Math.hypot(f.hx, f.hz) + r) return false;
    if (Math.hypot(x, z + 7) < 8.5 + r) return false; // sân giữa làng để trống
    return true;
  };
  const put = <T extends Placement | PropPlacement>(list: T[], item: T, r: number, limit: number = KEEP_INSIDE): boolean => {
    if (!onGround(item.x, item.z, r, limit)) return false;
    list.push(item);
    taken.push({ x: item.x, z: item.z, r });
    return true;
  };
  // bụi tre quanh rìa (trừ chỗ cổng): mỗi bụi cách đều theo góc, lệch ngẫu nhiên
  const bambooR = footprintRadiusOf(MODEL_BAMBOO);
  for (let a = 0; a < 40; a++) {
    const ang = (a / 40) * Math.PI * 2 + rng() * 0.1;
    const scale = 0.62 + rng() * 0.2;
    const rad = KEEP_INSIDE_BAMBOO - bambooR * scale - rng() * 0.8;
    put(placements, { model: MODEL_BAMBOO, x: Math.cos(ang) * rad, z: Math.sin(ang) * rad, yaw: rng() * Math.PI * 2, scale, tint: [0.96, 0.98, 0.94] }, bambooR * scale, KEEP_INSIDE_BAMBOO);
  }
  // lượt hai: lấp chỗ trống ở rìa bằng bụi nhỏ hơn
  for (let a = 0; a < 90; a++) {
    const ang = rng() * Math.PI * 2;
    const scale = 0.48 + rng() * 0.14;
    const rad = KEEP_INSIDE_BAMBOO - bambooR * scale - rng() * 1.5;
    put(placements, { model: MODEL_BAMBOO, x: Math.cos(ang) * rad, z: Math.sin(ang) * rad, yaw: rng() * Math.PI * 2, scale, tint: [0.96, 0.98, 0.94] }, bambooR * scale, KEEP_INSIDE_BAMBOO);
  }
  // vài bụi tre trong làng: dọc đại lộ và cạnh nhà
  const inner: [number, number][] = [
    [-8, -33],
    [8.5, -32],
    [-17, -22],
    [15, -18],
    [-27, -14],
    [7, 24],
    [-3, 28.5],
    [24, 29],
  ];
  for (const [x, z] of inner) {
    const scale = 0.85 + rng() * 0.2;
    put(placements, { model: MODEL_BAMBOO, x, z, yaw: rng() * Math.PI * 2, scale, tint: [0.96, 0.98, 0.94] }, bambooR * scale);
  }
  // quanh mỗi nhà: khóm hoa, chum vại, đôi khi đống rơm
  for (const h of HOUSES) {
    const hr = footprintRadiusOf(h.model) * h.scale;
    for (let k = 0; k < 3; k++) {
      for (let tries = 0; tries < 12; tries++) {
        const a = rng() * Math.PI * 2;
        const d = hr + 0.9 + rng() * 1.3;
        const x = h.x + Math.cos(a) * d;
        const z = h.z + Math.sin(a) * d;
        const shade = 0.9 + rng() * 0.1;
        if (k === 0 && put(props, prop('hoa', x, z, 0, 0.95 + rng() * 0.3, [shade, shade - 0.02, shade]), 0.5)) break;
        if (k === 1 && put(props, prop('chum', x, z, 0, 0.9 + rng() * 0.2), PROP_SIZES.chum.r)) break;
        if (k === 2 && rng() < 0.45 && put(props, prop('rom', x, z, rng() * 3, 0.85 + rng() * 0.2), PROP_SIZES.rom.r * 0.9)) break;
        if (k === 2 && rng() >= 0.45) break;
      }
    }
  }
  // khóm hoa dọc đại lộ và quanh bờ ao
  for (let i = 0; i < 12; i++) {
    const z = -33 + i * 2;
    const side = i % 2 ? 1 : -1;
    put(props, prop('hoa', side * (3.6 + rng() * 0.8), z, 0, 0.95 + rng() * 0.25, [0.93, 0.93, 0.9]), 0.5);
  }
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2;
    const p = PONDS[i % PONDS.length];
    put(props, prop('hoa', p.x + Math.cos(a) * (p.r + 1.9), p.z + Math.sin(a) * (p.r + 1.9), 0, 1, [0.92, 0.94, 0.9]), 0.5);
  }
  return { placements, props };
}

const FILL = fillers();

const PLACEMENTS: Placement[] = [...HOUSES, TREE, WELL, ...RACKS, ...FILL.placements];

const PROPS: PropPlacement[] = [
  // bàn chép sổ và cuốn Sổ Chung bìa tím trên bàn
  prop('ban-chep', DESK.x, DESK.z, DESK.yaw),
  prop('so-chung', DESK.x, DESK.z, DESK.yaw),
  ...WORKSHOP_PROPS,
  PAVILION,
  ...rackLegs,
  ...FILL.props,
];

export const LANG_GIAY_LAYOUT: VillageLayoutInput & { guide: VillageGuideDef } = {
  id: 'lang-giay',
  radius: GIAY_RADIUS,
  gate: { model: 'env/cong-lang-giay', x: 0, z: GIAY_GATE_Z, yaw: Math.PI },
  start: { x: 0, z: -14.5, yaw: 0 },
  placements: PLACEMENTS,
  props: PROPS,
  boards: BOARDS,
  guide: GUIDE,
  yards: YARDS,
  roads: ROADS,
  fence: { radius: FENCE_RADIUS, gap: 6.5 },
  ponds: PONDS,
  fields: FIELDS,
  fenceRuns: FENCE_RUNS,
  villagers: VILLAGERS,
  paths: PATHS,
  seed: 20260106,
};

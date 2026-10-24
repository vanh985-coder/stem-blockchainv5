import { createMulberry32 } from '../../../lib/rng';
import { MODEL_STALL, MODEL_TREE, MODEL_WELL, type Placement, type PropPlacement } from '../../cho/marketLayout';
import { type ScatterPlacement } from '../../village/scatter';
import type { VillageBoardDef, VillageField, VillageGuideDef, VillageLayoutInput, VillagePaths, VillagePond, VillageRoad, VillageScroll, VillagerLoop } from '../../village/villageLayout';
import { createFiller, placementSpots, propSpots, prop, scatter, scatterSpots, thatch, tile, type Spot } from './villageKit';

/**
 * Bố cục Làng Giấy từ bước X3 (spec 05 mục "Cảnh làng", xếp theo ảnh concept-lang-giay): làng bán kính 125 mở ra phía sau cổng, bao quanh bằng lũy tre. Chỉ là dữ liệu (không import three), tọa độ như chợ:
 * +Z là phía bắc của làng (người chơi vào cổng nhìn về +Z thì bên phải màn hình là −X). Gốc là tâm làng; cổng ở (0, −125) nên tâm làng cách tâm chợ 72 + 125 = 197. Cùng đầu vào cùng kết quả.
 *
 * Các khu, nối bằng đường làng (đường gạch ở đại lộ và quanh sân, đường đất ở ngõ):
 * - Đại lộ gạch từ cổng lên khu trung tâm (sân giữa làng ở (0, −88): ba biển gỗ, bàn chép sổ, bác An) rồi thành trục đường đất chạy lên đình;
 * - Xưởng làm giấy (đông nam): sân phơi lớn 40 phên, hai hàng bể ngâm dó, bếp nấu, cối giã, ba nhà xưởng, chồng giấy; thẻ "Em có biết?" số 1;
 * - Đình làng (bắc): đình và sân đình, hai cây đa, giếng; thẻ số 2;
 * - Ao làng lớn (tây bắc): bốn vũng nối nhau, cầu ao nhô ra mặt nước, cây ăn quả quanh bờ; thẻ số 3;
 * - Chợ làng nhỏ (đông): năm lều quanh sân chợ; thẻ số 4;
 * - Khu nhà ở (tây): ba ngõ dọc đường đất, 22 nhà hai bên, thêm nhà dọc đại lộ, cạnh ao và cạnh đình; giếng ngã ba; vườn cây ăn quả;
 * - Rìa làng: ruộng lúa, đồi tre (đồi nhỏ có bụi tre quanh chân), lũy tre bao quanh;
 * - 6 dân làng đi lại giữa các khu.
 */

// ---------------------------------------------------------------------------
// Hằng và hàm giúp

export const GIAY_RADIUS = 125;
/** Cổng cách tâm làng bấy nhiêu (về phía nam). */
export const GIAY_GATE_Z = -125;
/** Lũy tre: tâm các bụi nằm ở bán kính này (vật cản là chuỗi hộp ở cùng bán kính). */
export const GIAY_WALL_RADIUS = 122;
/** Đồ không được vượt qua bán kính này (tính cả cỡ chân): còn chừa chỗ cho lũy tre. */
const KEEP_INSIDE = 118;

// ---------------------------------------------------------------------------
// Khu trung tâm: sân giữa làng, ba biển gỗ, bác An và bàn chép sổ

const PLAZA = { x: 0, z: -88 };
const BOARDS: VillageBoardDef[] = [
  { level: 1, icon: 'ui/icons/trang-vang', x: 4.6, z: -93.5, yaw: Math.PI },
  { level: 2, icon: 'ui/icons/guoc-moc', x: 0, z: -92.3, yaw: Math.PI },
  { level: 3, icon: 'ui/icons/ngoi-sao', x: -4.6, z: -93.5, yaw: Math.PI },
];
const DESK = { x: -7.5, z: -85.5, yaw: 0.3 };
const GUIDE: VillageGuideDef = { character: 'bacAn', x: -7.7, z: -83.7, yaw: Math.PI };

// ---------------------------------------------------------------------------
// Xưởng làm giấy (đông nam)

/** Sân phơi lớn: 8 cột × 5 hàng = 40 phên (dựng bằng code), phía nam đường xưởng. */
const RACK_X = [44.4, 50, 55.6, 61.2, 66.8, 72.4, 78, 83.6];
const RACK_Z = [-84, -79, -74, -69, -64];
const RACKS: ScatterPlacement[] = RACK_Z.flatMap((z, j) => RACK_X.map((x, i) => scatter('phen', x + ((i + j) % 3 === 0 ? 0.08 : -0.05), z, 1, (i + j) % 2 ? 0.03 : -0.03, [1, 1, 1])));

const SOAK_X = [44, 52, 60, 68];
const WORKSHOP_PROPS: PropPlacement[] = [
  // 8 bể ngâm dó (đá, có mặt nước) thành hai hàng
  ...[-42, -34].flatMap((z) => SOAK_X.flatMap((x) => [prop('be-ngam', x, z), prop('nuoc', x, z)])),
  // 4 bếp nấu dó
  prop('bep-do', 78, -44, -0.3),
  prop('bep-do', 84, -44, 0.2),
  prop('bep-do', 78, -36, 0.1),
  prop('bep-do', 84, -36, -0.2),
  // 5 cối giã dó
  ...[46, 54, 62, 70, 78].map((x, i) => prop('coi-gia', x, -24, i % 2 ? -0.12 : 0.1)),
  // chồng giấy thành phẩm: cạnh sân phơi, bể ngâm, nhà xưởng
  prop('giay', 88.4, -64, 0.4),
  prop('giay', 89.4, -62.6, -0.2),
  prop('giay', 41.5, -62.5, 0.3),
  prop('giay', 40.6, -78.6, -0.3),
  prop('giay', 88.8, -80.5, 0.2),
  prop('giay', 87.7, -29.4, 0.2),
  prop('giay', 41.2, -29, 0.4),
  prop('giay', 49, -19.4, -0.4),
  prop('giay', 74, -19.4, 0.1),
  prop('giay', 94.8, -41.4, 0.5),
  prop('giay', 36.6, -86.8, -0.2),
  prop('giay', 80, -89.6, 0.3),
  // chum vại và đống rơm cạnh xưởng
  prop('chum', 40.8, -33.5, 0, 1.05),
  prop('chum', 72, -29.5, 0, 0.95),
  prop('chum', 91, -33, 0, 1),
  prop('rom', 90, -20, 0.4, 0.95),
  prop('rom', 38, -22, 0.2, 1),
];

// ---------------------------------------------------------------------------
// Khu nhà ở (tây), nhà dọc đại lộ, cạnh ao và cạnh đình

/** Ba ngõ ngang ở phía tây: z của tim ngõ. Nhà hai bên ngõ, quay mặt vào ngõ. */
const LANES = [-66, -34, -6];
const LANE_END = -96;
/** Cột x của các nhà trên mỗi hàng (mỗi hàng bỏ bớt vài nhà theo `SKIP` để làng thưa không đều). */
const ROW_X = [-22, -35.5, -49, -62.5, -76];
const ROW_OFFSET = 8;
const SKIP = new Set(['0:-1:4', '0:1:3', '1:1:2', '2:-1:3', '2:1:0', '2:1:4']); // lane:side:cột

function westHouses(): Placement[] {
  const rng = createMulberry32(20260111);
  const out: Placement[] = [];
  LANES.forEach((laneZ, li) => {
    for (const side of [-1, 1]) {
      ROW_X.forEach((x0, ci) => {
        if (SKIP.has(`${li}:${side}:${ci}`)) return;
        const jx = (rng() - 0.5) * 3;
        const jz = (rng() - 0.5) * 1.6;
        const scale = 0.94 + rng() * 0.14;
        const shade = 0.94 + rng() * 0.06;
        const tint: [number, number, number] = [shade, shade - 0.01 * (ci % 3), shade - 0.03 * (li % 2)];
        const twist = (rng() - 0.5) * 0.24;
        const x = x0 + jx;
        const z = laneZ + side * (ROW_OFFSET + jz);
        const make = (li + ci + (side > 0 ? 1 : 0)) % 3 === 1 ? thatch : tile;
        out.push(make(x, z, [x, laneZ], scale, tint, twist));
      });
    }
  });
  return out;
}

const OTHER_HOUSES: Placement[] = [
  // dọc đại lộ, hai bên (mặt quay ra đại lộ)
  tile(-15, -110, [0, -110], 1.05, [1, 0.97, 0.94], 0.1),
  thatch(15.5, -108, [0, -108], 0.98, [1, 0.98, 0.92], -0.12),
  thatch(-16, -99, [0, -99], 0.96, [0.97, 0.97, 0.94], 0.08),
  tile(16.5, -99, [0, -99], 1, [0.98, 1, 1], -0.1),
  // cạnh ao
  tile(-40, 56, [-52, 46], 1, [1, 0.97, 0.94], 0.12),
  thatch(-44, 28, [-52, 38], 1.02, [0.98, 0.98, 0.94], -0.1),
  tile(-72, 70, [-68, 56], 1.04, [1, 0.98, 0.92], 0.1),
  // cạnh đình
  thatch(24, 46, [4, 56], 1, [0.98, 0.97, 0.92], 0.1),
  tile(-22, 31, [-2, 40], 0.97, [0.97, 0.99, 1], -0.08),
];

/** Ba nhà xưởng ở khu xưởng giấy (to hơn nhà thường). */
const WORKSHOP_HOUSES: Placement[] = [tile(95, -30, [80, -30], 1.32, [1, 0.96, 0.9], 0.08), thatch(92, -70, [86, -70], 1.28, [1, 0.97, 0.9], -0.05), tile(34, -72, [46, -72], 1.3, [0.98, 0.97, 0.94], 0.06)];

const HOUSES: Placement[] = [...westHouses(), ...OTHER_HOUSES, ...WORKSHOP_HOUSES];

// ---------------------------------------------------------------------------
// Đình, cây đa, giếng, chợ làng, ao

const PAVILION = prop('dinh', 0, 72, Math.PI);
const TREES: Placement[] = [
  { model: MODEL_TREE, x: -26, z: 70, yaw: 0.6, scale: 0.5, tint: [1, 1, 1] },
  { model: MODEL_TREE, x: 27, z: 67, yaw: 2.2, scale: 0.42, tint: [1, 1, 1] },
  { model: MODEL_TREE, x: 17, z: -92, yaw: 1.1, scale: 0.4, tint: [1, 1, 1] },
];
const WELLS: Placement[] = [
  { model: MODEL_WELL, x: -12, z: 52, yaw: 0.5, scale: 1, tint: [1, 1, 1] },
  { model: MODEL_WELL, x: -44, z: -50, yaw: 2.4, scale: 1, tint: [1, 1, 1] },
];

const MARKET = { x: 72, z: 24 };
const m = (dx: number, dz: number): [number, number] => [MARKET.x + dx, MARKET.z + dz];
const STALL_SPOTS: readonly (readonly [number, number])[] = [m(10.5, 0), m(5, 9), m(-5, 9), m(5, -9), m(-5, -9)];
const STALLS: Placement[] = STALL_SPOTS.map(([x, z], i) => ({ model: MODEL_STALL, x, z, yaw: Math.atan2(MARKET.x - x, MARKET.z - z) + (i % 2 ? 0.1 : -0.1), scale: 1, tint: [1, 0.98 - (i % 3) * 0.03, 0.95] as const }));
const MARKET_PROPS: PropPlacement[] = [
  prop('vai', ...m(7.5, 5), 0, 1, [0.9, 0.35, 0.3]),
  prop('vai', ...m(8.3, 5.4), 0, 1, [0.3, 0.55, 0.85]),
  prop('vai', ...m(-7.2, 5.2), 0, 1, [0.95, 0.8, 0.3]),
  prop('thung', ...m(-1.5, 11.8), 0, 1),
  prop('thung', ...m(1.4, 12), 0.4, 1),
  prop('hom', ...m(-8, -5.6), 0.3, 1),
  prop('hom', ...m(8, -5.2), -0.2, 1),
  prop('chum', ...m(14.4, 3.2), 0, 1),
  prop('chum', ...m(-8.5, 12), 0, 0.95),
  prop('rom', ...m(15.5, -6), 0.5, 0.9),
  prop('ban-da', ...m(0, 5.5), 0.1, 0.9),
  prop('giay', ...m(-3.6, -4.8), 0.4),
  prop('giay', ...m(3.6, -5.2), -0.3),
];

const PONDS: VillagePond[] = [
  { x: -68, z: 40, r: 16 },
  { x: -86, z: 50, r: 11 },
  { x: -58, z: 58, r: 9 },
  { x: -80, z: 28, r: 9 },
];
const JETTY = scatter('cau-ao', -50.2, 40, 1, 0);

// ---------------------------------------------------------------------------
// Thẻ "Em có biết?": 4 thẻ ở 4 khu cách xa nhau

const SCROLLS: VillageScroll[] = [
  { index: 0, x: 56, z: -38, zone: 'xuong' },
  { index: 1, x: 8.5, z: 66, zone: 'dinh' },
  { index: 2, x: -48.8, z: 40, zone: 'ao' },
  { index: 3, x: 72, z: 24, zone: 'cho' },
];

// ---------------------------------------------------------------------------
// Ruộng lúa, hàng rào ngắn, đường

const FIELDS: VillageField[] = [
  { x: -97, z: -42, hx: 6, hz: 15, yaw: 0.04 },
  { x: -98, z: 30, hx: 5.5, hz: 13, yaw: -0.04 },
  { x: 98, z: 19, hx: 6, hz: 10.5, yaw: 0.03 },
  { x: 46, z: -97, hx: 9, hz: 5, yaw: 0 },
  { x: -46, z: -97, hx: 9, hz: 5, yaw: 0.02 },
  { x: 66, z: 86, hx: 8, hz: 5, yaw: -0.05 },
];

const ROADS: VillageRoad[] = [
  { x0: 0, z0: -128, x1: 0, z1: -96, width: 5.4, kind: 'gach' }, // đại lộ từ cổng
  { x0: 0, z0: -96, x1: 0, z1: -52, width: 4.6, kind: 'gach' },
  { x0: 0, z0: -52, x1: 0, z1: 50, width: 3.8 }, // trục bắc nam
  { x0: 0, z0: 50, x1: 0, z1: 64, width: 4.6, kind: 'gach' }, // lối lên đình
  ...LANES.map((z) => ({ x0: -2, z0: z, x1: LANE_END, z1: z, width: 3.2 })), // ba ngõ phía tây
  { x0: 0, z0: -52, x1: 100, z1: -52, width: 4.4 }, // đường xưởng
  { x0: 56, z0: -52, x1: 56, z1: -38, width: 3 }, // vào khu bể ngâm
  { x0: 0, z0: 24, x1: 72, z1: 24, width: 3.6 }, // sang chợ làng
  { x0: 0, z0: 40, x1: -49, z1: 40, width: 3.4 }, // ra ao
  { x0: -44, z0: -50, x1: -44, z1: -66, width: 2.4 },
  { x0: -12, z0: 52, x1: 0, z1: 50, width: 2.2 },
];

const YARDS = [
  { x: PLAZA.x, z: PLAZA.z, r: 11 }, // sân giữa làng
  { x: 64, z: -74, r: 27 }, // sân phơi giấy lớn
  { x: 62, z: -34, r: 22 }, // khu bể ngâm, bếp, cối
  { x: MARKET.x, z: MARKET.z, r: 15 }, // sân chợ
  { x: 0, z: 58, r: 20 }, // sân đình
  { x: -40, z: -50, r: 7 }, // ngã ba giếng
  { x: -49, z: 40, r: 5 }, // bến ao
];

// ---------------------------------------------------------------------------
// Dân làng và đường nhỏ cho mũi tên

const VILLAGERS: VillagerLoop[] = [
  // bà cụ quanh đại lộ và sân giữa làng
  [
    [-2.5, -122],
    [-2.5, -106],
    [-10, -102],
    [-12, -92],
    [-3, -84],
    [-2.5, -100],
  ],
  // chú nông dân dọc đường xưởng
  [
    [6, -50],
    [30, -50],
    [54, -50],
    [30, -54],
    [8, -54],
  ],
  // bà cụ trong sân chợ
  [
    [48, 22],
    [58, 26],
    [64, 26],
    [58, 22],
  ],
  // chú nông dân dọc ngõ giữa phía tây
  [
    [-8, -33],
    [-30, -35],
    [-60, -33],
    [-82, -35],
    [-50, -34],
  ],
  // bà cụ dọc đường lên đình
  [
    [2.5, 12],
    [2.5, 36],
    [-2.5, 46],
    [-2.5, 20],
  ],
  // chú nông dân dọc đường ra ao
  [
    [-6, 42],
    [-22, 42],
    [-40, 41],
    [-24, 38.5],
  ],
];

const NODES: VillagePaths['nodes'] = [
  { id: 'A', x: 0, z: -112 },
  { id: 'S', x: 0, z: -98 },
  { id: 'W1', x: -10, z: -96 },
  { id: 'W2', x: -10, z: -90 },
  { id: 'P', x: 0, z: -88 },
  { id: 'X1', x: 0, z: -66 },
  { id: 'X2', x: 0, z: -52 },
  { id: 'EW', x: 56, z: -52 },
  { id: 'X3', x: 0, z: -34 },
  { id: 'X4', x: 0, z: -6 },
  { id: 'M', x: 0, z: 24 },
  { id: 'MK', x: 62, z: 24 },
  { id: 'Y', x: 0, z: 40 },
  { id: 'AO', x: -44, z: 40 },
  { id: 'D', x: 0, z: 50 },
];
const PATHS: VillagePaths = {
  nodes: NODES,
  links: [
    ['A', 'S'],
    ['S', 'W1'],
    ['W1', 'W2'],
    ['W2', 'P'],
    ['P', 'X1'],
    ['X1', 'X2'],
    ['X2', 'EW'],
    ['X2', 'X3'],
    ['X3', 'X4'],
    ['X4', 'M'],
    ['M', 'MK'],
    ['M', 'Y'],
    ['Y', 'AO'],
    ['Y', 'D'],
  ],
  entry: 'A',
  boardJoin: 'S',
  guideStand: { x: -5.6, z: -84, join: 'P' },
  scrollStands: [
    { x: 56, z: -39.5, join: 'EW' },
    { x: 8, z: 65, join: 'D' },
    { x: -47.5, z: 40, join: 'AO' },
    { x: 71, z: 25.5, join: 'MK' },
  ],
};

// ---------------------------------------------------------------------------
// Rải đồ có hạt giống, tránh mọi thứ đã đặt (bộ rải dùng chung ở villageKit.ts)

function anchors(): Spot[] {
  const out: Spot[] = [...placementSpots([...HOUSES, ...TREES, ...WELLS, ...STALLS]), ...propSpots([...WORKSHOP_PROPS, ...MARKET_PROPS, PAVILION]), ...scatterSpots(RACKS)];
  for (const b of BOARDS) out.push({ x: b.x, z: b.z, r: 1.4 });
  out.push({ x: DESK.x, z: DESK.z, r: 1.4 }, { x: GUIDE.x, z: GUIDE.z, r: 1 });
  for (const p of PONDS) out.push({ x: p.x, z: p.z, r: p.r + 1.4 });
  for (const s of SCROLLS) out.push({ x: s.x, z: s.z, r: 1.6 });
  out.push({ x: JETTY.x, z: JETTY.z, r: 3 });
  return out;
}

/** Rải đồ phụ: tre ở vườn và đồi, cây ăn quả, hoa, chum, rơm. Mỗi món chỉ đặt nếu còn chỗ trống (bán kính chân cộng khoảng hở). */
function fillers(): { scatter: ScatterPlacement[]; props: PropPlacement[]; placements: Placement[] } {
  const rng = createMulberry32(20260110);
  const f = createFiller({ wallRadius: GIAY_WALL_RADIUS, gateZ: GIAY_GATE_Z, keepInside: KEEP_INSIDE, taken: anchors(), roads: ROADS, fields: FIELDS, yards: YARDS, villagers: VILLAGERS, paths: PATHS });
  const hills: ScatterPlacement[] = [
    scatter('doi', -34, 98, 14, 0, [0.14, 0.4, 0.09], { sy: 0.46 }),
    scatter('doi', 28, 100, 13, 1, [0.16, 0.42, 0.1], { sy: 0.46 }),
    scatter('doi', 100, 40, 9, 2, [0.15, 0.39, 0.1], { sy: 0.55 }),
    scatter('doi', -100, -10, 12, 3, [0.15, 0.41, 0.09], { sy: 0.46 }),
    scatter('doi', -10, 108, 8, 4, [0.17, 0.43, 0.11], { sy: 0.56 }),
  ];
  f.addHills(hills);
  f.wallRing(rng); // lũy tre quanh làng
  f.gateBamboo(rng); // bụi tre hai bên đại lộ gần cổng
  f.hillBamboo(rng, hills); // đồi tre: hai vòng bụi quanh chân mỗi đồi
  // vườn cây ăn quả: lưới có xô lệch, ở bốn chỗ
  f.orchard(rng, -94, -52, -104, -86, 7);
  f.orchard(rng, -60, 60, 86, 96, 7);
  f.orchard(rng, -112, -96, 56, 76, 7);
  f.orchard(rng, 40, 64, 40, 64, 8);
  f.scatterBamboo(rng, 90, 30, 86); // tre rải trong làng (khóm nhỏ ở góc trống)
  f.houseFlora(rng, [...westHouses(), ...OTHER_HOUSES]); // quanh mỗi nhà ở: khóm hoa, chum vại, đôi khi đống rơm
  f.avenueFlora(rng, 24); // khóm hoa dọc đại lộ, sân giữa làng, quanh bờ ao và sân đình
  f.pondFlora(rng, PONDS, 18);
  f.circleFlora(rng, 0, 58, 12, 8, 11);
  return { scatter: f.scatter, props: f.props, placements: f.placements };
}

const FILL = fillers();

const PLACEMENTS: Placement[] = [...HOUSES, ...TREES, ...WELLS, ...STALLS, ...FILL.placements];

const SCATTER: ScatterPlacement[] = [...RACKS, JETTY, ...FILL.scatter];

const PROPS: PropPlacement[] = [
  // bàn chép sổ và cuốn Sổ Chung bìa tím trên bàn
  prop('ban-chep', DESK.x, DESK.z, DESK.yaw),
  prop('so-chung', DESK.x, DESK.z, DESK.yaw),
  ...WORKSHOP_PROPS,
  ...MARKET_PROPS,
  PAVILION,
  ...FILL.props,
];

/** Số nhà ở (không tính nhà xưởng) và tổng số nhà, để test và thống kê. */
export const GIAY_HOUSE_COUNT = HOUSES.length - WORKSHOP_HOUSES.length;


export const LANG_GIAY_LAYOUT: VillageLayoutInput & { guide: VillageGuideDef } = {
  id: 'lang-giay',
  radius: GIAY_RADIUS,
  gate: { model: 'env/cong-lang-giay', x: 0, z: GIAY_GATE_Z, yaw: Math.PI },
  start: { x: 0, z: -99, yaw: 0 },
  placements: PLACEMENTS,
  props: PROPS,
  boards: BOARDS,
  guide: GUIDE,
  yards: YARDS,
  roads: ROADS,
  wall: { radius: GIAY_WALL_RADIUS, gap: 9.5 },
  ponds: PONDS,
  fields: FIELDS,
  villagers: VILLAGERS,
  paths: PATHS,
  scatter: SCATTER,
  scrolls: SCROLLS,
  seed: 20260106,
};

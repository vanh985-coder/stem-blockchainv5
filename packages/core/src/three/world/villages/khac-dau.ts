import { PEOPLE } from '../../../lessons/bai-3/logic';
import { createMulberry32 } from '../../../lib/rng';
import { MODEL_TREE, MODEL_WELL, type Placement, type PropPlacement } from '../../cho/marketLayout';
import { type ScatterPlacement } from '../../village/scatter';
import type { VillageBoardDef, VillageField, VillageGuideDef, VillageLayoutInput, VillagePaths, VillageRoad, VillageScroll, VillagerLoop } from '../../village/villageLayout';
import { createFiller, placementSpots, propSpots, prop, scatter, thatch, tile, type Spot } from './villageKit';

/**
 * Bố cục Làng Khắc Dấu (mốc 3, bước L3; spec 07 mục "Cảnh làng"): làng bán kính 125 mở ra phía sau cổng `env/cong-lang-khac-dau`, bao quanh bằng lũy tre, cùng cỡ và cùng cách đặt với Làng Giấy và Làng Dệt (tâm làng cách
 * tâm chợ 197). Chỉ là dữ liệu (không import three), tọa độ làng như hai làng kia: gốc là tâm làng, +Z là phía bắc của làng (người vào cổng nhìn về +Z), cổng ở (0, −125); tên hướng theo cách gọi của Làng Giấy (đông là +X).
 *
 * Các khu, nối bằng đường làng (đường gạch ở đại lộ và sân máy, đường đất ở ngõ):
 * - Sân máy soi dấu (giữa làng, quanh (0, −85)): máy soi dấu bằng đồng ở (0, −79), ba biển gỗ quay mặt về cổng, chú Dũng đứng cạnh máy, bàn đá khắc và vài khối đá; thẻ không đặt ở đây;
 * - Xưởng khắc dấu (đông nam): hai mái che với dãy bàn đá khắc, khối đá, chồng phôi gỗ, hòm; ba nhà xưởng; thẻ "Em có biết?" số 1;
 * - Đình làng (bắc): đình, sân gạch, BẢNG GỖ TREO 6 TẤM MẪU DẤU CÔNG KHAI (đúng 6 người của Bài 3: số lấy từ `lessons/bai-3`), cây đa, giếng, chậu cây; thẻ số 2;
 * - Trạm đưa thư (tây): nhà trạm, hai hòm thư gỗ, hai giá xếp thư, bàn chép, hai chuồng bồ câu đưa thư; thẻ số 3;
 * - Bãi đá (tây bắc, gần rìa): khối đá lớn nhỏ, hai phiến đá đang xẻ, hai đồi đá thấp; thẻ số 4;
 * - Chuồng gà (gần cổng, bên trong lũy tre): chuồng tre nhỏ, đàn gà, ổ rơm, chum nước (đàn gà của màn 9);
 * - Khu nhà ở: 30 nhà ngói và nhà tranh dọc ngõ phía tây, đại lộ, trục bắc nam, quanh đình, trạm và xưởng; hai giếng; vườn cây;
 * - Rìa làng: bốn ruộng lúa, đồi tre, đồi đá, lũy tre bao quanh;
 * - 6 dân làng đi lại giữa các khu.
 */

// ---------------------------------------------------------------------------
// Hằng

export const KHAC_DAU_RADIUS = 125;
/** Cổng cách tâm làng bấy nhiêu (về phía nam). */
export const KHAC_DAU_GATE_Z = -125;
/** Lũy tre: tâm các bụi nằm ở bán kính này (vật cản là chuỗi hộp ở cùng bán kính). */
export const KHAC_DAU_WALL_RADIUS = 122;
/** Đồ không được vượt qua bán kính này (tính cả cỡ chân): còn chừa chỗ cho lũy tre. */
const KEEP_INSIDE = 118;

/** Hướng (yaw) để mặt trước (+Z) của một vật ở (x, z) quay về (tx, tz). */
const faceTo = (x: number, z: number, tx: number, tz: number): number => Math.atan2(tx - x, tz - z);

// ---------------------------------------------------------------------------
// Sân máy soi dấu: máy, ba biển gỗ, chú Dũng, bàn đá khắc

const PLAZA = { x: 0, z: -85 };
const BOARDS: VillageBoardDef[] = [
  { level: 7, icon: 'ui/icons/trang-vang', x: 4.6, z: -90.5, yaw: Math.PI },
  { level: 8, icon: 'ui/icons/guoc-moc', x: 0, z: -89.3, yaw: Math.PI },
  { level: 9, icon: 'ui/icons/ngoi-sao', x: -4.6, z: -90.5, yaw: Math.PI },
];
const MACHINE = prop('may-soi-dau', 0, -78.5, Math.PI);
const GUIDE: VillageGuideDef = { character: 'chuDung', x: -3.9, z: -80.6, yaw: faceTo(-3.9, -80.6, 0, -96) };
const PLAZA_PROPS: PropPlacement[] = [
  MACHINE,
  // bàn đá khắc và khối đá ở phía đông sân (thợ khắc thử dấu bên máy)
  prop('ban-da', 8.8, -81.2, -0.35),
  prop('khoi-da', 11.4, -78.6, 0.5, 1),
  prop('khoi-da', 7.8, -77.4, 1.2, 0.8, [0.95, 0.95, 0.93]),
  prop('hom', -9.2, -78.6, 0.3, 1),
  prop('thung', -10.6, -81.6, 0, 1),
];
/** Chậu cây cảnh ở các góc sân (tránh biển, máy, người đứng và lối đi). */
const POTS: PropPlacement[] = [
  prop('chau-canh', 12.6, -94.5, 0.3),
  prop('chau-canh', 13.4, -88.5, 1.1),
  prop('chau-canh', 13.6, -73, 2.0),
  prop('chau-canh', 8.4, -71.2, 0.6),
  prop('chau-canh', -13.4, -71.4, 1.6),
  prop('chau-canh', -13.4, -76.4, 0.9),
  prop('chau-canh', -14, -88.4, 2.4),
  prop('chau-canh', -14.2, -94.2, 0.2),
];

// ---------------------------------------------------------------------------
// Xưởng khắc dấu (đông nam): hai mái che, dãy bàn đá khắc, khối đá, phôi gỗ, hòm; ba nhà xưởng

const SHELTERS = [
  { x: 58, z: -69 },
  { x: 78, z: -69 },
];
const WORKSHOP: PropPlacement[] = [
  ...SHELTERS.map((s) => prop('mai-che', s.x, s.z, 0)),
  // ba bàn đá khắc dưới mỗi mái che, quay mặt ra phía đường (nam)
  ...SHELTERS.flatMap((s) => [-2.1, 0, 2.1].map((dx, i) => prop('ban-da', s.x + dx, s.z + 0.4, (i - 1) * 0.06))),
  ...SHELTERS.flatMap((s) => [prop('khoi-da', s.x - 2.6, s.z - 1.5, 0.4, 0.9), prop('khoi-da', s.x + 2.4, s.z - 1.6, 1.4, 0.85, [0.94, 0.94, 0.92])]),
  prop('phoi-go', 52.4, -66, 0.2),
  prop('phoi-go', 68.3, -73.4, -0.3),
  prop('phoi-go', 68.1, -65.8, 0.15),
  prop('phoi-go', 85.6, -71, 0.3),
  prop('hom', 54, -73.6, 0.3, 1),
  prop('hom', 83.4, -64.4, -0.2, 1),
  prop('hom', 71.6, -71.2, 0.1, 1),
  prop('thung', 61.5, -74.2, 0, 1),
  prop('thung', 74.8, -63.6, 0, 1),
  prop('chum', 88.4, -76, 0, 1),
  prop('rom', 49.2, -73, 0.4, 0.9),
];

// ---------------------------------------------------------------------------
// Đình làng (bắc): đình, sân gạch, bảng mẫu dấu công khai, chậu cây

const DINH = prop('dinh', 0, 75, Math.PI);
const STAMP_BOARD = prop('bang-mau', 14, 60, faceTo(14, 60, 0, 47));
const DINH_PROPS: PropPlacement[] = [
  DINH,
  STAMP_BOARD,
  prop('chau-canh', -9.4, 66.4, 0.6),
  prop('chau-canh', 9.6, 67.4, 1.4),
  prop('chau-canh', -12.2, 59.8, 2.2),
  prop('chau-canh', -6.8, 56.2, 0.3),
  prop('chau-canh', 6.4, 57.4, 1.9),
  prop('ban-da', -9.4, 50.6, 0.4, 0.9),
];

// ---------------------------------------------------------------------------
// Trạm đưa thư (tây): nhà trạm, hòm thư, giá xếp thư, bàn chép, chuồng bồ câu

const STATION_PROPS: PropPlacement[] = [
  prop('hom-thu', -50.6, -0.6, faceTo(-50.6, -0.6, -58, 4)),
  prop('hom-thu', -73.4, -0.4, faceTo(-73.4, -0.4, -62, 4)),
  prop('gia-thu', -57.6, 13.4, Math.PI + 0.1),
  prop('gia-thu', -66.8, 13.6, Math.PI - 0.1),
  prop('ban-chep', -62, 9.2, 0.05),
  prop('chuong-bo-cau', -46.6, 15.6, 0.4),
  prop('chuong-bo-cau', -78.6, 14.4, -0.5),
  prop('thung', -53.4, 8.6, 0, 1),
  prop('thung', -71.2, 8.2, 0, 1),
  prop('gia-thu', -80, 5, 1.2),
];

// ---------------------------------------------------------------------------
// Bãi đá (tây bắc, gần rìa): khối đá lớn nhỏ, phiến đá đang xẻ, đồi đá thấp

const QUARRY_PROPS: PropPlacement[] = [
  prop('phien-da', -72.2, 57.2, 0.35),
  prop('phien-da', -92.4, 56.6, -0.2),
  prop('khoi-da', -86.4, 49, 0.6, 2.2, [0.92, 0.92, 0.9]),
  prop('khoi-da', -78.2, 66.2, 1.1, 2.6, [0.96, 0.96, 0.93]),
  prop('khoi-da', -90.6, 68.4, 2.0, 1.7, [0.9, 0.9, 0.88]),
  prop('khoi-da', -69.4, 63.6, 0.2, 1.3),
  prop('khoi-da', -84.4, 61, 0.9, 0.9),
  prop('khoi-da', -95, 46.4, 1.6, 1.5, [0.93, 0.93, 0.9]),
  prop('khoi-da', -67.4, 52.4, 2.4, 1.0),
  prop('khoi-da', -80, 78, 0.3, 1.9, [0.94, 0.94, 0.92]),
  prop('ban-da', -87.4, 59.4, 0.3, 1),
  prop('thung', -75.2, 58.2, 0, 1),
];

// ---------------------------------------------------------------------------
// Chuồng gà (gần cổng, trong lũy tre): chuồng tre, đàn gà, chum nước, rơm

const COOP = prop('chuong-ga', -32, -106, faceTo(-32, -106, 0, -104));
const HENS: PropPlacement[] = [
  prop('ga', -26.4, -102.4, 0.5, 1, [1, 0.98, 0.95]),
  prop('ga', -28.8, -99.6, 2.4, 0.95, [0.9, 0.9, 0.95]),
  prop('ga', -24.4, -106.4, 4.4, 1.05, [1, 1, 1]),
  prop('ga', -29.4, -112.4, 1.2, 0.95, [0.95, 0.9, 0.85]),
  prop('ga', -23, -109.6, 3.1, 1, [1, 0.95, 0.9]),
];
const COOP_PROPS: PropPlacement[] = [COOP, ...HENS, prop('chum', -37.4, -99.8, 0, 1), prop('rom', -40.4, -111.4, 0.5, 0.9)];

// ---------------------------------------------------------------------------
// Khu nhà ở: ngõ phía tây (z = −46), đại lộ, trục bắc nam, quanh đình, trạm và xưởng

const LANE_Z = -46;
const LANE_END = -96;
const ROW_X = [-22, -35.5, -49, -62.5, -76];
const ROW_OFFSET = 8;
const SKIP = new Set(['-1:0', '1:4', '-1:4', '1:0']); // bên:cột

function laneHouses(): Placement[] {
  const rng = createMulberry32(20260312);
  const houses: Placement[] = [];
  for (const side of [-1, 1]) {
    ROW_X.forEach((x0, ci) => {
      const jx = (rng() - 0.5) * 3;
      const jz = (rng() - 0.5) * 1.6;
      const scale = 0.94 + rng() * 0.14;
      const shade = 0.94 + rng() * 0.06;
      const tint: [number, number, number] = [shade, shade - 0.01 * (ci % 3), shade - 0.03 * (side > 0 ? 1 : 0)];
      const twist = (rng() - 0.5) * 0.24;
      if (SKIP.has(`${side}:${ci}`)) return;
      const make = (ci + (side > 0 ? 1 : 0)) % 3 === 1 ? tile : thatch;
      houses.push(make(x0 + jx, LANE_Z + side * (ROW_OFFSET + jz), [x0 + jx, LANE_Z], scale, tint, twist));
    });
  }
  return houses;
}
const LANE_HOUSES = laneHouses();

const OTHER_HOUSES: Placement[] = [
  // dọc đại lộ, hai bên (mặt quay ra đại lộ)
  tile(-15, -110, [0, -110], 1.05, [1, 0.97, 0.94], 0.1),
  thatch(15.5, -108, [0, -108], 0.98, [1, 0.98, 0.92], -0.12),
  thatch(-16, -99, [0, -99], 0.96, [0.97, 0.97, 0.94], 0.08),
  tile(16.5, -99, [0, -99], 1, [0.98, 1, 1], -0.1),
  // dọc trục bắc nam
  thatch(14, -30, [0, -30], 1, [0.98, 0.97, 0.92], 0.06),
  tile(15, -8, [0, -8], 1.02, [1, 0.98, 0.94], -0.08),
  thatch(14.5, 14, [0, 14], 0.97, [0.99, 0.98, 0.94], 0.1),
  tile(-14, -26, [0, -26], 1, [0.97, 0.99, 1], -0.06),
  thatch(-15, 22, [0, 22], 1.03, [1, 0.98, 0.93], 0.08),
  tile(14, 32, [0, 32], 1, [0.98, 1, 0.95], -0.07),
  // quanh đình làng
  thatch(-26, 74, [-10, 66], 1, [0.98, 0.97, 0.92], 0.1),
  tile(27, 70, [12, 64], 0.97, [0.97, 0.99, 1], -0.08),
  thatch(-27, 50, [-12, 50], 1.02, [1, 0.98, 0.94], 0.1),
  tile(30, 46, [14, 46], 1, [1, 0.98, 0.93], -0.1),
  // trạm đưa thư: nhà trạm (ngói, to hơn) và hai nhà bên
  tile(-62, 24, [-62, 10], 1.18, [1, 0.97, 0.92], 0.04),
  thatch(-88, 10, [-76, 6], 1, [0.98, 0.98, 0.94], 0.1),
  tile(-34, -14, [-34, -4], 0.98, [1, 0.98, 0.94], -0.1),
  // xưởng khắc dấu: ba nhà xưởng
  tile(48, -87, [58, -77], 1.04, [1, 0.97, 0.93], 0.08),
  thatch(78, -85, [76, -76], 1, [0.98, 0.97, 0.92], -0.1),
  tile(90, -56, [80, -62], 1, [0.98, 0.99, 1], 0.1),
  // rìa phía đông
  thatch(79, 12, [70, 14], 1.02, [1, 0.98, 0.94], -0.1),
  tile(78, 31, [66, 32], 0.98, [0.98, 0.97, 0.94], 0.1),
];

const HOUSES: Placement[] = [...LANE_HOUSES, ...OTHER_HOUSES];

// ---------------------------------------------------------------------------
// Cây đa, giếng

const TREES: Placement[] = [
  { model: MODEL_TREE, x: -17, z: 80, yaw: 0.6, scale: 0.42, tint: [1, 1, 1] },
  { model: MODEL_TREE, x: 19, z: 82, yaw: 2.2, scale: 0.42, tint: [1, 1, 1] },
  { model: MODEL_TREE, x: -24, z: -82, yaw: 1.1, scale: 0.4, tint: [1, 1, 1] },
];
const WELLS: Placement[] = [
  { model: MODEL_WELL, x: -14.5, z: 58.6, yaw: 0.5, scale: 1, tint: [1, 1, 1] },
  { model: MODEL_WELL, x: -12, z: -34, yaw: 2.4, scale: 1, tint: [1, 1, 1] },
];

// ---------------------------------------------------------------------------
// Thẻ "Em có biết?": 4 thẻ ở 4 khu cách xa nhau (xưởng khắc dấu, đình làng, trạm đưa thư, bãi đá)

const SCROLLS: VillageScroll[] = [
  { index: 0, x: 66, z: -57, zone: 'xuongdau' },
  { index: 1, x: 8, z: 52, zone: 'dinhlang' },
  { index: 2, x: -60, z: -4, zone: 'tramthu' },
  { index: 3, x: -82, z: 58, zone: 'baida' },
];

// ---------------------------------------------------------------------------
// Ruộng lúa ở rìa, đường

const FIELDS: VillageField[] = [
  { x: 94, z: 10, hx: 6, hz: 14, yaw: 0.05, kind: 'lua' },
  { x: 92, z: 48, hx: 5, hz: 12, yaw: 0, kind: 'lua' },
  { x: 40, z: 100, hx: 14, hz: 5, yaw: 0, kind: 'lua' },
  { x: -30, z: 100, hx: 12, hz: 5, yaw: 0.04, kind: 'lua' },
];

const ROADS: VillageRoad[] = [
  { x0: 0, z0: -128, x1: 0, z1: -100, width: 5.4, kind: 'gach' }, // đại lộ từ cổng
  { x0: 0, z0: -100, x1: 0, z1: -70, width: 4.6, kind: 'gach' }, // qua sân máy
  { x0: 0, z0: -70, x1: 0, z1: 88, width: 3.8 }, // trục bắc nam
  { x0: -2, z0: LANE_Z, x1: LANE_END, z1: LANE_Z, width: 3.2 }, // ngõ phía tây
  { x0: 0, z0: -50, x1: 94, z1: -50, width: 4.4 }, // đường ra xưởng khắc dấu
  { x0: 66, z0: -50, x1: 66, z1: -57, width: 2.4 }, // lối tới thẻ ở xưởng
  { x0: 0, z0: -4, x1: -66, z1: -4, width: 3.4 }, // đường ra trạm đưa thư
  { x0: 0, z0: -4, x1: -36, z1: 16, width: 2.8 }, // đường lên bãi đá (hai đoạn)
  { x0: -36, z0: 16, x1: -80, z1: 56, width: 2.8 },
  { x0: 0, z0: 52, x1: 8, z1: 52, width: 2.4 }, // lối tới thẻ ở đình
  { x0: -8, z0: -97, x1: -8, z1: -68, width: 2.4 }, // đường vòng quanh sân máy (phía tây)
];

const YARDS = [
  { x: PLAZA.x, z: PLAZA.z, r: 15, kind: 'gach' as const, tint: '#A28C7D' }, // sân máy lát gạch đỏ nung trầm (viền đá vẽ ở WorldTerrain)
  { x: PLAZA.x, z: PLAZA.z, r: 14, kind: 'vet' as const, tint: '#8A7A6D', opacity: 0.5 },
  { x: -6, z: -78, r: 6, kind: 'vet' as const, tint: '#5A4234', opacity: 0.4 },
  { x: 7, z: -92, r: 5.5, kind: 'vet' as const, tint: '#74563F', opacity: 0.32 },
  { x: 3, z: -84, r: 7, kind: 'vet' as const, tint: '#CDB29B', opacity: 0.3 },
  { x: -10, z: -93, r: 4.5, kind: 'vet' as const, tint: '#4A382D', opacity: 0.3 },
  { x: 11, z: -79, r: 4, kind: 'vet' as const, tint: '#6B4F3C', opacity: 0.28 },
  { x: 0, z: 64, r: 14, kind: 'gach' as const, tint: '#A99483' }, // sân đình lát gạch
  { x: 68, z: -68, r: 24 }, // sân xưởng khắc dấu
  { x: -62, z: 8, r: 15 }, // sân trạm đưa thư
  { x: -82, z: 58, r: 15 }, // bãi đá
  { x: -28, z: -105, r: 11 }, // sân chuồng gà
  { x: 66, z: -57, r: 6 }, // sân thẻ xưởng
];

// ---------------------------------------------------------------------------
// Dân làng và đường nhỏ cho mũi tên

const VILLAGERS: VillagerLoop[] = [
  // bà cụ quanh đại lộ và sân máy
  [
    [-2.5, -122],
    [-2.5, -106],
    [-9.5, -99],
    [-10, -84],
    [-9, -99.5],
    [-4, -106],
  ],
  // chú nông dân dọc đường ra xưởng
  [
    [6, -48],
    [30, -48],
    [50, -48],
    [30, -52],
    [8, -52],
  ],
  // bà cụ trong sân trạm đưa thư
  [
    [-68, 3],
    [-58, 2],
    [-52, 6],
    [-60, 3],
  ],
  // chú nông dân dọc ngõ phía tây
  [
    [-8, -45],
    [-30, -46],
    [-60, -45],
    [-84, -46],
    [-50, -47],
  ],
  // bà cụ dọc trục lên phía bắc
  [
    [2.5, -12],
    [2.5, 12],
    [-2.5, 26],
    [-2.5, 0],
  ],
  // chú nông dân trước đình
  [
    [-5, 42],
    [-5, 54],
    [5, 54],
    [5, 42],
  ],
];

const NODES: VillagePaths['nodes'] = [
  { id: 'A', x: 0, z: -112 },
  { id: 'S', x: 0, z: -98 },
  { id: 'W1', x: -8, z: -96 },
  { id: 'G', x: -8, z: -80 },
  { id: 'W2', x: -8, z: -68 },
  { id: 'X1', x: 0, z: -50 },
  { id: 'EW', x: 66, z: -50 },
  { id: 'Y1', x: 0, z: -4 },
  { id: 'TR', x: -52, z: -4 },
  { id: 'Z1', x: -36, z: 16 },
  { id: 'N', x: 0, z: 52 },
];
const PATHS: VillagePaths = {
  nodes: NODES,
  links: [
    ['A', 'S'],
    ['S', 'W1'],
    ['W1', 'G'],
    ['G', 'W2'],
    ['W2', 'X1'],
    ['X1', 'EW'],
    ['X1', 'Y1'],
    ['Y1', 'TR'],
    ['Y1', 'Z1'],
    ['Y1', 'N'],
  ],
  entry: 'A',
  boardJoin: 'S',
  guideStand: { x: -5.9, z: -80.4, join: 'G' },
  scrollStands: [
    { x: 66, z: -55.6, join: 'EW' },
    { x: 6.6, z: 52, join: 'N' },
    { x: -58.4, z: -4, join: 'TR' },
    { x: -80.6, z: 56.6, join: 'Z1' },
  ],
};

// ---------------------------------------------------------------------------
// Rải đồ có hạt giống, tránh mọi thứ đã đặt (bộ rải dùng chung ở villageKit.ts)

const ALL_PROPS: PropPlacement[] = [...PLAZA_PROPS, ...POTS, ...WORKSHOP, ...DINH_PROPS, ...STATION_PROPS, ...QUARRY_PROPS, ...COOP_PROPS];

function anchors(): Spot[] {
  const out: Spot[] = [...placementSpots([...HOUSES, ...TREES, ...WELLS]), ...propSpots(ALL_PROPS, ['chan', 'nuoc', 'mai-che'])];
  for (const s of SHELTERS) out.push({ x: s.x, z: s.z, r: 2.4 });
  for (const b of BOARDS) out.push({ x: b.x, z: b.z, r: 1.4 });
  out.push({ x: GUIDE.x, z: GUIDE.z, r: 1 });
  for (const s of SCROLLS) out.push({ x: s.x, z: s.z, r: 1.6 });
  return out;
}

/** Đồi: bốn đồi tre xanh ở rìa và hai đồi đá thấp xám ở bãi đá. */
const HILLS: ScatterPlacement[] = [
  scatter('doi', -105, -16, 7, 0, [0.14, 0.4, 0.09], { sy: 0.6 }),
  scatter('doi', 100, -22, 9, 1, [0.16, 0.42, 0.1], { sy: 0.55 }),
  scatter('doi', 8, 108, 8, 2, [0.15, 0.39, 0.1], { sy: 0.55 }),
  scatter('doi', 64, 88, 7, 3, [0.15, 0.41, 0.09], { sy: 0.6 }),
];
const STONE_HILLS: ScatterPlacement[] = [
  scatter('doi', -102, 38, 6, 4, [0.5, 0.5, 0.47], { sy: 0.5 }),
  scatter('doi', -62, 92, 6, 5, [0.54, 0.53, 0.5], { sy: 0.45 }),
];

function fillers(): { scatter: ScatterPlacement[]; props: PropPlacement[]; placements: Placement[] } {
  const rng = createMulberry32(20260310);
  const f = createFiller({ wallRadius: KHAC_DAU_WALL_RADIUS, gateZ: KHAC_DAU_GATE_Z, keepInside: KEEP_INSIDE, taken: anchors(), roads: ROADS, fields: FIELDS, yards: YARDS.filter((y) => y.kind !== 'vet'), villagers: VILLAGERS, paths: PATHS });
  f.addHills([...HILLS, ...STONE_HILLS]);
  f.wallRing(rng);
  f.gateBamboo(rng);
  f.hillBamboo(rng, HILLS);
  // vườn cây ăn quả ở các góc trống
  f.orchard(rng, 20, 56, 8, 30, 8);
  f.orchard(rng, -64, -34, 80, 96, 8);
  f.orchard(rng, 40, 80, 96, 110, 8);
  f.scatterBamboo(rng, 80, 30, 86);
  f.houseFlora(rng, HOUSES);
  f.avenueFlora(rng, 24);
  f.circleFlora(rng, 0, -85, 12, 9, 5);
  f.circleFlora(rng, 0, 64, 10, 9, 5);
  return { scatter: f.scatter, props: f.props, placements: f.placements };
}

const FILL = fillers();

const PLACEMENTS: Placement[] = [...HOUSES, ...TREES, ...WELLS, ...FILL.placements];

const SCATTER: ScatterPlacement[] = [...FILL.scatter];

const PROPS: PropPlacement[] = [...ALL_PROPS, ...FILL.props];

/** Số nhà ở (cả làng) để test và thống kê. */
export const KHAC_DAU_HOUSE_COUNT = HOUSES.length;
/** Sáu mẫu dấu công khai trên bảng gỗ ở đình: lấy từ bảng khóa Bài 3 (không đặt số riêng). */
export const STAMP_BOARD_KEYS: readonly number[] = PEOPLE.map((p) => p.publicKey);

export const LANG_KHAC_DAU_LAYOUT: VillageLayoutInput & { guide: VillageGuideDef } = {
  id: 'lang-khac-dau',
  radius: KHAC_DAU_RADIUS,
  gate: { model: 'env/cong-lang-khac-dau', x: 0, z: KHAC_DAU_GATE_Z, yaw: Math.PI },
  start: { x: 0, z: -96, yaw: 0 },
  placements: PLACEMENTS,
  props: PROPS,
  boards: BOARDS,
  guide: GUIDE,
  yards: YARDS,
  roads: ROADS,
  wall: { radius: KHAC_DAU_WALL_RADIUS, gap: 9.5 },
  fields: FIELDS,
  villagers: VILLAGERS,
  paths: PATHS,
  scatter: SCATTER,
  scrolls: SCROLLS,
  seed: 20260108,
};

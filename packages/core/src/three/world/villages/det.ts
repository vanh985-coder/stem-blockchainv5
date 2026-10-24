import { createMulberry32 } from '../../../lib/rng';
import { MODEL_LOOM, MODEL_STALL, MODEL_TREE, MODEL_WELL, type Placement, type PropPlacement } from '../../cho/marketLayout';
import { type ScatterPlacement } from '../../village/scatter';
import type { VillageBoardDef, VillageField, VillageGuideDef, VillageLayoutInput, VillagePaths, VillagePond, VillageRoad, VillageScroll, VillagerLoop } from '../../village/villageLayout';
import { clothPoleTint } from '../../village/clothPoles';
import { createFiller, placementSpots, propSpots, prop, scatter, scatterSpots, thatch, tile, type Spot } from './villageKit';

/**
 * Bố cục Làng Dệt (mốc 3, bước L1; spec 06 mục "Cảnh làng"): làng bán kính 125 mở ra phía sau cổng `env/cong-lang-det`, bao quanh bằng lũy tre, cùng cỡ và cùng cách đặt với Làng Giấy (tâm làng cách tâm chợ 197, về phía
 * nam). Chỉ là dữ liệu (không import three), tọa độ làng như Làng Giấy: gốc là tâm làng, +Z là phía bắc của làng (người vào cổng nhìn về +Z), cổng ở (0, −125); tên hướng theo cách gọi của Làng Giấy (đông là +X).
 *
 * Các khu, nối bằng đường làng (đường gạch ở đại lộ và sân đình, đường đất ở ngõ):
 * - Sân đình lát gạch (giữa làng, quanh (0, −85)): đình nhỏ, ba biển gỗ quay mặt về cổng, bàn đặt Sổ Chung, cụ Bình và cô Chi;
 * - Bãi phơi vải (đông nam): 30 sào phơi vải (đỏ, hồng, chàm, vàng phấp phới), hàng chum nhuộm, đống sợi; thẻ "Em có biết?" số 1;
 * - Xóm khung cửi (tây): hai ngõ ngang, nhà có hiên hai bên, 7 khung cửi đặt dưới hiên, giá cuộn vải; thẻ số 2;
 * - Ao nhuộm (tây bắc): bốn vũng nối nhau (nước chàm, nước đỏ), cầu ao, bến đá, sào phơi sợi, chum nhuộm; thẻ số 3;
 * - Chợ vải nhỏ (đông bắc): năm lều quanh sân chợ, giá cuộn vải; thẻ số 4;
 * - Khu nhà ở: 32 nhà ngói và nhà tranh dọc các ngõ, đại lộ, trục bắc nam và quanh ao; hai giếng; vườn cây;
 * - Rìa làng: sáu ruộng dâu (luống bụi thấp), đồi tre, lũy tre bao quanh;
 * - 6 dân làng đi lại giữa các khu.
 */

// ---------------------------------------------------------------------------
// Hằng

export const DET_RADIUS = 125;
/** Cổng cách tâm làng bấy nhiêu (về phía nam). */
export const DET_GATE_Z = -125;
/** Lũy tre: tâm các bụi nằm ở bán kính này (vật cản là chuỗi hộp ở cùng bán kính). */
export const DET_WALL_RADIUS = 122;
/** Đồ không được vượt qua bán kính này (tính cả cỡ chân): còn chừa chỗ cho lũy tre. */
const KEEP_INSIDE = 118;

// ---------------------------------------------------------------------------
// Sân đình: đình, ba biển gỗ, bàn đặt Sổ Chung, cụ Bình và cô Chi

const PLAZA = { x: 0, z: -85 };
const BOARDS: VillageBoardDef[] = [
  { level: 4, icon: 'ui/icons/trang-vang', x: 4.6, z: -90.5, yaw: Math.PI },
  { level: 5, icon: 'ui/icons/guoc-moc', x: 0, z: -89.3, yaw: Math.PI },
  { level: 6, icon: 'ui/icons/ngoi-sao', x: -4.6, z: -90.5, yaw: Math.PI },
];
const DESK = { x: -9, z: -82.5, yaw: 0.3 };
const GUIDE: VillageGuideDef = { character: 'cuBinh', x: -9.2, z: -80.6, yaw: Math.PI };
const COMPANIONS: VillageGuideDef[] = [{ character: 'coChi', x: 8.6, z: -83, yaw: Math.PI + 0.2 }];
const PAVILION = prop('dinh', 0, -75.5, Math.PI);
/** Chậu cây cảnh ở các góc sân đình (tám chậu, tránh biển, bàn, người đứng và lối đi). */
const POTS: PropPlacement[] = [
  prop('chau-canh', 12.6, -94.5, 0.3),
  prop('chau-canh', 13.4, -88.5, 1.1),
  prop('chau-canh', 12.8, -78.5, 2.0),
  prop('chau-canh', 8.4, -72.4, 0.6),
  prop('chau-canh', -8.6, -72.8, 1.6),
  prop('chau-canh', -13.4, -78.8, 0.9),
  prop('chau-canh', -14, -84.6, 2.4),
  prop('chau-canh', -14.2, -90.8, 0.2),
];

// ---------------------------------------------------------------------------
// Bãi phơi vải (đông nam): 6 cột × 5 hàng = 30 sào, chum nhuộm, đống sợi

const POLE_X = [48, 54.4, 60.8, 67.2, 73.6, 80];
const POLE_Z = [-58, -63, -68, -73, -78];
/**
 * Sào không thẳng hàng tuyệt đối: lệch vị trí (hai cột sát lối đi giữa bãi lệch ít để lối vẫn rộng) và xoay tối đa 0,17 rad (khoảng 10°); vải trên sào (bỏ trống hay 1 đến 3 tấm, màu nhuộm tự nhiên, độ dài) chọn bằng rng cố định,
 * mã hóa trong màu bản (xem village/clothPoles.ts). Cùng seed cùng kết quả.
 */
const POLE_MAX_YAW = 0.17;
const POLES: ScatterPlacement[] = (() => {
  const rng = createMulberry32(20260212);
  return POLE_Z.flatMap((z, j) =>
    POLE_X.map((x, i) => {
      const jx = (rng() - 0.5) * 2 * (i === 2 || i === 3 ? 0.15 : 0.4);
      const jz = (rng() - 0.5) * 0.6;
      const yaw = (rng() - 0.5) * 2 * POLE_MAX_YAW;
      return scatter('sao-vai', x + jx, z + jz + (j % 2 ? 0.05 : 0), 1, yaw, clothPoleTint(rng));
    }),
  );
})();
/** Lối đứng thẳng giữa cột 3 và cột 4 của bãi phơi (rộng 2) để tới thẻ ở giữa bãi. */
const AISLE_X = 64;

const VAT_X = [50, 56, 62, 68, 74, 80];
const DYE_PROPS: PropPlacement[] = [
  // hàng chum nhuộm phía nam bãi: chàm và đỏ xen kẽ
  ...VAT_X.map((x, i) => prop(i % 2 ? 'chum-do' : 'chum-cham', x, -86, i * 0.7)),
  // đống sợi và sào phơi sợi cạnh chum
  prop('dong-soi', 52, -91, 0.3),
  prop('dong-soi', 62, -91.5, -0.2),
  prop('dong-soi', 72, -90.5, 0.5),
  prop('sao-soi', 86.5, -66, Math.PI / 2),
  prop('sao-soi', 86.5, -72, Math.PI / 2),
  prop('sao-soi', 41, -66, Math.PI / 2),
  prop('rom', 40, -78, 0.4, 0.9),
  prop('chum', 88, -80, 0, 1),
];

// ---------------------------------------------------------------------------
// Xóm khung cửi và khu nhà ở (tây): hai ngõ ngang; nhà hai bên quay mặt vào ngõ, khung cửi đặt dưới hiên

/** z của tim hai ngõ ngang phía tây. */
const LANES = [-46, -16];
const LANE_END = -96;
const ROW_X = [-22, -35.5, -49, -62.5, -76];
const ROW_OFFSET = 8;
const SKIP = new Set(['0:-1:0', '0:1:4', '1:-1:4', '1:1:0', '1:1:2']); // ngõ:bên:cột
/** Nhà có hiên và khung cửi: ngõ, bên, cột (7 khung cửi cả làng; ngõ 0 là phố dệt). */
const LOOM_AT = new Set(['0:1:1', '0:1:2', '0:1:3', '0:1:4', '0:-1:1', '0:-1:2', '0:-1:3']);
/** Nhà thêm giá cuộn vải trước hiên. */
const SHELF_AT = new Set(['1:-1:1', '1:-1:2', '1:-1:3', '1:1:3', '1:1:4']);
/** Khung cửi cách tâm nhà bấy nhiêu về phía ngõ (đủ để chân khung nằm ngoài chân tường, trong tầm mái hiên). */
const LOOM_REACH = 4.5;
const SHELF_REACH = 4.7;

function laneHouses(): { houses: Placement[]; looms: Placement[]; shelves: PropPlacement[] } {
  const rng = createMulberry32(20260211);
  const houses: Placement[] = [];
  const looms: Placement[] = [];
  const shelves: PropPlacement[] = [];
  LANES.forEach((laneZ, li) => {
    for (const side of [-1, 1]) {
      ROW_X.forEach((x0, ci) => {
        const jx = (rng() - 0.5) * 3;
        const jz = (rng() - 0.5) * 1.6;
        const scale = 0.94 + rng() * 0.14;
        const shade = 0.94 + rng() * 0.06;
        const tint: [number, number, number] = [shade, shade - 0.01 * (ci % 3), shade - 0.03 * (li % 2)];
        const twist = (rng() - 0.5) * 0.24;
        const key = `${li}:${side}:${ci}`;
        if (SKIP.has(key)) return;
        const x = x0 + jx;
        const z = laneZ + side * (ROW_OFFSET + jz);
        const make = (li + ci + (side > 0 ? 1 : 0)) % 3 === 1 ? tile : thatch;
        const h = make(x, z, [x, laneZ], scale, tint, twist);
        houses.push(h);
        const dx = Math.sin(h.yaw);
        const dz = Math.cos(h.yaw);
        if (LOOM_AT.has(key)) looms.push({ model: MODEL_LOOM, x: x + dx * LOOM_REACH * scale, z: z + dz * LOOM_REACH * scale, yaw: h.yaw + Math.PI, scale: 1, tint: [1, 1, 1] });
        if (SHELF_AT.has(key)) shelves.push(prop('gia-vai', x + dx * SHELF_REACH * scale, z + dz * SHELF_REACH * scale, h.yaw));
      });
    }
  });
  return { houses, looms, shelves };
}
const LANE = laneHouses();

/** Nhà dọc đại lộ, trục bắc nam, quanh ao nhuộm và chợ vải. */
const OTHER_HOUSES: Placement[] = [
  // dọc đại lộ, hai bên (mặt quay ra đại lộ)
  tile(-15, -110, [0, -110], 1.05, [1, 0.97, 0.94], 0.1),
  thatch(15.5, -108, [0, -108], 0.98, [1, 0.98, 0.92], -0.12),
  thatch(-16, -99, [0, -99], 0.96, [0.97, 0.97, 0.94], 0.08),
  tile(16.5, -99, [0, -99], 1, [0.98, 1, 1], -0.1),
  // dọc trục bắc nam, phía đông
  thatch(14, -32, [0, -32], 1, [0.98, 0.97, 0.92], 0.06),
  tile(15, -4, [0, -4], 1.02, [1, 0.98, 0.94], -0.08),
  thatch(14.5, 16, [0, 16], 0.97, [0.99, 0.98, 0.94], 0.1),
  // phía tây trục, bắc ngõ thứ hai
  tile(-14, 8, [0, 8], 1, [0.97, 0.99, 1], -0.06),
  thatch(-15, 24, [0, 24], 1.03, [1, 0.98, 0.93], 0.08),
  // cạnh ao nhuộm
  tile(-30, 58, [-44, 52], 1, [1, 0.97, 0.94], 0.12),
  thatch(-92, 62, [-82, 56], 1.02, [0.98, 0.98, 0.94], -0.1),
  tile(-28, 36, [-42, 36], 0.98, [1, 0.98, 0.92], 0.1),
  // cạnh chợ vải
  thatch(36, 46, [48, 38], 1, [0.98, 0.97, 0.92], 0.1),
  tile(34, 22, [46, 28], 0.97, [0.97, 0.99, 1], -0.08),
  thatch(86, 22, [74, 28], 1.04, [1, 0.98, 0.94], -0.1),
];

const HOUSES: Placement[] = [...LANE.houses, ...OTHER_HOUSES];

// ---------------------------------------------------------------------------
// Cây đa, giếng, chợ vải, ao nhuộm

const TREES: Placement[] = [
  { model: MODEL_TREE, x: -27, z: -82, yaw: 0.6, scale: 0.42, tint: [1, 1, 1] },
  { model: MODEL_TREE, x: 28, z: -80, yaw: 2.2, scale: 0.42, tint: [1, 1, 1] },
  { model: MODEL_TREE, x: 10, z: 46, yaw: 1.1, scale: 0.4, tint: [1, 1, 1] },
];
const WELLS: Placement[] = [
  { model: MODEL_WELL, x: -10, z: -62, yaw: 0.5, scale: 1, tint: [1, 1, 1] },
  { model: MODEL_WELL, x: 12, z: 32, yaw: 2.4, scale: 1, tint: [1, 1, 1] },
];

const MARKET = { x: 58, z: 26 };
const m = (dx: number, dz: number): [number, number] => [MARKET.x + dx, MARKET.z + dz];
const STALL_SPOTS: readonly (readonly [number, number])[] = [m(10.5, 0), m(5, 9), m(-5, 9), m(5, -9), m(-5, -9)];
const STALLS: Placement[] = STALL_SPOTS.map(([x, z], i) => ({ model: MODEL_STALL, x, z, yaw: Math.atan2(MARKET.x - x, MARKET.z - z) + (i % 2 ? 0.1 : -0.1), scale: 1, tint: [1, 0.98 - (i % 3) * 0.03, 0.95] as const }));
const MARKET_PROPS: PropPlacement[] = [
  prop('sap-vai', ...m(8.2, 5.6), 0.3),
  prop('sap-vai', ...m(-8.2, 5.8), -0.25),
  prop('gia-vai', ...m(0, 11.5), Math.PI),
  prop('gia-vai', ...m(-12, 6), Math.PI / 2),
  prop('gia-vai', ...m(8.5, -11.5), 0),
  prop('thung', ...m(-1.5, -11.8), 0, 1),
  prop('hom', ...m(-8.5, -5.6), 0.3, 1),
  prop('hom', ...m(8.5, -5.2), -0.2, 1),
  prop('chum', ...m(14.4, 3.2), 0, 1),
  prop('ban-da', ...m(0, -5.5), 0.1, 0.9),
  prop('dong-soi', ...m(3.5, -4), 0.2),
];

const PONDS: VillagePond[] = [
  { x: -60, z: 40, r: 13, water: '#4C7FBF' }, // vũng chàm (xanh chàm sáng, nhìn ra là nước)
  { x: -78, z: 50, r: 11, water: '#B8644A' }, // vũng nhuộm đỏ nâu
  { x: -50, z: 56, r: 8 },
  { x: -74, z: 28, r: 8, water: '#5A8CC4' },
];
const JETTY = scatter('cau-ao', -46.2, 40, 1, 0);
const POND_PROPS: PropPlacement[] = [
  // bến đá và chum nhuộm ven ao
  prop('ban-da', -43.5, 46, 0.4, 0.9),
  prop('khoi-da', -42, 34, 0.5),
  prop('chum-cham', -40, 50, 0),
  prop('chum-do', -37.5, 53, 0.4),
  prop('chum-cham', -36, 30, 0),
  prop('dong-soi', -44.5, 29, 0.3),
  // sào phơi sợi trên bờ
  prop('sao-soi', -52, 66, 0.2),
  prop('sao-soi', -41, 63, -0.1),
  prop('sao-soi', -92, 38, Math.PI / 2),
  prop('sao-soi', -64, 21, 0.1),
];

// ---------------------------------------------------------------------------
// Thẻ "Em có biết?": 4 thẻ ở 4 khu cách xa nhau

const SCROLLS: VillageScroll[] = [
  { index: 0, x: AISLE_X, z: -60.5, zone: 'phoi' },
  { index: 1, x: -60, z: -31, zone: 'khungcui' },
  { index: 2, x: -43, z: 36, zone: 'aonhuom' },
  { index: 3, x: MARKET.x, z: MARKET.z, zone: 'chovai' },
];

// ---------------------------------------------------------------------------
// Ruộng dâu (luống bụi thấp), đường

const FIELDS: VillageField[] = [
  { x: -95, z: -45, hx: 6, hz: 14, yaw: 0.1, kind: 'dau' },
  { x: -96, z: 8, hx: 6, hz: 13, yaw: 0, kind: 'dau' },
  { x: -50, z: -96, hx: 12, hz: 5, yaw: 0, kind: 'dau' },
  { x: 92, z: 52, hx: 5, hz: 12, yaw: 0, kind: 'dau' },
  { x: 40, z: 100, hx: 14, hz: 5, yaw: 0, kind: 'dau' },
  { x: -30, z: 100, hx: 12, hz: 5, yaw: 0.04, kind: 'dau' },
];

/** Luống dâu của ruộng: hàng bụi dọc trục x của ruộng, cách nhau 2,3 theo trục z; mỗi hàng chia thành các đoạn dài 6,4. */
function mulberryRows(f: VillageField): ScatterPlacement[] {
  const out: ScatterPlacement[] = [];
  const segs = Math.max(1, Math.floor((f.hx * 2 - 0.4) / 6.6));
  const step = (f.hx * 2) / segs;
  const rows = Math.max(1, Math.floor((f.hz * 2 - 1) / 2.3));
  const c = Math.cos(f.yaw);
  const s = Math.sin(f.yaw);
  for (let j = 0; j < rows; j++) {
    const lz = -f.hz + (f.hz * 2 * (j + 0.5)) / rows;
    for (let k = 0; k < segs; k++) {
      const lx = -f.hx + step * (k + 0.5);
      const shade = 0.92 + ((j * 3 + k * 5) % 7) * 0.012;
      out.push(scatter('luong-dau', f.x + lx * c + lz * s, f.z - lx * s + lz * c, 1, f.yaw, [shade, 1, shade - 0.02], { collide: false }));
    }
  }
  return out;
}
const MULBERRY: ScatterPlacement[] = FIELDS.flatMap(mulberryRows);

const ROADS: VillageRoad[] = [
  { x0: 0, z0: -128, x1: 0, z1: -100, width: 5.4, kind: 'gach' }, // đại lộ từ cổng
  { x0: 0, z0: -100, x1: 0, z1: -70, width: 4.6, kind: 'gach' }, // qua sân đình
  { x0: 0, z0: -70, x1: 0, z1: 56, width: 3.8 }, // trục bắc nam
  ...LANES.map((z) => ({ x0: -2, z0: z, x1: LANE_END, z1: z, width: 3.2 })), // hai ngõ phía tây
  { x0: -2, z0: -31, x1: -62, z1: -31, width: 2.6 }, // ngõ giữa tới thẻ xóm khung cửi
  { x0: 0, z0: -50, x1: 94, z1: -50, width: 4.4 }, // đường ra bãi phơi
  { x0: AISLE_X, z0: -50, x1: AISLE_X, z1: -60.5, width: 2.2 }, // lối giữa bãi phơi
  { x0: 0, z0: MARKET.z, x1: MARKET.x, z1: MARKET.z, width: 3.6 }, // sang chợ vải
  { x0: 0, z0: 40, x1: -46, z1: 40, width: 3.4 }, // ra ao nhuộm
  { x0: -10, z0: -62, x1: 0, z1: -62, width: 2.2 },
];

const YARDS = [
  { x: PLAZA.x, z: PLAZA.z, r: 15, kind: 'gach' as const, tint: '#A28C7D' }, // sân đình lát gạch đỏ nung trầm (viền đá vẽ ở WorldTerrain)
  { x: PLAZA.x, z: PLAZA.z, r: 14, kind: 'vet' as const, tint: '#8A7A6D', opacity: 0.5 }, // lớp xám nâu phủ cả sân cho bớt đỏ (giảm bão hòa)
  // vệt loang: mảng sẫm và mảng nhạt mờ phủ lên gạch cho khỏi đều một màu
  { x: -6, z: -78, r: 6, kind: 'vet' as const, tint: '#5A4234', opacity: 0.4 },
  { x: 7, z: -92, r: 5.5, kind: 'vet' as const, tint: '#74563F', opacity: 0.32 },
  { x: 3, z: -84, r: 7, kind: 'vet' as const, tint: '#CDB29B', opacity: 0.3 },
  { x: -10, z: -93, r: 4.5, kind: 'vet' as const, tint: '#4A382D', opacity: 0.3 },
  { x: 11, z: -79, r: 4, kind: 'vet' as const, tint: '#6B4F3C', opacity: 0.28 },
  { x: 64, z: -68, r: 25 }, // bãi phơi vải
  { x: 65, z: -88, r: 18 }, // hàng chum nhuộm
  { x: MARKET.x, z: MARKET.z, r: 15 }, // sân chợ vải
  { x: -45, z: 40, r: 6 }, // bến ao
  { x: -60, z: -31, r: 6 }, // sân thẻ xóm khung cửi
];

// ---------------------------------------------------------------------------
// Dân làng và đường nhỏ cho mũi tên

const VILLAGERS: VillagerLoop[] = [
  // bà cụ quanh đại lộ và sân đình
  [
    [-2.5, -122],
    [-2.5, -106],
    [-10, -102],
    [-12, -92],
    [-3, -84],
    [-2.5, -100],
  ],
  // chú nông dân dọc đường ra bãi phơi
  [
    [6, -48],
    [30, -48],
    [50, -48],
    [30, -52],
    [8, -52],
  ],
  // bà cụ trong sân chợ vải
  [
    [MARKET.x - 12, MARKET.z - 1],
    [MARKET.x - 3, MARKET.z + 4],
    [MARKET.x + 4, MARKET.z + 4],
    [MARKET.x - 3, MARKET.z - 3],
  ],
  // chú nông dân dọc phố dệt (ngõ thứ nhất)
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
  // chú nông dân dọc đường ra ao nhuộm
  [
    [-6, 42],
    [-22, 42],
    [-38, 41],
    [-24, 38.5],
  ],
];

const NODES: VillagePaths['nodes'] = [
  { id: 'A', x: 0, z: -112 },
  { id: 'S', x: 0, z: -98 },
  { id: 'W1', x: -10, z: -97 },
  { id: 'W2', x: -10, z: -88 },
  { id: 'P', x: 0, z: -85 },
  { id: 'PE', x: 8, z: -77 },
  { id: 'T0', x: 0, z: -66 },
  { id: 'X1', x: 0, z: -50 },
  { id: 'EW', x: AISLE_X, z: -50 },
  { id: 'X2', x: 0, z: -31 },
  { id: 'X3', x: 0, z: -16 },
  { id: 'M', x: 0, z: MARKET.z },
  { id: 'MK', x: MARKET.x - 8, z: MARKET.z },
  { id: 'Y', x: 0, z: 40 },
  { id: 'AO', x: -40, z: 40 },
];
const PATHS: VillagePaths = {
  nodes: NODES,
  links: [
    ['A', 'S'],
    ['S', 'W1'],
    ['W1', 'W2'],
    ['W2', 'P'],
    ['P', 'PE'],
    ['PE', 'T0'],
    ['T0', 'X1'],
    ['X1', 'EW'],
    ['X1', 'X2'],
    ['X2', 'X3'],
    ['X3', 'M'],
    ['M', 'MK'],
    ['M', 'Y'],
    ['Y', 'AO'],
  ],
  entry: 'A',
  boardJoin: 'S',
  guideStand: { x: -5.6, z: -80.8, join: 'P' },
  scrollStands: [
    { x: AISLE_X, z: -58.8, join: 'EW' },
    { x: -58.5, z: -31, join: 'X2' },
    { x: -42, z: 38, join: 'AO' },
    { x: MARKET.x - 1.6, z: MARKET.z - 1.4, join: 'MK' },
  ],
};

// ---------------------------------------------------------------------------
// Rải đồ có hạt giống, tránh mọi thứ đã đặt (bộ rải dùng chung ở villageKit.ts)

function anchors(): Spot[] {
  const out: Spot[] = [
    ...placementSpots([...HOUSES, ...LANE.looms, ...TREES, ...WELLS, ...STALLS]),
    ...propSpots([...DYE_PROPS, ...MARKET_PROPS, ...POND_PROPS, ...LANE.shelves, ...POTS, PAVILION]),
    ...scatterSpots(POLES),
  ];
  for (const b of BOARDS) out.push({ x: b.x, z: b.z, r: 1.4 });
  out.push({ x: DESK.x, z: DESK.z, r: 1.4 }, { x: GUIDE.x, z: GUIDE.z, r: 1 });
  for (const c of COMPANIONS) out.push({ x: c.x, z: c.z, r: 1 });
  for (const p of PONDS) out.push({ x: p.x, z: p.z, r: p.r + 1.4 });
  for (const s of SCROLLS) out.push({ x: s.x, z: s.z, r: 1.6 });
  out.push({ x: JETTY.x, z: JETTY.z, r: 3 });
  return out;
}

/** Rải đồ phụ: tre ở vườn và đồi, cây ăn quả, hoa, chum, rơm. Mỗi món chỉ đặt nếu còn chỗ trống (bán kính chân cộng khoảng hở). */
function fillers(): { scatter: ScatterPlacement[]; props: PropPlacement[]; placements: Placement[] } {
  const rng = createMulberry32(20260210);
  const f = createFiller({ wallRadius: DET_WALL_RADIUS, gateZ: DET_GATE_Z, keepInside: KEEP_INSIDE, taken: anchors(), roads: ROADS, fields: FIELDS, yards: YARDS.filter((y) => y.kind !== 'vet'), villagers: VILLAGERS, paths: PATHS });
  const hills: ScatterPlacement[] = [
    scatter('doi', -105, -16, 7, 0, [0.14, 0.4, 0.09], { sy: 0.6 }),
    scatter('doi', 100, -22, 9, 1, [0.16, 0.42, 0.1], { sy: 0.55 }),
    scatter('doi', 8, 108, 8, 2, [0.15, 0.39, 0.1], { sy: 0.55 }),
    scatter('doi', 64, 90, 7, 3, [0.15, 0.41, 0.09], { sy: 0.6 }),
    scatter('doi', -70, 84, 7, 4, [0.17, 0.43, 0.11], { sy: 0.6 }),
  ];
  f.addHills(hills);
  f.wallRing(rng);
  f.gateBamboo(rng);
  f.hillBamboo(rng, hills);
  // vườn cây ăn quả ở các góc trống
  f.orchard(rng, -30, 30, 80, 90, 7);
  f.orchard(rng, 20, 50, 50, 66, 8);
  f.orchard(rng, -66, -40, -84, -66, 8);
  f.scatterBamboo(rng, 90, 30, 86);
  f.houseFlora(rng, [...LANE.houses, ...OTHER_HOUSES]);
  f.avenueFlora(rng, 24);
  f.pondFlora(rng, PONDS, 18);
  f.pondStones(rng, PONDS, 26); // đá ven bờ ao (xen khóm hoa và cỏ)
  f.circleFlora(rng, 0, -85, 12, 9, 5);
  return { scatter: f.scatter, props: f.props, placements: f.placements };
}

const FILL = fillers();

const PLACEMENTS: Placement[] = [...HOUSES, ...LANE.looms, ...TREES, ...WELLS, ...STALLS, ...FILL.placements];

const SCATTER: ScatterPlacement[] = [...POLES, ...MULBERRY, JETTY, ...FILL.scatter];

const PROPS: PropPlacement[] = [
  // bàn đặt Sổ Chung và cuốn Sổ Chung bìa tím trên bàn
  prop('ban-chep', DESK.x, DESK.z, DESK.yaw),
  prop('so-chung', DESK.x, DESK.z, DESK.yaw),
  PAVILION,
  ...POTS,
  ...DYE_PROPS,
  ...MARKET_PROPS,
  ...POND_PROPS,
  ...LANE.shelves,
  ...FILL.props,
];

/** Số nhà ở (cả làng, không tính khung cửi) để test và thống kê. */
export const DET_HOUSE_COUNT = HOUSES.length;

export const LANG_DET_LAYOUT: VillageLayoutInput & { guide: VillageGuideDef } = {
  id: 'lang-det',
  radius: DET_RADIUS,
  gate: { model: 'env/cong-lang-det', x: 0, z: DET_GATE_Z, yaw: Math.PI },
  start: { x: 0, z: -96, yaw: 0 },
  placements: PLACEMENTS,
  props: PROPS,
  boards: BOARDS,
  guide: GUIDE,
  companions: COMPANIONS,
  yards: YARDS,
  roads: ROADS,
  wall: { radius: DET_WALL_RADIUS, gap: 9.5 },
  ponds: PONDS,
  fields: FIELDS,
  villagers: VILLAGERS,
  paths: PATHS,
  scatter: SCATTER,
  scrolls: SCROLLS,
  seed: 20260107,
};

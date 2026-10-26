import { createMulberry32 } from '../../../lib/rng';
import { footprintRadiusOf } from '../../cho/footprints';
import { MODEL_STALL, MODEL_TREE, MODEL_WELL, type Placement, type PropPlacement } from '../../cho/marketLayout';
import { type ScatterPlacement } from '../../village/scatter';
import type { VillageBlock, VillageBoardDef, VillageField, VillageGuideDef, VillageLayoutInput, VillagePaths, VillagePond, VillageRoad, VillageScroll, VillageStream, VillagerLoop } from '../../village/villageLayout';
import { smoothPath, type RiverPoint } from '../river';
import { createFiller, placementSpots, propSpots, prop, scatter, thatch, tile, type Spot } from './villageKit';

/**
 * Bố cục Làng Bạc (mốc 3, bước L5; spec 08 mục "Cảnh làng"): làng bán kính 125 mở ra phía sau cổng `env/cong-lang-bac`, bao quanh bằng lũy tre, cùng cỡ và cách đặt với ba làng kia (tâm làng cách tâm chợ 197). Chỉ là dữ liệu
 * (không import three), tọa độ làng như các làng kia: gốc là tâm làng, +Z là phía bắc của làng (người vào cổng nhìn về +Z), cổng ở (0, −125); tên hướng theo cách gọi của Làng Giấy (đông là +X).
 *
 * Các khu, nối bằng đường làng (đường gạch ở đại lộ và quầy đổi bạc, đường đất ở ngõ):
 * - Cây Gộp Sổ (giữa làng, quanh (0, −80)): cây đa lớn (nền rễ là vật cản), sân đất nện, ba biển gỗ quay mặt về cổng, thầy Linh đứng dưới tán; 15 thẻ gỗ ghi số treo trên cành, lay nhẹ: đúng cây ví dụ của Bài 4 (xem `banyanTags.ts`);
 * - Quầy đổi bạc (đông nam, giữa đường ngang): năm lều chợ, dây xu, bàn thỏi bạc, cân đĩa, rương gỗ, sổ cái trên bàn; thẻ "Em có biết?" số 1;
 * - Bến sông (đông bắc): nhánh sông nhỏ chảy trong làng (hai đầu là hai vũng nước), bến gỗ có dốc, ba thuyền mui lá, kiện hàng, thúng, lái buôn; thẻ số 2;
 * - Nhà giữ sổ (tây): nhà ngói lớn, hiên rộng, bàn chép sổ, giá sổ cái, rương sổ; thẻ số 3;
 * - Ao sen (tây bắc): ao lớn, lá sen và hoa sen nổi trên nước, cầu ao; thẻ số 4;
 * - Khu nhà ở: nhà ngói và nhà tranh dọc các ngõ, hai giếng, vườn cây ăn quả;
 * - Rìa làng: ruộng lúa, đồi tre, lũy tre bao quanh;
 * - 6 dân làng đi lại giữa các khu.
 */

// ---------------------------------------------------------------------------
// Hằng

export const BAC_RADIUS = 125;
/** Cổng cách tâm làng bấy nhiêu (về phía nam). */
export const BAC_GATE_Z = -125;
/** Lũy tre: tâm các bụi nằm ở bán kính này (vật cản là chuỗi hộp ở cùng bán kính). */
export const BAC_WALL_RADIUS = 122;
/** Đồ không được vượt qua bán kính này (tính cả cỡ chân): còn chừa chỗ cho lũy tre. */
const KEEP_INSIDE = 118;

/** Hướng (yaw) để mặt trước (+Z) của một vật ở (x, z) quay về (tx, tz). */
const faceTo = (x: number, z: number, tx: number, tz: number): number => Math.atan2(tx - x, tz - z);
const SOUTH = Math.PI;

// ---------------------------------------------------------------------------
// Cây Gộp Sổ: cây đa, ba biển gỗ, thầy Linh, thẻ gỗ ghi số

export const BANYAN = { x: 0, z: -80, scale: 1 } as const;
const BANYAN_TREE: Placement = { model: MODEL_TREE, x: BANYAN.x, z: BANYAN.z, yaw: 0, scale: BANYAN.scale, tint: [1, 1, 1] };
/** Mười lăm thẻ gỗ ghi số: MỘT món rải (xem `scatterGeometry.createNumberTags`), +z của hình quay về cổng làng. */
const TAGS = scatter('the-so', BANYAN.x, BANYAN.z, BANYAN.scale, Math.PI, [1, 1, 1], { collide: false });

const BOARDS: VillageBoardDef[] = [
  { level: 10, icon: 'ui/icons/trang-vang', x: 4.6, z: -91, yaw: Math.PI },
  { level: 11, icon: 'ui/icons/guoc-moc', x: 0, z: -89.8, yaw: Math.PI },
  { level: 12, icon: 'ui/icons/ngoi-sao', x: -4.6, z: -91, yaw: Math.PI },
];
const GUIDE: VillageGuideDef = { character: 'thayLinh', x: -7.3, z: -86.6, yaw: faceTo(-7.3, -86.6, -2, -100) };
const PLAZA_PROPS: PropPlacement[] = [
  prop('chum', -3.6, -88.2, 0, 1.05),
  prop('chum', 3.8, -88.6, 0, 1),
  prop('hom', -15.2, -90.4, 0.4, 1),
  prop('thung', -16.6, -87.8, 0, 1),
  prop('ban-da', 11.4, -83.5, Math.PI / 2, 0.9),
  prop('chau-canh', 13.6, -93.5, 0.3),
  prop('chau-canh', 14.4, -68, 1.5),
  prop('chau-canh', -15.2, -69, 2.2),
  prop('chau-canh', -15.4, -95, 0.6),
  prop('chau-canh', 8.6, -97, 1.9),
];

// ---------------------------------------------------------------------------
// Quầy đổi bạc (đông nam): năm lều chợ và đồ bày bán

const STALL_Z = -40;
const STALL_X = [47, 55, 63, 71, 79];
const STALLS: Placement[] = STALL_X.map((x, i) => ({ model: MODEL_STALL, x, z: STALL_Z + (i % 2) * 0.3, yaw: SOUTH + (i - 2) * 0.03, scale: 1, tint: [1 - (i % 3) * 0.02, 1, 1 - (i % 2) * 0.03] as const }));
const COUNTER_Z = -43.7;
const STALL_PROPS: PropPlacement[] = [
  prop('day-xu', 47, COUNTER_Z, SOUTH),
  prop('thoi-bac', 55, COUNTER_Z - 0.1, SOUTH),
  prop('can-bac', 63, COUNTER_Z, SOUTH),
  prop('ban-chep', 71, COUNTER_Z - 0.1, SOUTH),
  prop('so-chung', 71, COUNTER_Z - 0.1, SOUTH + 0.1),
  prop('ruong-go', 77.6, COUNTER_Z, SOUTH),
  prop('ruong-go', 80.8, COUNTER_Z, SOUTH - 0.2),
  prop('day-xu', 84.2, COUNTER_Z + 0.3, SOUTH - 0.1),
  // sau lều: kiện hàng, thúng, chum, rương
  prop('kien-hang', 47, -36.2, 0.1),
  prop('thung', 51.2, -36.4, 0, 1),
  prop('ruong-go', 55, -36.4, 0),
  prop('chum', 59.2, -36.2, 0, 1),
  prop('kien-hang', 63, -36.4, -0.2),
  prop('thung', 67.2, -36.4, 0, 1),
  prop('chum', 75.2, -36.4, 0, 1),
  prop('kien-hang', 79, -36.2, 0.2),
];

// ---------------------------------------------------------------------------
// Bến sông (đông bắc): nhánh sông nhỏ, bến gỗ, thuyền, lái buôn

/** Đường tim nhánh sông (x, z, bề rộng): từ vũng ở phía bắc xuống vũng ở phía nam; từ z = 46 trở xuống thẳng theo trục z ở x = 89 (chỗ có bến gỗ, nước rộng 9). */
const STREAM_CONTROL: RiverPoint[] = [
  { x: 92, z: 62, w: 8 },
  { x: 91.2, z: 56, w: 8.5 },
  { x: 89, z: 50, w: 9 },
  { x: 89, z: 46, w: 9 },
  { x: 89, z: 38, w: 9 },
  { x: 89, z: 30, w: 9 },
  { x: 89, z: 22, w: 9 },
  { x: 89, z: 14, w: 9 },
  { x: 89, z: 8, w: 9 },
];
export const STREAM_AXIS_X = 89;
export const STREAM_WIDTH = 9;
/** Đoạn nước thẳng (hộp chữ nhật theo trục) và chỗ bến gỗ: tim bến ở z = 31, ngang 3,4. */
const BAND = { z0: 8, z1: 46 };
const DOCK = { x: 86.3, z: 31 };
const STREAM: VillageStream = { points: STREAM_CONTROL };
const STREAM_SAMPLES: RiverPoint[] = smoothPath(STREAM_CONTROL);
const WATER_HEIGHT = 0.3;

function segmentBlock(a: RiverPoint, b: RiverPoint): VillageBlock {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, hx: (a.w + b.w) / 4 + 0.2, hz: len / 2 + 0.6, yaw: Math.atan2(b.x - a.x, b.z - a.z), height: WATER_HEIGHT };
}

/**
 * Vật cản của nước: chuỗi hộp xoay phủ dải nước ngoài đoạn thẳng, và trong đoạn thẳng ba hộp chữ nhật chừa lối cho bến gỗ (bến rộng 3,4 từ bờ tây tới mũi bến ở x = 90,8; phía đông mũi bến vẫn là nước).
 */
function waterBlocks(): VillageBlock[] {
  const out: VillageBlock[] = [];
  for (let i = 0; i + 1 < STREAM_SAMPLES.length; i++) {
    const a = STREAM_SAMPLES[i];
    const b = STREAM_SAMPLES[i + 1];
    if (a.z <= BAND.z1 && b.z <= BAND.z1 && a.z >= BAND.z0 && b.z >= BAND.z0) continue;
    out.push(segmentBlock(a, b));
  }
  const hw = STREAM_WIDTH / 2;
  const laneLo = DOCK.z - 1.7;
  const laneHi = DOCK.z + 1.7;
  const tip = DOCK.x + 4.5;
  const box = (x0: number, x1: number, z0: number, z1: number): VillageBlock => ({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2, yaw: 0, height: WATER_HEIGHT });
  out.push(box(STREAM_AXIS_X - hw, STREAM_AXIS_X + hw, BAND.z0, laneLo));
  out.push(box(STREAM_AXIS_X - hw, STREAM_AXIS_X + hw, laneHi, BAND.z1));
  out.push(box(tip, STREAM_AXIS_X + hw, laneLo, laneHi));
  return out;
}

const DOCK_PROPS: PropPlacement[] = [
  prop('ben-go', DOCK.x, DOCK.z, Math.PI / 2),
  // ba thuyền mui lá đậu sát bến, thân dọc theo dòng nước
  prop('thuyen', 87.5, 26.4, 0.04, 1, [1, 0.98, 0.96]),
  prop('thuyen', 91.3, 36.4, -0.06, 1, [0.98, 0.97, 1]),
  prop('thuyen', 87.4, 39.4, 0.07, 0.95, [1, 1, 0.97]),
  // kiện hàng, thúng, rương, chum trên bờ gần bến
  prop('kien-hang', 79.2, 26.6, 0.3),
  prop('kien-hang', 76.2, 37.6, -0.3),
  prop('kien-hang', 82.4, 38.2, 0.5),
  prop('thung', 78.4, 24.8, 0, 1),
  prop('thung', 80.6, 40.2, 0, 1),
  prop('thung', 75.6, 21.2, 0, 1),
  prop('ruong-go', 82.8, 24.6, 0.4),
  prop('chum', 76.2, 23.6, 0, 1),
  prop('rom', 72.6, 39.6, 0.5, 0.9),
];
const MERCHANT: VillageGuideDef = { character: 'laiBuon', x: 81.5, z: 27.4, yaw: faceTo(81.5, 27.4, DOCK.x, DOCK.z) };

/** Hai vũng nước ở hai đầu nhánh sông (vũng bắc: nguồn; vũng nam: nơi nước đọng). */
const STREAM_POOLS: VillagePond[] = [
  { x: 92, z: 63.5, r: 5.5 },
  { x: 89, z: 1.5, r: 7 },
];

// ---------------------------------------------------------------------------
// Nhà giữ sổ (tây): nhà ngói lớn, hiên, bàn chép sổ, giá sổ cái, rương

const LEDGER_HOUSE = tile(-79, -10, [0, -10], 1.7, [1, 0.97, 0.93], 0);
const LEDGER_PROPS: PropPlacement[] = [
  prop('mai-che', -70.9, -10, Math.PI / 2),
  prop('ban-chep', -70.7, -12.1, Math.PI / 2),
  prop('so-chung', -70.7, -12.1, Math.PI / 2 + 0.15),
  prop('ban-chep', -70.7, -7.9, Math.PI / 2),
  prop('so-chung', -70.7, -7.9, Math.PI / 2 - 0.12),
  prop('ke-so', -70.8, -15.4, Math.PI / 2),
  prop('ke-so', -70.8, -4.6, Math.PI / 2),
  prop('ruong-go', -74.4, -17.8, 0.2),
  prop('ruong-go', -74.4, -2.2, -0.2),
  prop('ke-so', -78.4, -16.8, Math.PI),
  prop('thung', -67.2, -17.4, 0, 1),
  prop('chau-canh', -66.2, -3.6, 0.7),
];

// ---------------------------------------------------------------------------
// Ao sen (tây bắc): ao lớn, lá sen và hoa sen nổi trên nước, cầu ao

const LOTUS_POND: VillagePond = { x: -66, z: 52, r: 13 };
const POND_JETTY = scatter('cau-ao', -51.2, 52, 1, 0);

function lotusProps(): PropPlacement[] {
  const rng = createMulberry32(20260421);
  const out: PropPlacement[] = [];
  const placed: { x: number; z: number; r: number }[] = [];
  const tryPut = (kind: 'la-sen' | 'hoa-sen', scaleMin: number, scaleSpan: number): void => {
    for (let t = 0; t < 40; t++) {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * (LOTUS_POND.r - 2.2);
      const x = LOTUS_POND.x + Math.cos(a) * d;
      const z = LOTUS_POND.z + Math.sin(a) * d;
      const s = scaleMin + rng() * scaleSpan;
      const r = (kind === 'la-sen' ? 1.1 : 0.7) * s;
      // chừa lối trống ra cầu ao ở bờ đông
      if (Math.hypot(x - (LOTUS_POND.x + LOTUS_POND.r - 4), z - LOTUS_POND.z) < 5) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + r)) continue;
      placed.push({ x, z, r });
      const g = 0.92 + rng() * 0.08;
      out.push(prop(kind, x, z, rng() * 6.28, s, [g, 1, g]));
      return;
    }
  };
  for (let i = 0; i < 16; i++) tryPut('la-sen', 0.85, 0.5);
  for (let i = 0; i < 9; i++) tryPut('hoa-sen', 1.35, 0.5);
  return out;
}
const LOTUS = lotusProps();

// ---------------------------------------------------------------------------
// Thẻ "Em có biết?": 4 thẻ ở 4 khu cách xa nhau (quầy đổi bạc, bến sông, nhà giữ sổ, ao sen)

const SCROLLS: VillageScroll[] = [
  { index: 0, x: 59.1, z: -44.9, zone: 'quaybac' },
  { index: 1, x: 80.4, z: 35.2, zone: 'bensong' },
  { index: 2, x: -62.4, z: -11, zone: 'nhaso' },
  { index: 3, x: -46.8, z: 55.4, zone: 'aosen' },
];

// ---------------------------------------------------------------------------
// Ruộng ở rìa, đường, sân

const FIELDS: VillageField[] = [
  { x: -98, z: -24, hx: 6, hz: 13, yaw: 0.05, kind: 'lua' },
  { x: -96, z: 20, hx: 5, hz: 12, yaw: 0, kind: 'lua' },
  { x: -50, z: 92, hx: 12, hz: 5, yaw: 0.04, kind: 'lua' },
  { x: 30, z: 98, hx: 12, hz: 5, yaw: 0, kind: 'lua' },
  { x: 100, z: -24, hx: 5, hz: 12, yaw: 0, kind: 'lua' },
];

const ROADS: VillageRoad[] = [
  { x0: 0, z0: -128, x1: 0, z1: -100, width: 5.4, kind: 'gach' }, // đại lộ từ cổng
  { x0: 0, z0: -100, x1: 0, z1: -70, width: 4.6, kind: 'gach' }, // qua sân Cây Gộp Sổ
  { x0: 0, z0: -70, x1: 0, z1: 88, width: 3.8 }, // trục bắc nam
  { x0: -96, z0: -50, x1: 96, z1: -50, width: 4.2 }, // đường ngang: ngõ tây và đường ra quầy đổi bạc
  { x0: -10, z0: -97, x1: -10, z1: -66, width: 2.4 }, // đường vòng quanh sân (phía tây)
  { x0: 0, z0: -10, x1: -58, z1: -10, width: 3.4 }, // ra nhà giữ sổ
  { x0: 0, z0: -10, x1: 79, z1: 31, width: 3.2 }, // lên bến sông (chéo)
  { x0: 79, z0: 31, x1: 84, z1: 31, width: 3.2 }, // lối xuống dốc bến gỗ
  { x0: 0, z0: 22, x1: -46, z1: 52, width: 3 }, // ra ao sen (chéo)
  { x0: -46, z0: 52, x1: -50, z1: 52, width: 2.6 },
  { x0: 59, z0: -50, x1: 59.2, z1: -46.2, width: 2.2 }, // lối tới thẻ ở quầy
];

const YARDS = [
  { x: BANYAN.x, z: BANYAN.z, r: 17 }, // sân đất nện quanh gốc cây
  { x: -6, z: -91, r: 6, kind: 'vet' as const, tint: '#5A4234', opacity: 0.4 },
  { x: 8, z: -75, r: 5.5, kind: 'vet' as const, tint: '#74563F', opacity: 0.32 },
  { x: 2, z: -93, r: 7, kind: 'vet' as const, tint: '#CDB29B', opacity: 0.3 },
  { x: -12, z: -78, r: 4.5, kind: 'vet' as const, tint: '#4A382D', opacity: 0.3 },
  { x: 63, z: -43, r: 24 }, // sân quầy đổi bạc (đất nện như xưởng của Làng Khắc Dấu; gạch đỏ chỉ ở đại lộ)
  { x: 56, z: -45, r: 7, kind: 'vet' as const, tint: '#5A4234', opacity: 0.32 },
  { x: 72, z: -44, r: 6.5, kind: 'vet' as const, tint: '#CDB29B', opacity: 0.3 },
  { x: 66, z: -38, r: 8, kind: 'vet' as const, tint: '#74563F', opacity: 0.28 },
  { x: -68, z: -10, r: 12 }, // sân nhà giữ sổ
  { x: 82, z: 31, r: 9 }, // sân bến
  { x: -50, z: 52, r: 7 }, // sân đầu cầu ao
];

// ---------------------------------------------------------------------------
// Dân làng và đường nhỏ cho mũi tên

const VILLAGERS: VillagerLoop[] = [
  // bà cụ quanh đại lộ và sân Cây Gộp Sổ
  [
    [-2.5, -122],
    [-2.5, -106],
    [-12, -98],
    [-12, -84],
    [-12, -99],
    [-4, -106],
  ],
  // chú nông dân dọc đường ra quầy
  [
    [6, -48.5],
    [30, -48.5],
    [46, -48.5],
    [30, -51.5],
    [8, -51.5],
  ],
  // bà cụ trước nhà giữ sổ
  [
    [-30, -8],
    [-45, -8],
    [-56, -9],
    [-45, -12],
    [-30, -11],
  ],
  // chú nông dân dọc ngõ tây
  [
    [-8, -49],
    [-30, -49.5],
    [-60, -49],
    [-86, -50],
    [-50, -51],
  ],
  // bà cụ dọc trục lên phía bắc
  [
    [2.5, -4],
    [2.5, 14],
    [-2.5, 30],
    [-2.5, 8],
  ],
  // chú nông dân dọc đường ra ao sen
  [
    [-6, 25.5],
    [-20, 34.5],
    [-34, 43.5],
    [-20, 36],
  ],
];

const NODES: VillagePaths['nodes'] = [
  { id: 'A', x: 0, z: -112 },
  { id: 'S', x: 0, z: -98 },
  { id: 'W1', x: -10, z: -96 },
  { id: 'G', x: -10, z: -84 },
  { id: 'W2', x: -10, z: -66 },
  { id: 'X1', x: 0, z: -50 },
  { id: 'EQ', x: 59, z: -50 },
  { id: 'WW', x: -60, z: -50 },
  { id: 'Y1', x: 0, z: -10 },
  { id: 'NH', x: -56, z: -10 },
  { id: 'BS', x: 80, z: 31 },
  { id: 'Z1', x: 0, z: 22 },
  { id: 'PL', x: -47, z: 52 },
];
const PATHS: VillagePaths = {
  nodes: NODES,
  links: [
    ['A', 'S'],
    ['S', 'W1'],
    ['W1', 'G'],
    ['G', 'W2'],
    ['W2', 'X1'],
    ['X1', 'EQ'],
    ['X1', 'WW'],
    ['X1', 'Y1'],
    ['Y1', 'NH'],
    ['Y1', 'BS'],
    ['Y1', 'Z1'],
    ['Z1', 'PL'],
  ],
  entry: 'A',
  boardJoin: 'S',
  guideStand: { x: -9.4, z: -88, join: 'G' },
  scrollStands: [
    { x: 59.3, z: -46.4, join: 'EQ' },
    { x: 80.2, z: 33.8, join: 'BS' },
    { x: -60.8, z: -10.4, join: 'NH' },
    { x: -47.2, z: 53.8, join: 'PL' },
  ],
};

const WELLS: Placement[] = [
  { model: MODEL_WELL, x: 14.5, z: -30, yaw: 0.5, scale: 1, tint: [1, 1, 1] },
  { model: MODEL_WELL, x: -14.5, z: 36, yaw: 2.4, scale: 1, tint: [1, 1, 1] },
];

// ---------------------------------------------------------------------------
// Chỗ đã chiếm, rồi xếp nhà ở dọc các ngõ, rải đồ phụ có hạt giống (bộ rải dùng chung ở villageKit.ts)

const ALL_PROPS: PropPlacement[] = [...PLAZA_PROPS, ...STALL_PROPS, ...DOCK_PROPS, ...LEDGER_PROPS, ...LOTUS];
const STREAM_REST_PROPS = ['chan', 'nuoc', 'mai-che', 'da-vun', 'de-may', 'thuyen', 'la-sen', 'hoa-sen', 'ben-go', 'so-chung'] as const;

/** Chỗ chiếm của nước nhánh sông: vòng tròn dọc đường tim (kể cả bờ) để đồ rải không rơi xuống nước. */
function streamSpots(): Spot[] {
  const out: Spot[] = [];
  for (const p of STREAM_SAMPLES) out.push({ x: p.x, z: p.z, r: p.w / 2 + 1.9 });
  for (const q of STREAM_POOLS) out.push({ x: q.x, z: q.z, r: q.r + 1.4 });
  return out;
}

function anchors(): Spot[] {
  const out: Spot[] = [...placementSpots([BANYAN_TREE, ...STALLS, LEDGER_HOUSE, ...WELLS]), ...propSpots(ALL_PROPS, STREAM_REST_PROPS), ...streamSpots()];
  out.push({ x: DOCK.x + 1.6, z: DOCK.z, r: 5.6 }); // bến gỗ và dốc
  out.push({ x: LOTUS_POND.x, z: LOTUS_POND.z, r: LOTUS_POND.r + 1.4 });
  out.push({ x: BANYAN.x, z: BANYAN.z, r: 7.5 }); // nền rễ cây đa và tán thấp
  out.push({ x: -70.9, z: -10, r: 4 }); // hiên nhà giữ sổ
  for (const b of BOARDS) out.push({ x: b.x, z: b.z, r: 1.4 });
  out.push({ x: GUIDE.x, z: GUIDE.z, r: 1 }, { x: MERCHANT.x, z: MERCHANT.z, r: 1 });
  for (const s of SCROLLS) out.push({ x: s.x, z: s.z, r: 1.6 });
  return out;
}

/** Đồi: bốn đồi tre xanh ở rìa. */
const HILLS: ScatterPlacement[] = [
  scatter('doi', -104, -44, 7, 0, [0.14, 0.4, 0.09], { sy: 0.6 }),
  scatter('doi', 100, -48, 7, 1, [0.16, 0.42, 0.1], { sy: 0.55 }),
  scatter('doi', -14, 106, 8, 2, [0.15, 0.39, 0.1], { sy: 0.55 }),
  scatter('doi', 60, 92, 7, 3, [0.15, 0.41, 0.09], { sy: 0.6 }),
];

/** Các ngõ có nhà ở: từ (ax, az) tới (bx, bz), cách nhau `step`, lệch `off` khỏi tim ngõ; nhà quay mặt vào ngõ. */
const HOUSE_LANES: readonly { a: readonly [number, number]; b: readonly [number, number]; step: number; off: number }[] = [
  { a: [-20, -50], b: [-92, -50], step: 12.5, off: 8.2 },
  { a: [20, -50], b: [92, -50], step: 12.5, off: 8.4 },
  { a: [0, -36], b: [0, -14], step: 11, off: 12 },
  { a: [0, 28], b: [0, 84], step: 12, off: 12 },
  { a: [8, -6], b: [70, 26], step: 14, off: 8 },
  { a: [-6, 26], b: [-42, 48], step: 14, off: 8 },
  { a: [-8, -10], b: [-52, -10], step: 13, off: 9 },
];
/** Số nhà ở nhiều nhất (spec: 25 đến 35). */
const HOUSE_MAX = 34;

function fillers(): { scatter: ScatterPlacement[]; props: PropPlacement[]; placements: Placement[]; houses: Placement[] } {
  const rng = createMulberry32(20260421 ^ 0x9e37);
  const taken = anchors();
  const f = createFiller({ wallRadius: BAC_WALL_RADIUS, gateZ: BAC_GATE_Z, keepInside: KEEP_INSIDE, taken, roads: ROADS, fields: FIELDS, yards: YARDS.filter((y) => y.kind !== 'vet'), villagers: VILLAGERS, paths: PATHS });
  f.addHills(HILLS);
  // nhà ở dọc các ngõ: chỗ nào trống mới đặt (không đè quầy, bến, nhà giữ sổ, đường, lối đi)
  const houses: Placement[] = [];
  let k = 0;
  for (const lane of HOUSE_LANES) {
    const len = Math.hypot(lane.b[0] - lane.a[0], lane.b[1] - lane.a[1]);
    const n = Math.max(1, Math.floor(len / lane.step));
    const dx = (lane.b[0] - lane.a[0]) / len;
    const dz = (lane.b[1] - lane.a[1]) / len;
    for (let i = 0; i < n; i++) {
      for (const side of [-1, 1]) {
        const jt = (rng() - 0.5) * 1.6;
        const jo = (rng() - 0.5) * 1.4;
        const scale = 0.94 + rng() * 0.14;
        const shade = 0.94 + rng() * 0.06;
        const twist = (rng() - 0.5) * 0.24;
        const along = (i + 0.5) * (len / n) + jt;
        const px = lane.a[0] + dx * along;
        const pz = lane.a[1] + dz * along;
        const x = px - dz * side * (lane.off + jo);
        const z = pz + dx * side * (lane.off + jo);
        const tint: [number, number, number] = [shade, shade - 0.01 * (i % 3), shade - 0.03 * (side > 0 ? 1 : 0)];
        const make = (i + (side > 0 ? 1 : 0) + k) % 3 === 1 ? tile : thatch;
        const h = make(x, z, [px, pz], scale, tint, twist);
        if (houses.length >= HOUSE_MAX) continue;
        if (!f.onGround(h.x, h.z, footprintRadiusOf(h.model) * h.scale)) continue;
        houses.push(h);
        taken.push({ x: h.x, z: h.z, r: footprintRadiusOf(h.model) * h.scale });
      }
    }
    k++;
  }
  f.wallRing(rng);
  f.gateBamboo(rng);
  f.hillBamboo(rng, HILLS);
  // vườn cây ăn quả ở các góc trống
  f.orchard(rng, 22, 62, 58, 86, 8);
  f.orchard(rng, -96, -60, 62, 82, 8);
  f.orchard(rng, -64, -30, -100, -76, 8);
  f.orchard(rng, 40, 76, -104, -78, 8);
  f.scatterBamboo(rng, 70, 30, 88);
  f.houseFlora(rng, houses);
  f.avenueFlora(rng, 24);
  f.circleFlora(rng, BANYAN.x, BANYAN.z, 12, 9, 6);
  f.pondFlora(rng, [LOTUS_POND, ...STREAM_POOLS], 26);
  f.pondStones(rng, [LOTUS_POND, ...STREAM_POOLS], 26);
  return { scatter: f.scatter, props: f.props, placements: f.placements, houses };
}

const FILL = fillers();
const HOUSES: Placement[] = FILL.houses;
const PLACEMENTS: Placement[] = [BANYAN_TREE, ...STALLS, LEDGER_HOUSE, ...HOUSES, ...WELLS, ...FILL.placements];
const SCATTER: ScatterPlacement[] = [TAGS, POND_JETTY, ...FILL.scatter];
const PROPS: PropPlacement[] = [...ALL_PROPS, ...FILL.props];
const PONDS: VillagePond[] = [LOTUS_POND, ...STREAM_POOLS];

/** Số nhà ở (không kể nhà giữ sổ và lều) để test và thống kê. */
export const BAC_HOUSE_COUNT = HOUSES.length;
/** Chỗ hai đầu dưới của nhánh sông và mép nước: dùng để test. */
export const BAC_STREAM = { samples: STREAM_SAMPLES, axisX: STREAM_AXIS_X, width: STREAM_WIDTH, band: BAND, dock: DOCK };

export const LANG_BAC_LAYOUT: VillageLayoutInput & { guide: VillageGuideDef } = {
  id: 'lang-bac',
  radius: BAC_RADIUS,
  gate: { model: 'env/cong-lang-bac', x: 0, z: BAC_GATE_Z, yaw: Math.PI },
  start: { x: 0, z: -96, yaw: 0 },
  placements: PLACEMENTS,
  props: PROPS,
  boards: BOARDS,
  guide: GUIDE,
  companions: [MERCHANT],
  yards: YARDS,
  roads: ROADS,
  wall: { radius: BAC_WALL_RADIUS, gap: 9.5 },
  ponds: PONDS,
  streams: [STREAM],
  blocks: waterBlocks(),
  fields: FIELDS,
  villagers: VILLAGERS,
  paths: PATHS,
  scatter: SCATTER,
  scrolls: SCROLLS,
  seed: 20260109,
};

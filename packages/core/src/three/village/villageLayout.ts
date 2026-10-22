/**
 * Bố cục và vật cản của cảnh làng 3D dùng chung (spec 03 mục 6, mốc 2 bước 9). Hàm thuần, không import three. Mỗi làng (packages/village-*) cung cấp dữ liệu bố cục
 * (`VillageLayoutInput`: cổng, nhà, đồ vật, biển gỗ, người dẫn, sân đất); `assembleVillage` dựng vật cản theo chân thật (như chợ: `collidersFor`, `propCollider`) và vật chắn camera.
 */
import type { CharacterId } from '../../content/characters';
import type { VillageId } from '../../village';
import type { CameraBlocker } from '../cameraCollision';
import { circle, obox, type Obstacle } from '../collision';
import { cameraBlockersFor, collidersFor, fenceColliders, fenceLayout, fenceRun, propCollider, type FenceLayout, type Placement, type PropPlacement } from '../cho/marketLayout';
import { ringColliders, scatterCollider, type ScatterPlacement } from './scatter';

/** Một biển gỗ chỉ màn `level` (số màn 1 đến 12), đặt ở (x, z), mặt trước quay về `yaw` (như rotation.y của three, mặt trước là +Z của biển). */
export interface VillageBoardDef {
  level: number;
  /** Icon trên biển (đường dẫn không đuôi trong manifest, ví dụ "ui/icons/trang-vang") */
  icon: string;
  x: number;
  z: number;
  yaw: number;
}

/** Người dẫn đứng yên (nhân vật không có xương), mặt quay về `yaw`. */
export interface VillageGuideDef {
  character: CharacterId;
  x: number;
  z: number;
  yaw: number;
}

export interface VillageGateDef {
  /** Model cổng, ví dụ "env/cong-lang-giay" */
  model: string;
  x: number;
  z: number;
  yaw: number;
}

/** Con đường từ (x0, z0) tới (x1, z1), rộng `width`: đường đất (mặc định) hay đường gạch (bước X3: đại lộ và quanh sân). */
export interface VillageRoad {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  width: number;
  kind?: 'dat' | 'gach';
}

/**
 * Một thẻ "Em có biết?" đặt trong làng (bước X3): cuộn giấy phát sáng có cột sáng. `index` là số thứ tự thẻ (từ 0, ứng với thẻ `index` của `villageKnowCards`), `zone` là khu (khóa trong content/
 * knowScrolls.ts) để Bi gợi ý khu có thẻ mà không chỉ đúng chỗ.
 */
export interface VillageScroll {
  index: number;
  x: number;
  z: number;
  zone: string;
}

/** Hàng rào lũy tre bao quanh làng (bước X3): bán kính, chỗ chừa lối quanh cổng, tâm. Vẽ bằng bụi tre dựng bằng code (`scatter`), vật cản là chuỗi hộp. */
export interface VillageWall {
  radius: number;
  gap: number;
  center?: { x: number; z: number };
}

/** Ao làng: hợp của các vũng tròn (mỗi vũng một hình tròn mặt nước, đi vào là bị chặn), bờ cỏ rộng thêm `POND_BANK` quanh vũng. */
export interface VillagePond {
  x: number;
  z: number;
  r: number;
}
/** Bề rộng bờ ao (đơn vị) quanh mặt nước. */
export const POND_BANK = 1.3;

/** Ruộng lúa ở rìa làng: hình chữ nhật nửa rộng hx (theo trục x của ruộng) và hz, xoay `yaw`; đi qua được (không có vật cản), chỉ là mặt đất. */
export interface VillageField {
  x: number;
  z: number;
  hx: number;
  hz: number;
  yaw: number;
}

/** Hàng rào tre thẳng ngắn (rào sân nhà, ranh ruộng): có vật cản như hàng rào quanh làng. */
export interface VillageFenceRun {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** Đường đi lại của dân làng: vòng các điểm [x, z] (xem `Villager`). */
export type VillagerLoop = readonly (readonly [number, number])[];

/**
 * Đường đất nhỏ nối các khu làm đồ thị đường của mũi tên chỉ đường (tọa độ làng): các nút và các đoạn nối; `entry` là nút nối với cổng, `boardJoin` là nút nối tới chỗ đứng trước từng biển gỗ,
 * `guideStand` là chỗ đứng trước người dẫn (nối từ nút `join`). Làng không khai báo thì dùng một nút ở ngã vào làng.
 */
export interface VillagePaths {
  nodes: { id: string; x: number; z: number }[];
  links: [string, string][];
  entry: string;
  boardJoin: string;
  guideStand?: { x: number; z: number; join: string };
  /** Chỗ đứng cạnh từng thẻ "Em có biết?" (theo `scrolls`, cùng chỉ số) và nút nối tới (bước X3) */
  scrollStands?: { x: number; z: number; join: string }[];
}

export interface VillageLayoutInput {
  id: VillageId;
  /** Bán kính khu đi lại (biên của WalkWorld) */
  radius: number;
  gate: VillageGateDef;
  /** Chỗ người chơi xuất hiện (ngay trong cổng) và hướng mặt */
  start: { x: number; z: number; yaw: number };
  /** Model đặt trong làng (nhà, bụi tre, phên phơi giấy…; cổng không nằm trong danh sách này) */
  placements: Placement[];
  /** Đồ nhỏ do code dựng (chồng giấy, bể ngâm, bàn chép sổ…) */
  props: PropPlacement[];
  boards: VillageBoardDef[];
  /** Người dẫn đứng yên; làng chưa dựng đủ (mốc 3) thì không có */
  guide?: VillageGuideDef;
  /** Sân đất nện: hình tròn */
  yards: { x: number; z: number; r: number }[];
  roads: VillageRoad[];
  /** Hàng rào tre tròn quanh khu: bán kính; chừa lối quanh cổng (bán kính `gap` tính từ tâm cổng). Bỏ trống thì không có hàng rào. */
  fence?: { radius: number; gap: number; /** tâm vòng rào (mặc định gốc tọa độ; thế giới mở: tâm làng) */ center?: { x: number; z: number } };
  /** Ao làng (hợp của các vũng tròn), ruộng lúa ở rìa, hàng rào tre ngắn, dân làng đi lại và đường đất nhỏ: Làng Giấy từ bước W2 */
  ponds?: VillagePond[];
  fields?: VillageField[];
  fenceRuns?: VillageFenceRun[];
  villagers?: VillagerLoop[];
  paths?: VillagePaths;
  /** Đồ rải dựng bằng code (bụi tre, cây ăn quả, phên, cầu ao, đồi): làng lớn từ bước X3 */
  scatter?: ScatterPlacement[];
  /** Thẻ "Em có biết?" rải trong làng (bước X3); làng chưa có thì không có thẻ để nhặt */
  scrolls?: VillageScroll[];
  /** Lũy tre bao quanh làng (bước X3), thay cho hàng rào tròn `fence` ở làng lớn */
  wall?: VillageWall;
  /** Hạt giống cho đồ nhỏ rải ngẫu nhiên (hoa, tint) */
  seed: number;
}

/** Chiều cao vật cản của mặt nước ao (để vẽ khung xem va chạm và chắn camera thấp); người chơi không đi xuống nước. */
export const POND_COLLIDER_HEIGHT = 0.3;

/** Biển gỗ: rộng 1,9 (nửa rộng 0,95), dày 0,28, cao 1,9; vật cản là một hộp xoay mỏng sát tấm biển. */
export const BOARD_HALF_WIDTH = 0.95;
export const BOARD_HALF_THICKNESS = 0.14;
export const BOARD_HEIGHT = 1.9;
/** Người dẫn là vật cản tròn bán kính này. */
export const GUIDE_RADIUS = 0.45;

export interface VillageLayout extends VillageLayoutInput {
  colliders: CameraBlocker[];
  obstacles: Obstacle[];
  blockers: CameraBlocker[];
  /** Mọi model cần tải (cổng và các model đặt trong làng, không trùng) */
  models: string[];
  /** Hàng rào quanh làng và các hàng rào ngắn trong làng (gộp); null nếu không có */
  fenceLayout: FenceLayout | null;
}

/** Vật cản của một biển gỗ. */
export function boardCollider(b: VillageBoardDef): CameraBlocker {
  return { shape: obox(b.x, b.z, BOARD_HALF_WIDTH, BOARD_HALF_THICKNESS, b.yaw), height: BOARD_HEIGHT };
}

/** Dựng vật cản và vật chắn camera cho một làng từ dữ liệu bố cục. */
export function assembleVillage(input: VillageLayoutInput): VillageLayout {
  const colliders: CameraBlocker[] = [];
  const blockers: CameraBlocker[] = [];
  const gatePlacement: Placement = { model: input.gate.model, x: input.gate.x, z: input.gate.z, yaw: input.gate.yaw, scale: 1, tint: [1, 1, 1] };
  for (const p of [gatePlacement, ...input.placements]) {
    for (const c of collidersFor(p)) colliders.push(c);
    for (const c of cameraBlockersFor(p)) blockers.push(c);
  }
  for (const p of input.props) {
    const c = propCollider(p);
    if (!c) continue;
    colliders.push(c);
    if (p.kind === 'rom') blockers.push(c);
  }
  for (const b of input.boards) colliders.push(boardCollider(b));
  if (input.guide) colliders.push({ shape: circle(input.guide.x, input.guide.z, GUIDE_RADIUS), height: 1.7 });
  for (const p of input.ponds ?? []) colliders.push({ shape: circle(p.x, p.z, p.r), height: POND_COLLIDER_HEIGHT });
  for (const p of input.scatter ?? []) {
    const c = scatterCollider(p);
    if (!c) continue;
    colliders.push(c);
    if (p.kind === 'doi') blockers.push(c);
  }
  if (input.wall) {
    const w = input.wall;
    for (const c of ringColliders(w.center ?? { x: 0, z: 0 }, w.radius, input.gate, w.gap)) {
      colliders.push(c);
      blockers.push(c);
    }
  }
  let fence: FenceLayout | null = null;
  if (input.fence) {
    const g = input.gate;
    const gap = input.fence.gap;
    fence = fenceLayout(input.fence.radius, (x, z) => Math.hypot(x - g.x, z - g.z) < gap, input.fence.center);
  }
  if (input.fenceRuns && input.fenceRuns.length > 0) {
    fence ??= { posts: [], segments: [] };
    for (const r of input.fenceRuns) {
      const run = fenceRun(r.x0, r.z0, r.x1, r.z1);
      fence = { posts: [...fence.posts, ...run.posts], segments: [...fence.segments, ...run.segments] };
    }
  }
  if (fence) for (const c of fenceColliders(fence)) colliders.push(c);
  const models = [...new Set([input.gate.model, ...input.placements.map((p) => p.model)])];
  return { ...input, colliders, obstacles: colliders.map((c) => c.shape), blockers, models, fenceLayout: fence };
}

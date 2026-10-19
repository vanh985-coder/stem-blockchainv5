/**
 * Bố cục và vật cản của cảnh làng 3D dùng chung (spec 03 mục 6, mốc 2 bước 9). Hàm thuần, không import three. Mỗi làng (packages/village-*) cung cấp dữ liệu bố cục
 * (`VillageLayoutInput`: cổng, nhà, đồ vật, biển gỗ, người dẫn, sân đất); `assembleVillage` dựng vật cản theo chân thật (như chợ: `collidersFor`, `propCollider`) và vật chắn camera.
 */
import type { CharacterId } from '../../content/characters';
import type { VillageId } from '../../village';
import type { CameraBlocker } from '../cameraCollision';
import { circle, obox, type Obstacle } from '../collision';
import { cameraBlockersFor, collidersFor, fenceColliders, fenceLayout, propCollider, type FenceLayout, type Placement, type PropPlacement } from '../cho/marketLayout';

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

/** Con đường đất từ (x0, z0) tới (x1, z1), rộng `width`. */
export interface VillageRoad {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  width: number;
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
  /** Hạt giống cho đồ nhỏ rải ngẫu nhiên (hoa, tint) */
  seed: number;
}

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
  let fence: FenceLayout | null = null;
  if (input.fence) {
    const g = input.gate;
    const gap = input.fence.gap;
    fence = fenceLayout(input.fence.radius, (x, z) => Math.hypot(x - g.x, z - g.z) < gap, input.fence.center);
    for (const c of fenceColliders(fence)) colliders.push(c);
  }
  const models = [...new Set([input.gate.model, ...input.placements.map((p) => p.model)])];
  return { ...input, colliders, obstacles: colliders.map((c) => c.shape), blockers, models, fenceLayout: fence };
}

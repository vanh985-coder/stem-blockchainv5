/**
 * Thế giới mở (mốc 2, bước W1): chợ ở giữa (bán kính 42), 4 con đường đất dài 30 đơn vị từ rìa chợ ra cổng 4 làng (Bắc Giấy, Nam Dệt, Tây Khắc Dấu, Đông Bạc; đường sang Bạc qua cầu bắc qua sông).
 * Hàm thuần, không import three. Hệ tọa độ như chợ: Bắc = +Z, Nam = −Z, Tây = +X, Đông = −X.
 *
 * Mỗi làng có bố cục riêng viết ở hệ tọa độ CỦA LÀNG (cổng ở phía nam của làng, người vào làng nhìn về +Z; xem `villages/giay.ts`). `VillageFrame` đổi hệ của làng sang hệ thế giới: xoay quanh
 * trục đứng `yaw` (như rotation.y của three: (x, z) → (x cos + z sin, −x sin + z cos)) rồi dời sao cho cổng của làng rơi đúng chỗ cổng ngoài thế giới (cách tâm chợ `GATE_WORLD_DISTANCE`).
 * Cỡ làng giữ nguyên (Làng Giấy hiện bán kính 21, cổng cách tâm làng 17,5, nên tâm làng ở cách tâm chợ 89,5; khi làng mở rộng ở bước W2 thì cổng vẫn ở chỗ cũ và tâm làng dời ra xa hơn, tới khoảng 105).
 */
import { VILLAGE_ORDER } from '../../content/levels';
import type { VillageId } from '../../village';
import { GATES, type Direction, type GateDef, type GateId, type Placement, type PropPlacement } from '../cho/marketLayout';
import type { VillageBoardDef, VillageGateDef, VillageGuideDef, VillageLayoutInput, VillageRoad } from '../village/villageLayout';

/** Cổng làng cách tâm chợ bấy nhiêu: từ rìa chợ (bán kính 42) tới cổng dài 30. */
export const GATE_WORLD_DISTANCE = 72;
/** Người chơi vào làng (đã qua cổng) khi cách tâm làng dưới bấy nhiêu (cổng nằm ở 17,5 nên phải bước qua cổng 1 đơn vị). */
export const VILLAGE_INSIDE_RADIUS = 16.5;
/** Biên đi lại của cả thế giới (hình tròn quanh tâm chợ): bao hết 4 làng (tâm ở 89,5, bán kính 21) và đồng ruộng quanh làng. */
export const WORLD_BOUNDS = 150;

export interface VillageFrame {
  village: VillageId;
  gate: GateId;
  direction: Direction;
  /** Góc xoay của hệ làng so với hệ thế giới (radian, như rotation.y của three); 0 là +Z của làng trùng +Z thế giới */
  yaw: number;
  /** Vectơ đơn vị từ chợ ra làng (hướng +Z của làng trong thế giới) */
  dirX: number;
  dirZ: number;
  /** Tâm cổng làng trong thế giới */
  gateX: number;
  gateZ: number;
}

const DEFS: readonly { village: VillageId; gate: GateId; direction: Direction; yaw: number }[] = [
  { village: 'lang-giay', gate: 'giay', direction: 'bac', yaw: 0 },
  { village: 'lang-det', gate: 'det', direction: 'nam', yaw: Math.PI },
  { village: 'lang-khac-dau', gate: 'khac-dau', direction: 'tay', yaw: Math.PI / 2 },
  { village: 'lang-bac', gate: 'bac', direction: 'dong', yaw: -Math.PI / 2 },
];

function makeFrame(d: (typeof DEFS)[number]): VillageFrame {
  const clean = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v); // bỏ sai số làm tròn (sin π ≈ 1,2e−16)
  const dirX = clean(Math.sin(d.yaw));
  const dirZ = clean(Math.cos(d.yaw));
  return { ...d, dirX, dirZ, gateX: dirX * GATE_WORLD_DISTANCE, gateZ: dirZ * GATE_WORLD_DISTANCE };
}

/** 4 hệ làng theo thứ tự làng (Giấy, Dệt, Khắc Dấu, Bạc). */
export const VILLAGE_FRAMES: readonly VillageFrame[] = DEFS.map(makeFrame);

export function frameOf(village: VillageId): VillageFrame {
  return VILLAGE_FRAMES[VILLAGE_ORDER.indexOf(village)];
}

export function frameOfGate(gate: GateId): VillageFrame {
  return VILLAGE_FRAMES.find((f) => f.gate === gate) as VillageFrame;
}

/** Điểm (lx, lz) của hệ làng, với tâm hệ ở (ox, oz) ngoài thế giới, sang thế giới. */
export function rotateToWorld(yaw: number, lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: lx * c + lz * s, z: -lx * s + lz * c };
}

/** Cổng ngoài thế giới của một làng: mặt trước quay về chợ (như cổng ở rìa chợ ở các bước trước). */
export function worldGate(f: VillageFrame): GateDef {
  const model = (GATES.find((g) => g.id === f.gate) as GateDef).model;
  return { id: f.gate, model, direction: f.direction, x: f.gateX, z: f.gateZ, yaw: f.yaw + Math.PI };
}

/** Bố cục làng đã đổi sang tọa độ thế giới, kèm tâm. */
export interface WorldVillageInput extends VillageLayoutInput {
  center: { x: number; z: number };
}

/** Đổi bố cục viết ở hệ làng sang tọa độ thế giới (không sửa dữ liệu vào). Cổng được đặt đúng chỗ cổng thế giới, quay mặt về chợ. */
export function placeVillage(local: VillageLayoutInput, f: VillageFrame): WorldVillageInput {
  const g = rotateToWorld(f.yaw, local.gate.x, local.gate.z);
  const ox = f.gateX - g.x;
  const oz = f.gateZ - g.z;
  const at = (lx: number, lz: number) => {
    const p = rotateToWorld(f.yaw, lx, lz);
    return { x: p.x + ox, z: p.z + oz };
  };
  const placement = (p: Placement): Placement => ({ ...p, ...at(p.x, p.z), yaw: p.yaw + f.yaw });
  const prop = (p: PropPlacement): PropPlacement => ({ ...p, ...at(p.x, p.z), yaw: p.yaw + f.yaw });
  const board = (b: VillageBoardDef): VillageBoardDef => ({ ...b, ...at(b.x, b.z), yaw: b.yaw + f.yaw });
  const guide = (q: VillageGuideDef): VillageGuideDef => ({ ...q, ...at(q.x, q.z), yaw: q.yaw + f.yaw });
  const road = (r: VillageRoad): VillageRoad => {
    const a = at(r.x0, r.z0);
    const b = at(r.x1, r.z1);
    return { x0: a.x, z0: a.z, x1: b.x, z1: b.z, width: r.width };
  };
  const center = { x: ox, z: oz };
  const gate: VillageGateDef = { model: local.gate.model, x: f.gateX, z: f.gateZ, yaw: f.yaw + Math.PI };
  const s = at(local.start.x, local.start.z);
  return {
    ...local,
    center,
    gate,
    start: { x: s.x, z: s.z, yaw: local.start.yaw + f.yaw },
    placements: local.placements.map(placement),
    props: local.props.map(prop),
    boards: local.boards.map(board),
    guide: local.guide ? guide(local.guide) : undefined,
    yards: local.yards.map((y) => ({ ...y, ...at(y.x, y.z) })),
    roads: local.roads.map(road),
    fence: local.fence ? { ...local.fence, center } : undefined,
  };
}

/** Đổi một điểm của hệ làng sang thế giới theo bố cục đã đặt (`placeVillage` dùng cùng phép). */
export function localToWorld(local: Pick<VillageLayoutInput, 'gate'>, f: VillageFrame, lx: number, lz: number): { x: number; z: number } {
  const g = rotateToWorld(f.yaw, local.gate.x, local.gate.z);
  const p = rotateToWorld(f.yaw, lx, lz);
  return { x: p.x + f.gateX - g.x, z: p.z + f.gateZ - g.z };
}


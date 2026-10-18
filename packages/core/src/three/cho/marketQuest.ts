/**
 * Nhiệm vụ, cổng mở/khóa và mũi tên chỉ đường ở chợ phiên 3D (spec 04 mục 3 "Cổng làng", "HUD" và mục 5). Hàm thuần, không import three.
 * Cổng mở theo tiến độ: cổng làng thứ k mở khi đã có k Trang Sổ Vàng (làng đầu luôn mở); tài khoản giáo viên mở hết (unlock.ts).
 */
import { VILLAGE_ORDER } from '../../content/levels';
import type { VillageId } from '../../village';
import { GATES, type GateId } from './marketLayout';

/** Thứ tự cổng theo thứ tự làng: Giấy, Dệt, Khắc Dấu, Bạc. */
export const GATE_ORDER: readonly GateId[] = ['giay', 'det', 'khac-dau', 'bac'];

/** Làng của từng cổng. */
export const GATE_VILLAGE: Readonly<Record<GateId, VillageId>> = {
  giay: 'lang-giay',
  det: 'lang-det',
  'khac-dau': 'lang-khac-dau',
  bac: 'lang-bac',
};

/** Số Trang Sổ Vàng tối đa. */
export const MAX_PAGES = GATE_ORDER.length;

/** Số Trang Sổ Vàng đưa về số nguyên trong [0, 4] (số lạ thì 0). */
export function clampPages(goldenPages: number): number {
  if (!Number.isFinite(goldenPages)) return 0;
  return Math.max(0, Math.min(MAX_PAGES, Math.floor(goldenPages)));
}

/**
 * Cổng `id` đang mở không: giáo viên mở hết; còn lại theo `villageOpen` (từ `computeUnlock`, theo thứ tự `VILLAGE_ORDER`). Cổng đầu tiên (Làng Giấy)
 * luôn mở.
 */
export function isGateOpen(id: GateId, villageOpen: readonly boolean[], isTeacher: boolean): boolean {
  if (isTeacher) return true;
  const k = GATE_ORDER.indexOf(id);
  return k === 0 || villageOpen[k] === true;
}

/** Trạng thái mở của cả 4 cổng. */
export function gateStates(villageOpen: readonly boolean[], isTeacher: boolean): Record<GateId, boolean> {
  return {
    giay: isGateOpen('giay', villageOpen, isTeacher),
    det: isGateOpen('det', villageOpen, isTeacher),
    'khac-dau': isGateOpen('khac-dau', villageOpen, isTeacher),
    bac: isGateOpen('bac', villageOpen, isTeacher),
  };
}

/** Làng phải giúp trước khi cổng này mở (làng đứng trước trong thứ tự); cổng đầu tiên thì null. */
export function previousVillage(id: GateId): VillageId | null {
  const k = GATE_ORDER.indexOf(id);
  return k <= 0 ? null : VILLAGE_ORDER[k - 1];
}

/** Chỉ số nhiệm vụ (0 đến 4) theo số Trang Sổ Vàng: 0 trang là "Đến Làng Giấy…", 4 trang là hội làng. */
export function questIndex(goldenPages: number): number {
  return clampPages(goldenPages);
}

/** Cổng cần tới theo nhiệm vụ (mũi tên chỉ về đó); đủ 4 trang thì không còn cổng nào để tới (hội làng). */
export function questGate(goldenPages: number): GateId | null {
  const k = questIndex(goldenPages);
  return k < MAX_PAGES ? GATE_ORDER[k] : null;
}

/** Người chơi xuất hiện cách tâm cổng bấy nhiêu về phía sân chợ khi từ làng về (`?tu=<làng>`). */
export const SPAWN_FROM_GATE = 3.8;

/**
 * Chỗ xuất hiện ở chợ khi từ một làng về (`?tu=lang-giay`): ngay trước cổng làng đó (về phía sân chợ), quay lưng về cổng (mặt hướng vào sân chợ). `tu` không phải làng thì null
 * (dùng chỗ xuất hiện mặc định).
 */
export function marketSpawn(tu: string | null | undefined): { x: number; z: number; yaw: number } | null {
  const village = Object.entries(GATE_VILLAGE).find(([, v]) => v === tu);
  if (!village) return null;
  const g = GATES.find((q) => q.id === village[0]);
  if (!g) return null;
  const len = Math.hypot(g.x, g.z);
  const ux = -g.x / len;
  const uz = -g.z / len; // về phía tâm chợ
  return { x: g.x + ux * SPAWN_FROM_GATE, z: g.z + uz * SPAWN_FROM_GATE, yaw: Math.atan2(ux, uz) };
}

/** Người chơi đứng cách tâm cổng bấy nhiêu, nhìn vào cổng, khi chiếu hiệu ứng mở cổng (xem `gateOpeningSpawn`). */
export const OPENING_DISTANCE = 8.5;

/** Cổng vừa mở sau khi làng `giver` trao Trang Sổ Vàng (cổng của làng kế tiếp); làng cuối (Bạc) không mở cổng nào nên null. */
export function gateOpenedAfter(giver: VillageId): GateId | null {
  const k = VILLAGE_ORDER.indexOf(giver);
  return k < 0 || k + 1 >= GATE_ORDER.length ? null : GATE_ORDER[k + 1];
}

/**
 * Chỗ xuất hiện khi về chợ lần đầu sau khi nhận Trang Sổ Vàng của làng `giver` (`/cho?mo=<làng>`): cách cổng vừa mở `OPENING_DISTANCE` về phía sân chợ, mặt nhìn thẳng vào cổng để thấy
 * hiệu ứng mở cổng. Làng lạ hoặc không có cổng nào mở thì null (dùng chỗ xuất hiện mặc định).
 */
export function gateOpeningSpawn(giver: string | null | undefined): { x: number; z: number; yaw: number; gate: GateId } | null {
  const village = VILLAGE_ORDER.find((v) => v === giver);
  if (!village) return null;
  const id = gateOpenedAfter(village);
  const g = id ? GATES.find((q) => q.id === id) : undefined;
  if (!id || !g) return null;
  const len = Math.hypot(g.x, g.z);
  const ux = -g.x / len;
  const uz = -g.z / len; // về phía tâm chợ
  return { x: g.x + ux * OPENING_DISTANCE, z: g.z + uz * OPENING_DISTANCE, yaw: Math.atan2(-ux, -uz), gate: id };
}

/** Hướng từ (px, pz) về (tx, tz) dạng góc quanh trục đứng (0 là +Z, như rotation.y của three) và khoảng cách. */
export function bearingTo(px: number, pz: number, tx: number, tz: number): { yaw: number; distance: number } {
  const dx = tx - px;
  const dz = tz - pz;
  return { yaw: Math.atan2(dx, dz), distance: Math.hypot(dx, dz) };
}

/** Mũi tên chỉ đường ẩn khi người chơi đã tới gần cổng (trong bấy nhiêu đơn vị). */
export const ARROW_HIDE_DISTANCE = 6;

export interface GuideArrowState {
  visible: boolean;
  yaw: number;
}

/**
 * Mũi tên trên đầu nhân vật chỉ về cổng cần tới. Ghi vào `out` (không cấp phát): `visible` là false khi không có đích (target null) hoặc đã tới gần
 * (trong `ARROW_HIDE_DISTANCE`), `yaw` là hướng về đích.
 */
export function guideArrow(px: number, pz: number, target: { x: number; z: number } | null, out: GuideArrowState): GuideArrowState {
  if (!target) {
    out.visible = false;
    return out;
  }
  const b = bearingTo(px, pz, target.x, target.z);
  out.yaw = b.yaw;
  out.visible = b.distance > ARROW_HIDE_DISTANCE;
  return out;
}

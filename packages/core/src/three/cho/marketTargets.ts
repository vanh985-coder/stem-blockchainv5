/**
 * Vật tương tác (nhấn E) ở chợ phiên: 4 cổng làng, 4 dân làng đi lại và Bi (spec 04 mục 3). Hàm thuần, không import three.
 * Dân làng và Bi di chuyển nên vị trí (x, z) của họ là đối tượng sống, được cập nhật mỗi khung hình (xem Villager và Bi).
 */
import type { Interactable } from '../interaction';
import { GATES, VILLAGER_PATHS, type GateId } from './marketLayout';

export type MarketTarget = { kind: 'gate'; gate: GateId } | { kind: 'villager'; index: number } | { kind: 'bi' };

export const BI_TARGET_ID = 'bi';
export const gateTargetId = (id: GateId): string => `gate:${id}`;
export const villagerTargetId = (index: number): string => `villager:${index}`;

/** Vật tương tác có mã `id` là gì (cổng nào, dân làng thứ mấy, hay Bi); mã lạ thì null. */
export function parseTarget(id: string): MarketTarget | null {
  if (id === BI_TARGET_ID) return { kind: 'bi' };
  const [kind, rest] = id.split(':');
  if (kind === 'gate') {
    const gate = GATES.find((g) => g.id === rest);
    return gate ? { kind: 'gate', gate: gate.id } : null;
  }
  if (kind === 'villager') {
    const index = Number(rest);
    return Number.isInteger(index) && index >= 0 && index < VILLAGER_PATHS.length ? { kind: 'villager', index } : null;
  }
  return null;
}

/**
 * Danh sách vật tương tác theo thứ tự: 4 cổng (đứng yên, tại tâm lối đi), rồi dân làng (đang ở điểm mốc đầu), rồi Bi (vật dự phòng: chỉ được chọn khi
 * không có cổng hay dân làng nào trong bán kính, vì Bi luôn bay sát người chơi). Các đối tượng của dân làng và Bi được ghi đè x, z mỗi khung hình.
 */
export function createInteractables(): Interactable[] {
  return [
    ...GATES.map((g) => ({ id: gateTargetId(g.id), x: g.x, z: g.z })),
    ...VILLAGER_PATHS.map((p, i) => ({ id: villagerTargetId(i), x: p[0][0], z: p[0][1] })),
    { id: BI_TARGET_ID, x: 0, z: 0, fallback: true },
  ];
}

/** Chỉ số của dân làng thứ `index` trong danh sách do `createInteractables` tạo. */
export function villagerSlot(index: number): number {
  return GATES.length + index;
}

/** Chỉ số của Bi trong danh sách do `createInteractables` tạo. */
export function biSlot(): number {
  return GATES.length + VILLAGER_PATHS.length;
}

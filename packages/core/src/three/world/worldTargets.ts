/**
 * Vật tương tác (nhấn E) của thế giới mở (mốc 2, bước W1). Hàm thuần, không import three.
 * Luôn có: cổng làng (chỉ cổng ĐANG ĐÓNG mới có vật tương tác: cổng mở thì đi thẳng qua), 4 dân làng đi lại ở chợ, Bi. Theo vùng: biển gỗ và người dẫn của làng khi vùng đó đã tải.
 * Dân làng và Bi di chuyển nên vị trí của họ là đối tượng sống (do cảnh ghi đè mỗi khung hình): các đối tượng này được tạo MỘT LẦN và dùng lại khi ghép danh sách, để vị trí sống không mất khi danh sách đổi.
 */
import type { VillageId } from '../../village';
import { GATES, VILLAGER_PATHS, type GateId } from '../cho/marketLayout';
import { BI_TARGET_ID, gateTargetId, parseTarget, villagerTargetId, type MarketTarget } from '../cho/marketTargets';
import type { Interactable } from '../interaction';
import { hasKnowCard } from '../../progress/knowCards';
import { parseScrollTarget, scrollTargetId } from '../village/scrollTargets';
import type { WorldVillage } from './worldLayout';

export type WorldTarget = MarketTarget | { kind: 'board'; village: VillageId; level: number } | { kind: 'guide'; village: VillageId } | { kind: 'scroll'; village: VillageId; index: number };

export const boardTargetId = (village: VillageId, level: number): string => `board:${village}:${level}`;
export const guideTargetId = (village: VillageId): string => `guide:${village}`;

export function parseWorldTarget(id: string): WorldTarget | null {
  const b = /^board:(lang-[a-z-]+):(\d+)$/.exec(id);
  if (b) return { kind: 'board', village: b[1] as VillageId, level: Number(b[2]) };
  const g = /^guide:(lang-[a-z-]+)$/.exec(id);
  if (g) return { kind: 'guide', village: g[1] as VillageId };
  const sc = parseScrollTarget(id);
  if (sc) return { kind: 'scroll', village: sc.village, index: sc.index };
  return parseTarget(id);
}

export interface WorldBaseTargets {
  /** Cổng theo thứ tự `GATES` (Giấy, Dệt, Khắc Dấu, Bạc), ở tâm cổng ngoài thế giới */
  gates: Interactable[];
  villagers: Interactable[];
  bi: Interactable;
}

export function createWorldBase(villages: readonly Pick<WorldVillage, 'gate'>[]): WorldBaseTargets {
  return {
    gates: GATES.map((g) => {
      const v = villages.find((q) => q.gate.id === g.id);
      return { id: gateTargetId(g.id), x: v ? v.gate.x : g.x, z: v ? v.gate.z : g.z };
    }),
    villagers: VILLAGER_PATHS.map((p, i) => ({ id: villagerTargetId(i), x: p[0][0], z: p[0][1] })),
    bi: { id: BI_TARGET_ID, x: 0, z: 0, fallback: true },
  };
}

/** Vật tương tác của một làng: các biển gỗ (theo thứ tự trong bố cục), người dẫn (nếu có), rồi các thẻ "Em có biết?" (bước X3). Tạo một lần cho mỗi làng. */
export function createZoneTargets(v: Pick<WorldVillage, 'id' | 'layout'>): Interactable[] {
  const out: Interactable[] = v.layout.boards.map((b) => ({ id: boardTargetId(v.id, b.level), x: b.x, z: b.z }));
  if (v.layout.guide) out.push({ id: guideTargetId(v.id), x: v.layout.guide.x, z: v.layout.guide.z });
  for (const s of v.layout.scrolls ?? []) out.push({ id: scrollTargetId(v.id, s.index), x: s.x, z: s.z });
  return out;
}

/** Bỏ khỏi danh sách vật tương tác của một làng những thẻ đã nhặt (mặt nạ bit collected); thẻ đã nhặt không còn trên mặt đất. Không sửa danh sách vào. */
export function withoutCollectedScrolls(list: readonly Interactable[], collected: number): Interactable[] {
  return list.filter((t) => {
    const sc = parseScrollTarget(t.id);
    return !(sc && hasKnowCard(collected, sc.index));
  });
}

/**
 * Ghép danh sách vật tương tác theo thứ tự: biển và người dẫn của các làng đã tải, cổng đang đóng, dân làng, Bi. Bi ở CUỐI (vật dự phòng).
 */
export function composeTargets(base: WorldBaseTargets, zoneLists: readonly (readonly Interactable[])[], closedGates: ReadonlySet<GateId>): Interactable[] {
  const gates = base.gates.filter((g) => {
    const id = g.id.slice('gate:'.length) as GateId;
    return closedGates.has(id);
  });
  return [...zoneLists.flat(), ...gates, ...base.villagers, base.bi];
}

/**
 * Tiến độ khách đặt sẵn cho chế độ danh sách màn (`?man=`): chỉ trong demo, ghi vào cookie `sc_guest` của trình duyệt (không có máy chủ nào được gọi). Với mỗi màn trong danh sách: đã nhặt đủ thẻ
 * "Em có biết?" của làng đó và các màn đứng trước nó trong làng đã xong. Hàm thuần (trừ `applyDemoPreset`).
 */
import { LEVELS, VILLAGE_ORDER, levelsOfVillage } from '../content/levels';

export interface DemoPreset {
  v: 1;
  lv: Record<string, number[]>;
  gp: number;
  c: number;
  u: number;
  st: 1;
  /** Thẻ đã nhặt theo thứ tự làng */
  kc: number[];
  /** Cảnh mở đầu, giới thiệu làng, hướng dẫn: coi như đã xem */
  vs: number;
  vi: number;
  hd: number;
}

/** Số màn nào phải xong trước khi vào được các màn `levels` (cùng làng, đứng trước, không nằm trong danh sách vì chính nó sẽ được chơi). */
export function prerequisiteLevels(levels: readonly number[]): number[] {
  const need = new Set<number>();
  for (const id of levels) {
    const def = LEVELS.find((l) => l.id === id);
    if (!def) continue;
    for (const l of levelsOfVillage(def.lang)) {
      if (l.id >= id) break;
      if (!levels.includes(l.id)) need.add(l.id);
    }
  }
  return [...need].sort((a, b) => a - b);
}

export function buildDemoPreset(levels: readonly number[], now = Date.now()): DemoPreset {
  const lv: Record<string, number[]> = {};
  for (const id of prerequisiteLevels(levels)) {
    const def = LEVELS.find((l) => l.id === id);
    lv[String(id)] = def?.kind === 'lesson' ? [1, 1, 3, 3, 3] : [1, 1, 1, 0];
  }
  const villages = new Set(levels.map((id) => LEVELS.find((l) => l.id === id)?.lang));
  return {
    v: 1,
    lv,
    gp: 0,
    c: 0,
    u: now,
    st: 1,
    kc: VILLAGE_ORDER.map((v) => (villages.has(v) ? 15 : 0)),
    vs: (1 << VILLAGE_ORDER.length) - 1,
    vi: (1 << VILLAGE_ORDER.length) - 1,
    hd: 2147483647,
  };
}

/** Ghi tiến độ đặt sẵn vào cookie chơi thử (gọi một lần lúc nạp trang, trước khi ứng dụng đọc tiến độ). */
export function applyDemoPreset(levels: readonly number[]): void {
  document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(buildDemoPreset(levels)))}; path=/`;
}

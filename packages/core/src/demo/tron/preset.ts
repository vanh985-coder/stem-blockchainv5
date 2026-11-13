/** Tiến độ khách dựng sẵn cho `&tu=<mã đoạn>` (chế độ trọn): chỉ cookie `sc_guest` của trình duyệt này, không gọi máy chủ. Hàm thuần (trừ `applyTronPreset`). */
import { LEVELS, VILLAGE_ORDER, levelsOfVillage } from '../../content/levels';
import type { DemoPreset } from '../preset';

export interface TronStart {
  /** Số làng đã xong hoàn toàn (đã có Trang Sổ Vàng) */
  prior: number;
  /** Đã xem cảnh mở đầu của làng hiện tại và đã nhặt đủ 4 thẻ */
  cardsDone: boolean;
  /** Đã xem cảnh mở đầu của làng hiện tại (chưa nhặt thẻ) */
  sceneSeen: boolean;
  /** Các màn của làng hiện tại đã xong */
  levels: readonly number[];
}

const bit = (i: number): number => 1 << i;

export function buildTronPreset(start: TronStart, now = Date.now()): DemoPreset & { gs: number; go: number; ks: number; gt: number } {
  const lv: Record<string, number[]> = {};
  const doneLevels = new Set<number>(start.levels);
  for (let v = 0; v < start.prior; v++) for (const l of levelsOfVillage(VILLAGE_ORDER[v])) doneLevels.add(l.id);
  for (const id of doneLevels) {
    const def = LEVELS.find((l) => l.id === id);
    lv[String(id)] = def?.kind === 'lesson' ? [1, 1, 3, 3, 3] : [1, 1, 1, 0];
  }
  const all = (1 << VILLAGE_ORDER.length) - 1;
  const priorBits = (1 << start.prior) - 1;
  const cur = start.prior;
  const kc = VILLAGE_ORDER.map((_, i) => (i < start.prior || (i === cur && start.cardsDone) ? 15 : 0));
  const vs = priorBits | (start.sceneSeen || start.cardsDone ? bit(cur) : 0);
  const ks = priorBits | (start.cardsDone ? bit(cur) : 0);
  const gt = [...doneLevels].reduce((m, id) => m | bit(id - 1), 0);
  return { v: 1, lv, gp: start.prior, c: 0, u: now, st: 1, kc, vs, vi: all, hd: 2147483647, gs: priorBits, go: all, ks, gt };
}

export function applyTronPreset(start: TronStart): void {
  document.cookie = 'sc_guest=' + encodeURIComponent(JSON.stringify(buildTronPreset(start))) + '; path=/';
}

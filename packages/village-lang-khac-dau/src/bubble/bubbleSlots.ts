import type { RoundPlan } from './bubbleLogic';

/**
 * Chỗ màu của mỗi số trong MỘT đợt: màu và kiểu trứng gán theo thứ tự, không theo giá trị số.
 * Các mẫu công khai đúng của đợt (`plan.values`) lấy chỗ 0 đến k−1 theo thứ tự khóa; trứng khác ở khay nạp
 * (số khóa riêng, mẫu của khóa ngoài đợt) lấy các chỗ k, k+1... theo thứ tự khay. Hai số khác nhau trong cùng đợt
 * không bao giờ cùng chỗ nên không bao giờ cùng màu. Khay, máy bắn, bàn và hướng dẫn dùng chung cách gán này.
 */
export function eggSlots(plan: RoundPlan): ReadonlyMap<number, number> {
  const slots = new Map<number, number>();
  for (const v of plan.values) if (!slots.has(v)) slots.set(v, slots.size);
  for (const e of plan.tray) if (!slots.has(e.value)) slots.set(e.value, slots.size);
  return slots;
}

/** Chỗ của số `v`; số lạ (không thuộc đợt) lấy chỗ 0 để vẫn vẽ được */
export const slotOf = (slots: ReadonlyMap<number, number>, v: number): number => slots.get(v) ?? 0;

const cache = new WeakMap<RoundPlan, ReadonlyMap<number, number>>();

/** Như `eggSlots` nhưng nhớ theo đối tượng đợt: vòng vẽ mỗi khung hình gọi mà không cấp phát lại */
export function slotsOfPlan(plan: RoundPlan): ReadonlyMap<number, number> {
  let m = cache.get(plan);
  if (!m) {
    m = eggSlots(plan);
    cache.set(plan, m);
  }
  return m;
}

import { describe, expect, it } from 'vitest';
import { EGG_IMAGES, eggColor, eggImageIndex } from './bubbleArt';
import { BUBBLE_SPEC } from './bubbleConfig';
import { createBubbleGame } from './bubbleLogic';
import { eggSlots, slotOf, slotsOfPlan } from './bubbleSlots';

describe('bubbleSlots: màu trứng gán theo thứ tự khóa trong đợt', () => {
  it('300 seed, mọi đợt: các số khác nhau luôn có chỗ, màu và kiểu ảnh khác nhau', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const game = createBubbleGame(seed);
      for (const plan of game.plans) {
        const slots = eggSlots(plan);
        const values = new Set<number>([...plan.values, ...plan.tray.map((e) => e.value)]);
        expect(new Set(slots.keys())).toEqual(values);
        expect(new Set(slots.values()).size).toBe(values.size);
        const hues = new Set([...values].map((v) => eggColor(slotOf(slots, v)).hue));
        expect(hues.size).toBe(values.size);
        const imgs = [...values].map((v) => eggImageIndex(slotOf(slots, v))).filter((i) => i >= 0);
        expect(new Set(imgs).size).toBe(imgs.length);
      }
    }
  });

  it('mẫu đúng của đợt lấy chỗ 0 đến k−1 theo thứ tự khóa, k ≤ 5', () => {
    for (let seed = 1; seed <= 300; seed++) {
      for (const plan of createBubbleGame(seed).plans) {
        expect(plan.keys.length).toBeLessThanOrEqual(5);
        const slots = eggSlots(plan);
        plan.values.forEach((v, i) => expect(slotOf(slots, v)).toBe(i));
      }
    }
  });

  it('chỗ từ 7 trở đi không có ảnh nhưng vẫn có màu riêng; bàn tập một khóa cũng đúng', () => {
    expect(eggImageIndex(EGG_IMAGES - 1)).toBe(EGG_IMAGES - 1);
    expect(eggImageIndex(EGG_IMAGES)).toBe(-1);
    const practice = createBubbleGame(7, { ...BUBBLE_SPEC, rounds: [{ keys: 1, rows: 2, descendEvery: 99 }] });
    const slots = slotsOfPlan(practice.plans[0]);
    expect(slotOf(slots, practice.plans[0].values[0])).toBe(0);
    expect(slotsOfPlan(practice.plans[0])).toBe(slots);
  });
});

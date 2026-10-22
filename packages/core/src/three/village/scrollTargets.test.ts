import { describe, expect, it } from 'vitest';
import { collectedCount, nearestScroll, parseScrollTarget, scrollNodeId, scrollTargetId, uncollectedScrolls } from './scrollTargets';
import type { VillageScroll } from './villageLayout';

const scrolls: VillageScroll[] = [
  { index: 0, x: 56, z: -38, zone: 'xuong' },
  { index: 1, x: 8.5, z: 66, zone: 'dinh' },
  { index: 2, x: -48.8, z: 40, zone: 'ao' },
  { index: 3, x: 72, z: 24, zone: 'cho' },
];

describe('thẻ Em có biết rải trong làng: hàm thuần', () => {
  it('mã vật tương tác và nút đồ thị khứ hồi; mã lạ thì null', () => {
    expect(scrollTargetId('lang-giay', 3)).toBe('scroll:lang-giay:3');
    expect(scrollNodeId('lang-giay', 3)).toBe('scroll:lang-giay:3');
    expect(parseScrollTarget('scroll:lang-bac:12')).toEqual({ village: 'lang-bac', index: 12 });
    expect(parseScrollTarget('board:lang-giay:1')).toBeNull();
    expect(parseScrollTarget('scroll:lang-giay:x')).toBeNull();
  });

  it('thẻ chưa nhặt theo mặt nạ bit, giữ thứ tự; đếm đã nhặt', () => {
    expect(uncollectedScrolls(scrolls, 0).map((s) => s.index)).toEqual([0, 1, 2, 3]);
    expect(uncollectedScrolls(scrolls, 0b0101).map((s) => s.index)).toEqual([1, 3]);
    expect(uncollectedScrolls(scrolls, 0b1111)).toEqual([]);
    expect(collectedCount(scrolls, 0b0110)).toBe(2);
    expect(collectedCount([], 0b111)).toBe(0);
  });

  it('thẻ gần nhất chưa nhặt: bỏ qua thẻ đã nhặt; null khi đủ; bằng nhau thì chỉ số nhỏ', () => {
    expect(nearestScroll(scrolls, 0, 0, -99)!.index).toBe(0); // gần xưởng giấy nhất từ cổng
    expect(nearestScroll(scrolls, 0b0001, 0, -99)!.index).toBe(3); // đã nhặt xưởng: chợ gần hơn ao và đình
    expect(nearestScroll(scrolls, 0, 70, 20)!.index).toBe(3);
    expect(nearestScroll(scrolls, 0b1111, 0, 0)).toBeNull();
    const tie: VillageScroll[] = [
      { index: 0, x: 10, z: 0, zone: 'a' },
      { index: 1, x: -10, z: 0, zone: 'b' },
    ];
    expect(nearestScroll(tie, 0, 0, 0)!.index).toBe(0);
  });
});

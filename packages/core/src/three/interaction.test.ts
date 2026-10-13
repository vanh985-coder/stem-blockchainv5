import { describe, expect, it } from 'vitest';
import { INTERACT_RADIUS, nearestInteractable, type Interactable } from './interaction';

const items: Interactable[] = [
  { id: 'bang', x: 5, z: 0 },
  { id: 'hom', x: 0, z: 5 },
  { id: 'gan', x: 5.5, z: 0.5 },
];

describe('tương tác: vật gần nhất trong bán kính 2,2', () => {
  it('bán kính đúng spec', () => {
    expect(INTERACT_RADIUS).toBe(2.2);
  });
  it('ở xa mọi vật thì không có', () => {
    expect(nearestInteractable(0, 0, items)).toBe(-1);
    expect(nearestInteractable(0, 0, [])).toBe(-1);
  });
  it('trong bán kính thì chọn vật đó; đúng 2,2 vẫn tính, hơn một chút thì không', () => {
    expect(nearestInteractable(0, 3, items)).toBe(1);
    expect(nearestInteractable(0, 2.8, items)).toBe(1);
    expect(nearestInteractable(0, 5 - 2.2, items)).toBe(1);
    expect(nearestInteractable(0, 5 - 2.19, items)).toBe(1);
    expect(nearestInteractable(0, 5 - 2.21, items)).toBe(-1);
  });
  it('nhiều vật trong bán kính thì chọn vật gần nhất', () => {
    expect(nearestInteractable(5.4, 0.4, items)).toBe(2);
    expect(nearestInteractable(4.6, 0, items)).toBe(0);
  });
  it('cách đều nhau thì lấy vật đứng trước', () => {
    const tie: Interactable[] = [
      { id: 'a', x: -1, z: 0 },
      { id: 'b', x: 1, z: 0 },
    ];
    expect(nearestInteractable(0, 0, tie)).toBe(0);
  });
  it('bán kính tùy chỉnh', () => {
    expect(nearestInteractable(0, 0, [{ id: 'x', x: 3, z: 0 }], 3.5)).toBe(0);
    expect(nearestInteractable(0, 0, [{ id: 'x', x: 3, z: 0 }], 2.5)).toBe(-1);
  });
});

describe('vật dự phòng (fallback)', () => {
  const bi: Interactable = { id: 'bi', x: 1, z: 0, fallback: true };
  const gate: Interactable = { id: 'cong', x: 2, z: 0 };

  it('chỉ có vật dự phòng trong bán kính thì chọn nó', () => {
    expect(nearestInteractable(-1, 0, [bi, { id: 'xa', x: 20, z: 0 }])).toBe(0);
  });

  it('có vật thường trong bán kính thì ưu tiên vật thường dù vật dự phòng gần hơn', () => {
    expect(nearestInteractable(0, 0, [bi, gate])).toBe(1);
    expect(nearestInteractable(0, 0, [gate, bi])).toBe(0);
  });

  it('vật thường ngoài bán kính thì vật dự phòng vẫn được chọn', () => {
    expect(nearestInteractable(-1, 0, [bi, gate])).toBe(0); // cổng cách 3
  });

  it('không có gì trong bán kính thì −1', () => {
    expect(nearestInteractable(50, 50, [bi, gate])).toBe(-1);
  });
});

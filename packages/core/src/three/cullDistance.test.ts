import { describe, expect, it } from 'vitest';
import { withinCullDistance } from './cullDistance';

describe('ẩn vật ở xa người chơi', () => {
  it('trong khoảng thì vẽ, từ đúng khoảng trở ra thì ẩn', () => {
    expect(withinCullDistance(0, 0, 3, 4, 5.01)).toBe(true);
    expect(withinCullDistance(0, 0, 3, 4, 5)).toBe(false); // cách đúng 5: đã ẩn
    expect(withinCullDistance(10, 10, 10, 10, 0.1)).toBe(true);
  });
  it('khoảng vô hạn thì không bao giờ ẩn', () => {
    expect(withinCullDistance(0, 0, 1e6, 1e6, Infinity)).toBe(true);
  });
  it('đối xứng theo hai trục', () => {
    expect(withinCullDistance(-3, -4, 0, 0, 5.5)).toBe(true);
    expect(withinCullDistance(-30, 40, 0, 0, 49)).toBe(false);
  });
});

describe('khoảng ẩn dân làng theo mức chất lượng', () => {
  it('Thấp ngắn nhất, Vừa và Cao bằng nhau', async () => {
    const { VILLAGER_CULL } = await import('./cullDistance');
    expect(VILLAGER_CULL.low).toBeLessThan(VILLAGER_CULL.medium);
    expect(VILLAGER_CULL.medium).toBe(VILLAGER_CULL.high);
  });
});

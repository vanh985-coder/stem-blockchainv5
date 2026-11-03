import { describe, expect, it } from 'vitest';
import { WHACK_SPEC, WHACK_SPEC_REAL } from './whackConfig';

describe('Màn 5: ghi đè nhịp video chỉ có trong demo', () => {
  it('ngoài demo WHACK_SPEC là đúng đối tượng gốc, số cũ giữ nguyên', () => {
    expect(WHACK_SPEC).toBe(WHACK_SPEC_REAL);
    expect([WHACK_SPEC.spawnStart, WHACK_SPEC.spawnEnd, WHACK_SPEC.firstSpawn, WHACK_SPEC.boss.count, WHACK_SPEC.boss.every]).toEqual([1.3, 0.7, 1.3, 10, 12]);
    expect(WHACK_SPEC.medals).toEqual([1750, 2350, 2550]);
  });
});

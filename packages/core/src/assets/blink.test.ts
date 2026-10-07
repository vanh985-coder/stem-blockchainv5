import { describe, expect, it } from 'vitest';
import { nextBlinkDelay } from './BiAvatar';

describe('nextBlinkDelay', () => {
  it('nằm trong 3–5 giây', () => {
    expect(nextBlinkDelay(0)).toBe(3000);
    expect(nextBlinkDelay(0.5)).toBe(4000);
    expect(nextBlinkDelay(0.999999)).toBeLessThan(5000);
    expect(nextBlinkDelay(0.999999)).toBeGreaterThanOrEqual(3000);
  });
});

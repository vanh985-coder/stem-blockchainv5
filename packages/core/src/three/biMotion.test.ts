import { describe, expect, it } from 'vitest';
import { BI_COLOR, BI_SIZE, BLINK_DURATION, BLINK_MAX, BLINK_MIN, BOB_AMPLITUDE, BOB_PERIOD, SPIN_DURATION, blinkScale, bobOffset, dampFactor, nextBlinkDelay, spinAngle } from './biMotion';

describe('Bi (spec 03 mục 3.5)', () => {
  it('màu muc-tim, cạnh khoảng 0,5', () => {
    expect(BI_COLOR.toLowerCase()).toBe('#5b3fd6');
    expect(BI_SIZE).toBe(0.5);
  });

  it('bay nhấp nhô: biên độ 0,1, chu kỳ 2 giây', () => {
    expect(BOB_AMPLITUDE).toBe(0.1);
    expect(BOB_PERIOD).toBe(2);
    expect(bobOffset(0)).toBeCloseTo(0, 9);
    expect(bobOffset(0.5)).toBeCloseTo(0.1, 9);
    expect(bobOffset(1.5)).toBeCloseTo(-0.1, 9);
    expect(bobOffset(2)).toBeCloseTo(0, 9);
    let max = 0;
    for (let t = 0; t < 4; t += 0.01) max = Math.max(max, Math.abs(bobOffset(t)));
    expect(max).toBeCloseTo(0.1, 3);
  });

  it('chớp mắt mỗi 3–5 giây', () => {
    expect(BLINK_MIN).toBe(3);
    expect(BLINK_MAX).toBe(5);
    expect(nextBlinkDelay(0)).toBe(3);
    expect(nextBlinkDelay(0.5)).toBe(4);
    expect(nextBlinkDelay(0.9999)).toBeLessThan(5);
    for (let r = 0; r < 1; r += 0.05) {
      expect(nextBlinkDelay(r)).toBeGreaterThanOrEqual(3);
      expect(nextBlinkDelay(r)).toBeLessThan(5);
    }
  });

  it('chớp: mở → nhắm gần hết → mở lại, rồi giữ mở', () => {
    expect(blinkScale(-1)).toBe(1);
    expect(blinkScale(0)).toBe(1);
    expect(blinkScale(BLINK_DURATION / 2)).toBeCloseTo(0.1, 9);
    expect(blinkScale(BLINK_DURATION)).toBe(1);
    expect(blinkScale(10)).toBe(1);
    expect(blinkScale(BLINK_DURATION * 0.25)).toBeGreaterThan(0.1);
    expect(blinkScale(BLINK_DURATION * 0.25)).toBeLessThan(1);
  });

  it('khi vui xoay đúng một vòng, mượt hai đầu, rồi về 0', () => {
    expect(spinAngle(-1)).toBe(0);
    expect(spinAngle(0)).toBe(0);
    expect(spinAngle(SPIN_DURATION / 2)).toBeCloseTo(Math.PI, 9);
    expect(spinAngle(SPIN_DURATION - 1e-9)).toBeCloseTo(Math.PI * 2, 5);
    expect(spinAngle(SPIN_DURATION)).toBe(0);
    let prev = -1;
    for (let t = 0; t < SPIN_DURATION; t += 0.01) {
      const a = spinAngle(t);
      expect(a).toBeGreaterThanOrEqual(prev);
      prev = a;
    }
  });

  it('làm mượt không phụ thuộc tốc độ khung hình', () => {
    // hai nửa bước liên tiếp tương đương một bước trọn
    const full = dampFactor(1 / 30, 8);
    const half = dampFactor(1 / 60, 8);
    expect(1 - (1 - half) * (1 - half)).toBeCloseTo(full, 9);
    expect(dampFactor(0, 8)).toBe(0);
    expect(dampFactor(100, 8)).toBeCloseTo(1, 9);
  });
});

import { describe, expect, it } from 'vitest';
import { BI_CAMERA_OFFSET, BI_COLOR, BI_SIZE, BLINK_DURATION, BLINK_MAX, BLINK_MIN, BOB_AMPLITUDE, BOB_PERIOD, SPIN_DURATION, blinkScale, bobOffset, dampFactor, nextBlinkDelay, spinAngle, biCameraOffset } from './biMotion';

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

describe('Bi sau vai phải theo góc nhìn của camera (bước 8d)', () => {
  const out = { x: 0, y: 0, z: 0 };
  it('camera nhìn +Z (yaw 0): Bi lệch sang phải màn hình (−X), lùi về phía camera (−Z), cao ngang vai', () => {
    biCameraOffset(0, BI_CAMERA_OFFSET, out);
    expect(out.x).toBeCloseTo(-BI_CAMERA_OFFSET.right, 9);
    expect(out.z).toBeCloseTo(-BI_CAMERA_OFFSET.back, 9);
    expect(out.y).toBe(BI_CAMERA_OFFSET.up);
  });

  it('mọi góc nhìn: độ lệch có hình chiếu +right trên trục phải của màn hình và +back trên hướng về camera; độ dài không đổi', () => {
    for (let k = 0; k < 24; k++) {
      const yaw = (k / 24) * Math.PI * 2 - Math.PI;
      biCameraOffset(yaw, BI_CAMERA_OFFSET, out);
      const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
      const right = { x: -Math.cos(yaw), z: Math.sin(yaw) };
      expect(out.x * right.x + out.z * right.z, `yaw ${yaw}`).toBeCloseTo(BI_CAMERA_OFFSET.right, 9);
      expect(-(out.x * fwd.x + out.z * fwd.z), `yaw ${yaw}`).toBeCloseTo(BI_CAMERA_OFFSET.back, 9);
      expect(Math.hypot(out.x, out.z)).toBeCloseTo(Math.hypot(BI_CAMERA_OFFSET.right, BI_CAMERA_OFFSET.back), 9);
    }
  });

  it('Bi thấp hơn đầu nhân vật (1,7) và đủ gần: không che giữa màn hình', () => {
    expect(BI_CAMERA_OFFSET.up).toBeLessThan(1.7);
    expect(BI_CAMERA_OFFSET.right).toBeGreaterThanOrEqual(1.2);
  });
});

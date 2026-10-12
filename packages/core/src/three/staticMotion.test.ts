import { describe, expect, it } from 'vitest';
import {
  BREATH_AMPLITUDE,
  BREATH_PERIOD,
  HOP_COUNT,
  HOP_DURATION,
  HOP_HEIGHT,
  SWAY_AMPLITUDE,
  TALK_TILT,
  angleDiff,
  createStaticPose,
  hopHeight,
  phaseFrom,
  staticPose,
  turnToward,
  yawTowards,
} from './staticMotion';

const DEG = Math.PI / 180;

describe('nhân vật đứng yên (spec 03 mục 3.4)', () => {
  it('nhún như thở: scale Y dao động ±2%, chu kỳ 2 giây', () => {
    expect(BREATH_AMPLITUDE).toBe(0.02);
    expect(BREATH_PERIOD).toBe(2);
    const p = createStaticPose();
    let min = 2;
    let max = 0;
    for (let t = 0; t < 4; t += 0.01) {
      staticPose(p, t, 0, 'idle', -1);
      min = Math.min(min, p.scaleY);
      max = Math.max(max, p.scaleY);
    }
    expect(min).toBeCloseTo(0.98, 3);
    expect(max).toBeCloseTo(1.02, 3);
    expect(staticPose(p, 0, 0, 'idle', -1).scaleY).toBeCloseTo(1, 9);
    expect(staticPose(p, 0.5, 0, 'idle', -1).scaleY).toBeCloseTo(1.02, 6); // 1/4 chu kỳ
    expect(staticPose(p, 2, 0, 'idle', -1).scaleY).toBeCloseTo(1, 9); // đủ một chu kỳ
  });

  it('lắc nhẹ ±2° quanh trục Z khi đứng yên', () => {
    const p = createStaticPose();
    let max = 0;
    for (let t = 0; t < 10; t += 0.01) max = Math.max(max, Math.abs(staticPose(p, t, 0.3, 'idle', -1).rollZ));
    expect(max).toBeCloseTo(2 * DEG, 3);
    expect(SWAY_AMPLITUDE).toBeCloseTo(2 * DEG, 9);
  });

  it('khi nói nghiêng ±4°', () => {
    const p = createStaticPose();
    let max = 0;
    for (let t = 0; t < 10; t += 0.01) max = Math.max(max, Math.abs(staticPose(p, t, 0.3, 'talking', -1).rollZ));
    expect(max).toBeCloseTo(4 * DEG, 3);
    expect(TALK_TILT).toBeCloseTo(4 * DEG, 9);
  });

  it('lệch pha: hai người pha khác nhau không nhún cùng lúc', () => {
    const a = createStaticPose();
    const b = createStaticPose();
    staticPose(a, 0.5, phaseFrom(0), 'idle', -1);
    staticPose(b, 0.5, phaseFrom(0.5), 'idle', -1);
    expect(a.scaleY).not.toBeCloseTo(b.scaleY, 3);
    expect(phaseFrom(0)).toBe(0);
    expect(phaseFrom(0.999)).toBeLessThan(Math.PI * 2);
  });

  it('khi vui bật lên 0,15 hai lần rồi về 0', () => {
    expect(HOP_HEIGHT).toBe(0.15);
    expect(HOP_COUNT).toBe(2);
    expect(hopHeight(-1)).toBe(0);
    expect(hopHeight(0)).toBe(0);
    expect(hopHeight(HOP_DURATION / 2)).toBeCloseTo(0.15, 9); // đỉnh lần 1
    expect(hopHeight(HOP_DURATION)).toBeCloseTo(0, 9); // chạm đất giữa hai lần
    expect(hopHeight(HOP_DURATION * 1.5)).toBeCloseTo(0.15, 9); // đỉnh lần 2
    expect(hopHeight(HOP_COUNT * HOP_DURATION)).toBe(0);
    expect(hopHeight(5)).toBe(0);
    let peaks = 0;
    let prev = 0;
    let up = false;
    for (let t = 0; t < 1; t += 0.005) {
      const h = hopHeight(t);
      if (h > prev) up = true;
      else if (h < prev && up) {
        peaks++;
        up = false;
      }
      prev = h;
    }
    expect(peaks).toBe(2);
  });

  it('ghi vào đối tượng có sẵn (không cấp phát)', () => {
    const p = createStaticPose();
    expect(staticPose(p, 1, 0, 'idle', 0.1)).toBe(p);
  });
});

describe('quay mặt', () => {
  it('yawTowards: +Z là 0, +X là π/2', () => {
    expect(yawTowards(0, 0, 0, 5)).toBeCloseTo(0, 9);
    expect(yawTowards(0, 0, 5, 0)).toBeCloseTo(Math.PI / 2, 9);
    expect(yawTowards(1, 1, 1, -4)).toBeCloseTo(Math.PI, 9);
  });
  it('angleDiff đi đường ngắn nhất', () => {
    expect(angleDiff(0, 0.5)).toBeCloseTo(0.5, 9);
    expect(angleDiff(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(-0.2, 9);
    expect(angleDiff(-3, 3)).toBeCloseTo(6 - Math.PI * 2, 9); // qua ±π, đi ngược chiều
  });
  it('turnToward chạm đích khi đủ bước, nếu không thì đi đúng một bước theo chiều ngắn', () => {
    expect(turnToward(0, 0.3, 1)).toBe(0.3);
    expect(turnToward(0, 1, 0.25)).toBeCloseTo(0.25, 9);
    expect(turnToward(0.1, Math.PI * 2 - 0.1, 0.05)).toBeCloseTo(0.05, 9); // quay ngược chiều kim đồng hồ
  });
});

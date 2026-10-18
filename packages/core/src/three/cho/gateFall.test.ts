import { describe, expect, it } from 'vitest';
import { FALL_DELAY, FALL_END, barrierFall, dropOne } from './gateFall';

const LOW = 0.6;
const HIGH = 1.7;
const ANGLE = 0.4;

describe('then gỗ và dây đỏ rơi khi cổng mở', () => {
  it('trước khi bắt đầu mọi thứ còn nguyên chỗ cũ (như thanh chắn đứng yên)', () => {
    const s = barrierFall(0, LOW, HIGH, ANGLE);
    expect(s.high).toEqual({ y: HIGH, rz: -0 });
    expect(s.low.y).toBe(LOW);
    expect(s.ropeA).toEqual({ y: (LOW + HIGH) / 2, rz: ANGLE });
    expect(s.ropeB.rz).toBeCloseTo(-ANGLE, 12);
    expect(s.landed).toBe(false);
    expect(barrierFall(FALL_DELAY, LOW, HIGH, ANGLE).high.y).toBe(HIGH);
  });

  it('thanh trên rơi nhanh dần, không bao giờ xuyên xuống dưới đất và không nhảy lên quá chỗ đầu', () => {
    let prev = HIGH;
    for (let t = FALL_DELAY; t < FALL_DELAY + 0.6; t += 0.02) {
      const y = barrierFall(t, LOW, HIGH, ANGLE).high.y;
      expect(y).toBeLessThanOrEqual(prev + 1e-12);
      expect(y).toBeGreaterThanOrEqual(0.26 - 1e-9);
      prev = y;
    }
  });

  it('sau khi chạm đất nảy lên rồi nằm yên đúng chỗ; chạm đất thì cờ landed bật', () => {
    const end = barrierFall(FALL_END, LOW, HIGH, ANGLE);
    expect(end.high.y).toBeCloseTo(0.26, 9);
    expect(end.low.y).toBeCloseTo(0.09, 9);
    expect(end.ropeA.y).toBeCloseTo(0.04, 9);
    expect(end.ropeB.y).toBeCloseTo(0.05, 9);
    expect(end.tassel.y).toBeCloseTo(0.1, 9);
    expect(end.landed).toBe(true);
    // có nảy: trong một khoảng ngắn sau khi chạm đất cao hơn chỗ nằm
    const tHit = FALL_DELAY + Math.sqrt((2 * (HIGH - 0.26)) / 8);
    expect(barrierFall(tHit + 0.13, LOW, HIGH, ANGLE).high.y).toBeGreaterThan(0.26 + 0.05);
  });

  it('dây đỏ xoay từ chéo về nằm ngang (gần 90°), thanh gỗ nghiêng nhẹ; lúc nằm yên không đổi nữa', () => {
    const end = barrierFall(FALL_END, LOW, HIGH, ANGLE);
    expect(end.ropeA.rz).toBeCloseTo(Math.PI / 2 - 0.05, 9);
    expect(end.ropeB.rz).toBeCloseTo(-(Math.PI / 2 - 0.05), 9);
    expect(Math.abs(end.high.rz)).toBeLessThan(0.3);
    const later = barrierFall(FALL_END + 5, LOW, HIGH, ANGLE);
    expect(later).toEqual(end);
  });

  it('thứ tự: thanh trên và dây đỏ bung trước, thanh dưới và chùm tua rơi sau', () => {
    const t = FALL_DELAY + 0.1;
    const s = barrierFall(t, LOW, HIGH, ANGLE);
    expect(s.high.y).toBeLessThan(HIGH);
    expect(s.ropeA.y).toBeLessThan((LOW + HIGH) / 2);
    expect(s.low.y).toBe(LOW); // thanh dưới còn chờ
  });

  it('ghi vào đối tượng đã có (không cấp phát) và dropOne không âm', () => {
    const out = barrierFall(0, LOW, HIGH, ANGLE);
    expect(barrierFall(1, LOW, HIGH, ANGLE, out)).toBe(out);
    for (let t = 0; t < 3; t += 0.05) expect(dropOne(t, 1, 0.1, 0.2).y).toBeGreaterThanOrEqual(0.1 - 1e-9);
  });
});

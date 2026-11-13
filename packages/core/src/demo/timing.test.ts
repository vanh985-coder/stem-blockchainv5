import { describe, expect, it } from 'vitest';
import { READ_MAX_MS, READ_MIN_MS, TYPE_MAX_MS, TYPE_MIN_MS, cursorDuration, cursorPath, cursorPoint, easeInOut, readTime, turnToward, typingDelays, typingDuration } from './timing';

describe('typingDelays', () => {
  it('mỗi ký tự 120 đến 200 ms', () => {
    const d = typingDelays(200, 3);
    expect(d).toHaveLength(200);
    for (const x of d) {
      expect(x).toBeGreaterThanOrEqual(TYPE_MIN_MS);
      expect(x).toBeLessThanOrEqual(TYPE_MAX_MS);
    }
  });
  it('tất định theo hạt giống, khác hạt thì khác', () => {
    expect(typingDelays(10, 5)).toEqual(typingDelays(10, 5));
    expect(typingDelays(10, 5)).not.toEqual(typingDelays(10, 6));
  });
  it('chuỗi rỗng hay độ dài âm thì không có độ trễ', () => {
    expect(typingDelays(0)).toEqual([]);
    expect(typingDelays(-3)).toEqual([]);
  });
  it('tổng thời gian nằm trong khoảng n×120 đến n×200', () => {
    const t = typingDuration(2, 9);
    expect(t).toBeGreaterThanOrEqual(240);
    expect(t).toBeLessThanOrEqual(400);
  });
});

describe('readTime', () => {
  it('1 đến 2 giây, chữ dài thì lâu hơn', () => {
    expect(readTime('')).toBe(READ_MIN_MS);
    expect(readTime('x'.repeat(1000))).toBe(READ_MAX_MS);
    expect(readTime('x'.repeat(80))).toBeGreaterThan(readTime('x'.repeat(10)));
  });
  it('nhịp 1,5 thì nhanh hơn, 0,75 thì chậm hơn', () => {
    const t = readTime('x'.repeat(80), 1);
    expect(readTime('x'.repeat(80), 1.5)).toBeLessThan(t);
    expect(readTime('x'.repeat(80), 0.75)).toBeGreaterThan(t);
  });
});

describe('đường đi con trỏ', () => {
  const a = { x: 100, y: 100 };
  const b = { x: 900, y: 500 };
  it('easeInOut: 0 → 0, 1 → 1, đơn điệu, kẹp ngoài khoảng', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(-1)).toBe(0);
    expect(easeInOut(2)).toBe(1);
    expect(easeInOut(0.7)).toBeGreaterThan(easeInOut(0.3));
  });
  it('bắt đầu tại a, kết thúc đúng tại b', () => {
    expect(cursorPoint(a, b, 0)).toEqual(a);
    const end = cursorPoint(a, b, 1);
    expect(end.x).toBeCloseTo(b.x, 6);
    expect(end.y).toBeCloseTo(b.y, 6);
    const path = cursorPath(a, b, 30);
    expect(path).toHaveLength(30);
    expect(path[29]).toEqual(b);
  });
  it('đường cong lệch nhẹ khỏi đường thẳng nhưng không quá 40 px', () => {
    const mid = cursorPoint(a, b, 0.5);
    const dist = Math.abs((b.y - a.y) * (mid.x - a.x) - (b.x - a.x) * (mid.y - a.y)) / Math.hypot(b.x - a.x, b.y - a.y);
    expect(dist).toBeGreaterThan(1);
    expect(dist).toBeLessThanOrEqual(40.001);
  });
  it('hai điểm trùng nhau thì không lỗi', () => {
    expect(cursorPoint(a, a, 0.5)).toEqual(a);
  });
  it('thời gian di chuyển theo khoảng cách, chia cho nhịp', () => {
    const near = cursorDuration(a, { x: 110, y: 100 });
    const far = cursorDuration(a, b);
    expect(near).toBeGreaterThanOrEqual(350);
    expect(far).toBeGreaterThan(near);
    expect(far).toBeLessThanOrEqual(1100);
    expect(Math.abs(cursorDuration(a, b, 2) - far / 2)).toBeLessThanOrEqual(1);
  });
});

describe('turnToward', () => {
  it('quay đường ngắn nhất qua ±π, tối đa maxStep mỗi bước', () => {
    expect(turnToward(3, -3, 0.1)).toBeCloseTo(3.1, 6);
    expect(turnToward(0, 1, 0.25)).toBeCloseTo(0.25, 6);
    expect(turnToward(0, 0.1, 0.25)).toBeCloseTo(0.1, 6);
    expect(turnToward(0, -1, 0.25)).toBeCloseTo(-0.25, 6);
  });
});

import { describe, expect, it } from 'vitest';
import { HAND_HEIGHT, ParticlePool, STRAW_ARC, flightProgress, markerScale, pageFlutter, strawPosition, type Vec3 } from './runnerFlight';

const v = (): Vec3 => ({ x: 0, y: 0, z: 0 });

describe('rơm bay vòng cung', () => {
  it('bắt đầu ở tay {phanDien}, hạ đúng chỗ rơi, bay cao hơn đường thẳng ở giữa', () => {
    const a = strawPosition(v(), 0, 1.2, 40, -2, 62);
    expect(a).toEqual({ x: 1.2, y: HAND_HEIGHT, z: 40 });
    const b = strawPosition(v(), 1, 1.2, 40, -2, 62);
    expect(b.x).toBeCloseTo(-2, 12);
    expect(b.z).toBeCloseTo(62, 12);
    expect(b.y).toBeCloseTo(0, 12);
    const mid = strawPosition(v(), 0.5, 1.2, 40, -2, 62);
    expect(mid.y).toBeGreaterThan(HAND_HEIGHT / 2 + STRAW_ARC * 0.9);
    expect(mid.z).toBeCloseTo(51, 12);
  });
  it('độ cao đi theo parabol: tăng rồi giảm, không âm', () => {
    let peak = 0;
    let prev = -1;
    let rising = true;
    for (let u = 0; u <= 1.0001; u += 0.05) {
      const p = strawPosition(v(), Math.min(1, u), 0, 0, 0, 20);
      expect(p.y).toBeGreaterThanOrEqual(-1e-9);
      if (p.y < prev - 1e-9) rising = false;
      if (!rising) expect(p.y).toBeLessThanOrEqual(prev + 1e-9);
      prev = p.y;
      peak = Math.max(peak, p.y);
    }
    expect(peak).toBeGreaterThan(STRAW_ARC * 0.9);
  });
  it('ghi vào đối tượng đã có', () => {
    const o = v();
    expect(strawPosition(o, 0.3, 0, 0, 1, 10)).toBe(o);
  });
});

describe('tiến độ bay và bóng báo chỗ rơi', () => {
  it('kẹp trong [0, 1]; thời gian bay bằng 0 thì xem như đã hạ', () => {
    expect(flightProgress(10, 11, 9)).toBe(0);
    expect(flightProgress(10, 11, 10.5)).toBeCloseTo(0.5, 12);
    expect(flightProgress(10, 11, 12)).toBe(1);
    expect(flightProgress(10, 10, 10)).toBe(1);
  });
  it('bóng nhỏ lúc mới ném và to dần tới cỡ thật', () => {
    expect(markerScale(0)).toBeCloseTo(0.45, 12);
    expect(markerScale(1)).toBe(1);
    expect(markerScale(0.5)).toBeGreaterThan(markerScale(0.2));
    expect(markerScale(-1)).toBeCloseTo(0.45, 12);
    expect(markerScale(2)).toBe(1);
  });
});

describe('trang sổ rơi lả tả', () => {
  it('rơi từ tay xuống độ cao nằm, về đúng chỗ, đung đưa nhiều lúc đầu và hết khi chạm', () => {
    const out = v();
    pageFlutter(out, 0, 1, 30, 2, 45, 0.6, 0);
    expect(out.y).toBeCloseTo(HAND_HEIGHT, 12);
    pageFlutter(out, 1, 1, 30, 2, 45, 0.6, 0);
    expect(out.x).toBeCloseTo(2, 12);
    expect(out.z).toBeCloseTo(45, 12);
    expect(out.y).toBeCloseTo(0.6, 12);
    let maxSway = 0;
    for (let u = 0; u < 0.5; u += 0.02) {
      pageFlutter(out, u, 0, 0, 0, 10, 0.6, 0.7);
      maxSway = Math.max(maxSway, Math.abs(out.x));
    }
    expect(maxSway).toBeGreaterThan(0.2);
    expect(maxSway).toBeLessThanOrEqual(0.45 + 1e-9);
  });
  it('rơi nhanh lúc đầu rồi chậm dần; xoay theo tiến độ', () => {
    const a = v();
    const b = v();
    const c = v();
    pageFlutter(a, 0.1, 0, 0, 0, 10, 0.6, 0);
    pageFlutter(b, 0.2, 0, 0, 0, 10, 0.6, 0);
    pageFlutter(c, 0.9, 0, 0, 0, 10, 0.6, 0);
    expect(a.y).toBeLessThan(HAND_HEIGHT);
    const early = a.y - b.y;
    pageFlutter(a, 0.8, 0, 0, 0, 10, 0.6, 0);
    expect(early).toBeGreaterThan(a.y - c.y);
    expect(pageFlutter(v(), 0.5, 0, 0, 0, 1, 0.6, 0)).toBeGreaterThan(pageFlutter(v(), 0.1, 0, 0, 0, 1, 0.6, 0));
  });
});

describe('bể hạt lấp lánh', () => {
  it('phun đúng số hạt, hạt sống rồi chết sau `life` giây', () => {
    const p = new ParticlePool(16);
    expect(p.alive).toBe(0);
    p.burst(1, 0.6, 5, 6, 0.4, 1, 0.8, 0.2, 3);
    expect(p.alive).toBe(6);
    for (let i = 0; i < 10; i++) p.update(0.05);
    expect(p.alive).toBe(0);
  });
  it('hạt bay ra khỏi tâm, nhỏ dần; hết chỗ thì ghi đè hạt cũ (không tăng bộ nhớ)', () => {
    const p = new ParticlePool(8);
    p.burst(0, 1, 0, 8, 1, 1, 1, 1, 1);
    p.update(0.2);
    const moved = Array.from({ length: 8 }, (_, i) => Math.hypot(p.x[i], p.z[i])).some((d) => d > 0.1);
    expect(moved).toBe(true);
    expect(p.size(0)).toBeCloseTo(0.8, 5);
    p.burst(5, 1, 5, 8, 1, 1, 1, 1, 2);
    expect(p.alive).toBe(8);
    expect(p.capacity).toBe(8);
    expect(p.x.length).toBe(8);
  });
  it('tất định: cùng hạt giống cùng quỹ đạo', () => {
    const a = new ParticlePool(8);
    const b = new ParticlePool(8);
    a.burst(0, 1, 0, 5, 1, 1, 1, 1, 9);
    b.burst(0, 1, 0, 5, 1, 1, 1, 1, 9);
    a.update(0.3);
    b.update(0.3);
    expect(Array.from(a.x)).toEqual(Array.from(b.x));
    expect(Array.from(a.y)).toEqual(Array.from(b.y));
  });
});

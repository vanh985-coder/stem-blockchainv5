import { describe, expect, it } from 'vitest';
import { CRAWL_MAX, MEASURED_FLOOR, MEASURED_MAX, crawlPercent, easePercent, targetPercent } from './loadingProgress';

describe('phần trăm màn chờ', () => {
  it('chạy chậm: bắt đầu 0, tăng đều, không bao giờ vượt 90%', () => {
    expect(crawlPercent(0)).toBe(0);
    expect(crawlPercent(-5)).toBe(0);
    let prev = 0;
    for (const t of [500, 1000, 3000, 6000, 12000, 30000, 120000]) {
      const p = crawlPercent(t);
      expect(p).toBeGreaterThan(prev);
      expect(p).toBeLessThanOrEqual(CRAWL_MAX);
      prev = p;
    }
    expect(crawlPercent(1e9)).toBeCloseTo(CRAWL_MAX, 5);
  });

  it('mục tiêu: không đo được theo đường chạy chậm; có số đo thì lấy số đo, kẹp 0 đến 95, sàn là đường chạy chậm tối đa 30', () => {
    expect(targetPercent(null, 3000)).toBe(crawlPercent(3000));
    expect(targetPercent(undefined, 0)).toBe(0);
    expect(targetPercent(Number.NaN, 0)).toBe(0);
    expect(targetPercent(100, 0)).toBe(MEASURED_MAX);
    expect(targetPercent(-10, 0)).toBe(0);
    expect(targetPercent(0, 1e7)).toBe(MEASURED_FLOOR);
    expect(targetPercent(60, 1e7)).toBe(60);
  });

  it('số hiển thị: không lùi, không vượt mục tiêu', () => {
    expect(easePercent(50, 20, 16)).toBe(50);
    expect(easePercent(0, 40, 16)).toBeLessThanOrEqual(40);
    expect(easePercent(0, 40, 0)).toBe(0);
  });

  it('không nhảy thẳng từ 0 lên mục tiêu: mỗi khung hình 16 ms nhích dưới 10 điểm, và lên dần qua nhiều khung', () => {
    let v = 0;
    let frames = 0;
    const seen: number[] = [];
    while (v < 95 && frames < 1000) {
      const next = easePercent(v, 95, 16);
      expect(next - v).toBeLessThan(10);
      expect(next).toBeGreaterThanOrEqual(v);
      seen.push(Math.round(next));
      v = next;
      frames++;
    }
    expect(frames).toBeGreaterThan(30);
    expect(new Set(seen).size).toBeGreaterThan(30);
    expect(v).toBe(95);
  });

  it('khung hình thưa (máy bận 200 ms) vẫn không nhảy thẳng tới mục tiêu', () => {
    expect(easePercent(0, 95, 200)).toBeLessThan(70);
  });
});

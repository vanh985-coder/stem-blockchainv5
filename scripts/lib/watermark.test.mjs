// Test hàm xóa dấu ngôi sao (scripts/lib/watermark.mjs) bằng ảnh mẫu tự tạo: nền chuyển màu có nhiễu, nền hoa văn, ảnh to gấp đôi, ảnh không có dấu, dấu ngoài ô góc.
import { describe, expect, it } from 'vitest';
import { cleanSparkle, coverage, detectSparkle, sparkleGeometry, SPARKLE } from './watermark.mjs';

/** Ảnh w × h: nền chuyển màu (cộng hoa văn `texture` nếu có) và nhiễu cố định ±1; trả về { data, width, height }. */
function makeBackground(w, h, texture = 0) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const noise = ((x * 7 + y * 13) % 3) - 1;
      const tex = texture ? texture * (Math.sin(x * 0.3) * Math.cos(y * 0.255) + 0.6 * Math.sin((x + y) * 0.48)) : 0;
      const base = 120 + (x / w) * 50 + (y / h) * 30 + tex;
      data[o] = Math.max(0, Math.min(255, Math.round(base + noise)));
      data[o + 1] = Math.max(0, Math.min(255, Math.round(base * 0.9 + 8 + noise)));
      data[o + 2] = Math.max(0, Math.min(255, Math.round(base * 0.7 + 20 + noise)));
      data[o + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

/** Phủ dấu ngôi sao trắng alpha `a` đúng hình học của dấu (có thể dời tâm `(dx, dy)` điểm ảnh để thử ngoài ô góc). */
function stamp(img, a, dx = 0, dy = 0) {
  const g = sparkleGeometry(img.width, img.height);
  const half = Math.ceil(g.R * 1.6);
  for (let y = -half; y <= half; y++) {
    for (let x = -half; x <= half; x++) {
      const c = coverage(x, y, g.R, g.sx, g.sy) * a;
      if (c <= 0) continue;
      const o = ((g.cy + y + dy) * img.width + g.cx + x + dx) * 4;
      for (let k = 0; k < 3; k++) img.data[o + k] = Math.round(img.data[o + k] * (1 - c) + 255 * c);
    }
  }
  return g;
}

/** Sai số trung bình tuyệt đối (mức xám) trong cửa sổ quanh dấu giữa hai ảnh. */
function windowError(a, b) {
  const g = sparkleGeometry(a.width, a.height);
  const half = Math.ceil(g.R * 1.5);
  let s = 0;
  let n = 0;
  for (let y = -half; y <= half; y++) {
    for (let x = -half; x <= half; x++) {
      const o = ((g.cy + y) * a.width + g.cx + x) * 4;
      for (let k = 0; k < 3; k++) {
        s += Math.abs(a.data[o + k] - b.data[o + k]);
        n++;
      }
    }
  }
  return s / n;
}

/** Mọi byte ngoài cửa sổ quanh dấu có giữ nguyên không. */
function outsideWindowEqual(a, b) {
  const g = sparkleGeometry(a.width, a.height);
  const half = Math.ceil(g.R * 1.5) + 2;
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      if (Math.abs(x - g.cx) <= half && Math.abs(y - g.cy) <= half) continue;
      const o = (y * a.width + x) * 4;
      for (let k = 0; k < 4; k++) if (a.data[o + k] !== b.data[o + k]) return false;
    }
  }
  return true;
}

const clone = (img) => ({ data: Uint8Array.from(img.data), width: img.width, height: img.height });

describe('hình học của dấu', () => {
  it('tâm cách mép phải và mép dưới 120 điểm ảnh ở ảnh cao 768, tỉ lệ theo bề cao ở ảnh khác', () => {
    const a = sparkleGeometry(1376, 768);
    expect([1376 - a.cx, 768 - a.cy]).toEqual([SPARKLE.offset, SPARKLE.offset]);
    const b = sparkleGeometry(2752, 1536);
    expect([2752 - b.cx, 1536 - b.cy]).toEqual([2 * SPARKLE.offset, 2 * SPARKLE.offset]);
    expect(b.R).toBeCloseTo(2 * a.R, 9);
  });
  it('ngôi sao bốn cánh: phủ kín ở tâm, hẹp ở xa tâm theo đường chéo, không phủ ngoài bán kính', () => {
    expect(coverage(0, 0, 26)).toBe(1);
    expect(coverage(0, 24, 26)).toBeGreaterThan(0); // đầu cánh
    expect(coverage(20, 20, 26)).toBe(0); // chỗ lõm giữa hai cánh
    expect(coverage(30, 0, 26)).toBe(0);
  });
});

describe('xóa dấu ngôi sao', { timeout: 120_000 }, () => {
  it('nền trơn: nhận ra dấu, gỡ lại đúng nền (sai số quanh dấu nhỏ hơn rất nhiều), không đổi byte nào ngoài cửa sổ', () => {
    const clean = makeBackground(688, 384);
    const marked = clone(clean);
    stamp(marked, 0.3);
    const before = windowError(marked, clean);
    expect(before).toBeGreaterThan(2);
    const work = clone(marked);
    const r = cleanSparkle(work, work.width, work.height);
    expect(r.found).toBe(true);
    expect(r.fallback).toBe(false);
    expect(r.alpha).toBeGreaterThan(0.2);
    expect(r.alpha).toBeLessThan(0.45);
    expect(windowError(work, clean)).toBeLessThan(before / 4);
    expect(outsideWindowEqual(work, marked)).toBe(true);
  });

  it('nền nhiều hoa văn: vẫn nhận ra dấu, sai số quanh dấu giảm hơn bốn lần, ngoài cửa sổ giữ nguyên', () => {
    const clean = makeBackground(688, 384, 14);
    const marked = clone(clean);
    stamp(marked, 0.3);
    const before = windowError(marked, clean);
    const work = clone(marked);
    const r = cleanSparkle(work, work.width, work.height);
    expect(r.found).toBe(true);
    expect(windowError(work, clean)).toBeLessThan(before * 0.25);
    expect(outsideWindowEqual(work, marked)).toBe(true);
  });

  it('ảnh to gấp đôi ảnh thử khác (1376 × 768 so với 688 × 384): dấu to gấp đôi vẫn được nhận ra và gỡ', () => {
    const clean = makeBackground(1376, 768);
    const marked = clone(clean);
    stamp(marked, 0.3);
    const before = windowError(marked, clean);
    const work = clone(marked);
    const r = cleanSparkle(work, work.width, work.height);
    expect(r.found).toBe(true);
    expect(windowError(work, clean)).toBeLessThan(before / 3);
    expect(outsideWindowEqual(work, marked)).toBe(true);
  });

  it('ảnh không có dấu (nền trơn hay hoa văn): không nhận ra, không đổi byte nào', () => {
    for (const texture of [0, 14]) {
      const img = makeBackground(688, 384, texture);
      const work = clone(img);
      const d = detectSparkle(work, work.width, work.height);
      expect(d.found, `texture ${texture}`).toBe(false);
      const r = cleanSparkle(work, work.width, work.height);
      expect(r.found).toBe(false);
      expect(Array.from(work.data)).toEqual(Array.from(img.data));
    }
  });

  it('dấu ở chỗ khác (cách ô góc 100 điểm ảnh): không phải dấu của công cụ, để nguyên', () => {
    const marked = makeBackground(688, 384);
    stamp(marked, 0.3, -100, -75);
    const work = clone(marked);
    expect(cleanSparkle(work, work.width, work.height).found).toBe(false);
    expect(Array.from(work.data)).toEqual(Array.from(marked.data));
  });

  it('mảng sáng lớn hình chữ nhật ở đúng góc (không phải ngôi sao): để nguyên', () => {
    const img = makeBackground(688, 384);
    const g = sparkleGeometry(img.width, img.height);
    for (let y = g.cy - 20; y <= g.cy + 20; y++) {
      for (let x = g.cx - 20; x <= g.cx + 20; x++) {
        const o = (y * img.width + x) * 4;
        for (let k = 0; k < 3; k++) img.data[o + k] = Math.min(255, img.data[o + k] + 40);
      }
    }
    const work = clone(img);
    expect(cleanSparkle(work, work.width, work.height).found).toBe(false);
    expect(Array.from(work.data)).toEqual(Array.from(img.data));
  });

  it('ảnh nhỏ (icon, chân dung 512): không đủ chỗ cho ô góc thì bỏ qua, không lỗi', () => {
    const img = makeBackground(512, 512);
    const work = clone(img);
    expect(cleanSparkle(work, work.width, work.height).found).toBe(false);
    const tiny = makeBackground(60, 40);
    expect(cleanSparkle(tiny, tiny.width, tiny.height).found).toBe(false);
  });
});

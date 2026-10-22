import { describe, expect, it } from 'vitest';
import { createScrollGeometry, createScrollResources } from './KnowScrolls';
import { BEAM_HEIGHT } from './scrollTargets';

const tris = (g: { index: { count: number } | null; getAttribute(n: string): { count: number } }) => (g.index ? g.index.count : g.getAttribute('position').count) / 3;

describe('thẻ Em có biết: hình dựng', () => {
  it('cuộn giấy là một hình học gộp nhẹ (dưới 200 tam giác) có màu theo đỉnh; cột sáng và vầng sáng cũng nhẹ; mỗi thẻ dưới 400 tam giác', () => {
    const g = createScrollGeometry();
    expect(tris(g)).toBeLessThan(200);
    expect(g.getAttribute('color')).toBeDefined();
    const r = createScrollResources();
    const total = tris(r.scroll) + tris(r.beam) + tris(r.disc);
    expect(total).toBeLessThan(400);
    r.beam.computeBoundingBox();
    expect(r.beam.boundingBox!.max.y).toBeCloseTo(BEAM_HEIGHT / 2, 5);
    // cột sáng không đổ bóng, không ghi độ sâu, cộng sáng, bỏ qua sương (nhìn từ xa)
    expect(r.beamMat.depthWrite).toBe(false);
    expect(r.beamMat.transparent).toBe(true);
    expect(r.beamMat.fog).toBe(false);
    expect(r.beamMat.opacity).toBeLessThan(0.4);
    for (const o of [r.scroll, r.beam, r.disc, r.scrollMat, r.beamMat, r.discMat]) o.dispose();
    g.dispose();
  });
});

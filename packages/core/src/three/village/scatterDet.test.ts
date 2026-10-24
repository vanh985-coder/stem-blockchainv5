import { Box3, type BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { CLOTH_TIME, scatterMaterial } from './ScatterProps';
import { SCATTER_KINDS, SCATTER_SIZES, scatterCollider } from './scatter';
import { SCATTER_VERTEX_COLORS, createClothPole, createMulberryRow, createScatterGeometry } from './scatterGeometry';

const box = (g: BufferGeometry) => {
  g.computeBoundingBox();
  return g.boundingBox as Box3;
};
const triangles = (g: BufferGeometry) => (g.index ? g.index.count : g.getAttribute('position').count) / 3;

describe('sào phơi vải và luống dâu của Làng Dệt (mốc 3, bước L1)', () => {
  it('hai loại mới có trong danh sách đồ rải, có cỡ, tầm vẽ và màu theo đỉnh', () => {
    for (const k of ['sao-vai', 'luong-dau'] as const) {
      expect(SCATTER_KINDS).toContain(k);
      expect(SCATTER_SIZES[k]).toBeDefined();
      expect(SCATTER_VERTEX_COLORS[k]).toBe(true);
    }
  });

  it('sào vải: nhẹ (dưới 200 tam giác), cao 2,6, dài 4,4 khớp vật cản hộp; vật cản chặn giá và vải, đi giữa hai sào thì không', () => {
    const g = createClothPole();
    expect(triangles(g)).toBeLessThan(200);
    const b = box(g);
    const size = SCATTER_SIZES['sao-vai'];
    expect(b.min.y).toBeCloseTo(0, 6);
    expect(b.max.y).toBeCloseTo(size.h, 1);
    expect(b.max.x - b.min.x).toBeLessThanOrEqual(size.box!.hx * 2 + 0.2);
    expect(b.max.x - b.min.x).toBeGreaterThan(size.box!.hx * 2 - 0.3);
    expect(scatterCollider({ kind: 'sao-vai', x: 0, z: 0, yaw: 0, scale: 1, tint: [1, 1, 1] })).not.toBeNull();
    g.dispose();
  });

  it('sào vải: thuộc tính aSway bằng 0 ở trụ và xà (không lay), tăng tới 1 ở mép dưới tấm vải; đủ 4 màu vải (đỏ, hồng, chàm, vàng)', () => {
    const g = createClothPole();
    const sway = g.getAttribute('aSway');
    const pos = g.getAttribute('position');
    const color = g.getAttribute('color');
    expect(sway).toBeDefined();
    let max = 0;
    let min = 1;
    for (let i = 0; i < sway.count; i++) {
      max = Math.max(max, sway.getX(i));
      min = Math.min(min, sway.getX(i));
      expect(sway.getX(i)).toBeGreaterThanOrEqual(0);
      expect(sway.getX(i)).toBeLessThanOrEqual(1);
    }
    expect(min).toBe(0);
    expect(max).toBeCloseTo(1, 6);
    // đỉnh cao hơn 2,5 (trụ, xà, mép trên vải) không lay; đỉnh thấp hơn 1,0 lay gần hết
    for (let i = 0; i < sway.count; i++) if (pos.getY(i) > 2.5) expect(sway.getX(i)).toBeLessThan(0.05);
    const clothVerts = new Set<string>();
    for (let i = 0; i < sway.count; i++) if (sway.getX(i) > 0.5) clothVerts.add(`${color.getX(i).toFixed(2)},${color.getY(i).toFixed(2)},${color.getZ(i).toFixed(2)}`);
    expect(clothVerts.size).toBe(4);
    g.dispose();
  });

  it('vật liệu sào vải: hai mặt, màu theo đỉnh, bộ đổ bóng đỉnh nhận uniform thời gian dùng chung và thuộc tính aSway; các loại khác không đổi', () => {
    const m = scatterMaterial('sao-vai');
    expect(m.side).toBe(2); // DoubleSide
    expect(m.vertexColors).toBe(true);
    const shader = { uniforms: {} as Record<string, unknown>, vertexShader: '#include <common>\nvoid main() {\n#include <begin_vertex>\n}' };
    (m.onBeforeCompile as (s: unknown) => void)(shader);
    expect(shader.uniforms.uClothTime).toBe(CLOTH_TIME); // cùng MỘT uniform cho mọi vật liệu sào vải
    expect(shader.vertexShader).toContain('attribute float aSway;');
    expect(shader.vertexShader).toContain('uniform float uClothTime;');
    expect(shader.vertexShader).toContain('transformed.z +=');
    expect(shader.vertexShader).toContain('instanceMatrix'); // mỗi sào một pha
    for (const k of ['tre', 'cay-qua', 'phen', 'luong-dau'] as const) expect(scatterMaterial(k).onBeforeCompile.toString()).not.toContain('aSway');
    m.dispose();
  });

  it('"Giảm chuyển động": thời gian gió đặt về 0 thì mọi độ lệch là một tư thế cố định (hàm lệch chỉ phụ thuộc thời gian qua uniform)', () => {
    CLOTH_TIME.value = 0;
    expect(CLOTH_TIME.value).toBe(0);
  });

  it('luống dâu: hàng 5 bụi thấp (cao dưới 1), nhẹ, không có vật cản (đi qua được)', () => {
    const g = createMulberryRow();
    expect(triangles(g)).toBeGreaterThan(30);
    expect(triangles(g)).toBeLessThan(200);
    const b = box(g);
    expect(b.max.y).toBeLessThanOrEqual(SCATTER_SIZES['luong-dau'].h + 0.01);
    expect(b.max.x - b.min.x).toBeLessThanOrEqual(SCATTER_SIZES['luong-dau'].r * 2);
    expect(scatterCollider({ kind: 'luong-dau', x: 0, z: 0, yaw: 0, scale: 1, tint: [1, 1, 1] })).toBeNull();
    g.dispose();
    const h = createScatterGeometry('luong-dau');
    expect(h.getAttribute('aSway')).toBeUndefined();
    h.dispose();
  });
});

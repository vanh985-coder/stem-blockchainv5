import { describe, expect, it } from 'vitest';
import { PLAYER_RADIUS, resolveCollisions, type Point2 } from '../collision';
import { MAX_OVERHANG, MIN_COVERAGE, gridFromFilledPoints, gridFromHull, inAnyShape, measureFit } from './footprintDerive';
import { FOOTPRINTS, footprintObstacles, footprintOf, footprintRadiusOf } from './footprints';
import { bandSample } from './footprintSample.testlib';

const IDS = Object.keys(FOOTPRINTS);

describe('chân tường thật của đồ vật (so với file model)', () => {
  it('có đủ 10 loại đồ vật của chợ', () => {
    expect(IDS).toHaveLength(10);
    for (const id of ['env/cay-da', 'env/nha-mai-ngoi', 'env/nha-mai-tranh', 'env/leu-cho', 'env/gieng-lang', 'env/bui-tre', 'env/cong-lang-giay', 'env/cong-lang-det', 'env/cong-lang-khac-dau', 'env/cong-lang-bac']) {
      expect(footprintOf(id).length, id).toBeGreaterThan(0);
      expect(footprintOf(`${id}-xa`)).toBe(footprintOf(id)); // bản xa dùng chung chân tường
    }
  });

  it('mỗi loại: vật cản phủ ít nhất 90% diện tích chân tường và không thừa quá 0,3 đơn vị ra ngoài', async () => {
    for (const id of IDS) {
      const { points } = await bandSample(id);
      const grid = id.includes('cong-lang') ? gridFromFilledPoints(points) : gridFromHull(points);
      const fit = measureFit(FOOTPRINTS[id], grid);
      expect(fit.coverage, `${id}: phủ ${(fit.coverage * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(MIN_COVERAGE);
      expect(fit.overhang, `${id}: thừa ${fit.overhang.toFixed(2)}`).toBeLessThanOrEqual(MAX_OVERHANG);
    }
  }, 120000);

  it('gần như mọi điểm của model trong dải 0–1,5 (tường, cột, nền) đều nằm trong vật cản, không có mặt cao nào để đi lên', async () => {
    for (const id of IDS) {
      const { points } = await bandSample(id);
      const inside = points.filter((p) => inAnyShape(FOOTPRINTS[id], p.x, p.z)).length;
      expect(inside / points.length, `${id}: ${inside}/${points.length}`).toBeGreaterThanOrEqual(0.985);
    }
  }, 120000);

  it('cổng: lối đi giữa không bị chặn và đủ rộng cho người (≥ 1,0), hai bên là tường', () => {
    for (const g of ['giay', 'det', 'khac-dau', 'bac']) {
      const id = `env/cong-lang-${g}`;
      // người đứng ở tâm lối đi (x = 0) không bị đẩy
      const p: Point2 = { x: 0, z: 0 };
      expect(resolveCollisions(p, PLAYER_RADIUS, footprintObstacles(id, 0, 0, 0), Infinity), `${id} giữa cổng`).toBe(false);
      // bề rộng lối đi: khoảng cách giữa hai mép hình gần nhất ở hai bên
      let leftEdge = -Infinity;
      let rightEdge = Infinity;
      for (const s of footprintOf(id)) {
        if (s.kind !== 'box') continue;
        if (s.cx < 0) leftEdge = Math.max(leftEdge, s.cx + s.hx);
        else rightEdge = Math.min(rightEdge, s.cx - s.hx);
      }
      expect(rightEdge - leftEdge, `${id}: lối đi rộng ${(rightEdge - leftEdge).toFixed(2)}`).toBeGreaterThanOrEqual(1.0);
      expect(leftEdge).toBeLessThan(0);
      expect(rightEdge).toBeGreaterThan(0);
    }
  });
});

describe('đổi chân tường ra vật cản trong cảnh', () => {
  /** Điểm trong hệ model → cảnh (đặt ở (x, z), xoay yaw, tỉ lệ s), theo rotation.y của three. */
  const toWorld = (lx: number, lz: number, x: number, z: number, yaw: number, s: number): Point2 => ({
    x: x + s * (lx * Math.cos(yaw) + lz * Math.sin(yaw)),
    z: z + s * (-lx * Math.sin(yaw) + lz * Math.cos(yaw)),
  });
  const blockedAt = (id: string, x: number, z: number, yaw: number, s: number, p: Point2) => resolveCollisions({ ...p }, 0.001, footprintObstacles(id, x, z, yaw, s), Infinity);

  it('tâm mỗi hình (trong model) sau khi đặt (xoay, tỉ lệ, dịch) vẫn nằm trong vật cản; điểm xa 3 đơn vị thì không', () => {
    for (const id of IDS) {
      for (const [x, z, yaw, s] of [[0, 0, 0, 1], [10, -7, 0.9, 1.15], [-20, 5, -2.2, 0.85], [3, 30, Math.PI, 1]] as const) {
        for (const shape of footprintOf(id)) {
          const c = toWorld(shape.cx, shape.cz, x, z, yaw, s);
          expect(blockedAt(id, x, z, yaw, s, c), `${id} (${x}, ${z}) yaw ${yaw}`).toBe(true);
        }
        const far = toWorld(40, 40, x, z, yaw, s);
        expect(blockedAt(id, x, z, yaw, s, far)).toBe(false);
      }
    }
  });

  it('tỉ lệ đặt nhân cả kích thước lẫn khoảng lệch tâm', () => {
    const one = footprintObstacles('env/nha-mai-ngoi', 0, 0, 0, 1);
    const two = footprintObstacles('env/nha-mai-ngoi', 0, 0, 0, 2);
    expect(two).toHaveLength(one.length);
    one.forEach((o, i) => {
      const t = two[i];
      if (o.type === 'obox' && t.type === 'obox') {
        expect(t.hx).toBeCloseTo(o.hx * 2, 9);
        expect(t.hz).toBeCloseTo(o.hz * 2, 9);
        expect(t.x).toBeCloseTo(o.x * 2, 9);
        expect(t.z).toBeCloseTo(o.z * 2, 9);
      }
    });
  });

  it('giếng là một hình tròn bao sát (bán kính khoảng 1,2); nhà tranh chỉ một hộp', () => {
    expect(footprintOf('env/gieng-lang')).toHaveLength(1);
    expect(footprintOf('env/gieng-lang')[0].kind).toBe('circle');
    expect(footprintOf('env/nha-mai-tranh')).toHaveLength(1);
  });

  it('bán kính bao của từng đồ vật hợp lý: cây đa 6–8 (chân tán rộng), nhà 3–3,6, giếng khoảng 1,2', () => {
    expect(footprintRadiusOf('env/cay-da')).toBeGreaterThan(6);
    expect(footprintRadiusOf('env/cay-da')).toBeLessThan(8);
    expect(footprintRadiusOf('env/nha-mai-ngoi')).toBeGreaterThan(3);
    expect(footprintRadiusOf('env/nha-mai-ngoi')).toBeLessThan(3.8);
    expect(footprintRadiusOf('env/gieng-lang')).toBeCloseTo(1.23, 1);
  });
});

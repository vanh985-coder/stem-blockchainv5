import { describe, expect, it } from 'vitest';
import { cameraClearance } from '../cameraCollision';
import { PLAYER_RADIUS, resolveCollisions, type Point2 } from '../collision';
import { MAX_OVERHANG, MIN_COVERAGE, gridFromFilledPoints, gridFromHull, inAnyShape, measureFit } from './footprintDerive';
import { FOOTPRINTS, GATE_OPENING, GENERATED, TREE_TRUNK, footprintObstacles, footprintOf, footprintRadiusOf, gateBarrierObstacle, gateLintel, openGate } from './footprints';
import { bandSample } from './footprintSample.testlib';

const IDS = Object.keys(FOOTPRINTS);
/** Đồ vật dựng từ chân tường thô của file model (cây đa chỉ có gốc chính, cổng được nới lối giữa: kiểm tra riêng) */
const RAW_IDS = Object.keys(GENERATED);

describe('chân tường thật của đồ vật (so với file model)', () => {
  it('có đủ 10 loại đồ vật của chợ', () => {
    expect(IDS).toHaveLength(10);
    for (const id of ['env/cay-da', 'env/nha-mai-ngoi', 'env/nha-mai-tranh', 'env/leu-cho', 'env/gieng-lang', 'env/bui-tre', 'env/cong-lang-giay', 'env/cong-lang-det', 'env/cong-lang-khac-dau', 'env/cong-lang-bac']) {
      expect(footprintOf(id).length, id).toBeGreaterThan(0);
      expect(footprintOf(`${id}-xa`)).toBe(footprintOf(id)); // bản xa dùng chung chân tường
    }
  });

  it('mỗi loại (trừ cây đa): vật cản phủ ít nhất 90% diện tích chân tường và không thừa quá 0,3 đơn vị ra ngoài', async () => {
    for (const id of RAW_IDS) {
      const { points } = await bandSample(id);
      const grid = id.includes('cong-lang') ? gridFromFilledPoints(points) : gridFromHull(points);
      const fit = measureFit(GENERATED[id], grid);
      expect(fit.coverage, `${id}: phủ ${(fit.coverage * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(MIN_COVERAGE);
      expect(fit.overhang, `${id}: thừa ${fit.overhang.toFixed(2)}`).toBeLessThanOrEqual(MAX_OVERHANG);
    }
  }, 120000);

  it('gần như mọi điểm của model trong dải 0–1,5 (tường, cột, nền) đều nằm trong vật cản, không có mặt cao nào để đi lên', async () => {
    for (const id of RAW_IDS) {
      const { points } = await bandSample(id);
      const inside = points.filter((p) => inAnyShape(GENERATED[id], p.x, p.z)).length;
      expect(inside / points.length, `${id}: ${inside}/${points.length}`).toBeGreaterThanOrEqual(0.985);
    }
  }, 120000);

  it('cổng: lối đi giữa rộng ít nhất 2,2 (khoảng hở giữa hai vật cản), không bị chặn, hai bên là tường', () => {
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
      expect(rightEdge - leftEdge, `${id}: lối đi rộng ${(rightEdge - leftEdge).toFixed(2)}`).toBeGreaterThanOrEqual(2.2);
      expect(rightEdge - leftEdge).toBeGreaterThanOrEqual(GATE_OPENING - 1e-9);
      expect(leftEdge).toBeLessThan(0);
      expect(rightEdge).toBeGreaterThan(0);
    }
  });

  it('đi xuyên thẳng qua cổng được ở mọi hướng đặt (không bị đẩy)', () => {
    for (const g of ['giay', 'det', 'khac-dau', 'bac']) {
      const id = `env/cong-lang-${g}`;
      for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const obs = footprintObstacles(id, 5, -3, yaw);
        // đi từ cách cổng 6 đơn vị về phía trước, xuyên qua tâm lối đi, tới 6 đơn vị phía sau
        const fx = Math.sin(yaw);
        const fz = Math.cos(yaw);
        for (let d = -6; d <= 6; d += 0.1) {
          const p: Point2 = { x: 5 + fx * d, z: -3 + fz * d };
          expect(resolveCollisions(p, PLAYER_RADIUS, obs, Infinity), `${id} yaw ${yaw} d ${d.toFixed(1)}`).toBe(false);
        }
      }
    }
  });
});

describe('cây đa: chỉ gốc chính là vật cản', () => {
  it('một hình tròn bán kính 2–2,5 quanh gốc', () => {
    const f = footprintOf('env/cay-da');
    expect(f).toHaveLength(1);
    expect(f[0]).toBe(TREE_TRUNK);
    expect(TREE_TRUNK.kind).toBe('circle');
    if (TREE_TRUNK.kind === 'circle') {
      expect(TREE_TRUNK.r).toBeGreaterThanOrEqual(2);
      expect(TREE_TRUNK.r).toBeLessThanOrEqual(2.5);
    }
  });

  it('phủ ít nhất 85% điểm bề mặt thân cây (cao 2–3,5, trong 3,2 quanh gốc); rễ xa ngoài 4 đơn vị đi xuyên được', async () => {
    const { points } = await bandSample('env/cay-da', 3.5, 2);
    const trunk = points.filter((p) => Math.hypot(p.x - TREE_TRUNK.cx, p.z - TREE_TRUNK.cz) < 3.2);
    expect(trunk.length).toBeGreaterThan(200);
    const inside = trunk.filter((p) => inAnyShape(FOOTPRINTS['env/cay-da'], p.x, p.z)).length;
    expect(inside / trunk.length).toBeGreaterThanOrEqual(0.85);
    // ngoài 4 đơn vị tính từ gốc có điểm rễ của model nhưng không có vật cản
    const roots = points.filter((p) => Math.hypot(p.x - TREE_TRUNK.cx, p.z - TREE_TRUNK.cz) > 4);
    expect(roots.length).toBeGreaterThan(100);
    expect(roots.every((p) => !inAnyShape(FOOTPRINTS['env/cay-da'], p.x, p.z))).toBe(true);
  }, 120000);
});

describe('openGate', () => {
  it('cắt mép trong của hộp lấn vào dải giữa, bỏ hộp nằm trọn trong dải, tách hộp vắt qua cả hai bên', () => {
    const out = openGate(
      [
        { kind: 'box', cx: -2, cz: 0, hx: 1, hz: 1 }, // [-3, -1] → [-3, -1,2]
        { kind: 'box', cx: 0.5, cz: 0, hx: 0.3, hz: 1 }, // [0.2, 0.8] nằm trong dải → bỏ
        { kind: 'box', cx: 0, cz: 0, hx: 2, hz: 1 }, // vắt qua hai bên → tách đôi
        { kind: 'circle', cx: 0, cz: 0, r: 5 }, // hình tròn giữ nguyên
      ],
      2.4,
    );
    const boxes = out.filter((s) => s.kind === 'box') as { cx: number; hx: number }[];
    expect(out.filter((s) => s.kind === 'circle')).toHaveLength(1);
    expect(boxes).toHaveLength(3);
    // hộp thứ nhất: mép trong cắt về −1,2
    expect(boxes[0].cx + boxes[0].hx).toBeCloseTo(-1.2, 9);
    expect(boxes[0].cx - boxes[0].hx).toBeCloseTo(-3, 9);
    // hai nửa của hộp vắt qua: [−2, −1,2] và [1,2, 2]
    expect(boxes[1].cx + boxes[1].hx).toBeCloseTo(-1.2, 9);
    expect(boxes[2].cx - boxes[2].hx).toBeCloseTo(1.2, 9);
    for (const b of boxes) expect(Math.abs(b.cx) - b.hx).toBeGreaterThanOrEqual(1.2 - 1e-9);
  });
});

describe('xà ngang cổng (vật chắn camera)', () => {
  it('mỗi cổng có xà: hộp xoay vắt qua lối đi, đáy xà cao hơn đầu người, đỉnh bằng đỉnh cổng', () => {
    for (const g of ['giay', 'det', 'khac-dau', 'bac']) {
      const l = gateLintel(`env/cong-lang-${g}`, 0, 30, Math.PI);
      expect(l, g).not.toBeNull();
      expect(l!.base!).toBeGreaterThan(1.7);
      expect(l!.height).toBe(6);
      expect(l!.shape.type).toBe('obox');
    }
  });

  it('camera đi phía dưới xà thì không bị chặn, đi xuyên qua xà thì bị kéo lại', () => {
    const l = gateLintel('env/cong-lang-giay', 0, 0, 0)!;
    // người ở sau cổng (z = −4) nhìn qua cổng: camera ở trước cổng, thấp (dưới đáy xà)
    expect(cameraClearance(0, 1.3, -4, 0, 1.4, 4, [l])).toBe(1);
    // camera cao 4,5 (ngang xà) đối diện: bị chặn trước khi tới xà
    expect(cameraClearance(0, 1.3, -4, 0, 4.5, 4, [l])).toBeLessThan(1);
    // camera phía trên đỉnh cổng: không bị chặn
    expect(cameraClearance(0, 7, -4, 0, 9, 4, [l])).toBe(1);
  });

  it('người đứng ngay dưới xà thì camera sau lưng không bị kéo sát', () => {
    const l = gateLintel('env/cong-lang-giay', 0, 0, 0)!;
    // người giữa cổng, ngực cao 1,3; camera sau lưng 7 đơn vị, cao 4
    expect(cameraClearance(0, 1.3, 0, 0, 4, 7, [l])).toBeGreaterThan(0.5);
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

  it('bán kính bao của từng đồ vật hợp lý: cây đa (gốc chính) 2–3, nhà 3–3,6, giếng khoảng 1,2', () => {
    expect(footprintRadiusOf('env/cay-da')).toBeGreaterThan(2);
    expect(footprintRadiusOf('env/cay-da')).toBeLessThan(3);
    expect(footprintRadiusOf('env/nha-mai-ngoi')).toBeGreaterThan(3);
    expect(footprintRadiusOf('env/nha-mai-ngoi')).toBeLessThan(3.8);
    expect(footprintRadiusOf('env/gieng-lang')).toBeCloseTo(1.23, 1);
  });
});

describe('vật chắn lối đi của cổng đóng', () => {
  for (const g of ['giay', 'det', 'khac-dau', 'bac']) {
    it(`cổng ${g}: kết hợp với hai chân cổng thì kín lối đi (người đi thẳng không lọt), và gối lên chân cổng`, () => {
      const id = `env/cong-lang-${g}`;
      for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const gate = footprintObstacles(id, 7, -4, yaw);
        const barrier = gateBarrierObstacle(id, 7, -4, yaw);
        expect(barrier, id).not.toBeNull();
        const all = [...gate, barrier!];
        const fx = Math.sin(yaw);
        const fz = Math.cos(yaw);
        // đi từ phía trước lối đi, trên nhiều đường song song trong bề rộng lối đi, rồi sang phía sau: luôn bị chặn (không lọt qua)
        for (const side of [-1.1, -0.6, 0, 0.6, 1.1]) {
          const p: Point2 = { x: 7 - fx * 6 + fz * side, z: -4 - fz * 6 - fx * side };
          let crossed = false;
          for (let d = 0; d < 12; d += 0.05) {
            p.x += fx * 0.05;
            p.z += fz * 0.05;
            resolveCollisions(p, PLAYER_RADIUS, all, Infinity);
            // đã sang tới phía sau cổng (vượt qua 1,5 phía sau tâm theo hướng cổng)
            if ((p.x - 7) * fx + (p.z + 4) * fz > 1.5) crossed = true;
          }
          expect(crossed, `${id} yaw ${yaw} đường ${side}`).toBe(false);
        }
      }
    });
  }

  it('cổng không có trong bảng thì không có vật chắn', () => {
    expect(gateBarrierObstacle('env/nha-mai-ngoi', 0, 0, 0)).toBeNull();
  });
});

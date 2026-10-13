import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BOAT_HEIGHT, BOAT_LENGTH, BOAT_WIDTH, createBoatCanopy, createBoatHull, createCraftProp, createHayStack, createJar } from './marketGeometry';
import { PROP_SIZES, type PropKind } from './marketLayout';

const box = (g: { computeBoundingBox(): void; boundingBox: Box3 | null }) => {
  g.computeBoundingBox();
  return g.boundingBox as Box3;
};

describe('hình học tự dựng của chợ', () => {
  it('thân thuyền: dài 4,6 theo z, rộng không quá 1,3, đáy ở y = 0, đầu vểnh lên', () => {
    const b = box(createBoatHull());
    expect(b.max.z - b.min.z).toBeCloseTo(BOAT_LENGTH, 6);
    expect(b.max.x - b.min.x).toBeLessThanOrEqual(BOAT_WIDTH + 1e-6);
    expect(b.max.x - b.min.x).toBeGreaterThan(BOAT_WIDTH * 0.95);
    expect(b.min.y).toBeCloseTo(0, 6);
    expect(b.max.y).toBeGreaterThan(BOAT_HEIGHT); // đầu vểnh cao hơn mép giữa
  });
  it('thân thuyền thon hai đầu: ở đầu rộng hơn 0 nhưng hẹp hơn giữa nhiều', () => {
    const g = createBoatHull();
    const pos = g.getAttribute('position');
    let midMax = 0;
    let endMax = 0;
    for (let i = 0; i < pos.count; i++) {
      const w = Math.abs(pos.getX(i));
      const z = Math.abs(pos.getZ(i));
      if (z < 0.3) midMax = Math.max(midMax, w);
      if (z > BOAT_LENGTH / 2 - 0.05) endMax = Math.max(endMax, w);
    }
    expect(endMax).toBeLessThan(midMax * 0.3);
  });
  it('mui thuyền: vòm nằm phía trên (y ≥ 0), dài 1,9 theo z', () => {
    const b = box(createBoatCanopy());
    expect(b.min.y).toBeGreaterThanOrEqual(-1e-6);
    expect(b.max.y).toBeCloseTo(0.62, 3);
    expect(b.max.z - b.min.z).toBeCloseTo(1.9, 6);
  });
  it('chum vại cao 1,05; đống rơm cao 2 và chân bán kính 1', () => {
    const j = box(createJar());
    expect(j.max.y).toBeCloseTo(1.05, 6);
    expect(j.min.y).toBeCloseTo(0, 6);
    const h = box(createHayStack());
    expect(h.max.y).toBeCloseTo(2, 6);
    expect(h.max.x).toBeGreaterThan(0.95);
    expect(h.max.x).toBeLessThanOrEqual(1);
  });
});

describe('đồ gợi nghề quanh cổng: hình dựng khớp PROP_SIZES (vật cản sát hình)', () => {
  const crafts: PropKind[] = ['giay', 'vai', 'khoi-da', 'ban-da', 'hom', 'thung', 'chan'];
  for (const kind of crafts) {
    it(`${kind}: chân ở y = 0, cao đúng, vừa trong hình vật cản (hộp hoặc tròn)`, () => {
      const g = createCraftProp(kind)!;
      expect(g, kind).not.toBeNull();
      const b = box(g);
      const k = PROP_SIZES[kind];
      expect(b.min.y).toBeCloseTo(0, 6);
      expect(b.max.y).toBeCloseTo(k.h, 6);
      if (k.box) {
        expect(b.max.x - b.min.x).toBeCloseTo(k.box.hx * 2, 6);
        expect(b.max.z - b.min.z).toBeCloseTo(k.box.hz * 2, 6);
      } else {
        expect((b.max.x - b.min.x) / 2).toBeCloseTo(k.r, 6);
        expect((b.max.z - b.min.z) / 2).toBeCloseTo(k.r, 6);
      }
    });
  }
  it('chum, rơm, hoa, đá dựng ở nơi khác: không có ở đây', () => {
    for (const kind of ['chum', 'rom', 'hoa', 'da'] as PropKind[]) expect(createCraftProp(kind)).toBeNull();
  });
});

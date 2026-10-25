import { describe, expect, it } from 'vitest';
import { CHICKEN_SPEC } from './chickenConfig';
import { COOP_POINT, IMAGE_WORLD, LANE_SCALE, MAN09_LANES, WORLD_FRAME, imageToWorld, lanePose, laneQuad, lanesSource, worldToImage, type LanePose } from './man09Lanes';

const pose = (): LanePose => ({ x: 0, y: 0, scale: 1 });
const L = CHICKEN_SPEC.laneLength;

describe('man09Lanes: ba làn trên ảnh nền', () => {
  it('có đúng số làn của logic, mọi điểm nằm trong ảnh, đầu làn ở trên cuối làn', () => {
    expect(MAN09_LANES).toHaveLength(CHICKEN_SPEC.lanes);
    for (const l of MAN09_LANES) {
      for (const p of [l.top, l.bottom]) {
        expect(p.u).toBeGreaterThan(0);
        expect(p.u).toBeLessThan(1);
        expect(p.v).toBeGreaterThan(0);
        expect(p.v).toBeLessThan(1);
      }
      expect(l.bottom.v).toBeGreaterThan(l.top.v);
      expect(l.half.top).toBeGreaterThan(0);
      expect(l.half.bottom).toBeGreaterThanOrEqual(l.half.top);
    }
  });

  it('làn xếp từ trái sang phải ở cả hai đầu', () => {
    for (let i = 1; i < MAN09_LANES.length; i++) {
      expect(MAN09_LANES[i].top.u).toBeGreaterThan(MAN09_LANES[i - 1].top.u);
      expect(MAN09_LANES[i].bottom.u).toBeGreaterThan(MAN09_LANES[i - 1].bottom.u);
    }
  });

  it('đổi tọa độ ảnh ↔ thế giới khớp nhau, tâm ảnh ở gốc, ảnh phủ kín khung (rộng hơn 16, cao đúng 9)', () => {
    expect(IMAGE_WORLD.height).toBe(WORLD_FRAME.height);
    expect(IMAGE_WORLD.width).toBeGreaterThanOrEqual(WORLD_FRAME.width);
    const c = imageToWorld(0.5, 0.5);
    expect(c.x).toBeCloseTo(0, 9);
    expect(c.y).toBeCloseTo(0, 9);
    const w = imageToWorld(0.3, 0.8);
    const back = worldToImage(w.x, w.y);
    expect(back.u).toBeCloseTo(0.3, 9);
    expect(back.v).toBeCloseTo(0.8, 9);
  });

  it('lanePose: pos 0 ở đầu làn, pos 10 ở cuối làn, càng gần cổng càng to và càng thấp trên màn', () => {
    MAN09_LANES.forEach((l, i) => {
      const a = lanePose(i, 0, pose());
      const b = lanePose(i, L, pose());
      const ta = imageToWorld(l.top.u, l.top.v);
      const tb = imageToWorld(l.bottom.u, l.bottom.v);
      expect(a.x).toBeCloseTo(ta.x, 9);
      expect(a.y).toBeCloseTo(ta.y, 9);
      expect(b.x).toBeCloseTo(tb.x, 9);
      expect(b.y).toBeCloseTo(tb.y, 9);
      expect(a.scale).toBeCloseTo(LANE_SCALE.top, 9);
      expect(b.scale).toBeCloseTo(LANE_SCALE.bottom, 9);
      let prev = lanePose(i, 0, pose());
      for (let p = 1; p <= L; p++) {
        const q = lanePose(i, p, pose());
        expect(q.scale).toBeGreaterThan(prev.scale);
        expect(q.y).toBeLessThan(prev.y);
        prev = q;
      }
    });
  });

  it('lanePose kẹp pos: dưới 0 về đầu làn, quá xa thì dừng ở 1,2 lần chiều dài', () => {
    expect(lanePose(1, -5, pose()).x).toBeCloseTo(lanePose(1, 0, pose()).x, 9);
    expect(lanePose(1, 100, pose()).x).toBeCloseTo(lanePose(1, L * 1.2, pose()).x, 9);
    expect(lanePose(7, 3, pose()).x).toBeCloseTo(lanePose(2, 3, pose()).x, 9);
  });

  it('hình thang làn: trái nằm bên trái phải, cạnh trên (pos nhỏ) cao hơn cạnh dưới, các làn không chồng nhau ở mọi pos', () => {
    MAN09_LANES.forEach((_, i) => {
      const [tl, tr, br, bl] = laneQuad(i, 2, 8);
      expect(tl.x).toBeLessThan(tr.x);
      expect(bl.x).toBeLessThan(br.x);
      expect(tl.y).toBeGreaterThan(bl.y);
    });
    for (let p = 0; p <= L; p += 0.5) {
      for (let i = 1; i < MAN09_LANES.length; i++) {
        const left = laneQuad(i - 1, p, p + 0.001)[1].x;
        const right = laneQuad(i, p, p + 0.001)[0].x;
        expect(right).toBeGreaterThan(left);
      }
    }
  });

  it('chuồng gà nằm bên trái cả ba làn và trong ảnh', () => {
    expect(COOP_POINT.u).toBeGreaterThan(0);
    for (const l of MAN09_LANES) {
      expect(COOP_POINT.u).toBeLessThan(l.bottom.u);
      expect(COOP_POINT.u).toBeLessThan(l.top.u);
    }
  });

  it('lanesSource xuất đủ ba dòng làn và đọc lại được các số', () => {
    const src = lanesSource(MAN09_LANES);
    expect(src.split('\n')).toHaveLength(MAN09_LANES.length + 2);
    expect(src).toContain('export const MAN09_LANES');
    expect(src).toContain(`u: ${MAN09_LANES[0].top.u}`);
    expect(src).toContain(`half: { top: ${MAN09_LANES[2].half.top}, bottom: ${MAN09_LANES[2].half.bottom} }`);
  });
});

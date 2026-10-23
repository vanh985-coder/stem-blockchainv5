import { describe, expect, it } from 'vitest';
import { BOOK_POINT, IMAGE_WORLD, LANE_SCALE, MAN05_LANES, imageToWorld, laneAt, laneHeading, lanePose, lanesSource, worldToImage } from './man05Lanes';
import { WHACK_SPEC } from './whackConfig';

const pose = { x: 0, y: 0, scale: 1 };

describe('4 làn của màn 5 (man05Lanes.ts)', () => {
  it('có 4 làn, mọi điểm trong ảnh (0 đến 1); đầu làn ở trên cuốn sổ (v nhỏ hơn); thứ tự từ trái sang phải', () => {
    expect(MAN05_LANES).toHaveLength(WHACK_SPEC.lanes);
    for (const l of MAN05_LANES) {
      for (const p of [l.top, l.bottom]) {
        expect(p.u).toBeGreaterThan(0);
        expect(p.u).toBeLessThan(1);
        expect(p.v).toBeGreaterThan(0);
        expect(p.v).toBeLessThan(1);
      }
      expect(l.top.v).toBeLessThan(l.bottom.v);
    }
    for (let i = 1; i < MAN05_LANES.length; i++) {
      expect(MAN05_LANES[i].top.u).toBeGreaterThan(MAN05_LANES[i - 1].top.u);
      expect(MAN05_LANES[i].bottom.u).toBeGreaterThan(MAN05_LANES[i - 1].bottom.u);
    }
  });

  it('đổi tọa độ ảnh ↔ thế giới khớp nhau; ảnh phủ kín khung 16 × 9 (cover, cao 9)', () => {
    expect(IMAGE_WORLD.height).toBe(9);
    expect(IMAGE_WORLD.width).toBeGreaterThanOrEqual(16);
    const w = imageToWorld(0.5, 0.5);
    expect(w.x).toBeCloseTo(0, 9);
    expect(w.y).toBeCloseTo(0, 9);
    const p = imageToWorld(0.37, 0.81);
    const q = worldToImage(p.x, p.y);
    expect(q.u).toBeCloseTo(0.37, 9);
    expect(q.v).toBeCloseTo(0.81, 9);
  });

  it('lanePose: pos 0 ở đầu làn (nhỏ), pos 10 ở sổ (cỡ đầy đủ); càng xuống càng to; vùng đập [6,5; 9] chạy xuống dưới', () => {
    for (let lane = 0; lane < 4; lane++) {
      const a = lanePose(lane, 0, { ...pose });
      const b = lanePose(lane, 10, { ...pose });
      const seg = MAN05_LANES[lane];
      expect(a.x).toBeCloseTo(imageToWorld(seg.top.u, seg.top.v).x, 9);
      expect(b.y).toBeCloseTo(imageToWorld(seg.bottom.u, seg.bottom.v).y, 9);
      expect(a.scale).toBeCloseTo(LANE_SCALE.top, 9);
      expect(b.scale).toBeCloseTo(LANE_SCALE.bottom, 9);
      let prev = -Infinity;
      for (let p = 0; p <= 10; p += 0.5) {
        const q = lanePose(lane, p, { ...pose });
        expect(q.scale).toBeGreaterThanOrEqual(prev);
        prev = q.scale;
      }
      const z0 = lanePose(lane, WHACK_SPEC.zoneStart, { ...pose });
      const z1 = lanePose(lane, WHACK_SPEC.zoneEnd, { ...pose });
      expect(z0.y).toBeGreaterThan(z1.y); // y hướng lên: vùng đập chạy xuống dưới
    }
  });

  it('vùng đập nằm sát bàn sổ: cuối vùng (pos 9) gần điểm sổ hơn đầu làn', () => {
    const book = imageToWorld(BOOK_POINT.u, BOOK_POINT.v);
    for (let lane = 0; lane < 4; lane++) {
      const end = lanePose(lane, WHACK_SPEC.zoneEnd, { ...pose });
      const top = lanePose(lane, 0, { ...pose });
      expect(Math.hypot(end.x - book.x, end.y - book.y)).toBeLessThan(Math.hypot(top.x - book.x, top.y - book.y));
    }
  });

  it('laneHeading: đầu chuột (bên trái hình gốc) hướng xuống sổ dọc làn', () => {
    for (let lane = 0; lane < 4; lane++) {
      const a = lanePose(lane, 0, { ...pose });
      const b = lanePose(lane, 10, { ...pose });
      const th = laneHeading(lane);
      // hình gốc đầu hướng −x; sau khi xoay th thì đầu hướng (−cos th, −sin th)
      const hx = -Math.cos(th);
      const hy = -Math.sin(th);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      expect(hx).toBeCloseTo((b.x - a.x) / len, 6);
      expect(hy).toBeCloseTo((b.y - a.y) / len, 6);
    }
  });

  it('laneAt: chạm gần giữa làn nào thì ra làn đó; xa mọi làn thì −1', () => {
    for (let lane = 0; lane < 4; lane++) {
      const p = lanePose(lane, 7.7, { ...pose });
      expect(laneAt(p.x, p.y)).toBe(lane);
      const near = lanePose(lane, 3, { ...pose });
      expect(laneAt(near.x, near.y)).toBe(lane);
    }
    expect(laneAt(-7.5, 3.5)).toBe(-1);
    expect(laneAt(7.8, -4.3)).toBe(-1);
  });

  it('lanesSource xuất đúng khối mã để chép vào file', () => {
    const src = lanesSource(MAN05_LANES);
    expect(src.startsWith('export const MAN05_LANES')).toBe(true);
    expect(src.match(/top: \{ u:/g)).toHaveLength(4);
    expect(src).toContain('u: 0.323, v: 0.384');
  });
});

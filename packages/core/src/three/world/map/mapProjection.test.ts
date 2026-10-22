import { describe, expect, it } from 'vitest';
import {
  LARGE_TEXT_FACTOR,
  MAP_RADIUS_OUTSIDE,
  MAP_RADIUS_VILLAGE,
  MAP_SIZE_DESKTOP,
  MAP_SIZE_TOUCH,
  arrowAngleDeg,
  mapScale,
  miniMapSize,
  northPoint,
  pinToCircle,
  project,
  rotationFor,
  staticTransform,
  viewRadiusFor,
  type MapView,
  type Pinned,
  type Point,
} from './mapProjection';

const view = (over: Partial<MapView> = {}): MapView => ({ cx: 0, cz: 0, radius: 90, size: 180, rotation: 0, ...over });
const pt = (): Point => ({ x: 0, y: 0 });

describe('chiếu tọa độ thế giới sang bản đồ nhỏ', () => {
  it('cỡ: 180 trên máy tính, 120 trên điện thoại, Chữ to nhân 1,15', () => {
    expect(miniMapSize(false, false)).toBe(MAP_SIZE_DESKTOP);
    expect(miniMapSize(true, false)).toBe(MAP_SIZE_TOUCH);
    expect(miniMapSize(false, true)).toBe(Math.round(180 * LARGE_TEXT_FACTOR));
    expect(miniMapSize(true, true)).toBe(138);
  });

  it('thu phóng: ở ngoài làng thấy cả 4 lối ra (cổng cách tâm chợ 72), trong làng thấy bán kính 60', () => {
    expect(viewRadiusFor(false)).toBe(MAP_RADIUS_OUTSIDE);
    expect(viewRadiusFor(true)).toBe(MAP_RADIUS_VILLAGE);
    expect(MAP_RADIUS_OUTSIDE).toBeGreaterThan(72);
    expect(MAP_RADIUS_VILLAGE).toBe(60);
    expect(mapScale(view({ radius: 60 }))).toBeCloseTo(1.5, 10);
  });

  it('người chơi nằm chính giữa khung', () => {
    const p = project(view({ cx: 30, cz: -12 }), 30, -12, pt());
    expect(p.x).toBeCloseTo(90, 10);
    expect(p.y).toBeCloseTo(90, 10);
  });

  it('hướng bắc ở trên: +Z lên trên, +X (tây) sang trái, −X (đông) sang phải', () => {
    const v = view();
    const north = project(v, 0, 45, pt());
    expect(north.x).toBeCloseTo(90, 10);
    expect(north.y).toBeCloseTo(45, 10); // lên trên: y nhỏ hơn tâm
    const west = project(v, 45, 0, pt());
    expect(west.x).toBeCloseTo(45, 10); // sang trái
    expect(west.y).toBeCloseTo(90, 10);
    const east = project(v, -45, 0, pt());
    expect(east.x).toBeCloseTo(135, 10);
    const south = project(v, 0, -45, pt());
    expect(south.y).toBeCloseTo(135, 10);
  });

  it('mép bản đồ: điểm cách tâm đúng bán kính nằm trên đường tròn', () => {
    const v = view({ radius: 88, size: 180 });
    const p = project(v, 0, 88, pt());
    expect(Math.hypot(p.x - 90, p.y - 90)).toBeCloseTo(90, 8);
  });

  it('bản đồ xoay theo hướng nhìn: nhìn về phía tây (yaw π/2) thì phía tây ở trên; nhìn bắc thì không đổi', () => {
    expect(rotationFor(false, 1.3)).toBe(0);
    expect(rotationFor(true, 1.3)).toBe(1.3);
    const v = view({ rotation: Math.PI / 2 });
    const west = project(v, 45, 0, pt());
    expect(west.x).toBeCloseTo(90, 8);
    expect(west.y).toBeCloseTo(45, 8);
    const ahead = project(view({ rotation: 0 }), 0, 45, pt());
    expect(ahead.y).toBeCloseTo(45, 8);
    // nhìn về phía nam (yaw π): phía nam ở trên
    const south = project(view({ rotation: Math.PI }), 0, -45, pt());
    expect(south.x).toBeCloseTo(90, 8);
    expect(south.y).toBeCloseTo(45, 8);
  });

  it('bất kỳ hướng nhìn nào: điểm ngay trước mặt luôn ở trên màn hình', () => {
    for (let yaw = -3; yaw <= 3; yaw += 0.5) {
      const ahead = project(view({ rotation: yaw }), Math.sin(yaw) * 30, Math.cos(yaw) * 30, pt());
      expect(ahead.x, `yaw ${yaw}`).toBeCloseTo(90, 8);
      expect(ahead.y, `yaw ${yaw}`).toBeCloseTo(90 - 30 * mapScale(view()), 8);
    }
  });

  it('transform của phần tĩnh khớp với project (kiểm bằng cách áp ma trận)', () => {
    for (const v of [view({ cx: 12, cz: -7 }), view({ cx: 50, cz: 130, rotation: 0.8, radius: 60 }), view({ rotation: -2.2, size: 138 })]) {
      const t = staticTransform(v);
      const m = /^translate\((\S+) (\S+)\) rotate\((\S+)\) scale\((\S+) (\S+)\) translate\((\S+) (\S+)\)$/.exec(t);
      expect(m, t).not.toBeNull();
      const [tx, ty, deg, sx, sy, ux, uz] = (m as RegExpExecArray).slice(1).map(Number) as [number, number, number, number, number, number, number];
      for (const [x, z] of [[0, 0], [40, -25], [-70, 90], [v.cx + 10, v.cz - 20]] as const) {
        const a = (deg * Math.PI) / 180;
        const px = (x + ux) * sx;
        const pz = (z + uz) * sy;
        const rx = px * Math.cos(a) - pz * Math.sin(a) + tx;
        const ry = px * Math.sin(a) + pz * Math.cos(a) + ty;
        const p = project(v, x, z, pt());
        expect(rx).toBeCloseTo(p.x, 1);
        expect(ry).toBeCloseTo(p.y, 1);
      }
    }
  });

  it('mũi tên học sinh: bản đồ cố định thì xoay theo yaw (nhìn tây thì chỉ sang trái), bản đồ xoay thì luôn chỉ lên', () => {
    expect(arrowAngleDeg(false, 0)).toBeCloseTo(0, 10);
    expect(arrowAngleDeg(false, Math.PI / 2)).toBeCloseTo(-90, 10);
    expect(arrowAngleDeg(false, -Math.PI / 2)).toBeCloseTo(90, 10);
    expect(arrowAngleDeg(true, 2)).toBe(0);
    // khớp với project: mũi tên chỉ về điểm trước mặt
    const yaw = 0.7;
    const ahead = project(view(), Math.sin(yaw) * 20, Math.cos(yaw) * 20, pt());
    const ang = Math.atan2(ahead.x - 90, -(ahead.y - 90));
    expect((ang * 180) / Math.PI).toBeCloseTo(arrowAngleDeg(false, yaw), 8);
  });

  it('chữ B (hướng bắc) ở trên khi không xoay, và đi theo hướng bắc khi xoay', () => {
    const n0 = northPoint({ size: 180, rotation: 0 }, 80, pt());
    expect(n0.x).toBeCloseTo(90, 10);
    expect(n0.y).toBeCloseTo(10, 10);
    const n1 = northPoint({ size: 180, rotation: Math.PI / 2 }, 80, pt());
    expect(n1.x).toBeCloseTo(170, 10); // nhìn về phía tây: bắc ở bên phải
    expect(n1.y).toBeCloseTo(90, 10);
    // đúng hướng mà project đặt hướng bắc
    const v = view({ rotation: 0.6 });
    const north = project(v, 0, 1000, pt());
    const b = northPoint(v, 80, pt());
    expect((north.x - 90) / Math.hypot(north.x - 90, north.y - 90)).toBeCloseTo((b.x - 90) / 80, 8);
  });

  it('điểm ngoài vòng bị kéo về mép giữ nguyên hướng; điểm trong vòng giữ nguyên', () => {
    const out: Pinned = { x: 0, y: 0, clamped: false, angle: 0 };
    pinToCircle({ x: 90, y: 20 }, 180, 8, out);
    expect(out.clamped).toBe(false);
    expect(out.y).toBe(20);
    pinToCircle({ x: 90, y: -400 }, 180, 8, out);
    expect(out.clamped).toBe(true);
    expect(out.x).toBeCloseTo(90, 8);
    expect(out.y).toBeCloseTo(8, 8);
    expect(out.angle).toBeCloseTo(0, 8);
    pinToCircle({ x: 700, y: 90 }, 180, 8, out);
    expect(out.clamped).toBe(true);
    expect(out.x).toBeCloseTo(172, 8);
    expect(out.angle).toBeCloseTo(90, 8);
    pinToCircle({ x: 90, y: 90 }, 180, 8, out);
    expect(out.clamped).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { ADVANCE_DISTANCE, OFF_ROAD_DISTANCE, buildGraph, createRouter, sampleEdges, type RouteStep } from './roadGraph';

// Ngã ba chữ T: A(0,0) — B(10,0) — C(20,0); B — D(10,10); X là nút rời
const G = buildGraph(
  [
    { id: 'A', x: 0, z: 0 },
    { id: 'B', x: 10, z: 0 },
    { id: 'C', x: 20, z: 0 },
    { id: 'D', x: 10, z: 10 },
    { id: 'X', x: 100, z: 100 },
  ],
  [
    ['A', 'B'],
    ['B', 'C'],
    ['B', 'D'],
  ],
);
const step = (): RouteStep => ({ x: 0, z: 0, remaining: 0, found: false });

describe('buildGraph', () => {
  it('nút trùng hay đoạn nối nút lạ thì báo lỗi', () => {
    expect(() =>
      buildGraph(
        [
          { id: 'a', x: 0, z: 0 },
          { id: 'a', x: 1, z: 1 },
        ],
        [],
      ),
    ).toThrow();
    expect(() => buildGraph([{ id: 'a', x: 0, z: 0 }], [['a', 'b']])).toThrow();
  });
  it('lấy mẫu dọc đoạn: có đủ điểm đầu và cuối, cách đều', () => {
    const pts = sampleEdges(G, 1).filter((p) => p.edge === 0);
    expect(pts[0]).toMatchObject({ x: 0, z: 0 });
    expect(pts[pts.length - 1]).toMatchObject({ x: 10, z: 0 });
    expect(pts).toHaveLength(11);
  });
});

describe('router: điểm tiếp theo trên đồ thị', () => {
  const r = createRouter(G);
  it('chưa có đích thì không có điểm (found = false)', () => {
    const o = step();
    expect(r.next(1, 1, o).found).toBe(false);
  });
  it('đứng trên đường, đích ở xa: chỉ về nút kế tiếp theo đường (không chỉ thẳng)', () => {
    r.setTarget('D');
    const o = step();
    r.next(2, 0, o); // trên đoạn A–B, đích D phải qua B
    expect(o.found).toBe(true);
    expect(o).toMatchObject({ x: 10, z: 0 });
    expect(o.remaining).toBeCloseTo(8 + 10, 6);
  });
  it('tới sát nút (trong ADVANCE_DISTANCE) thì chuyển sang nút kế tiếp: ở ngã ba B hướng về D', () => {
    r.setTarget('D');
    const o = step();
    r.next(10 - ADVANCE_DISTANCE + 0.5, 0, o);
    expect(o).toMatchObject({ x: 10, z: 10 });
  });
  it('đã ở sát đích thì chỉ về đích và còn lại ~0', () => {
    r.setTarget('C');
    const o = step();
    r.next(19.9, 0, o);
    expect(o).toMatchObject({ x: 20, z: 0 });
    expect(o.remaining).toBeLessThan(0.2);
  });
  it('đứng ngoài đường (xa hơn OFF_ROAD_DISTANCE): chỉ về điểm gần nhất trên đường', () => {
    r.setTarget('C');
    const o = step();
    r.next(5, -(OFF_ROAD_DISTANCE + 3), o);
    expect(o.found).toBe(true);
    expect(o.x).toBeCloseTo(5, 6);
    expect(o.z).toBeCloseTo(0, 6);
  });
  it('đổi đích thì tính lại; nút lạ hay null thì bỏ đích; nút không nối tới thì không tìm thấy', () => {
    r.setTarget('A');
    const o = step();
    r.next(15, 0, o);
    expect(o).toMatchObject({ x: 10, z: 0 });
    r.setTarget('khong-co');
    expect(r.next(15, 0, o).found).toBe(false);
    r.setTarget('X');
    expect(r.next(15, 0, o).found).toBe(false);
    r.setTarget(null);
    expect(r.next(15, 0, o).found).toBe(false);
  });
  it('khoảng cách theo đồ thị từ một nút tới đích', () => {
    r.setTarget('C');
    expect(r.distanceFrom('A')).toBeCloseTo(20, 6);
    expect(r.distanceFrom('D')).toBeCloseTo(20, 6);
    expect(r.distanceFrom('X')).toBe(Infinity);
    expect(r.distanceFrom('khong-co')).toBe(Infinity);
  });
  it('đi theo mũi tên từ A tới đích D thì tới nơi, độ dài còn lại không tăng quá một ADVANCE_DISTANCE khi cắt góc ở ngã ba', () => {
    r.setTarget('D');
    const o = step();
    let x = 0;
    let z = 0;
    let remaining = Infinity;
    for (let i = 0; i < 100; i++) {
      r.next(x, z, o);
      expect(o.remaining).toBeLessThanOrEqual(remaining + ADVANCE_DISTANCE);
      remaining = o.remaining;
      if (o.remaining < 0.3) break;
      const dx = o.x - x;
      const dz = o.z - z;
      const l = Math.hypot(dx, dz) || 1;
      x += (dx / l) * Math.min(1, l);
      z += (dz / l) * Math.min(1, l);
    }
    expect(Math.hypot(x - 10, z - 10)).toBeLessThan(1);
  });
});

import { describe, expect, it } from 'vitest';
import { PIN_MARGIN, newScratch, placeMarker, placeView, type MarkerPlacement } from './miniMapFrame';
import { MAP_RADIUS_OUTSIDE, MAP_RADIUS_VILLAGE, type MapView } from './mapProjection';

const fresh = (): MapView => ({ cx: 0, cz: 0, radius: 1, size: 180, rotation: 0 });
const out = (): MarkerPlacement => ({ transform: '', pinned: false, pinAngle: 0 });

describe('một nhịp cập nhật của bản đồ nhỏ', () => {
  it('khung nhìn theo em: tâm là vị trí em, ở ngoài làng bán kính 88, trong làng bán kính 60', () => {
    const v = placeView(fresh(), { x: 5, z: -9 }, 0.4, false, false, 180);
    expect([v.cx, v.cz, v.radius, v.rotation, v.size]).toEqual([5, -9, MAP_RADIUS_OUTSIDE, 0, 180]);
    const w = placeView(fresh(), { x: 5, z: 150 }, 0.4, false, true, 138);
    expect([w.radius, w.size]).toEqual([MAP_RADIUS_VILLAGE, 138]);
  });

  it('xoay theo hướng nhìn chỉ khi bật tuỳ chọn', () => {
    expect(placeView(fresh(), { x: 0, z: 0 }, 1.1, false, false, 180).rotation).toBe(0);
    expect(placeView(fresh(), { x: 0, z: 0 }, 1.1, true, false, 180).rotation).toBe(1.1);
  });

  it('ký hiệu ở chính chỗ em đứng nằm giữa khung', () => {
    const v = placeView(fresh(), { x: 20, z: 30 }, 0, false, false, 180);
    expect(placeMarker(v, false, 20, 30, newScratch(), out()).transform).toBe('translate(90.0 90.0)');
  });

  it('ký hiệu thường nằm ngoài vòng thì cứ ở đúng chỗ (không bị kéo)', () => {
    const v = placeView(fresh(), { x: 0, z: 0 }, 0, false, true, 180);
    const p = placeMarker(v, false, 0, 500, newScratch(), out());
    expect(p.pinned).toBe(false);
    expect(p.transform).toBe(`translate(90.0 ${(90 - 500 * 1.5).toFixed(1)})`);
  });

  it('điểm đến trong vòng: đúng chỗ, không có mũi tên chỉ hướng', () => {
    const v = placeView(fresh(), { x: 0, z: 0 }, 0, false, false, 180);
    const p = placeMarker(v, true, 0, 40, newScratch(), out());
    expect(p.pinned).toBe(false);
    const y = 90 - 40 * (90 / MAP_RADIUS_OUTSIDE);
    expect(p.transform).toBe(`translate(90.0 ${y.toFixed(1)})`);
  });

  it('điểm đến ngoài vòng: kéo về mép đúng hướng, mũi tên chỉ về phía điểm đến', () => {
    const v = placeView(fresh(), { x: 0, z: 0 }, 0, false, false, 180);
    const north = placeMarker(v, true, 0, 300, newScratch(), out());
    expect(north.pinned).toBe(true);
    expect(north.transform).toBe(`translate(90.0 ${(PIN_MARGIN).toFixed(1)})`);
    expect(north.pinAngle).toBeCloseTo(0, 8);
    const west = placeMarker(v, true, 300, 0, newScratch(), out());
    expect(west.transform).toBe(`translate(${PIN_MARGIN.toFixed(1)} 90.0)`);
    expect(west.pinAngle).toBeCloseTo(-90, 8);
    const east = placeMarker(v, true, -300, 0, newScratch(), out());
    expect(east.pinAngle).toBeCloseTo(90, 8);
  });

  it('bản đồ xoay: điểm đến ở trước mặt luôn ở trên, dù nhìn hướng nào', () => {
    for (const yaw of [0, 1, 2.5, -1.7]) {
      const v = placeView(fresh(), { x: 0, z: 0 }, yaw, true, false, 180);
      const p = placeMarker(v, true, Math.sin(yaw) * 400, Math.cos(yaw) * 400, newScratch(), out());
      expect(p.pinned).toBe(true);
      expect(p.pinAngle).toBeCloseTo(0, 6);
    }
  });
});

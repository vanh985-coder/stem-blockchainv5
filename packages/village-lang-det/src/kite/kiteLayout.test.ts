import { describe, expect, it } from 'vitest';
import { KITE_SPEC as C } from './kiteConfig';
import {
  BACK_LAYERS,
  BLACK_ART,
  BUILD_MARGIN,
  DELIVER_SECONDS,
  FRAME,
  GATE_ART,
  KITE_ART,
  KITE_SCREEN_X,
  POLE_CROP,
  POLE_TILE,
  POLE_UNIT_PER_PX,
  POOL,
  SHAKE_SECONDS,
  UNIT,
  blackSprite,
  bookProgress,
  doorOpen,
  gateSprite,
  invOpacity,
  kiteSprite,
  kiteTilt,
  knotOffset,
  layerOffset,
  layerSize,
  pillarSpans,
  poleRepeat,
  shakeOffset,
  visibleRange,
  worldX,
  worldY,
} from './kiteLayout';

describe('bố cục cảnh màn 6 (kiteLayout.ts)', () => {
  it('đổi đơn vị bay sang thế giới: vùng bay 0 tới 10 phủ đúng chiều cao khung, diều đứng ở KITE_SCREEN_X', () => {
    expect(UNIT).toBeCloseTo(0.9, 9);
    expect(worldY(C.floor)).toBeCloseTo(-FRAME.height / 2, 9);
    expect(worldY(C.ceiling)).toBeCloseTo(FRAME.height / 2, 9);
    expect(worldX(100, 100)).toBe(KITE_SCREEN_X);
    expect(worldX(101, 100) - worldX(100, 100)).toBeCloseTo(UNIT, 9);
    const [a, b] = visibleRange(50);
    expect(worldX(a, 50)).toBeCloseTo(-FRAME.width / 2, 9);
    expect(worldX(b, 50)).toBeCloseTo(FRAME.width / 2, 9);
    // diều nhìn xa phía trước hơn phía sau
    expect(b - 50).toBeGreaterThan(50 - a);
  });

  it('pool đủ chỗ: số khe nằm trong khung cộng lề dựng không quá số ô pool', () => {
    const [a, b] = visibleRange(0, BUILD_MARGIN);
    expect(Math.ceil((b - a) / C.gapSpacing) + 1).toBeLessThanOrEqual(POOL.gaps);
  });

  it('diều nghiêng theo vận tốc đứng trong [−20°; +20°]: bật lên ngóc lên, rơi nhanh nhất chúi xuống, vận tốc 0 thì thẳng', () => {
    const deg = (vy: number) => (kiteTilt(vy) * 180) / Math.PI;
    expect(deg(0)).toBe(0);
    expect(deg(C.flapVelocity)).toBeCloseTo(20, 9);
    expect(deg(C.maxFall)).toBeCloseTo(-20, 9);
    expect(deg(100)).toBeCloseTo(20, 9);
    expect(deg(-100)).toBeCloseTo(-20, 9);
    let prev = -Infinity;
    for (let vy = -10; vy <= 8; vy += 0.25) {
      expect(deg(vy)).toBeGreaterThanOrEqual(prev);
      expect(Math.abs(deg(vy))).toBeLessThanOrEqual(20 + 1e-9);
      prev = deg(vy);
    }
  });

  it('hình diều: thân to hơn hộp va chạm 0,8 × 0,5; tay cầm (nút buộc) nằm dưới và hơi lệch trái tâm diều', () => {
    const k = kiteSprite();
    expect(k.width * KITE_ART.contentW).toBeGreaterThan(C.kite.width);
    const o = knotOffset();
    expect(o.y).toBeLessThan(0);
    expect(o.x).toBeLessThan(0.3);
    expect(Math.abs(o.x)).toBeLessThan(0.6);
    expect(blackSprite().width * BLACK_ART.contentW).toBeGreaterThanOrEqual(C.black.width);
  });

  it('cột tre: thân 20 điểm ảnh ứng với bề rộng cột của luật; số lần lặp theo chiều cao; hai cột của khe phủ từ đất tới đáy khe và từ đỉnh khe tới trần', () => {
    expect(POLE_CROP.poleW * POLE_UNIT_PER_PX).toBeCloseTo(C.pillarWidth, 9);
    expect(POLE_TILE.width).toBeCloseTo(POLE_CROP.w * POLE_UNIT_PER_PX, 9);
    expect(POLE_TILE.height).toBeGreaterThan(5);
    expect(poleRepeat(POLE_TILE.height)).toBeCloseTo(1, 9);
    expect(poleRepeat(2 * POLE_TILE.height)).toBeCloseTo(2, 9);
    const [low, high] = pillarSpans(3, 6);
    expect(low).toEqual([C.floor, 3]);
    expect(high).toEqual([6, C.ceiling]);
    // cột cao nhất (khe sát đáy hay trần) vẫn lặp không quá vài lần
    expect(poleRepeat(C.gapMax - C.floor)).toBeLessThan(2);
  });

  it('cổng làng: đáy phần có hình đứng sát đất, cánh cửa nằm trong thân cổng', () => {
    const g = gateSprite();
    const bottom = g.centerY - (GATE_ART.v1 - 0.5) * g.height;
    expect(bottom).toBeCloseTo(0, 9);
    expect(g.door.cx - g.door.w / 2).toBeGreaterThan((GATE_ART.u0 - 0.5) * g.width);
    expect(g.door.cx + g.door.w / 2).toBeLessThan((GATE_ART.u1 - 0.5) * g.width);
    expect(g.door.cy - g.door.h / 2).toBeGreaterThanOrEqual(-0.01);
  });

  it('3 lớp nền cuộn tốc độ 0,05 / 0,25 / 0,6 so với cột; "Giảm chuyển động" thì lớp nền cuộn chậm một nửa', () => {
    expect(BACK_LAYERS.map((l) => l.speed)).toEqual([0.05, 0.25, 0.6]);
    for (const l of BACK_LAYERS) {
      const size = layerSize(l);
      expect(size.width).toBeGreaterThanOrEqual(FRAME.width - 1e-9);
      // cột cuộn 10 đơn vị thế giới thì hình nền dịch speed × 10 (đơn vị thế giới)
      expect(layerOffset(l, 10, false) * size.width).toBeCloseTo(10 * l.speed, 9);
      expect(layerOffset(l, 10, true)).toBeCloseTo(layerOffset(l, 10, false) / 2, 12);
    }
    // lớp nền phủ kín khung (trời): cao ít nhất bằng khung
    expect(layerSize(BACK_LAYERS[0]).height).toBeGreaterThanOrEqual(FRAME.height - 1e-9);
    // lớp tre gần chạy nhanh nhất
    expect(layerOffset(BACK_LAYERS[2], 5, false) * layerSize(BACK_LAYERS[2]).width).toBeGreaterThan(layerOffset(BACK_LAYERS[1], 5, false) * layerSize(BACK_LAYERS[1]).width);
  });

  it('chớp nhẹ lúc bất tử và rung màn lúc mất tim: có chớp/rung bình thường, không chớp không rung khi "Giảm chuyển động"; hết bất tử thì rõ nét', () => {
    expect(invOpacity(0, 0.05, false)).toBe(1);
    const ops = new Set<number>();
    for (let t = 0; t < 1; t += 0.05) ops.add(invOpacity(0.7, t, false));
    expect(ops.size).toBe(2);
    for (const v of ops) expect(v).toBeLessThan(1.0001);
    const reduced = new Set<number>();
    for (let t = 0; t < 1; t += 0.05) reduced.add(invOpacity(0.7, t, true));
    expect(reduced.size).toBe(1);
    expect(shakeOffset(1, 0.3, false)).not.toEqual({ x: 0, y: 0 });
    expect(shakeOffset(1, 0.3, true)).toEqual({ x: 0, y: 0 });
    expect(shakeOffset(0, 0.3, false)).toEqual({ x: 0, y: 0 });
    expect(SHAKE_SECONDS).toBeLessThan(1);
  });

  it('cảnh giao sổ dài khoảng 1,5 giây: cổng mở trong nửa giây đầu, bản sao sổ bay dần từ 0 tới 1 rồi dừng', () => {
    expect(DELIVER_SECONDS).toBe(1.5);
    expect(doorOpen(0)).toBe(0);
    expect(doorOpen(0.25)).toBeCloseTo(0.5, 9);
    expect(doorOpen(1)).toBe(1);
    expect(bookProgress(0)).toBe(0);
    expect(bookProgress(DELIVER_SECONDS)).toBe(1);
    let prev = 0;
    for (let t = 0; t <= DELIVER_SECONDS; t += 0.05) {
      expect(bookProgress(t)).toBeGreaterThanOrEqual(prev);
      prev = bookProgress(t);
    }
    expect(bookProgress(DELIVER_SECONDS * 0.5)).toBeGreaterThan(0.3);
    expect(bookProgress(DELIVER_SECONDS * 0.5)).toBeLessThan(0.7);
  });
});

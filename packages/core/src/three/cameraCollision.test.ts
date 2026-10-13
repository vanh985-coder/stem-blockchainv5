import { describe, expect, it } from 'vitest';
import { CAMERA_MARGIN, CAMERA_MIN_DISTANCE, cameraClearance, type CameraBlocker } from './cameraCollision';
import { box, circle, obox } from './collision';

/** Điểm nhìn ngang ngực ở gốc, camera mong muốn phía sau lưng cách 7, cao 4 so với chân (cao 5,3 so với đất). */
const F = [0, 1.3, 0] as const;
const C = [0, 5.3, -7] as const;
const len = Math.hypot(C[0] - F[0], C[1] - F[1], C[2] - F[2]);
const clear = (blockers: readonly CameraBlocker[], margin?: number) => cameraClearance(F[0], F[1], F[2], C[0], C[1], C[2], blockers, margin);

describe('camera tránh vật cản', () => {
  it('không có vật cản thì đi hết đoạn (1)', () => {
    expect(clear([])).toBe(1);
  });

  it('vật cản thấp hơn đường đi của camera (đi phía trên đỉnh) không chặn', () => {
    // tường thấp 1 đơn vị ở z ∈ [−5, −3]: camera ở đó đã cao hơn 3
    expect(clear([{ shape: box(-3, 3, -5, -3), height: 1 }])).toBe(1);
  });

  it('nhà cao chắn giữa nhân vật và camera thì kéo camera lại gần, dừng trước mép tường một khoảng margin', () => {
    // nhà cao 10, mặt gần nhân vật ở z = −4
    const t = clear([{ shape: box(-4, 4, -9, -4), height: 10 }]);
    // mép tường nở thêm margin: z = −4 + margin; đoạn đi z = −7t
    expect(t).toBeCloseTo((4 - CAMERA_MARGIN) / 7, 6);
    expect(t).toBeLessThan(1);
    expect(t * 7).toBeLessThanOrEqual(4 - CAMERA_MARGIN + 1e-9); // camera chưa tới tường
  });

  it('vật tròn cao (thân cây đa) chắn thì kéo lại gần', () => {
    const t = clear([{ shape: circle(0, -4.5, 1.2), height: 12 }]);
    expect(t).toBeCloseTo((4.5 - 1.2 - CAMERA_MARGIN) / 7, 6);
  });

  it('hộp xoay chắn: camera dừng trước hộp, không xuyên', () => {
    const b: CameraBlocker = { shape: obox(0, -5, 2, 1, 0.6), height: 8 };
    const t = clear([b]);
    expect(t).toBeLessThan(1);
    // vị trí camera sau khi kéo không nằm trong hộp (kể cả margin nhỏ hơn)
    const x = F[0] + (C[0] - F[0]) * t;
    const z = F[2] + (C[2] - F[2]) * t;
    const cos = Math.cos(0.6);
    const sin = Math.sin(0.6);
    const lx = (x - 0) * cos - (z + 5) * sin;
    const lz = (x - 0) * sin + (z + 5) * cos;
    const inside = Math.abs(lx) < 2 && Math.abs(lz) < 1;
    expect(inside).toBe(false);
  });

  it('vật cản ở phía sau camera hoặc bên cạnh không chặn', () => {
    expect(clear([{ shape: box(10, 14, -9, -4), height: 10 }])).toBe(1);
    expect(clear([{ shape: box(-4, 4, -20, -12), height: 10 }])).toBe(1); // sau camera
  });

  it('nhiều vật cản: lấy vật gần nhân vật nhất', () => {
    const near = clear([{ shape: box(-4, 4, -5, -4), height: 10 }]);
    const both = clear([
      { shape: box(-4, 4, -6.5, -6), height: 10 },
      { shape: box(-4, 4, -5, -4), height: 10 },
    ]);
    expect(both).toBeCloseTo(near, 9);
  });

  it('camera đi xuống (nhìn lên dốc) mà vật cản thấp ở cuối đoạn: chỉ chặn từ chỗ đoạn thấp hơn đỉnh', () => {
    // điểm nhìn cao 6, camera thấp 1 ở z = −8; tường cao 3 ở z ∈ [−8, −5]
    const t = cameraClearance(0, 6, 0, 0, 1, -8, [{ shape: box(-3, 3, -8, -5), height: 3 }], 0);
    // y(t) = 6 − 5t = 3 khi t = 0,6 (z = −4,8); chưa vào tường (z −5) nên chạm đỉnh tường ở t=0,625
    expect(t).toBeCloseTo(0.625, 6);
  });

  it('không bao giờ gần nhân vật hơn khoảng tối thiểu, kể cả vật cản sát mặt', () => {
    const t = clear([{ shape: circle(0, -1, 0.9), height: 20 }]);
    expect(t * len).toBeCloseTo(CAMERA_MIN_DISTANCE, 6);
  });

  it('điểm nhìn nằm trong vật cản (không nên xảy ra) vẫn trả về khoảng tối thiểu, không NaN', () => {
    const t = clear([{ shape: circle(0, 0, 2), height: 20 }]);
    expect(Number.isFinite(t)).toBe(true);
    expect(t * len).toBeCloseTo(CAMERA_MIN_DISTANCE, 6);
  });

  it('đoạn thẳng dài 0 thì trả về 1', () => {
    expect(cameraClearance(1, 1, 1, 1, 1, 1, [{ shape: circle(0, 0, 5), height: 9 }])).toBe(1);
  });

  it('nhân vật đứng sát sau cổng (hai trụ, ở giữa trống): camera đi qua khe giữa, không bị chặn', () => {
    const pillars: CameraBlocker[] = [
      { shape: box(-5, -3, -9, -7), height: 5 },
      { shape: box(3, 5, -9, -7), height: 5 },
    ];
    expect(clear(pillars)).toBe(1);
  });
});

describe('vật chắn camera có đáy (xà ngang cổng)', () => {
  // khối rộng 4 (x từ −2 đến 2), sâu 1 (z từ −0,5 đến 0,5), đáy cao 2, đỉnh cao 6
  const lintel: CameraBlocker = { shape: { type: 'box', minX: -2, maxX: 2, minZ: -0.5, maxZ: 0.5 }, height: 6, base: 2 };

  it('đoạn đi phía dưới đáy thì không bị chặn', () => {
    expect(cameraClearance(0, 1.3, -5, 0, 1.5, 5, [lintel], 0)).toBe(1);
  });

  it('đoạn đi xuyên giữa đáy và đỉnh thì bị chặn trước khi tới khối', () => {
    const t = cameraClearance(0, 3, -5, 0, 3, 5, [lintel], 0);
    expect(t).toBeCloseTo(4.5 / 10, 6);
  });

  it('đoạn đi phía trên đỉnh thì không bị chặn', () => {
    expect(cameraClearance(0, 7, -5, 0, 7, 5, [lintel], 0)).toBe(1);
  });

  it('đoạn đi lên từ dưới đáy vào trong khối thì bị chặn ở chỗ chạm đáy', () => {
    // từ (0, 1, −3) lên (0, 5, 3): chạm mặt trước khối (z = −0,5) ở t = 2,5/6, lúc đó cao 1 + 4 × 2,5/6 ≈ 2,67 (> đáy 2) nên bị chặn tại đó
    const t = cameraClearance(0, 1, -3, 0, 5, 3, [lintel], 0);
    expect(t).toBeCloseTo(2.5 / 6, 6);
  });

  it('khối không có đáy (mặc định) giống hệt trước: chặn từ mặt đất', () => {
    const wall: CameraBlocker = { shape: { type: 'box', minX: -2, maxX: 2, minZ: -0.5, maxZ: 0.5 }, height: 6 };
    expect(cameraClearance(0, 0.5, -5, 0, 0.5, 5, [wall], 0)).toBeCloseTo(0.45, 6);
  });
});

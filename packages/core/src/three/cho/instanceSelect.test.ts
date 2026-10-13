import { Matrix4, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { extractFrustumPlanes, marketFarDistance, marketMaxDistance, marketNearDistance, sameSelection, selectInstances, selectShadowCasters, sphereInFrustum, type Selection } from './instanceSelect';

/** Camera ở gốc nhìn về +Z (như người chơi nhìn về phía bắc), fov 50, tỉ lệ 16:9, xa 400. */
function frustumPlanes(): Float32Array {
  const cam = new PerspectiveCamera(50, 16 / 9, 0.1, 400);
  cam.position.set(0, 5, 0);
  cam.lookAt(0, 5, 100);
  cam.updateMatrixWorld(true);
  const m = new Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  const out = new Float32Array(24);
  extractFrustumPlanes(m.elements, out);
  return out;
}
const planes = frustumPlanes();

describe('khung nhìn', () => {
  it('vật ở phía trước trong khung thì thấy; phía sau thì không', () => {
    expect(sphereInFrustum(planes, 0, 5, 30, 1)).toBe(true);
    expect(sphereInFrustum(planes, 0, 5, -30, 1)).toBe(false);
  });
  it('vật lệch quá xa sang bên hoặc lên trên thì không thấy; có bán kính lớn chạm mép thì vẫn thấy', () => {
    expect(sphereInFrustum(planes, 80, 5, 20, 1)).toBe(false);
    expect(sphereInFrustum(planes, -80, 5, 20, 1)).toBe(false);
    expect(sphereInFrustum(planes, 0, 80, 20, 1)).toBe(false);
    // ở z = 20, nửa bề rộng nhìn thấy ≈ 20·tan(25°)·16/9 ≈ 16,5
    expect(sphereInFrustum(planes, 18, 5, 20, 3)).toBe(true);
    expect(sphereInFrustum(planes, 18, 5, 20, 0.5)).toBe(false);
  });
  it('quá xa mặt phẳng xa (400) thì không thấy', () => {
    expect(sphereInFrustum(planes, 0, 5, 380, 1)).toBe(true);
    expect(sphereInFrustum(planes, 0, 5, 450, 1)).toBe(false);
  });
});

describe('chọn bản được vẽ', () => {
  const pts = [
    [0, 2, 5, 2], //   0: gần, trước mặt
    [0, 2, 25, 2], //  1: xa vừa
    [0, 2, -10, 2], // 2: sau lưng
    [100, 2, 30, 2], // 3: lệch rất xa sang bên
    [3, 2, 60, 3], //  4: xa, trước mặt
    [-4, 2, 150, 3], // 5: rất xa
  ];
  const centers = new Float32Array(pts.flatMap((p) => [p[0], p[1], p[2]]));
  const radii = new Float32Array(pts.map((p) => p[3]));
  const base = { camX: 0, camY: 5, camZ: 0, planes, centers, radii, count: pts.length };
  const result: Selection = { near: 0, mid: 0, far: 0 };
  const near = new Int32Array(pts.length);
  const far = new Int32Array(pts.length);

  it('chia bản chính (gần) và bản xa, bỏ vật sau lưng và ngoài khung nhìn', () => {
    selectInstances({ ...base, nearDistance: 12, maxDistance: Infinity }, near, far, result);
    expect([...near.slice(0, result.near)]).toEqual([0]);
    expect([...far.slice(0, result.far)]).toEqual([1, 4, 5]);
  });

  it('khoảng gần lớn hơn thì nhiều vật dùng bản chính hơn', () => {
    selectInstances({ ...base, nearDistance: 30, maxDistance: Infinity }, near, far, result);
    expect([...near.slice(0, result.near)]).toEqual([0, 1]);
    expect([...far.slice(0, result.far)]).toEqual([4, 5]);
  });

  it('quá khoảng vẽ tối đa thì bỏ hẳn', () => {
    selectInstances({ ...base, nearDistance: 12, maxDistance: 70 }, near, far, result);
    expect([...far.slice(0, result.far)]).toEqual([1, 4]);
  });

  it('vật sát mép: tính theo bán kính, khoảng cách tới mặt chứ không tới tâm', () => {
    const c = new Float32Array([0, 2, 14]);
    const r = new Float32Array([8]); // tâm cách ~14,6 nhưng mặt chỉ ~6,6 và nửa bán kính: 14,6 − 4 = 10,6 < 12
    selectInstances({ ...base, centers: c, radii: r, count: 1, nearDistance: 12, maxDistance: Infinity }, near, far, result);
    expect(result.near).toBe(1);
  });

  it('không có bản nào thì trả 0; kết quả được ghi vào result (không cấp phát)', () => {
    const out = selectInstances({ ...base, count: 0, nearDistance: 12, maxDistance: Infinity }, near, far, result);
    expect(out).toBe(result);
    expect(result.near).toBe(0);
    expect(result.far).toBe(0);
  });

  it('khi camera quay đi chỗ khác thì chọn khác (vật phía sau giờ lại thấy)', () => {
    const cam = new PerspectiveCamera(50, 16 / 9, 0.1, 400);
    cam.position.set(0, 5, 0);
    cam.lookAt(0, 5, -100);
    cam.updateMatrixWorld(true);
    const m = new Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    const back = new Float32Array(24);
    extractFrustumPlanes(m.elements, back);
    selectInstances({ ...base, planes: back, nearDistance: 12, maxDistance: Infinity }, near, far, result);
    expect([...near.slice(0, result.near)]).toEqual([2]);
    expect(result.far).toBe(0);
  });
});

describe('so sánh hai lần chọn và khoảng theo mức chất lượng', () => {
  it('sameSelection', () => {
    expect(sameSelection([1, 2, 3, 9], 3, [1, 2, 3, 7], 3)).toBe(true);
    expect(sameSelection([1, 2, 3], 3, [1, 2], 2)).toBe(false);
    expect(sameSelection([1, 2, 3], 3, [1, 2, 4], 3)).toBe(false);
    expect(sameSelection([], 0, [5], 0)).toBe(true);
  });
  it('khoảng bản chính: Thấp 5, Vừa 15, Cao 25 (nhà, lều, bụi tre); chỉ mức Thấp cắt vật quá xa', () => {
    expect(marketNearDistance('low')).toBe(5);
    expect(marketNearDistance('medium')).toBe(15);
    expect(marketNearDistance('high')).toBe(25);
    // model 3 bậc: cổng làng 12 / 28 và giếng 6 / 14 ở mức Vừa / Cao, mức Thấp giữ 5
    expect(marketNearDistance('low', 'env/cong-lang-giay')).toBe(5);
    expect(marketNearDistance('medium', 'env/cong-lang-giay')).toBe(12);
    expect(marketNearDistance('high', 'env/cong-lang-bac')).toBe(28);
    expect(marketNearDistance('medium', 'env/leu-cho')).toBe(15);
    expect(marketNearDistance('medium', 'env/gieng-lang')).toBe(6);
    expect(marketNearDistance('high', 'env/gieng-lang')).toBe(14);
    expect(marketNearDistance('low', 'env/gieng-lang')).toBe(5);
    expect(marketMaxDistance('low')).toBe(52);
    expect(marketMaxDistance('medium')).toBe(Infinity);
  });
});

describe('chọn vật đổ bóng quanh người chơi', () => {
  // camera ở gốc nhìn về +Z, cao 4 (chỉ cần mặt phẳng khung nhìn): dùng ma trận chiếu đơn giản qua extractFrustumPlanes
  const planes = new Float32Array(24);
  // khung nhìn: phối cảnh 50°, tỉ lệ 16:9, camera ở (0, 4, 0) nhìn +Z: dựng bằng tay các mặt phẳng qua ma trận chiếu × nghịch đảo camera
  const f = 1 / Math.tan((50 * Math.PI) / 360);
  const aspect = 16 / 9;
  const near = 0.1;
  const far = 600;
  const proj = new Float32Array(16);
  proj[0] = f / aspect;
  proj[5] = f;
  proj[10] = (far + near) / (near - far);
  proj[11] = -1;
  proj[14] = (2 * far * near) / (near - far);
  // nghịch đảo ma trận camera đặt ở (0, 4, 0) nhìn −Z (mặc định của three); ta xoay ngược cho tiện: coi +Z là phía trước bằng cách đặt vật ở z âm
  const view = new Float32Array(16);
  view[0] = 1;
  view[5] = 1;
  view[10] = 1;
  view[15] = 1;
  view[13] = -4;
  const mul = (a: Float32Array, b: Float32Array) => {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
  };
  extractFrustumPlanes(mul(proj, view), planes);
  const centers = new Float32Array([
    0, 2, -10, // 0: trước mặt, gần người chơi
    0, 2, -60, // 1: trước mặt nhưng xa người chơi (ngoài 25)
    8, 2, 12, // 2: sau lưng camera 12 (ngoài khung nhìn), gần người chơi
    0, 2, 40, // 3: sau lưng camera 40 (ngoài khung nhìn và xa)
    40, 2, -10, // 4: trước mặt, lệch sang bên 40: ngoài vùng 25 quanh người chơi
  ]);
  const radii = new Float32Array([2, 2, 2, 2, 2]);
  const base = { focusX: 0, focusZ: 0, range: 25, planes, throwDistance: 8, centers, radii, count: 5 };

  it('chỉ vật trong 25 quanh người chơi mới đổ bóng', () => {
    const out = new Int32Array(5);
    const n = selectShadowCasters({ ...base, throwDistance: 1000 }, out);
    expect([...out.slice(0, n)]).toEqual([0, 2]);
  });

  it('vật ngoài khung nhìn nhưng sát (bóng rơi vào khung nhìn) vẫn đổ bóng; xa hơn khoảng bóng đổ thì không', () => {
    const out = new Int32Array(5);
    // vật 2 ở sau camera 12: có tia bóng 8 thì chưa tới khung nhìn (vẫn cách 12 − 2 = 10 > 8) nên bị bỏ
    const n8 = selectShadowCasters({ ...base, throwDistance: 8 }, out);
    expect([...out.slice(0, n8)]).toEqual([0]);
    const n14 = selectShadowCasters({ ...base, throwDistance: 14 }, out);
    expect([...out.slice(0, n14)]).toEqual([0, 2]);
  });

  it('người chơi đi tới đâu vùng bóng theo tới đó', () => {
    const out = new Int32Array(5);
    const n = selectShadowCasters({ ...base, focusX: 40, focusZ: -10, throwDistance: 1000 }, out);
    expect([...out.slice(0, n)]).toContain(4);
    expect([...out.slice(0, n)]).not.toContain(0);
  });
});

describe('3 bậc: chính, vừa, xa', () => {
  const planes = new Float32Array(24);
  // khung nhìn rộng: mọi vật đứng yên trước camera đều thấy
  for (let i = 0; i < 6; i++) planes.set([0, 0, 0, 1e9], i * 4);
  const centers = new Float32Array([0, 0, 3, 0, 0, 12, 0, 0, 25, 0, 0, 34, 0, 0, 45]);
  const radii = new Float32Array([0, 0, 0, 0, 0]);
  const base = { camX: 0, camY: 0, camZ: 0, planes, centers, radii, count: 5, maxDistance: Infinity };
  const result: Selection = { near: 0, mid: 0, far: 0 };
  const near = new Int32Array(5);
  const mid = new Int32Array(5);
  const far = new Int32Array(5);

  it('gần hơn nearDistance dùng bản chính, tới midDistance dùng bản vừa, xa hơn dùng bản xa', () => {
    selectInstances({ ...base, nearDistance: 6, midDistance: 30 }, near, far, result, mid);
    expect([result.near, result.mid, result.far]).toEqual([1, 2, 2]);
    expect([...near.slice(0, 1)]).toEqual([0]);
    expect([...mid.slice(0, 2)]).toEqual([1, 2]);
    expect([...far.slice(0, 2)]).toEqual([3, 4]);
  });

  it('không truyền outMid thì không có bậc vừa (y hệt 2 bậc)', () => {
    selectInstances({ ...base, nearDistance: 6, midDistance: 30 }, near, far, result);
    expect([result.near, result.mid, result.far]).toEqual([1, 0, 4]);
  });

  it('bản xa chỉ xuất hiện ở xa: Vừa từ 30, Cao từ 40, Thấp không có bậc vừa (bản xa từ khoảng đổi bản chính)', () => {
    expect(marketFarDistance('medium', 'env/cong-lang-giay')).toBe(30);
    expect(marketFarDistance('high', 'env/cong-lang-giay')).toBe(40);
    expect(marketFarDistance('low', 'env/cong-lang-giay')).toBe(marketNearDistance('low', 'env/cong-lang-giay'));
    for (const level of ['medium', 'high'] as const) expect(marketFarDistance(level)).toBeGreaterThan(marketNearDistance(level, 'env/cong-lang-giay'));
  });
});

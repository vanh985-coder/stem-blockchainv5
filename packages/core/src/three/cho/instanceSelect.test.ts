import { Matrix4, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { extractFrustumPlanes, marketMaxDistance, marketNearDistance, sameSelection, selectInstances, sphereInFrustum, type Selection } from './instanceSelect';

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
  const result: Selection = { near: 0, far: 0 };
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
  it('khoảng bản chính: Thấp 5, Vừa 20, Cao 30; chỉ mức Thấp cắt vật quá xa', () => {
    expect(marketNearDistance('low')).toBe(5);
    expect(marketNearDistance('medium')).toBe(20);
    expect(marketNearDistance('high')).toBe(30);
    expect(marketMaxDistance('low')).toBe(52);
    expect(marketMaxDistance('medium')).toBe(Infinity);
  });
});

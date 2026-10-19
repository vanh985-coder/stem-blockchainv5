import { BoxGeometry, Euler, Group, Matrix4, Mesh, MeshStandardMaterial, SphereGeometry, Vector3, type Object3D } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import type { ModelData } from '../modelLoader';
import { BAKE_CHUNK, applyMatrixChunked, buildParts, buildPartsSteps, createPartsPrewarm, getParts, partsCacheStats, releaseParts, retainParts } from './ModelInstances';

/** Cảnh thử: `n` mesh hộp, mỗi mesh một vật liệu (hoặc dùng chung một vật liệu). */
function scene(n: number, shared = false): Object3D {
  const root = new Group();
  const common = new MeshStandardMaterial();
  for (let i = 0; i < n; i++) {
    const m = new Mesh(new BoxGeometry(1, 1, 1), shared ? common : new MeshStandardMaterial());
    m.position.set(i * 2, 0.5, 0);
    root.add(m);
  }
  return root;
}
const data = (id: string, s: Object3D): ModelData => ({ id, scene: s, animations: [], placeholder: false });

afterEach(() => {
  expect(partsCacheStats()).toEqual({ entries: 0, refs: 0 }); // mọi bài thử phải trả hết
});

describe('nướng hình học (buildParts)', () => {
  it('đổi hệ tọa độ một lượt: ma trận node, phóng rồi dịch đứng', () => {
    const s = scene(1);
    s.updateMatrixWorld(true);
    const [part] = buildParts(s, 2, 0.25);
    part.geometry.computeBoundingBox();
    const box = part.geometry.boundingBox!;
    // hộp cạnh 1 tâm (0, 0.5, 0) → phóng 2: tâm (0, 1, 0) cạnh 2 → dịch đứng 0,25
    expect(box.min.x).toBeCloseTo(-1, 6);
    expect(box.max.x).toBeCloseTo(1, 6);
    expect(box.min.y).toBeCloseTo(0.25, 6);
    expect(box.max.y).toBeCloseTo(2.25, 6);
    // pháp tuyến vẫn là vectơ đơn vị
    const n = part.geometry.getAttribute('normal');
    expect(Math.hypot(n.getX(0), n.getY(0), n.getZ(0))).toBeCloseTo(1, 6);
  });
  it('mesh cùng vật liệu gộp thành một phần, khác vật liệu thì tách', () => {
    expect(buildParts(scene(4, true), 1, 0)).toHaveLength(1);
    expect(buildParts(scene(4, false), 1, 0)).toHaveLength(4);
  });
});

describe('bộ đệm hình học dùng chung (đếm nơi dùng)', () => {
  it('lấy hai lần là cùng một mảng; hết nơi dùng thì giải phóng hình học và xóa mục', () => {
    const s = scene(1);
    const a = getParts(s, 1, 0);
    expect(getParts(s, 1, 0)).toBe(a);
    expect(partsCacheStats()).toEqual({ entries: 1, refs: 0 });
    retainParts(s, 1, 0, a);
    retainParts(s, 1, 0, a);
    expect(partsCacheStats()).toEqual({ entries: 1, refs: 2 });
    let disposed = 0;
    a[0].geometry.addEventListener('dispose', () => disposed++);
    releaseParts(s, 1, 0);
    expect(disposed).toBe(0); // còn một nơi dùng
    releaseParts(s, 1, 0);
    expect(disposed).toBe(1);
    expect(partsCacheStats().entries).toBe(0);
  });
  it('hệ số phóng hay độ dịch khác nhau là hai mục riêng', () => {
    const s = scene(1);
    const a = getParts(s, 1, 0);
    const b = getParts(s, 2, 0);
    expect(b).not.toBe(a);
    retainParts(s, 1, 0, a);
    retainParts(s, 2, 0, b);
    expect(partsCacheStats()).toEqual({ entries: 2, refs: 2 });
    releaseParts(s, 1, 0);
    releaseParts(s, 2, 0);
  });
  it('trả một mục không còn thì không lỗi', () => {
    expect(() => releaseParts(scene(1), 1, 0)).not.toThrow();
  });
});

describe('nướng sẵn (createPartsPrewarm)', () => {
  it('nướng dần: ngân sách 0 thì mỗi lần một mesh; xong thì giữ phần, trả thì dọn đúng', () => {
    const far = scene(3);
    const near = scene(2);
    const w = createPartsPrewarm('test/mo-hinh', data('test/mo-hinh', near), null, data('test/mo-hinh-xa', far));
    let calls = 0;
    while (!w.step(0)) calls++;
    expect(calls).toBeGreaterThanOrEqual(3); // bản xa 3 mesh, bản chính 2 mesh: nhiều lần gọi, mỗi lần một mesh
    expect(partsCacheStats().entries).toBe(2);
    expect(partsCacheStats().refs).toBe(2);
    w.release();
  });
  it('nướng xong thì mỗi bản có đúng một tham chiếu của bản nướng sẵn', () => {
    const far = scene(2);
    const near = scene(2);
    const w = createPartsPrewarm('test/mo-hinh', data('test/mo-hinh', near), null, data('test/mo-hinh-xa', far));
    expect(w.step(1000)).toBe(true);
    // một nơi dùng khác (như ModelInstances) cùng khóa: cùng hệ số phóng và độ dịch với bản nướng sẵn
    expect(partsCacheStats()).toEqual({ entries: 2, refs: 2 });
    w.release();
    expect(partsCacheStats()).toEqual({ entries: 0, refs: 0 });
  });
  it('trả giữa chừng (người chơi đi xa trước khi nướng xong) thì không để lại gì', () => {
    const w = createPartsPrewarm('test/mo-hinh', data('test/mo-hinh', scene(3)), null, data('test/mo-hinh-xa', scene(3)));
    w.step(0);
    w.release();
    expect(w.step(1000)).toBe(true); // đã trả: không nướng nữa
    expect(partsCacheStats()).toEqual({ entries: 0, refs: 0 });
  });
  it('mọi bản (chính, vừa, xa) đều được nướng và trả', () => {
    const w = createPartsPrewarm('test/mo-hinh', data('test/mo-hinh', scene(1)), data('test/mo-hinh-vua', scene(1)), data('test/mo-hinh-xa', scene(1)));
    expect(w.step(1000)).toBe(true);
    expect(partsCacheStats()).toEqual({ entries: 3, refs: 3 });
    w.release();
  });
});

describe('nướng từng đoạn (mesh lớn không chiếm cả khung hình)', () => {
  it('applyMatrixChunked cho đúng kết quả của applyMatrix4 (vị trí và pháp tuyến), qua nhiều đoạn', () => {
    const geo = new SphereGeometry(1, 160, 100); // hơn 16.000 đỉnh: vượt ít nhất một ranh giới đoạn
    expect(geo.getAttribute('position').count).toBeGreaterThan(BAKE_CHUNK);
    const mat = new Matrix4().makeRotationFromEuler(new Euler(0.3, 1.1, -0.4)).scale(new Vector3(2, 2, 2)).setPosition(3, -2, 5);
    const expected = geo.clone().applyMatrix4(mat);
    const got = geo.clone();
    let yields = 0;
    const it = applyMatrixChunked(got, mat);
    for (let r = it.next(); !r.done; r = it.next()) yields++;
    expect(yields).toBeGreaterThanOrEqual(1);
    for (const name of ['position', 'normal']) {
      const a = expected.getAttribute(name);
      const b = got.getAttribute(name);
      for (let i = 0; i < a.count; i += 97) {
        expect(b.getX(i)).toBeCloseTo(a.getX(i), 5);
        expect(b.getY(i)).toBeCloseTo(a.getY(i), 5);
        expect(b.getZ(i)).toBeCloseTo(a.getZ(i), 5);
      }
      const last = a.count - 1;
      expect(b.getX(last)).toBeCloseTo(a.getX(last), 5);
    }
  });
  it('buildPartsSteps nhường nhiều lần với mesh lớn và cho cùng kết quả với buildParts', () => {
    const root = new Group();
    root.add(new Mesh(new SphereGeometry(1, 160, 100), new MeshStandardMaterial()));
    root.updateMatrixWorld(true);
    let steps = 0;
    const gen = buildPartsSteps(root, 1.5, 0.2);
    let r = gen.next();
    for (; !r.done; r = gen.next()) steps++;
    expect(steps).toBeGreaterThanOrEqual(3);
    const whole = buildParts(root, 1.5, 0.2);
    const a = r.value[0].geometry.getAttribute('position');
    const b = whole[0].geometry.getAttribute('position');
    expect(a.count).toBe(b.count);
    expect(a.getY(a.count - 1)).toBeCloseTo(b.getY(b.count - 1), 6);
  });
});

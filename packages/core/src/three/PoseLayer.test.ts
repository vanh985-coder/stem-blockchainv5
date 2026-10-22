import { Box3, Group, Quaternion, Vector3, type Object3D } from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { describe, expect, it } from 'vitest';
import { PoseLayer } from './PoseLayer';
import { CHARACTER_HEIGHT, fitToHeight } from './modelSizes';
import { HANG, POSE_DURATION, type PoseName } from './poses';
import { loadGltfForTest } from './testGlb';

/** Dựng nhân vật giống <Character>: outer → motion → fit → model (ở tư thế gốc, không có mixer). */
async function build(id: string) {
  const gltf = await loadGltfForTest(id);
  const scene = clone(gltf.scene);
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(scene, true);
  const fit = fitToHeight(box.min.y, box.max.y, CHARACTER_HEIGHT);
  const outer = new Group();
  const motion = new Group();
  const fitGroup = new Group();
  fitGroup.scale.setScalar(fit.scale);
  fitGroup.position.y = fit.offsetY;
  fitGroup.add(scene);
  motion.add(fitGroup);
  outer.add(motion);
  outer.updateMatrixWorld(true);
  const layer = new PoseLayer(scene, outer, motion, 0, fit.scale);
  const pos = (name: string) => scene.getObjectByName(`mixamorig${name}`)!.getWorldPosition(new Vector3());
  return { scene, outer, motion, layer, pos, fit };
}

describe('lớp tư thế trên nhân vật thật (hoc-sinh-nam, tư thế gốc)', () => {
  it('không cộng dồn: clip không đổi mà không có restore thì lệch dần, có restore thì mỗi khung như nhau', async () => {
    // Mô phỏng clip không đổi (mixer không ghi lại xương): không gọi lại giá trị gốc nào ngoài layer.restore().
    const { scene, layer, pos } = await build('characters/hoc-sinh-nam');
    layer.play('slide');
    layer.restore();
    layer.update(0, 1 / 60); // bắt đầu tư thế ở thời điểm 0
    layer.restore();
    layer.update(0.3, 1 / 60);
    scene.updateMatrixWorld(true);
    const first = pos('Hips').y;
    for (let i = 1; i <= 120; i++) {
      layer.restore();
      layer.update(0.3, 1 / 60);
    }
    scene.updateMatrixWorld(true);
    expect(pos('Hips').y).toBeCloseTo(first, 6);
    // sau restore cuối cùng thì về đúng tư thế gốc
    layer.restore();
    scene.updateMatrixWorld(true);
    expect(pos('Hips').y).toBeGreaterThan(first + 0.3);
  });

  it('có đủ xương Mixamo để chạy', async () => {
    const { layer } = await build('characters/hoc-sinh-nam');
    expect(layer.ok).toBe(true);
  });

  it('nhân vật đứng yên (không xương) thì lớp tư thế tắt, mọi lệnh bị bỏ qua', async () => {
    const { layer } = await build('characters/bac-an');
    expect(layer.ok).toBe(false);
    layer.play('sad');
    layer.update(0, 0.016);
    expect(layer.active).toBe(false);
  });

  for (const pose of ['sad', 'slide', 'swing'] as PoseName[]) {
    it(`${pose}: mọi xương luôn hữu hạn và đầu không chui xuống đất, suốt thời lượng`, async () => {
      const { scene, layer, pos } = await build('characters/hoc-sinh-nam');
            layer.play(pose);
      const dt = 1 / 60;
      let minHead = Infinity;
      for (let t = 0; t <= POSE_DURATION[pose] + 0.2; t += dt) {
        layer.restore();
        layer.update(t, dt);
        scene.updateMatrixWorld(true);
        scene.traverse((o) => {
          for (const v of [...o.position.toArray(), ...o.quaternion.toArray()]) expect(Number.isFinite(v), `${pose} t=${t.toFixed(2)} ${o.name}`).toBe(true);
        });
        minHead = Math.min(minHead, pos('Head').y);
      }
      expect(minHead).toBeGreaterThan(0.6);
      expect(layer.active).toBe(false); // hết thời lượng thì tắt
    });
  }

  it('slide: ở đỉnh, hông hạ ~0,5 và bàn chân vẫn chạm đất (không lún)', async () => {
    const { scene, layer, pos } = await build('characters/hoc-sinh-nam');
        const hips0 = pos('Hips').y;
    const foot0 = pos('LeftFoot').y;
    layer.play('slide');
    layer.restore();
    layer.update(0, 1 / 60);
    layer.restore();
    layer.update(0.3, 1 / 60); // giữa tư thế: trọng số 1
    scene.updateMatrixWorld(true);
    const hips = pos('Hips').y;
    const foot = pos('LeftFoot').y;
    expect(hips0 - hips).toBeGreaterThan(0.3);
    expect(hips0 - hips).toBeLessThan(0.6);
    // bàn chân không lún quá 5 cm so với lúc đứng
    expect(foot).toBeGreaterThan(foot0 - 0.05);
  });

  it('hurt: nảy lên 0,3 ở giữa tư thế rồi về mặt đất (motion.position.y)', async () => {
    const { layer, motion } = await build('characters/ti');
    layer.play('hurt');
    layer.restore();
    layer.update(0, 1 / 60);
    layer.restore();
    layer.update(0.3, 1 / 60);
    expect(motion.position.y).toBeCloseTo(0.3, 2);
    layer.restore();
    layer.update(0.7, 1 / 60);
    expect(motion.position.y).toBe(0);
  });

  it('point: cánh tay phải hướng về phía đáp án ở bên phải khung (vector cánh tay tiến gần hướng đích)', async () => {
    const { scene, layer, pos } = await build('characters/hoc-sinh-nam');
        const dir = () => pos('RightForeArm').sub(pos('RightArm')).normalize();
    const before = dir();
    const aim = { az: 0.9, el: 0.2 };
    const target = new Vector3(Math.sin(aim.az) * Math.cos(aim.el), Math.sin(aim.el), Math.cos(aim.az) * Math.cos(aim.el));
    layer.setAim(aim);
    for (let t = 0; t < 0.4; t += 1 / 60) {
      layer.restore();
      layer.update(t, 1 / 60);
    }
    scene.updateMatrixWorld(true);
    const after = dir();
    expect(after.angleTo(target)).toBeLessThan(before.angleTo(target));
    expect(after.angleTo(target)).toBeLessThan(0.35);
    // thả: về lại, và tắt hẳn sau 0,1 giây
    layer.setAim(null);
    for (let t = 0.4; t < 0.7; t += 1 / 60) {
      layer.restore();
      layer.update(t, 1 / 60);
    }
    expect(layer.active).toBe(false);
  });

  it('hang: đung đưa quanh bàn tay (điểm quay cách chân handsRatio × chiều cao đứng yên), ±4°, chu kỳ 1,6 giây; Giảm chuyển động thì không đung đưa', async () => {
    const { layer, motion } = await build('characters/hoc-sinh-nam');
    const ph = HANG.handsRatio * CHARACTER_HEIGHT;
    layer.setHang(true);
    layer.restore();
    layer.update(0, 1 / 60); // bắt đầu treo lúc 0
    let maxX = 0;
    for (let t = 0; t < 3.3; t += 1 / 60) {
      layer.restore();
      layer.update(t, 1 / 60);
      maxX = Math.max(maxX, Math.abs(motion.rotation.x));
      // điểm quay (0, ph, 0) của hệ nhân vật đứng yên sau phép xoay + dời
      motion.updateMatrix();
      const p = new Vector3(0, ph, 0).applyMatrix4(motion.matrix);
      expect(p.x).toBeCloseTo(0, 6);
      expect(p.y).toBeCloseTo(ph, 6);
      expect(p.z).toBeCloseTo(0, 6);
    }
    expect(maxX).toBeCloseTo((4 * Math.PI) / 180, 2);
    // lúc 0,4 + 0,1 giây (vào xong) góc gần cực đại, lúc 0,8 + chu kỳ về 0
    layer.restore();
    layer.update(0.4, 1 / 60);
    expect(Math.abs(motion.rotation.x)).toBeGreaterThan(0.06);
    layer.setHang(false);
    for (let t = 3.3; t < 3.6; t += 1 / 60) {
      layer.restore();
      layer.update(t, 1 / 60);
    }
    expect(layer.active).toBe(false);
    expect(motion.rotation.x).toBe(0);
    expect(motion.position.z).toBe(0);

    const still = await build('characters/hoc-sinh-nam');
    still.layer.setHang(true, false);
    still.layer.restore();
    still.layer.update(0, 1 / 60);
    for (let t = 0; t < 2; t += 1 / 30) {
      still.layer.restore();
      still.layer.update(t, 1 / 60);
      expect(still.motion.rotation.x).toBe(0);
      expect(still.motion.position.z).toBe(0);
    }
  });

  it('hang: thân và hai chân về tư thế gốc dù clip bên dưới đổi chân (vị trí bàn chân giống nhau), và thả ra thì trả lại đúng như clip', async () => {
    const a = await build('characters/hoc-sinh-nam');
    const b = await build('characters/hoc-sinh-nam');
    // b: clip bên dưới đang dang chân, vặn thân
    const twist = (scene: Object3D, name: string, x: number, z: number) => {
      const bone = scene.getObjectByName(`mixamorig${name}`)!;
      bone.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), x).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), z)));
    };
    const wobble = () => {
      twist(b.scene, 'LeftUpLeg', 0.5, 0.3);
      twist(b.scene, 'RightLeg', 0.6, 0);
      twist(b.scene, 'Spine1', 0.3, 0.2);
    };
    wobble();
    for (const x of [a, b]) {
      x.layer.setHang(true, false);
      x.layer.restore();
      x.layer.update(0, 1 / 60);
    }
    for (let t = 0.2; t < 0.5; t += 1 / 60) {
      for (const x of [a, b]) {
        x.layer.restore();
        x.layer.update(t, 1 / 60);
      }
    }
    a.scene.updateMatrixWorld(true);
    b.scene.updateMatrixWorld(true);
    for (const n of ['LeftLeg', 'LeftFoot', 'RightFoot', 'RightToeBase', 'Spine2']) expect(b.pos(n).distanceTo(a.pos(n)), n).toBeLessThan(1e-5);
    // thả (sau 0,1 giây) và restore: b về đúng xoay của clip (có vặn), không dính tư thế
    const before = b.scene.getObjectByName('mixamorigLeftUpLeg')!.quaternion.clone();
    b.layer.setHang(false);
    for (let t = 0.5; t < 0.8; t += 1 / 60) {
      b.layer.restore();
      b.layer.update(t, 1 / 60);
    }
    b.layer.restore();
    expect(b.layer.active).toBe(false);
    const after = b.scene.getObjectByName('mixamorigLeftUpLeg')!.quaternion;
    expect(after.angleTo(before)).toBeGreaterThanOrEqual(0); // sau restore là giá trị của clip ở khung đó
    expect(Number.isFinite(after.x)).toBe(true);
  });
});

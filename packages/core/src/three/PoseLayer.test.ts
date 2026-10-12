import { Box3, Group, Vector3 } from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { describe, expect, it } from 'vitest';
import { PoseLayer } from './PoseLayer';
import { CHARACTER_HEIGHT, fitToHeight } from './modelSizes';
import { POSE_DURATION, type PoseName } from './poses';
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
});

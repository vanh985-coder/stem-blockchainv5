import { AnimationClip, AnimationMixer, Object3D, VectorKeyframeTrack } from 'three';
import { describe, expect, it } from 'vitest';
import { primeActions } from './Character';

function setup() {
  const root = new Object3D();
  const clip = (name: string) => new AnimationClip(name, 1, [new VectorKeyframeTrack('.position', [0, 1], [0, 0, 0, 1, 2, 3])]);
  const mixer = new AnimationMixer(root);
  const actions = { idle: mixer.clipAction(clip('idle')), walk: mixer.clipAction(clip('walk')) };
  return { root, mixer, actions };
}

describe('primeActions (nạp trước hành động lúc màn hình tải)', () => {
  it('không đổi tư thế nhân vật và để mọi hành động ở trạng thái dừng', () => {
    const { root, actions, mixer } = setup();
    primeActions(mixer, actions);
    expect(root.position.toArray()).toEqual([0, 0, 0]);
    for (const a of Object.values(actions)) {
      expect(a.isRunning()).toBe(false);
      expect(a.time).toBe(0);
    }
  });

  it('sau khi nạp trước vẫn phát bình thường (đặt trọng số rồi cập nhật thì tư thế đổi)', () => {
    const { root, actions, mixer } = setup();
    primeActions(mixer, actions);
    actions.walk.reset().setEffectiveWeight(1).play();
    mixer.update(0.5);
    expect(root.position.x).toBeCloseTo(0.5);
    expect(root.position.z).toBeCloseTo(1.5);
  });

  it('chịu được bảng hành động rỗng', () => {
    const { mixer } = setup();
    expect(() => primeActions(mixer, {})).not.toThrow();
  });
});

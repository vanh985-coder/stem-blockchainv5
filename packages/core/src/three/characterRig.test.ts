import { AnimationClip, AnimationMixer, Bone, Group, LoopOnce, QuaternionKeyframeTrack, VectorKeyframeTrack } from 'three';
import { describe, expect, it } from 'vitest';
import { CharacterRig, primeActions, type PoseLayerLike } from './characterRig';
import type { PlayableClip } from './clipPlayback';
import { CLIP_NAMES, type ClipName } from './clips';

/** Một "model" nhỏ có xương Hips và đủ clip như nhân vật thật. */
function makeModel(seconds = 1): { scene: Group; hips: Bone; playable: Partial<Record<ClipName, PlayableClip>> } {
  const scene = new Group();
  const hips = new Bone();
  hips.name = 'Hips';
  scene.add(hips);
  const playable: Partial<Record<ClipName, PlayableClip>> = {};
  for (const name of CLIP_NAMES) {
    const clip = new AnimationClip(name, seconds, [
      new VectorKeyframeTrack('Hips.position', [0, seconds], [0, 0, 0, 1, 2, 3]),
      new QuaternionKeyframeTrack('Hips.quaternion', [0, seconds], [0, 0, 0, 1, 0, 0, 0, 1]),
    ]);
    playable[name] = { clip, loop: name === 'idle' || name === 'walk' || name === 'run' };
  }
  return { scene, hips, playable };
}

class FakeLayer implements PoseLayerLike {
  calls = 0;
  restore() {
    this.calls++;
  }
  update() {
    this.calls++;
  }
  play() {}
  setAim() {}
}

describe('nguyên nhân lỗi _cacheIndex (đối chứng với three thật)', () => {
  it('gọi play() trên hành động của mixer đã uncacheRoot thì three ném "Cannot set properties of undefined (setting \'_cacheIndex\')"', () => {
    const { scene, playable } = makeModel();
    const mixer = new AnimationMixer(scene);
    const stale = mixer.clipAction(playable.walk!.clip);
    stale.play();
    mixer.update(0.1);
    mixer.stopAllAction();
    mixer.uncacheRoot(scene); // đúng như cleanup của effect dựng rig khi model đổi
    expect(() => {
      stale.reset().play(); // hàm play cũ (giữ rig cũ) vẫn được gọi trong cùng lần commit
      mixer.update(0.1);
    }).toThrow(/_cacheIndex/);
  });

  it('lỗi này xảy ra kể cả khi không có primeActions (primeActions không phải nguyên nhân)', () => {
    const { scene, playable } = makeModel();
    const mixer = new AnimationMixer(scene);
    const stale = mixer.clipAction(playable.walk!.clip);
    mixer.stopAllAction();
    mixer.uncacheRoot(scene);
    expect(() => stale.play()).toThrow(/_cacheIndex/);
  });
});

describe('CharacterRig: không bao giờ dùng hành động của mixer đã dọn', () => {
  it('dựng, phát, dựng lại (đổi model), rồi lệnh phát đến muộn: không ném lỗi và chạy trên mixer mới', () => {
    const rig = new CharacterRig<FakeLayer>();
    const a = makeModel();
    rig.build(a.scene, a.playable, () => new FakeLayer());
    expect(rig.play('walk', a.playable.walk, 1, 0.2)).toBe(true);
    // React: cleanup của effect dựng rig, rồi effect dựng rig mới, rồi hàm play cũ chạy trong cùng lần commit
    const stalePlay = () => rig.play('walk', a.playable.walk, 1, 0.2);
    const b = makeModel();
    rig.build(b.scene, b.playable, () => new FakeLayer());
    expect(stalePlay).not.toThrow();
    rig.update(0, 0.5);
    expect(b.hips.position.x).toBeGreaterThan(0.3); // clip chạy trên model mới
    expect(a.hips.position.x).toBe(0); // model cũ không bị đụng tới
  });

  it('dựng lại 60 lần liên tiếp (đổi model, đổi bộ clip, như StrictMode và đổi mức chất lượng) rồi phát ngẫu nhiên: không ném lỗi', () => {
    const rig = new CharacterRig<FakeLayer>();
    let seed = 12345;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    let model = makeModel();
    for (let i = 0; i < 60; i++) {
      if (rnd() < 0.6) model = makeModel(0.5 + rnd()); // đổi model (scene và clip mới); không thì dựng lại với cùng model (gắn lại)
      rig.build(model.scene, model.playable, () => new FakeLayer());
      for (let k = 0; k < 4; k++) {
        const name = CLIP_NAMES[Math.floor(rnd() * CLIP_NAMES.length)];
        expect(() => rig.play(name, model.playable[name], 1, 0.15)).not.toThrow();
        expect(() => rig.update(i * 0.1, 1 / 60)).not.toThrow();
      }
      if (rnd() < 0.3) rig.dispose();
    }
    rig.build(model.scene, model.playable, () => new FakeLayer());
    expect(rig.alive).toBe(true);
  });

  it('gắn lại cùng một scene (StrictMode: dựng, dọn, dựng) rồi phát: chạy bình thường', () => {
    const rig = new CharacterRig<FakeLayer>();
    const m = makeModel();
    rig.build(m.scene, m.playable, () => new FakeLayer());
    rig.dispose();
    rig.build(m.scene, m.playable, () => new FakeLayer());
    rig.play('run', m.playable.run, 1, 0.2);
    rig.update(0, 0.4);
    expect(m.hips.position.x).toBeGreaterThan(0.2);
  });

  it('unmount (dispose) giữa lúc chuẩn bị: lệnh phát, cập nhật, đổi tốc độ đều là không làm gì; dispose hai lần cũng an toàn', () => {
    const rig = new CharacterRig<FakeLayer>();
    const m = makeModel();
    // lớp tư thế dựng hỏng (ném lỗi) ngay sau khi chuẩn bị hành động: rig phải ở trạng thái đã dọn, không để lại hành động nửa vời
    expect(() =>
      rig.build(m.scene, m.playable, () => {
        throw new Error('hỏng');
      }),
    ).toThrow('hỏng');
    expect(rig.alive).toBe(false);
    expect(rig.play('walk', m.playable.walk, 1, 0.2)).toBe(false);
    expect(() => rig.update(0, 0.016)).not.toThrow();
    expect(() => rig.setTimeScale(2)).not.toThrow();
    rig.build(m.scene, m.playable, () => new FakeLayer());
    rig.play('walk', m.playable.walk, 1, 0.2);
    rig.dispose();
    rig.dispose();
    expect(rig.alive).toBe(false);
    expect(rig.playing).toBeNull();
    expect(rig.play('walk', m.playable.walk, 1, 0.2)).toBe(false);
    expect(() => rig.update(0, 0.016)).not.toThrow();
    // dựng lại sau khi đã dọn vẫn dùng được
    rig.build(m.scene, m.playable, () => new FakeLayer());
    expect(rig.play('jump', m.playable.jump, 1, 0.2)).toBe(true);
    expect(() => rig.update(0, 0.1)).not.toThrow();
  });

  it('thiếu clip hay thiếu bản chuẩn bị thì play trả về false và không làm gì', () => {
    const rig = new CharacterRig<FakeLayer>();
    const m = makeModel();
    const half = { idle: m.playable.idle };
    rig.build(m.scene, half, () => new FakeLayer());
    expect(rig.play('walk', m.playable.walk, 1, 0.2)).toBe(false);
    expect(rig.play('idle', undefined, 1, 0.2)).toBe(false);
    expect(rig.play('idle', half.idle, 1, 0.2)).toBe(true);
    expect(rig.playing).toBe('idle');
  });

  it('clip một lần chạy xong thì báo onClipEnd đúng một lần; sau khi dựng lại, mixer cũ không còn báo', () => {
    const rig = new CharacterRig<FakeLayer>();
    const ended: ClipName[] = [];
    rig.onClipEnd = (n) => ended.push(n);
    const a = makeModel(0.3);
    rig.build(a.scene, a.playable, () => new FakeLayer());
    const once = { clip: a.playable.jump!.clip, loop: false };
    rig.play('jump', once, 1, 0.1);
    expect(once.loop).toBe(false);
    for (let i = 0; i < 40; i++) rig.update(i / 60, 1 / 60);
    expect(ended).toEqual(['jump']);
    const b = makeModel(0.3);
    rig.build(b.scene, b.playable, () => new FakeLayer());
    rig.play('jump', { clip: b.playable.jump!.clip, loop: false }, 1, 0.1);
    for (let i = 0; i < 40; i++) rig.update(i / 60, 1 / 60);
    expect(ended).toEqual(['jump', 'jump']);
  });

  it('chuyển clip mượt: phát walk rồi run thì clip đang phát là run', () => {
    const rig = new CharacterRig<FakeLayer>();
    const m = makeModel();
    rig.build(m.scene, m.playable, () => new FakeLayer());
    rig.play('walk', m.playable.walk, 1, 0.2);
    rig.update(0, 0.1);
    rig.play('run', m.playable.run, 1, 0.2);
    expect(rig.playing).toBe('run');
    expect(() => rig.update(0.1, 0.1)).not.toThrow();
  });

  it('mỗi khung hình: lớp tư thế restore, mixer, rồi update (đúng thứ tự)', () => {
    const order: string[] = [];
    const layer: PoseLayerLike = { restore: () => order.push('restore'), update: () => order.push('update'), play() {}, setAim() {} };
    const rig = new CharacterRig();
    const m = makeModel();
    rig.build(m.scene, m.playable, () => layer);
    rig.update(0, 0.016);
    expect(order).toEqual(['restore', 'update']);
  });
});

describe('primeActions (nạp trước hoạt ảnh lúc màn hình tải)', () => {
  it('không đổi tư thế nhân vật, để mọi hành động ở trạng thái dừng và phát bình thường sau đó', () => {
    const { scene, hips, playable } = makeModel();
    const mixer = new AnimationMixer(scene);
    const actions = { idle: mixer.clipAction(playable.idle!.clip), walk: mixer.clipAction(playable.walk!.clip) };
    primeActions(mixer, actions);
    expect(hips.position.toArray()).toEqual([0, 0, 0]);
    for (const a of Object.values(actions)) expect(a.isRunning()).toBe(false);
    actions.walk.setLoop(LoopOnce, 1).reset().setEffectiveWeight(1).play();
    mixer.update(0.5);
    expect(hips.position.x).toBeCloseTo(0.5, 5);
  });
});

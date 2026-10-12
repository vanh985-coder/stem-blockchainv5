import { AnimationClip, PropertyBinding, VectorKeyframeTrack } from 'three';
import { describe, expect, it } from 'vitest';
import { CLIP_CONFIG } from './clipConfig';
import { CLIP_NAMES, findClip } from './clips';
import { buildPlayableClip, lockRootMotion, maxHorizontalDrift, rootSpeed } from './clipPlayback';
import { loadGltfForTest } from './testGlb';

describe('khóa chuyển động gốc (dữ liệu giả)', () => {
  const clip = new AnimationClip('run', 1, [new VectorKeyframeTrack('mixamorigHips.position', [0, 0.5, 1], [0.1, 0.4, 0.2, 0.3, 0.5, 1.5, 0.5, 0.45, 3])]);

  it('x và z cố định theo khung đầu, y giữ nguyên', () => {
    const locked = lockRootMotion(clip);
    const v = locked.tracks[0].values;
    expect(Array.from(v)).toEqual([0.1, 0.4, 0.2, 0.1, 0.5, 0.2, 0.1, 0.45, 0.2].map((x) => Math.fround(x)));
    expect(maxHorizontalDrift(locked)).toBe(0);
  });
  it('không sửa clip gốc', () => {
    lockRootMotion(clip);
    expect(maxHorizontalDrift(clip)).toBeGreaterThan(2);
  });
  it('nhận cả tên track có dấu ":" và không phân biệt hoa thường', () => {
    const c = new AnimationClip('x', 1, [new VectorKeyframeTrack('mixamorig:Hips.position', [0, 1], [0, 0, 0, 5, 1, 5])]);
    expect(maxHorizontalDrift(lockRootMotion(c))).toBe(0);
  });
  it('clip không có track hông thì giữ nguyên', () => {
    const c = new AnimationClip('x', 1, [new VectorKeyframeTrack('mixamorigSpine.position', [0, 1], [0, 0, 0, 5, 1, 5])]);
    expect(maxHorizontalDrift(lockRootMotion(c))).toBe(0);
    expect(lockRootMotion(c).tracks[0].values[3]).toBe(5);
  });
  it('tốc độ ngầm: khoảng dịch ngang đầu-cuối chia thời lượng', () => {
    expect(rootSpeed(clip)).toBeCloseTo(Math.hypot(0.4, 2.8) / 1, 5);
    expect(rootSpeed(new AnimationClip('x', 1, []))).toBe(0);
  });
});

describe('khóa chuyển động gốc (clip thật)', () => {
  for (const id of ['characters/hoc-sinh-nam', 'characters/ti']) {
    it(`${id}: hông không dịch ngang sau một vòng clip run`, async () => {
      const gltf = await loadGltfForTest(id);
      const run = findClip(gltf.animations, 'run')!;
      // clip gốc có chạy tới trước (hông tiến > 1 đơn vị trong một vòng)
      expect(maxHorizontalDrift(run)).toBeGreaterThan(1);
      const locked = lockRootMotion(run);
      expect(maxHorizontalDrift(locked)).toBe(0);
      // độ cao hông vẫn dao động theo nhịp chạy
      const track = locked.tracks.find((t) => /hips\.position$/i.test(t.name))!;
      const ys: number[] = [];
      for (let i = 1; i < track.values.length; i += 3) ys.push(track.values[i]);
      expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.01);
      // giá trị đầu và cuối vòng chạy cùng x, z
      const n = track.values.length;
      expect(track.values[n - 3]).toBe(track.values[0]);
      expect(track.values[n - 1]).toBe(track.values[2]);
    });
  }

  it('mọi clip của cả 4 nhân vật có xương đều bị khóa ngang', async () => {
    for (const id of ['characters/hoc-sinh-nam', 'characters/ti', 'characters/dan-lang-ba-cu', 'characters/dan-lang-nong-dan']) {
      for (const clip of (await loadGltfForTest(id)).animations) expect(maxHorizontalDrift(lockRootMotion(clip)), `${id} ${clip.name}`).toBe(0);
    }
  });

  it('tốc độ ngầm: đi ~1 đơn vị/giây, chạy nhanh hơn đi', async () => {
    const hs = await loadGltfForTest('characters/hoc-sinh-nam');
    const walk = rootSpeed(findClip(hs.animations, 'walk')!);
    const run = rootSpeed(findClip(hs.animations, 'run')!);
    expect(walk).toBeGreaterThan(0.3);
    expect(run).toBeGreaterThan(walk * 2);
  });
});

describe('clip sẵn sàng phát theo clipConfig', () => {
  it('jump: đoạn 30%–70%, một lần; cheer: 2,5 giây đầu, một lần; idle: cả clip, lặp', async () => {
    const hs = await loadGltfForTest('characters/hoc-sinh-nam');
    const jumpSrc = findClip(hs.animations, 'jump')!;
    const jump = buildPlayableClip(jumpSrc, 'jump', CLIP_CONFIG.jump);
    expect(jump.loop).toBe(false);
    expect(jump.clip.duration).toBeCloseTo(jumpSrc.duration * 0.4, 1);
    const cheerSrc = findClip(hs.animations, 'cheer')!;
    const cheer = buildPlayableClip(cheerSrc, 'cheer', CLIP_CONFIG.cheer);
    expect(cheer.loop).toBe(false);
    expect(cheer.clip.duration).toBeCloseTo(2.5, 1);
    const idleSrc = findClip(hs.animations, 'idle')!;
    const idle = buildPlayableClip(idleSrc, 'idle', CLIP_CONFIG.idle);
    expect(idle.loop).toBe(true);
    expect(idle.clip.duration).toBeCloseTo(idleSrc.duration, 3);
    // đều đã khóa ngang
    for (const p of [jump, cheer, idle]) expect(maxHorizontalDrift(p.clip)).toBe(0);
  });

  it('clip mượn phát được trên model khác: mọi track tìm thấy xương tương ứng trong Tí', async () => {
    const hs = await loadGltfForTest('characters/hoc-sinh-nam');
    const ti = await loadGltfForTest('characters/ti');
    for (const name of CLIP_NAMES) {
      const src = findClip(hs.animations, name)!;
      const { clip } = buildPlayableClip(src, name, { from: 0, loop: true });
      for (const track of clip.tracks) {
        const node = PropertyBinding.parseTrackName(track.name).nodeName;
        expect(ti.scene.getObjectByName(node), `${name}: ${track.name}`).toBeDefined();
      }
    }
  });
});

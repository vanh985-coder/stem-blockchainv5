// Test phần kiểm tra model .glb (spec 03 mục 3.2): xương và hoạt ảnh còn nguyên sau nén.
// Phần "file thật" đọc lại các file đã nén trong assets-build/ (thư mục này được commit), nên cần chạy `pnpm assets:build` trước.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { checkCharacter, createIO, findClip, inspectDoc, largestTexture, MIXAMO_JOINT_COUNT, REQUIRED_CLIPS, textureBytes } from './glb.mjs';
import { classifyModel } from './model-build.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets-build');
const MB = 1048576;

const joints = (n, hips = true) => Array.from({ length: n }, (_, i) => (i === 0 && hips ? 'mixamorig:Hips' : `mixamorig:Bone${i}`));
const clip = (name) => ({ name, duration: 1, channels: 10 });

describe('findClip', () => {
  const clips = [clip('idle.001'), clip('Walk.001'), clip('jump_down.001'), clip('hanging from a horizontal bar with both arms straight up above ')];
  it('tìm theo từ khóa, không phân biệt hoa thường, bỏ hậu tố .001', () => {
    expect(findClip(clips, 'idle')?.name).toBe('idle.001');
    expect(findClip(clips, 'walk')?.name).toBe('Walk.001');
    expect(findClip(clips, 'jump')?.name).toBe('jump_down.001');
    expect(findClip(clips, 'hang')?.name).toContain('hanging');
  });
  it('không có thì trả undefined', () => {
    expect(findClip(clips, 'run')).toBeUndefined();
    expect(findClip(clips, 'cheer')).toBeUndefined();
  });
  it('hậu tố .001 không được tính vào khớp từ khóa', () => {
    expect(findClip([clip('xyz.001')], '001')).toBeUndefined();
  });
});

describe('checkCharacter (dữ liệu giả)', () => {
  const key = 'models/characters/ti';
  const ok = { joints: 65, jointNames: joints(65), clips: [clip('idle.001'), clip('run.001'), clip('jump_down.001'), clip('cheer.001')] };

  it('đủ 65 xương Mixamo và đủ clip: không có vấn đề', () => {
    const r = checkCharacter(ok, key);
    expect(r.problems).toEqual([]);
    expect(r.found).toEqual({ idle: 'idle.001', run: 'run.001', jump: 'jump_down.001', cheer: 'cheer.001' });
  });
  it('thiếu clip: báo đúng từ khóa', () => {
    const r = checkCharacter({ ...ok, clips: ok.clips.filter((c) => !c.name.startsWith('cheer')) }, key);
    expect(r.problems).toEqual(['thiếu clip "cheer"']);
  });
  it('sai số xương hoặc thiếu Hips: báo', () => {
    expect(checkCharacter({ ...ok, joints: 64, jointNames: joints(64) }, key).problems[0]).toContain('có 64 xương');
    expect(checkCharacter({ ...ok, jointNames: joints(65, false) }, key).problems.join()).toContain('Hips');
  });
  it('clip rỗng (không kênh hoặc dài 0) bị báo', () => {
    const r = checkCharacter({ ...ok, clips: [{ name: 'idle.001', duration: 0, channels: 0 }, ...ok.clips.slice(1)] }, key);
    expect(r.problems).toEqual(['clip "idle.001" rỗng']);
  });
  it('xương không phải Mixamo bị báo', () => {
    const names = joints(65);
    names[5] = 'Bone.005';
    expect(checkCharacter({ ...ok, jointNames: names }, key).problems.join()).toContain('không phải tên Mixamo');
  });
});

describe('classifyModel', () => {
  it('nhân vật: texture 1024, ~15.000 tam giác, ≤ 2,5 MB', () => {
    expect(classifyModel('models/characters/ti')).toMatchObject({ kind: 'nhan-vat', maxTexture: 1024, targetTris: 15000, maxBytes: 2.5 * MB });
  });
  it('cây đa và 4 cổng làng: texture 2048', () => {
    for (const k of ['models/env/cay-da', 'models/env/cong-lang-giay', 'models/env/cong-lang-det', 'models/env/cong-lang-khac-dau', 'models/env/cong-lang-bac']) {
      expect(classifyModel(k)).toMatchObject({ kind: 'do-vat', maxTexture: 2048 });
    }
  });
  it('đồ vật còn lại: texture 1024, ~8.000 tam giác, ≤ 1,5 MB', () => {
    expect(classifyModel('models/env/gieng-lang')).toMatchObject({ kind: 'do-vat', maxTexture: 1024, targetTris: 8000, maxBytes: 1.5 * MB });
  });
});

describe('model đã nén trong assets-build/', () => {
  let manifest;
  let io;
  beforeAll(async () => {
    manifest = JSON.parse(await readFile(path.join(OUT, 'manifest.json'), 'utf8'));
    io = await createIO();
  }, 30000);

  const load = async (key) => {
    const entry = manifest[key];
    expect(entry, `manifest thiếu ${key}`).toBeDefined();
    expect(entry.file).toMatch(new RegExp(`^${key}\\.[0-9a-f]{8}\\.glb$`));
    return io.readBinary(new Uint8Array(await readFile(path.join(OUT, entry.file))));
  };

  for (const key of Object.keys(REQUIRED_CLIPS)) {
    it(`${key}: còn đủ ${MIXAMO_JOINT_COUNT} xương Mixamo và đủ clip (${REQUIRED_CLIPS[key].join(', ')})`, async () => {
      const info = inspectDoc(await load(key));
      expect(info.skins).toBeGreaterThan(0);
      const { problems } = checkCharacter(info, key);
      expect(problems).toEqual([]);
    }, 30000);
  }

  it('hoc-sinh-nam còn đủ 6 clip, ti còn 4 clip, hai dân làng còn 2 clip', async () => {
    const n = async (k) => inspectDoc(await load(k)).clips.length;
    expect(await n('models/characters/hoc-sinh-nam')).toBe(6);
    expect(await n('models/characters/ti')).toBe(4);
    expect(await n('models/characters/dan-lang-ba-cu')).toBe(2);
    expect(await n('models/characters/dan-lang-nong-dan')).toBe(2);
  }, 60000);

  it('mọi model trong manifest: nén meshopt, không còn Draco, texture trong giới hạn, đúng mục tiêu dung lượng', async () => {
    const keys = Object.keys(manifest).filter((k) => k.startsWith('models/'));
    expect(keys.length).toBeGreaterThanOrEqual(25);
    for (const key of keys) {
      const rule = classifyModel(key);
      const info = inspectDoc(await load(key));
      expect(info.extensions, key).toContain('EXT_meshopt_compression');
      expect(info.extensions, key).not.toContain('KHR_draco_mesh_compression');
      const big = largestTexture(info);
      if (big) expect(Math.max(big.width, big.height), `${key} texture`).toBeLessThanOrEqual(rule.maxTexture);
      expect(manifest[key].bytes, `${key} dung lượng`).toBeLessThanOrEqual(rule.maxBytes);
      if (rule.kind === 'nhan-vat') expect(textureBytes(info), `${key} tổng texture`).toBeLessThanOrEqual(2 * MB);
      expect(manifest[key].kind).toBe('model');
      expect(manifest[key].tris).toBe(Math.round(info.tris));
    }
  }, 120000);

  it('đồ vật đã giảm mặt: không còn model nào trên 40.000 tam giác (mục tiêu ~8.000, chế độ chặt có thể dừng cao hơn)', () => {
    for (const key of Object.keys(manifest).filter((k) => k.startsWith('models/') && !k.startsWith('models/characters/'))) {
      expect(manifest[key].tris, key).toBeLessThanOrEqual(40000);
    }
  });
});

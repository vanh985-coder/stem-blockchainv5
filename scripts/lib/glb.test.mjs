// Test phần kiểm tra model .glb (spec 03 mục 3.2): xương và hoạt ảnh còn nguyên sau nén.
// Phần "file thật" đọc lại các file đã nén trong assets-build/ (thư mục này được commit), nên cần chạy `pnpm assets:build` trước.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { checkCharacter, createIO, findClip, inspectDoc, largestTexture, MIXAMO_JOINT_COUNT, REQUIRED_CLIPS } from './glb.mjs';
import { classifyModel, LOD_SUFFIX, LOD_TEXTURE, LOD_TRIS, MID_MAX_TRIS, MID_MIN_MAIN_TRIS, MID_SUFFIX, MID_TEXTURE, MID_TRIS } from './model-build.mjs';

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
  it('nhân vật: texture 2048, ≤ 3 MB, không có bản xa', () => {
    expect(classifyModel('models/characters/ti')).toMatchObject({ kind: 'nhan-vat', maxTexture: 2048, targetTris: 15000, maxBytes: 3 * MB, lod: false });
  });
  it('cổng làng, cây đa, nhà: texture 2048, 50.000 tam giác, ≤ 2,5 MB, có bản xa', () => {
    const keys = ['models/env/cay-da', 'models/env/nha-mai-ngoi', 'models/env/nha-mai-tranh', ...['giay', 'det', 'khac-dau', 'bac'].map((v) => `models/env/cong-lang-${v}`)];
    for (const k of keys) {
      expect(classifyModel(k)).toMatchObject({ kind: 'do-vat', maxTexture: 2048, targetTris: 50000, maxBytes: 2.5 * MB, lod: true, lodMaxBytes: 0.4 * MB });
    }
  });
  it('đồ vật còn lại (kể cả model chỉ có màu đỉnh): texture 1024, 30.000 tam giác, ≤ 2,5 MB, có bản xa', () => {
    for (const k of ['models/env/gieng-lang', 'models/env/bui-tre', 'models/env/khung-cui', 'models/games/man-02-duoi-ti/sap-thap']) {
      expect(classifyModel(k)).toMatchObject({ kind: 'do-vat', maxTexture: 1024, targetTris: 30000, maxBytes: 2.5 * MB, lod: true });
    }
  });
  it('bản xa: 8.000 tam giác, texture 512, đuôi -xa', () => {
    expect(LOD_TRIS).toBe(8000);
    expect(LOD_TEXTURE).toBe(512);
    expect(LOD_SUFFIX).toBe('-xa');
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

  const modelKeys = () => Object.keys(manifest).filter((k) => k.startsWith('models/'));
  const mainKeys = () => modelKeys().filter((k) => !k.endsWith(LOD_SUFFIX) && !k.endsWith(MID_SUFFIX));
  const lodKeys = () => modelKeys().filter((k) => k.endsWith(LOD_SUFFIX));
  const midKeys = () => modelKeys().filter((k) => k.endsWith(MID_SUFFIX));

  it('bản chính (25 model): nén meshopt, không còn Draco, không còn vật liệu kính, texture và dung lượng trong giới hạn', async () => {
    expect(mainKeys().length).toBe(25);
    for (const key of mainKeys()) {
      const rule = classifyModel(key);
      const info = inspectDoc(await load(key));
      expect(info.extensions, key).toContain('EXT_meshopt_compression');
      expect(info.extensions, key).not.toContain('KHR_draco_mesh_compression');
      expect(info.extensions, key).not.toContain('KHR_materials_volume');
      expect(info.extensions, key).not.toContain('KHR_materials_transmission');
      const big = largestTexture(info);
      if (big) expect(Math.max(big.width, big.height), `${key} texture`).toBeLessThanOrEqual(rule.maxTexture);
      expect(manifest[key].bytes, `${key} dung lượng`).toBeLessThanOrEqual(rule.maxBytes);
      expect(manifest[key].kind).toBe('model');
      expect(manifest[key].tris).toBe(Math.round(info.tris));
    }
  }, 120000);

  it('nhân vật giữ nguyên số tam giác (không giảm mặt) và texture 2048', async () => {
    for (const key of mainKeys().filter((k) => k.startsWith('models/characters/'))) {
      expect(manifest[key].tris, key).toBeGreaterThan(17000);
      expect(manifest[key].tris, key).toBeLessThan(19000);
      expect(lodKeys(), key).not.toContain(key + LOD_SUFFIX);
    }
  });

  // Chế độ chặt có thể dừng cao hơn mục tiêu; ba model dưới đây đã biết và có cảnh báo khi build.
  const STALLED = { 'models/env/bui-tre': 50000, 'models/env/khung-cui': 150000, 'models/env/leu-cho': 80000 };
  it('đồ vật đã giảm mặt đúng mục tiêu (cho phép lệch 25%), trừ bui-tre, khung-cui và leu-cho', () => {
    for (const key of mainKeys().filter((k) => !k.startsWith('models/characters/'))) {
      const rule = classifyModel(key);
      const limit = STALLED[key] ?? Math.max(rule.targetTris * 1.25, 9200); // cay-da vốn có 9.126 tam giác
      expect(manifest[key].tris, key).toBeLessThanOrEqual(limit);
    }
  });

  it('mỗi model trong env và games có bản xa: ~8.000 tam giác, texture 512, ≤ 0,4 MB', async () => {
    const expected = mainKeys().filter((k) => classifyModel(k).lod);
    expect(expected.length).toBe(15);
    expect(lodKeys().sort()).toEqual(expected.map((k) => k + LOD_SUFFIX).sort());
    for (const key of lodKeys()) {
      const info = inspectDoc(await load(key));
      expect(info.extensions, key).toContain('EXT_meshopt_compression');
      expect(info.tris, key).toBeLessThanOrEqual(LOD_TRIS * 1.25);
      const big = largestTexture(info);
      if (big) expect(Math.max(big.width, big.height), `${key} texture`).toBeLessThanOrEqual(LOD_TEXTURE);
      expect(manifest[key].bytes, `${key} dung lượng`).toBeLessThanOrEqual(classifyModel(key.slice(0, -LOD_SUFFIX.length)).lodMaxBytes);
    }
  }, 120000);

  // Chế độ chặt (sai số 3%, không Permissive) không xuống được ≤ 25.000 tam giác ở các model này: không tạo bản vừa, không ghi manifest, build có cảnh báo (bước 8c).
  const MID_STALLED = ['models/env/bui-tre', 'models/env/khung-cui', 'models/env/leu-cho', 'models/env/nha-mai-ngoi', 'models/env/nha-mai-tranh'];

  it('bản vừa (-vua): chỉ có cho model có bản chính trên 20.000 tam giác mà chế độ chặt xuống được ≤ 25.000; texture ≤ 1024, nhẹ hơn bản chính; bản không dùng được không có trong manifest', async () => {
    const over = mainKeys().filter((k) => classifyModel(k).lod && manifest[k].tris > MID_MIN_MAIN_TRIS);
    expect(over.length).toBe(14);
    for (const k of MID_STALLED) expect(manifest[k + MID_SUFFIX], `${k} không được có bản vừa`).toBeUndefined();
    const expected = over.filter((k) => !MID_STALLED.includes(k));
    expect(expected.length).toBe(9);
    expect(midKeys().sort()).toEqual(expected.map((k) => k + MID_SUFFIX).sort());
    for (const key of midKeys()) {
      const main = key.slice(0, -MID_SUFFIX.length);
      const info = inspectDoc(await load(key));
      expect(info.extensions, key).toContain('EXT_meshopt_compression');
      expect(info.extensions, key).not.toContain('KHR_draco_mesh_compression');
      expect(info.tris, key).toBeLessThanOrEqual(MID_MAX_TRIS);
      expect(info.tris, key).toBeLessThan(manifest[main].tris);
      if (main !== 'models/games/man-02-duoi-ti/xe-bo') expect(info.tris, key).toBeLessThanOrEqual(MID_TRIS * 1.05);
      const big = largestTexture(info);
      if (big) expect(Math.max(big.width, big.height), `${key} texture`).toBeLessThanOrEqual(MID_TEXTURE);
      expect(manifest[key].bytes, `${key} dung lượng`).toBeLessThanOrEqual(manifest[main].bytes * 1.05);
      expect(manifest[key].tris).toBe(Math.round(info.tris));
    }
  }, 120000);
});

import { describe, expect, it } from 'vitest';
import { LOD_SUFFIX, MAX_RUNTIME_TEXTURE, baseId, isLodId, lodId, modelPath, oversizedTextures, placeholderHsl, placeholderKind } from './modelIds';

describe('tên model', () => {
  it('khóa manifest có tiền tố models/', () => {
    expect(modelPath('characters/bac-an')).toBe('models/characters/bac-an');
    expect(modelPath('games/man-02-duoi-ti/xe-bo')).toBe('models/games/man-02-duoi-ti/xe-bo');
  });
  it('bản xa có đuôi -xa', () => {
    expect(LOD_SUFFIX).toBe('-xa');
    expect(lodId('env/cong-lang-giay')).toBe('env/cong-lang-giay-xa');
    expect(isLodId('env/cong-lang-giay-xa')).toBe(true);
    expect(isLodId('env/cong-lang-giay')).toBe(false);
    expect(baseId('env/cong-lang-giay-xa')).toBe('env/cong-lang-giay');
    expect(baseId('env/cong-lang-giay')).toBe('env/cong-lang-giay');
  });
});

describe('hình thay thế', () => {
  it('nhân vật là capsule, đồ vật là khối', () => {
    expect(placeholderKind('characters/ti')).toBe('capsule');
    expect(placeholderKind('env/cay-da')).toBe('box');
    expect(placeholderKind('games/man-02-duoi-ti/xe-bo')).toBe('box');
  });
  it('màu ổn định theo id và khác nhau giữa các model', () => {
    expect(placeholderHsl('env/cay-da')).toEqual(placeholderHsl('env/cay-da'));
    expect(placeholderHsl('env/cay-da')[0]).not.toBe(placeholderHsl('env/gieng-lang')[0]);
    const [h, s, l] = placeholderHsl('characters/ti');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
    expect(s).toBeGreaterThan(0);
    expect(l).toBeGreaterThan(0);
  });
});

describe('cảnh báo texture lớn lúc chạy', () => {
  it('chỉ báo texture có cạnh dài hơn 2048', () => {
    expect(MAX_RUNTIME_TEXTURE).toBe(2048);
    const list = [
      { width: 2048, height: 2048 },
      { width: 1724, height: 2048 },
      { width: 4096, height: 4096 },
      { width: 512, height: 4100 },
    ];
    expect(oversizedTextures(list)).toEqual([list[2], list[3]]);
    expect(oversizedTextures(list, 1024)).toHaveLength(4);
    expect(oversizedTextures([])).toEqual([]);
  });
});

describe('bản vừa (LOD giữa)', () => {
  it('đuôi -vua; id bản chính lấy được từ bản vừa và bản xa', async () => {
    const { MID_SUFFIX, MID_USABLE_MAX_TRIS, isMidId, isUsableMid, midId } = await import('./modelIds');
    expect(MID_SUFFIX).toBe('-vua');
    expect(midId('env/cong-lang-giay')).toBe('env/cong-lang-giay-vua');
    expect(isMidId('env/cong-lang-giay-vua')).toBe(true);
    expect(isMidId('env/cong-lang-giay')).toBe(false);
    expect(baseId('env/cong-lang-giay-vua')).toBe('env/cong-lang-giay');
    expect(baseId('env/cong-lang-giay-xa')).toBe('env/cong-lang-giay');
    expect(MID_USABLE_MAX_TRIS).toBe(25000);
    expect(isUsableMid(15000)).toBe(true);
    expect(isUsableMid(24010)).toBe(true);
    expect(isUsableMid(36244)).toBe(false); // chế độ chặt dừng cao: gần bằng bản chính, không dùng
    expect(isUsableMid(66988)).toBe(false);
    expect(isUsableMid(undefined)).toBe(false);
    expect(isUsableMid(0)).toBe(false);
  });
});

describe('bản vừa trong manifest (assets-build)', () => {
  type Entry = { file: string; bytes: number; tris?: number };
  it('bản vừa chỉ có khi dùng được (≤ 25.000 tam giác, nhẹ hơn bản chính); nhà, lều, bụi tre không có bản vừa trong manifest', async () => {
    const manifest = (await import('../../../../assets-build/manifest.json')).default as unknown as Record<string, Entry>;
    const { isUsableMid } = await import('./modelIds');
    const mids = Object.keys(manifest).filter((k) => k.endsWith('-vua'));
    expect(mids.length).toBe(9);
    for (const k of mids) {
      const main = manifest[k.slice(0, -4)];
      expect(isUsableMid(manifest[k].tris), k).toBe(true);
      expect(manifest[k].tris!, k).toBeLessThan(main.tris!);
      expect(manifest[k].bytes, k).toBeLessThanOrEqual(main.bytes * 1.05);
    }
    for (const id of ['env/nha-mai-ngoi', 'env/nha-mai-tranh', 'env/leu-cho', 'env/bui-tre', 'env/khung-cui', 'env/cay-da']) expect(manifest[`models/${id}-vua`], id).toBeUndefined();
  });

  it('cổng làng và giếng có bản vừa dùng được (khoảng 15.000 tam giác), cây đa thì không có', async () => {
    const manifest = (await import('../../../../assets-build/manifest.json')).default as unknown as Record<string, Entry>;
    const { isUsableMid } = await import('./modelIds');
    for (const id of ['env/cong-lang-giay', 'env/cong-lang-det', 'env/cong-lang-khac-dau', 'env/cong-lang-bac', 'env/gieng-lang']) {
      const mid = manifest[`models/${id}-vua`];
      expect(isUsableMid(mid.tris), id).toBe(true);
      expect(mid.tris!).toBeGreaterThan(14000);
      expect(mid.tris!).toBeLessThan(16000);
    }
    expect(manifest['models/env/cay-da-vua']).toBeUndefined();
  });
});

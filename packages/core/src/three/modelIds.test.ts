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

import { describe, expect, it } from 'vitest';
import { hasAsset, lookupAsset, normalizeAssetPath, resolveAssetsUrl, type Manifest } from './manifest';

const manifest: Manifest = {
  'scenes/bai-hoc-lang-giay': { file: 'scenes/bai-hoc-lang-giay.f18abe56.webp', bytes: 139322, width: 1376, height: 768 },
  'ui/icons/ngoi-sao': { file: 'ui/icons/ngoi-sao.a366c6e3.webp', bytes: 4564, width: 256, height: 140 },
};
const BASE = 'http://localhost:5180';

describe('lookupAsset', () => {
  it('có file: trả URL đầy đủ kèm mã băm', () => {
    expect(lookupAsset(manifest, BASE, 'scenes/bai-hoc-lang-giay')).toBe(
      'http://localhost:5180/scenes/bai-hoc-lang-giay.f18abe56.webp',
    );
  });

  it('thiếu file: trả null', () => {
    expect(lookupAsset(manifest, BASE, 'scenes/khong-co')).toBeNull();
    expect(lookupAsset(manifest, BASE, 'ui/portraits/bi')).toBeNull();
  });

  it('path có hoặc không có đuôi đều ra cùng URL', () => {
    const a = lookupAsset(manifest, BASE, 'ui/icons/ngoi-sao');
    expect(a).not.toBeNull();
    expect(lookupAsset(manifest, BASE, 'ui/icons/ngoi-sao.png')).toBe(a);
    expect(lookupAsset(manifest, BASE, 'ui/icons/ngoi-sao.WEBP')).toBe(a);
    expect(lookupAsset(manifest, BASE, '/ui/icons/ngoi-sao.jpg')).toBe(a);
  });

  it('manifest chưa tải (null/undefined): trả null', () => {
    expect(lookupAsset(null, BASE, 'ui/icons/ngoi-sao')).toBeNull();
    expect(lookupAsset(undefined, BASE, 'ui/icons/ngoi-sao')).toBeNull();
  });

  it('bỏ dấu / cuối của địa chỉ gốc', () => {
    expect(lookupAsset(manifest, 'https://assets.ten-mien.vn/', 'ui/icons/ngoi-sao')).toBe(
      'https://assets.ten-mien.vn/ui/icons/ngoi-sao.a366c6e3.webp',
    );
  });

  it('không nhầm với thuộc tính có sẵn của Object', () => {
    expect(lookupAsset(manifest, BASE, 'constructor')).toBeNull();
    expect(hasAsset(manifest, 'toString')).toBe(false);
  });
});

describe('normalizeAssetPath / hasAsset / resolveAssetsUrl', () => {
  it('chuẩn hóa đường dẫn', () => {
    expect(normalizeAssetPath('\\ui\\icons\\tim.png')).toBe('ui/icons/tim');
    expect(normalizeAssetPath('story/01-ngu-guc.jpg')).toBe('story/01-ngu-guc');
  });

  it('hasAsset', () => {
    expect(hasAsset(manifest, 'ui/icons/ngoi-sao.png')).toBe(true);
    expect(hasAsset(manifest, 'ui/icons/tim')).toBe(false);
    expect(hasAsset(null, 'ui/icons/tim')).toBe(false);
  });

  it('địa chỉ gốc: trống thì dùng cổng 5180', () => {
    expect(resolveAssetsUrl(undefined)).toBe('http://localhost:5180');
    expect(resolveAssetsUrl('  ')).toBe('http://localhost:5180');
    expect(resolveAssetsUrl('https://assets.ten-mien.vn/')).toBe('https://assets.ten-mien.vn');
  });
});

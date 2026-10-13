import { describe, expect, it } from 'vitest';
import { hasAsset, isIpHostname, lookupAsset, normalizeAssetPath, resolveAssetsUrl, type Manifest } from './manifest';

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

  it('mở bằng IP máy tính (điện thoại, dev): địa chỉ đồ họa trỏ localhost thì đổi sang IP của trang', () => {
    expect(resolveAssetsUrl(undefined, '192.168.0.123')).toBe('http://192.168.0.123:5180');
    expect(resolveAssetsUrl('http://localhost:5180', '192.168.0.123')).toBe('http://192.168.0.123:5180');
    expect(resolveAssetsUrl('http://127.0.0.1:5180/', '10.0.0.7')).toBe('http://10.0.0.7:5180');
    expect(resolveAssetsUrl('http://localhost:5180', '[fe80::1]')).toBe('http://[fe80::1]:5180');
  });

  it('bản thật không bị ảnh hưởng: trang mở bằng tên miền thì không đổi, dù đồ họa là gì', () => {
    for (const host of ['stem-block.blockchainptit.com', 'sb-lang-giay.blockchainptit.com', 'mypc.local', 'localhost']) {
      expect(resolveAssetsUrl('https://sb-assets.blockchainptit.com', host)).toBe('https://sb-assets.blockchainptit.com');
      expect(resolveAssetsUrl('https://sb-assets.blockchainptit.com/', host)).toBe('https://sb-assets.blockchainptit.com');
      expect(resolveAssetsUrl('http://localhost:5180', host)).toBe('http://localhost:5180');
    }
  });

  it('địa chỉ đồ họa đã là máy khác (kể cả IP khác) thì không đổi theo trang', () => {
    expect(resolveAssetsUrl('https://sb-assets.blockchainptit.com', '192.168.0.123')).toBe('https://sb-assets.blockchainptit.com');
    expect(resolveAssetsUrl('http://192.168.0.9:5180', '192.168.0.123')).toBe('http://192.168.0.9:5180');
    expect(resolveAssetsUrl('không phải địa chỉ', '192.168.0.5')).toBe('không phải địa chỉ');
  });

  it('trang mở ở localhost hoặc không biết tên máy thì không đổi', () => {
    expect(resolveAssetsUrl(undefined, 'localhost')).toBe('http://localhost:5180');
    expect(resolveAssetsUrl('http://localhost:5180', '127.0.0.1')).toBe('http://localhost:5180');
    expect(resolveAssetsUrl(undefined)).toBe('http://localhost:5180');
  });

  it('isIpHostname: chỉ nhận IP, không nhận tên miền', () => {
    expect(isIpHostname('192.168.0.5')).toBe(true);
    expect(isIpHostname('[fe80::1]')).toBe(true);
    expect(isIpHostname('stem-block.blockchainptit.com')).toBe(false);
    expect(isIpHostname('localhost')).toBe(false);
    expect(isIpHostname('mypc.local')).toBe(false);
    expect(isIpHostname('1.2.3')).toBe(false);
  });
});

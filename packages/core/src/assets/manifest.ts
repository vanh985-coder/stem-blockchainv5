/** Một mục trong assets-build/manifest.json (spec 01 mục 5). */
export interface ManifestEntry {
  file: string;
  bytes: number;
  width: number;
  height: number;
}

/** Khóa là đường dẫn không đuôi, ví dụ "scenes/bai-hoc-lang-giay". */
export type Manifest = Record<string, ManifestEntry>;

const KNOWN_EXT = /\.(png|jpe?g|webp|gif|glb)$/i;

/** Đưa đường dẫn về dạng khóa manifest: bỏ "/" đầu, đổi "\" thành "/", bỏ đuôi file. */
export function normalizeAssetPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(KNOWN_EXT, '');
}

/** Hàm thuần: tra manifest, trả URL đầy đủ hoặc null nếu không có. */
export function lookupAsset(manifest: Manifest | null | undefined, baseUrl: string, path: string): string | null {
  if (!manifest) return null;
  const key = normalizeAssetPath(path);
  if (!Object.prototype.hasOwnProperty.call(manifest, key)) return null;
  return `${baseUrl.replace(/\/+$/, '')}/${encodeURI(manifest[key].file)}`;
}

/** Hàm thuần: có mục trong manifest không (cả khi chưa tải xong thì trả false). */
export function hasAsset(manifest: Manifest | null | undefined, path: string): boolean {
  return !!manifest && Object.prototype.hasOwnProperty.call(manifest, normalizeAssetPath(path));
}

const LOCAL_ASSETS_URL = 'http://localhost:5180';

/** Hàm thuần: địa chỉ gốc của đồ họa, bỏ dấu "/" cuối; trống thì dùng cổng dev:assets. */
export function resolveAssetsUrl(value: string | undefined): string {
  const v = (value ?? '').trim();
  return (v === '' ? LOCAL_ASSETS_URL : v).replace(/\/+$/, '');
}

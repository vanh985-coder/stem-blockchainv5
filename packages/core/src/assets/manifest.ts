/** Một mục trong assets-build/manifest.json (spec 01 mục 5). */
export interface ManifestEntry {
  file: string;
  bytes: number;
  /** Điểm ảnh; model .glb ghi 0 (không có ý nghĩa). */
  width: number;
  height: number;
  /** Chỉ có ở model .glb: `kind` là 'model', `tris` là số tam giác sau nén. */
  kind?: 'model';
  tris?: number;
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

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Hàm thuần: địa chỉ gốc của đồ họa, bỏ dấu "/" cuối; trống thì dùng cổng dev:assets.
 * Khi mở trang bằng địa chỉ khác localhost (ví dụ điện thoại vào http://192.168.0.5:5173 sau `pnpm dev:hub --host`) mà địa chỉ
 * đồ họa vẫn trỏ về localhost (điện thoại không có đồ họa ở "localhost" của nó) thì đổi tên máy thành tên máy của trang.
 * @param pageHostname `location.hostname` của trang đang mở (bỏ trống thì không đổi)
 */
export function resolveAssetsUrl(value: string | undefined, pageHostname?: string): string {
  const v = (value ?? '').trim();
  const base = (v === '' ? LOCAL_ASSETS_URL : v).replace(/\/+$/, '');
  if (!pageHostname || LOOPBACK.has(pageHostname.toLowerCase())) return base;
  try {
    const u = new URL(base);
    if (!LOOPBACK.has(u.hostname)) return base;
    u.hostname = pageHostname;
    return u.toString().replace(/\/+$/, '');
  } catch {
    return base;
  }
}

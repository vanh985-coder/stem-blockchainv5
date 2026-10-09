import type { VillageId } from '../village';

export const VILLAGE_IDS: readonly VillageId[] = ['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac'];

export interface UrlEnv {
  VITE_HUB_URL?: string;
  VITE_LANG_GIAY_URL?: string;
  VITE_LANG_DET_URL?: string;
  VITE_LANG_KHAC_DAU_URL?: string;
  VITE_LANG_BAC_URL?: string;
}

export interface AppUrls {
  hub: string;
  villages: Record<VillageId, string>;
}

// Giá trị mặc định khi chạy trên máy (cổng theo spec 01 mục 8).
const LOCAL_DEFAULTS = {
  hub: 'http://localhost:5173',
  'lang-giay': 'http://localhost:5174',
  'lang-det': 'http://localhost:5175',
  'lang-khac-dau': 'http://localhost:5176',
  'lang-bac': 'http://localhost:5177',
} as const;

function clean(value: string | undefined, fallback: string): string {
  const v = (value ?? '').trim();
  return (v === '' ? fallback : v).replace(/\/+$/, '');
}

/** Hàm thuần: đọc địa chỉ hub và 4 làng từ biến môi trường, bỏ dấu "/" ở cuối. */
export function resolveUrls(env: UrlEnv): AppUrls {
  return {
    hub: clean(env.VITE_HUB_URL, LOCAL_DEFAULTS.hub),
    villages: {
      'lang-giay': clean(env.VITE_LANG_GIAY_URL, LOCAL_DEFAULTS['lang-giay']),
      'lang-det': clean(env.VITE_LANG_DET_URL, LOCAL_DEFAULTS['lang-det']),
      'lang-khac-dau': clean(env.VITE_LANG_KHAC_DAU_URL, LOCAL_DEFAULTS['lang-khac-dau']),
      'lang-bac': clean(env.VITE_LANG_BAC_URL, LOCAL_DEFAULTS['lang-bac']),
    },
  };
}

/** Địa chỉ màn n của một làng, dạng <làng>/lang/<id>/man/<n>. */
export function levelUrl(urls: AppUrls, id: VillageId, level: number): string {
  return `${urls.villages[id]}/lang/${id}/man/${level}`;
}

export function hubMapUrl(urls: AppUrls): string {
  return `${urls.hub}/ban-do`;
}

/** Địa chỉ một trang của hub, ví dụ hubPageUrl(urls, '/giao-vien'). Path luôn bắt đầu bằng "/". */
export function hubPageUrl(urls: AppUrls, path: string): string {
  return `${urls.hub}${path.startsWith('/') ? path : `/${path}`}`;
}

// Đọc môi trường thật (Vite thay chuỗi import.meta.env.VITE_* lúc build).
export const URLS: AppUrls = resolveUrls({
  VITE_HUB_URL: import.meta.env.VITE_HUB_URL,
  VITE_LANG_GIAY_URL: import.meta.env.VITE_LANG_GIAY_URL,
  VITE_LANG_DET_URL: import.meta.env.VITE_LANG_DET_URL,
  VITE_LANG_KHAC_DAU_URL: import.meta.env.VITE_LANG_KHAC_DAU_URL,
  VITE_LANG_BAC_URL: import.meta.env.VITE_LANG_BAC_URL,
});

export const HUB_MAP_URL = hubMapUrl(URLS);

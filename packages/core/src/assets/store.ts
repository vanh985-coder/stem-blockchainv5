import { useEffect, useSyncExternalStore } from 'react';
import { fmt } from '../content/characters';
import { ui } from '../content/ui';
import { devWarn } from '../lib/dev';
import { lookupAsset, resolveAssetsUrl, type Manifest } from './manifest';

export const ASSETS_URL = resolveAssetsUrl(import.meta.env.VITE_ASSETS_URL);

let manifest: Manifest | null = null;
let loading: Promise<Manifest> | null = null;
const listeners = new Set<() => void>();

/** Tải manifest một lần. Lỗi mạng hoặc thiếu file thì coi như manifest rỗng (mọi ảnh dùng hình thay thế). */
export function loadManifest(): Promise<Manifest> {
  loading ??= fetch(`${ASSETS_URL}/manifest.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<Manifest>;
    })
    .catch((e: unknown) => {
      devWarn(fmt(ui.dev.manifestLoi, { path: `${ASSETS_URL}/manifest.json`, loi: String(e) }));
      return {} as Manifest;
    })
    .then((m) => {
      manifest = m;
      listeners.forEach((l) => l());
      return m;
    });
  return loading;
}

/** URL đầy đủ của ảnh, hoặc null nếu manifest chưa tải xong hoặc không có file. */
export function asset(path: string): string | null {
  return lookupAsset(manifest, ASSETS_URL, path);
}

/** Manifest hiện có (null khi chưa tải xong). Gọi hook này sẽ kích hoạt việc tải. */
export function useManifest(): Manifest | null {
  useEffect(() => {
    void loadManifest();
  }, []);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => manifest,
    () => null,
  );
}

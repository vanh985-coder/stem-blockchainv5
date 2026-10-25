/**
 * Hình của màn 9: nạp hình rời theo manifest (thiếu file thì null, cảnh vẽ ô màu thay thế), tia lấp lánh và viên thuốc vẽ bằng canvas.
 * Mọi thứ do hook hay hàm tạo ra đều có hàm dọn (giải phóng texture) để rời cảnh dựng lại 6 lần không tăng bộ nhớ GPU.
 */
import { useEffect, useMemo, useState } from 'react';
import { CanvasTexture, LinearFilter, SRGBColorSpace, Texture } from 'three';
import { ASSETS_URL, lookupAsset, useManifest } from '@so-chung/core';

export const ART = {
  benh: 'sprites/man-09-chua-ga/ga-benh',
  khoe: 'sprites/man-09-chua-ga/ga-khoe',
  trum: 'sprites/man-09-chua-ga/ga-trum',
  na: 'sprites/man-09-chua-ga/na-cao-su',
} as const;
export type ArtKey = keyof typeof ART;
export type ChickenTextures = { [K in ArtKey]: Texture | null } & { done: boolean };

export function prepare<T extends Texture>(t: T): T {
  t.colorSpace = SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Nạp mọi hình rời của màn (một lần), giải phóng khi rời màn. */
export function useChickenTextures(): ChickenTextures {
  const manifest = useManifest();
  const empty = useMemo(() => Object.fromEntries(Object.keys(ART).map((k) => [k, null])) as { [K in ArtKey]: Texture | null }, []);
  const [tex, setTex] = useState<ChickenTextures>({ ...empty, done: false });
  useEffect(() => {
    if (!manifest) return;
    let alive = true;
    const made: Texture[] = [];
    const load = (key: ArtKey) =>
      new Promise<Texture | null>((resolve) => {
        const url = lookupAsset(manifest, ASSETS_URL, ART[key]);
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
          const t = prepare(new Texture(img));
          made.push(t);
          resolve(t);
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    const keys = Object.keys(ART) as ArtKey[];
    void Promise.all(keys.map(load)).then((list) => {
      if (!alive) {
        for (const t of made) t.dispose();
        return;
      }
      const out = { ...empty, done: true } as ChickenTextures;
      keys.forEach((k, i) => (out[k] = list[i]));
      setTex(out);
    });
    return () => {
      alive = false;
      for (const t of made) t.dispose();
    };
  }, [manifest, empty]);
  return tex;
}

/** Tia lấp lánh: ngôi sao bốn cánh trắng (màu do vật liệu quyết định), vẽ một lần. */
export function makeStarTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const R = 30;
    const r = 7;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const rad = i % 2 === 0 ? R : r;
      const x = 32 + Math.cos(a) * rad;
      const y = 32 + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  return prepare(new CanvasTexture(c));
}

/** Viên thuốc: viên tròn có vạch giữa và viền (trắng; màu thuốc do vật liệu nhân vào), vẽ một lần. */
export function makePillTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,40,40,0.9)';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, 32);
    ctx.lineTo(56, 32);
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  return prepare(new CanvasTexture(c));
}

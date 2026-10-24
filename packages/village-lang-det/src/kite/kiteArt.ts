/**
 * Hình của màn 6: nạp hình theo manifest (thiếu file thì null, cảnh vẽ ô màu thay thế); đoạn thân cột tre cắt từ ảnh gốc (lặp lật gương theo chiều dọc), trang bản sao và cuốn sổ giao cho làng vẽ bằng code (canvas).
 * Mọi texture do hook tạo ra đều được giải phóng khi rời màn, để rời cảnh dựng lại 6 lần không tăng bộ nhớ GPU.
 */
import { useEffect, useMemo, useState } from 'react';
import { CanvasTexture, ClampToEdgeWrapping, LinearFilter, MirroredRepeatWrapping, SRGBColorSpace, Texture } from 'three';
import { ASSETS_URL, lookupAsset, useManifest } from '@so-chung/core';
import { POLE_CROP } from './kiteLayout';

export const ART = {
  troi: 'scenes/man-06-troi',
  doiXa: 'scenes/man-06-doi-xa',
  treGan: 'scenes/man-06-tre-gan',
  cot: 'sprites/man-06-dieu/cot-tre',
  dieu: 'sprites/man-06-dieu/dieu',
  dieuDen: 'sprites/man-06-dieu/dieu-den',
  cong: 'sprites/man-06-dieu/cong-lang-xa',
} as const;
export type ArtKey = keyof typeof ART;

export interface KiteTextures {
  troi: Texture | null;
  doiXa: Texture | null;
  treGan: Texture | null;
  /** Đoạn thân cột tre đã cắt (lặp lật gương theo chiều dọc) */
  cot: Texture | null;
  dieu: Texture | null;
  dieuDen: Texture | null;
  cong: Texture | null;
  /** Trang bản sao và cuốn sổ giao cho làng: vẽ bằng code, luôn có */
  trang: Texture;
  so: Texture;
  /** Đã nạp xong (kể cả khi thiếu file) */
  done: boolean;
}

function prepare(t: Texture): Texture {
  t.colorSpace = SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Hình nền cuộn: lặp kiểu soi gương theo chiều ngang */
function mirrorX(t: Texture): Texture {
  t.wrapS = MirroredRepeatWrapping;
  t.wrapT = ClampToEdgeWrapping;
  return t;
}

function canvasOf(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

/** Trang bản sao (hình vẽ bằng code, không chữ): tờ giấy dó có vài dòng kẻ, góc gấp, viền nâu. */
export function makePageTexture(): CanvasTexture {
  const [c, g] = canvasOf(128, 160);
  if (g) {
    g.fillStyle = '#f8ecc9';
    g.strokeStyle = '#8a5a36';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(14, 10);
    g.lineTo(92, 10);
    g.lineTo(116, 34);
    g.lineTo(116, 150);
    g.lineTo(14, 150);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#e3c98a';
    g.beginPath();
    g.moveTo(92, 10);
    g.lineTo(92, 34);
    g.lineTo(116, 34);
    g.closePath();
    g.fill();
    g.stroke();
    g.strokeStyle = '#a77d4b';
    g.lineWidth = 6;
    g.lineCap = 'round';
    for (const y of [62, 84, 106, 128]) {
      g.beginPath();
      g.moveTo(32, y);
      g.lineTo(y === 128 ? 70 : 98, y);
      g.stroke();
    }
  }
  return prepare(new CanvasTexture(c)) as CanvasTexture;
}

/** Cuốn sổ giao cho làng (hình vẽ bằng code): bìa tím, gáy, mép giấy. */
export function makeBookTexture(): CanvasTexture {
  const [c, g] = canvasOf(160, 128);
  if (g) {
    g.fillStyle = '#5b3fd6';
    g.strokeStyle = '#2d1f73';
    g.lineWidth = 7;
    g.beginPath();
    g.roundRect(14, 14, 132, 100, 10);
    g.fill();
    g.stroke();
    g.fillStyle = '#3f2aa0';
    g.fillRect(14, 14, 24, 100);
    g.strokeStyle = '#f8ecc9';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(56, 110);
    g.lineTo(138, 110);
    g.stroke();
    g.fillStyle = '#f9d77a';
    g.beginPath();
    g.roundRect(62, 40, 62, 40, 8);
    g.fill();
  }
  return prepare(new CanvasTexture(c)) as CanvasTexture;
}

/** Cắt đoạn thân cột tre từ ảnh gốc thành texture hẹp, lặp lật gương theo chiều dọc (chỗ nối không gãy). */
function cropPole(img: CanvasImageSource & { width: number; height: number }): CanvasTexture | null {
  const k = img.width / 1024; // ảnh có thể được phục vụ ở độ phân giải khác 1024
  const [c, g] = canvasOf(Math.round(POLE_CROP.w * k), Math.round(POLE_CROP.h * k));
  if (!g) return null;
  g.drawImage(img, POLE_CROP.x0 * k, POLE_CROP.y0 * k, POLE_CROP.w * k, POLE_CROP.h * k, 0, 0, c.width, c.height);
  const t = prepare(new CanvasTexture(c)) as CanvasTexture;
  t.wrapS = ClampToEdgeWrapping;
  t.wrapT = MirroredRepeatWrapping;
  return t;
}

/** Nạp mọi hình của màn (một lần), giải phóng khi rời màn. */
export function useKiteTextures(): KiteTextures {
  const manifest = useManifest();
  const drawn = useMemo(() => ({ trang: makePageTexture(), so: makeBookTexture() }), []);
  useEffect(
    () => () => {
      drawn.trang.dispose();
      drawn.so.dispose();
    },
    [drawn],
  );
  const empty = useMemo<KiteTextures>(() => ({ troi: null, doiXa: null, treGan: null, cot: null, dieu: null, dieuDen: null, cong: null, ...drawn, done: false }), [drawn]);
  const [tex, setTex] = useState<KiteTextures>(empty);
  useEffect(() => {
    if (!manifest) return;
    let alive = true;
    const made: Texture[] = [];
    const load = (key: ArtKey) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const url = lookupAsset(manifest, ASSETS_URL, ART[key]);
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    const keys = Object.keys(ART) as ArtKey[];
    void Promise.all(keys.map(load)).then((imgs) => {
      if (!alive) return;
      const out: KiteTextures = { ...empty, done: true };
      keys.forEach((k, i) => {
        const img = imgs[i];
        if (!img) return;
        if (k === 'cot') {
          const t = cropPole(img);
          if (t) {
            made.push(t);
            out.cot = t;
          }
          return;
        }
        const t = prepare(new Texture(img));
        if (k === 'troi' || k === 'doiXa' || k === 'treGan') mirrorX(t);
        made.push(t);
        out[k] = t;
      });
      setTex(out);
    });
    return () => {
      alive = false;
      for (const t of made) t.dispose();
    };
  }, [manifest, empty]);
  return tex;
}

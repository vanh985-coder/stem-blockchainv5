/**
 * Hình của màn 12: nạp hình rời theo manifest (thiếu file thì null, cảnh dùng màu thay thế), cắt theo khung có hình, tách nền trắng của hai hình lá (ảnh lá không có nền trong suốt),
 * vẽ trời bằng dải màu chuyển và vẽ nhãn "Sổ / Nay" của tay nắm. Dùng canvas của trình duyệt; phần tính toán thuần nằm ở climbLayout.ts.
 */
import { useEffect, useMemo, useState } from 'react';
import { CanvasTexture, LinearFilter, SRGBColorSpace, Texture } from 'three';
import { ASSETS_URL, climbUi, fmt, lookupAsset, useManifest } from '@so-chung/core';
import { CROPS, LABEL, labelFontPx } from './climbLayout';
import { nodeLabel, type ClimbTree } from './climbLogic';

export const ART = {
  trunk: 'sprites/man-12-leo-cay/than-cay',
  bar: 'sprites/man-12-leo-cay/canh-ngang',
  handle: 'sprites/man-12-leo-cay/tay-nam',
  root: 'sprites/man-12-leo-cay/goc-cay',
  crown: 'sprites/man-12-leo-cay/ngon-cay',
  fakeLeaf: 'ui/tiles/la-gia',
  leaf: 'ui/tiles/la-da',
  coin: 'ui/icons/tien-dong',
} as const;
export type ArtKey = keyof typeof ART;
/** Hai hình lá có nền trắng đục: tách nền khi nạp. */
const KEY_WHITE: ReadonlySet<ArtKey> = new Set(['fakeLeaf', 'leaf']);

export type ClimbTextures = { [K in ArtKey]: Texture | null } & { done: boolean };

function prepare(t: Texture): Texture {
  t.colorSpace = SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Cắt texture theo khung có hình (tọa độ ảnh, v = 0 ở trên). */
function crop(t: Texture, c: { u0: number; u1: number; v0: number; v1: number }): Texture {
  t.repeat.set(c.u1 - c.u0, c.v1 - c.v0);
  t.offset.set(c.u0, 1 - c.v1);
  return t;
}

/** Ảnh lá nền trắng: điểm gần trắng thành trong suốt (mép mềm), vẽ ra canvas. */
function keyWhite(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return c;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const m = Math.min(p[i], p[i + 1], p[i + 2]);
    if (m > 232) p[i + 3] = Math.max(0, Math.round(((255 - m) / 23) * 255));
  }
  ctx.putImageData(d, 0, 0);
  return c;
}

/** Nạp mọi hình của màn (một lần), giải phóng khi rời màn. */
export function useClimbTextures(): ClimbTextures {
  const manifest = useManifest();
  const empty = useMemo(() => Object.fromEntries(Object.keys(ART).map((k) => [k, null])) as { [K in ArtKey]: Texture | null }, []);
  const [tex, setTex] = useState<ClimbTextures>({ ...empty, done: false });
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
          const t = prepare(KEY_WHITE.has(key) ? new CanvasTexture(keyWhite(img)) : new Texture(img));
          if (key === 'trunk') crop(t, CROPS.trunk);
          if (key === 'bar') crop(t, CROPS.bar);
          if (key === 'handle') crop(t, CROPS.handle);
          if (key === 'root') crop(t, CROPS.root);
          if (key === 'crown') crop(t, CROPS.crown);
          made.push(t);
          resolve(t);
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    const keys = Object.keys(ART) as ArtKey[];
    void Promise.all(keys.map(load)).then((list) => {
      if (!alive) return;
      const out = { ...empty, done: true } as ClimbTextures;
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

/** Trời: dải màu chuyển từ xanh đậm (trên) tới xanh nhạt pha nắng (dưới), vẽ một lần. */
export function makeSkyTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#3f7fd0');
    g.addColorStop(0.55, '#8cc4f0');
    g.addColorStop(1, '#f3e6c4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
  }
  return prepare(new CanvasTexture(c)) as CanvasTexture;
}

/** Phông chữ nhãn (cùng phông tiêu đề của trang). */
const FONT = '"Baloo 2", "Be Vietnam Pro", system-ui, sans-serif';

/** Các nút cần nhãn trong một vòng: gốc, và hai con của từng nút trên đường tới lá bị tráo (người chơi chỉ leo được theo đường đó). */
export function labelNodes(tree: ClimbTree): { level: number; index: number }[] {
  const out = [{ level: 0, index: 0 }];
  for (let k = 1; k <= tree.depth; k++) {
    const parent = tree.tamperedIndex >> (tree.depth - k + 1);
    out.push({ level: k, index: 2 * parent }, { level: k, index: 2 * parent + 1 });
  }
  return out;
}

export const labelKey = (level: number, index: number): string => `${level}:${index}`;

/**
 * Nhãn hai dòng "Sổ: …" / "Nay: …" cho các nút của vòng, vẽ theo số điểm ảnh thật (`ppu`: px CSS mỗi đơn vị) để chữ ≥ 14 px. Cả hai dòng cùng màu, không đánh dấu nhánh nào lệch:
 * học sinh phải tự so hai số. Trả về Map khóa `level:index` → texture, và cỡ chữ đã dùng (px CSS).
 */
export function drawLabels(tree: ClimbTree, ppu: number, largeText: boolean): { map: Map<string, CanvasTexture>; fontPx: number } {
  const dpr = typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(64, Math.round(LABEL.width * ppu * dpr));
  const h = Math.max(32, Math.round(LABEL.height * ppu * dpr));
  const nodes = labelNodes(tree).map((n) => ({ ...n, text: nodeLabel(tree, n.level, n.index) }));
  const lines = nodes.flatMap((n) => [fmt(climbUi.so, { so: n.text.book }), fmt(climbUi.nay, { so: n.text.now })]);
  const probe = document.createElement('canvas').getContext('2d');
  let widest = 0;
  if (probe) {
    probe.font = `700 100px ${FONT}`;
    for (const l of lines) widest = Math.max(widest, probe.measureText(l).width / 100);
  }
  const fontPx = labelFontPx(ppu, largeText, widest || 6);
  const map = new Map<string, CanvasTexture>();
  for (const n of nodes) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (ctx) {
      const r = h * 0.18;
      ctx.fillStyle = '#fdf6e3';
      ctx.strokeStyle = '#6b4a2b';
      ctx.lineWidth = Math.max(2, h * 0.045);
      ctx.beginPath();
      ctx.roundRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth, r);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2b1d14';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${fontPx * dpr}px ${FONT}`;
      ctx.fillText(fmt(climbUi.so, { so: n.text.book }), w / 2, h * 0.3);
      ctx.fillText(fmt(climbUi.nay, { so: n.text.now }), w / 2, h * 0.72);
    }
    map.set(labelKey(n.level, n.index), prepare(new CanvasTexture(c)) as CanvasTexture);
  }
  return { map, fontPx };
}

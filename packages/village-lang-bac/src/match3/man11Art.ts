/**
 * Hình của màn 11: nạp hình rời theo manifest (thiếu file thì null, cảnh dùng ô màu thay thế), cắt cây theo khung có hình, và vẽ bằng canvas các hình nhỏ dùng chung (khay bàn, vòng nổ, chấm nút gộp, đoạn cành nối).
 * Texture không dùng mipmap (hình phẳng trước camera trực giao) và được giải phóng khi rời màn. Phần tính toán thuần nằm ở man11Layout.ts, man11Slots.ts.
 */
import { useEffect, useMemo, useState } from 'react';
import { CanvasTexture, LinearFilter, SRGBColorSpace, Texture } from 'three';
import { ASSETS_URL, lookupAsset, useManifest } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { cutoutWhite, shade } from './man11Ground';
import { TREE_ART } from './man11Slots';

/** Đường dẫn hình theo số hiệu mặt (`faceId`): 0 đến 5 lá bàng, chuối, đa, sen, trầu, tre; 6 lá giả; 7 ô gió xoáy. */
export const FACE_PATHS: readonly string[] = ['ui/tiles/la-bang', 'ui/tiles/la-chuoi', 'ui/tiles/la-da', 'ui/tiles/la-sen', 'ui/tiles/la-trau', 'ui/tiles/la-tre', 'ui/tiles/la-gia', 'ui/tiles/o-gio'];
export const LOTUS_PATH = 'ui/tiles/o-hoa';
export const TREE_PATH = 'sprites/man-11-ghep-la/cay-ghep-la';
export const BACKGROUND_PATH = 'scenes/man-11-goc-da';

/** Màu ô thay thế khi thiếu hình, theo số hiệu mặt. */
export const FACE_COLORS: readonly string[] = ['#e0544b', '#8fcf4a', '#2f6b3a', '#47b58c', '#9b6bd1', '#b9dc78', '#6b717c', '#4aa7d6'];
export const LOTUS_COLOR = '#f7a8c4';
export const TREE_COLOR = '#8b5e34';

export interface Man11Textures {
  /** Theo số hiệu mặt; null nếu thiếu hình */
  faces: (Texture | null)[];
  lotus: Texture | null;
  tree: Texture | null;
  /** Ảnh nền đã làm trong suốt phần nền trắng nửa dưới (mặt đất vẽ bằng code nằm sau nó); null nếu thiếu ảnh */
  backdrop: { texture: Texture; width: number; height: number; grass: [number, number, number] } | null;
  /** Tất cả hình đã có kết quả (tải xong hay báo thiếu) */
  done: boolean;
}

function prepare<T extends Texture>(t: T): T {
  t.colorSpace = SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Nạp mọi hình của màn (một lần), giải phóng khi rời màn. */
export function useMan11Textures(): Man11Textures {
  const manifest = useManifest();
  const [tex, setTex] = useState<Man11Textures>({ faces: FACE_PATHS.map(() => null), lotus: null, tree: null, backdrop: null, done: false });
  useEffect(() => {
    if (!manifest) return;
    let alive = true;
    const made: Texture[] = [];
    const load = (path: string, crop?: { u0: number; u1: number; v0: number; v1: number }) =>
      new Promise<Texture | null>((resolve) => {
        const url = lookupAsset(manifest, ASSETS_URL, path);
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
          const t = prepare(new Texture(img));
          if (crop) {
            t.repeat.set(crop.u1 - crop.u0, crop.v1 - crop.v0);
            t.offset.set(crop.u0, 1 - crop.v1);
          }
          made.push(t);
          resolve(t);
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    const loadBackdrop = () =>
      new Promise<Man11Textures['backdrop']>((resolve) => {
        const url = lookupAsset(manifest, ASSETS_URL, BACKGROUND_PATH);
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          const [c, ctx] = canvas(w, h);
          if (!ctx || w === 0) return resolve(null);
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, w, h);
          const cut = cutoutWhite(data.data, w, h);
          ctx.putImageData(data, 0, 0);
          const t = prepare(new CanvasTexture(c));
          made.push(t);
          resolve({ texture: t, width: w, height: h, grass: cut.grass });
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    void Promise.all([...FACE_PATHS.map((p) => load(p)), load(LOTUS_PATH), load(TREE_PATH, TREE_ART), loadBackdrop()]).then((list) => {
      if (!alive) return;
      setTex({ faces: list.slice(0, FACE_PATHS.length) as (Texture | null)[], lotus: list[FACE_PATHS.length] as Texture | null, tree: list[FACE_PATHS.length + 1] as Texture | null, backdrop: list[FACE_PATHS.length + 2] as Man11Textures['backdrop'], done: true });
    });
    return () => {
      alive = false;
      for (const t of made) t.dispose();
    };
  }, [manifest]);
  return tex;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

/**
 * Khay nền của bàn: hộp giấy bo tròn viền gỗ, bên trong lưới 7 × 7 ô xen kẽ hai sắc. `pad` và `cell` là đơn vị thế giới (cùng đơn vị với man11Layout) nên ảnh khớp đúng hộp `panel`.
 */
export function makePanelTexture(cell: number, pad: number, grid: number): CanvasTexture {
  const total = grid * cell + 2 * pad;
  const px = 8 * 64; // 512
  const k = px / total;
  const [c, ctx] = canvas(px, px);
  if (ctx) {
    const r = Math.min(40, pad * k * 1.8);
    const line = Math.max(4, pad * k * 0.28);
    ctx.fillStyle = 'rgba(253, 244, 220, 0.9)';
    ctx.strokeStyle = '#7a4f2a';
    ctx.lineWidth = line;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(line / 2, line / 2, px - line, px - line, r);
    else ctx.rect(line / 2, line / 2, px - line, px - line);
    ctx.fill();
    ctx.stroke();
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? 'rgba(205, 170, 120, 0.22)' : 'rgba(255, 255, 255, 0.28)';
        ctx.fillRect((pad + x * cell) * k, (pad + y * cell) * k, cell * k, cell * k);
      }
    }
  }
  return prepare(new CanvasTexture(c));
}

/** Vòng nổ: vòng trắng mảnh với quầng mờ bên trong (đổi màu bằng `material.color`). */
export function makeRingTexture(): CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 18, 64, 64, 60);
    g.addColorStop(0, 'rgba(255,255,255,0.05)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.88, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  return prepare(new CanvasTexture(c));
}

/** Chấm tròn mềm (nút gộp trên cây, vầng sáng của gốc, ô cây): đổi màu bằng `material.color`. */
export function makeDotTexture(): CanvasTexture {
  const [c, ctx] = canvas(64, 64);
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  return prepare(new CanvasTexture(c));
}

/** Đoạn cành nối: thanh bo tròn hai đầu (kéo dãn theo độ dài, đổi màu bằng `material.color`). */
export function makeLineTexture(): CanvasTexture {
  const [c, ctx] = canvas(128, 32);
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(2, 6, 124, 20, 10);
    else ctx.rect(2, 6, 124, 20);
    ctx.fill();
  }
  return prepare(new CanvasTexture(c));
}

/** Hình nhỏ dùng chung, dựng một lần cho cả màn rồi giải phóng khi rời màn. */
export function useSharedTextures(cell: number, pad: number, grid: number): { panel: CanvasTexture; ring: CanvasTexture; dot: CanvasTexture; line: CanvasTexture } {
  const panel = useMemo(() => makePanelTexture(cell, pad, grid), [cell, pad, grid]);
  const ring = useMemo(() => makeRingTexture(), []);
  const dot = useMemo(() => makeDotTexture(), []);
  const line = useMemo(() => makeLineTexture(), []);
  useEffect(() => () => panel.dispose(), [panel]);
  useEffect(() => () => ring.dispose(), [ring]);
  useEffect(() => () => dot.dispose(), [dot]);
  useEffect(() => () => line.dispose(), [line]);
  return { panel, ring, dot, line };
}

/**
 * Mặt đất vẽ bằng code, phủ cả khung và nằm SAU ảnh nền (ảnh nền đã trong suốt ở nửa dưới, xem `man11Ground.ts`): cỏ cùng tông với cỏ của ảnh (`grass`), tối dần xuống dưới, có vài mảng đất và các nét cỏ rải bằng
 * hạt giống cố định. Không có ảnh nền (`sky` true) thì phần trên là bầu trời để cảnh không trống. Cạnh trên của mặt đất không cần viền: nó nằm sau mép cỏ của ảnh nên mép cỏ của ảnh chính là viền mềm.
 */
export function makeGroundTexture(grass: readonly [number, number, number], sky: boolean): CanvasTexture {
  const w = 512;
  const h = 512;
  const [c, ctx] = canvas(w, h);
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (sky) {
      g.addColorStop(0, '#9fd0f0');
      g.addColorStop(0.5, '#d6ecf7');
      g.addColorStop(0.52, shade(grass, 1.3));
    } else g.addColorStop(0, shade(grass, 1.3));
    g.addColorStop(0.6, shade(grass, 1.26));
    g.addColorStop(0.8, shade(grass, 1.1));
    g.addColorStop(1, shade(grass, 0.88));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const rng = createMulberry32(1109);
    // mảng đất nhạt và mảng cỏ đậm
    for (let i = 0; i < 26; i++) {
      const x = rng() * w;
      const y = h * (0.58 + rng() * 0.42);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(168, 134, 82, 0.16)' : 'rgba(40, 90, 30, 0.10)';
      ctx.beginPath();
      ctx.ellipse(x, y, 30 + rng() * 60, 6 + rng() * 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // nét cỏ
    ctx.lineCap = 'round';
    for (let i = 0; i < 170; i++) {
      const x = rng() * w;
      const y = h * (0.58 + rng() * 0.42);
      const len = 3 + rng() * 5;
      ctx.strokeStyle = rng() < 0.55 ? shade(grass, 1.5) : shade(grass, 0.8);
      ctx.globalAlpha = 0.22 + rng() * 0.22;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 4, y - len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  return prepare(new CanvasTexture(c));
}

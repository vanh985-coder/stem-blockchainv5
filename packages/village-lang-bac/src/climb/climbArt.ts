/**
 * Hình của màn 12 "Leo bậc gỗ": nạp hình rời theo manifest (thiếu file thì null, cảnh dùng hình code vẽ hay màu thay thế), cắt theo khung có hình, vẽ trời bằng dải màu chuyển,
 * vẽ bậc gỗ có số bằng canvas (có ảnh `bac-go` trong manifest thì vẽ ảnh đó làm nền, không thì tấm ván vẽ bằng code), vết nứt và biển "Gốc trong sổ".
 * Dùng canvas của trình duyệt; phần tính toán thuần nằm ở climbLayout.ts.
 */
import { useEffect, useMemo, useState } from 'react';
import { CanvasTexture, LinearFilter, SRGBColorSpace, Texture } from 'three';
import { ASSETS_URL, climbUi, lookupAsset, useManifest } from '@so-chung/core';
import { CROPS, SIGN, STEP, labelFontPx } from './climbLayout';
import { nodeValue, siblingValue, type ClimbTier, type ClimbTree } from './climbLogic';

export const ART = {
  trunk: 'sprites/man-12-leo-cay/than-cay',
  root: 'sprites/man-12-leo-cay/goc-cay',
  crown: 'sprites/man-12-leo-cay/ngon-cay',
  /** Tùy chọn (chưa có trong bộ đồ họa, xem bảng "Đồ họa cần tạo" ở spec 08): thiếu thì dùng hình vẽ bằng code */
  step: 'sprites/man-12-leo-cay/bac-go',
  stepCrack: 'sprites/man-12-leo-cay/bac-go-nut',
  fakeLeaf: 'ui/tiles/la-gia',
} as const;
export type ArtKey = keyof typeof ART;
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

/** Nạp mọi hình của màn (một lần), giải phóng khi rời màn. Hình nào thiếu thì null. */
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
          const t = prepare(new Texture(img));
          if (key === 'trunk') crop(t, CROPS.trunk);
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

/** Phông chữ số (cùng phông tiêu đề của trang). */
const FONT = '"Baloo 2", "Be Vietnam Pro", system-ui, sans-serif';

const dprOf = (): number => (typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1));

/** Tấm ván gỗ vẽ bằng code (khi thiếu `bac-go`): nền gỗ chuyển màu, vân, hai đinh, viền tối. */
function paintPlank(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const r = h * 0.22;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#d9a45c');
  g.addColorStop(0.5, '#bd8443');
  g.addColorStop(1, '#8f5d2c');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#5a3a1c';
  ctx.lineWidth = Math.max(2, h * 0.07);
  ctx.beginPath();
  ctx.roundRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth, r);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,58,28,0.35)';
  ctx.lineWidth = Math.max(1, h * 0.03);
  for (const [y, a, b] of [
    [0.2, 0.08, 0.7],
    [0.82, 0.3, 0.92],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(w * a, h * y);
    ctx.lineTo(w * b, h * y);
    ctx.stroke();
  }
  ctx.fillStyle = '#4a2f16';
  for (const x of [0.07, 0.93]) {
    ctx.beginPath();
    ctx.arc(w * x, h * 0.5, h * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Chữ số ghi trên bậc: màu kem, viền nâu đậm cho dễ đọc trên nền gỗ. */
function paintNumber(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, fontPx: number): void {
  ctx.font = `800 ${fontPx}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, fontPx * 0.18);
  ctx.strokeStyle = '#3b2410';
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = '#fff6dc';
  ctx.fillText(text, cx, cy);
}

export interface ClimbLabels {
  /** Bậc gỗ có số, khóa là giá trị số */
  steps: Map<number, CanvasTexture>;
  /** Biển khắc "Gốc trong sổ" kèm số gốc trong sổ */
  sign: CanvasTexture;
  /** Cỡ chữ số đã dùng (px CSS) */
  fontPx: number;
}

/** Mọi giá trị cần vẽ trên bậc của một vòng: nút và anh em trên đường, cùng mọi bậc lựa chọn. */
export function labelValues(tree: ClimbTree, tiers: readonly ClimbTier[]): number[] {
  const set = new Set<number>();
  for (let k = 0; k <= tree.depth; k++) {
    set.add(nodeValue(tree, k));
    if (k < tree.depth) set.add(siblingValue(tree, k));
  }
  for (const t of tiers) for (const v of t.options) set.add(v);
  return [...set];
}

/**
 * Bậc gỗ có số của một vòng, vẽ theo số điểm ảnh thật (`ppu`: px CSS mỗi đơn vị) để chữ số ≥ 16 px (Chữ to nhân 1,15), và biển "Gốc trong sổ".
 * `plank` là ảnh `bac-go` nếu có. Mọi texture do hàm này tạo, người gọi giải phóng.
 */
export function drawRoundLabels(tree: ClimbTree, tiers: readonly ClimbTier[], ppu: number, largeText: boolean, plank: CanvasImageSource | null): ClimbLabels {
  const dpr = dprOf();
  const w = Math.max(64, Math.min(512, Math.round(STEP.width * ppu * dpr)));
  const h = Math.max(32, Math.min(256, Math.round(STEP.height * ppu * dpr)));
  const values = labelValues(tree, tiers);
  const probe = document.createElement('canvas').getContext('2d');
  let widest = 0;
  if (probe) {
    probe.font = `800 100px ${FONT}`;
    for (const v of values) widest = Math.max(widest, probe.measureText(String(v)).width / 100);
  }
  const fontPx = labelFontPx(ppu, largeText, widest || 4);
  const steps = new Map<number, CanvasTexture>();
  for (const v of values) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (ctx) {
      if (plank) ctx.drawImage(plank, 0, 0, w, h);
      else paintPlank(ctx, w, h);
      paintNumber(ctx, String(v), w / 2, h * 0.5, fontPx * dpr);
    }
    steps.set(v, prepare(new CanvasTexture(c)) as CanvasTexture);
  }
  // biển gỗ trên ngọn
  const sw = Math.max(96, Math.min(768, Math.round(SIGN.width * ppu * dpr)));
  const sh = Math.max(48, Math.min(384, Math.round(SIGN.height * ppu * dpr)));
  const sc = document.createElement('canvas');
  sc.width = sw;
  sc.height = sh;
  const sctx = sc.getContext('2d');
  if (sctx) {
    paintPlank(sctx, sw, sh);
    const small = Math.max(16 * dpr, Math.min(fontPx * dpr * 0.9, sh * 0.34));
    paintNumber(sctx, climbUi.gocTrongSo, sw / 2, sh * 0.3, small);
    paintNumber(sctx, String(tree.book[tree.depth][0]), sw / 2, sh * 0.7, Math.max(16 * dpr, Math.min(fontPx * dpr, sh * 0.4)));
  }
  return { steps, sign: prepare(new CanvasTexture(sc)) as CanvasTexture, fontPx };
}

/** Vết nứt phủ lên bậc sai (nền trong suốt): dùng khi không có ảnh `bac-go-nut`. */
export function makeCrackTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 80;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.strokeStyle = '#2b1808';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(120, 0);
    ctx.lineTo(136, 24);
    ctx.lineTo(112, 40);
    ctx.lineTo(140, 60);
    ctx.lineTo(126, 80);
    ctx.moveTo(136, 24);
    ctx.lineTo(176, 30);
    ctx.moveTo(112, 40);
    ctx.lineTo(76, 36);
    ctx.stroke();
  }
  return prepare(new CanvasTexture(c)) as CanvasTexture;
}

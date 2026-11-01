/**
 * Hình của màn 9 "Bắn trứng khắc dấu": trứng vẽ bằng canvas 2D (quả trứng oval có bóng mềm, dấu khắc tròn kiểu đóng dấu, số ở giữa), nạp hình theo manifest nếu có
 * (thiếu file thì dùng hình vẽ bằng code, không lỗi trang). Mỗi số một màu cố định; số luôn hiện rõ nên không phân biệt chỉ bằng màu.
 * Bộ nhớ đệm hình trứng (`SpriteCache`) tạo hình khi đổi cỡ, không tạo gì trong vòng vẽ; `dispose` trả lại khi rời màn.
 */
import { useEffect, useState } from 'react';
import { ASSETS_URL, lookupAsset, useManifest } from '@so-chung/core';

const DIR = 'sprites/man-09-ban-trung/';
export const ART = {
  nen: `${DIR}nen-pc`,
  khung: `${DIR}khung-ban`,
  may: `${DIR}may-ban`,
  vo: `${DIR}trung-vo`,
} as const;
export const EGG_IMAGES = 7;
export const eggArtPath = (i: number): string => `${DIR}trung-${i + 1}`;

export interface BubbleImages {
  nen: HTMLImageElement | null;
  khung: HTMLImageElement | null;
  may: HTMLImageElement | null;
  vo: HTMLImageElement | null;
  /** Bảy kiểu trứng không số (trung-1 đến trung-7) */
  trung: (HTMLImageElement | null)[];
  /** Đã thử nạp xong (kể cả không có file nào) */
  done: boolean;
}

const EMPTY: BubbleImages = { nen: null, khung: null, may: null, vo: null, trung: new Array<HTMLImageElement | null>(EGG_IMAGES).fill(null), done: false };

/** Nạp mọi hình của màn (một lần). Không có manifest hay thiếu file thì để null và `done` vẫn thành true để màn chạy bằng hình vẽ code. */
export function useBubbleImages(): BubbleImages {
  const manifest = useManifest();
  const [imgs, setImgs] = useState<BubbleImages>(EMPTY);
  useEffect(() => {
    if (!manifest) return;
    let alive = true;
    const load = (path: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const url = lookupAsset(manifest, ASSETS_URL, path);
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    const eggs = Array.from({ length: EGG_IMAGES }, (_, i) => load(eggArtPath(i)));
    void Promise.all([load(ART.nen), load(ART.khung), load(ART.may), load(ART.vo), Promise.all(eggs)]).then(([nen, khung, may, vo, trung]) => {
      if (alive) setImgs({ nen, khung, may, vo, trung, done: true });
    });
    return () => {
      alive = false;
    };
  }, [manifest]);
  return imgs;
}

// ---------------------------------------------------------------- màu theo số

/** Màu cố định của mỗi số: góc màu theo tỉ lệ vàng (hai số khác nhau luôn khác góc), sáng tối xen kẽ để thêm khác biệt */
export function eggColor(v: number): { fill: string; edge: string; ink: string; hue: number } {
  const hue = Math.round((v * 137.508) % 360);
  const light = v % 2 === 0 ? 70 : 62;
  return { hue, fill: `hsl(${hue} 72% ${light}%)`, edge: `hsl(${hue} 55% ${light - 28}%)`, ink: '#2b1809' };
}

export const eggImageIndex = (v: number): number => v % EGG_IMAGES;

// ---------------------------------------------------------------- vẽ trứng

/** Đường viền quả trứng: hơi thon ở phía trên, rộng 0,94 và cao 1 so với đường kính d */
function eggPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, d: number): void {
  const w = d * 0.47;
  const h = d * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.bezierCurveTo(cx + w * 0.86, cy - h, cx + w, cy - h * 0.1, cx + w, cy + h * 0.22);
  ctx.bezierCurveTo(cx + w, cy + h * 0.8, cx + w * 0.62, cy + h, cx, cy + h);
  ctx.bezierCurveTo(cx - w * 0.62, cy + h, cx - w, cy + h * 0.8, cx - w, cy + h * 0.22);
  ctx.bezierCurveTo(cx - w, cy - h * 0.1, cx - w * 0.86, cy - h, cx, cy - h);
  ctx.closePath();
}

/** Vẽ một quả trứng mang số `v`, đường kính `d` (điểm ảnh), tâm (cx, cy). `img` là kiểu trứng không số nếu đã nạp được. Chỉ gọi khi tạo hình trong bộ nhớ đệm hay ở các nút nhỏ */
export function drawEgg(ctx: CanvasRenderingContext2D, cx: number, cy: number, d: number, v: number, img: HTMLImageElement | null, fontPx: number): void {
  const col = eggColor(v);
  ctx.save();
  if (img) {
    ctx.drawImage(img, cx - d / 2, cy - d / 2, d, d);
  } else {
    // bóng mềm dưới trứng
    ctx.fillStyle = 'rgba(60,35,10,0.22)';
    ctx.beginPath();
    ctx.ellipse(cx + d * 0.03, cy + d * 0.44, d * 0.34, d * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    eggPath(ctx, cx, cy - d * 0.02, d * 0.96);
    const g = ctx.createRadialGradient(cx - d * 0.16, cy - d * 0.22, d * 0.04, cx, cy, d * 0.55);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.28, col.fill);
    g.addColorStop(1, col.edge);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, d * 0.05);
    ctx.strokeStyle = col.edge;
    ctx.stroke();
    // dấu khắc tròn kiểu đóng dấu: vòng đôi quanh chữ số
    ctx.strokeStyle = 'rgba(43,24,9,0.55)';
    ctx.lineWidth = Math.max(1, d * 0.035);
    ctx.beginPath();
    ctx.arc(cx, cy + d * 0.03, d * 0.31, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.8, d * 0.02);
    ctx.beginPath();
    ctx.arc(cx, cy + d * 0.03, d * 0.265, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.font = `800 ${fontPx}px "Baloo 2", "Nunito", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, fontPx * 0.22);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeText(String(v), cx, cy + d * 0.04);
  ctx.fillStyle = col.ink;
  ctx.fillText(String(v), cx, cy + d * 0.04);
  ctx.restore();
}

/** Bộ nhớ đệm hình trứng theo (số, cỡ): mỗi hình là một canvas nhỏ, có chừa lề cho bóng */
export class SpriteCache {
  private map = new Map<string, HTMLCanvasElement>();

  get(v: number, d: number, fontPx: number, img: HTMLImageElement | null): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    const key = `${v}|${Math.round(d)}|${fontPx}|${img ? 1 : 0}`;
    let c = this.map.get(key);
    if (!c) {
      const side = Math.ceil(d * 1.3);
      c = document.createElement('canvas');
      c.width = side;
      c.height = side;
      const ctx = c.getContext('2d');
      if (ctx) drawEgg(ctx, side / 2, side / 2, d, v, img, fontPx);
      this.map.set(key, c);
    }
    return c;
  }

  /** Bỏ hết hình đã tạo (khi đổi cỡ hay rời màn) */
  clear(): void {
    for (const c of this.map.values()) {
      c.width = 0;
      c.height = 0;
    }
    this.map.clear();
  }
}

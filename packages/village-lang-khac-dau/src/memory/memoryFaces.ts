/**
 * Mặt trước của thẻ màn 8, do code vẽ (spec 07): "Khuôn tập" + số x, hoặc "Mẫu công khai" + số y. Không tên, không chân dung.
 * Cả 24 mặt (12 khuôn tập, 12 mẫu công khai) và mặt sau vẽ chung một tấm atlas để mọi thẻ dùng chung một lần đẩy ảnh lên GPU. Ảnh thẻ gốc có nền trắng ở bốn góc nên khi vẽ
 * được cắt bớt mép và bo góc (góc ngoài để trong suốt).
 * Phần thuần (chỉ số mặt, ô atlas, ngắt dòng) có test; phần vẽ dùng canvas của trình duyệt.
 */
import { memoryUi } from '@so-chung/core';
import { publicKey } from '@so-chung/core/lessons/bai-3/logic';
import { PRACTICE_KEYS } from './memoryConfig';
import type { MemoryCard } from './memoryLogic';

/** Atlas 5 × 5 ô: ô 0 đến 11 là khuôn tập (theo thứ tự PRACTICE_KEYS), 12 đến 23 là mẫu công khai của khuôn đó, ô 24 là mặt sau. */
export const ATLAS_COLS = 5;
export const ATLAS_ROWS = 5;
export const FACE_COUNT = PRACTICE_KEYS.length * 2;
export const BACK_CELL = FACE_COUNT;

/** Chỉ số mặt của một thẻ trong atlas. */
export function faceIndex(card: Pick<MemoryCard, 'type' | 'pairKey'>): number {
  const k = (PRACTICE_KEYS as readonly number[]).indexOf(card.pairKey);
  return card.type === 'khuon' ? k : PRACTICE_KEYS.length + k;
}

/** Thẻ của mặt thứ f: loại, nhãn và số in trên mặt. */
export function faceOf(f: number): { type: 'khuon' | 'mau'; label: string; value: number } {
  const n = PRACTICE_KEYS.length;
  const x = PRACTICE_KEYS[f % n];
  return f < n ? { type: 'khuon', label: memoryUi.nhanKhuon, value: x } : { type: 'mau', label: memoryUi.nhanMau, value: publicKey(x) };
}

/** Ô thứ f trong atlas theo tọa độ texture (v = 0 ở dưới): offset và repeat. */
export function atlasCell(f: number): { offsetX: number; offsetY: number; repeatX: number; repeatY: number } {
  const col = f % ATLAS_COLS;
  const row = Math.floor(f / ATLAS_COLS);
  return { offsetX: col / ATLAS_COLS, offsetY: 1 - (row + 1) / ATLAS_ROWS, repeatX: 1 / ATLAS_COLS, repeatY: 1 / ATLAS_ROWS };
}

/** Ngắt dòng theo từ cho vừa `maxWidth` (một từ dài hơn vẫn đứng riêng một dòng). */
export function wrapWords(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${w}` : w;
    if (line && measure(next) > maxWidth) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Phông chữ trên mặt thẻ (cùng phông tiêu đề của trang). */
export const FACE_FONT = '"Baloo 2", "Be Vietnam Pro", system-ui, sans-serif';

export interface FaceArt {
  back: CanvasImageSource | null;
  khuon: CanvasImageSource | null;
  mau: CanvasImageSource | null;
}

const PANEL = { w: 0.86, h: 0.8 };
const FALLBACK = { khuon: '#6b3fa0', mau: '#2f5bb5', back: '#5b2d8c' } as const;
/** Ảnh thẻ gốc: mép trắng chiếm chừng 3,5% mỗi cạnh; góc bo chừng 9% cạnh thẻ. */
const ART_TRIM = 0.035;
const CORNER = 0.09;

/** Vẽ ảnh thẻ (hay màu thay thế) vào ô, cắt mép trắng và bo góc. */
function drawCardArt(ctx: CanvasRenderingContext2D, img: CanvasImageSource | null, color: string, x0: number, y0: number, cell: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x0, y0, cell, cell, cell * CORNER);
  ctx.clip();
  const size = img as { width?: number; height?: number } | null;
  const w = Number(size?.width ?? 0);
  const h = Number(size?.height ?? 0);
  if (img && w > 0 && h > 0) ctx.drawImage(img, w * ART_TRIM, h * ART_TRIM, w * (1 - 2 * ART_TRIM), h * (1 - 2 * ART_TRIM), x0, y0, cell, cell);
  else {
    ctx.fillStyle = color;
    ctx.fillRect(x0, y0, cell, cell);
  }
  ctx.restore();
}
const INK = '#2b1d14';
const PAPER = '#fdf6e3';

/**
 * Vẽ atlas 24 mặt trước và mặt sau, mỗi ô `cell` điểm ảnh. `labelPx`, `numberPx`, `minLabelPx` là cỡ chữ theo điểm ảnh của ô (đã đổi từ px CSS trên màn hình). Thiếu ảnh nền
 * thẻ thì tô màu thay thế. Trả về cỡ nhãn nhỏ nhất đã dùng (điểm ảnh của ô).
 */
export function drawFaceAtlas(canvas: HTMLCanvasElement, art: FaceArt, cell: number, labelPx: number, numberPx: number, minLabelPx: number): number {
  canvas.width = cell * ATLAS_COLS;
  canvas.height = cell * ATLAS_ROWS;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  let smallest = Infinity;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCardArt(ctx, art.back, FALLBACK.back, (BACK_CELL % ATLAS_COLS) * cell, Math.floor(BACK_CELL / ATLAS_COLS) * cell, cell);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let f = 0; f < FACE_COUNT; f++) {
    const face = faceOf(f);
    const x0 = (f % ATLAS_COLS) * cell;
    const y0 = Math.floor(f / ATLAS_COLS) * cell;
    drawCardArt(ctx, face.type === 'khuon' ? art.khuon : art.mau, FALLBACK[face.type], x0, y0, cell);
    // Khung giấy giữa thẻ để chữ đọc rõ trên nền hoa văn
    const pw = cell * PANEL.w;
    const ph = cell * PANEL.h;
    const px = x0 + (cell - pw) / 2;
    const py = y0 + (cell - ph) / 2 + cell * 0.03;
    ctx.fillStyle = PAPER;
    ctx.strokeStyle = FALLBACK[face.type];
    ctx.lineWidth = Math.max(2, cell * 0.025);
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, cell * 0.06);
    ctx.fill();
    ctx.stroke();
    // Nhãn (tối đa 2 dòng) và số, thu nhỏ cho vừa khung giấy nhưng không dưới `minLabelPx`
    const fit = fitFaceText(face.label, pw * 0.92, ph * 0.94, labelPx, numberPx, minLabelPx, (s, size) => {
      ctx.font = `700 ${size}px ${FACE_FONT}`;
      return ctx.measureText(s).width;
    });
    smallest = Math.min(smallest, fit.label);
    ctx.fillStyle = INK;
    ctx.font = `700 ${fit.label}px ${FACE_FONT}`;
    const lh = fit.label * LINE;
    let y = py + (ph - fit.height) / 2 + lh / 2;
    for (const l of fit.lines) {
      ctx.fillText(l, px + pw / 2, y);
      y += lh;
    }
    ctx.font = `800 ${fit.number}px ${FACE_FONT}`;
    ctx.fillStyle = FALLBACK[face.type];
    ctx.fillText(String(face.value), px + pw / 2, y - lh / 2 + fit.number / 2 + fit.label * 0.1);
  }
  return smallest;
}

/** Khoảng cách dòng của nhãn (nhân cỡ chữ). */
const LINE = 1.15;

/**
 * Cỡ chữ vừa khung giấy: nhãn tối đa 2 dòng (ngắt theo từ) cộng một dòng số phải lọt `maxH`. Thử cỡ mong muốn trước, rồi thu nhỏ dần từng nửa điểm ảnh, không dưới `minLabel`;
 * số không nhỏ hơn nhãn. `measure(s, px)` đo bề rộng chuỗi ở cỡ px.
 */
export function fitFaceText(
  label: string,
  maxW: number,
  maxH: number,
  labelPx: number,
  numberPx: number,
  minLabel: number,
  measure: (s: string, px: number) => number,
): { label: number; number: number; lines: string[]; height: number } {
  let size = Math.max(labelPx, minLabel);
  for (;;) {
    const lines = wrapWords(label, maxW, (s) => measure(s, size));
    const text = lines.length * size * LINE;
    const number = Math.max(size, Math.min(numberPx, maxH - text));
    const ok = lines.length <= 2 && text + number <= maxH;
    if (ok || size <= minLabel) return { label: size, number, lines, height: text + number };
    size = Math.max(minLabel, size - 0.5);
  }
}

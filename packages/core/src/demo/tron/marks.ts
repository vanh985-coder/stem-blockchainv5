/** Mốc giây của chế độ trọn: ghi giờ bắt đầu từng mã đoạn (từ khung hình đầu tiên của S01), giữ mức tối thiểu mỗi đoạn, nút tải moc-giay.txt khi hết video. */
import type { Ctx } from '../actions';
import { TRON_FLOOR_SCALE } from '../config';
import { minDoanMs } from './doan';

export interface Mark {
  code: string;
  /** Mili giây từ khung hình đầu của S01 */
  ms: number;
}

let t0 = 0;
let cur: { code: string; at: number } | null = null;
const marks: Mark[] = [];

declare global {
  interface Window {
    __tronMarks?: Mark[];
  }
}

export function tronReset(): void {
  t0 = 0;
  cur = null;
  marks.length = 0;
  if (typeof window !== 'undefined') window.__tronMarks = marks;
}

/** Định dạng "m:ss" (làm tròn xuống giây). */
export function formatMark(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function marksText(list: readonly Mark[] = marks): string {
  return list.map((m) => `${m.code} ${formatMark(m.ms)}`).join('\n') + '\n';
}

export const getMarks = (): readonly Mark[] => marks;

/** Chờ thời gian thật (không chia theo nhịp), dừng được bằng P/N/Esc. */
async function rawWait(ctx: Ctx, ms: number): Promise<void> {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    await ctx.ctl.checkpoint();
    await new Promise((r) => setTimeout(r, Math.min(80, Math.max(1, end - performance.now()))));
  }
}

/** Mức tối thiểu của đoạn hiện tại: nếu bot xong sớm thì đứng chờ cho đủ. */
export async function endSeg(ctx: Ctx): Promise<void> {
  if (!cur) return;
  const need = minDoanMs(cur.code) * TRON_FLOOR_SCALE - (performance.now() - cur.at);
  if (need > 0) await rawWait(ctx, need);
}

/** Ghi mốc bắt đầu của đoạn `code` (đúng lúc hình của đoạn đó hiện ra). */
export function markSeg(code: string): void {
  const now = performance.now();
  if (marks.length === 0) t0 = now;
  marks.push({ code, ms: Math.round(now - t0) });
  cur = { code, at: now };
  console.info(`[tron] ${code} ${formatMark(now - t0)}`);
}

/** Xong đoạn trước (đủ mức tối thiểu) rồi ghi mốc đoạn mới. */
export async function beginSeg(ctx: Ctx, code: string): Promise<void> {
  await endSeg(ctx);
  markSeg(code);
}

/** Đoạn mới có thể bắt đầu từ lúc bắt đầu demo (S01 hiện ngay): dùng khi nhảy vào giữa chừng (`&tu=`). */
export function currentSeg(): string | null {
  return cur?.code ?? null;
}

/** Thời lượng thực tế mỗi đoạn (mili giây) = mốc đoạn sau trừ mốc đoạn này; đoạn cuối tính tới `endMs`. */
export function segmentDurations(list: readonly Mark[], endMs: number): { code: string; ms: number }[] {
  return list.map((m, i) => ({ code: m.code, ms: (i + 1 < list.length ? list[i + 1].ms : endMs) - m.ms }));
}

/** Hết video: nút "Tải mốc giây" tải file moc-giay.txt. */
export function showMarksButton(label: string): void {
  if (typeof document === 'undefined') return;
  document.getElementById('tron-marks-btn')?.remove();
  const b = document.createElement('button');
  b.id = 'tron-marks-btn';
  b.type = 'button';
  b.textContent = label;
  b.setAttribute('data-testid', 'tron-tai-moc');
  b.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483600;padding:16px 28px;font:700 24px system-ui,sans-serif;background:#fff;color:#111;border:4px solid #111;border-radius:16px;cursor:pointer';
  b.onclick = () => {
    const url = URL.createObjectURL(new Blob([marksText()], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'moc-giay.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  document.body.appendChild(b);
}

/**
 * Video hướng dẫn: ghi mốc thời gian từng màn để bảng thời lượng (script kiểm) biết phần hướng dẫn / chơi thường / tua / kết quả.
 * Tua nhanh bật/tắt qua đây để mọi chỗ bật tua đều có mốc. Chỉ dùng khi `DEMO_HD`.
 */
import { DEMO_HD } from './config';
import { resetTimeScale, setFastForward } from './timeScale';

export interface HdRow {
  level: number;
  /** giây (thời gian thật khi quay) */
  guide: number;
  normal: number;
  ff: number;
  result: number;
  total: number;
}

type Marks = { start?: number; guideEnd?: number; ffStart?: number; ffEnd?: number; end?: number };
let level = 0;
let marks: Marks = {};
const rows: HdRow[] = [];

const sec = (a: number | undefined, b: number | undefined): number => (a === undefined || b === undefined ? 0 : Math.round(((b - a) / 1000) * 10) / 10);

export function hdBegin(n: number): void {
  if (!DEMO_HD) return;
  level = n;
  marks = { start: performance.now() };
  resetTimeScale();
}

export function hdGuideEnd(): void {
  if (DEMO_HD && marks.guideEnd === undefined) marks.guideEnd = performance.now();
}

/** Bật tua nhanh (mốc: hết phần chơi thường). */
export function startFastForward(): void {
  if (!DEMO_HD || marks.ffStart !== undefined) return;
  marks.ffStart = performance.now();
  setFastForward(true);
}

/** Tắt tua nhanh (màn kết quả hiện ra). */
export function stopFastForward(): void {
  if (!DEMO_HD) return;
  if (marks.ffStart !== undefined && marks.ffEnd === undefined) marks.ffEnd = performance.now();
  setFastForward(false);
}

export function hdEnd(): void {
  if (!DEMO_HD || marks.start === undefined) return;
  stopFastForward();
  marks.end = performance.now();
  const m = marks;
  const guideEnd = m.guideEnd ?? m.ffStart ?? m.start;
  const ffStart = m.ffStart ?? m.end;
  const ffEnd = m.ffEnd ?? ffStart;
  const row: HdRow = {
    level,
    guide: sec(m.start, guideEnd),
    normal: sec(guideEnd, ffStart),
    ff: sec(ffStart, ffEnd),
    result: sec(ffEnd, m.end),
    total: sec(m.start, m.end),
  };
  rows.push(row);
  const w = window as unknown as { __demoStats?: Record<string, unknown> };
  w.__demoStats = { ...(w.__demoStats ?? {}), hd: [...rows] };
  console.info(`[demo] hd ${JSON.stringify(row)}`);
  marks = {};
}

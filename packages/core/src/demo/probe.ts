import { DEMO_BUILD } from './config';

/** Cầu nối trạng thái của một game cho bot demo (chỉ có ở bản build VITE_DEMO): game ghi dữ liệu thuần mỗi lần vẽ, bot đọc. Không ảnh hưởng luật chơi. */
export function demoProbe(name: string, value: unknown): void {
  if (!DEMO_BUILD || typeof window === 'undefined') return;
  const w = window as unknown as { __demoProbe?: Record<string, unknown> };
  (w.__demoProbe ??= {})[name] = value;
}

export function getProbe<T>(name: string): T | undefined {
  return (window as unknown as { __demoProbe?: Record<string, unknown> }).__demoProbe?.[name] as T | undefined;
}

const warned = new Set<string>();

/** Chỉ cảnh báo ở chế độ dev, mỗi nội dung một lần. */
export function devWarn(message: string): void {
  if (!import.meta.env.DEV || warned.has(message)) return;
  warned.add(message);
  console.warn(`[so-chung] ${message}`);
}

/**
 * Cầu nối đo kiểm (window.__walkPlayer, __world…): có khi chạy dev, hoặc khi build bản đo với VITE_PROBE=true (đo FPS và độ khựng trên bản build thật). Bản phát hành không có.
 */
export const PROBE: boolean = import.meta.env.DEV || import.meta.env.VITE_PROBE === 'true';

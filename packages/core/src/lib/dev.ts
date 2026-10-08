const warned = new Set<string>();

/** Chỉ cảnh báo ở chế độ dev, mỗi nội dung một lần. */
export function devWarn(message: string): void {
  if (!import.meta.env.DEV || warned.has(message)) return;
  warned.add(message);
  console.warn(`[so-chung] ${message}`);
}

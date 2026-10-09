import { hasAsset, type Manifest } from '../assets/manifest';

/** Tâm trạng của một lượt thoại. Mới có 'vui': dùng ảnh cười của người nói nếu manifest có. */
export type Mood = 'vui';

/** Hậu tố tên file chân dung cười: ui/portraits/<id>-cuoi. */
export const MOOD_SUFFIX: Record<Mood, string> = { vui: '-cuoi' };

/**
 * Hàm thuần: chọn ảnh chân dung theo tâm trạng. Lượt 'vui' mà manifest có ui/portraits/<id>-cuoi thì dùng ảnh đó,
 * không có (hoặc chưa tải xong manifest, hoặc không có tâm trạng) thì giữ ảnh thường.
 */
export function portraitForMood(portrait: string, mood: Mood | undefined, manifest: Manifest | null | undefined): string {
  if (!mood) return portrait;
  const candidate = `${portrait}${MOOD_SUFFIX[mood]}`;
  return hasAsset(manifest, `ui/portraits/${candidate}`) ? candidate : portrait;
}

/** Tốc độ chữ hiện dần: khoảng 35 ký tự mỗi giây. */
export const TYPE_CPS = 35;

/** Tách chuỗi theo ký tự (không cắt đôi cặp thay thế như emoji). */
export function glyphs(text: string): string[] {
  return Array.from(text);
}

/** Hàm thuần: sau `elapsedMs` mili giây đã hiện bao nhiêu ký tự (trong khoảng 0 đến `total`). */
export function revealedCount(elapsedMs: number, total: number, cps: number = TYPE_CPS): number {
  if (!(elapsedMs > 0) || total <= 0) return 0;
  return Math.min(total, Math.floor((elapsedMs * cps) / 1000));
}

/** Hàm thuần: chữ đã hiện và chữ chưa hiện khi đã hiện `count` ký tự. */
export function splitRevealed(text: string, count: number): { shown: string; rest: string } {
  const g = glyphs(text);
  const n = Math.max(0, Math.min(g.length, Math.floor(count)));
  return { shown: g.slice(0, n).join(''), rest: g.slice(n).join('') };
}

/**
 * Hàm thuần: bấm "Tiếp" (hoặc Enter, Space, →) lúc này làm gì? Chữ chưa hiện hết thì hiện hết ngay;
 * đã hiện hết rồi thì mới sang lượt kế.
 */
export function stepOnNext(count: number, total: number): 'reveal' | 'advance' {
  return count < total ? 'reveal' : 'advance';
}

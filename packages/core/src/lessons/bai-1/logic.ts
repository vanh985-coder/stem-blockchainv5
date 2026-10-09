import { pageCode, MOD, buildChain, isSafeDelta } from '../../lib/chain';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createMulberry32, randInt } from '../../lib/rng';

export { pageCode, MOD, buildChain, isSafeDelta };
export type Page = { content: number; code: number };
const C = GAME_CONFIG.lesson1;

export interface Lesson1Data {
  genesisCode: number;
  contents: number[];
  codes: number[];
}

// index 0-based trong mảng pages (trang 1 = index 0), -1 nếu khớp hết.
// So với mã ĐANG GHI của trang trước, không tính lại cả chuỗi.
export function firstInvalidIndex(genesisCode: number, pages: Page[]): number {
  let prev = genesisCode;
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].code !== pageCode(prev, pages[i].content)) return i;
    prev = pages[i].code;
  }
  return -1;
}

// Chọn nội dung mới 0–99 có độ chênh an toàn.
export function pickSafeContent(old: number, rng: () => number): number {
  while (true) {
    const candidate = Math.floor(rng() * 100);
    if (isSafeDelta(old, candidate)) {
      return candidate;
    }
  }
}

export function randomGenesis(rng: () => number): number {
  return C.genesisMin + Math.floor(rng() * (C.genesisMax - C.genesisMin + 1));
}

export function randomContents(n: number, rng: () => number): number[] {
  const arr: number[] = [];
  for (let i = 0; i < n; i++) {
    arr.push(randInt(0, 99, rng));
  }
  return arr;
}

/** Số trang của trạm Dễ. */
export const EASY_PAGES = 5;

/**
 * Một lượt của trạm Dễ "Xây chuỗi 5 trang": mã trang bìa và nội dung 5 trang (0–99) do máy chọn từ `seed`.
 * Cùng seed thì cùng kết quả. Học sinh chỉ tính mã trang, không nhập nội dung.
 */
export function easyRound(seed: number): { genesisCode: number; contents: number[] } {
  const rng = createMulberry32(seed);
  const genesisCode = randomGenesis(rng);
  return { genesisCode, contents: randomContents(EASY_PAGES, rng) };
}

// "Còn phải sửa: N" = số trang từ trang lệch đầu tiên tới trang cuối (bằng công thức 1-indexed trong spec).
export function pagesToFix(firstInvalid: number, length: number): number {
  return firstInvalid === -1 ? 0 : length - firstInvalid;
}

// Khoảng chờ trước lần thêm trang thứ spawnIndex (0-based): 6000, 5700, 5400 … tối thiểu 3000.
// Sau khi em đã "sửa hết" một lần (fast = true): luôn là 2000.
export function spawnDelayMs(spawnIndex: number, fast: boolean): number {
  if (fast) return C.spawnFastMs;
  return Math.max(C.spawnMinMs, C.spawnStartMs - C.spawnStepMs * spawnIndex);
}

export function hardStars(fixed: number): 1 | 2 | 3 {
  return fixed >= C.hardStars.three ? 3 : fixed >= C.hardStars.two ? 2 : 1;
}

// Lời giải từng bước cho mức Dễ
export function solutionSteps(prev: number, content: number) {
  const doubled = prev * C.multiplier;
  const sum = doubled + content;
  return { doubled, sum, code: sum % MOD };
}

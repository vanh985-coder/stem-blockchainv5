/**
 * Bộ tạo số ngẫu nhiên có seed (PRNG) dựa trên thuật toán Mulberry32.
 * Đảm bảo các màn chơi có thể tái lập trạng thái và test được một cách tất định.
 */

export function createMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Instance mặc định dùng seed thời gian hiện tại
let defaultRng = createMulberry32(Date.now());

/**
 * Đặt seed cho bộ sinh số ngẫu nhiên mặc định
 */
export function setSeed(seed: number): void {
  defaultRng = createMulberry32(seed);
}

/**
 * Sinh số nguyên ngẫu nhiên trong khoảng [min, max] (bao gồm cả min và max)
 */
export function randInt(min: number, max: number, rng: () => number = defaultRng): number {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  if (low > high) {
    throw new Error(`min (${min}) không thể lớn hơn max (${max})`);
  }
  return Math.floor(rng() * (high - low + 1)) + low;
}

/**
 * Xáo trộn mảng bằng thuật toán Fisher-Yates (hàm thuần, trả về mảng mới)
 */
export function shuffle<T>(array: readonly T[], rng: () => number = defaultRng): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Chọn ngẫu nhiên một phần tử trong mảng
 */
export function chooseOne<T>(array: readonly T[], rng: () => number = defaultRng): T {
  if (array.length === 0) {
    throw new Error('Mảng rỗng, không thể chọn phần tử');
  }
  const index = Math.floor(rng() * array.length);
  return array[index];
}

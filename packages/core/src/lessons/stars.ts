/**
 * Cách chấm sao theo số lỗi (giữ nguyên từ giai đoạn 1): 0 lỗi → 3 sao; 1 đến 2 lỗi → 2 sao; từ 3 lỗi → 1 sao.
 */
export function starsFromMistakes(mistakes: number): 1 | 2 | 3 {
  if (mistakes <= 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

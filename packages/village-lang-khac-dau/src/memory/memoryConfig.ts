/**
 * Số liệu của màn 8 "Lật thẻ tìm cặp khóa" (spec 07, mục "Màn 8").
 */
export const MEMORY_SPEC = {
  /**
   * Bộ khuôn tập gồm 12 số luyện tay của chú Dũng.
   * Không chứa bất kỳ khóa riêng thật nào của 6 nhân vật chính (12, 13, 15, 17, 19, 21).
   */
  practiceKeys: [3, 5, 6, 7, 8, 9, 10, 11, 14, 16, 18, 20] as const,

  /**
   * 3 vòng chơi:
   * - Vòng 1: 4 cặp, lưới 4 × 2
   * - Vòng 2: 6 cặp, lưới 4 × 3
   * - Vòng 3: 8 cặp, lưới 4 × 4, có {phanDien} tráo thẻ mỗi 20 giây
   */
  rounds: [
    { round: 1, pairs: 4, cols: 4, rows: 2, swapIntervalMs: 0 },
    { round: 2, pairs: 6, cols: 4, rows: 3, swapIntervalMs: 0 },
    { round: 3, pairs: 8, cols: 4, rows: 4, swapIntervalMs: 20000 },
  ] as const,

  /** Thời gian úp lại sau khi lật sai hai thẻ (ms) */
  flipBackDelayMs: 800,

  /** Khoảng cách giữa các lần {phanDien} tráo thẻ ở vòng 3 (ms) */
  swapIntervalMs: 20000,

  /** Điểm mỗi vòng = max(0, roundBaseScore - perErrorPenalty * số lần sai) */
  roundBaseScore: 300,
  perErrorPenalty: 10,

  /** Mốc điểm cả ván (tổng 3 vòng): Đồng, Bạc, Vàng (khai báo theo chuẩn màn 2, 3) */
  medals: [300, 550, 750] as const,
} as const;

export const PRACTICE_KEYS = MEMORY_SPEC.practiceKeys;
export const MEMORY_ROUNDS = MEMORY_SPEC.rounds;
export const MEMORY_MEDALS = MEMORY_SPEC.medals;

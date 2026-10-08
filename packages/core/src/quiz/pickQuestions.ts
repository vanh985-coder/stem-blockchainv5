import { QUESTIONS, type Question, type QuizBai } from '../content/questions';
import { createMulberry32, shuffle } from '../lib/rng';

export interface PickParams {
  /** Một bài hoặc nhiều bài, ví dụ 1 hoặc [1, 2] */
  bai: QuizBai | readonly QuizBai[];
  /** Số câu cần lấy; lớn hơn số câu có sẵn thì lấy hết */
  soCau: number;
  /** Cùng seed thì cùng kết quả */
  seed: number;
}

/**
 * Hàm thuần: chọn câu hỏi cho một ván.
 * - Không lặp câu; thứ tự câu và thứ tự đáp án đều được trộn.
 * - correctIndex trong kết quả đã cập nhật theo thứ tự đáp án mới.
 * - Không sửa ngân hàng gốc (trả về bản sao).
 */
export function pickQuestions({ bai, soCau, seed }: PickParams, bank: readonly Question[] = QUESTIONS): Question[] {
  const wanted = new Set<number>(Array.isArray(bai) ? bai : [bai as number]);
  const pool = bank.filter((q) => wanted.has(q.bai));
  const rng = createMulberry32(seed);
  const n = Math.min(Math.max(0, Math.floor(soCau)), pool.length);
  return shuffle(pool, rng)
    .slice(0, n)
    .map((q) => {
      const order = shuffle(
        q.options.map((_, i) => i),
        rng,
      );
      return {
        ...q,
        options: order.map((i) => q.options[i]),
        correctIndex: order.indexOf(q.correctIndex),
      };
    });
}

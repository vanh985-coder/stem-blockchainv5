import { fmt } from '../content/characters';
import { questionById } from '../content/questions';
import { teacherTexts } from '../content/teacher';

/** Một dòng của hàm Postgres class_quiz_stats(cid). bigint có thể về dạng số hoặc chuỗi. */
export interface QuizStatRow {
  question_id: string;
  total: number | string;
  correct: number | string;
}

export interface QuestionStat {
  id: string;
  /** Nội dung câu hỏi (đã qua fmt); không có trong ngân hàng thì "Câu <mã>" */
  text: string;
  /** 1 đến 4; 0 = không có trong ngân hàng câu hỏi */
  bai: number;
  total: number;
  correct: number;
  /** Tỉ lệ đúng từ 0 đến 1 */
  rate: number;
}

const toInt = (v: number | string): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
};

/**
 * Tab Câu hỏi: ghép với nội dung trong content/questions.ts rồi xếp câu có tỉ lệ đúng thấp nhất lên trên.
 * Bằng nhau thì câu có nhiều lượt trả lời hơn lên trước, rồi theo mã câu. Dòng 0 lượt bị bỏ.
 */
export function buildQuestionStats(rows: readonly QuizStatRow[]): QuestionStat[] {
  const out: QuestionStat[] = [];
  for (const r of rows) {
    const total = toInt(r.total);
    if (total === 0) continue;
    const correct = Math.min(total, toInt(r.correct));
    const q = questionById(r.question_id);
    out.push({
      id: r.question_id,
      text: q ? fmt(q.text) : teacherTexts.cauHoi.khongTimThay.replace('{ma}', r.question_id),
      bai: q?.bai ?? 0,
      total,
      correct,
      rate: correct / total,
    });
  }
  return out.sort((a, b) => a.rate - b.rate || b.total - a.total || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Phần trăm nguyên (làm tròn) từ tỉ lệ 0..1. */
export function percent(rate: number): number {
  return Math.round(rate * 100);
}

/** Tỉ lệ đúng của một học sinh từ danh sách câu trả lời; null nếu chưa trả lời câu nào. */
export function answerRate(answers: readonly { correct: boolean }[]): { total: number; correct: number; percent: number } | null {
  if (answers.length === 0) return null;
  const correct = answers.filter((a) => a.correct).length;
  return { total: answers.length, correct, percent: percent(correct / answers.length) };
}

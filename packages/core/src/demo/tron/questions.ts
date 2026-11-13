import { QUESTIONS, type Question } from '../../content/questions';

/** Câu hỏi trong ngân hàng với THỨ TỰ ĐÁP ÁN cố định (chế độ trọn): `shown` là các đáp án theo thứ tự hiện lên A, B, C, D. */
export function tronQuestion(id: string, shown?: readonly string[]): Question {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`unknown question: ${id}`);
  const options = shown ? [...shown] : [...q.options];
  if (options.length !== q.options.length || [...options].sort().join('|') !== [...q.options].sort().join('|')) throw new Error(`bad option set for ${id}`);
  return { ...q, options, correctIndex: options.indexOf(q.options[q.correctIndex]) };
}

/**
 * Câu hỏi của thẻ "Em có biết?" (P6b): hàm thuần, không import React. Chuẩn hóa câu trả lời điền số, chấm, và máy trạng thái của một lượt trả lời (mỗi lượt nhặt trả lời MỘT lần).
 * Không có điểm, xu, sao hay tim: kết quả chỉ để hiện đúng/sai và giải thích; thẻ được nhận dù đúng hay sai.
 */
import { KNOW_QUIZ, type KnowQuiz } from '../content/knowQuiz';
import type { VillageId } from '../village';

/** Câu hỏi của thẻ thứ `index` (từ 0) của làng; undefined nếu thẻ không có câu hỏi (ví dụ thẻ thứ 5 của Làng Khắc Dấu). */
export function knowQuizOf(village: VillageId, index: number): KnowQuiz | undefined {
  return KNOW_QUIZ[village]?.[index];
}

/** Số thẻ NHẶT ĐƯỢC của làng = số câu hỏi (mỗi cuộn một thẻ, chỉ số 0 đến n-1; thẻ thứ 5 của Làng Khắc Dấu không có cuộn nên không tính). Dùng làm `total` của mặt nạ `knowCards` ở /ban-do. */
export const knowCollectibleTotal = (village: VillageId): number => KNOW_QUIZ[village]?.length ?? 0;

export type NumberParse = { kind: 'empty' } | { kind: 'invalid' } | { kind: 'ok'; value: number };

/**
 * Chuẩn hóa câu trả lời điền số (quy tắc đã duyệt, docs/specs/P6-NOI-DUNG-THE-TUONG-TAC.md mục 2): bỏ khoảng trắng hai đầu, bỏ MỘT dấu chấm ở cuối, rồi chỉ nhận chữ số ASCII viết liền,
 * không bắt đầu bằng số 0 (trừ chính số 0), tối đa 9 chữ số. Không nhận chữ, số thập phân, dấu phân cách ngàn, dấu +/-, khoảng trắng giữa các chữ số.
 * Trống hay sai định dạng thì KHÔNG phải là một lần trả lời (hiện lời nhắc).
 */
export function parseNumberAnswer(raw: string): NumberParse {
  const t = raw.trim();
  if (t === '') return { kind: 'empty' };
  const body = t.endsWith('.') ? t.slice(0, -1) : t;
  if (!/^(?:0|[1-9][0-9]{0,8})$/.test(body)) return { kind: 'invalid' };
  return { kind: 'ok', value: Number(body) };
}

export type QuizReminder = 'none' | 'chuaChon' | 'trong' | 'dinhDang';

export interface QuizState {
  /** 'ask': đang chờ trả lời; 'feedback': đã trả lời (khóa lựa chọn), hiện đáp án và giải thích */
  phase: 'ask' | 'feedback';
  /** Phương án ABCD đang chọn (0 đến 3) */
  choice: number | null;
  /** Chữ đang gõ ở ô điền số */
  text: string;
  reminder: QuizReminder;
  /** Kết quả của lần trả lời duy nhất; null khi chưa trả lời */
  result: { correct: boolean; given: string } | null;
}

export const initialQuizState = (): QuizState => ({ phase: 'ask', choice: null, text: '', reminder: 'none', result: null });

/** Chọn một phương án; sau khi đã trả lời thì không đổi được. */
export function chooseOption(s: QuizState, i: number): QuizState {
  if (s.phase !== 'ask' || !(i >= 0 && i <= 3) || !Number.isInteger(i)) return s;
  return { ...s, choice: i, reminder: 'none' };
}

/** Gõ vào ô điền số; sau khi đã trả lời thì không đổi được. */
export function typeAnswer(s: QuizState, text: string): QuizState {
  if (s.phase !== 'ask') return s;
  return { ...s, text, reminder: 'none' };
}

/**
 * Nộp câu trả lời. Chưa chọn, để trống hay sai định dạng thì chỉ hiện lời nhắc và ở lại 'ask' (không tính là lần trả lời). Đã ở 'feedback' thì giữ nguyên đúng đối tượng cũ
 * (nộp lần hai, ví dụ bấm Enter lặp, không đổi gì).
 */
export function submitQuiz(s: QuizState, quiz: KnowQuiz): QuizState {
  if (s.phase === 'feedback') return s;
  if (quiz.kind === 'abcd') {
    if (s.choice === null) return { ...s, reminder: 'chuaChon' };
    return { ...s, phase: 'feedback', reminder: 'none', result: { correct: s.choice === quiz.correct, given: String(s.choice) } };
  }
  const p = parseNumberAnswer(s.text);
  if (p.kind === 'empty') return { ...s, reminder: 'trong' };
  if (p.kind === 'invalid') return { ...s, reminder: 'dinhDang' };
  return { ...s, phase: 'feedback', reminder: 'none', result: { correct: p.value === quiz.answer, given: String(p.value) } };
}

/** Chỉ được cất thẻ sau khi đã trả lời (đúng hay sai đều được). */
export const canCollect = (s: QuizState): boolean => s.phase === 'feedback';

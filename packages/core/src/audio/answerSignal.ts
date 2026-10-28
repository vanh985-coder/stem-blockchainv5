/**
 * Tín hiệu "em vừa trả lời đúng/sai" (spec 03 mục 4, `onAnswer(dung)`). Không import React hay three.
 *
 * Mọi chỗ cho em chọn trong cả 4 bài (câu hỏi, Đồng ý/Từ chối, nút kiểm tra…) đều báo kết quả bằng
 * `sound.playCorrect()` hoặc `sound.playWrong()` (hộp phản hồi, QuizCard và các trạm). Hai hàm đó phát tín hiệu này nên
 * khung 3D chỉ cần nghe ở một chỗ, không phải sửa logic từng trạm.
 */

export type AnswerListener = (correct: boolean) => void;

const listeners = new Set<AnswerListener>();
const submissionListeners = new Set<AnswerListener>();

/** Đăng ký nghe. Trả về hàm hủy đăng ký. */
export function onAnswer(listener: AnswerListener, submissionsOnly = false): () => void {
  const target = submissionsOnly ? submissionListeners : listeners;
  target.add(listener);
  return () => target.delete(listener);
}

/** Phát tín hiệu cho mọi người nghe. */
export function emitAnswer(correct: boolean, submitted: boolean | null = correct): void {
  listeners.forEach((l) => l(correct));
  if (submitted !== null) submissionListeners.forEach(l => l(submitted));
}

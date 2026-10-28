/**
 * Quy tắc của hộp phản hồi (FeedbackSheet), tách thành hàm thuần để có test.
 *
 * 1. Mỗi lần nộp báo (phát âm và báo phản ứng nhân vật, lời khen) đúng MỘT lần. "Lần nộp" nhận ra bằng khóa
 *    của nội dung hộp: render lại, callback đổi hay effect nối lại (StrictMode) mang cùng khóa thì không báo lại;
 *    khóa đổi (đúng/sai đổi hoặc nội dung mới) lúc hộp còn mở, hoặc hộp đóng rồi mở lại, là lần nộp mới.
 * 2. Phím Enter nộp đáp án không được đóng luôn hộp vừa mở: chỉ nhận Enter mới bấm sau khi hộp mở
 *    và không phải phím giữ (key repeat).
 */

export interface SubmissionParts {
  isCorrect: boolean;
  title?: string;
  whatHappened: string;
  whyHappened?: string;
  howToFix?: string;
}

/** Khóa của một lần nộp: kết quả cùng nội dung giải thích đang hiện. */
export function submissionKey(p: SubmissionParts): string {
  return JSON.stringify([p.isCorrect, p.title ?? '', p.whatHappened, p.whyHappened ?? '', p.howToFix ?? '']);
}

/** Có phải lần nộp chưa báo không? `announcedKey` là khóa đã báo cho lần mở này (null: chưa báo gì). */
export function shouldAnnounce(announcedKey: string | null, key: string): boolean {
  return announcedKey !== key;
}

/**
 * Enter có được tính là "Tiếp tục" không?
 * `openedAt`: thời điểm (cùng gốc với `event.timeStamp`) hộp báo lần nộp này.
 * Phím nhấn trước hoặc đúng lúc hộp mở (chính phím nộp) và phím lặp khi giữ đều không tính.
 */
export function enterContinues(event: { repeat: boolean; timeStamp: number }, openedAt: number): boolean {
  return !event.repeat && event.timeStamp > openedAt;
}

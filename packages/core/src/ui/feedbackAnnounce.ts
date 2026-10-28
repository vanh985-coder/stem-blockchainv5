/**
 * Hộp phản hồi chỉ báo "em vừa nộp bài" một lần cho mỗi kết quả của lần mở.
 * `announced` là kết quả đã báo (null: chưa báo). Render lại, callback đổi hay effect nối lại
 * mang cùng kết quả thì `answer` là null (vẫn phát âm, không tính lần nộp mới); kết quả đổi thì báo lại.
 */
export function announceOnce(announced: boolean | null, isCorrect: boolean): { answer: boolean | null; announced: boolean } {
  return { answer: announced === isCorrect ? null : isCorrect, announced: isCorrect };
}

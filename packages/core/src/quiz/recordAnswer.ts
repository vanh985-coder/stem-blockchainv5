import { progressManager } from '../progress/singleton';

export interface AnswerRecord {
  questionId: string;
  correct: boolean;
  /** Vị trí đáp án em chọn, theo thứ tự đã trộn trên màn hình */
  chosenIndex: number;
  /** Màn đang hỏi (1 đến 12); 0 = thử thách cuối hoặc không thuộc màn nào */
  levelId?: number;
}

/**
 * Ghi câu trả lời vào bảng quiz_answers: đã đăng nhập thì ghi một dòng, chơi thử thì không ghi.
 * Mất mạng thì bỏ qua (không xếp hàng), không làm gián đoạn ván chơi.
 */
export async function recordAnswer(record: AnswerRecord): Promise<void> {
  await progressManager.recordQuizAnswer(record.levelId ?? 0, record.questionId, record.correct);
}

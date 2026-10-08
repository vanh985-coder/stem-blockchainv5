export interface AnswerRecord {
  questionId: string;
  correct: boolean;
  /** Vị trí đáp án em chọn, theo thứ tự đã trộn trên màn hình */
  chosenIndex: number;
}

/**
 * Ghi câu trả lời vào bảng quiz_answers (spec 02) nếu đã đăng nhập.
 * CHƯA LÀM: bước 6 (Supabase) sẽ viết thân hàm. Hiện chỉ để sẵn chỗ gọi, không làm gì.
 */
export async function recordAnswer(record: AnswerRecord): Promise<void> {
  void record;
}

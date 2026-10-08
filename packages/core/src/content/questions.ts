/**
 * Ngân hàng câu hỏi ôn tập (chép từ docs/specs/CAU-HOI-ON-TAP.md).
 * Mỗi câu: id, bai, text, options (thứ tự gốc), correctIndex, explanation.
 * Chữ viết {phanDien} thay cho tên phản diện; hiện ra màn hình luôn đi qua fmt().
 */

export type QuizBai = 1 | 2 | 3 | 4;

export interface Question {
  id: string;
  bai: QuizBai;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const QUESTIONS: readonly Question[] = [
  {
    id: "B1-01",
    bai: 1,
    text: "Mã trang trước là 40, nội dung trang mới là 25. Mã trang mới là bao nhiêu?",
    options: ["5", "105", "65", "50"],
    correctIndex: 0,
    explanation: "40 × 2 + 25 = 105, giữ 2 chữ số cuối là 05.",
  },
  {
    id: "B1-02",
    bai: 1,
    text: "Trang bìa có mã 10, trang 1 có nội dung 23. Mã trang 1 là bao nhiêu?",
    options: ["43", "33", "230", "46"],
    correctIndex: 0,
    explanation: "10 × 2 + 23 = 43.",
  },
  {
    id: "B1-03",
    bai: 1,
    text: "Mã trang trước là 57, nội dung là 36. Mã trang mới là bao nhiêu?",
    options: ["50", "150", "93", "15"],
    correctIndex: 0,
    explanation: "57 × 2 + 36 = 150, giữ 2 chữ số cuối là 50.",
  },
  {
    id: "B1-04",
    bai: 1,
    text: "Trong công thức mã trang, \"mod 100\" nghĩa là gì?",
    options: ["Chỉ giữ 2 chữ số cuối", "Nhân thêm 100", "Chia cho 100", "Cộng thêm 100"],
    correctIndex: 0,
    explanation: "Ví dụ 131 mod 100 = 31.",
  },
  {
    id: "B1-05",
    bai: 1,
    text: "{phanDien} sửa nội dung trang 2 trong cuốn sổ 5 trang. Những trang nào phải tính lại mã?",
    options: ["Trang 2 và mọi trang phía sau", "Chỉ trang 2", "Chỉ trang 5", "Không trang nào"],
    correctIndex: 0,
    explanation: "Mã trang sau tính từ mã trang trước, nên lệch dây chuyền.",
  },
  {
    id: "B1-06",
    bai: 1,
    text: "Vì sao một người không sửa lén kịp khi làng vẫn ghi trang mới liên tục?",
    options: ["Vì sửa một trang phải tính lại mọi trang sau, mà trang mới cứ được thêm vào", "Vì giấy dó khó viết", "Vì mã trang luôn bằng 0", "Vì sổ bị khóa"],
    correctIndex: 0,
    explanation: "Việc phải sửa tăng nhanh hơn tốc độ sửa.",
  },
  {
    id: "B1-07",
    bai: 1,
    text: "Trang bìa có mã 20, trang 1 có nội dung 15. Mã trang 1 là bao nhiêu?",
    options: ["55", "35", "215", "45"],
    correctIndex: 0,
    explanation: "20 × 2 + 15 = 55.",
  },
  {
    id: "B1-08",
    bai: 1,
    text: "Mã trang 1 là 55, trang 2 có nội dung 50. Mã trang 2 là bao nhiêu?",
    options: ["60", "160", "105", "65"],
    correctIndex: 0,
    explanation: "55 × 2 + 50 = 160, giữ 2 chữ số cuối là 60.",
  },
  {
    id: "B2-01",
    bai: 2,
    text: "Node trong blockchain giống ai trong làng?",
    options: ["Người giữ một bản sao đầy đủ của cuốn sổ", "Người bán vải", "Chính cuốn sổ", "Trưởng làng duy nhất được ghi sổ"],
    correctIndex: 0,
    explanation: "Mỗi node giữ một bản sổ giống hệt nhau.",
  },
  {
    id: "B2-02",
    bai: 2,
    text: "Khi nhận một trang mới, node làm gì?",
    options: ["So với sổ của mình và tính lại mã", "Tin ngay vì người gửi quen", "Hỏi trưởng làng", "Xóa trang cũ đi"],
    correctIndex: 0,
    explanation: "Node không tin ngay, mà tự kiểm tra lại.",
  },
  {
    id: "B2-03",
    bai: 2,
    text: "Trang cuối sổ của em có mã 57. Trang mới ghi: mã trang trước 57, nội dung 36, mã trang 51. Em chọn gì?",
    options: ["Từ chối", "Đồng ý"],
    correctIndex: 0,
    explanation: "57 × 2 + 36 = 150, tức mã đúng là 50 chứ không phải 51.",
  },
  {
    id: "B2-04",
    bai: 2,
    text: "Trang cuối sổ của em có mã 25. Trang mới ghi: mã trang trước 25, nội dung 30, mã trang 80. Em chọn gì?",
    options: ["Đồng ý", "Từ chối"],
    correctIndex: 0,
    explanation: "25 × 2 + 30 = 80, khớp.",
  },
  {
    id: "B2-05",
    bai: 2,
    text: "Trang mới ghi \"mã trang trước 62\", nhưng trang cuối sổ của em có mã 57. Vì sao phải từ chối?",
    options: ["Vì sổ của người gửi đã bị sửa, không khớp sổ của em", "Vì 62 lớn hơn 57", "Vì nội dung quá dài", "Không cần từ chối"],
    correctIndex: 0,
    explanation: "Mã trang trước phải trùng mã trang cuối trong sổ của em.",
  },
  {
    id: "B2-06",
    bai: 2,
    text: "Khi nào trang mới được ghi vào sổ của cả làng?",
    options: ["Khi đa số người giữ sổ đồng ý", "Khi người gửi muốn", "Khi {phanDien} đồng ý", "Ngay khi có người gửi"],
    correctIndex: 0,
    explanation: "Đây là cơ chế đồng thuận.",
  },
  {
    id: "B2-07",
    bai: 2,
    text: "Ở trạm đặt cọc, ghi trang gian mà bị phát hiện thì sao?",
    options: ["Mất tiền cọc", "Được thưởng gấp đôi", "Không sao cả", "Được ghi lại lần nữa"],
    correctIndex: 0,
    explanation: "Gian lận bị phạt bằng cọc.",
  },
  {
    id: "B2-08",
    bai: 2,
    text: "Vì sao gian lận thường lỗ hơn làm thật?",
    options: ["Vì bị phát hiện thì mất cọc, nhiều hơn tiền thưởng khi làm thật", "Vì gian lận bị cấm nói ra", "Vì làm thật được miễn cọc", "Vì sổ tự sửa lỗi"],
    correctIndex: 0,
    explanation: "Làm thật được thưởng; gian lận thì dễ mất cọc.",
  },
  {
    id: "B3-01",
    bai: 3,
    text: "Khóa nào phải giữ bí mật?",
    options: ["Khóa riêng (khuôn dấu riêng)", "Khóa công khai", "Cả hai", "Không khóa nào"],
    correctIndex: 0,
    explanation: "Khóa công khai ai xem cũng được.",
  },
  {
    id: "B3-02",
    bai: 3,
    text: "Với công thức 5^x mod 23, khuôn riêng 3 cho ra mẫu công khai nào?",
    options: ["10", "15", "8", "125"],
    correctIndex: 0,
    explanation: "5³ = 125, chia 23 dư 10.",
  },
  {
    id: "B3-03",
    bai: 3,
    text: "Một lá thư ghi \"Từ cụ Bình\", nhưng con dấu chỉ khớp mẫu công khai của {phanDien}. Ai đã đóng dấu thư này?",
    options: ["{phanDien}", "Cụ Bình", "Không biết được"],
    correctIndex: 0,
    explanation: "Con dấu cho biết ai thật sự đã đóng.",
  },
  {
    id: "B3-04",
    bai: 3,
    text: "Kiểm tra thư bằng mẫu công khai nào mới đúng?",
    options: ["Mẫu trên bảng chính thức của làng", "Mẫu do chính người gửi đính kèm", "Mẫu nào cũng được"],
    correctIndex: 0,
    explanation: "Kẻ mạo danh có thể đính kèm mẫu của chính nó.",
  },
  {
    id: "B3-05",
    bai: 3,
    text: "Từ mẫu công khai đoán ngược ra khuôn riêng, với số thật rất lớn, thì sao?",
    options: ["Gần như không thể, lâu hơn cả tuổi vũ trụ", "Mất vài phút", "Chỉ cần máy tính mạnh", "Dễ như tính xuôi"],
    correctIndex: 0,
    explanation: "Tính xuôi thì dễ, tính ngược thì cực khó.",
  },
  {
    id: "B3-06",
    bai: 3,
    text: "Lỡ làm mất khuôn riêng thì ai lấy lại giúp được?",
    options: ["Không ai cả", "Trưởng làng", "Người làm ra sổ", "Các làng khác"],
    correctIndex: 0,
    explanation: "Mất khuôn riêng là mất hết.",
  },
  {
    id: "B4-01",
    bai: 4,
    text: "Với T_ab = T_a × 10 + T_b, biết T1 = 4 và T2 = 6. T12 bằng bao nhiêu?",
    options: ["46", "64", "10", "24"],
    correctIndex: 0,
    explanation: "4 × 10 + 6 = 46.",
  },
  {
    id: "B4-02",
    bai: 4,
    text: "Biết T1 = 3 và T2 = 7. T21 bằng bao nhiêu?",
    options: ["73", "37", "10", "21"],
    correctIndex: 0,
    explanation: "T21 = T2 × 10 + T1. Thứ tự quan trọng.",
  },
  {
    id: "B4-03",
    bai: 4,
    text: "{phanDien} đổi 1 giao dịch trong cây. Số gốc thay đổi thế nào?",
    options: ["Số gốc đổi theo", "Không đổi", "Chỉ đổi nếu là giao dịch đầu tiên", "Về 0"],
    correctIndex: 0,
    explanation: "Thay đổi lan lên tới gốc.",
  },
  {
    id: "B4-04",
    bai: 4,
    text: "{phanDien} đổi 1 giao dịch trong một khối có 8 giao dịch. Node phát hiện nhanh nhất bằng cách nào?",
    options: ["So số gốc", "So từng giao dịch một", "Hỏi {phanDien}", "Đếm số giao dịch"],
    correctIndex: 0,
    explanation: "Chỉ cần so một con số.",
  },
  {
    id: "B4-05",
    bai: 4,
    text: "Biết T12 = 37 và T34 = 52. T1234 bằng bao nhiêu?",
    options: ["422", "89", "3752", "5237"],
    correctIndex: 0,
    explanation: "37 × 10 + 52 = 422.",
  },
  {
    id: "B4-06",
    bai: 4,
    text: "Cây có 64 lá. Lần theo nhánh lệch từ gốc thì phải đi qua bao nhiêu tầng để tới lá bị sửa?",
    options: ["6", "64", "32", "8"],
    correctIndex: 0,
    explanation: "64 = 2^6, mỗi tầng chia đôi số lá.",
  },
];

/** Thử thách cuối (hội làng): 6 câu cố định, đúng thứ tự trong CAU-HOI-ON-TAP.md. */
export const FINAL_CHALLENGE_IDS: readonly string[] = ["B1-01", "B2-02", "B3-01", "B4-01", "B4-04", "B3-03"];

export function questionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

/** 6 câu của thử thách cuối, đúng thứ tự (thứ tự đáp án giữ nguyên như ngân hàng). */
export function finalChallengeQuestions(): Question[] {
  return FINAL_CHALLENGE_IDS.map((id) => {
    const q = questionById(id);
    if (!q) throw new Error(`Thiếu câu ${id} trong ngân hàng câu hỏi`);
    return q;
  });
}

/**
 * Số liệu KHÓA CỨNG của chế độ trọn (KICH-BAN-VIDEO-TRON-GAME.md, bảng "Số liệu khóa cứng" và "Rút ngắn game phụ").
 * Chỉ có hiệu lực khi `TRON` khác null (bản build VITE_DEMO, địa chỉ ?demo=1&kieu=tron). Ngoài demo `TRON` là null và config, luật, test của bản thật không đổi.
 * Chỉ ghi SỐ ĐẦU VÀO; mọi số suy ra (mã trang, gốc cây...) do logic sẵn có tính, và `data.test.ts` kiểm từng số trong kịch bản khớp logic.
 */
import { DEMO_TRON } from '../config';

type Sender = 'binh' | 'chi' | 'ti';

export const TRON_DATA = {
  man1: {
    /** Trạm Dễ: bìa 10; nội dung 5 trang → mã 43, 31, 69, 26, 64 */
    easy: { genesis: 10, contents: [23, 45, 7, 88, 12] as readonly number[] },
    /** Trạm Trung bình: dùng chuỗi trạm Dễ; Tí đổi trang 2 (chỉ số 1) thành 72 → mã 58, 23, 34, 80 */
    medium: { tamperIndex: 1, newContent: 72 },
    /**
     * Trạm Khó: bìa 79; trang 1 nội dung 29 (mã 87); trang 2, 3, 4 nội dung 22, 18, 47. Trang 2 bị sửa trộm thành 22 (gốc 55) → phải tính lại 96, 10, 67.
     * Hai trang cuối của chuỗi 6 trang đầu (63, 5) tự chọn. Cuộc đua rút còn `durationMs`, mạng thêm trang mỗi `spawnMs`; hạt giống cố định cho trang mạng thêm.
     */
    hard: { genesis: 79, contents: [29, 55, 18, 47, 63, 5] as readonly number[], tamperedContent: 22, durationMs: 40000, spawnMs: 3500, seed: 7 },
  },
  man2: {
    /** 1 vòng 25 giây + 1 câu hỏi cuối vòng; câu B1-01 với thứ tự đáp án A 50, B 105, C 5, D 65 (đúng: C) */
    rounds: 1,
    roundSec: 25,
    question: { id: 'B1-01', options: ['50', '105', '5', '65'] as readonly string[] },
  },
  man3: {
    /** Bìa 10; vòng 1: 3 trang (43, 31, 69). Vòng 2: cùng chuỗi + trang giả (trước 31, nội dung 50, mã 99). Thứ tự khay cố định (chỉ số trong chuỗi). */
    genesis: 10,
    contents: [23, 45, 7] as readonly number[],
    fake: { prev: 31, content: 50, code: 99 },
    trayOrder: [1, 2, 0] as readonly number[],
  },
  man5: {
    /** 3 lượt câu hỏi (B2-03 từ chối, B2-04 đồng ý, B2-06 đa số đồng ý), chuột thường thưa hơn; thứ tự đáp án gốc của ngân hàng câu hỏi */
    questions: ['B2-03', 'B2-04', 'B2-06'] as readonly string[],
    bossEvery: 10,
    spawn: 1.4,
  },
  man6: {
    /** 1 cổng sau 6 khe; câu hỏi ở cổng B1-03 (mã trước 57, nội dung 36 → 50), thứ tự đáp án gốc (tự chọn) */
    gateAfter: 6,
    question: 'B1-03',
  },
  man8: {
    /** Chỉ vòng 1 (4 cặp): khuôn 3, 5, 6, 7 ↔ mẫu 10, 20, 8, 17 (5^x mod 23) */
    keys: [3, 5, 6, 7] as readonly number[],
  },
  man7: {
    /** Trạm Trung bình: 4 giao dịch sinh bằng bộ sinh của bài với hạt giống cố định (tự chọn). Bảng khóa của spec 07: em 12 → 18; An 15 → 19; Bình 17 → 15; Tí 13 → 21. Trạm Khó tìm x từ khóa công khai 19 (x = 15). */
    mediumSeed: 7,
  },
  man9: {
    /** Đợt 1, ít trứng: khóa 3, 5, 6 → nạp trứng 10, 20, 8; bàn 3 hàng */
    keys: [3, 5, 6] as readonly number[],
    rows: 3,
  },
  man10: {
    /** Dễ: dùng đề mặc định của bài: lá 3, 7, 5, 2 → T12 37, T34 52, T21 73. Trung bình: lá 4, 2, 6, 1 → 42, 61, gốc 481; Tí đổi T3 (6 → 7) → T34 71, gốc 491. Khó: đề mẫu của bài: lá 3 7 5 2 6 1 4 8, ô ẩn T6, T12, T34, T78, T5-8, gốc = 1, 37, 52, 48, 658, 4878; mảnh bẫy 25, 84. */
    mediumLeaves: [4, 2, 6, 1] as readonly number[],
  },
  man11: {
    /** Vòng 1 (4 ô cây), hạt giống cố định (tự chọn) */
    seed: 11,
  },
  man12: {
    /** Vòng 1: lá 3 7 5 2 6 1 4 8, T8 bị tráo từ 8 thành 9 → chọn 49, 659, 4879 (gốc cũ 4878) */
    leaves: [3, 7, 5, 2, 6, 1, 4, 8] as readonly number[],
    tamperedIndex: 7,
    newDigit: 9,
  },
  man4: {
    /**
     * Trạm Dễ: sổ 2 trang, mã bìa 5, nội dung 10 và 17 → mã 20, 57 (trang cuối mã 57). 5 vòng; mã đúng của vòng 1 là (57 × 2 + 36) mod 100 = 50.
     * Vòng 1 (Bình) 36 / 50 hợp lệ; vòng 2 (Chi) 30 / 35 sai mã; vòng 3 (Tí) 25 / 25 hợp lệ; vòng 4 (Bình) 30 / 80 hợp lệ (đúng ví dụ 25, 30, 80); vòng 5 (Chi) 47 / 66 sai mã.
     * Ví dụ trong lời thuyết minh "57, 36, 51 thì Từ chối" không xuất hiện nguyên văn trên màn hình (mã 51 sai so với 50): xem SO-LIEU-DEMO-TRON.md.
     */
    easy: {
      startGenesis: 5,
      startContents: [10, 17] as readonly number[],
      rounds: [
        { sender: 'binh' as Sender, content: 36, code: 50 },
        { sender: 'chi' as Sender, content: 30, code: 35 },
        { sender: 'ti' as Sender, content: 25, code: 25 },
        { sender: 'binh' as Sender, content: 30, code: 80 },
        { sender: 'chi' as Sender, content: 47, code: 66 },
      ],
    },
    /** Trạm Trung bình: đề sinh bằng bộ sinh của bài với hạt giống cố định (tự chọn) */
    mediumSeed: 4,
    /** Trạm Khó: mã bìa 5, nội dung 10 và 85 → mã 20, 25. Lượt đầu em tạo trang: mã trước 25, nội dung 18 → mã 68. Các lượt sau theo hạt giống. */
    hard: { genesis: 5, contents: [10, 85] as readonly number[], firstContent: 18, seed: 9 },
  },
};

/** Số liệu demo; null khi không ở chế độ trọn. */
export const TRON: typeof TRON_DATA | null = DEMO_TRON ? TRON_DATA : null;

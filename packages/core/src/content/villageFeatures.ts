/**
 * Chữ của đồ dựng bằng code ở cảnh làng (mốc 3, bước L3): hiện lên bảng gỗ ở Làng Khắc Dấu. Mọi câu đi qua fmt() ({phanDien}).
 */
export const stampBoardText = {
  /** Tên ghi dưới số mẫu dấu công khai trên sáu tấm gỗ, theo mã người trong `PEOPLE` của Bài 3 (số lấy từ `lessons/bai-3/logic`) */
  ten: {
    em: 'Em',
    an: 'Bác An',
    binh: 'Cụ Bình',
    chi: 'Cô Chi',
    dung: 'Chú Dũng',
    ti: '{phanDien}',
  },
} as const;

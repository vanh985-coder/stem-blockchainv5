/**
 * Chữ giao diện của nút "?" trong lúc chơi (bước HD, spec 03 mục 3.8 và 6): nút, dòng đầu hộp "Việc của em lúc này: …", hai nút "Xem hướng dẫn đầy đủ" và "Chơi tiếp". CÁC CÂU NHẮC theo trạng thái của từng game
 * nằm ở `content/huongDanGame.ts` (khóa `nhac`); hàm `hintFor(state)` của game chỉ trả khóa. Câu nhắc KHÔNG được lộ đáp án.
 */
export const gameHints = {
  /** Nút "?" (nhãn đọc màn hình kèm phím tắt) */
  nut: 'Gợi ý (phím H)',
  kyHieu: '?',
  tieuDe: 'Gợi ý',
  /** Dòng đầu hộp: {nd} là câu nhắc của game */
  viecCuaEm: 'Việc của em lúc này: {nd}',
  /** Hai nút của hộp */
  xemDayDu: 'Xem hướng dẫn đầy đủ',
  tiepTuc: 'Chơi tiếp',
  /** Game chưa đăng ký hàm nhắc */
  macDinh: 'Cứ chơi tiếp và làm theo luật ở thẻ bắt đầu nhé.',
} as const;

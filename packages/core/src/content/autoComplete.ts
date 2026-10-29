/**
 * Chữ của nút "Tự hoàn thành" (P3b): chỉ giáo viên/admin và bản dev thấy. Mọi câu đi qua fmt() ({man}).
 * Tự hoàn thành chỉ ghi cờ đã xong để đi tiếp trong làng; KHÔNG có điểm, sao, huy chương, xu hay Trang Sổ Vàng.
 */
export const autoCompleteUi = {
  /** Nhãn nút */
  nut: 'Tự hoàn thành',
  /** Ghi chú ngắn cạnh nút (đọc màn hình) */
  ghiChu: 'Chỉ giáo viên và bản thử thấy nút này. Ghi màn là đã xong để đi tiếp, không có điểm, sao, huy chương hay xu.',
  /** Khung sau khi bấm */
  tieuDe: 'Đã tự hoàn thành',
  loi: 'Màn này được ghi là đã xong để đi tiếp. Không có điểm, sao, huy chương hay xu, và Trang Sổ Vàng không tự được trao.',
  /** Nút trong khung đó */
  choiThat: 'Chơi thật màn này',
  /** Nhãn trạng thái ở bảng làng (/ban-do) */
  trangThai: 'Tự hoàn thành',
  /** Dòng thay cho "n/9 sao" ở bảng làng */
  khongCoDiem: 'Không có điểm hay sao',
} as const;

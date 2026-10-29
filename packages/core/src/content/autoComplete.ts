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
  /** Máy chủ chưa hỗ trợ (chưa chạy migration 0003): nút bị vô hiệu; tiến độ chơi thật vẫn lưu bình thường */
  chuaHoTro: 'Máy chủ chưa hỗ trợ "Tự hoàn thành" (cơ sở dữ liệu chưa được cập nhật nên chưa dùng được). Tiến độ chơi thật vẫn lưu bình thường.',
  /** Máy chủ từ chối tài khoản này */
  biTuChoi: 'Máy chủ không cho tài khoản này dùng "Tự hoàn thành". Chưa ghi gì; tiến độ chơi thật vẫn lưu bình thường.',
  /** Đã ghi ở máy nhưng chưa lên được máy chủ (mất mạng...) */
  chuaLuu: 'Chưa lưu được lên máy chủ (có thể mất mạng). Màn này chỉ được ghi ở máy này, máy sẽ thử gửi lại khi có mạng.',
  /** Không dùng được ở lúc này (chưa đăng nhập xong, không được phép) */
  khongDung: 'Chưa dùng được "Tự hoàn thành" lúc này.',
} as const;

/**
 * Chữ của thẻ "Em có biết?" rải trong làng (mốc 2, bước X3). Mọi câu đi qua fmt() ({n}, {tong}, {khu}). Dùng chung cho cả 4 làng: `khu` là khóa khu vực của thẻ (xem `VillageScroll.zone`);
 * mốc 3 thêm khóa khu của 3 làng còn lại ở đây.
 */
export const knowScrollUi = {
  /** Dòng nhiệm vụ khi trong làng còn thẻ chưa nhặt */
  nhiemVu: 'Tìm thẻ Em có biết: {n}/{tong}',
  /** Lời nhắc tương tác ở thẻ (E hay nút bàn tay) */
  nhanThe: 'Đọc thẻ Em có biết',
  /** Nút ở thẻ cuối khi đọc thẻ nhặt được: đọc xong thẻ được cất vào sổ */
  catVaoSo: 'Cất vào sổ',
  /** Báo sau khi nhặt */
  nhatXong: 'Thẻ đã được cất vào sổ của em ({n}/{tong}).',
  nhatDu: 'Đủ {tong} thẻ rồi! Em vào các màn của làng được rồi.',
  /** Biển gỗ báo khi chưa đủ thẻ (người nói là biển) */
  bienNguoiNoi: 'Biển gỗ',
  bienBao: 'Em hãy tìm đủ thẻ Em có biết trong làng ({n}/{tong}).',
  /** Bi gợi ý khu có thẻ chưa nhặt (không chỉ đúng chỗ) */
  biGoiY: 'Em còn {con} thẻ chưa nhặt. Bi nghe thấy tiếng giấy sột soạt ở gần {khu}. Em ra đó tìm thử nhé!',
  /** Tên các khu có thẻ (khóa theo `VillageScroll.zone`) */
  khu: {
    xuong: 'xưởng làm giấy',
    dinh: 'đình làng',
    ao: 'cái ao làng',
    cho: 'chợ làng',
    // Làng Dệt
    phoi: 'bãi phơi vải',
    khungcui: 'xóm khung cửi',
    aonhuom: 'ao nhuộm',
    chovai: 'chợ vải',
    // Làng Khắc Dấu
    xuongdau: 'xưởng khắc dấu',
    dinhlang: 'đình làng',
    tramthu: 'trạm đưa thư',
    baida: 'bãi đá',
  },
  /** Menu "Em có biết?": bộ sưu tập thẻ */
  suuTamTieuDe: 'Em có biết? ({n}/{tong})',
  chuaNhat: 'Chưa nhặt',
  chuaNhatNhan: 'Thẻ số {so}, chưa nhặt. Em tìm trong làng nhé.',
  daNhatNhan: 'Thẻ số {so}: {tieuDe}. Bấm để đọc.',
  suuTamDong: 'Đóng',
  /** Khung giới thiệu làng trên bản đồ: đọc đủ thẻ mới vào được bài */
  /** Nhãn mỗi thẻ ở khung giới thiệu làng */
  banDoThe: 'Em có biết? · Thẻ {n}/{tong}',
  banDoCan: 'Em đọc đủ {tong} thẻ Em có biết của làng này thì mới vào được bài ({n}/{tong}).',
  banDoDoc: 'Đọc thẻ Em có biết',
  banDoXong: 'Em đã đọc đủ thẻ Em có biết của làng này.',
} as const;

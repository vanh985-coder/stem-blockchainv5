/**
 * Chữ của cảnh cao trào sau màn 12 (spec 08 mục "Cảnh cao trào", mốc 3 bước B5). Mọi câu đi qua fmt() ({phanDien}, {ten}). Lời của ảnh truyện số 10 và 11 lấy từ `content/story.ts`
 * (STORY, cùng chữ với trang /truyen), không viết lại ở đây.
 */
export const climaxUi = {
  /** Nhãn đọc cho người dùng đọc màn hình */
  khung: 'Cảnh cuối của câu chuyện',
  /** Bước b: dưới gốc đa */
  loiPhanDien: 'Sửa trang thì cả chuỗi lệch, gian thì mất cọc, giả dấu thì bị soi ra, tráo lá thì số gốc đổi… Hóa ra làm thật mới có lời.',
  loiCuBinh: 'Biết sai thì sửa. Làng đang cần thêm người giữ sổ cẩn thận. {phanDien} có muốn làm không?',
  loiPhanDienCoA: 'Có ạ!',
  /** Bước d: Thầy Linh trao Trang Sổ Vàng thứ tư */
  traoTrang: 'Thầy Linh trao Trang Sổ Vàng thứ tư.',
  /** Lời Bi khi hội làng đã ra mắt (`FESTIVAL_LAUNCHED` = true) */
  biDuTrang: 'Đủ 4 trang rồi! Cả làng đang mở hội.',
  /** Lời Bi khi hội làng chưa ra mắt (`FESTIVAL_LAUNCHED` = false), kèm dòng `hoiLangSapMo` */
  biDuTrangChuanBi: 'Đủ 4 trang rồi! Cả làng đang chuẩn bị mở hội.',
  hoiLangSapMo: 'Hội làng sắp mở',
  /** Nút ở lượt cuối */
  xemKetQua: 'Xem kết quả',
  xong: 'Xong',
  /** Nút ở màn kết quả của màn 12 */
  xemLai: 'Xem lại cảnh cuối',
  /** Cảnh đang chờ em (đủ 4 trang, đã chơi màn 12, chưa chiếu): nút ở màn kết quả của game vừa làm đủ trang và ở bảng Làng Bạc */
  xemCanhCuoi: 'Xem cảnh cuối',
  /** Lời báo cạnh nút khi cảnh đang chờ */
  canhCuoiCho: 'Em đã đủ 4 Trang Sổ Vàng. Cảnh cuối của câu chuyện đang chờ em, không cần chơi lại màn 12.',
  /** Lời ở bảng Làng Bạc khi đã chiếu rồi */
  canhCuoiDaXem: 'Em đã xem cảnh cuối. Em muốn xem lại không?',
  /** Dòng nhiệm vụ ở thế giới khi cảnh đang chờ */
  nhiemVuCanhCuoi: 'Cảnh cuối đang chờ em. Mở Bản đồ, chọn Làng Bạc rồi bấm "Xem cảnh cuối".',
} as const;

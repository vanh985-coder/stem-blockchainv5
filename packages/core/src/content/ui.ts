/**
 * Chữ trên nút, nhãn, thông báo, cài đặt, trang tạm. Xem content/HUONG-DAN-SUA-CHU.md.
 * Chỉ sửa chữ nằm giữa hai dấu nháy. Giữ nguyên các chỗ giữ tên như {ten}, {phanDien}, {so}.
 */
export const ui = {
  chung: {
    /** Nút ở hộp thoại: sang lượt nói tiếp theo */
    tiep: 'Tiếp',
    /** Nút ở hộp thoại: bỏ qua cả đoạn hội thoại */
    boQua: 'Bỏ qua',
    /** Nút cuối bài: quay về bản đồ ở web chính */
    veBanDo: 'Về bản đồ',
    /** Hiện khi một trang đang tải */
    dangTai: 'Đang tải…',
  },

  /** Tên 4 làng (hiện ở bản đồ và tiêu đề) */
  lang: {
    'lang-giay': 'Làng Giấy',
    'lang-det': 'Làng Dệt',
    'lang-khac-dau': 'Làng Khắc Dấu',
    'lang-bac': 'Làng Bạc',
  },

  /** Trang tạm của màn bài học (trước khi chuyển bài thật) */
  trangTam: {
    /** Tiêu đề trang tạm, {so} là số bài */
    tieuDe: 'Bài học {so} — đang chuyển',
  },

  /** Màn hình chuyển hướng về bản đồ */
  chuyenHuong: {
    truoc: 'Đang chuyển về bản đồ… Nếu chưa tự chuyển, em bấm',
    lienKet: 'vào đây',
    sau: '.',
  },

  /** Hộp thông báo đúng/sai sau khi trả lời (FeedbackSheet) */
  phanHoi: {
    tieuDeDung: 'Chính xác!',
    tieuDeSai: 'Chưa đúng',
    /** Đọc cho người dùng đọc màn hình */
    docDung: 'Chúc mừng em, câu trả lời chính xác!',
    docSai: 'Chưa đúng, hãy xem giải thích.',
    /** Nhãn đứng trước phần giải thích lý do */
    nhanViSao: 'Vì sao: ',
    /** Nhãn đứng trước phần cách sửa */
    nhanCachSua: 'Cách sửa: ',
    /** Chữ trên biểu tượng đúng / sai (ngoài màu sắc) */
    bieuTuongDung: 'Đúng',
    bieuTuongSai: 'Sai',
    tiepTuc: 'Tiếp tục',
  },

  /** Màn giới thiệu mỗi thử thách (LevelIntro) */
  gioiThieu: {
    batDau: 'Bắt đầu',
    /** {muc} là tên mức: Dễ, Vừa, Khó */
    muc: 'Mức: {muc}',
    mucTieu: 'Mục tiêu của em:',
    meoTuBi: 'Mẹo từ Bi: ',
  },

  /** Màn hoàn thành thử thách (LevelComplete) */
  hoanThanh: {
    tieuDe: 'Hoàn thành xuất sắc!',
    loiKhen: 'Em đã vượt qua thử thách này một cách tuyệt vời!',
    /** Ô xu ở màn hoàn thành */
    xuNhan: 'Xu nhận được',
    /** Số xu nhận được, {so} là số xu */
    soXu: '+{so}',
    thoiGian: 'Thời gian hoàn thành',
    dieuVuaHoc: 'Điều em vừa học',
    cauHoiSuyNgam: 'Câu hỏi suy ngẫm',
    choiLai: 'Chơi lại',
    manTiepTheo: 'Màn tiếp theo',
  },

  /** Số sao đạt được, đọc cho người dùng đọc màn hình */
  sao: {
    nhan: '{earned} trên {max} sao',
    tenIcon: 'Sao',
  },

  /** Thẻ câu hỏi ôn tập (QuizCard) */
  quiz: {
    dungRoi: 'Đúng rồi!',
    chuaDung: 'Chưa đúng',
    /** Nhãn cạnh đáp án đúng sau khi trả lời */
    dapAnDung: 'Đáp án đúng',
    /** Nhãn cạnh đáp án em đã chọn sai */
    emChon: 'Em chọn',
    dapAnDungLa: 'Đáp án đúng là:',
    giaiThich: 'Giải thích: ',
    cauTiep: 'Câu tiếp theo',
  },

  /** Trạng thái mở khóa từng màn (biển gỗ, bản đồ) */
  moKhoa: {
    khoa: 'Khóa',
    mo: 'Mở',
    xong: 'Xong',
    sapRaMat: 'Sắp ra mắt',
    /** Lý do khóa: {so} là số màn cần hoàn thành, {man} là tên màn đó */
    hoanThanh: 'Hoàn thành màn {so} ({man}) để mở',
    /** Số Trang Sổ Vàng đã có, {so} trên {max} */
    trangSoVang: 'Trang Sổ Vàng: {so}/{max}',
  },

  /** Bảng cài đặt */
  caiDat: {
    tieuDe: 'Cài đặt',
    giamChuyenDong: 'Giảm chuyển động',
    giamChuyenDongGhiChu: 'Tắt hiệu ứng chuyển động trong toàn bộ trò chơi.',
    chuTo: 'Chữ to',
    chuToGhiChu: 'Tăng cỡ chữ lên khoảng 15%.',
    amThanh: 'Âm thanh',
    amThanhGhiChu: 'Tiếng bấm nút, tiếng đúng sai và tiếng chúc mừng.',
    bat: 'Bật',
    tat: 'Tắt',
  },

  /** Trang chủ tạm và bản đồ tạm ở web chính */
  hub: {
    tenGame: 'Giấc mơ Sổ Chung',
    trangChuTam: 'Trang chủ tạm.',
    denBanDo: 'Đến bản đồ',
    banDoTam: 'Bản đồ (tạm)',
    /** Mỗi dòng ở bản đồ tạm: {lang} tên làng, {bai} số bài, {man} số màn */
    dongBanDo: '{lang} — Bài học {bai} (màn {man})',
    veTrangChu: 'Về trang chủ',
  },

  /** Chữ ở các trang chỉ có khi chạy dev */
  dev: {
    dodoHoaTieuDe: 'Đồ họa (dev)',
    nguon: 'Nguồn:',
    anhVaDungLuong: '{so} ảnh, {kb} KB',
    dangTai: 'đang tải…',
    manifestTrong: ' (manifest trống hoặc không tải được, kiểm tra pnpm dev:assets)',
    chanDung: 'Chân dung (11: 10 ảnh + Bi)',
    moiAnh: 'Mọi ảnh trong manifest',
    uiTieuDe: 'Giao diện chung (dev)',
    nut: 'Nút',
    nutChinh: 'Chính',
    nutPhu: 'Phụ',
    nutNguyHiem: 'Nguy hiểm',
    nutVoHieu: 'Vô hiệu',
    nutTo: 'Cỡ lớn',
    nutNho: 'Cỡ nhỏ',
    bang: 'Bảng giấy dó',
    bangNoiDung: 'Đây là bảng nền giấy dó, viền gỗ nâu, bo góc mềm.',
    khungChanDung: 'Khung chân dung (vuông bo góc)',
    hoiThoai: 'Hội thoại 4 lượt',
    hoiThoaiLai: 'Chạy lại hội thoại',
    hoiThoaiXong: 'Hội thoại đã xong.',
    hoiThoaiBoQua: 'Hội thoại đã bị bỏ qua.',
    phanHoi: 'FeedbackSheet',
    moPhanHoiDung: 'Mở phản hồi đúng',
    moPhanHoiSai: 'Mở phản hồi sai',
    phanHoiChuyenGi: 'Số 43 đúng là mã trang: (10 × 2 + 23) mod 100 = 43.',
    phanHoiViSao: 'Mã trang được tính từ mã trang trước và nội dung trang.',
    phanHoiCachSua: 'Tính lại từng bước rồi so với mã ghi trên trang.',
    gioiThieu: 'LevelIntro',
    gioiThieuTieuDe: 'Tìm trang bị sửa lén',
    gioiThieuMucTieu: 'Soi công thức từng trang để tìm trang có mã không khớp.',
    gioiThieuMeo: 'Bắt đầu từ trang bìa rồi đi lần lượt xuống.',
    gioiThieuTenBai: 'Bài 1',
    gioiThieuMuc: 'Dễ',
    hoanThanh: 'LevelComplete',
    hoanThanhDieuHoc: 'Mã của mỗi trang được tính từ mã trang trước, nên sửa một trang là phải sửa cả những trang sau.',
    hoanThanhCauHoi: 'Vì sao một người khó sửa lén cả cuốn sổ chung?',
    hoanThanhDapAn1: 'Vì phải sửa cùng lúc nhiều cuốn sổ giống nhau',
    hoanThanhDapAn2: 'Vì cuốn sổ rất nặng',
    sao: 'Sao',
    caiDat: 'SettingsPanel',
    hangIcon: 'Hàng 7 icon',
    chuyenSang: 'Chuyển sang:',
    quizTieuDe: 'QuizCard (4 câu Bài 1)',
    quizCau: 'Câu {so}/{max}',
    quizKetQua: 'Đã trả lời đúng {so}/{max} câu.',
    quizLamLai: 'Làm lại 4 câu khác',
    moKhoaTieuDe: 'Mở khóa 12 màn (unlock.ts)',
    moKhoaGiaoVien: 'Tài khoản giáo viên',
    moKhoaDatLai: 'Đặt lại tiến độ',
    moKhoaXongMan: 'Xong màn {so}',
    moKhoaBoXong: 'Bỏ xong màn {so}',
    moKhoaDoiStatus: 'Đổi trạng thái màn {so}',
    moKhoaStatusReady: 'ready',
    moKhoaStatusSoon: 'coming-soon',
    moKhoaDaLuu: 'Trang Sổ Vàng đã lưu (không bao giờ bị thu lại): {so}',
    /** Cảnh báo ở console khi chạy dev */
    thieuAnh: 'Thiếu ảnh "{path}" trong manifest',
    anhLoi: 'Không tải được ảnh "{path}" ({src})',
    manifestLoi: 'Không tải được {path} ({loi}). Đã chạy pnpm dev:assets chưa?',
  },

  /** Lời thoại mẫu ở trang /dev/ui (4 lượt: bác An, {phanDien}, Bi, cô Chi) */
  hoiThoaiMau: {
    luot1: 'Chào {ten}! Hôm nay bác sẽ chỉ em cách giữ cuốn sổ chung của cả làng.',
    luot2: 'Hừ, giữ sổ làm gì cho mệt. Để {phanDien} ghi gì vào đó cũng được chứ!',
    luot3: 'Không được đâu! Mỗi trang sổ đều có mã riêng, sửa lén là bị phát hiện ngay.',
    luot4: 'Đúng vậy. {Ten} nhớ nhé: cả làng cùng giữ một cuốn sổ giống hệt nhau.',
  },
} as const;

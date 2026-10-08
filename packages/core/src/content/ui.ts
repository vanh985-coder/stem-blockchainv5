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

  /** Đăng nhập, đăng ký, hồ sơ, quyền riêng tư */
  auth: {
    /** Hiện khi thiếu cấu hình Supabase: các nút đăng nhập báo câu này */
    chuaCauHinh: 'Đăng nhập chưa cấu hình trên bản này. Em chơi thử không cần tài khoản trước nhé.',
    /** Thông báo lỗi do cơ sở dữ liệu ném ra (hàm join_class trong 0001_init.sql). Phải khớp NGUYÊN VĂN với SQL; không hiện ra màn hình. */
    loiMayChu: {
      maLopSai: 'Mã lớp không đúng',
      canDangNhap: 'Cần đăng nhập',
    },
    /** Các thông báo lỗi (xem mapAuthError) */
    loi: {
      tenDaCo: 'Tên đăng nhập này đã có người dùng. Em thử tên khác nhé.',
      saiDangNhap: 'Sai tên đăng nhập hoặc mật khẩu. Quên mật khẩu thì nhờ thầy cô đặt lại.',
      mang: 'Không kết nối được mạng. Em kiểm tra mạng rồi thử lại nhé.',
      maLopSai: 'Mã lớp không đúng. Em hỏi lại thầy cô mã gồm 6 ký tự nhé.',
      canDangNhap: 'Em cần đăng nhập trước nhé.',
      chung: 'Có lỗi xảy ra. Em thử lại sau một lát nhé.',
    },
    /** Nhắc em nhập sai ở ô nhập */
    kiemTra: {
      tenDangNhap: 'Tên đăng nhập gồm 3 đến 20 ký tự, chỉ dùng chữ thường a-z, số 0-9 và dấu gạch dưới _.',
      tenHienThi: 'Tên hiển thị dài từ 1 đến 40 ký tự.',
      matKhau: 'Mật khẩu phải có ít nhất 8 ký tự.',
      matKhauKhongKhop: 'Hai mật khẩu chưa giống nhau.',
      chuaDocQuyenRiengTu: 'Em cần đọc Quyền riêng tư rồi tích vào ô đồng ý.',
      maLopRong: 'Em nhập mã lớp (6 ký tự) nhé.',
    },
    dangXuLy: 'Đang xử lý…',
    dangKiemTra: 'Đang kiểm tra tài khoản…',
    veBanDo: 'Về bản đồ',
    dangNhap: {
      tieuDe: 'Đăng nhập',
      google: 'Đăng nhập bằng Google',
      hoac: 'hoặc',
      tenDangNhap: 'Tên đăng nhập',
      matKhau: 'Mật khẩu',
      nut: 'Đăng nhập',
      taoTaiKhoan: 'Tạo tài khoản',
      choiThu: 'Chơi thử không cần tài khoản',
    },
    dangKy: {
      tieuDe: 'Tạo tài khoản',
      tenDangNhap: 'Tên đăng nhập',
      tenDangNhapGoiY: 'Chữ thường không dấu, số và dấu _ (3 đến 20 ký tự).',
      tenHienThi: 'Tên hiển thị',
      tenHienThiGoiY: 'Tên các bạn sẽ thấy, được dùng chữ có dấu.',
      matKhau: 'Mật khẩu',
      matKhauGoiY: 'Ít nhất 8 ký tự.',
      nhapLai: 'Nhập lại mật khẩu',
      daDoc: 'Tôi đã đọc ',
      quyenRiengTu: 'Quyền riêng tư',
      nut: 'Tạo tài khoản',
      daCoTaiKhoan: 'Em đã có tài khoản?',
      dangNhap: 'Đăng nhập',
    },
    hoSo: {
      tieuDe: 'Hồ sơ của em',
      tenHienThi: 'Tên hiển thị',
      luuTen: 'Lưu tên',
      daLuuTen: 'Đã lưu tên mới.',
      tenDangNhap: 'Tên đăng nhập:',
      vaiTro: 'Vai trò:',
      vaiTroHocSinh: 'Học sinh',
      vaiTroGiaoVien: 'Giáo viên',
      vaiTroQuanTri: 'Quản trị',
      maLop: 'Nhập mã lớp',
      vaoLop: 'Vào lớp',
      daVaoLop: 'Em đã vào lớp rồi nhé.',
      dangXuat: 'Đăng xuất',
      canDangNhap: 'Em cần đăng nhập để xem hồ sơ.',
      denDangNhap: 'Đến trang đăng nhập',
      khongTaiDuocHoSo: 'Chưa tải được hồ sơ của em. Em tải lại trang thử nhé.',
    },
    /** Thanh nhỏ ở các trang tạm: đăng nhập hay đang đăng nhập */
    thanh: {
      dangNhap: 'Đăng nhập',
      chao: 'Chào {ten}',
      hoSo: 'Hồ sơ',
    },
  },

  /** Trang Quyền riêng tư (spec 02 mục 6) */
  quyenRiengTu: {
    tieuDe: 'Quyền riêng tư',
    gioiThieu: 'Game chỉ giữ những thứ cần thiết để em chơi tiếp được và để thầy cô biết em học đến đâu.',
    email: 'vietanhhpts123@gmail.com',
    muc: [
      {
        tieuDe: 'Game lưu những gì?',
        y: [
          'Tên hiển thị của em.',
          'Tên đăng nhập, hoặc email Google nếu em đăng nhập bằng Google.',
          'Tiến độ chơi và câu trả lời trắc nghiệm.',
        ],
      },
      {
        tieuDe: 'Lưu để làm gì?',
        y: ['Để em chơi tiếp được ở lần sau, ở bất cứ máy nào.', 'Để thầy cô biết em đã học đến đâu.'],
      },
      {
        tieuDe: 'Ai xem được?',
        y: [
          'Em xem được dữ liệu của chính em.',
          'Thầy cô chỉ thấy tên hiển thị và tiến độ của các em trong lớp mình, không thấy email.',
          'Người khác không xem được.',
        ],
      },
      {
        tieuDe: 'Game không hỏi gì?',
        y: [
          'Game không hỏi ngày sinh, số điện thoại, trường học hay ảnh của em.',
          'Game không có quảng cáo và không dùng công cụ theo dõi nào.',
        ],
      },
      {
        tieuDe: 'Em chơi thử không cần tài khoản?',
        y: ['Được. Khi đó tiến độ chỉ lưu trên máy của em, không gửi đi đâu.'],
      },
      {
        tieuDe: 'Em muốn xóa tài khoản?',
        y: ['Em nhờ thầy cô, hoặc gửi thư cho nhóm làm game theo địa chỉ này:'],
      },
    ],
  },

  /** Lưu tiến độ, chơi thử, bản đồ tạm */
  tienDo: {
    dangLuu: 'Đang lưu…',
    daLuu: 'Đã lưu.',
    /** Hiện khi chưa gửi được lên máy chủ (mất mạng hoặc chậm quá 5 giây) */
    chuaGuiDuoc: 'Chưa gửi được lên máy chủ. Tiến độ vẫn được giữ và sẽ tự gửi khi có mạng.',
    /** Thanh trên cùng khi chơi thử */
    choiThu: 'Em đang chơi thử, tiến độ chỉ lưu trên máy này',
    dangNhapDeLuu: 'Đăng nhập để lưu',
    /** Hỏi gộp sau khi đăng nhập, nếu máy có tiến độ chơi thử */
    hoiGop:
      'Trên máy này có tiến độ chơi thử. Gộp vào tài khoản của em không? Nếu đây không phải tiến độ của em, chọn Không gộp.',
    gop: 'Gộp',
    khongGop: 'Không gộp',
    /** Nút thử ở trang tạm của màn bài học */
    gaLapXongMan: 'Giả lập xong màn (3 sao)',
    nhanXu: 'Em nhận được {so} xu.',
    /** Số xu hiện ở bản đồ tạm */
    xu: 'Xu: {so}',
    /** Dòng ở bản đồ tạm, kèm trạng thái mở khóa */
    manSo: 'Màn {so}: {man}',
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

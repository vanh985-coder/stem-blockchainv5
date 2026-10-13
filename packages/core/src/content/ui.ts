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

  /** Hộp thoại kiểu truyện tranh (VnDialog) */
  vn: {
    /** Nút ở góc dưới phải; lượt cuối do nơi gọi đặt tên */
    tiep: 'Tiếp ›',
    /** Nút lùi một lượt */
    lui: '‹',
    luiNhan: 'Lùi lại một lượt',
    boQua: 'Bỏ qua',
    /** Tiến trình, ví dụ 3/14 */
    tienTrinh: '{x}/{n}',
    tienTrinhNhan: 'Lượt {x} trên {n}',
    anhNhan: 'Ảnh minh họa',
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
    /** {muc} là tên trạm: Dễ, Trung bình, Khó */
    muc: 'Trạm: {muc}',
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
    veTrangChu: 'Trang chủ',
    trangGiaoVien: 'Trang giáo viên',
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

  /** Lưu tiến độ, chơi thử, trang tạm của màn bài học */
  tienDo: {
    dangLuu: 'Đang lưu…',
    /** Hiện khi chưa gửi được lên máy chủ (mất mạng hoặc chậm quá 5 giây) */
    chuaGuiDuoc: 'Chưa gửi được lên máy chủ. Tiến độ vẫn được giữ và sẽ tự gửi khi có mạng.',
    /** Thanh trên cùng khi chơi thử */
    choiThu: 'Em đang chơi thử, tiến độ chỉ lưu trên máy này',
    dangNhapDeLuu: 'Đăng nhập để lưu',
    /** Bản ngắn cho màn hình hẹp (thanh chơi thử còn một dòng) */
    choiThuNgan: 'Đang chơi thử',
    dangNhapNgan: 'Đăng nhập',
    /** Hỏi gộp sau khi đăng nhập, nếu máy có tiến độ chơi thử */
    hoiGop:
      'Trên máy này có tiến độ chơi thử. Gộp vào tài khoản của em không? Nếu đây không phải tiến độ của em, chọn Không gộp.',
    gop: 'Gộp',
    khongGop: 'Không gộp',
  },

  /** Trang chủ "/" (spec 04 mục 1) */
  trangChu: {
    tenGame: 'Giấc mơ Sổ Chung',
    gioiThieu: 'Mơ về Đại Việt thế kỷ XVI, học bí quyết giữ sổ để tỉnh giấc.',
    dangNhapDeChoi: 'Đăng nhập để chơi',
    choiThu: 'Chơi thử',
    choiTiep: 'Chơi tiếp',
    /** Liên kết tới bản đồ 2D (đường đi nhanh, từ mốc 2 khi "Chơi tiếp" đã mở chợ 3D) */
    banDo: 'Bản đồ',
    /** Đã đăng nhập: lời chào kèm tên hiển thị */
    chao: 'Chào {ten}!',
    docTruyen: 'Đọc truyện',
    hoSo: 'Hồ sơ',
    quyenRiengTu: 'Quyền riêng tư',
    trangGiaoVien: 'Trang giáo viên',
  },

  /** Trang cốt truyện /truyen (spec 04 mục 2) */
  truyen: {
    tieuDe: 'Cốt truyện',
    batDauHanhTrinh: 'Bắt đầu hành trình',
  },

  /** Bản đồ /ban-do (spec 04 mục 7) */
  banDo: {
    /** Nút ở góc trên bản đồ */
    hoSo: 'Hồ sơ',
    /** Gợi ý khi chưa chọn làng */
    chonLang: 'Bấm vào một làng để xem các màn.',
    dong: 'Đóng',
    vao: 'Vào',
    /** Sao đã đạt trên tổng sao của màn */
    soSao: '{earned}/{max} sao',
    manBaiHoc: 'Bài học',
    manGame: 'Game',
    trangDaNhan: 'Đã nhận Trang Sổ Vàng',
    trangChuaNhan: 'Chưa nhận Trang Sổ Vàng',
    /** Nhãn cho người dùng đọc màn hình, mỗi chấm một màn: {man} tên màn */
    nhanCham: '{man}: {trangThai}',
    /** Tên ô Trang Sổ Vàng ở góc trên (đọc cho người dùng đọc màn hình) */
    trangSo: 'Trang Sổ Vàng {so}',
    /** Nút trong bảng làng, mở lại lời giới thiệu làng */
    xemLaiGioiThieu: 'Xem lại giới thiệu',
  },

  /** Thẻ trang sổ (TrangSo) và mắt xích (MatXich) */
  trangSo: {
    bia: 'Trang bìa',
    trang: 'Trang {n}',
    sai: '✗ Sai lệch',
    saiNhan: 'Sai lệch',
    phaiTinhLai: 'Sẽ phải tính lại',
    hopLe: '✓ Hợp lệ',
    hopLeNhan: 'Hợp lệ',
    maTrangTruoc: 'Mã trang trước',
    noiDung: 'Nội dung',
    maTrang: 'Mã trang',
    dangTinh: 'Đang tính...',
  },
  matXich: {
    hopLe: 'Mắt xích hợp lệ',
    gay: 'Mắt xích gãy',
    binhThuong: 'Mắt xích bình thường',
  },

  /** Ô nhập số và câu hỏi suy ngẫm */
  nhapSo: {
    giam: 'Giảm một đơn vị',
    tang: 'Tăng một đơn vị',
  },
  suyNgam: {
    tieuDe: 'Câu hỏi suy ngẫm',
    chot: 'Chốt lựa chọn',
    gocNhin: 'Góc nhìn mở rộng: ',
  },

  /** Khung trang bài học 2D (LessonPage2D) */
  baiHoc: {
    /** Tên 3 trạm */
    tram: { de: 'Dễ', tb: 'Trung bình', kho: 'Khó' },
    /** Nhãn đọc cho người dùng đọc màn hình: {tenTram}, {sao} */
    tramDaXong: 'Trạm {tenTram}: đã xong, {sao} sao',
    tramDangLam: 'Trạm {tenTram}: đang làm',
    /** Trạm đã mở (trạm trước đã có sao) nhưng em chưa làm: bấm để vào */
    tramMo: 'Trạm {tenTram}: đã mở, bấm để vào',
    /** Trạm chưa mở: phải làm trạm liền trước trước */
    tramKhoa: 'Trạm {tenTram}: chưa mở, cần xong trạm trước',
    /** Tên danh sách 3 trạm (đọc cho người dùng đọc màn hình) */
    cacTram: 'Các trạm của bài',
    emCoBiet: 'Em có biết?',
    dong: 'Đóng',
    truoc: 'Trước',
    sau: 'Tiếp',
    /** Thẻ "Em có biết?" thứ {n} trên {tong} */
    theSo: 'Thẻ {n}/{tong}',
    tramTiepTheo: 'Trạm tiếp theo',
    xongBai: 'Xong bài',
    dieuVuaHoc: 'Điều em vừa học',
    nhanTrang: 'Nhận Trang Sổ Vàng',
    /** Dòng ghi sao đã đạt của trạm: {tenTram}, {sao} */
    saoTram: 'Trạm {tenTram}: {sao} sao',
    xuTram: 'Xu nhận ở trạm này: {so}',
    veBanDo: 'Về bản đồ',
  },

  /** Hộp thoại chung (Modal) */
  hopThoai: {
    macDinh: 'Hộp thoại',
    dong: 'Đóng hộp thoại',
  },

  /** Thẻ kéo thả hoặc chạm chọn (TapOrDrag) */
  keoTha: {
    oDatThe: 'Ô đặt thẻ',
    chamDeDat: 'Chạm để đặt vào đây',
    keoHoacCham: 'Kéo hoặc chạm đặt vào đây',
  },

  /** Tim (số lượt sai còn được phép) */
  tim: {
    /** {so} tim còn lại trên {max} */
    nhan: 'Còn {so} trên {max} tim',
  },

  /** Màn hết tim (LevelFailed) */
  hetTim: {
    tieuDe: 'Hết tim mất rồi!',
    loiDongVien: 'Đừng nản lòng nhé, mỗi lần thử là một lần hiểu sâu hơn về blockchain!',
    meoTieuDe: 'Mẹo cho lượt chơi sau',
    thuLai: 'Thử lại',
    veBanDo: 'Về bản đồ',
  },

  /** Màn bị khóa mà em gõ thẳng đường dẫn vào */
  manKhoa: {
    tieuDe: 'Màn này đang khóa',
    veBanDo: 'Về bản đồ',
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
    chatLuong: 'Chất lượng đồ họa',
    chatLuongGhiChu: 'Chọn Thấp nếu máy chạy chậm hoặc nóng. Tự động là để máy tự chọn theo cấu hình.',
    chatLuongTuDong: 'Tự động',
    chatLuongThap: 'Thấp',
    chatLuongVua: 'Vừa',
    chatLuongCao: 'Cao',
    doNhayChuot: 'Độ nhạy chuột',
    doNhayChuotGhiChu: 'Tốc độ xoay camera khi rê chuột ở cảnh đi lại (máy tính). Kéo sang phải để xoay nhanh hơn.',
    doNhayChuotGiaTri: '{so}×',
  },

  /** Màn hình tải cảnh 3D */
  tai3d: {
    /** Dòng chữ trên thanh tiến độ khi đang tải model và ảnh của cảnh */
    dangTai: 'Đang tải cảnh…',
    /** Phần trăm đã tải */
    phanTram: '{so}%',
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
    hotspotTieuDe: 'Căn 4 điểm làng trên bản đồ (dev)',
    hotspotHuongDan: 'Kéo từng điểm tới đúng chỗ trên ảnh. Bấm "Chép", rồi dán đè vào packages/core/src/content/banDoHotspots.ts.',
    hotspotChep: 'Chép',
    hotspotDaChep: 'Đã chép. Dán vào banDoHotspots.ts.',
    hotspotKhongChepDuoc: 'Không chép tự động được. Em bôi đen đoạn bên dưới rồi chép tay.',
    hotspotToaDo: '{lang}: x = {x}%, y = {y}%',
    /** Cảnh báo ở console khi chạy dev */
    thieuAnh: 'Thiếu ảnh "{path}" trong manifest',
    anhLoi: 'Không tải được ảnh "{path}" ({src})',
    manifestLoi: 'Không tải được {path} ({loi}). Đã chạy pnpm dev:assets chưa?',
    modelThieu: 'Không có model "{id}" trong manifest. Dùng hình thay thế.',
    modelLoi: 'Không tải được model "{id}" ({loi}). Dùng hình thay thế.',
    modelTextureLon: 'Model "{id}" có texture {x}×{y}, lớn hơn {max}. Hãy nén lại bằng pnpm assets:build.',
  },

  /** Trang /dev/3d (chỉ có khi chạy dev) */
  dev3d: {
    tieuDe: 'Model 3D (dev)',
    chonModel: 'Model',
    thongTin: '{so} tam giác, {kb} KB',
    banXa: 'Bản xa',
    banXaTuDong: 'Tự động theo khoảng cách',
    banXaChinh: 'Luôn bản chính',
    banXaXa: 'Luôn bản xa',
    khongCoBanXa: 'Model này không có bản xa.',
    chatLuong: 'Chất lượng',
    mucDangDung: 'Mức đang dùng: {muc}. Đổi bản xa ở {m} đơn vị.',
    fps: 'FPS: {so}',
    khoangCach: 'Khoảng cách camera: {so}',
    clip: 'Clip trong file',
    khongCoClip: '(không có clip)',
    hinhThayThe: 'Đang dùng hình thay thế (thiếu file hoặc tải lỗi).',
    huongDan: 'Kéo để xoay, lăn chuột hoặc chụm hai ngón để phóng to.',
    phatClip: 'Phát clip',
    clipBorMuon: 'Clip còn thiếu trong file được mượn của học sinh.',
    trangThai: 'Trạng thái',
    trangThaiDung: 'Đứng yên',
    trangThaiNoi: 'Đang nói',
    trangThaiVui: 'Vui (bật lên)',
    doanPhat: 'Đoạn phát clip',
    jumpTu: 'jump: bắt đầu ở {so}%',
    jumpDen: 'jump: kết thúc ở {so}%',
    cheerGiay: 'cheer: phát {so} giây đầu',
    xuatClipConfig: 'Xuất ra clipConfig.ts',
    datLaiDoan: 'Đặt lại',
    daChep: 'Đã chép vào bộ nhớ tạm. Dán đè vào packages/core/src/three/clipConfig.ts.',
    khongChep: 'Không chép tự động được. Bôi đen đoạn mã bên dưới rồi chép tay.',
    xemNhom: 'Xem cả nhóm',
    xemTungModel: 'Xem từng model',
    nhomMoTa: '10 nhân vật cao 1,7 và Bi. 6 người đứng yên nhún lệch pha; bà cụ và chú nông dân đi vòng.',
    tuThe: 'Tư thế code dựng',
    tuTheGhiChu: 'Trộn lên clip đang chạy, vào ra 0,1 giây. hurt chỉ có tác dụng với Tí.',
    tuThePoint: 'point (chỉ về bên phải, phía trên)',
    phanUngTieuDe: 'Thử ChoiceReaction',
    phanUngHuongDan: 'Rê chuột hoặc Tab vào một đáp án thì học sinh quay đầu và người về phía đó và chỉ. Bấm (hoặc chạm: chỉ 0,3 giây rồi mới ra kết quả) thì kết quả đúng hoặc sai ngẫu nhiên.',
    phanUngDapAn: 'Đáp án {x}',
    phanUngDung: 'Kết quả: đúng (học sinh cheer, Tí giữ idle)',
    phanUngSai: 'Kết quả: sai (học sinh sad, Tí cheer)',
    phanUngChon: 'Đang chờ em chọn.',
  },

  /** Điều khiển ở cảnh đi lại (spec 03 mục 3.7) */
  dungDi: {
    /** Lời nhắc khi đứng gần một vật tương tác được (máy tính). {vat} là tên vật. */
    nhacTuongTac: 'E: {vat}',
    /** Nhãn đọc và chữ trên nút ✋ ở điện thoại */
    nutTuongTac: 'Tương tác với {vat}',
    nutTuongTacTrong: 'Tương tác',
    nutNhay: 'Nhảy',
    canDieuKhien: 'Cần điều khiển: chạm nửa trái màn hình rồi kéo',
    bieuTuongTuongTac: '✋',
    bieuTuongNhay: '⬆',
    /** Dòng nhắc nhỏ lúc mới vào cảnh, trước khi khóa chuột (máy tính) */
    baiDeDieuKhien: 'Bấm để điều khiển',
    /** Hộp Menu khi nhả khóa chuột (Esc hoặc chuyển cửa sổ) */
    menuTieuDe: 'Menu',
    menuMoTa: 'Chuột đã được nhả, điều khiển đang tạm dừng.',
    baiDeChoiTiep: 'Bấm để chơi tiếp',
    /** Điện thoại: nút đóng menu */
    menuTiepTuc: 'Tiếp tục',
  },

  /** Chợ phiên 3D /cho (mốc 2) */
  cho: {
    tieuDe: 'Chợ phiên',
    /** HUD góc trên trái: {nd} là dòng nhiệm vụ (đã qua fmt) */
    nhiemVu: 'Nhiệm vụ: {nd}',
    /** HUD góc trên phải: nút mở menu (máy tính: Esc nhả chuột rồi menu hiện ra) */
    nutMenu: 'Menu',
    nutMenuNhan: 'Mở menu',
    /** Lời nhắc tương tác: "E: {vat}" ({nguoi} là tên người, {lang} là tên làng) */
    nhanNoiChuyen: 'Nói chuyện với {nguoi}',
    nhanCongMo: 'Vào {lang}',
    nhanCongDong: 'Xem cổng {lang}',
    /** Cổng làng còn khóa: {truoc} là tên làng phải giúp trước */
    congDong: 'Cổng làng đóng vì sổ đang lệch. Hãy giúp {truoc} trước nhé.',
    /** Menu của chợ (hộp hiện khi nhả khóa chuột hoặc bấm nút menu) */
    menu: {
      tiepTuc: 'Tiếp tục',
      hoSo: 'Hồ sơ',
      caiDat: 'Cài đặt',
      docLaiTruyen: 'Đọc lại truyện',
      banDo: 'Bản đồ',
      veTrangChu: 'Về trang chủ',
      quayLai: 'Quay lại',
      /** Chỉ có ở menu cảnh làng */
      veCho: 'Về chợ',
    },
  },

  /** Cảnh làng 3D (spec 03 mục 6; mốc 2 bước 9) */
  langScene: {
    /** Lời nhắc tương tác: "E: {vat}" ({bien} là chữ trên biển, {nguoi} là tên người) */
    nhanBien: 'Vào màn: {bien}',
    nhanBienKhoa: 'Xem biển: {bien}',
    nhanCong: 'Về chợ',
    /** Dòng nhiệm vụ ({bien}: chữ trên biển; {lang}: tên làng) */
    nhiemVuMan: 'Đến biển "{bien}".',
    nhiemVuXong: '{lang} đã xong việc! Quay về chợ để sang làng kế tiếp.',
    /** Bi nhắc việc khi nói chuyện */
    biNhacMan: 'Việc tiếp theo ở {lang}: đến biển "{bien}".',
    biNhacXong: '{lang} xong hết rồi! Mình quay về chợ nhé.',
    /** Biển còn khóa (kèm "Hoàn thành … để mở" của ui.moKhoa) và màn sắp ra mắt */
    bienSapRaMat: 'Màn "{bien}" sắp ra mắt. Em cứ làm việc khác trước nhé.',
    /** Nhãn trạng thái vẽ trên biển gỗ */
    bienDaXong: 'Đã xong',
    bienKhoa: 'Khóa',
    bienSapRaMat2: 'Sắp ra mắt',
    /** Nút ở cuối màn 1: về làng (mở cảnh làng) và chơi tiếp game 1 */
    veLang: 'Về làng',
    choiTiep: 'Chơi tiếp: {man}',
  },

  /** Trang /dev/walk (chỉ có khi chạy dev) */
  devWalk: {
    tieuDe: 'Đi lại (dev)',
    huongDan: 'Hướng dẫn',
    huongDanMayTinh: 'W đi về phía camera nhìn; A, D, S quay người rồi đi · Shift để chạy · Space để nhảy · E để tương tác · bấm vào khung để khóa chuột, rê chuột để xoay camera · Esc nhả chuột và mở menu.',
    huongDanDienThoai: 'Chạm nửa trái màn hình rồi kéo để đi (đẩy quá 80% là chạy) · vuốt nửa phải để xoay camera · nút ⬆ để nhảy · nút ✋ để tương tác.',
    fps: 'FPS: {so}',
    chatLuong: 'Chất lượng',
    mucDangDung: 'Mức đang dùng: {muc}',
    vatBienGo: 'Biển gỗ',
    vatHomThu: 'Hòm thư',
    suKienMenu: 'Đã nhận sự kiện mở menu: {so} lần',
    thuHienVa: 'Thử va chạm: đi xéo vào góc các hộp, đi sát cột tròn, đi ra rìa nền (bán kính 20).',
    veTrangChu: 'Về trang chủ',
    bienGoLuot1: 'Chào {ten}! Biển này chỉ để thử: bấm E (hoặc nút ✋) khi đứng gần là hộp thoại mở ra.',
    bienGoLuot2: 'Trong lúc hộp thoại mở, nhân vật đứng yên. Đóng hộp thoại là đi tiếp được.',
    homThuLuot1: 'Đây là hòm thư của làng. Chưa có thư nào, {ten} quay lại sau nhé.',
  },

  /** Lời thoại mẫu ở trang /dev/ui (4 lượt: bác An, {phanDien}, Bi, cô Chi) */
  hoiThoaiMau: {
    luot1: 'Chào {ten}! Hôm nay bác sẽ chỉ em cách giữ cuốn sổ chung của cả làng.',
    luot2: 'Hừ, giữ sổ làm gì cho mệt. Để {phanDien} ghi gì vào đó cũng được chứ!',
    luot3: 'Không được đâu! Mỗi trang sổ đều có mã riêng, sửa lén là bị phát hiện ngay.',
    luot4: 'Đúng vậy. {Ten} nhớ nhé: cả làng cùng giữ một cuốn sổ giống hệt nhau.',
  },
} as const;

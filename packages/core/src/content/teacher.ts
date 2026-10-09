/**
 * Chữ của trang giáo viên /giao-vien (spec 09). Mọi chữ hiện ra nằm ở đây, không viết thẳng trong component.
 * Chuỗi có {…} được điền bằng fmt() hoặc replace trong code.
 */

export const teacherTexts = {
  tieuDe: 'Trang giáo viên',
  veTrangChu: 'Về trang chủ',
  dangTai: 'Đang tải…',
  chuaCauHinh: 'Chưa kết nối được máy chủ. Thầy/cô kiểm tra cấu hình đăng nhập rồi thử lại.',
  loiTai: 'Chưa tải được dữ liệu. Thầy/cô thử lại sau ít phút.',
  thuLai: 'Thử lại',

  /** Danh sách lớp */
  lop: {
    tieuDe: 'Các lớp của thầy/cô',
    trong: 'Chưa có lớp nào. Thầy/cô bấm "Tạo lớp" để bắt đầu.',
    taoLop: 'Tạo lớp',
    tenLop: 'Tên lớp',
    tenLopGoiY: 'Ví dụ: 10A1',
    tenLopTrong: 'Thầy/cô nhập tên lớp nhé.',
    tenLopQuaDai: 'Tên lớp tối đa 60 ký tự.',
    taoXong: 'Tạo lớp',
    huy: 'Hủy',
    dangTao: 'Đang tạo…',
    loiTao: 'Chưa tạo được lớp. Thầy/cô thử lại nhé.',
    daTao: 'Đã tạo lớp {ten}.',
    maLop: 'Mã lớp',
    saoChep: 'Sao chép',
    daSaoChep: 'Đã sao chép',
    khongSaoChep: 'Chưa sao chép được. Thầy/cô chọn mã rồi chép tay nhé.',
    huongDanMa: 'Học sinh vào Hồ sơ → Nhập mã lớp → Vào lớp.',
    moLop: 'Mở lớp',
    soHocSinh: '{so} học sinh',
    veDanhSach: '← Các lớp',
  },

  /** 3 tab của một lớp */
  tab: {
    tienDo: 'Tiến độ',
    cauHoi: 'Câu hỏi',
    hocSinh: 'Học sinh',
  },

  /** Tab Tiến độ */
  tienDo: {
    timTen: 'Tìm theo tên',
    timTenGoiY: 'Gõ tên học sinh',
    loc: 'Lọc',
    locTatCa: 'Tất cả học sinh',
    locChuaXong: 'Chưa xong {lang}',
    xuatCsv: 'Xuất CSV',
    tenCsv: 'tien-do-{lop}.csv',
    trong: 'Lớp chưa có học sinh. Thầy/cô gửi mã lớp cho các em nhé.',
    khongThay: 'Không có học sinh nào khớp.',
    cotTen: 'Học sinh',
    cotMan: 'Màn {so}',
    cotSoVang: 'Trang Sổ Vàng',
    cotTongSao: 'Tổng sao',
    cotLanCuoi: 'Chơi gần nhất',
    chuaChoi: 'Chưa chơi',
    chuThich: 'Bài học: ★ là số sao của 3 trạm (Dễ, Trung bình, Khó). Game: ✓ là đã chơi, kèm mốc đồng, bạc, vàng nếu đạt. Ô trống là chưa chơi.',
    bamXemChiTiet: 'Bấm tên học sinh để xem chi tiết.',
  },

  /** Ký hiệu trong ô bảng tiến độ */
  o: {
    sao: '★{so}',
    game: '✓',
    gameMoc: '✓ {moc}',
    moc: ['', 'đồng', 'bạc', 'vàng'],
  },

  /** Chi tiết một học sinh */
  chiTiet: {
    tieuDe: 'Chi tiết: {ten}',
    dong: 'Đóng',
    sao: 'Sao từng trạm',
    diemGame: 'Điểm cao nhất từng game',
    tramDe: 'Dễ',
    tramTb: 'Trung bình',
    tramKho: 'Khó',
    chuaChoi: 'Chưa chơi',
    chuaCoGame: 'Chưa có game nào được chơi.',
    diem: '{diem} điểm',
    tiLeDung: 'Tỉ lệ trả lời đúng',
    tiLeDungGiaTri: '{dung}/{tong} câu ({phanTram}%)',
    chuaTraLoi: 'Chưa trả lời câu hỏi nào',
    dangTai: 'Đang tải…',
    loi: 'Chưa tải được tỉ lệ trả lời đúng.',
    soVang: 'Trang Sổ Vàng: {so}/4',
    tongSao: 'Tổng sao: {so}',
  },

  /** Tab Câu hỏi */
  cauHoi: {
    trong: 'Các em chưa trả lời câu hỏi nào.',
    cotCau: 'Câu hỏi',
    cotLuot: 'Lượt trả lời',
    cotTiLe: 'Tỉ lệ đúng',
    ghiChu: 'Câu có tỉ lệ đúng thấp nhất ở trên cùng, để thầy/cô biết cả lớp đang vướng ở đâu.',
    khongTimThay: 'Câu {ma}',
    bai: 'Bài {so}',
  },

  /** Tab Học sinh */
  hocSinh: {
    trong: 'Lớp chưa có học sinh.',
    taiKhoanGoogle: 'Tài khoản Google',
    taiKhoanTen: 'Tài khoản tên đăng nhập',
    datLaiMatKhau: 'Đặt lại mật khẩu',
    xoaKhoiLop: 'Xóa khỏi lớp',
    xemChiTiet: 'Xem chi tiết',
    chiTiet: 'Chi tiết',
    huy: 'Hủy',
    googleKhongCoMatKhau: 'Tài khoản Google không có mật khẩu để đặt lại.',
    ghiChuGoogle: 'Đăng nhập bằng Google, không có mật khẩu để đặt lại.',
  },

  /** Hộp đặt lại mật khẩu */
  datLai: {
    tieuDe: 'Đặt lại mật khẩu cho {ten}',
    matKhauMoi: 'Mật khẩu mới',
    goiY: 'Ít nhất 8 ký tự',
    taoNgauNhien: 'Tạo ngẫu nhiên',
    hien: 'Hiện mật khẩu',
    an: 'Ẩn mật khẩu',
    datLai: 'Đặt lại',
    dangDat: 'Đang đặt…',
    huy: 'Hủy',
    quaNgan: 'Mật khẩu cần ít nhất 8 ký tự.',
    xong: 'Đã đặt lại mật khẩu cho {ten}.',
    docChoEm: 'Mật khẩu mới của em (chỉ hiện một lần):',
    luuY: 'Thầy/cô đọc hoặc ghi lại cho em ngay bây giờ. Đóng hộp này là không xem lại được.',
    saoChep: 'Sao chép mật khẩu',
    daSaoChep: 'Đã sao chép',
    dong: 'Đã ghi lại, đóng',
    loi: {
      unauthenticated: 'Phiên đăng nhập đã hết. Thầy/cô đăng nhập lại nhé.',
      forbidden: 'Học sinh này không thuộc lớp của thầy/cô.',
      not_found: 'Không tìm thấy tài khoản của em này.',
      google_account: 'Tài khoản Google không có mật khẩu để đặt lại.',
      weak_password: 'Mật khẩu cần ít nhất 8 ký tự.',
      update_failed: 'Không đặt lại được. Thầy/cô thử mật khẩu khác nhé.',
      mac_dinh: 'Chưa đặt lại được mật khẩu. Thầy/cô thử lại sau ít phút.',
    },
  },

  /** Hộp xác nhận xóa khỏi lớp */
  xoa: {
    tieuDe: 'Xóa khỏi lớp?',
    noiDung: 'Thầy/cô xóa {ten} khỏi lớp {lop}? Em vẫn giữ tiến độ chơi của mình và có thể nhập mã lớp để vào lại.',
    dongY: 'Xóa khỏi lớp',
    huy: 'Hủy',
    dangXoa: 'Đang xóa…',
    xong: 'Đã xóa {ten} khỏi lớp.',
    loi: 'Chưa xóa được. Thầy/cô thử lại nhé.',
  },
} as const;

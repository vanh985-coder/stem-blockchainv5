/**
 * Chữ của bản đồ nhỏ và bản đồ lớn ở thế giới mở (mốc 2, bước X4). Mọi câu đi qua fmt() ({xong}, {tong}, {nd}). Tên làng lấy từ `ui.lang`, tên màn từ `content/levels.ts`.
 */
export const banDoNho = {
  /** Nút bản đồ nhỏ (máy tính bấm phím M, điện thoại chạm vào bản đồ) */
  nhan: 'Bản đồ nhỏ. Bấm vào đây hoặc bấm phím M để mở bản đồ lớn.',
  nhanDt: 'Bản đồ nhỏ. Chạm vào đây để mở bản đồ lớn.',
  /** Chữ B nhỏ chỉ hướng bắc */
  bac: 'B',
  cho: 'Chợ',
  /** Tên ngắn của làng trên bản đồ nhỏ (khung nhỏ không đủ chỗ cho chữ "Làng") */
  tenNgan: { 'lang-giay': 'Giấy', 'lang-det': 'Dệt', 'lang-khac-dau': 'Khắc Dấu', 'lang-bac': 'Bạc' },
  /** Bản đồ lớn */
  tieuDe: 'Bản đồ thế giới',
  dong: 'Đóng',
  dongNhan: 'Đóng bản đồ',
  huongDan: 'Bấm M hoặc Esc để đóng bản đồ.',
  huongDanDt: 'Chạm nút Đóng để quay lại chơi.',
  chuThichTieuDe: 'Chú thích',
  chuThich: {
    em: 'Em đang ở đây',
    diemDen: 'Điểm đến của nhiệm vụ',
    congMo: 'Cổng đã mở',
    congKhoa: 'Cổng chưa mở',
    manXong: 'Màn đã xong',
    manMo: 'Màn đang mở',
    manKhoa: 'Màn chưa mở',
    sapRaMat: 'Màn sắp ra mắt',
    the: 'Thẻ "Em có biết?" chưa nhặt',
    bac: 'Hướng bắc ở phía trên',
  },
  tienDoTieuDe: 'Tiến độ từng làng',
  tienDoMan: 'Màn đã xong: {xong}/{tong}',
  tienDoThe: 'Thẻ "Em có biết?": {xong}/{tong}',
  tienDoTrangCo: 'Trang Sổ Vàng: đã nhận',
  tienDoTrangChua: 'Trang Sổ Vàng: chưa nhận',
  viecTiepTheo: 'Việc tiếp theo: {nd}',
} as const;

/** Thẻ "Em có biết?" chưa nhặt trong vùng bản đồ làng của trang /ban-do (P2b); {n}, {tong}, {lang}, {khu} đi qua fmt(). */
export const banDoThe = {
  /** Tiêu đề vùng bản đồ làng */
  tieuDe: 'Thẻ "Em có biết?" chưa nhặt',
  /** Chú thích ký hiệu hình thoi vàng */
  chuThich: 'Thẻ "Em có biết?" chưa nhặt',
  /** Dòng đếm dưới tiêu đề */
  conLai: 'Còn {n}/{tong} thẻ trong {lang}',
  /** Đã nhặt đủ: không vẽ bản đồ */
  het: 'Em đã nhặt đủ thẻ "Em có biết?" của {lang}.',
  /** Chữ "Bắc" ở mép trên bản đồ */
  bac: 'Bắc',
  /** Ghi chú cách đọc bản đồ */
  viTri: 'Bản đồ bố cục thật của làng; hình thoi vàng đúng chỗ thẻ đang nằm.',
  /** Lời đọc màn hình của vùng bản đồ */
  docVung: 'Bản đồ {lang}',
  /** Lời đọc màn hình của một thẻ */
  docThe: 'Thẻ {so}, gần {khu}',
  /** Dòng danh sách (số thẻ nằm ở hình tròn bên cạnh) */
  dong: 'Gần {khu}',
} as const;

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

/**
 * Chữ của game phụ (spec 03 mục 6, `MiniGameLevel`): thẻ bắt đầu, màn kết quả, tạm dừng, và luật, cách điều khiển từng game.
 * Mọi câu đi qua fmt() trước khi hiện ({phanDien}, {diem}…). Số mốc điểm không nằm ở đây mà do từng game truyền cho `MiniGameLevel`.
 */

export interface GameText {
  /** Tên game, ví dụ "Đuổi theo {phanDien}" */
  ten: string;
  /** Luật chơi 2 đến 3 dòng */
  luat: readonly string[];
  /** Cách điều khiển */
  dieuKhien: { mayTinh: string; dienThoai: string };
}

/** Chữ từng game phụ, theo số màn (1 đến 12). Màn 2 làm ở mốc 2 bước 10; các game khác thêm khi làm tới. */
export const GAMES: Readonly<Partial<Record<number, GameText>>> = {
  2: {
    ten: 'Đuổi theo {phanDien}',
    luat: [
      '{phanDien} ôm xấp trang bị trộm chạy qua làng. Em chạy theo, nhặt lại trang sổ và tiền đồng.',
      'Tránh chướng ngại bằng cách đổi làn, nhảy hoặc trượt. Em có 3 tim, mỗi lần va chạm mất 1 tim.',
      'Hết mỗi vòng có một câu hỏi: trả lời đúng được thêm 3 trang, sai thì mất 1 tim.',
    ],
    dieuKhien: {
      mayTinh: '← → hoặc A D để đổi làn · ↑ W hoặc Space để nhảy · ↓ hoặc S để trượt.',
      dienThoai: 'Vuốt sang trái hoặc phải để đổi làn · vuốt lên để nhảy · vuốt xuống để trượt.',
    },
  },
};

export const gameUi = {
  /** Thẻ bắt đầu */
  luat: 'Luật chơi',
  dieuKhien: 'Cách điều khiển',
  mayTinh: 'Máy tính',
  dienThoai: 'Điện thoại',
  diemCao: 'Điểm cao nhất: {diem}',
  chuaChoi: 'Em chưa chơi màn này.',
  cacMoc: 'Mốc điểm: Đồng {so} · Bạc {so2} · Vàng {so3}',
  batDau: 'Bắt đầu',
  /** Màn kết quả */
  ketQua: 'Kết quả',
  diem: 'Điểm: {diem}',
  /** Tên mốc, theo chỉ số 0 đến 3: chưa đạt, Đồng, Bạc, Vàng */
  moc: ['Chưa đạt mốc', 'Đồng', 'Bạc', 'Vàng'] as const,
  mocDatDuoc: 'Mốc em đạt: {muc}',
  kyLucMoi: 'Kỷ lục mới!',
  xuNhan: 'Em nhận được {so} xu.',
  choiLai: 'Chơi lại',
  veLang: 'Về làng',
  /** Thanh trên màn chơi: quãng đường đã chạy */
  quangDuong: '{so} m',
  /** Tạm dừng khi tab bị ẩn */
  tamDung: 'Tạm dừng',
  tamDungLoiNhac: 'Trò chơi đã dừng vì em rời khỏi trang này.',
  tiepTuc: 'Tiếp tục',
} as const;

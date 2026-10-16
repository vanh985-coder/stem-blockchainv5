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
  3: {
    ten: 'Ghép lại cuốn sổ',
    luat: [
      'Em mang các trang lấy lại về bàn của bác An, ghép lại cuốn sổ như ban đầu. Mỗi thẻ ghi: mã trang trước · nội dung · mã trang.',
      'Thẻ đặt vào ô kế tiếp phải có mã trang trước bằng mã của trang cuối chuỗi, và mã trang phải đúng công thức. Đặt sai thì thẻ bật về và em mất 1 tim.',
      '{phanDien} hay nhét một trang giả vào xấp giấy: mã trang trước khớp nhưng mã trang sai công thức. Kéo trang giả vào rổ để được thêm 30 điểm.',
    ],
    dieuKhien: {
      mayTinh: 'Kéo thẻ vào chuỗi hoặc vào rổ, hoặc bấm chọn thẻ rồi bấm vào chuỗi hoặc rổ · nút "Soi công thức" để tự tính mã trang.',
      dienThoai: 'Kéo thẻ bằng ngón tay, hoặc chạm chọn thẻ rồi chạm vào chuỗi hoặc rổ · chạm "Soi công thức" để tự tính mã trang.',
    },
  },
};

/** Tên các phần điểm ở màn kết quả của màn 2 (điểm = trang × 10 + tiền đồng + quãng đường ÷ 10 + câu đúng × 30). */
export const runnerScoreLabels = {
  trang: 'Trang sổ nhặt được',
  tien: 'Tiền đồng',
  quangDuong: 'Quãng đường chạy (mét)',
  cauDung: 'Câu hỏi trả lời đúng',
} as const;

/** Chữ trong lúc chơi màn 2: thanh trên, vật nhặt đặc biệt, câu hỏi giữa ván. */
export const runnerUi = {
  vong: 'Vòng {so}/{max}',
  trang: 'Trang sổ: {so}',
  tien: 'Tiền đồng: {so}',
  nonla: 'Nón lá',
  guoc: 'Guốc mộc',
  tui: 'Túi tiền',
  /** Nhãn đọc cho người dùng đọc màn hình: tên vật và số giây còn lại */
  conLai: '{nhan}: còn {giay} giây',
  cauSo: 'Câu {so}/{max}',
  cauHoi: 'Hết vòng {so}! Em trả lời đúng thì {phanDien} làm rơi thêm trang.',
  conGio: 'Còn {giay} giây',
  hetGio: 'Hết giờ rồi, em mất 1 tim.',
  dapAnDung: 'Đáp án đúng: {dapAn}',
  quizDung: '{phanDien} làm rơi thêm trang! Em được thêm {so} trang.',
  quizSai: 'Chưa đúng, em mất 1 tim.',
  chayTiep: 'Chạy tiếp',
  xemKetQua: 'Xem kết quả',
} as const;

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
  /** Một dòng điểm thành phần ở màn kết quả: tên phần, số lượng, điểm */
  dongDiem: '{nhan}: {so} → {diem} điểm',
  cacPhanDiem: 'Điểm từng phần',
  choiLai: 'Chơi lại',
  veLang: 'Về làng',
  /** Thanh trên màn chơi: quãng đường đã chạy */
  quangDuong: '{so} m',
  /** Tạm dừng khi tab bị ẩn */
  tamDung: 'Tạm dừng',
  tamDungLoiNhac: 'Trò chơi đã dừng vì em rời khỏi trang này.',
  tiepTuc: 'Tiếp tục',
} as const;

/** Chữ trong màn 3 "Ghép lại cuốn sổ" (spec 05 mục Màn 3). Mọi câu đi qua fmt() ({phanDien}, {truoc}, {so}…). */
export const rebuildUi = {
  vong: 'Vòng {so}/{max}',
  diem: 'Điểm: {so}',
  chuThich: 'Mỗi thẻ ghi: mã trang trước · nội dung · mã trang',
  /** Nhãn đọc cho người dùng đọc màn hình */
  theNhan: 'Thẻ: mã trang trước {truoc}, nội dung {noidung}, mã trang {ma}',
  theChon: 'Đang chọn. {the}',
  bia: 'Trang bìa',
  biaMa: 'Trang bìa, mã G là {so}',
  oChuoi: 'Ô số {so} của chuỗi, còn trống',
  oChuoiDay: 'Ô số {so} của chuỗi: {the}',
  chuoi: 'Chuỗi trang. Bấm vào đây để đặt thẻ đang chọn.',
  khay: 'Khay trang chưa ghép',
  roTrangGia: 'Rổ trang giả',
  roNhan: 'Rổ trang giả. Bấm vào đây để bỏ thẻ đang chọn vào rổ.',
  nhacChon: 'Chọn một thẻ ở khay trước đã.',
  /** Lời của Bi theo kết quả từng lần đặt */
  biSaiMaTruoc: 'Mã trang trước chưa khớp với trang cuối chuỗi. Em mất 1 tim.',
  biTrangGia: 'Trang giả của {phanDien}! Em mất 1 tim.',
  biBatDuoc: 'Bắt được trang giả của {phanDien}! Em được thêm {so} điểm.',
  biTrangThat: 'Trang này là trang thật mà. Em soi công thức lại nhé. Em mất 1 tim.',
  biDuChuoi: 'Đủ chuỗi rồi! Cuốn sổ liền mạch như ban đầu.',
  biHetTim: 'Em hết tim rồi. Mình cùng xem kết quả nhé.',
  biNhetTrang: 'Coi chừng, {phanDien} vừa nhét thêm một trang vào xấp giấy!',
  /** Lời của {phanDien} khi nhét trang giả */
  phanDienCuoi: 'Hí hí hí! Thêm một trang nữa, chắc không ai để ý đâu.',
  /** Soi công thức (để em tự tính mã trang, không hiện sẵn đáp án) */
  soiNut: 'Soi công thức',
  soiTieuDe: 'Soi công thức mã trang',
  soiChuaChon: 'Em chọn một thẻ ở khay, rồi bấm "Soi công thức" nhé.',
  soiPhepTinh: '({truoc} × 2 + {noidung}) mod 100 = ?',
  soiNhap: 'Em tính ra',
  soiKiemTra: 'Kiểm tra',
  soiSai: 'Chưa đúng, em tính lại nhé.',
  soiKhop: '({truoc} × 2 + {noidung}) mod 100 = {kq} → khớp',
  soiLech: '({truoc} × 2 + {noidung}) mod 100 = {kq}, thẻ ghi {ma} → không khớp',
  /** Hết vòng */
  vongXong: 'Vòng {so} xong! Em được {diem} điểm.',
  vongTiep: 'Vòng tiếp theo',
  xemKetQua: 'Xem kết quả',
  hetTim: 'Hết tim rồi!',
  /** Phần điểm ở màn kết quả: số lần sai và trang giả */
  phanVong: 'Vòng {so} (số lần sai)',
  phanTrangGia: 'Vòng {so}: bỏ đúng trang giả vào rổ',
} as const;

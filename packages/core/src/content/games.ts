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
  8: {
    ten: 'Lật thẻ tìm cặp khóa',
    luat: [
      'Bộ khuôn tập của chú Dũng bị {phanDien} trộn lung tung. Em ghép lại từng khuôn với mẫu công khai của nó nhé!',
      'Lật 2 thẻ mỗi lượt. Thẻ Khuôn tập x ghép với thẻ Mẫu công khai 5^x mod 23.',
      'Có Máy tính mod ở góc màn hình. Mỗi lần lật sai mất 10 điểm.',
      'Vòng 3: cứ 20 giây {phanDien} tráo chỗ 2 thẻ đang úp.',
    ],
    dieuKhien: {
      mayTinh: 'Bấm chuột, hoặc phím mũi tên và Enter',
      dienThoai: 'Chạm vào thẻ',
    },
  },
  12: {
    ten: 'Leo cây tìm lá giả',
    luat: [
      '{phanDien} vừa tráo một lá trên cây đa nên số gốc bị lệch. Em leo từ gốc lên, theo nhánh lệch để bắt {phanDien}!',
      'Mỗi tay nắm ghi số trong sổ và số bây giờ. Hãy nắm tay nắm có hai số khác nhau.',
      'Bật lên đúng lúc tay nắm tới ngay trên đầu em. Nắm nhầm nhánh khớp là mất 1 tim.',
      'Leo qua mỗi tầng ngay lần đầu thì được 2 tiền đồng.',
    ],
    dieuKhien: {
      mayTinh: 'Bấm chuột hoặc phím Space để bật lên',
      dienThoai: 'Chạm màn hình để bật lên',
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
  /** Soi công thức: hiện phép tính của thẻ đang chọn và khớp hay không (spec 05 Màn 3) */
  soiNut: 'Soi công thức',
  soiTieuDe: 'Soi công thức mã trang',
  soiChuaChon: 'Em chọn một thẻ ở khay, rồi bấm "Soi công thức" nhé.',
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
  /** Vòng 3 "giữ sổ" (bước X2): {phanDien} liên tục tráo trang, em sửa liên tục */
  giuSoTieuDe: 'Vòng {so}: Giữ sổ',
  giuSoLoi: '{phanDien} sẽ liên tục chạy vào và tráo trang thật trong chuỗi thành trang giả suốt {giay} giây. Em soi công thức, bỏ trang giả vào rổ, rồi đặt đúng trang thật vào chỗ trống. Sửa trong {nhanh} giây thì được thêm điểm.',
  giuSoBatDau: 'Bắt đầu giữ sổ',
  /** Bác An động viên trước vòng 3, kèm việc hồi đủ tim (bước X3) */
  bacAnDongVien: 'Bác An: "Cố lên con! Cuốn sổ này nhờ con giữ đấy. Bác hồi lại đủ sức cho con rồi, các tim của con đầy cả."',
  chuoiGiuSo: 'Chuỗi trang. Mỗi ô là một chỗ đặt trang.',
  chuoiLech: 'Chuỗi đang lệch',
  chuoiDung: 'Chuỗi đúng',
  dongHo: 'Còn {giay} giây',
  oChuoiTrong: 'Ô số {so} của chuỗi, đang trống. Bấm vào đây để đặt thẻ đang chọn.',
  oChuoiCoThe: 'Ô số {so} của chuỗi: {the}',
  biDaBat: 'Đúng trang giả rồi! Giờ em đặt trang thật vào chỗ trống nhé.',
  biSuaXong: 'Sửa xong một ô! Em được thêm {diem} điểm.',
  biChuoiDungLai: 'Chuỗi lại đúng rồi! Giữ vững nhé.',
  biOCoTrang: 'Ô này đang có trang rồi. Nếu em nghĩ đó là trang giả, hãy bỏ nó vào rổ trước.',
  biLechQua: 'Chuỗi lệch quá nhiều! {phanDien} cười khoái chí. Em mất 1 tim.',
  biGoiYTrai: 'Bi thấy có gì lạ ở nửa bên trái của chuỗi.',
  biGoiYPhai: 'Bi thấy có gì lạ ở nửa bên phải của chuỗi.',
  hetGio: 'Hết giờ! Em sửa được {sua} ô, còn lệch {lech} ô. Vòng {so} được {diem} điểm.',
  /** Phần điểm vòng 3 ở màn kết quả */
  phanSua: 'Vòng {so}: ô đã sửa xong (+{diem} mỗi ô)',
  phanNhanh: 'Vòng {so}: sửa trong {giay} giây (thêm +{diem} mỗi ô)',
  phanConLech: 'Vòng {so}: ô còn lệch khi hết giờ (−{diem} mỗi ô)',
} as const;

/** Chữ trong màn 8 "Lật thẻ tìm cặp khóa" (spec 07 mục Màn 8). Thẻ chỉ ghi số: không tên, không chân dung. */
export const memoryUi = {
  vong: 'Vòng {so}/{max}',
  diem: 'Điểm: {so}',
  sai: 'Lật sai: {so}',
  /** Chữ trên mặt thẻ (code vẽ): nhãn ở trên, số ở dưới */
  nhanKhuon: 'Khuôn tập',
  nhanMau: 'Mẫu công khai',
  /** Nhãn đọc cho người dùng đọc màn hình */
  luoi: 'Bàn thẻ. Dùng phím mũi tên để chọn thẻ, Enter để lật.',
  theUp: 'Thẻ úp, hàng {so}, cột {so2}',
  theKhuon: 'Khuôn tập: {x}',
  theMau: 'Mẫu công khai: {y}',
  daKhop: '{nhan}, đã khớp',
  /** Dòng hiện khi ghép đúng một cặp */
  khop: '5^{x} mod 23 = {y}',
  khopLoi: 'Khớp rồi!',
  saiLoi: 'Chưa khớp, hai thẻ sẽ úp lại.',
  trao: '{phanDien} vừa tráo chỗ 2 thẻ đang úp!',
  vongXong: 'Vòng {so} xong! Em lật sai {k} lần, được {diem} điểm.',
  vongTiep: 'Vòng tiếp theo',
  xemKetQua: 'Xem kết quả',
  /** Phần điểm ở màn kết quả: mỗi vòng một dòng, số lượng là số lần lật sai */
  phanVong: 'Vòng {so} (số lần lật sai)',
} as const;

/** Chữ của Máy tính mod (màn 8, màn 9): nhập khuôn x, ra mẫu công khai 5^x mod 23. */
export const modCalcUi = {
  nut: 'Máy tính mod',
  tieuDe: 'Máy tính mod',
  nhap: 'Nhập x (số nguyên từ 1 đến 22)',
  ketQua: '5^{x} mod 23 = {y}',
  loi: 'Em nhập một số nguyên từ 1 đến 22 nhé.',
  dong: 'Đóng',
} as const;

/** Chữ trong màn 12 "Leo cây tìm lá giả" (spec 08 mục Màn 12). Số trên tay nắm do code vẽ: hai dòng, không tô màu, không đánh dấu nhánh nào lệch. */
export const climbUi = {
  vong: 'Vòng {so}/{max}',
  dong: 'Tiền đồng: {so}',
  /** Hai dòng trên tay nắm: số trong sổ và số bây giờ (vòng 3–4 là mã 4 chữ số) */
  so: 'Sổ: {so}',
  nay: 'Nay: {so}',
  /** Nhãn đọc cho người dùng đọc màn hình */
  khung: 'Cây đa. Chạm, bấm chuột hoặc phím Space để bật lên.',
  tayNam: 'Tay nắm {nhan}: số trong sổ {so}, số bây giờ {so2}',
  trai: 'bên trái',
  phai: 'bên phải',
  nguCut: 'Ngõ cụt!',
  truot: 'Hụt rồi, em canh lại nhé.',
  /** Bi giải thích lần đầu vào màn (spec 08) */
  biGocCay: 'Trên bảng thì gốc vẽ ở trên cùng; còn ở cây thật thì gốc ở dưới. Vẫn là một cây thôi!',
  hieuRoi: 'Em hiểu rồi',
  /** Bắt được {phanDien} ở lá trên cùng: hết vòng */
  batDuoc: 'Bắt được {phanDien}!',
  vongXong: 'Em chỉ leo {so} tầng thay vì kiểm tra cả {so2} lá!',
  vongTiep: 'Vòng tiếp theo',
  xemKetQua: 'Xem kết quả',
  /** Hết tim */
  biGiup: 'Để Bi giúp em!',
  /** Phần điểm ở màn kết quả */
  phanVong: 'Vòng leo xong (× {diem})',
  phanDong: 'Tiền đồng',
  phanTim: 'Tim còn lại (× {diem})',
} as const;

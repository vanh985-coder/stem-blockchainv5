/**
 * Chữ của game phụ (spec 03 mục 6, `MiniGameLevel`): thẻ bắt đầu, màn kết quả, tạm dừng, và luật, cách điều khiển từng game.
 * Mọi câu đi qua fmt() trước khi hiện ({phanDien}, {diem}…). Số mốc điểm không nằm ở đây mà do từng game truyền cho `MiniGameLevel`.
 */

import { formatPower } from '../lib/power';
import { HUONG_DAN_GAME } from './huongDanGame';

export interface GameText {
  /** Tên game, ví dụ "Đuổi theo {phanDien}" */
  ten: string;
  /** Luật chơi 2 đến 3 dòng */
  luat: readonly string[];
  /** Cách điều khiển */
  dieuKhien: { mayTinh: string; dienThoai: string };
}

/**
 * Chữ từng game phụ, theo số màn (1 đến 12): tên game ở đây; luật và cách điều khiển lấy từ `content/huongDanGame.ts` (chủ dự án sửa chữ ở đó). Chỉ có các màn đã ra mắt.
 */
const textOf = (levelId: 2 | 3 | 5 | 6 | 8 | 9 | 11 | 12, ten: string): GameText => ({ ten, luat: HUONG_DAN_GAME[levelId].luat, dieuKhien: HUONG_DAN_GAME[levelId].dieuKhien });
export const GAMES: Readonly<Partial<Record<number, GameText>>> = {
  2: textOf(2, 'Đuổi theo {phanDien}'),
  3: textOf(3, 'Ghép lại cuốn sổ'),
  5: textOf(5, 'Đập {phanDien}'),
  6: textOf(6, 'Diều đưa sổ'),
  8: textOf(8, 'Lật thẻ tìm cặp khóa'),
  9: textOf(9, 'Bắn trứng khắc dấu'),
  11: textOf(11, 'Ghép lá cây sổ'),
  12: textOf(12, 'Leo bậc gỗ'),
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
  /** Chú thích cạnh điểm cao nhất đã lưu khi nó vượt điểm tối đa của phiên bản hiện tại (game đã đổi thang điểm, vd. màn 3 sau P4b) */
  kyLucCu: 'Kỷ lục từ phiên bản trước',
  xuNhan: 'Em nhận được {so} xu.',
  /** Một dòng điểm thành phần ở màn kết quả: tên phần, số lượng, điểm */
  dongDiem: '{nhan}: {so} → {diem} điểm',
  cacPhanDiem: 'Điểm từng phần',
  choiLai: 'Chơi lại',
  /** Sang màn kế tiếp đã ra mắt trong làng (nhãn đọc màn hình kèm tên màn); hết màn thì chỉ còn "Về làng" */
  choiTiep: 'Chơi tiếp',
  choiTiepNhan: 'Chơi tiếp: {man}',
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
  khop: `${formatPower(5, '{x}')} mod 23 = {y}`,
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
  ketQua: `${formatPower(5, '{x}')} mod 23 = {y}`,
  loi: 'Em nhập một số nguyên từ 1 đến 22 nhé.',
  dong: 'Đóng',
} as const;

/** Chữ trong màn 12 "Leo bậc gỗ" (spec 08 mục Màn 12). Số trên bậc gỗ do code vẽ. */
export const climbUi = {
  vong: 'Vòng {so}/{max}',
  /** Nhãn đọc cho người dùng đọc màn hình */
  khung: 'Cây đa. Đi sang trái, sang phải và nhảy lên bậc ghi số đúng.',
  /** Nút cảm ứng ở đáy màn hình */
  nutTrai: 'Đi sang trái',
  nutPhai: 'Đi sang phải',
  nutNhay: 'Nhảy',
  /** Đọc cho trình đọc màn hình mỗi khi lên tầng mới: số của em và số bậc anh em */
  docTang: 'Em đứng ở bậc ghi {so}. Bậc anh em bên {nhan} ghi {so2}.',
  trai: 'trái',
  phai: 'phải',
  /** Chữ khắc trên ngọn cây (số gốc trong sổ do code vẽ cạnh chữ này) */
  gocTrongSo: 'Gốc trong sổ',
  /** Hiện khi lên tới gốc: gốc em tính ra */
  gocEmTinh: 'Gốc em tính là {so}, khác gốc trong sổ là {so2}.',
  nguCut: 'Bậc này nứt rồi!',
  truot: 'Hụt rồi, em thử lại nhé.',
  /** Bi giải thích lần đầu vào màn (spec 08) */
  biGocCay: 'Trên bảng thì gốc vẽ ở trên cùng; còn ở cây thật thì gốc ở dưới. Vẫn là một cây thôi!',
  hieuRoi: 'Em hiểu rồi',
  /** Lên tới gốc, gốc em tính khác gốc trong sổ: lộ lá giả, bắt được {phanDien}, hết vòng */
  batDuoc: 'Bắt được {phanDien}!',
  vongXong: 'Em chỉ cần {so} phép ghép thay vì kiểm tra cả {so2} lá!',
  vongTiep: 'Vòng tiếp theo',
  xemKetQua: 'Xem kết quả',
  /** Hết tim */
  biGiup: 'Để Bi giúp em!',
  /** Phần điểm ở màn kết quả */
  phanVong: 'Vòng leo xong (× {diem})',
  phanTim: 'Tim còn lại (× {diem})',
} as const;

/** Chữ trong màn 5 "Đập {phanDien}" (spec 06 mục Màn 5). Mọi câu đi qua fmt() ({phanDien}, {so}…). */
export const whackUi = {
  /** Nhãn đọc màn hình của khung chơi */
  khung: 'Sân dệt. Phím D F J K hoặc chạm vào làn để đập chuột giấy.',
  diem: 'Điểm: {so}',
  xu: 'Xu: {so}',
  trum: 'Trùm: {so}/{max}',
  /** Nhãn đọc màn hình của hàng chấm vết mực */
  muc: 'Vết mực trên sổ: {so}/{max}',
  /** Lượt trùm: tiêu đề, thời gian, kết quả */
  cauHoi: '{phanDien} chạy xuống! Câu hỏi {so}/{max}',
  conGio: 'Còn {giay} giây',
  hetGio: 'Hết giờ rồi!',
  dapAnDung: 'Đáp án đúng: {dapAn}',
  uiDa: 'Ui da!',
  quizDung: 'Trúng rồi! Em đét được {phanDien}: +{diem} điểm và xoá 2 vết mực.',
  quizSai: '{phanDien} né được và chạy xuống sổ: thêm một vết mực.',
  tiepTuc: 'Chơi tiếp',
  /** Hết ván */
  hetMuc: 'Sổ đầy mực rồi! Mình thử lại nhé.',
  xongTrum: 'Em giữ được sổ qua cả 10 lượt của {phanDien}!',
  xemKetQua: 'Xem kết quả',
  /** Phần điểm ở màn kết quả: số lượng, điểm */
  phanChuot: 'Chuột đập trúng',
  phanDong: 'Tiền đồng nhặt được',
  phanTrum: 'Lượt trùm trả lời đúng',
  phanMuc: 'Vết mực trên sổ',
  /** Nhãn giao diện 2D */
  chuotCauHoi: 'Chuột câu hỏi',
  chuotThuong: 'Chuột thường',
  chuotDoiLan: 'Chuột đổi làn',
  chuotNhanh: 'Chuột nhanh',
  chuotTo: 'Chuột to',
  nhanThuong: 'Giấy',
  nhanDoiLan: 'Đổi',
  nhanNhanh: 'Nhanh',
  nhanTo: 'To',
  tenSo: 'Sổ Chung Làng Dệt',
  lanNhan: 'Làn {so}',
  nutDap: 'Đập làn {so}',
  nhacVungDap: 'Vùng đập',
  nhanVat: 'Học sinh nam',
  soChung: 'Sổ Chung',
  tienDong: 'Tiền đồng',
  sanChoi: 'Sân chơi 4 làn',
  nenPc: 'Bối cảnh Làng Dệt',
} as const;

/** Chữ trong màn 6 "Diều đưa sổ" (spec 06 mục Màn 6). Mọi câu đi qua fmt() ({phanDien}, {so}…). */
export const kiteUi = {
  /** Nhãn đọc màn hình của khung chơi */
  khung: 'Bầu trời làng Dệt. Chạm hoặc bấm Space để diều bật lên.',
  chamBatDau: 'Chạm để bắt đầu',
  diem: 'Điểm: {so}',
  trang: 'Trang bản sao: {so}',
  cong: 'Cổng {so}/{max}',
  /** Nhãn đọc màn hình của hàng tim */
  tim: 'Tim: {so}/{max}',
  /** Cổng làng: tiêu đề, thời gian, kết quả */
  cauHoi: 'Cổng làng thứ {so}/{max}! Trả lời để giao sổ.',
  conGio: 'Còn {giay} giây',
  hetGio: 'Hết giờ rồi, em mất 1 tim.',
  dapAnDung: 'Đáp án đúng: {dapAn}',
  quizDung: 'Đúng rồi! Cổng mở đón sổ: +{diem} điểm.',
  quizSai: 'Chưa đúng, em mất 1 tim. Cổng vẫn mở để diều đi tiếp.',
  tiepTuc: 'Chơi tiếp',
  giaoSo: 'Làng thứ {so} đã có sổ giống làng em!',
  /** Hết ván */
  hetTim: 'Diều hết sức rồi! Mình thử lại nhé.',
  xongCong: 'Cả 4 làng đã có sổ giống nhau!',
  xemKetQua: 'Xem kết quả',
  /** Phần điểm ở màn kết quả: số lượng, điểm */
  phanKhe: 'Khe đã bay qua',
  phanTrang: 'Trang bản sao nhặt được',
  phanCau: 'Câu hỏi trả lời đúng',
  phanCong: 'Cổng làng đã qua',
} as const;

/** Chữ trong màn 9 "Bắn trứng khắc dấu" (spec 07 mục Màn 9). Mọi câu đi qua fmt() ({phanDien}, {so}…); ^^x^^ là số mũ nhỏ (qua rich()). Số trên trứng do code vẽ, chỉ có con số. */
export const bubbleUi = {
  /** Nhãn đọc màn hình của khung chơi */
  khung: 'Bàn trứng khắc dấu. Phím mũi tên trái phải để ngắm, Space hoặc Enter để bắn, phím 1 đến 5 để chọn loại trứng; hoặc rê chuột rồi bấm, hoặc kéo ngón tay trên bàn rồi thả tay để bắn.',
  banTrung: 'Bàn trứng',
  /** Bước nạp trứng */
  napTieuDe: 'Nạp trứng: đợt {so}/{max}',
  napHuongDan: 'Mỗi khóa riêng cần một trứng khắc đúng mẫu công khai {congThuc}. Bấm vào trứng đúng ở khay; trứng không dùng tới thì để lại.',
  khay: 'Khay trứng',
  khayDoc: 'Khay trứng. Bấm vào trứng ghi mẫu công khai đúng của một khóa riêng.',
  trungKhay: 'Trứng ghi số {y}',
  trungKhayNap: 'Trứng ghi số {y}, đã nạp vào máy bắn',
  mayBan: 'Máy bắn',
  chonNap: 'Chỗ nạp {so}: {y}',
  chonTrong: 'Chỗ nạp {so}: còn trống',
  napDung: 'Đúng rồi! Trứng ghi {y} đã vào máy bắn.',
  napSai: 'Chưa đúng: không khóa nào của đợt này có 5^^x^^ mod 23 bằng {y}. Đợt này mất thưởng nạp.',
  napCon: 'Còn {so} trứng cần nạp.',
  napXong: 'Đủ trứng rồi! Bấm "Bắt đầu đợt {so}" khi em sẵn sàng.',
  batDau: 'Bắt đầu đợt {so}',
  /** Cột khóa riêng */
  khoaTieuDe: 'Khóa riêng của đợt',
  khoaMuc: 'Khóa {x}',
  khoaDoc: 'Các khóa riêng của đợt: {ds}',
  /** Đợt chơi */
  dot: 'Đợt {so}/{max}',
  diem: 'Điểm: {so}',
  tim: 'Tim: {so}/{max}',
  haBan: 'Hạ bàn sau {so} phát',
  haBanDoc: 'Còn {so} phát nữa thì cả bàn hạ một hàng.',
  trungCon: 'Trứng còn: {so}',
  loaiTrung: 'Chọn loại trứng',
  nutTrung: 'Trứng ghi {y}. Phím {so}.',
  nutTrungChon: 'Trứng ghi {y}, đang chọn. Phím {so}.',
  nutTrungHet: 'Trứng ghi {y}, không còn trên bàn.',
  nutBan: 'Bắn',
  nutBanKhoa: 'Chọn loại trứng trước',
  chonTruoc: 'Em chọn loại trứng trong máy bắn trước đã.',
  vaoBanThu: 'Làm thử, không tính điểm',
  /** Lời nói ngắn khi chơi */
  trungVo: 'Vỡ {so} trứng!',
  trungRoi: 'Rơi thêm {so} trứng!',
  haBanLoi: 'Cả bàn hạ xuống một hàng.',
  timMat: 'Trứng chạm dây đỏ! Em mất 1 tim và hai hàng dưới cùng được dọn.',
  dotXong: 'Sạch bàn rồi! Sang đợt kế tiếp.',
  /** Hết ván */
  xongThang: '{phanDien} hết đường trộn trứng giả! Ổ trứng của làng đã sạch.',
  hetTim: 'Em hết tim rồi, trứng giả đã chạm dây đỏ. Mình thử lại nhé.',
  xemKetQua: 'Xem kết quả',
  phanDienNoi: '{phanDien} đang trộn trứng giả!',
  /** Phần điểm ở màn kết quả: số lượng, điểm */
  phanVo: 'Trứng vỡ',
  phanRoi: 'Trứng rơi',
  phanNap: 'Đợt nạp không sai',
  phanDot: 'Đợt đã dọn sạch',
  phanTim: 'Tim còn lại',
} as const;

/**
 * Chữ trong màn 11 "Ghép lá cây sổ" (spec 08 mục Màn 11). Mọi câu đi qua fmt() ({phanDien}, {so}…). Hình lá, hoa sen, gió xoáy là ảnh (không có chữ trong ảnh); tên dưới đây chỉ cho trình đọc màn hình.
 */
export const match3Ui = {
  /** Nhãn đọc màn hình của khung chơi */
  khung: 'Bàn ghép lá. Phím mũi tên di chuyển con trỏ, Enter hoặc Space để chọn một ô rồi mũi tên để đổi chỗ với ô kề; hoặc kéo, hoặc chạm hai ô kề nhau.',
  /** Dải trên cùng */
  vong: 'Vòng {so}/{max}',
  luot: 'Lượt còn: {so}',
  cay: 'Cây xong: {so}/{max}',
  diem: 'Điểm: {so}',
  /** Tên sáu loại lá (theo loại 0 đến 5), lá giả, hoa sen, gió xoáy: cho trình đọc màn hình */
  tenLa: ['lá bàng', 'lá chuối', 'lá đa', 'lá sen', 'lá trầu', 'lá tre'] as const,
  laGia: 'lá giả',
  hoaSen: 'hoa sen',
  gioXoay: 'gió xoáy',
  /** Mô tả một ô: hàng {x}, cột {y}, tên {la} */
  o: 'Hàng {x}, cột {y}: {la}',
  oChon: 'Hàng {x}, cột {y}: {la}, đang chọn',
  /** Ô cây: loại lá cần, đã lấp hay chưa */
  oCayTrong: 'Ô cây {so}: cần {la}',
  oCayDay: 'Ô cây {so}: đã có {la}',
  /** Lời nói ngắn khi chơi */
  laGiaKhongDoi: 'Lá giả không đổi chỗ được.',
  khongTaoHang: 'Chưa tạo được hàng, hai ô trở về chỗ cũ.',
  phanDienNem: '{phanDien} ném thêm một lá giả!',
  xaoBan: 'Hết nước đi, lá được xáo lại.',
  hoaSenMoi: 'Hoa sen! Khi nổ sẽ xóa cả hàng ngang.',
  gioXoayMoi: 'Gió xoáy! Đổi chỗ với một lá để xóa mọi lá cùng loại.',
  /** Hết vòng */
  cayXong: 'Cây xong rồi!',
  cayGop: 'Các lá gộp thành cành, cành gộp lên gốc — giống cây gộp sổ của làng Bạc!',
  thuong: 'Thưởng xong cây: +{diem} điểm. Còn dư {luot} lượt: +{so} điểm.',
  hetLuot: 'Hết lượt rồi, cây chưa đủ lá. Mình sang vòng sau nhé.',
  vongTiep: 'Vòng tiếp theo',
  xemKetQua: 'Xem kết quả',
  /** Phần điểm ở màn kết quả: số lượng, điểm */
  phanLa: 'Lá nổ (+{diem} mỗi lá)',
  phanO: 'Ô cây đã lấp (+{diem} mỗi ô)',
  phanCay: 'Cây xong ({so}/{max}, +{diem} mỗi cây)',
  phanDu: 'Lượt dư của cây xong (+{diem} mỗi lượt)',
  phanLaGia: 'Lá giả đã gỡ',
} as const;

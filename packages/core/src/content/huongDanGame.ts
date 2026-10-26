/**
 * CHỮ HƯỚNG DẪN CỦA TỪNG GAME (chủ dự án tự sửa ở đây). Mỗi màn gồm: luat (luật trên thẻ bắt đầu), dieuKhien, trang (các trang hướng dẫn riêng), nhac (câu nhắc của nút "?").
 * - Sửa chữ trong dấu nháy thoải mái. GIỮ NGUYÊN tên khóa (luat, dieuKhien, trang, nhac, chuaLat, dangCamKhuon…): code tra theo tên khóa.
 * - {phanDien}, {congThuc}, {viDu}… là chỗ điền tự động, đừng xóa. ^^x^^ là số mũ nhỏ trên cao (giống bài học 3), ví dụ 5^^x^^.
 * - Hình minh họa chỉ ghi tên (hình vẽ nằm ở ui/GuideArt.tsx). Màn chưa làm để trống.
 * - Câu nhắc KHÔNG được lộ đáp án (không nói thẻ nào, đèn lồng nào, làn nào, ô nào, số nào là đúng).
 */
import { gameHints } from './gameHints';
import type { GuideArtId, GuideShotId } from './huongDan';

/** Hình của một trang: ảnh chụp thật (`shot`) hoặc hình vẽ bằng code (`art`), chỉ ghi tên */
export type GameFigure = { shot: GuideShotId } | { art: GuideArtId };

export interface GameGuidePage {
  /** Hình cho máy tính, và cho điện thoại nếu không có `hinhDt` */
  hinh: GameFigure;
  hinhDt?: GameFigure;
  /** Lời cho máy tính (và điện thoại nếu không có `dt`) */
  may: string;
  dt?: string;
}

export interface GameGuide {
  /** Chữ trên nút chọn phần và tiêu đề của hộp "Hướng dẫn chơi" */
  nhan: string;
  tieuDe: string;
  /** Các dòng luật trên thẻ bắt đầu */
  luat: readonly string[];
  dieuKhien: { mayTinh: string; dienThoai: string };
  /** Các trang hướng dẫn riêng của game */
  trang: readonly GameGuidePage[];
  /** Câu nhắc của nút "?", theo khóa trạng thái (hàm hintFor của game chỉ trả khóa) */
  nhac: Readonly<Record<string, string>>;
}


export const HUONG_DAN_GAME = {
  // ---------------------------------------------------------------- Màn 2: Đuổi theo {phanDien} (Làng Giấy)
  2: {
    nhan: 'Màn 2',
    tieuDe: 'Màn 2: Đuổi theo {phanDien}',
    luat: [
      '{phanDien} ôm xấp trang bị trộm chạy qua làng. Em chạy theo, nhặt lại trang sổ và tiền đồng.',
      'Tránh chướng ngại bằng cách đổi làn, nhảy hoặc trượt. Em có 3 tim, mỗi lần va chạm mất 1 tim.',
      'Hết mỗi vòng có một câu hỏi: trả lời đúng được thêm 3 trang, sai thì mất 1 tim.',
    ],
    dieuKhien: {
      mayTinh: '← → hoặc A D để đổi làn · ↑ W hoặc Space để nhảy · ↓ hoặc S để trượt.',
      dienThoai: 'Vuốt sang trái hoặc phải để đổi làn · vuốt lên để nhảy · vuốt xuống để trượt.',
    },
    trang: [
      {
        hinh: { art: 'ba-lan-phim' },
        hinhDt: { art: 'ba-lan-vuot' },
        may: 'Đường chạy có ba làn. Bấm phím ← → hoặc A D để đổi làn.',
        dt: 'Đường chạy có ba làn. Vuốt sang trái hoặc phải để đổi làn.',
      },
      {
        hinh: { art: 'nhay-truot-phim' },
        hinhDt: { art: 'nhay-truot-vuot' },
        may: 'Phím ↑, W hoặc Space để nhảy qua vật thấp như đống rơm. Phím ↓ hoặc S để trượt qua sào cao.',
        dt: 'Vuốt lên để nhảy qua vật thấp như đống rơm. Vuốt xuống để trượt qua sào cao.',
      },
      {
        hinh: { shot: 'man-2-chay' },
        may: 'Nhặt trang sổ và tiền đồng. Nón lá, guốc mộc và túi tiền giúp em chạy tốt hơn.',
      },
      {
        hinh: { shot: 'man-2-cau-hoi' },
        may: 'Hết mỗi vòng có một câu hỏi. Trả lời đúng em được thêm trang, trả lời sai thì mất một tim.',
      },
    ],
    nhac: {
      dauVan: 'Nhân vật tự chạy. Em đổi làn, nhảy hoặc trượt (máy tính: phím mũi tên hoặc A D W S, điện thoại: vuốt). Nhặt trang sổ và tiền đồng trên đường.',
      chay: 'Né chướng ngại bằng cách đổi làn, nhảy qua vật thấp, trượt qua vật cao. Nhặt trang sổ và tiền đồng trên đường.',
      motTim: 'Em chỉ còn một tim. Né thật cẩn thận: đổi làn, nhảy qua vật thấp, trượt qua vật cao. Mỗi lần va chạm mất một tim.',
      hoTro: 'Em đang có đồ hỗ trợ (nón lá, guốc mộc hoặc túi tiền). Cứ chạy và nhặt thật nhiều trang sổ, tiền đồng.',
      chamLai: 'Hết vòng rồi, nhân vật đang chạy chậm lại. Sắp có câu hỏi, em chuẩn bị nhé.',
      hoi: 'Đọc kỹ câu hỏi rồi chọn đáp án. Trả lời đúng em được thêm trang, sai hoặc hết giờ thì mất một tim.',
      daTraLoi: 'Em đã trả lời rồi. Đọc lời giải thích, rồi chạy tiếp.',
      chayLai: 'Chạy tiếp thôi! Nhân vật đang tăng tốc trở lại.',
      hetVan: 'Ván này đã kết thúc.',
    },
  },

  // ---------------------------------------------------------------- Màn 3: Ghép lại cuốn sổ (Làng Giấy)
  3: {
    nhan: 'Màn 3',
    tieuDe: 'Màn 3: Ghép lại cuốn sổ',
    luat: [
      'Em mang các trang lấy lại về bàn của bác An, ghép lại cuốn sổ như ban đầu. Mỗi thẻ ghi: mã trang trước · nội dung · mã trang.',
      'Thẻ đặt vào ô kế tiếp phải có mã trang trước bằng mã của trang cuối chuỗi, và mã trang phải đúng công thức. Đặt sai thì thẻ bật về và em mất 1 tim.',
      '{phanDien} hay nhét một trang giả vào xấp giấy: mã trang trước khớp nhưng mã trang sai công thức. Kéo trang giả vào rổ để được thêm 30 điểm.',
    ],
    dieuKhien: {
      mayTinh: 'Kéo thẻ vào chuỗi hoặc vào rổ, hoặc bấm chọn thẻ rồi bấm vào chuỗi hoặc rổ · nút "Soi công thức" để tự tính mã trang.',
      dienThoai: 'Kéo thẻ bằng ngón tay, hoặc chạm chọn thẻ rồi chạm vào chuỗi hoặc rổ · chạm "Soi công thức" để tự tính mã trang.',
    },
    trang: [
      {
        hinh: { shot: 'man-3-ban' },
        may: 'Mỗi thẻ ghi mã trang trước, nội dung và mã trang. Ở vòng 1 và 2, em ghép các thẻ thành một chuỗi liền nhau.',
      },
      {
        hinh: { art: 'keo-the' },
        may: 'Kéo thẻ vào ô kế tiếp của chuỗi, hoặc bấm chọn thẻ rồi bấm vào ô đó.',
        dt: 'Kéo thẻ bằng ngón tay vào ô kế tiếp, hoặc chạm chọn thẻ rồi chạm vào ô đó.',
      },
      {
        hinh: { art: 'soi-the' },
        may: 'Bấm "Soi công thức" để tự tính mã trang. Thẻ nào có mã sai công thức là trang giả, em kéo nó vào rổ.',
        dt: 'Chạm "Soi công thức" để tự tính mã trang. Thẻ nào có mã sai công thức là trang giả, em kéo nó vào rổ.',
      },
      {
        hinh: { art: 'ro-trang' },
        may: 'Vòng 3 là giữ sổ trong 90 giây. {phanDien} liên tục tráo trang trong chuỗi: em kéo trang giả vào rổ rồi đặt đúng trang thật vào chỗ trống.',
      },
    ],
    nhac: {
      nhetTrang: '{phanDien} đang lén nhét một trang vào xấp giấy. Em xem kỹ các thẻ rồi ghép tiếp nhé.',
      batDau: 'Chọn thẻ có mã trang trước bằng mã G của trang bìa, rồi đặt vào ô đầu tiên của chuỗi.',
      ghep: 'Tìm thẻ có mã trang trước bằng mã trang của thẻ cuối chuỗi. Nghi mã trang sai thì bấm "Soi công thức".',
      coTrangGia: 'Trong xấp giấy có một trang giả: mã trang trước khớp nhưng mã trang sai công thức. Soi công thức rồi kéo nó vào rổ.',
      giuSoChuaChay: 'Vòng giữ sổ: bấm "Bắt đầu giữ sổ" khi em sẵn sàng thì đồng hồ mới chạy.',
      oTrong: 'Chuỗi có ô trống: đặt đúng trang thật vào đó. Soi công thức nếu chưa chắc.',
      giuSo: '{phanDien} đang tráo trang trong chuỗi. Soi công thức, kéo trang giả vào rổ rồi đặt trang thật vào chỗ trống.',
      xongVong: 'Vòng này xong rồi. Bấm nút để sang vòng kế tiếp.',
      hetVan: 'Ván này đã kết thúc.',
    },
  },

  // ---------------------------------------------------------------- Màn 5: Đập {phanDien} (Làng Dệt)
  5: {
    nhan: 'Màn 5',
    tieuDe: 'Màn 5: Đập {phanDien}',
    luat: [
      '{phanDien} gấp các trang giả thành chuột giấy, thả xuống sân để bôi mực vào cuốn Sổ Chung. Em cầm quạt nan đập chuột trước khi nó tới sổ.',
      'Đập chuột khi nó vào vệt sáng ở cuối làn. Chuột đổi làn, chuột nhanh và chuột to khó hơn. Chuột lọt tới sổ làm loang một vết mực; đủ 8 vết mực là thua.',
      'Cứ 12 giây {phanDien} chạy xuống kèm một câu hỏi: trả lời đúng thì đét được {phanDien}, được thêm điểm và xoá 2 vết mực; sai hoặc hết giờ thì thêm một vết mực.',
    ],
    dieuKhien: {
      mayTinh: 'Phím D F J K (hoặc 1 2 3 4) hoặc bấm chuột vào làn để đập · bấm chuột vào đồng tiền để nhặt',
      dienThoai: 'Chạm vào làn để đập · chạm vào đồng tiền để nhặt',
    },
    trang: [
      {
        hinh: { art: 'dap-lan-phim' },
        hinhDt: { art: 'dap-lan-cham' },
        may: 'Chuột giấy chạy xuống sổ. Khi nó vào vệt sáng ở cuối làn, bấm phím D F J K (hoặc 1 2 3 4) hay bấm chuột vào làn để đập.',
        dt: 'Chuột giấy chạy xuống sổ. Khi nó vào vệt sáng ở cuối làn, chạm vào làn để đập.',
      },
      {
        hinh: { art: 'chuot-loai' },
        may: 'Chuột đổi làn nhảy sang làn bên cạnh, chuột nhanh chạy gấp 1,6 lần, chuột to phải đập 2 lần. Đồng tiền hiện lên thì nhặt kịp để được thêm điểm.',
      },
      {
        hinh: { art: 'so-muc' },
        may: 'Chuột lọt tới sổ làm loang một vết mực. Đủ 8 vết mực là thua; trả lời đúng câu hỏi của {phanDien} thì được xoá 2 vết.',
      },
      {
        hinh: { art: 'trum-hoi' },
        may: 'Cứ 12 giây {phanDien} chạy xuống kèm một câu hỏi. Trả lời đúng thì em đét được {phanDien}, càng nhanh càng nhiều điểm.',
      },
    ],
    nhac: {
      dauVan: 'Đập chuột giấy khi nó vào vệt sáng ở cuối làn: phím D F J K hoặc chạm vào làn.',
      chay: 'Đập mỗi chuột khi nó nằm trong vệt sáng của làn nó đang chạy. Chuột nào tới sổ sẽ làm loang một vết mực.',
      chuotTo: 'Chuột to phải đập 2 lần.',
      dongTien: 'Có đồng tiền trên sân: chạm vào nó trước khi biến mất để được thêm điểm.',
      soSapDay: 'Sổ sắp đầy mực! Ưu tiên chuột gần sổ nhất.',
      trumChay: '{phanDien} đang chạy xuống! Chuẩn bị đọc câu hỏi nhé.',
      trumHoi: 'Đọc câu hỏi rồi chọn đáp án — đúng thì đét được {phanDien} và xoá 2 vết mực.',
      hetVan: 'Ván này đã kết thúc.',
    },
  },
  // ---------------------------------------------------------------- Màn 6: Diều đưa sổ (Làng Dệt)
  6: {
    nhan: 'Màn 6',
    tieuDe: 'Màn 6: Diều đưa sổ',
    luat: [
      'Cụ Bình nhờ em thả diều mang bản sao Sổ Chung tới 4 làng xa, để làng nào cũng có sổ giống nhau. {phanDien} thả diều đen ra cản đường.',
      'Chạm để diều bật lên, thả ra để diều hạ xuống. Bay qua khe giữa hai cột tre; chạm cột, đất, trần hay diều đen thì mất 1 tim. Em có 5 tim.',
      'Tới cổng mỗi làng có một câu hỏi: trả lời đúng thì giao được sổ, sai thì mất 1 tim. Qua đủ 4 làng là thắng.',
    ],
    dieuKhien: {
      mayTinh: 'Bấm Space hoặc bấm chuột để diều bật lên',
      dienThoai: 'Chạm vào màn hình để diều bật lên',
    },
    trang: [
      {
        hinh: { art: 'dieu-bat-phim' },
        hinhDt: { art: 'dieu-bat-cham' },
        may: 'Bấm Space (hoặc bấm chuột) để diều bật lên. Thả ra thì diều hạ xuống.',
        dt: 'Chạm vào màn hình để diều bật lên. Thả ra thì diều hạ xuống.',
      },
      {
        hinh: { art: 'dieu-khe' },
        may: 'Bay qua khe giữa hai cột tre. Đụng cột, đất hay trần thì mất 1 tim, rồi diều được đặt lại giữa khe kế và bất tử 1 giây.',
      },
      {
        hinh: { art: 'dieu-den' },
        may: 'Từ khe thứ 8 có diều đen của {phanDien} bay lên xuống trong khe. Luôn còn một phần trống: bay qua phần trống lớn hơn.',
      },
      {
        hinh: { art: 'cong-lang' },
        may: 'Sau khe 6, 12, 18 và 24 là cổng một làng. Trả lời đúng câu hỏi thì giao được sổ; sai thì mất 1 tim nhưng cổng vẫn mở.',
      },
    ],
    nhac: {
      dauVan: 'Chạm để diều bật lên, thả ra để diều hạ xuống. Bay qua khe giữa hai cột tre.',
      chay: 'Giữ nhịp bật đều để diều bay giữa khe, đừng chạm cột, đất hay trần.',
      dieuDen: 'Diều đen của {phanDien} phía trước: bay qua phần trống lớn hơn.',
      cong: 'Cổng làng phía trước: trả lời đúng để giao sổ.',
      motTim: 'Em chỉ còn một tim: bật nhẹ, nhịp đều.',
      cauHoi: 'Đọc câu hỏi rồi chọn đáp án — đúng thì cổng mở đón sổ.',
      hetVan: 'Ván này đã kết thúc.',
    },
  },

  // ---------------------------------------------------------------- Màn 8: Lật thẻ tìm cặp khóa (Làng Khắc Dấu)
  8: {
    nhan: 'Màn 8',
    tieuDe: 'Màn 8: Lật thẻ tìm cặp khóa',
    luat: [
      'Bộ khuôn tập của chú Dũng bị {phanDien} trộn lung tung. Em ghép lại từng khuôn với mẫu công khai của nó nhé!',
      'Lật 2 thẻ mỗi lượt. Thẻ Khuôn tập x ghép với thẻ Mẫu công khai {congThuc}.',
      'Có Máy tính mod ở góc màn hình. Mỗi lần lật sai mất 10 điểm.',
      'Vòng 3: cứ 20 giây {phanDien} tráo chỗ 2 thẻ đang úp.',
    ],
    dieuKhien: {
      mayTinh: 'Bấm chuột, hoặc phím mũi tên và Enter',
      dienThoai: 'Chạm vào thẻ',
    },
    trang: [
      {
        hinh: { art: 'lat-hai-the' },
        may: 'Bấm vào thẻ, hoặc dùng phím mũi tên và Enter, để lật. Mỗi lượt lật 2 thẻ: ghép đúng thì thẻ ở lại, không thì úp xuống và em mất 10 điểm.',
        dt: 'Chạm vào thẻ để lật. Mỗi lượt lật 2 thẻ: ghép đúng thì thẻ ở lại, không thì úp xuống và em mất 10 điểm.',
      },
      {
        hinh: { art: 'cap-the' },
        may: 'Thẻ Khuôn tập x ghép với thẻ Mẫu công khai {congThuc}. Ví dụ Khuôn tập {viDuX} ghép với Mẫu công khai {viDuY}, vì {viDu}.',
      },
      {
        hinh: { art: 'may-tinh-mod' },
        may: 'Máy tính mod ở góc màn hình giúp em tính {congThuc}: nhập x là ra số của thẻ Mẫu công khai cần tìm.',
      },
      {
        hinh: { art: 'tran-the' },
        may: 'Ở vòng 3, cứ 20 giây {phanDien} lại tráo chỗ 2 thẻ đang úp. Em nhớ vị trí mới của chúng nhé.',
      },
    ],
    nhac: {
      chuaLat: 'Lật 2 thẻ. Tìm cặp Khuôn tập x và Mẫu công khai {congThuc}.',
      dangCamKhuon: 'Em đang cầm Khuôn tập. Tìm thẻ Mẫu công khai bằng {congThuc} — bấm Máy tính mod nếu cần.',
      dangCamMau: 'Tìm thẻ Khuôn tập x có {congThuc} bằng số này.',
      choUp: 'Hai thẻ vừa lật chưa ghép được và sắp úp lại. Em nhớ vị trí của chúng rồi lật cặp khác.',
      xongVong: 'Vòng này xong rồi. Bấm nút để sang vòng kế tiếp.',
      hetVan: 'Ván này đã kết thúc.',
      /** Thêm vào cuối câu nhắc ở vòng 3 */
      vong3: '{phanDien} tráo 2 thẻ đang úp mỗi 20 giây.',
    },
  },

  // ---------------------------------------------------------------- Màn 9: Chữa đàn gà (Làng Khắc Dấu)
  9: {
    nhan: 'Màn 9',
    tieuDe: 'Màn 9: Chữa đàn gà',
    luat: [
      '{phanDien} lùa một đàn gà bệnh vào làng để phá phiên chợ. Mỗi con gà đeo một thẻ số, là mẫu công khai. Em dùng ná cao su bắn viên thuốc đúng loại để chữa cho gà.',
      'Trước mỗi đợt em nạp đạn: kéo nhãn vào đúng lọ thuốc. Lọ Thuốc x cần nhãn bằng {congThuc}. Có Máy tính mod để tính, và có nhãn nhiễu không dùng tới.',
      'Bắn đúng thuốc thì gà khỏi bệnh và chạy về chuồng (+20 điểm), bắn sai bị trừ 5 điểm. Gà chạy tới cổng làng thì em mất 1 tim; em có 3 tim.',
      'Có 3 đợt gà, rồi tới gà trùm có {phanDien} cưỡi: gà trùm cần chữa 3 lần, thẻ trên gà đổi sau mỗi lần.',
    ],
    dieuKhien: {
      mayTinh: 'Nạp đạn: Tab chọn nhãn, phím 1 đến 4 đưa vào lọ, hoặc kéo thả · Bắn: phím 1 đến 4 chọn thuốc, bấm chuột vào con gà (hoặc mũi tên trái phải chọn gà, Enter hay Space để bắn)',
      dienThoai: 'Nạp đạn: kéo nhãn vào lọ, hoặc chạm nhãn rồi chạm lọ · Bắn: chạm nút thuốc để chọn, rồi chạm vào con gà',
    },
    trang: [
      {
        hinh: { art: 'nap-nhan' },
        may: 'Trước mỗi đợt em nạp đạn: kéo nhãn vào đúng lọ thuốc, hoặc Tab chọn nhãn rồi nhấn phím 1 đến 4. Lọ Thuốc x cần nhãn bằng {congThuc}.',
        dt: 'Trước mỗi đợt em nạp đạn: kéo nhãn bằng ngón tay vào đúng lọ thuốc, hoặc chạm nhãn rồi chạm lọ. Lọ Thuốc x cần nhãn bằng {congThuc}.',
      },
      {
        hinh: { art: 'nhan-bay' },
        may: 'Bấm Máy tính mod để tính {congThuc}. Có nhãn bẫy: số khuôn của lọ không phải mẫu công khai. Nạp sai thì nhãn bật về khay và đợt đó mất điểm thưởng.',
      },
      {
        hinh: { art: 'ban-ga-phim' },
        hinhDt: { art: 'ban-ga-cham' },
        may: 'Đọc thẻ số trên gà, chọn thuốc có nhãn bằng số đó (phím 1 đến 4) rồi bấm chuột vào con gà để bắn. Hoặc mũi tên trái phải chọn gà, Enter hay Space để bắn.',
        dt: 'Đọc thẻ số trên gà, chạm nút thuốc có nhãn bằng số đó, rồi chạm vào con gà để bắn.',
      },
      {
        hinh: { art: 'ga-trum' },
        may: 'Gà trùm có {phanDien} cưỡi cần chữa 3 lần, thẻ đổi sau mỗi lần. Gà nào chạy tới cổng làng em mất 1 tim; hết 3 tim là thua.',
      },
    ],
    nhac: {
      napDan: 'Mỗi lọ Thuốc x cần nhãn bằng {congThuc}. Tính bằng Máy tính mod nếu cần. Cẩn thận nhãn bẫy: số khuôn KHÔNG phải mẫu công khai.',
      napXong: 'Lọ nào cũng có nhãn rồi. Bấm nút "Bắt đầu đợt" khi em sẵn sàng.',
      dotGa: 'Đọc thẻ trên gà, chọn thuốc có mẫu công khai bằng thẻ đó rồi bắn.',
      choGa: 'Chưa có gà trên đường. Em xem lại các lọ thuốc, gà sắp tới rồi.',
      trum: 'Gà trùm cần chữa 3 lần, thẻ đổi sau mỗi lần.',
      motTim: 'Em chỉ còn một tim: chữa con gần cổng nhất trước.',
      hetVan: 'Ván này đã kết thúc.',
    },
  },
  // ---------------------------------------------------------------- Màn 11: Ghép lá cây sổ (Làng Bạc)
  11: {
    nhan: 'Màn 11',
    tieuDe: 'Màn 11: Ghép lá cây sổ',
    luat: [
      '{phanDien} rải lá giả khắp nơi để làm rối cây gộp sổ. Em ghép các lá cùng loại để dựng lại cây.',
      'Đổi chỗ 2 ô kề nhau để có 3 lá cùng loại thẳng hàng: hàng đó nổ, lá phía trên rơi xuống. Ô nào trên cây cần loại lá nào thì hàng nổ đúng loại đó sẽ gửi một lá lên lấp ô.',
      'Lá giả của {phanDien} không đổi chỗ được và biến mất khi có hàng nổ ngay sát bên. Cứ 5 lượt, {phanDien} lại ném thêm một lá giả.',
      'Có 3 vòng, mỗi vòng một cây và số lượt có hạn. Dựng xong cây thì được thưởng, còn dư lượt thì được thưởng thêm.',
    ],
    dieuKhien: {
      mayTinh: 'Kéo một ô sang ô kề, hoặc bấm ô này rồi bấm ô kề · phím mũi tên di chuyển con trỏ, Enter hoặc Space để chọn ô rồi mũi tên để đổi chỗ',
      dienThoai: 'Vuốt từ một ô sang ô kề, hoặc chạm ô này rồi chạm ô kề',
    },
    trang: [
      {
        hinh: { art: 'doi-o-phim' },
        hinhDt: { art: 'doi-o-vuot' },
        may: 'Kéo một ô sang ô kề, hoặc bấm ô này rồi ô kề. Bàn phím: mũi tên di chuyển con trỏ, Enter chọn ô rồi mũi tên để đổi chỗ. Không tạo được hàng thì hai ô về chỗ cũ.',
        dt: 'Vuốt từ một ô sang ô kề, hoặc chạm ô này rồi chạm ô kề. Không tạo được hàng thì hai ô về chỗ cũ.',
      },
      {
        hinh: { art: 'hang-no' },
        may: 'Từ 3 lá cùng loại thẳng hàng thì nổ. 4 lá tạo hoa sen, nổ xóa cả hàng ngang. 5 lá tạo gió xoáy: đổi chỗ với một lá để xóa mọi lá cùng loại.',
      },
      {
        hinh: { art: 'cay-gop' },
        may: 'Nhìn cây bên cạnh: mỗi ô cần một loại lá. Hàng nổ đúng loại thì một lá bay lên lấp ô. Hai ô cạnh nhau đầy thì gộp thành cành, đủ cành thì lên tới gốc.',
      },
      {
        hinh: { art: 'la-gia-no' },
        may: 'Lá giả của {phanDien} xám lấm mực, không đổi chỗ được. Cho một hàng nổ ngay sát bên thì lá giả biến mất. Hết nước đi thì bàn được xáo lại.',
      },
    ],
    nhac: {
      doiO: 'Đổi 2 ô kề nhau để có 3 lá cùng loại thẳng hàng.',
      nhinCay: 'Nhìn cây: ô còn trống cần loại lá nào thì ưu tiên ghép loại đó.',
      laGia: 'Lá giả của {phanDien} biến mất khi có hàng nổ ngay sát bên.',
      hoaSen: 'Hoa sen trên bàn: khi nó nổ sẽ xóa cả hàng ngang của nó.',
      gioXoay: 'Ô gió xoáy: đổi chỗ nó với một lá để xóa mọi lá cùng loại với lá đó.',
      sapHet: 'Sắp hết lượt: ghép đúng loại lá cây còn thiếu.',
      xongVong: 'Vòng này xong rồi. Bấm nút để sang vòng kế tiếp.',
      hetVan: 'Ván này đã kết thúc.',
    },
  },

  // ---------------------------------------------------------------- Màn 12: Leo cây tìm lá giả (Làng Bạc)
  12: {
    nhan: 'Màn 12',
    tieuDe: 'Màn 12: Leo cây tìm lá giả',
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
    trang: [
      {
        hinh: { art: 'den-long-so-nay' },
        may: 'Mỗi đèn lồng ghi số Sổ và số Nay. Em chọn đèn lồng có hai số khác nhau: đó là nhánh bị tráo.',
      },
      {
        hinh: { art: 'bat-len-phim' },
        hinhDt: { art: 'bat-len-cham' },
        may: 'Đèn lồng cứ trượt qua lại. Khi nó tới ngay trên đầu em, bấm chuột hoặc phím Space để bật lên.',
        dt: 'Đèn lồng cứ trượt qua lại. Khi nó tới ngay trên đầu em, chạm vào màn hình để bật lên.',
      },
      {
        hinh: { art: 'tim-dong' },
        may: 'Nắm nhầm đèn lồng có hai số giống nhau thì em mất 1 tim. Bật trượt thì em mất 2 đồng của tầng đó.',
      },
      {
        hinh: { art: 'tang-la' },
        may: 'Tới tầng lá, hãy nắm chiếc lá bị tráo để bắt {phanDien}. Mỗi vòng cây cao thêm một tầng.',
      },
    ],
    nhac: {
      soSanh: 'So Sổ và Nay trên 2 đèn lồng phía trên, chọn cái có hai số khác nhau.',
      canGio: 'Chờ đèn lồng đó tới ngay trên đầu rồi chạm (máy tính: Space).',
      motTim: 'Em chỉ còn một tim. Soi kỹ Sổ và Nay: nắm nhầm đèn lồng có hai số giống nhau là mất tim.',
      tangLa: 'Đây là tầng lá: nắm chiếc lá bị tráo để bắt {phanDien}!',
      xongVong: 'Em bắt được rồi! Bấm nút để sang vòng kế tiếp.',
      hetVan: 'Ván này đã kết thúc.',
    },
  },
} as const satisfies Readonly<Record<number, GameGuide>>;

export type GameGuideId = keyof typeof HUONG_DAN_GAME;
/** Khóa câu nhắc của màn `N` (kiểu của giá trị `hintFor` trả về) */
export type NhacKey<N extends GameGuideId> = keyof (typeof HUONG_DAN_GAME)[N]['nhac'] & string;

/** Chữ hướng dẫn của màn `levelId`; màn không có thì undefined */
export function gameGuide(levelId: number): GameGuide | undefined {
  return (HUONG_DAN_GAME as Readonly<Record<number, GameGuide>>)[levelId];
}

/**
 * Câu nhắc của nút "?" từ các KHÓA mà `hintFor` của game trả về: tra từng khóa trong `nhac` của màn rồi nối bằng một dấu cách (chưa qua fmt).
 * Khóa không có câu thì bỏ qua; không còn câu nào thì dùng câu mặc định.
 */
export function hintText(levelId: number, keys: readonly string[]): string {
  const nhac = gameGuide(levelId)?.nhac ?? {};
  const parts = keys.map((k) => nhac[k]).filter((s): s is string => typeof s === 'string' && s !== '');
  return parts.length > 0 ? parts.join(' ') : gameHints.macDinh;
}

/**
 * Chữ của Bài 2 "Cả làng cùng giữ sổ" (màn 4, Làng Dệt). Xem content/HUONG-DAN-SUA-CHU.md.
 * Chỗ giữ tên: {cuBinh}, {coChi}, {phanDien} là nhân vật, {ten}/{Ten} là học sinh;
 * {n}, {x}, {nd}, {ma}, {nguoi}… là số hoặc tên do bài điền vào.
 * Luật, bot, số liệu và cách chấm sao nằm ở lessons/bai-2 (logic); ở đây chỉ có chữ hiển thị.
 */
import type { LessonContent } from '../../lesson2d/types';

/** Ảnh nền của màn 4 trong manifest (không đuôi) */
export const BAI2_BACKGROUND = 'scenes/bai-hoc-lang-det';

/** Nội dung dùng cho khung LessonPage2D: lời cụ Bình và cô Chi theo thời điểm, lời trao trang, giới thiệu 3 trạm, thẻ "Em có biết?". */
export const bai2Lesson: LessonContent = {
  dialogue: {
    /** Đầu bài (trước trạm Dễ) */
    dauBai: [
      {
        characterId: 'cuBinh',
        text: 'Mỗi nhà là một người giữ sổ. Trang mới phải được cả làng kiểm lại rồi mới ghi.',
      },
    ],
    /** Bài này không có lời trước trạm Trung bình */
    truocTb: [],
    /** Trước trạm Khó: cô Chi hỏi, cụ Bình đáp */
    truocKho: [
      { characterId: 'coChi', text: 'Duyệt nhanh cho xong việc được không cụ?' },
      { characterId: 'cuBinh', text: 'Duyệt ẩu là mất cọc đấy!' },
    ],
    /** Cuối bài, trước màn hoàn thành */
    cuoiBai: [
      {
        characterId: 'cuBinh',
        text: 'Gian một lần thì mất cọc, làm thật thì có thưởng. Ai cũng hiểu nên chẳng ai muốn gian.',
      },
    ],
  },

  /** "Kết thúc làng": cảnh trao Trang Sổ Vàng thứ hai */
  award: {
    chuThich: 'Cụ Bình trao Trang Sổ Vàng thứ hai.',
    loi: [
      {
        characterId: 'cuBinh',
        text: 'Sổ thì ai cũng kiểm được. Nhưng làm sao biết giấy nợ đúng là người đó viết? Sang Làng Khắc Dấu hỏi chú Dũng.',
      },
    ],
  },

  /** Giới thiệu từng trạm (LevelIntro); mẹo do Bi nói */
  stations: {
    de: {
      tieuDe: 'Duyệt trang mới',
      mucTieu: 'Kiểm tra trang người trong làng gửi tới: tính lại mã rồi Đồng ý hoặc Từ chối. Em có 3 tim.',
      meo: 'Lấy (mã trang cuối × 2 + nội dung) mod 100 rồi so với mã trang họ gửi.',
    },
    tb: {
      tieuDe: 'So sổ trước khi duyệt',
      mucTieu: 'So sổ của em với sổ người gửi, rồi kiểm mã trang mới. Em có 3 tim.',
      meo: 'Kiểm tra xem các trang trước trong sổ người gửi có khớp với sổ của em không.',
    },
    kho: {
      tieuDe: 'Đặt cọc để được ghi sổ',
      mucTieu: 'Chơi cùng {cuBinh}, {coChi} và {phanDien}. Mỗi lượt tạo trang phải đặt cọc 30 điểm. Làm thật hay gian lận, em chọn!',
      meo: 'Bỏ phiếu đúng để được thưởng điểm, tránh tiếp tay cho trang gian lận kẻo bị phạt!',
    },
  },

  /** "Điều em vừa học" ở màn hoàn thành cả bài */
  keyTakeaway: 'Sổ không nằm ở một người. Nhiều người cùng giữ và họ phải đồng ý thì trang mới được ghi.',

  /** Thẻ "Em có biết?" (giữ thuật ngữ thật: node, đồng thuận) */
  emCoBiet: [
    {
      title: 'Node là ai?',
      text: 'Node là một máy tính trong mạng blockchain, giống một người giữ sổ. Mỗi node giữ một bản sao đầy đủ của cuốn sổ, và các bản sao giống hệt nhau.',
      example: 'Trong mạng Sổ Chung, 4 người là em, {cuBinh}, {coChi} và {phanDien} mỗi người giữ một cuốn sổ y hệt nhau.',
    },
    {
      title: 'Node làm gì khi có trang mới?',
      text: 'Node tự kiểm tra 2 điều: mã trang trước ghi trong trang mới có khớp với trang cuối trong sổ của mình không, và mã trang mới có được tính đúng không.',
      example: 'Sổ em: trang cuối mã 57. Trang mới: mã trước 57, nội dung 36, mã 50 → (57 × 2 + 36) mod 100 = 50 ✓.',
    },
    {
      title: 'Đa số đồng ý mới được ghi.',
      text: 'Chỉ khi phần lớn các node đồng ý, trang mới được ghi vào sổ của tất cả mọi người. Cách các node thống nhất với nhau gọi là cơ chế đồng thuận.',
      example: 'Có 4 người giữ sổ: khi có ít nhất 2 người khác đồng ý (cùng với người tạo là đa số), trang mới được ghi vào sổ chung.',
    },
    {
      title: 'Vì sao an toàn hơn?',
      text: 'Sổ không nằm trong tay một người. Muốn sửa lén, kẻ gian phải sửa sổ của phần lớn các node cùng lúc, điều này cực kỳ khó.',
      example: 'Nếu kẻ gian sửa lén sổ của riêng mình, các node khác sẽ phát hiện ngay vì mã trang không khớp với sổ của số đông.',
    },
  ],

  /** Thẻ thứ 5, chỉ hiện ở trạm Khó */
  emCoBietKho: [
    {
      title: 'Đặt cọc (Proof of Stake)',
      text: 'Ở một số blockchain (cơ chế Proof of Stake), muốn được tạo khối thì phải đặt cọc. Làm đúng thì được thưởng, gian lận thì mất cọc, nên làm thật luôn có lợi hơn.',
      example: 'Đặt cọc 30 điểm: làm thật được duyệt thì nhận lại cọc và được thưởng 10 điểm (+10). Gian lận bị phát hiện thì mất luôn 30 điểm cọc (−30).',
    },
  ],
};

/**
 * Câu có phép tính và lời tóm tắt do hàm trong lessons/bai-2 (logic, bots) tạo ra.
 * Giữ ĐÚNG từng chữ của giai đoạn 1 vì các test cũ so sánh nguyên văn.
 */
export const bai2Logic = {
  /** Mã trang trước ghi trong trang mới không khớp trang cuối trong sổ của em */
  truocKhongKhop: 'Mã trang trước ghi là {truoc}, nhưng trang cuối trong sổ của em là {cuoi}, không khớp, nên Từ chối.',
  /** Mã trang trước khớp nhưng mã trang tính sai */
  maSai: '({truoc} × 2 + {nd}) mod 100 = {dung}, không khớp với {ma}, nên Từ chối.',
  /** Trang hợp lệ */
  maDung: '({truoc} × 2 + {nd}) mod 100 = {ma}, khớp với {ma}, nên Đồng ý.',
  /** Ghi chú của trang gian kiểu B, {nguoi} là người tạo trang */
  thuongThem: 'Thưởng thêm cho {nguoi}',
  /** Tóm tắt ván đấu của từng người */
  tomTat: {
    khongTaoTrang: '{nguoi} không tạo trang: bỏ phiếu {phieu}.',
    lamThat: 'làm thật {n} lượt',
    biBat: 'bị bắt {n}',
    lot: 'lọt {n}',
    gian: 'gian {n} lần ({chiTiet})',
    gianTron: 'gian {n} lần',
    tinhNham: 'tính nhầm {n} lần',
    boLuot: 'bỏ lượt {n} lần',
    tong: '{nguoi} {cacPhan}: tạo trang {tao}, bỏ phiếu {phieu}.',
  },
} as const;

/** Chữ bên trong 3 trạm */
export const bai2Texts = {
  chung: {
    vong: 'Vòng {n} / {tong}',
    dongY: 'Đồng ý',
    tuChoi: 'Từ chối',
    vongTiep: 'Vòng tiếp theo',
    xemKetQua: 'Xem kết quả',
    soCuaEm: 'Sổ của em',
    /** Hai lời nhắc khi em chọn sai: các node khác đã làm đúng */
    mayDongY: 'May là các node khác đã tính đúng và đồng ý trang này.',
    mayTuChoi: 'May là các node khác đã tính đúng và từ chối trang này.',
    xongTram: 'Xong trạm',
    hopLe: '✓ Hợp lệ',
    khongHopLe: '✗ Không hợp lệ',
    trangMoi: 'Trang mới',
  },
  de: {
    phu: 'Duyệt trang mới từ mọi người trong làng',
    maCuoiX: 'Mã trang cuối X:',
    nguoiGui: 'Người gửi trang mới',
    guiTrang: 'vừa gửi một trang mới đề xuất ghi vào sổ chung!',
    cachKiemTra: 'Cách em kiểm tra:',
    buoc1: 'Lấy mã trang cuối trong sổ của em: X = {x}.',
    buoc2: 'Tính: ({x} × 2 + {nd}) mod 100.',
    buoc3: 'So sánh kết quả với mã trang họ gửi ({ma}).',
    hocDuoc: 'Mỗi node tự tính lại để kiểm tra, không tin ngay trang người khác gửi.',
    goiYThua: 'Nhớ tính lại (X × 2 + nội dung) mod 100 rồi so với mã trang.',
  },
  tb: {
    phu: 'So sánh sổ của em với sổ người gửi trước khi biểu quyết',
    soCuaEm3: 'Sổ của em (3 trang cuối)',
    soCua: 'Sổ của {nguoi}',
    trangMoiSeODay: 'trang mới sẽ ở đây',
    emHayKiemTra: 'Em hãy kiểm tra:',
    cauHoiKiemTra: '3 trang trước trong sổ của {nguoi} có khớp với sổ của em không? Và mã trang mới có tính đúng không?',
    biSuaLen: 'Sổ của {nguoi} đã bị sửa ở trang có nội dung {cu} → {moi}, nên các mã phía sau bị lệch.',
    nhanSuaLen: 'Sửa lén',
    nhanMaLech: 'Mã bị lệch',
    nhanMaSai: 'Mã tính sai',
    nhanNoiSaiSo: 'Nối từ sổ sai',
    hocDuoc: 'Node kiểm cả 2 thứ: sổ có khớp không, và mã có đúng không.',
    goiYThua: 'Nhớ so sổ người gửi với sổ của em trước, rồi tính lại mã trang mới nhé!',
  },
  kho: {
    luot: 'Lượt {n} / {tong}',
    phu: 'Proof of Stake: đặt cọc 30 điểm để tạo trang',
    diem: '{so} đ',
    taoTrang: 'Tạo trang',
    soChungTieuDe: 'Sổ chung của cả mạng lưới',
    maCuoi: 'Mã trang cuối:',
    khongDuCoc: 'Không đủ điểm cọc để tạo trang!',
    khongDuCocChiTiet: '{nguoi} chỉ còn {diem} điểm (cần tối thiểu 30 điểm cọc). Lượt này được bỏ qua.',
    sangLuotTiep: 'Sang lượt tiếp theo →',
    luotCuaEm: 'Lượt của em',
    emTaoTrang: 'Em là người tạo trang số {n}!',
    maCuoiSoChung: 'Mã trang cuối của sổ chung:',
    noiDungDuocGiao: 'Nội dung được giao:',
    emMuonGhi: 'Em muốn ghi trang này như thế nào?',
    ghiThat: 'Ghi trang thật',
    ghiThatMoTa: 'Tự tính đúng mã trang. Nếu được duyệt: nhận lại 30 điểm cọc + thưởng 10 điểm (+10).',
    maTrangMoi: 'Mã trang mới',
    guiTrang: 'Gửi trang',
    ghiGianTieuDe: 'Ghi trang gian (tự cộng 40 điểm)',
    ghiGianMoTa: 'Cố tình ghi sai để kiếm lời. Nếu lọt: +40 điểm. Nếu bị phát hiện: mất trắng 30 điểm cọc (−30).',
    nutGhiGian: 'Ghi trang gian',
    maSaiKhoang: 'Mã trang là số từ 0 đến 99',
    maChuaDung: 'Mã này chưa đúng, em kiểm tra lại nhé',
    maChuaDungGoiY: 'Mã này chưa đúng, em kiểm tra lại nhé. Gợi ý: ({x} × 2 + {nd}) mod 100 = ?',
    hopThoaiTieuDe: 'Ghi trang gian?',
    hopThoaiTruoc: 'Nếu bị phát hiện, em sẽ mất ngay ',
    hopThoaiNhan: '30 điểm cọc',
    hopThoaiSau: '. Em có chắc chắn muốn mạo hiểm không?',
    vanGhiGian: 'Vẫn ghi gian',
    thoiGhiThat: 'Thôi, ghi trang thật',
    nodeBoPhieuChoEm: 'Các node khác đang bỏ phiếu cho trang của em',
    dangTinh: 'Đang tính...',
    choLuot: 'Chờ lượt...',
    luotCua: 'Lượt của {nguoi}',
    deXuat: '{nguoi} vừa đề xuất một trang mới!',
    maTruocTheoSo: 'Mã trang trước (theo sổ người gửi):',
    noiDung: 'Nội dung:',
    maTrang: 'Mã trang:',
    maCuoiTrongSoEm: 'Mã trang cuối trong sổ của em:',
    ghiChu: 'Ghi chú: {loi}',
    emBoPhieu: 'Em bỏ phiếu cho trang này:',
    ketQuaBoPhieu: 'Kết quả bỏ phiếu',
    daDongY: '✓ Đồng ý',
    daTuChoi: '✗ Từ chối',
    suThat: 'Sự thật:',
    trangThat: '✓ Trang thật',
    trangNham: '⚠️ Trang tính nhầm',
    gianKhongKhop: '✗ Trang gian (mã trang trước không khớp)',
    gianMaBia: '✗ Trang gian (mã trang bịa)',
    trangSaiLot: 'Trang sai đã lọt vào sổ chung',
    nghiTham: '{nguoi} nghĩ thầm:',
    luotTiep: 'Lượt tiếp theo →',
    xemTongKet: 'Xem tổng kết ván đấu →',
    ketThuc: 'Kết thúc 8 lượt chơi!',
    bangXepHang: 'Bảng xếp hạng điểm cọc cuối cùng của các thành viên trong mạng lưới:',
    diemSo: '{so} điểm',
    tomTat: 'Tóm tắt ván đấu:',
    baiHoc1: 'Sổ không nằm ở một người. Nhiều người cùng giữ và họ phải đồng ý thì trang mới được ghi.',
    baiHoc2: 'Gian lận thì lỗ hơn làm thật.',
    /** Bong bóng suy nghĩ của {phanDien} sau lượt tạo trang; không bao giờ hiện trước khi bỏ phiếu */
    nghi: {
      first: 'Thử lòng mọi người xem sao!',
      ev: 'Hình như mọi người dễ dãi… thử gian xem!',
      gamble: '{phanDien} tính rồi thấy khó lọt, nhưng cứ liều một lần!',
      honest: '{phanDien} tính rồi: gian thì dễ mất cọc, thôi làm thật!',
    },
    suyNgam: {
      cauHoi: 'Vì sao càng về sau {phanDien} càng ít gian lận?',
      dapAn: ['Vì {phanDien} tính ra gian thì dễ mất cọc, làm thật mới có lời.', 'Vì {phanDien} hết điểm cọc.', 'Vì luật cấm {phanDien} gian lận.'],
      giaiThich:
        '{phanDien} nhớ ai hay từ chối trang gian. Khi thấy trang gian khó lọt, {phanDien} tính ra gian thì dễ mất 30 điểm cọc, còn làm thật chắc chắn được +10, nên {phanDien} chọn làm thật.',
    },
    hocDuoc:
      'Sổ không nằm ở một người. Nhiều người cùng giữ và họ phải đồng ý thì trang mới được ghi. Gian lận thì lỗ hơn làm thật.',
  },
} as const;

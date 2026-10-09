/**
 * Chữ của Bài 4 "Cây gộp sổ" (màn 10, Làng Bạc). Xem content/HUONG-DAN-SUA-CHU.md.
 * Chỗ giữ tên: {bacAn}, {cuBinh}, {coChi}, {chuDung}, {phanDien} là nhân vật; {ten}/{Ten} là học sinh;
 * {so}, {id}, {value}… là số do bài điền vào.
 * Công thức T_ab = T_a × 10 + T_b, dữ liệu và cách chấm sao nằm ở lessons/bai-4 (logic); ở đây chỉ có chữ hiển thị.
 */
import type { LessonContent } from '../../lesson2d/types';

/** Ảnh nền của màn 10 trong manifest (không đuôi) */
export const BAI4_BACKGROUND = 'scenes/bai-hoc-lang-bac';

/** Nội dung dùng cho khung LessonPage2D: lời thầy Linh theo thời điểm, lời trao trang, giới thiệu 3 trạm, thẻ "Em có biết?". */
export const bai4Lesson: LessonContent = {
  dialogue: {
    /** Đầu bài (trước trạm Dễ) */
    dauBai: [
      {
        characterId: 'thayLinh',
        text: 'Ghép hai giao dịch: T_ab = T_a × 10 + T_b. Ghép từng cặp, rồi lại ghép từng cặp kết quả, tới khi còn một số gốc.',
      },
    ],
    /** Bài này không có lời trước trạm Trung bình và trước trạm Khó */
    truocTb: [],
    truocKho: [],
    /** Cuối bài, trước màn hoàn thành */
    cuoiBai: [{ characterId: 'thayLinh', text: 'Nhờ số gốc, cả làng chỉ cần so một con số là biết sổ có bị sửa hay không.' }],
  },

  /** Lúc {phanDien} tráo giao dịch ở trạm Trung bình (trạm gọi onTwist khi gốc đổi) */
  twist: [{ characterId: 'thayLinh', text: 'Thấy chưa, chỉ đổi một lá mà con số đổi lan lên tận gốc.' }],

  /**
   * Mốc 1: trang thứ tư được trao ngay sau màn 10 (cao trào ở mốc 3, hội làng ở mốc 4).
   * Spec 04 mục 5: Bi nói "Đủ 4 trang rồi! Cả làng đang mở hội."
   */
  award: {
    chuThich: 'Thầy Linh trao Trang Sổ Vàng thứ tư.',
    loi: [{ characterId: 'bi', text: 'Đủ 4 trang rồi! Cả làng đang mở hội.' }],
    ghiChuCuoi: 'Hội làng sắp mở',
  },

  /** Giới thiệu từng trạm (LevelIntro); mẹo do Bi nói */
  stations: {
    de: {
      tieuDe: 'Làm quen ghép cặp',
      mucTieu: 'Thực hành công thức ghép cặp giao dịch và chú ý thứ tự ghép.',
      meo: 'Công thức ghép: T_ab = T_a × 10 + T_b. Thứ tự trước sau rất quan trọng!',
    },
    tb: {
      tieuDe: 'Xây cây 4 giao dịch',
      mucTieu: 'Tự tay dựng cây Merkle 4 giao dịch và khám phá vì sao đổi 1 lá thì gốc đổi.',
      meo: 'Một ô chỉ mở nhập khi cả hai ô con bên dưới đã có kết quả đúng.',
    },
    kho: {
      tieuDe: 'Ghép mảnh cây 8 giao dịch',
      mucTieu: 'Kéo thả hoặc chạm đặt các mảnh ghép vào cây Merkle 8 giao dịch và tránh các mảnh bẫy ngược thứ tự.',
      meo: 'Hãy tính xuôi từ tầng dưới lên trên và cẩn thận với mảnh ghép bị đảo ngược thứ tự!',
    },
  },

  /** "Điều em vừa học" ở màn hoàn thành cả bài */
  keyTakeaway: 'Cây Merkle gói nhiều giao dịch thành 1 gốc. Đổi bất kỳ giao dịch nào thì gốc cũng đổi.',

  /** Thẻ "Em có biết?" (giữ thuật ngữ thật: cây Merkle, gốc Merkle, node) */
  emCoBiet: [
    {
      title: 'Một khối chứa rất nhiều giao dịch.',
      text: 'Cây Merkle là cách "gói" tất cả giao dịch thành một con số duy nhất ở đỉnh, gọi là gốc Merkle (Merkle root).',
      example: 'Dù một trang sổ chứa hàng trăm hay hàng ngàn giao dịch, chỉ cần một con số Gốc Merkle là đại diện được cho tất cả!',
    },
    {
      title: 'Cách tạo cây.',
      text: 'Ghép từng cặp giao dịch thành một giá trị mới, rồi lại ghép từng cặp giá trị mới, cho tới khi chỉ còn 1 giá trị. Giá trị đó là gốc. Trong bài, công thức ghép là T_ab = T_a × 10 + T_b, và thứ tự quan trọng (T_12 khác T_21).',
      example: 'T12 = 3 × 10 + 7 = 37. Nhưng T21 = 7 × 10 + 3 = 73! Thứ tự trước sau quyết định kết quả.',
    },
    {
      title: 'Giống bảng đấu loại trực tiếp.',
      text: '8 đội đá 4 trận tứ kết, rồi 2 trận bán kết, rồi 1 trận chung kết. Mỗi cặp gộp thành 1, cho tới khi chỉ còn nhà vô địch ở đỉnh.',
      example: 'Chiếc cúp vô địch ở đỉnh chính là Gốc Merkle, kết tinh từ toàn bộ nhánh đấu bên dưới!',
    },
    {
      title: 'Để làm gì?',
      text: 'Chỉ cần sửa 1 giao dịch là gốc đổi ngay. Gốc được ghi vào khối (trang sổ), nên node chỉ cần so 1 con số thay vì so từng giao dịch, và phát hiện sửa đổi rất nhanh.',
      example: 'Mỗi khi kiểm tra sổ, các máy tính chỉ cần so khớp 1 con số Gốc Merkle là biết ngay tính toàn vẹn của cả trang.',
    },
  ],
};

/**
 * Dữ liệu hiển thị của bảng giao dịch do lessons/bai-4 (logic) dùng: tên người và món đồ.
 * Người thứ 8 tên là "Lan" (trước là "Linh") để khỏi trùng thầy Linh.
 */
export const bai4Data = {
  /** 4 giao dịch của trạm Dễ và Trung bình */
  easy: [
    { name: '{bacAn}', item: 'quyển sách' },
    { name: '{cuBinh}', item: 'cây bút' },
    { name: '{coChi}', item: 'vở' },
    { name: '{chuDung}', item: 'thước' },
  ],
  /** 8 giao dịch của trạm Khó */
  hard: [
    { name: '{bacAn}', item: 'quyển sách' },
    { name: '{cuBinh}', item: 'cây bút' },
    { name: '{coChi}', item: 'vở ô ly' },
    { name: '{chuDung}', item: 'thước kẻ' },
    { name: 'Giang', item: 'ba lô' },
    { name: 'Hoa', item: 'compa' },
    { name: 'Khang', item: 'hộp bút' },
    { name: 'Lan', item: 'bảng con' },
  ],
} as const;

/** Chữ bên trong 3 trạm. Khóa tNN theo thứ tự xuất hiện trong từng thành phần. */
export const bai4Texts = {
  tramDe: {
    vuiLongNhapMotSo: 'vui lòng nhập một số từ 10 đến 99',
    ghepHaiGiaoDichThi: 'Ghép hai giao dịch thì thứ tự quan trọng: T12 khác T21.',
    bayThuTu: 'Bẫy thứ tự!',
    emDaGhepNguocThu: 'Em đã ghép ngược thứ tự: {inputValue} là kết quả của T12!',
    giaiThichT21: 'T21 = T2 × 10 + T1 = {value} × 10 + {value2} = {expectedValue}, khác T12 = {so4}.',
    laySoCuaGiaoDich: 'Lấy số của giao dịch đứng trước (T2 = {value}) nhân 10, rồi cộng giao dịch đứng sau (T1 = {value2}).',
    chuaChinhXac: 'Chưa chính xác',
    ketQuaChuaDungCho: 'Kết quả {inputValue} chưa đúng cho phép ghép {pairLabel}.',
    congThucGhepCapTong: 'Công thức ghép cặp tổng quát: T_ab = T_a × 10 + T_b. Lấy giá trị giao dịch đầu nhân 10 rồi cộng giao dịch thứ hai.',
    congThucTheSoCapGhep: 'Với {pairLabel}: {id} × 10 + {id2} = {value} × 10 + {value2} = {expectedValue}.',
    tienDoGhepCap: 'tiến độ ghép cặp',
    cauHoi: 'câu hỏi {so} / {so2}',
    bangGiaoDich: 'bảng giao dịch',
    bangTraCuuGiaTri: 'bảng tra cứu giá trị từng giao dịch',
    cauGhepCap: 'câu {so}: ghép cặp {pairLabel}',
    hayGhepGiaTriCua: 'hãy ghép giá trị của hai giao dịch bên dưới theo công thức:',
    congThucGhepCap: 'T_ab = T_a × 10 + T_b',
    theGop: 'thẻ gộp {label}',
    ghepGiaoDich: 'ghép giao dịch',
    thuLai: 'Thử lại',
  },
  tramTb: {
    buoc1BatDauTu: 'bước 1: bắt đầu từ các lá',
    hangDuoiCungLa4: 'hàng dưới cùng là 4 giao dịch ban đầu của các bạn: T1=3, T2=7, T3=5, T4=2.',
    bonLaODayCay: '4 lá ở đáy cây',
    buoc2GhepCapT1: 'bước 2: ghép cặp T1 và T2',
    haiGiaoDichDauTien: 'hai giao dịch đầu tiên được ghép lại theo công thức Tab = Ta × 10 + Tb.',
    buoc3GhepCapT3: 'bước 3: ghép cặp T3 và T4',
    haiGiaoDichTiepTheo: 'hai giao dịch tiếp theo cũng được ghép tương tự.',
    buoc4GhepLenGoc: 'bước 4: ghép lên gốc Merkle',
    haiNhanhT12VaT34: 'hai nhánh T12 và T34 tiếp tục được ghép với nhau để tạo thành đỉnh duy nhất.',
    congThucGocKhiXem: 'gốc = T12 × 10 + T34 = {so} × 10 + {so2} = {so3}',
    buoc5ConSoDai: 'bước 5: con số đại diện duy nhất',
    gocMerkle422GoiGon: 'gốc Merkle 422 gói gọn toàn bộ 4 giao dịch. Chỉ cần ghi con số này vào trang sổ là đảm bảo an toàn!',
    daHoanThanhDungCay: 'đã hoàn thành dựng cây 4 giao dịch',
    vuiLongNhapMotSo: 'vui lòng nhập một số hợp lệ',
    congThucGocKhiNhap: 'gốc = T12 × 10 + T34 = {so} × 10 + {so2}',
    chuaChinhXac: 'Chưa chính xác',
    giaTriChuaDungCho: 'Giá trị {inputVal} chưa đúng cho ô {so2}.',
    hayKiemTraLaiPhep: 'Hãy kiểm tra lại phép nhân 10 và phép cộng từ 2 ô con bên dưới.',
    congThucDaTheSo: 'Công thức đã thế số: {hintFormula} = {expected}.',
    tabXemDungCay: '1. Xem dựng cây',
    tabTuXayCay: '2. Tự xây cây',
    tabKhamPha: '3. Khám phá bí mật',
    hoatCanhDungCayBuoc: 'hoạt cảnh dựng cây (bước {so} / 5)',
    cayMerkle4GiaoDich: 'cây Merkle 4 giao dịch dựng từ đáy lên đỉnh',
    phepTinhTuongUng: 'phép tính tương ứng',
    quayLai: 'Quay lại',
    tiepTheo: 'Tiếp theo 👉',
    tuEmXayCay: 'Tự em xây cây 👉',
    thuThachTuXayCay: 'thử thách tự xây cây',
    nhapKetQuaTuCac: 'nhập kết quả từ các nút con',
    chonOCanTinhRoi: 'chọn ô cần tính rồi nhập kết quả. Ô gốc chỉ mở khi cả T12 và T34 đã đúng!',
    canT12VaT34Truoc: 'cần T12 và T34 trước',
    chamVaoODeChon: 'chạm vào ô để chọn nhập số',
    dangNhapChoO: 'đang nhập cho ô: {so}',
    goc: 'GỐC',
    nhapKetQua: 'nhập kết quả',
    xacNhan: 'Xác nhận',
    xuatSacEmDaHoan: '🎉 Xuất sắc! Em đã hoàn thành cây Merkle 4 giao dịch!',
    hayTiepTucDeXem: 'Hãy tiếp tục để xem điều kỳ diệu xảy ra khi có ai đó lén sửa 1 giao dịch.',
    khamPhaKhoanhKhacA: 'Khám phá khoảnh khắc "À ra thế" 👉',
    khoanhKhacARaThe: 'khoảnh khắc "à ra thế"',
    tinhNghichToVuaLen: '**{phanDien} tinh nghịch: **"Tớ vừa lén sửa một lá trên cây em vừa dựng. Gốc đổi rồi đấy, xem em có tìm ra lá nào không!"',
    giaoDichNaoBiSua: 'Giao dịch nào đã bị sửa?',
    huongDanSoiO: 'Bấm vào một ô để so: số lúc em dựng cây (trong sổ) và số tính lại bây giờ.',
    soGocDaGhi: 'Sổ ghi số gốc **{so}** — em đã tính đúng ✓',
    soGocTinhLai: '{phanDien} sửa một lá, nên tính lại bây giờ ra **{so}**. Hãy tìm lá đã khác so với lúc em dựng cây!',
    soiTieuDeCay: 'Số trên ô là số lúc em dựng cây (đã ghi trong sổ).',
    soiCayCu: 'Cây trong sổ (lúc em dựng)',
    soiCayMoi: 'Cây bây giờ ({phanDien} đã sửa)',
    soiDung: '✓ đúng',
    soiNhanChuaSoi: '{nhan}: chưa soi, bấm để soi',
    soiNhanChuaMo: '{nhan}: chưa mở, hãy soi ô cha đang khác trước',
    soiKhop: '✓ giống',
    soiLech: '✗ khác',
    soiNhanKhop: 'giống',
    soiNhanLech: 'khác',
    soiNhanCuaO: '{nhan}: lúc dựng {so}',
    soiNhanKetQua: '{nhan}: lúc dựng {so}, bây giờ {so2}, {ketQua}',
    soiTimRaRoi: 'Em tìm ra rồi! {phanDien} đã sửa {la} từ {cu} thành {moi}.',
    soiTongKet: 'Em soi {so} ô. Đi theo nhánh đỏ thì chỉ cần 2 ô mỗi tầng.',
    dangLanTruyenDoiGia: 'Đang lan truyền đổi giá trị...',
    doiMotGiaoDichThi: 'Đổi một giao dịch thì mọi ô trên đường lên gốc đều đổi, nên gốc đổi theo.',
    hoanThanhManHoc: 'Hoàn thành màn học 🎉',
    thuLai: 'Thử lại',
  },
  tramKho: {
    emHayXepDuO: 'em hãy xếp đủ {so} ô còn trống trước khi kiểm tra!',
    goc: 'Gốc',
    emDangGhepNguocThu: '{nodeLabel}: em đang ghép ngược thứ tự ({rightVal} × 10 + {leftVal} = {reverseVal}).',
    oTangGiaTriChua: 'Ô tầng {level}: giá trị {placedVal} chưa chính xác.',
    laGiaTriChuaDung: 'Lá T{so}: giá trị {placedVal} chưa đúng.',
    cayMerkleGoiNhieuGiao: 'Cây Merkle gói nhiều giao dịch thành 1 gốc. Đổi bất kỳ giao dịch nào thì gốc cũng đổi.',
    coManhGhepChuaDung: 'Có mảnh ghép chưa đúng',
    coManhGhepChuaDung2: 'Có {so} mảnh ghép chưa đúng vị trí và đã được trả về khay.',
    hayTinhCanThanTu: 'Hãy tính cẩn thận từ dưới lên trên và cảnh giác với các mảnh ghép bị đảo ngược thứ tự!',
    dung: '✓ đúng',
    daDat: 'đã đặt',
    bang8GiaoDichGoc: 'bảng 8 giao dịch gốc',
    bangTraCuuGiaTri: 'bảng tra cứu giá trị ban đầu của 8 bạn',
    cayMerkle8GiaoDich: 'cây Merkle 8 giao dịch',
    keoHoacChamManhTu: 'kéo hoặc chạm mảnh từ khay để điền vào các ô dấu hỏi chấm (?)',
    luotKiemTra: 'lượt kiểm tra: **{checkCount}**',
    vuotNgangDeXemDu: 'vuốt ngang để xem đủ 8 nhánh nếu xem trên điện thoại',
    kiemTraCayMerkle: 'Kiểm tra cây Merkle 🔍',
    khayManhGhepManh: 'khay mảnh ghép ({so} / {so2} mảnh)',
    chua6GiaTriDung: 'chứa 6 giá trị đúng + 2 mảnh bẫy ghép ngược',
    thaManhVeKhayTai: 'thả mảnh về khay tại đây',
    tatCaManhGhepDa: 'Tất cả mảnh ghép đã được đặt lên cây. Bấm "Kiểm tra" ở trên!',
    thuLai: 'Thử lại',
  },
  cayMerkle: {
    goc: 'gốc',
    vuotNgangDeXemCa: 'vuốt ngang để xem cả cây',
  },
} as const;

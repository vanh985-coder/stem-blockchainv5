/**
 * Chữ của Bài 1 "Trang nối trang" (màn 1, Làng Giấy). Xem content/HUONG-DAN-SUA-CHU.md.
 * Chỗ giữ tên: {phanDien} là phản diện, {ten}/{Ten} là học sinh; {n}, {truoc}, {nd}, {ma}… là số do bài điền vào.
 * Công thức, số liệu và cách chấm sao nằm ở lessons/bai-1 (logic); ở đây chỉ có chữ hiển thị.
 */
import type { LessonContent } from '../../lesson2d/types';

/** Ảnh nền của màn 1 trong manifest (không đuôi) */
export const BAI1_BACKGROUND = 'scenes/bai-hoc-lang-giay';

/** Nội dung dùng cho khung LessonPage2D: lời bác An theo thời điểm, lời trao trang, giới thiệu 3 trạm, thẻ "Em có biết?". */
export const bai1Lesson: LessonContent = {
  dialogue: {
    /** Đầu bài (trước trạm Dễ) */
    dauBai: [
      {
        characterId: 'bacAn',
        text: 'Mỗi trang sổ ghi Nội dung và Mã trang. Mã trang = (mã trang trước × 2 + nội dung), chỉ giữ 2 chữ số cuối. Nhờ thế các trang móc vào nhau như mắt xích.',
      },
    ],
    /** Trước trạm Trung bình, kèm chân dung {phanDien} cười */
    truocTb: [
      {
        characterId: 'bacAn',
        text: 'Đêm qua {phanDien} lẻn vào sửa một trang. Cháu thử sửa lại xem có dễ không!',
        aside: { characterId: 'phanDien', text: 'Hì hì!' },
      },
    ],
    /** Trước trạm Khó */
    truocKho: [{ characterId: 'bacAn', text: 'Làng vẫn ghi trang mới liên tục. Thử sửa cho kịp xem nào.' }],
    /** Cuối bài, trước màn hoàn thành */
    cuoiBai: [{ characterId: 'bacAn', text: 'Một người không thể sửa nhanh hơn cả làng cùng ghi sổ.' }],
  },

  /** "Kết thúc làng": cảnh trao Trang Sổ Vàng thứ nhất */
  award: {
    chuThich: 'Bác An trao Trang Sổ Vàng thứ nhất.',
    loi: [
      {
        characterId: 'bacAn',
        text: 'Một mình giữ sổ thì kẻ gian vẫn ngồi sửa cả đêm được. Vì thế các làng không bao giờ để sổ ở một nơi. Xuống Làng Dệt mà xem.',
      },
    ],
  },

  /** Giới thiệu từng trạm (LevelIntro); mẹo do Bi nói */
  stations: {
    de: {
      tieuDe: 'Xây chuỗi 5 trang',
      mucTieu: 'Tính mã từng trang theo công thức của cuốn sổ để nối thành chuỗi.',
      meo: 'Lấy mã trang trước nhân 2, cộng nội dung, rồi giữ 2 chữ số cuối (mod 100).',
    },
    tb: {
      tieuDe: '{phanDien} sửa trộm sổ',
      mucTieu: 'Sửa lại các mã trang bị lệch do nội dung một trang bị thay đổi lén.',
      meo: 'Chỉ cần sửa mã trang đầu tiên bị lệch, hiệu ứng domino sẽ chỉ ra trang tiếp theo.',
    },
    kho: {
      tieuDe: 'Cuộc đua với cả mạng lưới',
      mucTieu:
        'Em muốn lén đổi nội dung trang 2 mà không ai phát hiện. Muốn vậy, cả chuỗi phải khớp. Nhưng mạng lưới vẫn liên tục ghi thêm trang mới!',
      meo: 'Tập trung tính thật nhanh mã trang lệch đầu tiên trước khi trang mới xuất hiện.',
    },
  },

  /** "Điều em vừa học" ở màn hoàn thành cả bài */
  keyTakeaway: 'Một người không thể sửa nhanh hơn cả mạng lưới cùng ghi sổ.',

  /** Thẻ "Em có biết?" (giữ thuật ngữ thật: khối, chuỗi, hàm băm) */
  emCoBiet: [
    {
      title: 'Blockchain là một cuốn sổ.',
      text: 'Mỗi trang sổ là một khối (block). Các trang được ghi nối tiếp nhau thành một chuỗi (chain), vì vậy mới gọi là "chuỗi khối".',
    },
    {
      title: 'Mỗi trang có 2 phần.',
      text: 'Nội dung là điều được ghi lại (ở đây là một con số). Mã trang giống như "dấu vân tay" của trang.',
    },
    {
      title: 'Cách tính mã trang.',
      text: 'Mã trang = (Mã trang trước × 2 + Nội dung) mod 100, trong đó "mod 100" nghĩa là chỉ giữ 2 chữ số cuối. Ví dụ: trang bìa có mã 10, nội dung là 23, ta có 10 × 2 + 23 = 43, vậy mã trang là 43.',
    },
    {
      title: 'Vì sao khó sửa lén?',
      text: 'Mã trang sau được tính từ mã trang trước, nên sửa một trang sẽ kéo theo phải sửa mọi trang phía sau. Blockchain thật dùng "hàm băm" (như SHA-256) phức tạp hơn nhiều, nhưng ý tưởng giống hệt.',
    },
  ],
};

/** Chữ bên trong 3 trạm */
export const bai1Texts = {
  chung: {
    /** Ô nhập số */
    khoangSo: '0–99',
    capNhatMa: 'Cập nhật mã',
    thuLai: 'Thử lại',
    /** Tiêu đề khung công thức khi tính mã trang {n} */
    congThuc: 'Công thức tính mã trang {n}:',
    /** Công thức đã thế số, {truoc} và {nd} là số */
    congThucThe: '({truoc} × 2 + {nd}) mod 100 = ?',
    /** Dùng khi sai: {ma} là mã em nhập */
    maSai: 'Mã trang {ma} chưa đúng.',
  },

  de: {
    tieuDe: 'Xây chuỗi 5 trang',
    huongDan: 'Tính mã trang cho từng trang để đóng dấu xác nhận.',
    /** Dòng đang làm tới trang nào */
    dangLam: 'Đang làm:',
    tenTrang: 'Trang {n} / 5',
    kiemTra: 'Kiểm tra',
    maSaiKhoang: 'Mã trang là số từ 0 đến 99',
    nhanMaTrang: 'Mã trang {n}',
    /** Sai lần 1: gợi ý công thức đã thế số, chưa có kết quả */
    sai1Chuyen: 'Mã trang {ma} chưa đúng.',
    sai1ViSao: 'Công thức: ({truoc} × 2 + {nd}) mod 100.',
    sai1CachSua:
      'Em hãy nhân đôi mã trang trước ({truoc} × 2), cộng thêm nội dung ({nd}), rồi lấy 2 chữ số cuối (mod 100) nhé!',
    /** Sai lần 2 trở đi: lời giải từng bước */
    sai2Chuyen: 'Mã trang vẫn chưa đúng. Lời giải từng bước:',
    sai2ViSao: '1) {truoc} × 2 = {gapDoi}\n2) {gapDoi} + {nd} = {tong}\n3) Giữ 2 chữ số cuối (mod 100): {ma}',
    sai2CachSua: 'Em hãy nhập lại mã trang là {ma} nhé!',
    hocDuoc: 'Mỗi trang giữ mã của trang trước. Nhờ vậy các trang móc vào nhau thành chuỗi.',
  },

  tb: {
    tieuDe: '{phanDien} sửa trộm sổ',
    tuChuoiCu: 'Đây là chuỗi em vừa xây',
    /** Hoạt cảnh {phanDien} lẻn vào sửa */
    dangSua: '{phanDien} đang lén sửa sổ…!',
    dangSuaChiTiet: '{phanDien} đang bí mật gạch số cũ trên trang {n} và ghi đè số mới vào…',
    daBiDoi: 'Nội dung trang {n} đã bị đổi nên mã trang không còn khớp.',
    soTrangDaSua: 'Số trang đã phải sửa:',
    tinhLai: 'Tính lại mã cho trang {n}:',
    /** Lần domino đầu tiên: trang {n} lệch vì trang {truoc} vừa đổi */
    domino: 'Ôi! Mã trang {n} được tính từ mã trang {truoc}. Mã trang {truoc} vừa đổi nên trang {n} lệch theo.',
    sai1Chuyen: 'Mã trang {ma} chưa đúng.',
    sai1ViSao: 'Công thức: ({truoc} × 2 + {nd}) mod 100.',
    sai1CachSua: 'Em hãy nhân 2 mã trang trước ({truoc} × 2 = {gapDoi}), cộng nội dung ({nd}), rồi lấy 2 chữ số cuối nhé!',
    cauHoi: 'Liệu có nhiều khối hơn và sinh ra liên tục thì sửa có kịp không?',
    luaChon: ['Kịp chứ!', 'Chắc là không kịp', 'Em chưa chắc'],
    giaiThich: 'Hãy sang trạm Khó để tìm hiểu điều đó!',
    xongTram: 'Xong trạm',
    hocDuoc: 'Chỉ đổi 1 trang mà em phải tính lại cả những trang phía sau.',
  },

  kho: {
    tieuDe: 'Cuộc đua với cả mạng lưới',
    conPhaiSua: 'Còn phải sửa:',
    daSua: 'Đã sửa:',
    trang: 'trang',
    /** Đọc cho người dùng đọc màn hình: {s} giây */
    thoiGianConLai: 'Thời gian còn lại: {s} giây',
    giay: '{s}s',
    /** Hiện khi em sửa hết một lần */
    nhanQua: 'Wow, em nhanh thật! Nhưng trang mới vẫn tiếp tục tới…',
    hetGio: 'Hết giờ!',
    tongKetDaSua: 'Số trang đã sửa:',
    tongKetMangThem: 'Số trang mạng đã thêm:',
    tongKetConLech: 'Số trang còn lệch:',
    cauHoi: 'Nếu cuốn sổ nằm trong tay một mình em và không ai thêm trang mới, em có sửa lén được không?',
    luaChon: ['Được, cứ từ từ tính lại', 'Không được'],
    giaiThich: 'Đúng vậy. Vì thế blockchain không bao giờ để sổ trong tay một người. Ở Bài 2, rất nhiều người cùng giữ sổ!',
    xongTram: 'Xong trạm',
    hocDuoc: 'Muốn sửa lén một trang, phải tính lại cả chuỗi phía sau, mà mạng lưới vẫn ghi thêm trang mới.',
  },
} as const;

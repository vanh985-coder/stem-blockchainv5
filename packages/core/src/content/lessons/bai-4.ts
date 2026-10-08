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
  easy: {
    t01: 'vui lòng nhập một số từ 10 đến 99',
    t02: 'Ghép hai giao dịch thì thứ tự quan trọng: T12 khác T21.',
    t03: 'Bẫy thứ tự!',
    t04: 'Em đã ghép ngược thứ tự: {inputValue} là kết quả của T12!',
    t05: 'T21 = T2 × 10 + T1 = {value} × 10 + {value2} = {expectedValue}, khác T12 = {so4}.',
    t06: 'Lấy số của giao dịch đứng trước (T2 = {value}) nhân 10, rồi cộng giao dịch đứng sau (T1 = {value2}).',
    t07: 'Chưa chính xác',
    t08: 'Kết quả {inputValue} chưa đúng cho phép ghép {pairLabel}.',
    t09: 'Công thức ghép cặp tổng quát: T_ab = T_a × 10 + T_b. Lấy giá trị giao dịch đầu nhân 10 rồi cộng giao dịch thứ hai.',
    t10: 'Với {pairLabel}: {id} × 10 + {id2} = {value} × 10 + {value2} = {expectedValue}.',
    t16: 'tiến độ ghép cặp',
    t17: 'câu hỏi {so} / {so2}',
    t18: 'bảng giao dịch',
    t19: 'bảng tra cứu giá trị từng giao dịch',
    t20: 'câu {so}: ghép cặp {pairLabel}',
    t21: 'hãy ghép giá trị của hai giao dịch bên dưới theo công thức: ',
    t22: 'thẻ gộp {label}',
    t23: 'ghép giao dịch',
    t24: 'Thử lại',
  },
  medium: {
    t01: 'bước 1: bắt đầu từ các lá',
    t02: 'hàng dưới cùng là 4 giao dịch ban đầu của các bạn: T1=3, T2=7, T3=5, T4=2.',
    t03: '4 lá ở đáy cây',
    t04: 'bước 2: ghép cặp T1 và T2',
    t05: 'hai giao dịch đầu tiên được ghép lại theo công thức Tab = Ta × 10 + Tb.',
    t06: 'bước 3: ghép cặp T3 và T4',
    t07: 'hai giao dịch tiếp theo cũng được ghép tương tự.',
    t08: 'bước 4: ghép lên gốc Merkle',
    t09: 'hai nhánh T12 và T34 tiếp tục được ghép với nhau để tạo thành đỉnh duy nhất.',
    t10: 'gốc = T12 × 10 + T34 = {so} × 10 + {so2} = {so3}',
    t11: 'bước 5: con số đại diện duy nhất',
    t12: 'gốc Merkle 422 gói gọn toàn bộ 4 giao dịch. Chỉ cần ghi con số này vào trang sổ là đảm bảo an toàn!',
    t13: 'đã hoàn thành dựng cây 4 giao dịch',
    t14: 'vui lòng nhập một số hợp lệ',
    t15: 'gốc = T12 × 10 + T34 = {so} × 10 + {so2}',
    t16: 'Chưa chính xác',
    t17: 'Giá trị {inputVal} chưa đúng cho ô {so2}.',
    t18: 'Hãy kiểm tra lại phép nhân 10 và phép cộng từ 2 ô con bên dưới.',
    t19: 'Công thức đã thế số: {hintFormula} = {expected}.',
    t25: '1. Xem dựng cây',
    t26: '2. Tự xây cây',
    t27: '3. Khám phá bí mật',
    t28: 'hoạt cảnh dựng cây (bước {so} / 5)',
    t29: 'cây Merkle 4 giao dịch dựng từ đáy lên đỉnh',
    t30: 'phép tính tương ứng',
    t31: 'Quay lại',
    t32: 'Tiếp theo 👉',
    t33: 'Tự em xây cây 👉',
    t34: 'thử thách tự xây cây',
    t35: 'nhập kết quả từ các nút con',
    t36: 'chọn ô cần tính rồi nhập kết quả. Ô gốc chỉ mở khi cả T12 và T34 đã đúng!',
    t37: 'cần T12 và T34 trước',
    t38: 'chạm vào ô để chọn nhập số',
    t39: 'GỐC',
    t40: 'đang nhập cho ô: {so}',
    t41: 'nhập kết quả',
    t42: 'Xác nhận',
    t43: '🎉 Xuất sắc! Em đã hoàn thành cây Merkle 4 giao dịch!',
    t44: 'Hãy tiếp tục để xem điều kỳ diệu xảy ra khi có ai đó lén sửa 1 giao dịch.',
    t45: 'Khám phá khoảnh khắc "À ra thế" 👉',
    t46: 'khoảnh khắc "à ra thế"',
    t47: 'chỉ đổi 1 giao dịch, gốc đổi theo!',
    t48: '"Tớ vừa lén sửa giao dịch T3 từ ',
    t49: ' thành ',
    t50: '. Xem có ai nhận ra không nào!"',
    t51: '{phanDien} tinh nghịch: ',
    t52: 'các ô màu đỏ lần lượt đổi giá trị từ lá lên gốc',
    t55: 'Sửa giao dịch & xem gốc đổi 💥',
    t56: 'Đang lan truyền đổi giá trị...',
    t57: 'Hoàn thành màn học 🎉',
    t58: 'Đổi một giao dịch thì mọi ô trên đường lên gốc đều đổi, nên gốc đổi theo.',
    t59: 'Thử lại',
  },
  hard: {
    t01: 'em hãy xếp đủ {so} ô còn trống trước khi kiểm tra!',
    t02: 'Gốc',
    t03: '{nodeLabel}: em đang ghép ngược thứ tự ({rightVal} × 10 + {leftVal} = {reverseVal}).',
    t04: 'Ô tầng {level}: giá trị {placedVal} chưa chính xác.',
    t05: 'Lá T{so}: giá trị {placedVal} chưa đúng.',
    t06: 'Cây Merkle gói nhiều giao dịch thành 1 gốc. Đổi bất kỳ giao dịch nào thì gốc cũng đổi.',
    t07: 'Có mảnh ghép chưa đúng',
    t08: 'Có {so} mảnh ghép chưa đúng vị trí và đã được trả về khay.',
    t09: 'Hãy tính cẩn thận từ dưới lên trên và cảnh giác với các mảnh ghép bị đảo ngược thứ tự!',
    t10: '✓ đúng',
    t11: 'đã đặt',
    t17: 'bảng 8 giao dịch gốc',
    t18: 'bảng tra cứu giá trị ban đầu của 8 bạn',
    t19: 'cây Merkle 8 giao dịch',
    t20: 'kéo hoặc chạm mảnh từ khay để điền vào các ô dấu hỏi chấm (?)',
    t21: 'lượt kiểm tra: ',
    t22: 'vuốt ngang để xem đủ 8 nhánh nếu xem trên điện thoại',
    t23: 'Kiểm tra cây Merkle 🔍',
    t24: 'khay mảnh ghép ({so} / {so2} mảnh)',
    t25: 'chứa 6 giá trị đúng + 2 mảnh bẫy ghép ngược',
    t26: 'thả mảnh về khay tại đây',
    t27: 'Tất cả mảnh ghép đã được đặt lên cây. Bấm "Kiểm tra" ở trên!',
    t28: 'Thử lại',
  },
  caymerkle: {
    t01: 'gốc',
    t02: 'vuốt ngang để xem cả cây',
  },
} as const;

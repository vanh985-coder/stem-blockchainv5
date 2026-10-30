import type { VillageId } from '../village';

/**
 * Câu hỏi của 16 thẻ "Em có biết?" nhặt được trong làng (P6b; nội dung đã duyệt ở docs/specs/P6-NOI-DUNG-THE-TUONG-TAC.md, bản rà commit 49168dc). Mỗi làng 4 câu, thứ tự đúng chỉ số cuộn
 * (`VillageScroll.index`, bit của `knowCards`). Mọi câu đi qua fmt() khi hiện ({phanDien}, {cuBinh}, {coChi}). Thẻ thứ 5 của Làng Khắc Dấu không có cuộn và không có câu hỏi (chỉ đọc).
 * Nguồn cho thẻ Bitcoin: https://developer.bitcoin.org/devguide/wallets.html (khóa riêng 256-bit) và https://bips.dev/340/ (chữ ký Schnorr).
 */
export interface KnowQuizAbcd {
  kind: 'abcd';
  question: string;
  /** Đúng bốn phương án A, B, C, D theo thứ tự này (không xáo) */
  options: readonly [string, string, string, string];
  /** Chỉ số đáp án đúng: 0 là A … 3 là D */
  correct: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface KnowQuizNumber {
  kind: 'number';
  question: string;
  /** Đáp án đúng; cách viết chấp nhận xem `parseNumberAnswer` (lib/knowQuiz.ts) */
  answer: number;
  explanation: string;
}

export type KnowQuiz = KnowQuizAbcd | KnowQuizNumber;

export const KNOW_QUIZ: Readonly<Record<VillageId, readonly KnowQuiz[]>> = {
  'lang-giay': [
    {
      kind: 'abcd',
      question: 'Sổ Làng Giấy hiện có 8 trang, ghi nối tiếp nhau. Theo cách gọi "chuỗi khối" (blockchain), cuốn sổ này là gì?',
      options: ['Một chuỗi gồm 8 khối', 'Một khối gồm 8 chuỗi', 'Tám chuỗi khối riêng biệt', 'Một khối duy nhất'],
      correct: 0,
      explanation:
        'Mỗi trang là một khối, các trang nối tiếp nhau tạo thành chuỗi, nên 8 trang là một chuỗi gồm 8 khối. Nếu em chọn B hay D, em đang gọi cả cuốn sổ là "khối": khối chỉ là từng trang. Trong bài này mỗi khối chỉ ghi một con số cho dễ học; ở blockchain thật mỗi khối chứa nhiều giao dịch.',
    },
    {
      kind: 'abcd',
      question: 'Trang 1 ghi "Nội dung 23, Mã trang 43". Sau đó {phanDien} lén đổi Nội dung thành 24 nhưng không tính lại Mã trang. Vì sao em có thể phát hiện trang bị đổi?',
      options: [
        'Vì số thứ tự của trang bị đổi',
        'Vì Mã trang là "dấu vân tay" của trang: nội dung đã khác mà mã vẫn là 43 nên không còn khớp',
        'Vì màu mực của trang đã đổi',
        'Không thể phát hiện, vì nội dung nào cũng hợp lệ',
      ],
      correct: 1,
      explanation:
        'Mã trang được tính từ nội dung, nên nội dung đổi thì mã đúng cũng phải đổi. Trang vẫn ghi mã cũ nên em thấy ngay chỗ lệch. Số thứ tự và màu mực không dùng để kiểm tra trang. (Kiểm bằng công thức của thẻ 3: với mã trước 10, nội dung 24 phải ra mã 44, không phải 43.)',
    },
    {
      kind: 'number',
      question: 'Mã trang trước là 43, nội dung của trang mới là 58. Mã trang mới là bao nhiêu?',
      answer: 44,
      explanation:
        '43 × 2 + 58 = 144, rồi chỉ giữ 2 chữ số cuối nên mã trang là 44. Nếu em ra 144 là em quên bước "mod 100"; nếu em ra 101 là em đã cộng 43 + 58 thay vì nhân đôi mã trước.',
    },
    {
      kind: 'abcd',
      question:
        '{phanDien} sửa nội dung trang 2 của một chuỗi 6 trang rồi tính lại mã trang 2 cho khớp. Em chưa biết mã nào phía sau sẽ đổi. Để chắc chắn chuỗi còn khớp công thức, em cần làm gì?',
      options: [
        'Không cần làm gì thêm, vì trang 2 đã khớp',
        'Chỉ kiểm tra lại trang 1',
        'Kiểm tra lần lượt từ trang 3: mỗi trang tính lại từ mã mới của trang trước, cho tới khi hết chuỗi hoặc gặp trang tính ra đúng mã đang ghi',
        'Chỉ tính lại trang 3, rồi dừng dù mã trang 3 đã đổi',
      ],
      correct: 2,
      explanation:
        'Trang 3 dùng mã của trang 2 để tính mã của mình, mà mã trang 2 đã đổi, nên phải tính lại trang 3; nếu mã trang 3 đổi thì trang 4 cũng phải tính lại, và cứ thế. Có thể dừng sớm khi một trang tính ra đúng mã đang ghi (như trang 4 trong ví dụ), vì từ đó các trang sau nhận lại mã cũ; nhưng không thể biết trước điều đó mà không tính. Trang 1 đứng trước trang 2 nên không bị ảnh hưởng. Vậy việc sửa lén kéo theo cả dãy việc phải làm, càng nhiều trang càng khó làm kịp. Không nên nghĩ "mọi mã phía sau chắc chắn đổi": phép "giữ 2 chữ số cuối" có thể làm một mã trùng lại.',
    },
  ],
  'lang-det': [
    {
      kind: 'abcd',
      question: 'Mạng Sổ Chung có 4 node: em, {cuBinh}, {coChi} và {phanDien}. Một trang mới vừa được duyệt và ghi vào sổ chung. Lúc này sổ của các node thế nào?',
      options: [
        'Chỉ sổ của node tạo ra trang mới có trang đó',
        'Mỗi node chỉ giữ một phần trang, ghép lại mới thành trang đầy đủ',
        'Một node chính giữ bản đầy đủ, các node còn lại chỉ xem',
        'Cả 4 node đều có trang mới và 4 bản sổ giống hệt nhau',
      ],
      correct: 3,
      explanation:
        'Trong mạng của bài, trang đã được ghi thì ghi vào sổ của tất cả mọi người, nên mỗi node đều có bản đầy đủ và các bản giống nhau. Không có "node chính" và không chia nhỏ sổ: nhờ vậy, mất một bản sổ thì vẫn còn các bản khác. (Một số hệ thống thật có thêm cách chia dữ liệu hay vai trò khác nhau, nhưng không phải mô hình của bài này.)',
    },
    {
      kind: 'abcd',
      question: 'Trang cuối trong sổ của em có mã 40. {cuBinh} gửi trang mới ghi: mã trước 62, nội dung 15, mã trang 39. Em nên bỏ phiếu thế nào?',
      options: [
        'Từ chối: mã trước 62 không khớp trang cuối trong sổ của em (mã 40), dù phép tính trong trang đó đúng',
        'Đồng ý, vì (62 × 2 + 15) mod 100 = 39 đúng bằng mã trang',
        'Đồng ý, vì nội dung 15 là một số nhỏ',
        'Từ chối, vì 62 × 2 + 15 = 139 không bằng 39',
      ],
      correct: 0,
      explanation:
        'Phải kiểm cả 2 điều. Phép tính trong trang đúng ((62 × 2 + 15) = 139, giữ 2 chữ số cuối là 39), nhưng mã trước 62 không phải mã trang cuối trong sổ của em (40), nghĩa là trang này nối vào một sổ khác với sổ của em, nên em Từ chối. Chọn D là quên "mod 100": 139 và 39 có cùng 2 chữ số cuối.',
    },
    {
      kind: 'abcd',
      question: '{phanDien} tạo một trang mới. Ba node còn lại bỏ phiếu: 1 Đồng ý, 2 Từ chối. Kết quả là gì?',
      options: [
        'Được ghi, vì cộng cả người tạo đã có 2 trong 4 node đồng ý',
        'Được ghi, nhưng chỉ vào sổ của node đã Đồng ý',
        'Không được ghi, vì chưa đủ đa số (cần ít nhất 2 phiếu Đồng ý trong 3 phiếu)',
        'Phải bỏ phiếu lại cho tới khi cả ba node đồng ý',
      ],
      correct: 2,
      explanation:
        'Đa số nghĩa là hơn một nửa. Với 4 node, người tạo cộng 1 phiếu Đồng ý mới có 2 node, chỉ bằng một nửa, chưa phải đa số. Trang chỉ được ghi khi có ít nhất 2 phiếu Đồng ý trong 3 phiếu, và khi được ghi thì ghi vào sổ của tất cả mọi người, không riêng node nào. Đây là cách các node trong bài đồng thuận; mạng blockchain thật có nhiều node hơn và nhiều cách đồng thuận khác nhau.',
    },
    {
      kind: 'abcd',
      question: 'Trong mạng 4 node, {phanDien} sửa lén bản sổ của riêng mình, ba node còn lại không bị sửa. Khi đem bản sổ đã sửa so với sổ của các node khác, điều gì xảy ra?',
      options: [
        'Cả mạng đổi theo bản đã sửa, vì node nào đưa ra trước thì thắng',
        'Bản đã sửa khác với 3 bản còn lại nên bị phát hiện và không được ghi vào sổ chung',
        'Không ai phát hiện nếu {phanDien} đã tính lại mã trang cho khớp hết',
        'Chỉ phát hiện được nếu node bị sửa là node vừa tạo trang',
      ],
      correct: 1,
      explanation:
        'Dù {phanDien} đã tính lại mã cho bản của mình khớp từng trang, bản đó vẫn khác bản của 3 node còn lại, mà đa số mới quyết định sổ chung. Muốn thắng, {phanDien} phải sửa sổ của phần lớn các node cùng lúc. Ở blockchain thật, "đa số" có thể được tính theo cách khác (ví dụ theo sức mạnh tính toán hay số tiền đặt cọc), nhưng ý tưởng giống nhau: một node đơn lẻ không thể áp đặt sổ.',
    },
  ],
  'lang-khac-dau': [
    {
      kind: 'abcd',
      question:
        'Em ký "Chuyển 3 xu cho An". {phanDien} đổi nội dung thành "Chuyển 300 xu cho An" và giữ nguyên chữ ký của em. Khi người khác kiểm chữ ký bằng khóa công khai của em, điều gì xảy ra?',
      options: [
        'Chữ ký không còn khớp với nội dung mới, nên giao dịch bị từ chối',
        'Chữ ký vẫn khớp, vì đó là chữ ký của em',
        'Chữ ký vẫn khớp nếu {phanDien} biết khóa công khai của em',
        'Chữ ký vẫn khớp nếu số tiền mới lớn hơn số tiền cũ',
      ],
      correct: 0,
      explanation:
        'Chữ ký số được tính từ cả khóa riêng của em và chính nội dung giao dịch, nên nội dung đổi thì chữ ký cũ không còn đúng; {phanDien} không thể dán chữ ký cũ vào nội dung khác. Biết khóa công khai không giúp được, vì khóa công khai chỉ dùng để kiểm, không để ký. Số tiền lớn hay nhỏ không liên quan. (Mô hình thu nhỏ của bài dùng số rất nhỏ nên về nguyên tắc có thể trùng ngẫu nhiên; với hai câu này thì không khóa k nào trùng. Chữ ký thật dùng hàm băm 256-bit nên không đáng kể.)',
    },
    {
      kind: 'number',
      question: 'Bạn An có khóa riêng x = 15. Khóa công khai của An là 5^15 mod 23. Khóa công khai của An là số nào?',
      answer: 19,
      explanation:
        'Tính xuôi bằng cách nhân dần và lấy phần dư khi chia cho 23: 5^15 mod 23 = 19. Ngược lại, nếu chỉ biết 19 và thử tuần tự x = 1, 2, 3, … thì tới x = 15 mới ra 19, tức là 15 lần thử. Đây chỉ là cách thử đơn giản nhất, không phải cách duy nhất để tìm ngược; với p = 23 rất nhỏ thì làm được, còn với số rất lớn thì số lần thử quá nhiều và chưa biết cách nào đủ nhanh. (Bài này dùng số nhỏ để em tự tính; Bitcoin không dùng đúng phép tính này.)',
    },
    {
      kind: 'abcd',
      question: 'Ở trạm Khó, em thử đoán khóa riêng với số nhỏ và tìm được. Vì sao thử lần lượt từng khóa không thực tế với khóa riêng 256-bit của Bitcoin?',
      options: [
        'Vì Bitcoin chỉ cho mỗi người thử đoán 3 lần',
        'Vì số khóa khả dĩ quá lớn: với tốc độ giả định 10^18 khóa mỗi giây, thời gian giả định để duyệt hết cỡ 3,7 × 10^51 năm',
        'Vì khóa riêng được đổi mới mỗi giây',
        'Vì khóa công khai che giấu hoàn toàn khóa riêng nên không cần thử',
      ],
      correct: 1,
      explanation:
        'Khóa riêng được chọn trong gần 2^256 khả năng, xấp xỉ 1,16 × 10^77. Chia cho 10^18 lần thử mỗi giây ra cỡ 10^59 giây, tức khoảng 3,7 × 10^51 năm. Đây chỉ là thời gian giả định để duyệt hết không gian khóa ở tốc độ giả định, không phải mô tả mọi cách tấn công; an toàn của Bitcoin còn dựa trên thiết kế mật mã và việc giữ khóa riêng kín. Bitcoin không giới hạn số lần thử và khóa riêng không tự đổi. Đáp án D sai: khóa công khai không "che hoàn toàn" khóa riêng, nó chỉ khiến việc suy ngược quá tốn kém.',
    },
    {
      kind: 'abcd',
      question:
        'Hoa dùng ví tự quản (chính Hoa giữ khóa riêng). Hoa mất mọi bản sao khóa riêng và cụm từ khôi phục, không còn cơ chế khôi phục nào khác, nhưng vẫn nhớ địa chỉ ví. Điều nào đúng?',
      options: [
        'Hoa gọi tổng đài của Bitcoin để được đặt lại khóa riêng',
        'Hoa dùng một công thức để tính ngược khóa riêng từ địa chỉ ví',
        'Không ai, kể cả mạng blockchain, khôi phục được khóa riêng thay Hoa; Hoa không còn ký được giao dịch từ ví đó',
        'Hoa chờ các node cấp lại khóa riêng mới cho cùng một ví',
      ],
      correct: 2,
      explanation:
        'Câu hỏi giả định ví tự quản, mất mọi bản sao khóa/cụm khôi phục và không còn cơ chế khôi phục. Khi đó mạng blockchain không giữ khóa riêng của ai và không có "người quản lý" để đặt lại; các node chỉ kiểm chữ ký chứ không cấp khóa. Không có cách thực tế để tính ngược khóa riêng từ địa chỉ hay khóa công khai. Nếu Hoa còn một bản sao lưu hay cụm từ khôi phục, hoặc ví do một dịch vụ giữ hộ có cách xác minh riêng, thì tình huống khác. Vì vậy khóa riêng cần được sao lưu cẩn thận và không gửi lên mạng.',
    },
  ],
  'lang-bac': [
    {
      kind: 'abcd',
      question:
        'Hai node đã tính gốc Merkle của cùng một trang gồm 1.000 giao dịch, theo cùng quy tắc ghép và cùng thứ tự giao dịch. Để biết nhanh hai bản có khác nhau không, họ nên làm gì?',
      options: ['Đọc và so từng giao dịch một, đủ 1.000 lần', 'Chỉ so giao dịch đầu tiên của hai bản', 'So hai gốc đã tính, mỗi bên chỉ là một con số', 'So tên người đã ghi trang'],
      correct: 2,
      explanation:
        'Gốc Merkle tóm tắt cả trang, nên chỉ cần so hai con số (sau khi mỗi bên đã tính xong gốc, theo cùng quy tắc và thứ tự). Nếu hai gốc khác nhau thì chắc chắn hai bản không giống nhau. Nếu hai gốc giống nhau thì với cây Merkle thật (dùng hàm băm) coi như hai bản giống hệt, vì khả năng hai bản khác nhau mà cùng gốc cực nhỏ. Công thức ghép số của bài chỉ để học cách hình thành cây, không phải hàm băm thật nên có thể trùng: lá (1, 20) và lá (2, 10) đều ghép ra 30. So giao dịch đầu tiên (B) không đủ vì giao dịch khác vẫn có thể bị sửa.',
    },
    {
      kind: 'number',
      question: 'Cây có 4 giao dịch lần lượt là 2, 5, 3, 8 (từ trái sang phải), ghép theo T_ab = T_a × 10 + T_b. Gốc của cây là số nào?',
      answer: 288,
      explanation:
        'Ghép cặp từ trái sang phải: 2 và 5 thành 2 × 10 + 5 = 25; 3 và 8 thành 3 × 10 + 8 = 38. Rồi ghép hai giá trị đó theo đúng thứ tự: 25 × 10 + 38 = 288. Nếu em ra số khác, hãy kiểm lại thứ tự ghép: đổi vị trí hai giá trị trong một cặp thì kết quả khác (ví dụ 5 và 2 cho 52, không phải 25).',
    },
    {
      kind: 'abcd',
      question: 'Một cây Merkle có 16 giao dịch (16 lá). Cần bao nhiêu phép ghép cặp để có gốc?',
      options: ['15', '16', '8', '31'],
      correct: 0,
      explanation:
        'Tầng đầu ghép 16 lá thành 8 giá trị (8 phép), rồi 8 thành 4 (4 phép), 4 thành 2 (2 phép), 2 thành 1 (1 phép): 8 + 4 + 2 + 1 = 15. Như giải đấu 16 đội cần 15 trận. 31 là tổng số nút (16 lá và 15 nút ghép), còn câu hỏi chỉ hỏi số phép ghép. Bài này dùng số lá là lũy thừa của 2 cho đơn giản.',
    },
    {
      kind: 'abcd',
      question:
        'Hai node đã tính gốc Merkle của cùng một trang theo cùng quy tắc ghép và cùng thứ tự giao dịch: gốc của node thứ nhất là 422, gốc của node thứ hai là 462. Em kết luận gì?',
      options: [
        'Chắc chắn giao dịch đầu tiên đã bị sửa',
        'Node có gốc lớn hơn (462) giữ bản đúng',
        'Hai bản giống nhau, chỉ khác cách ghi',
        'Hai bản có ít nhất một giao dịch khác nhau, nhưng chưa biết là giao dịch nào',
      ],
      correct: 3,
      explanation:
        'Hai gốc tính cùng quy tắc, cùng thứ tự mà khác nhau cho biết chắc chắn hai bản không giống nhau, nhưng không cho biết giao dịch nào bị sửa và cũng không cho biết bản nào đúng (gốc lớn hơn không có nghĩa là đúng). Muốn tìm ra chỗ sửa thì đi xuống từ gốc theo các nhánh khác nhau, như em làm ở trạm Trung bình và ở màn "Leo cây tìm lá giả". Ngược lại, hai gốc giống nhau chưa phải chứng minh tuyệt đối hai bản giống hệt: với hàm băm thật xác suất trùng cực nhỏ nên được coi là giống, còn công thức ghép số của bài thì có thể trùng (ví dụ lá 1, 20 và lá 2, 10 đều cho 30).',
    },
  ],
};

/** Chữ của hộp thẻ có câu hỏi (P6b). Mọi câu đi qua fmt() khi hiện. */
export const knowQuizUi = {
  /** Chữ cái đứng trước bốn phương án, đúng thứ tự A, B, C, D */
  chuCai: ['A', 'B', 'C', 'D'],
  cauHoi: 'Câu hỏi',
  /** Nhãn đọc màn hình của nhóm phương án */
  chonDapAn: 'Chọn một đáp án',
  nhapSo: 'Em nhập một số (chỉ chữ số)',
  kiemTra: 'Kiểm tra',
  /** Nhắc khi chưa chọn, để trống hay gõ sai: KHÔNG tính là lần trả lời */
  nhacChuaChon: 'Em hãy chọn một đáp án trước khi kiểm tra.',
  nhacTrong: 'Em hãy nhập một số trước khi kiểm tra.',
  nhacDinhDang: 'Em chỉ nhập chữ số, viết liền và không bắt đầu bằng số 0 (ví dụ: 44).',
  dung: 'Đúng rồi!',
  sai: 'Chưa đúng.',
  /** Dòng nói rõ vẫn nhận thẻ (cả khi trả lời đúng lẫn sai), hiện cùng giải thích */
  vanNhanThe: 'Em đọc giải thích rồi cất thẻ vào sổ nhé. Dù đúng hay sai, em đều nhận được thẻ này.',
  emChon: 'Em đã chọn: {dapAn}',
  emNhap: 'Em đã nhập: {so}',
  dapAnDung: 'Đáp án đúng: {dapAn}',
  giaiThich: 'Giải thích',
  /** Nhãn cạnh phương án sau khi nộp (không chỉ dùng màu) */
  nhanDapAnDung: 'Đáp án đúng',
  nhanEmChon: 'Em đã chọn',
  /** Thẻ đã nhặt, xem lại: không bắt trả lời lại */
  xemLai: 'Thẻ đã nhặt. Em xem lại câu hỏi, đáp án và giải thích; không cần trả lời lại.',
  /** Nhãn đọc màn hình của hộp: {so} là số thứ tự thẻ */
  hopThe: 'Em có biết? Thẻ {so}',
} as const;

/**
 * Nút "?" trong lúc chơi (bước HD, spec 03 mục 3.8 và mục 6): hộp nhỏ "Việc của em lúc này: …" kèm "Xem hướng dẫn đầy đủ" và "Chơi tiếp". Mỗi game có hàm thuần `hintFor(state)` riêng chọn câu nhắc
 * theo trạng thái. LUẬT: câu nhắc KHÔNG được lộ đáp án (không nói thẻ nào, tay nắm nào, làn nào, câu nào đúng; chỉ nhắc luật và việc cần làm). Mọi câu qua fmt() ({phanDien}).
 * Số trong câu chỉ là số của luật (5^x mod 23, 20 giây), không bao giờ là số của đáp án; test `*Hint.test.ts` của từng game kiểm bằng 200 trạng thái ngẫu nhiên.
 */
export const gameHints = {
  /** Nút "?" (nhãn đọc màn hình kèm phím tắt) */
  nut: 'Gợi ý (phím H)',
  kyHieu: '?',
  tieuDe: 'Gợi ý',
  /** Dòng đầu hộp: {nd} là câu nhắc của game */
  viecCuaEm: 'Việc của em lúc này: {nd}',
  /** Hai nút của hộp */
  xemDayDu: 'Xem hướng dẫn đầy đủ',
  tiepTuc: 'Chơi tiếp',
  /** Game chưa đăng ký hàm nhắc */
  macDinh: 'Cứ chơi tiếp và làm theo luật ở thẻ bắt đầu nhé.',

  /** Màn 2 "Đuổi theo {phanDien}" (theo `RunnerState.phase`, tim, vật hỗ trợ) */
  man2: {
    dauVan: 'Nhân vật tự chạy. Em đổi làn, nhảy hoặc trượt (máy tính: phím mũi tên hoặc A D W S, điện thoại: vuốt). Nhặt trang sổ và tiền đồng trên đường.',
    chay: 'Né chướng ngại bằng cách đổi làn, nhảy qua vật thấp, trượt qua vật cao. Nhặt trang sổ và tiền đồng trên đường.',
    motTim: 'Em chỉ còn một tim. Né thật cẩn thận: đổi làn, nhảy qua vật thấp, trượt qua vật cao. Mỗi lần va chạm mất một tim.',
    hoTro: 'Em đang có đồ hỗ trợ (nón lá, guốc mộc hoặc túi tiền). Cứ chạy và nhặt thật nhiều trang sổ, tiền đồng.',
    chamLai: 'Hết vòng rồi, nhân vật đang chạy chậm lại. Sắp có câu hỏi, em chuẩn bị nhé.',
    hoi: 'Đọc kỹ câu hỏi rồi chọn đáp án. Trả lời đúng em được thêm trang, sai hoặc hết giờ thì mất một tim.',
    daTraLoi: 'Em đã trả lời rồi. Đọc lời giải thích, rồi chạy tiếp.',
    chayLai: 'Chạy tiếp thôi! Nhân vật đang tăng tốc trở lại.',
    het: 'Ván này đã kết thúc.',
  },

  /** Màn 3 "Ghép lại cuốn sổ" (theo `RebuildState.phase`, vòng, chuỗi, ô trống) */
  man3: {
    nhetTrang: '{phanDien} đang lén nhét một trang vào xấp giấy. Em xem kỹ các thẻ rồi ghép tiếp nhé.',
    batDau: 'Chọn thẻ có mã trang trước bằng mã G của trang bìa, rồi đặt vào ô đầu tiên của chuỗi.',
    ghep: 'Tìm thẻ có mã trang trước bằng mã trang của thẻ cuối chuỗi. Nghi mã trang sai thì bấm "Soi công thức".',
    coTrangGia: 'Trong xấp giấy có một trang giả: mã trang trước khớp nhưng mã trang sai công thức. Soi công thức rồi kéo nó vào rổ.',
    giuSoChuaChay: 'Vòng giữ sổ: bấm "Bắt đầu giữ sổ" khi em sẵn sàng thì đồng hồ mới chạy.',
    oTrong: 'Chuỗi có ô trống: đặt đúng trang thật vào đó. Soi công thức nếu chưa chắc.',
    giuSo: '{phanDien} đang tráo trang trong chuỗi. Soi công thức, kéo trang giả vào rổ rồi đặt trang thật vào chỗ trống.',
    xongVong: 'Vòng này xong rồi. Bấm nút để sang vòng kế tiếp.',
    het: 'Ván này đã kết thúc.',
  },

  /** Màn 8 "Lật thẻ tìm cặp khóa" (theo `MemoryState.phase`, số thẻ đang lật và loại thẻ) */
  man8: {
    chuaLat: 'Lật 2 thẻ. Tìm cặp Khuôn tập x và Mẫu công khai 5^x mod 23.',
    catKhuon: 'Em đang cầm Khuôn tập. Tìm thẻ Mẫu công khai bằng 5^x mod 23 — bấm Máy tính mod nếu cần.',
    catMau: 'Tìm thẻ Khuôn tập x có 5^x mod 23 bằng số này.',
    luatSai: 'Hai thẻ vừa lật chưa ghép được và sắp úp lại. Em nhớ vị trí của chúng rồi lật cặp khác.',
    xongVong: 'Vòng này xong rồi. Bấm nút để sang vòng kế tiếp.',
    het: 'Ván này đã kết thúc.',
    /** Thêm vào cuối câu nhắc ở vòng 3 */
    vong3: '{phanDien} tráo 2 thẻ đang úp mỗi 20 giây.',
  },

  /** Màn 12 "Leo cây tìm lá giả" (theo `ClimbState`: tầng, tim, giờ lên tầng) */
  man12: {
    soSanh: 'So Sổ và Nay trên 2 đèn lồng phía trên, chọn cái có hai số khác nhau.',
    canGio: 'Chờ đèn lồng đó tới ngay trên đầu rồi chạm (máy tính: Space).',
    motTim: 'Em chỉ còn một tim. Soi kỹ Sổ và Nay: nắm nhầm đèn lồng có hai số giống nhau là mất tim.',
    tangLa: 'Đây là tầng lá: nắm chiếc lá bị tráo để bắt {phanDien}!',
    xongVong: 'Em bắt được rồi! Bấm nút để sang vòng kế tiếp.',
    het: 'Ván này đã kết thúc.',
  },
} as const;

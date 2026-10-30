/**
 * Nội dung hiển thị cho hệ thống Hướng dẫn focus và Làm thử (P8).
 * Xưng "em" với học sinh, có placeholder tên nhân vật khi cần.
 */
export const tutorialTexts = {
  chung: {
    tieuDe: 'Hướng dẫn làm thử',
    boQua: 'Bỏ qua hướng dẫn',
    tiep: 'Tiếp tục',
    daHieu: 'Đã hiểu',
    thuTinhNgay: 'Thử tính ngay',
    batDauChoi: 'Bắt đầu chơi thật',
    thuLai: 'Thử lại',
    quayLai: 'Quay lại',
    huongDan: 'Hướng dẫn',
    dong: 'Đóng',
    lamThu: 'Làm thử',
    troLaiBaiLam: 'Quay lại bài làm',
    buoc: 'Bước {current} / {total}',
  },

  man1De: {
    tieuDe: 'Làm thử: Tính mã một trang',
    intro: 'Trước khi bắt đầu, hãy cùng làm thử một trang để nắm cách tính mã trang nhé!',
    numbers: 'Mã trang được tính từ hai số: mã của trang trước ({truoc}) và nội dung của trang này ({nd}).',
    formula: 'Công thức: lấy mã trước nhân 2, cộng nội dung trang này, rồi lấy 2 số cuối. Ví dụ: ({truoc} × 2 + {nd}) = {tong}.',
    input: 'Em hãy tính nhẩm và nhập kết quả vào ô mã trang nhé!',
    inputPlaceholder: '0-99',
    check: 'Bấm nút "Kiểm tra" (hoặc nhấn phím Enter) để xem kết quả.',
    correct: 'Chính xác! Mã trang là {ma}. Trang này đã được gắn chặt vào chuỗi!',
    wrong: 'Chưa đúng rồi: {truoc} × 2 = {gapDoi}, cộng {nd} thành {tong}. Em hãy thử lại nhé!',
    nhapSaiKhoang: 'Mã trang là số từ 0 đến 99',
  },
};

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
    chuaNhap: 'Em chưa nhập mã trang. Hãy tính nhẩm và nhập số từ 0 đến 99 vào ô mã trang nhé!',
  },

  man1Tb: {
    tieuDe: 'Làm thử: Phát hiện sửa trộm',
    intro: '{phanDien} vừa lẻn vào sửa lén nội dung một trang sổ! Khi nội dung đổi, mã trang cũ không còn khớp, mắt xích bị đứt.',
    inspect: 'Trang {n} bị đổi số từ {cu} thành {moi}. Mã trang cũ ({maCu}) không khớp, khiến toàn bộ chuỗi phía sau bị lệch màu đỏ!',
    formula: 'Để nối lại mắt xích, em phải tính lại mã trang: ({truoc} × 2 + {nd}) = {tong}. Lấy 2 số cuối nhé!',
    input: 'Em hãy tính nhẩm và nhập mã trang mới để nối lại chuỗi nhé!',
    inputPlaceholder: '0-99',
    check: 'Bấm nút "Cập nhật mã" (hoặc nhấn phím Enter) để xem kết quả.',
    correct: 'Chính xác! Mã mới là {ma}. Trang {n} đã khớp lại! (Sau đó, các trang kế tiếp cũng cần cập nhật theo hiệu ứng domino đấy).',
    wrong: 'Chưa đúng rồi: ({truoc} × 2 + {nd}) = {tong}, 2 số cuối là {ma}. Em hãy thử lại nhé!',
    nhapSaiKhoang: 'Mã trang là số từ 0 đến 99',
    chuaNhap: 'Em chưa nhập mã trang. Hãy tính nhẩm và nhập số từ 0 đến 99 vào ô mã trang nhé!',
  },

  man1Kho: {
    tieuDe: 'Làm thử: Đua với mạng lưới',
    intro: 'Ở trạm Khó, em phải chạy đua với thời gian: mạng liên tục thêm trang mới vào cuối chuỗi, làm số trang cần sửa tăng lên!',
    spotError: 'Luôn tìm trang sai đầu tiên (ô có khung nhập số). Mã trang này không khớp với mã trang trước và nội dung.',
    formula: 'Tính nhanh mã đúng bằng công thức gợi ý: ({truoc} × 2 + {nd}) = {tong}. Lấy 2 số cuối nhé!',
    input: 'Em hãy tính và nhập mã đúng vào ô để giảm số trang bị lệch nhé!',
    inputPlaceholder: '0-99',
    check: 'Bấm nút "Cập nhật mã" (hoặc nhấn phím Enter) để cập nhật.',
    correct: 'Chính xác! Mã trang là {ma}. Một trang đã được sửa đúng, số trang cần sửa đã giảm đi 1!',
    wrong: 'Chưa đúng rồi: ({truoc} × 2 + {nd}) = {tong}, 2 số cuối là {ma}. Em hãy thử lại nhé!',
    nhapSaiKhoang: 'Mã trang là số từ 0 đến 99',
    chuaNhap: 'Em chưa nhập mã trang. Hãy tính nhẩm và nhập số từ 0 đến 99 vào ô mã trang nhé!',
  },
};

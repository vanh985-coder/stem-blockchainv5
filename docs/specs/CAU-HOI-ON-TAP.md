# NGÂN HÀNG CÂU HỎI ÔN TẬP

AI code chép toàn bộ vào `packages/core/src/content/questions.ts`.

- **Đáp án đúng** là đáp án ghi **in đậm**. Khi hiện trong game, thứ tự đáp án được trộn ngẫu nhiên.
- **Các câu có phép tính** đã được kiểm tra lại bằng code.

**Câu nào dùng ở đâu:**

| Nơi dùng | Lấy câu | Số câu mỗi ván |
|---|---|---|
| Màn 2 (đuổi Tí) | B1 | 4 |
| Màn 5 (đập Tí) | B1 và B2 | 10 |
| Màn 6 (diều đưa sổ) | B1 và B2 | 4 |
| Thử thách cuối (hội làng) | Danh sách cố định ở cuối file | 6 |

## Bài 1 — Khối & chuỗi

| ID | Câu hỏi | Đáp án | Giải thích |
|---|---|---|---|
| B1-01 | Mã trang trước là 40, nội dung trang mới là 25. Mã trang mới là bao nhiêu? | **5** / 105 / 65 / 50 | 40 × 2 + 25 = 105, giữ 2 chữ số cuối là 05. |
| B1-02 | Trang bìa có mã 10, trang 1 có nội dung 23. Mã trang 1 là bao nhiêu? | **43** / 33 / 230 / 46 | 10 × 2 + 23 = 43. |
| B1-03 | Mã trang trước là 57, nội dung là 36. Mã trang mới là bao nhiêu? | **50** / 150 / 93 / 15 | 57 × 2 + 36 = 150, giữ 2 chữ số cuối là 50. |
| B1-04 | Trong công thức mã trang, "mod 100" nghĩa là gì? | **Chỉ giữ 2 chữ số cuối** / Nhân thêm 100 / Chia cho 100 / Cộng thêm 100 | Ví dụ 131 mod 100 = 31. |
| B1-05 | Tí sửa nội dung trang 2 trong cuốn sổ 5 trang. Những trang nào phải tính lại mã? | **Trang 2 và mọi trang phía sau** / Chỉ trang 2 / Chỉ trang 5 / Không trang nào | Mã trang sau tính từ mã trang trước, nên lệch dây chuyền. |
| B1-06 | Vì sao một người không sửa lén kịp khi làng vẫn ghi trang mới liên tục? | **Vì sửa một trang phải tính lại mọi trang sau, mà trang mới cứ được thêm vào** / Vì giấy dó khó viết / Vì mã trang luôn bằng 0 / Vì sổ bị khóa | Việc phải sửa tăng nhanh hơn tốc độ sửa. |
| B1-07 | Trang bìa có mã 20, trang 1 có nội dung 15. Mã trang 1 là bao nhiêu? | **55** / 35 / 215 / 45 | 20 × 2 + 15 = 55. |
| B1-08 | Mã trang 1 là 55, trang 2 có nội dung 50. Mã trang 2 là bao nhiêu? | **60** / 160 / 105 / 65 | 55 × 2 + 50 = 160, giữ 2 chữ số cuối là 60. |

## Bài 2 — Node

| ID | Câu hỏi | Đáp án | Giải thích |
|---|---|---|---|
| B2-01 | Node trong blockchain giống ai trong làng? | **Người giữ một bản sao đầy đủ của cuốn sổ** / Người bán vải / Chính cuốn sổ / Trưởng làng duy nhất được ghi sổ | Mỗi node giữ một bản sổ giống hệt nhau. |
| B2-02 | Khi nhận một trang mới, node làm gì? | **So với sổ của mình và tính lại mã** / Tin ngay vì người gửi quen / Hỏi trưởng làng / Xóa trang cũ đi | Node không tin ngay, mà tự kiểm tra lại. |
| B2-03 | Trang cuối sổ của em có mã 57. Trang mới ghi: mã trang trước 57, nội dung 36, mã trang 51. Em chọn gì? | **Từ chối** / Đồng ý | 57 × 2 + 36 = 150, tức mã đúng là 50 chứ không phải 51. |
| B2-04 | Trang cuối sổ của em có mã 25. Trang mới ghi: mã trang trước 25, nội dung 30, mã trang 80. Em chọn gì? | **Đồng ý** / Từ chối | 25 × 2 + 30 = 80, khớp. |
| B2-05 | Trang mới ghi "mã trang trước 62", nhưng trang cuối sổ của em có mã 57. Vì sao phải từ chối? | **Vì sổ của người gửi đã bị sửa, không khớp sổ của em** / Vì 62 lớn hơn 57 / Vì nội dung quá dài / Không cần từ chối | Mã trang trước phải trùng mã trang cuối trong sổ của em. |
| B2-06 | Khi nào trang mới được ghi vào sổ của cả làng? | **Khi đa số người giữ sổ đồng ý** / Khi người gửi muốn / Khi Tí đồng ý / Ngay khi có người gửi | Đây là cơ chế đồng thuận. |
| B2-07 | Ở trạm đặt cọc, ghi trang gian mà bị phát hiện thì sao? | **Mất tiền cọc** / Được thưởng gấp đôi / Không sao cả / Được ghi lại lần nữa | Gian lận bị phạt bằng cọc. |
| B2-08 | Vì sao gian lận thường lỗ hơn làm thật? | **Vì bị phát hiện thì mất cọc, nhiều hơn tiền thưởng khi làm thật** / Vì gian lận bị cấm nói ra / Vì làm thật được miễn cọc / Vì sổ tự sửa lỗi | Làm thật được thưởng; gian lận thì dễ mất cọc. |

## Bài 3 — Khóa (dùng cho thử thách cuối)

| ID | Câu hỏi | Đáp án | Giải thích |
|---|---|---|---|
| B3-01 | Khóa nào phải giữ bí mật? | **Khóa riêng (khuôn dấu riêng)** / Khóa công khai / Cả hai / Không khóa nào | Khóa công khai ai xem cũng được. |
| B3-02 | Với công thức 5^x mod 23, khuôn riêng 3 cho ra mẫu công khai nào? | **10** / 15 / 8 / 125 | 5³ = 125, chia 23 dư 10. |
| B3-03 | Một lá thư ghi "Từ cụ Bình", nhưng con dấu chỉ khớp mẫu công khai của Tí. Ai đã đóng dấu thư này? | **Tí** / Cụ Bình / Không biết được | Con dấu cho biết ai thật sự đã đóng. |
| B3-04 | Kiểm tra thư bằng mẫu công khai nào mới đúng? | **Mẫu trên bảng chính thức của làng** / Mẫu do chính người gửi đính kèm / Mẫu nào cũng được | Kẻ mạo danh có thể đính kèm mẫu của chính nó. |
| B3-05 | Từ mẫu công khai đoán ngược ra khuôn riêng, với số thật rất lớn, thì sao? | **Gần như không thể, lâu hơn cả tuổi vũ trụ** / Mất vài phút / Chỉ cần máy tính mạnh / Dễ như tính xuôi | Tính xuôi thì dễ, tính ngược thì cực khó. |
| B3-06 | Lỡ làm mất khuôn riêng thì ai lấy lại giúp được? | **Không ai cả** / Trưởng làng / Người làm ra sổ / Các làng khác | Mất khuôn riêng là mất hết. |

## Bài 4 — Cây Merkle (dùng cho thử thách cuối)

| ID | Câu hỏi | Đáp án | Giải thích |
|---|---|---|---|
| B4-01 | Với T_ab = T_a × 10 + T_b, biết T1 = 4 và T2 = 6. T12 bằng bao nhiêu? | **46** / 64 / 10 / 24 | 4 × 10 + 6 = 46. |
| B4-02 | Biết T1 = 3 và T2 = 7. T21 bằng bao nhiêu? | **73** / 37 / 10 / 21 | T21 = T2 × 10 + T1. Thứ tự quan trọng. |
| B4-03 | Tí đổi 1 giao dịch trong cây. Số gốc thay đổi thế nào? | **Số gốc đổi theo** / Không đổi / Chỉ đổi nếu là giao dịch đầu tiên / Về 0 | Thay đổi lan lên tới gốc. |
| B4-04 | Tí đổi 1 giao dịch trong một khối có 8 giao dịch. Node phát hiện nhanh nhất bằng cách nào? | **So số gốc** / So từng giao dịch một / Hỏi Tí / Đếm số giao dịch | Chỉ cần so một con số. |
| B4-05 | Biết T12 = 37 và T34 = 52. T1234 bằng bao nhiêu? | **422** / 89 / 3752 / 5237 | 37 × 10 + 52 = 422. |
| B4-06 | Cây có 64 lá. Lần theo nhánh lệch từ gốc thì phải đi qua bao nhiêu tầng để tới lá bị sửa? | **6** / 64 / 32 / 8 | 64 = 2^6, mỗi tầng chia đôi số lá. |

## Thử thách cuối (6 câu cố định, theo thứ tự)

B1-01, B2-02, B3-01, B4-01, B4-04, B3-03

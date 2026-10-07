# PROMPT 5/7 — BÀI 4: CÂY MERKLE

Tiếp tục dự án Sổ Chung.

- Chỉ xây Bài 4 trong `src/lessons/lesson4/`.
- Thêm test vào self-test.
- Khi xong, liệt kê những gì đã làm và những điểm còn chưa chắc chắn.

## Mục tiêu học tập

Học sinh hiểu cây Merkle là gì, cách xây một cây Merkle, và vì sao chỉ cần gốc là phát hiện được mọi sửa đổi.

## Công thức & logic.ts

**Công thức ghép hai giao dịch:** `T_ab = T_a × 10 + T_b`. Thứ tự quan trọng: T_12 khác T_21.

```ts
combine(a: number, b: number): number             // a * 10 + b
buildTree(leaves: number[]): number[][]           // các tầng, từ lá lên gốc; số lá là lũy thừa của 2
```

**Test case:**

| Lời gọi | Kết quả mong đợi |
|---|---|
| `combine(3, 7)` | `37` |
| `combine(7, 3)` | `73` |
| `buildTree([3, 7, 5, 2])` | `[[3,7,5,2], [37,52], [422]]` |
| `buildTree([3, 7, 5, 2, 6, 1, 4, 8])` | `[[3,7,5,2,6,1,4,8], [37,52,61,48], [422,658], [4878]]` |

**Hiển thị cây:**
- Vẽ bằng SVG, các nút nối nhau bằng đường thẳng.
- Nhãn các lá là T1…T8.
- Trên điện thoại: cây 8 lá được cuộn ngang, hoặc thu nhỏ vừa màn hình mà chữ vẫn đọc được.

## "Em có biết?" (4 thẻ)

1. **Một khối chứa rất nhiều giao dịch.** Cây Merkle là cách "gói" tất cả giao dịch thành một con số duy nhất ở đỉnh, gọi là gốc Merkle (Merkle root).
2. **Cách tạo cây.** Ghép từng cặp giao dịch thành một giá trị mới, rồi lại ghép từng cặp giá trị mới, cho tới khi chỉ còn 1 giá trị. Giá trị đó là gốc. Trong bài, công thức ghép là T_ab = T_a × 10 + T_b, và thứ tự quan trọng (T_12 khác T_21).
3. **Giống bảng đấu loại trực tiếp.** 8 đội đá 4 trận tứ kết, rồi 2 trận bán kết, rồi 1 trận chung kết. Mỗi cặp gộp thành 1, cho tới khi chỉ còn nhà vô địch ở đỉnh.
4. **Để làm gì?** Chỉ cần sửa 1 giao dịch là gốc đổi ngay. Gốc được ghi vào khối (trang sổ), nên node chỉ cần so 1 con số thay vì so từng giao dịch, và phát hiện sửa đổi rất nhanh.

## Mức Dễ — "Làm quen ghép cặp"

**Bảng giao dịch** (lấy từ file gốc):

| Giao dịch | Nội dung | Giá trị |
|---|---|---|
| T1 | An mua quyển sách | 3 |
| T2 | Bình mua cây bút | 7 |
| T3 | Chi mua vở | 5 |
| T4 | Dũng mua thước | 2 |

Khi chơi lại: giá trị ngẫu nhiên 1–9, giữ nguyên tên và nội dung.

**5 câu hỏi nhanh:** T12, T34, T23, T21, T41.
- Mỗi câu hiện hai thẻ giao dịch đặt cạnh nhau, em nhập kết quả ghép.
- Đúng: hai thẻ trượt vào nhau thành một thẻ mới.
- T21 là câu "bẫy thứ tự". Nếu em làm ngược thứ tự, giải thích: "T21 = T2 × 10 + T1 = 73, khác T12 = 37."

Sao tính theo số lỗi.

## Mức Trung bình — "Xây cây 4 giao dịch"

### Phần A — Xem cây được tạo thế nào

- Hoạt cảnh từng bước, 5 bước, có nút "Tiếp".
- Dựng cây từ 4 giao dịch trong bảng: từ các lá lên T12 và T34, rồi lên gốc.
- Mỗi bước hiện phép tính tương ứng.

### Phần B — Tự xây cây

- Bảng 4 giao dịch mới (giá trị ngẫu nhiên 1–9), cây còn trống.
- Em nhập T12, T34, rồi gốc. Một nút chỉ nhập được khi 2 nút con của nó đã có giá trị.
- Sai: gợi ý công thức đã thế số của hai nút con.

### Phần C — Khoảnh khắc "à ra thế"

- Tí đổi 1 giao dịch (ví dụ T3 từ 5 thành 6).
- Các nút trên đường đi từ lá đó lên gốc lần lượt chuyển đỏ và cập nhật giá trị (có animation).
- Linh vật: "Chỉ đổi 1 giao dịch mà gốc đổi ngay. Node sẽ phát hiện được!"

Sao tính theo số lỗi ở phần B.

## Mức Khó — "Ghép mảnh cây 8 giao dịch"

**Đề bài:**
- Bảng 8 giao dịch: giá trị ngẫu nhiên 1–9, kèm tên người và món đồ.
- Cây đầy đủ có 15 ô (8 lá, 4 ô tầng 1, 2 ô tầng 2, 1 gốc), nhưng ẩn đi 6 ô:
  - 1 lá;
  - 2 ô tầng 1;
  - 1 ô tầng 2;
  - gốc;
  - 1 ô bất kỳ còn lại.

**Khay mảnh ghép:**
- Gồm giá trị của 6 ô bị ẩn, cộng 2 mảnh nhiễu.
- Mảnh nhiễu là kết quả ghép **ngược thứ tự** của các ô bị ẩn (ví dụ T43 thay vì T34).
- Mọi giá trị trong khay phải khác nhau; nếu bị trùng thì tạo đề lại.

**Cách chơi:**
- Em kéo mảnh vào ô (hoặc chạm chọn rồi chạm đặt), rồi bấm "Kiểm tra".
- Ô đặt đúng: khóa lại, màu xanh.
- Mảnh đặt sai: bật về khay, kèm gợi ý cụ thể, ví dụ "T56 = T5 × 10 + T6. Em đang ghép ngược thứ tự."

**Ví dụ đề để test:**
- Lá `[3, 7, 5, 2, 6, 1, 4, 8]`, tầng 1 `[37, 52, 61, 48]`, tầng 2 `[422, 658]`, gốc `4878`.
- Các ô bị ẩn: T6 (1), T34 (52), T78 (48), T5678 (658), gốc (4878), T12 (37).
- Khay: `{1, 52, 48, 658, 4878, 37}` cộng mảnh nhiễu `{25, 84}`.

**Sao:** đúng hết sau 1 lần kiểm tra được 3 sao; sau 2 lần được 2 sao; nhiều hơn được 1 sao.

**Điều em vừa học:** "Cây Merkle gói nhiều giao dịch thành 1 gốc. Đổi bất kỳ giao dịch nào thì gốc cũng đổi."

## Checklist nghiệm thu Bài 4

- [ ] Mọi test trong self-test đều ✅.
- [ ] Dễ: câu T21 bắt lỗi làm ngược thứ tự và giải thích đúng.
- [ ] Trung bình: không nhập được gốc khi T12 hoặc T34 chưa có; animation "đổi 1 lá, gốc đổi" chạy đúng đường đi.
- [ ] Khó: khay không có giá trị trùng; mảnh nhiễu là kết quả ghép ngược; cây 8 lá xem tốt trên màn hình 360px.

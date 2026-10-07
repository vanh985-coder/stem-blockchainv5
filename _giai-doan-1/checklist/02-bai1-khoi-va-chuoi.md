# PROMPT 2/7 — BÀI 1: KHỐI & CHUỖI ("Cuốn sổ và những trang giấy")

Tiếp tục dự án Sổ Chung.

- Giữ nguyên design system, component và cấu trúc đã có.
- Chỉ xây Bài 1 trong `src/lessons/lesson1/`, không sửa các bài khác.
- Thêm test của bài này vào `#/dev/self-test`.
- Khi xong, liệt kê những gì đã làm và những điểm còn chưa chắc chắn.

## Mục tiêu học tập

Sau bài này, học sinh:
1. hiểu khối là một trang sổ gồm nội dung và mã trang;
2. tự nối các trang thành chuỗi;
3. thấy rằng sửa 1 trang thì phải tính lại mọi trang phía sau;
4. thấy rằng khi chuỗi dài thêm liên tục, một người không thể sửa kịp.

## Quy ước & công thức

- Node là cuốn sổ, khối là trang sổ. Mỗi trang có Nội dung (số nguyên 0–99) và Mã trang (0–99).
- **Trang bìa** (khối đầu tiên) chỉ có mã, không có nội dung. Mã trang bìa ngẫu nhiên trong khoảng 10–89.
- **Công thức:** `Mã trang = (Mã trang trước × 2 + Nội dung) mod 100`.
  - "mod 100" nghĩa là chỉ giữ 2 chữ số cuối.
  - Hệ số 2 lấy từ `gameConfig.lesson1.multiplier`.
- **Luật "khớp":** một trang khớp khi mã trang đang ghi bằng `(mã ĐANG GHI của trang trước × 2 + nội dung) mod 100`.
- **Hiệu ứng domino (đây chính là bài học):**
  - Khi nội dung trang k bị đổi, lúc đầu chỉ trang k bị lệch.
  - Sửa mã trang k xong thì trang k+1 lệch; sửa k+1 thì k+2 lệch; cứ thế tới cuối.
  - Các trang nằm sau trang lệch đầu tiên hiển thị viền vàng nét đứt, nhãn "Sẽ phải tính lại".
- **Chú ý quan trọng về công thức:**
  - Với hệ số 2 và mod 100, nếu nội dung bị đổi một lượng là bội của 25 (25, 50, 75) thì chuỗi tự "lành" sau 1–2 trang.
  - Vì vậy, mỗi khi game tự tạo thay đổi (Tí sửa trộm, mức Khó), độ chênh `d = (mới − cũ) mod 100` phải khác 0 và không chia hết cho 25.

## logic.ts (hàm thuần)

```ts
pageCode(prevCode: number, content: number): number
buildChain(genesisCode: number, contents: number[]): number[]      // mã của từng trang
firstInvalidIndex(genesisCode: number,
                  pages: { content: number; code: number }[]): number  // -1 nếu khớp hết
isSafeDelta(oldContent: number, newContent: number): boolean
```

Đưa `pageCode` sang `src/lib/chain.ts` để Bài 2 dùng lại.

**Test case:**

| Lời gọi | Kết quả mong đợi |
|---|---|
| `pageCode(10, 23)` | `43` |
| `buildChain(10, [23, 45, 7, 88, 12])` | `[43, 31, 69, 26, 64]` |
| Chuỗi trên, đổi nội dung trang 2 từ 45 thành 72, rồi sửa lần lượt tới cuối | mã mới `[43, 58, 23, 34, 80]` |
| `isSafeDelta(45, 95)` | `false` |
| `isSafeDelta(45, 72)` | `true` |

## "Em có biết?" (4 thẻ)

1. **Blockchain là một cuốn sổ.** Mỗi trang sổ là một khối (block). Các trang được ghi nối tiếp nhau thành một chuỗi (chain), vì vậy mới gọi là "chuỗi khối".
2. **Mỗi trang có 2 phần.** Nội dung là điều được ghi lại (ở đây là một con số). Mã trang giống như "dấu vân tay" của trang.
3. **Cách tính mã trang.** Mã trang = (Mã trang trước × 2 + Nội dung) mod 100, trong đó "mod 100" nghĩa là chỉ giữ 2 chữ số cuối. Ví dụ: trang bìa có mã 10, nội dung là 23, ta có 10 × 2 + 23 = 43, vậy mã trang là 43.
4. **Vì sao khó sửa lén?** Mã trang sau được tính từ mã trang trước, nên sửa một trang sẽ kéo theo phải sửa mọi trang phía sau. Blockchain thật dùng "hàm băm" (như SHA-256) phức tạp hơn nhiều, nhưng ý tưởng giống hệt.

## Mức Dễ — "Xây chuỗi 5 trang"

**Màn hình:**
- Trang bìa (mã ngẫu nhiên) và 5 trang trống xếp theo hàng ngang.
- Trên điện thoại cuộn ngang được, tự cuộn tới trang đang làm.
- Trang chưa tới lượt thì mờ đi.

**Mỗi trang, làm lần lượt:**
1. Em nhập Nội dung (0–99), hoặc bấm "Chọn giúp em" để điền số ngẫu nhiên.
2. Em nhập Mã trang.
3. Bấm "Kiểm tra".

Trang 1 có hướng dẫn: linh vật chỉ vào công thức đã điền sẵn số, dạng "(10 × 2 + 23) mod 100 = ?".

**Phản hồi:**
- Đúng: đóng dấu mã, mắt xích sang trang tiếp theo khớp vào.
- Sai lần 1: gợi ý công thức đã thế số, nhưng không có kết quả.
- Sai lần 2: hiện lời giải từng bước (nhân 2, cộng nội dung, giữ 2 chữ số cuối) để em nhập lại.
- Mỗi lần sai tính 1 lỗi.

**Ô nhập:**
- Chỉ nhận số, `inputMode="numeric"`, phím Enter tương đương "Kiểm tra".
- Nếu ngoài khoảng 0–99 thì báo "Nội dung là số từ 0 đến 99".

**Kết thúc:**
- Xong 5 trang thì hiện `LevelComplete`.
- Lưu chuỗi (mã trang bìa, nội dung, mã) vào tiến độ để mức Trung bình dùng lại ("chuỗi của em").
- Điều em vừa học: "Mỗi trang giữ mã của trang trước. Nhờ vậy các trang móc vào nhau thành chuỗi."

## Mức Trung bình — "Tí sửa trộm sổ"

1. **Nạp chuỗi:** dùng chuỗi 5 trang em đã xây ở mức Dễ. Nếu không có, tạo ngẫu nhiên.
2. **Hoạt cảnh (khoảng 2 giây):** Tí 🦊 lẻn vào, đổi nội dung của một trang k (k ngẫu nhiên, 2 hoặc 3) sang số khác, dùng độ chênh an toàn. Nội dung cũ bị gạch bằng bút đỏ, số mới viết đè lên.
3. **Trang k bị lệch:**
   - Trang k chuyển đỏ, mắt xích bên trái gãy.
   - Thông báo: "Nội dung trang k đã bị đổi nên mã trang không còn khớp."
   - Các trang sau có viền vàng nét đứt, nhãn "Sẽ phải tính lại".
4. **Nhiệm vụ "Sửa lại chuỗi cho khớp":**
   - Em tính lại mã trang k theo nội dung mới.
   - Sửa xong trang k thì trang k+1 gãy (domino).
   - Lần đầu xảy ra domino, linh vật giải thích: "Ôi! Mã trang k+1 được tính từ mã trang k. Mã trang k vừa đổi nên trang k+1 lệch theo."
   - Cứ thế tới trang cuối. Có bộ đếm "Số trang đã phải sửa: n".
5. **Câu hỏi suy ngẫm cuối màn:** "Liệu có nhiều khối hơn và sinh ra liên tục thì sửa có kịp không?"
   - Lựa chọn: "Kịp chứ!", "Chắc là không kịp", "Em chưa chắc".
   - Chọn gì cũng hiện: "Hãy sang mức Khó để tìm hiểu điều đó!" kèm nút "Sang mức Khó".
6. Điều em vừa học: "Chỉ đổi 1 trang mà em phải tính lại cả những trang phía sau."

## Mức Khó — "Cuộc đua với cả mạng lưới"

**Bối cảnh (hiện ở LevelIntro):** "Em muốn lén đổi nội dung trang 2 mà không ai phát hiện. Muốn vậy, cả chuỗi phải khớp. Nhưng mạng lưới vẫn liên tục ghi thêm trang mới!"

**Bắt đầu:** chuỗi 6 trang hợp lệ. Game đổi nội dung trang 2 (độ chênh an toàn), nên trang 2 bị lệch.

**Mạng lưới thêm trang:**
- Mạng giữ riêng một chuỗi "gốc" không bị sửa.
- Cứ mỗi khoảng thời gian, mạng thêm 1 trang mới vào sổ của em:
  - nội dung ngẫu nhiên;
  - mã tính từ mã trang cuối của chuỗi **gốc**.
- Trang mới trượt vào từ bên phải, màn hình tự cuộn theo.

**Em sửa chuỗi:**
- Chỉ trang lệch đầu tiên cho phép nhập. Trang đó hiện sẵn công thức đã thế số, dạng "(58 × 2 + 7) mod 100 = ?", để em tính nhanh.
- Khi em sửa tới trang cuối, trang mới tiếp theo sẽ lệch (vì mã của em đã khác mạng).

**Thời gian (đặt trong gameConfig):**
- Mỗi màn dài 60 giây.
- Khoảng cách giữa hai lần thêm trang: bắt đầu 6 giây, mỗi lần giảm 0,3 giây, tối thiểu 3 giây.

**Hiển thị:**
- Đồng hồ đếm ngược.
- "Còn phải sửa: N trang": chữ to, màu bút đỏ, số nhảy lên mỗi khi có trang mới. N = vị trí trang cuối − vị trí trang lệch đầu tiên + 1.
- "Đã sửa: M trang".

**Hết giờ:**
- Màn tổng kết với số liệu: số trang đã sửa, số trang mạng đã thêm, số trang còn lệch.
- Linh vật: "Không kịp! Một người không thể sửa nhanh hơn cả mạng lưới cùng ghi sổ."

**Nếu em nhanh tới mức có lúc sửa hết:** hiện "Wow, em nhanh thật! Nhưng trang mới vẫn tiếp tục tới…", và mạng tăng tốc lên 2 giây một trang.

**Câu hỏi dẫn sang Bài 2 (ở màn kết thúc):** "Nếu cuốn sổ nằm trong tay một mình em và không ai thêm trang mới, em có sửa lén được không?"
- Lựa chọn: "Được, cứ từ từ tính lại" (đúng) và "Không được".
- Giải thích: "Đúng vậy. Vì thế blockchain không bao giờ để sổ trong tay một người. Ở Bài 2, rất nhiều người cùng giữ sổ!"
- Kèm nút "Sang Bài 2".

**Sao (theo số trang đã sửa):**
- Từ 8 trang trở lên: 3 sao.
- Từ 4 trang trở lên: 2 sao.
- Còn lại: 1 sao.

Màn này luôn tính là hoàn thành khi hết giờ.

**Hiệu năng:**
- Đồng hồ cập nhật bằng state riêng.
- Các trang dùng `React.memo`; trang mới dùng animation `transform`.
- Dọn mọi interval/timeout khi rời màn.

## Checklist nghiệm thu Bài 1

- [ ] Mọi test Bài 1 trong self-test đều ✅.
- [ ] Dễ: sai 2 lần thì hiện lời giải từng bước; xong 5 trang thì chuỗi được lưu.
- [ ] Trung bình: dùng đúng chuỗi em vừa xây; domino chạy đúng tới trang cuối.
- [ ] Khó: trang mới tới đều và nhanh dần; không nhập được vào trang không phải trang lệch đầu tiên; rời màn giữa chừng không để timer chạy ngầm.
- [ ] Chơi mượt trên điện thoại 360px, cuộn ngang trơn tru.

# PROMPT 4/7 — BÀI 3: KHÓA RIÊNG & KHÓA CÔNG KHAI

Tiếp tục dự án Sổ Chung.

- Chỉ xây Bài 3 trong `src/lessons/lesson3/`.
- Thêm test vào self-test.
- Khi xong, liệt kê những gì đã làm và những điểm còn chưa chắc chắn.

## Mục tiêu học tập

Học sinh hiểu:
- Khóa riêng dùng để ký; khóa công khai để người khác kiểm tra chữ ký.
- Tạo khóa công khai từ khóa riêng thì dễ, nhưng không thể tính ngược lại.
- Mất khóa riêng là mất hết, không ai lấy lại giúp được.

## Toán (logic.ts)

**Tham số:** p = 23, g = 5 (g là căn nguyên thủy mod 23), q = p − 1 = 22.

**Hàm cơ bản:**
- `modPow(base, exp, mod)`: bình phương và nhân. Dùng Number vì số nhỏ.
- `publicKey(x) = modPow(5, x, 23)`.

**Chữ ký (kiểu Schnorr thu nhỏ).** Học sinh không phải tính phần này; chỉ "máy xác minh" tính.

`hash(message, r)`:
1. `msg = message.normalize('NFC')`.
2. `h = r`.
3. Duyệt từng ký tự bằng `Array.from(msg)`; với ký tự thứ i (đếm từ 0): `h += codePoint × (i + 1)`.
4. Trả về `h mod 22`.

`sign(x, message, k)`:
1. `r = 5^k mod 23`.
2. `e = hash(message, r)`.
3. `s = (k + x·e) mod 22`.
4. Trả về `{ r, s }`.

`verify(y, message, { r, s })`:
1. `e = hash(message, r)`.
2. Đúng khi `5^s mod 23 === (r · y^e) mod 23`.

**Chống trùng ngẫu nhiên.** Vì số nhỏ, đôi khi một chữ ký vô tình cũng khớp với một khóa khác. Mỗi khi tạo chữ ký để hiển thị:
- chọn k ngẫu nhiên trong 1–21, thử lại tối đa 50 lần;
- dừng khi chữ ký **chỉ** khớp đúng khóa định trước, trong số mọi khóa công khai có mặt trên màn (danh bạ và các khóa đính kèm).

**Bảng tra (để test):** 5^x mod 23

| x | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 5^x mod 23 | 5 | 2 | 10 | 4 | 20 | 8 | 17 | 16 | 11 | 9 | 22 |

| x | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 5^x mod 23 | 18 | 21 | 13 | 19 | 3 | 15 | 6 | 7 | 12 | 14 | 1 |

**Test case:**

| Lời gọi | Kết quả mong đợi |
|---|---|
| `publicKey(12)` | `18` |
| `publicKey(15)` | `19` |
| `sign(12, "Chuyển 3 xu cho An", 5)` | `{ r: 20, s: 1 }` |
| `verify(18, "Chuyển 3 xu cho An", { r: 20, s: 1 })` | `true` |
| `verify(21, "Chuyển 3 xu cho An", { r: 20, s: 1 })` | `false` |
| `verify(19, "Chuyển 3 xu cho An", { r: 20, s: 1 })` | `false` |

**Nhân vật và khóa** (dùng thống nhất cả bài):

| Người | Khóa riêng | Khóa công khai |
|---|---|---|
| Em (học sinh) | 12 | 18 |
| An | 15 | 19 |
| Bình | 17 | 15 |
| Chi | 19 | 7 |
| Dũng | 21 | 14 |
| Tí 🦊 | 13 | 21 |

"Danh bạ khóa công khai" (ai cũng xem được) chỉ liệt kê cột khóa công khai.

## "Em có biết?" (5 thẻ)

1. **Mỗi người có một cặp khóa.**
   - Khóa riêng (private key): bí mật, chỉ mình em biết, giống chữ ký tay của em.
   - Khóa công khai (public key): ai cũng xem được, giống tên in trên bảng tên.
2. **Khóa công khai được tạo từ khóa riêng.** Công thức: publicKey = g^privateKey mod p. Trong bài này g = 5, p = 23. Ví dụ với khóa riêng 3: 5³ = 125, và 125 mod 23 = 10, vậy khóa công khai là 10.
3. **Ký bằng khóa riêng, kiểm bằng khóa công khai.** Khi gửi tiền, em "ký" giao dịch bằng khóa riêng. Bất kỳ ai cũng dùng khóa công khai của em để kiểm tra rằng chữ ký đúng là của em, mà không cần biết khóa riêng.
4. **Tính xuôi dễ, tính ngược cực khó.** Từ khóa riêng tính ra khóa công khai rất nhanh. Nhưng từ khóa công khai đoán ngược ra khóa riêng, với số thật dài hàng chục chữ số, thì mọi máy tính trên thế giới cộng lại cũng không làm nổi. (Bitcoin dùng một công thức "họ hàng" phức tạp hơn, gọi là mật mã đường cong elliptic.)
5. **Thử ngay!** Vào phần chơi Dễ để xem hai khóa liên kết với nhau thế nào.

## Mức Dễ

### Phần 1 — "Máy xác minh"

1. **Cấp khóa.** Em nhận một cặp khóa:
   - Thẻ "két sắt" chứa khóa riêng 12. Mặc định che bằng ••, có nút hình con mắt để xem, và dòng nhắc "Không cho ai xem!".
   - Thẻ "bảng tên" chứa khóa công khai 18, ghi "Ai cũng xem được".
2. **Ký.** Em chọn 1 giao dịch mẫu (ví dụ "Chuyển 3 xu cho An"), bấm "Ký bằng khóa riêng". Con dấu mực tím đóng lên giao dịch và hiện chữ ký (r, s).
3. **Xác minh.** Em kéo giao dịch đã ký vào "Máy xác minh" (SVG có khe, đèn và bánh răng).
   - Máy dò lần lượt từng khóa trong danh bạ; mỗi dòng sáng lên 150 ms.
   - Gặp khóa khớp thì in phiếu: "Người gửi: [tên em] ✓ — khớp khóa công khai 18".
4. **Đối chứng.** Tí viết "Chuyển 50 xu từ ví [tên em] cho Tí", nhưng ký bằng khóa riêng của Tí. Em thả giao dịch này vào máy, máy in phiếu: "Chữ ký khớp với khóa của Tí, không phải của [tên em]. Giao dịch mạo danh ✗".
5. **Rút ra:** "Chữ ký cho biết ai thật sự đã ký, dù người đó ghi tên ai."

### Phần 2 — "Tạo khóa công khai"

**Đề bài:**
- 5 bạn với khóa riêng: Giang 3, Hoa 5, Khang 6, Linh 7, Minh 9.
- 7 thẻ khóa công khai, xếp trộn: 10, 20, 8, 17, 11 (đúng) và 16, 9 (nhiễu).
- Em kéo thẻ khóa công khai vào đúng người (hoặc chạm chọn rồi chạm đặt).
- Đáp án: Giang 10, Hoa 20, Khang 8, Linh 17, Minh 11.

**Công cụ hỗ trợ:**
- "Máy tính mod" nhỏ: em nhập a × b, máy hiện kết quả mod 23. Mỗi lần chỉ làm 1 phép nhân.
- Ví dụ mẫu: "5² = 25, và 25 mod 23 = 2. Mẹo: nhân 5 rồi lấy dư cho 23 sau mỗi bước."

**Kiểm tra:**
- Ô ghép đúng khóa lại màu xanh.
- Ô ghép sai: thẻ bật về, kèm gợi ý "5^x: nhân 5 đủ x lần, mỗi lần lấy dư cho 23".
- Sao tính theo số lần kiểm tra sai.

## Mức Trung bình — "Hộp thư có kẻ mạo danh"

**Đề bài:**
- Ví của em nhận 4 giao dịch, lần lượt từ An, Bình, Chi và Dũng (thứ tự và số xu ngẫu nhiên).
- Ngẫu nhiên 2 giao dịch là giả, do kẻ mạo danh ký: Tí, hoặc một khóa lạ (khóa riêng 16, khóa công khai 3).
- Mỗi thẻ giao dịch có: người gửi (theo lời ghi), nội dung, chữ ký (r, s).
- Một số thẻ, cả thật lẫn giả, có thêm dòng "Khóa công khai đính kèm: N". Giao dịch giả luôn đính kèm khóa của chính kẻ mạo danh; đây là cái bẫy.

**Công cụ:** Danh bạ chính thức và Máy xác minh.
- Em thả 1 khóa (chip lấy từ danh bạ, hoặc từ dòng đính kèm) cùng 1 giao dịch vào máy.
- Máy báo "✓ Chữ ký khớp với khóa N" hoặc "✗ Không khớp với khóa N".
- Lần đầu em dùng khóa đính kèm, hiện nhắc (chỉ một lần): "Cẩn thận! Khóa đính kèm do chính người gửi đưa. Kẻ mạo danh có thể gửi kèm khóa của nó. Hãy dùng khóa trong danh bạ chính thức."

**Nộp bài:**
- Em đánh dấu từng giao dịch "Thật" hoặc "Giả", rồi bấm "Nộp kết quả".
- Sai bất kỳ cái nào: giải thích từng giao dịch, kèm nút "Thử lại" (bộ đề mới).
- Sao: đúng hết ngay lần 1 được 3 sao; lần 2 được 2 sao; sau đó 1 sao.

**Điều kiện khi tạo đề:**
- Chữ ký thật chỉ khớp với khóa của người gửi trong danh bạ.
- Chữ ký giả:
  - khớp với khóa đính kèm của kẻ mạo danh;
  - không khớp với khóa danh bạ của người bị mạo danh;
  - không khớp với bất kỳ khóa nào khác.

## Mức Khó — "Làm thử Tí: đoán ngược khóa riêng"

### Phần 1 — Đoán khóa với số nhỏ

Bối cảnh: "Tí chỉ biết khóa công khai của An là 19 và muốn tìm khóa riêng để lấy trộm tiền. Em hãy thử làm Tí!"

- Em nhập số đoán x (1–22). Máy tính 5^x mod 23 và báo có khớp với 19 hay không.
- Đếm "Số lần thử", lưu lịch sử thử dạng bảng.
- Nút "Để máy thử lần lượt": máy thử các số còn lại, 120 ms mỗi lần, có hiệu ứng.
- Khi tìm ra (x = 15): "Tìm được khóa riêng 15 sau N lần thử. Với số nhỏ như 23 thì dễ. Còn với số thật thì sao?"

### Phần 2 — "Số càng lớn, càng tuyệt vọng"

**Chạy thật trong trình duyệt:** máy tự dò (brute force) với 3 cấu hình, mỗi cấu hình một khóa riêng ngẫu nhiên:

| p | g |
|---|---|
| 101 | 2 |
| 1009 | 11 |
| 1.000.003 | 2 |

- Hiện số lần thử và thời gian đo thật.
- Chia nhỏ vòng lặp (ví dụ 50.000 phép thử mỗi khung hình) để giao diện không đơ.
- Mọi tích a × b đều nhỏ hơn 10^12, nên Number vẫn tính chính xác.

**Ước tính cho khóa thật (không chạy, chỉ hiển thị):**
- Khóa thật có khoảng 1,16 × 10^77 khả năng (một số có 78 chữ số).
- Giả sử siêu máy tính thử được 10^18 khóa mỗi giây: cần khoảng 3,7 × 10^51 năm.
- Kể cả thuật toán thông minh nhất hiện nay (khoảng 2^128 bước) cũng cần khoảng 1,1 × 10^13 năm, gấp khoảng 780 lần tuổi vũ trụ (13,8 tỷ năm).

**Minh họa:** thanh so sánh theo thang logarit (theo số chữ số), nhãn dễ hiểu.

**Rút ra:** "Tính xuôi mất 1 giây, tính ngược mất lâu hơn cả tuổi vũ trụ. Đó là lý do khóa công khai được phép công khai."

### Phần 3 — "Nếu em làm mất khóa riêng?"

1. Ví của em có 50 xu. Hoạt cảnh: tờ giấy ghi khóa riêng bị gió cuốn đi.
2. Em bấm "Rút tiền". Máy đòi chữ ký, nhưng không còn khóa riêng nên thất bại.
3. Câu hỏi: "Ai có thể giúp em lấy lại số tiền này?"
   - Lựa chọn: "Ngân hàng", "Người lập trình ra blockchain", "Các node trong mạng", "Không ai cả".
   - Đáp án đúng: "Không ai cả".
4. Giải thích: "Blockchain không có nút 'Quên mật khẩu'. Khóa riêng chỉ một người giữ; mất là mất hết. Hãy cất giữ khóa riêng (hoặc cụm từ khôi phục) cẩn thận, không chụp ảnh gửi cho ai."

**Sao (theo câu hỏi ở phần 3):** đúng ngay lần đầu được 3 sao; sai 1 lần được 2 sao; sai nhiều hơn được 1 sao.

**Điều em vừa học** (lời của file gốc): "Khóa riêng để ký, khóa công khai để người khác kiểm tra. Mất khóa riêng là mất hết, không ai lấy lại giúp được."

## Checklist nghiệm thu Bài 3

- [ ] Mọi test trong self-test đều ✅, gồm cả bảng tra 5^x mod 23.
- [ ] Dễ: máy dò danh bạ có hiệu ứng; giao dịch mạo danh của Tí bị máy chỉ ra đúng người đã ký.
- [ ] Trung bình: dùng khóa đính kèm của giao dịch giả thì máy báo ✓ (đúng như cái bẫy), dùng khóa trong danh bạ thì máy báo ✗.
- [ ] Khó: dò với p = 1.000.003 không làm đơ giao diện; số lớn hiển thị theo kiểu Việt Nam (dấu phẩy thập phân).
- [ ] Kéo thả dùng được bằng cách chạm trên điện thoại.

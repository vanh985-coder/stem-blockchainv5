# P6a — Nội dung thẻ "Em có biết?" tương tác (BẢN NHÁP CHỜ CHỦ DỰ ÁN DUYỆT)

Trạng thái: **bản nháp nội dung, chưa tích hợp vào game** (không sửa thẻ gốc, không sửa mã). Bước P6b (tích hợp) chỉ làm sau khi chủ dự án duyệt tài liệu này.

Mỗi thẻ gốc ở `packages/core/src/content/lessons/bai-N.ts` (`emCoBiet`) được bổ sung: một ví dụ ngắn, một câu hỏi (ABCD hoặc điền số), đáp án đúng và lời giải thích. Chữ viết tiếng Việt có dấu, xưng "em". Tên nhân vật viết bằng chỗ giữ tên (`{phanDien}`, `{cuBinh}`, `{coChi}`, `{bacAn}`), không viết thẳng tên phản diện.

## 1. Luồng dự kiến (để duyệt)

Khi em nhặt một cuộn "Em có biết?" trong làng (hoặc mở thẻ từ menu "Em có biết?"):

1. **Đọc thẻ**: tiêu đề và nội dung thẻ như hiện nay.
2. **Xem ví dụ**: ví dụ ngắn của thẻ (khung riêng dưới nội dung, như trường `example` hiện có).
3. **Trả lời**: một câu hỏi. ABCD chọn một đáp án; điền số gõ một số rồi bấm "Kiểm tra".
4. **Xem giải thích**: hiện đáp án đúng và lời giải thích ngắn, **dù em trả lời đúng hay sai**. Trả lời sai: giải thích viết để em hiểu vì sao đáp án em chọn chưa đúng, không có chữ chê bai và không trừ gì.
5. **Nhận thẻ**: bấm "Cất vào sổ" như hiện nay; thẻ được cất vào sổ.

Quy tắc:
- **Trả lời sai vẫn nhận thẻ** sau phần giải thích. Không thêm điểm, xu, sao, huy chương, tim hay điều kiện thắng nào; không ảnh hưởng Trang Sổ Vàng hay luật mở màn.
- Dự kiến mỗi thẻ chỉ **một lần trả lời** (chọn/gõ xong là sang giải thích), để luồng ngắn (xem điểm 3 ở mục "Điểm cần duyệt").
- Cờ lưu thẻ (`knowCards`) giữ nguyên: nhặt xong là có thẻ. Chưa quyết định có lưu câu trả lời hay không (xem mục "Điểm cần duyệt").
- Tôn trọng "Giảm chuyển động" (không hiệu ứng bay/nhấp nháy khi báo đúng/sai) và "Chữ to"; mọi chữ nằm ở `packages/core/src/content/` khi tích hợp.

## 2. Quy ước trong tài liệu

- **Khóa thẻ**: `<id làng>#<số thứ tự từ 0>`, đúng chỉ số cuộn trong làng (`VillageScroll.index`) và bit của `knowCards`; nguồn chữ là `bai<N>Lesson.emCoBiet[<số>]`.
- **Điền số**: ghi rõ các cách viết được chấp nhận. Dự kiến chuẩn hóa: bỏ khoảng trắng hai đầu, bỏ dấu chấm cuối câu, nhận số viết liền (ví dụ `44`); **không** nhận số kèm chữ khác, số thập phân hay dấu phân cách ngàn trừ khi ghi rõ.
- **Phương án ABCD**: đúng một đáp án, độ dài gần nhau, vị trí đáp án đúng đã được rải đều (A: 4, B: 3, C: 4, D: 2 trong 13 câu ABCD) để không có "mẹo đoán".
- **Tính toán**: dùng đúng công thức và số liệu của bài (mod 100; p = 23, g = 5; T_ab = T_a × 10 + T_b). Mọi số trong tài liệu được tự kiểm bằng logic sẵn có trong `scripts/p6a-check.test.mjs` (13 ca, chạy trong `pnpm test`).
- **Không đánh đồng mô hình đơn giản trong game với mọi blockchain**: chỗ nào game đã đơn giản hóa thì giải thích có câu nói rõ "trong bài này" / "ở blockchain thật".

## 3. Phát hiện cần lưu ý trước khi duyệt

1. **Làng Khắc Dấu có 5 thẻ trong nội dung nhưng chỉ có 4 cuộn trong làng.** `bai3Lesson.emCoBiet` có 5 thẻ (thẻ thứ 5 "Địa chỉ ví chính là khóa công khai"); `LOCAL_VILLAGES['lang-khac-dau'].scrolls` chỉ có 4 cuộn (chỉ số 0 đến 3) và `scrollTotals` = 4, nên thẻ thứ 5 **không thể nhặt trong làng**; nó chỉ hiện ở phần giới thiệu làng trên `/ban-do` (thẻ 5/5). Tài liệu này soạn **16 thẻ nhặt được (4 thẻ đầu mỗi làng)** đúng yêu cầu; thẻ thứ 5 chỉ có bản nháp ở Phụ lục A để chủ dự án quyết định.
2. **Spec giai đoạn 1 của Bài 3 mô tả 5 thẻ khác với nội dung đang dùng** (`docs/specs/giai-doan-1/04-bai3-khoa.md` mục "Em có biết? (5 thẻ)": cặp khóa; công thức g^x mod p; ký và kiểm; tính xuôi dễ ngược khó; "Thử ngay"). Nội dung trong code (đang chạy) là bản khác (chữ ký giấy và chữ ký số; phép toán một chiều; cặp khóa Bitcoin; mất khóa riêng; địa chỉ ví). Tài liệu này **theo nội dung đang dùng trong code**, đối chiếu công thức với spec và `lessons/bai-3/logic.ts`. Ba bài còn lại khớp spec về tiêu đề.
3. Thẻ Làng Giấy không có trường `example` trong code (ví dụ nằm trong chữ của thẻ 3); thẻ Làng Dệt, Khắc Dấu, Bạc đã có `example`. Dưới đây mỗi thẻ có **một ví dụ đề xuất**; nếu duyệt thì thay hoặc bổ sung trường `example` hiện có khi tích hợp.

---

## 4. Làng Giấy — Bài 1 "Trang nối trang" (màn 1)

Nguồn chung: `docs/specs/giai-doan-1/02-bai1-khoi-va-chuoi.md` (mục "Em có biết? (4 thẻ)", "Quy ước & công thức"); logic `lib/chain.ts` (`pageCode`, `MOD = 100`).

### Thẻ 1 — `lang-giay#0` — "Blockchain là một cuốn sổ."
- **Kiến thức cần nhớ:** mỗi trang sổ là một khối (block); các trang ghi nối tiếp nhau thành chuỗi (chain).
- **Ví dụ:** Sổ Làng Giấy ghi: trang 1 "Giang trả Hoa 5 xu", trang 2 "Hoa trả Khang 3 xu", trang 3 "Khang trả Minh 2 xu". Ba trang nối tiếp nhau là một chuỗi gồm ba khối.
- **Câu hỏi (ABCD):** Sổ Làng Giấy hiện có 8 trang, ghi nối tiếp nhau. Theo cách gọi "chuỗi khối" (blockchain), cuốn sổ này là gì?
  - A. Một chuỗi gồm 8 khối
  - B. Một khối gồm 8 chuỗi
  - C. Tám chuỗi khối riêng biệt
  - D. Một khối duy nhất
- **Đáp án đúng:** A.
- **Giải thích:** Mỗi trang là một khối, các trang nối tiếp nhau tạo thành chuỗi, nên 8 trang là một chuỗi gồm 8 khối. Nếu em chọn B hay D, em đang gọi cả cuốn sổ là "khối": khối chỉ là từng trang. Trong bài này mỗi khối chỉ ghi một con số cho dễ học; ở blockchain thật mỗi khối chứa nhiều giao dịch.
- **Nguồn đối chiếu:** spec 02 thẻ 1; `bai1Lesson.emCoBiet[0]`.

### Thẻ 2 — `lang-giay#1` — "Mỗi trang có 2 phần."
- **Kiến thức cần nhớ:** mỗi trang có Nội dung (điều được ghi, ở đây là một con số) và Mã trang, giống "dấu vân tay" của trang.
- **Ví dụ:** Trang bìa có mã 10. Trang 1 ghi Nội dung 23 và Mã trang 43 (mã 43 được tính ra từ nội dung 23, em sẽ thấy cách tính ở thẻ tiếp theo).
- **Câu hỏi (ABCD):** Trang 1 ghi "Nội dung 23, Mã trang 43". Sau đó {phanDien} lén đổi Nội dung thành 24 nhưng không tính lại Mã trang. Vì sao em có thể phát hiện trang bị đổi?
  - A. Vì số thứ tự của trang bị đổi
  - B. Vì Mã trang là "dấu vân tay" của trang: nội dung đã khác mà mã vẫn là 43 nên không còn khớp
  - C. Vì màu mực của trang đã đổi
  - D. Không thể phát hiện, vì nội dung nào cũng hợp lệ
- **Đáp án đúng:** B.
- **Giải thích:** Mã trang được tính từ nội dung, nên nội dung đổi thì mã đúng cũng phải đổi. Trang vẫn ghi mã cũ nên em thấy ngay chỗ lệch. Số thứ tự và màu mực không dùng để kiểm tra trang. (Kiểm bằng công thức của thẻ 3: với mã trước 10, nội dung 24 phải ra mã 44, không phải 43.)
- **Nguồn đối chiếu:** spec 02 thẻ 2; `bai1Lesson.emCoBiet[1]`; `pageCode(10, 24) = 44` (kiểm trong `p6a-check.test.mjs`).

### Thẻ 3 — `lang-giay#2` — "Cách tính mã trang."
- **Kiến thức cần nhớ:** Mã trang = (Mã trang trước × 2 + Nội dung) mod 100; "mod 100" nghĩa là chỉ giữ 2 chữ số cuối.
- **Ví dụ:** Mã trước 57, nội dung 36: 57 × 2 + 36 = 150, giữ 2 chữ số cuối là 50, nên mã trang là 50.
- **Câu hỏi (điền số):** Mã trang trước là 43, nội dung của trang mới là 58. Mã trang mới là bao nhiêu?
- **Đáp án đúng:** `44`. **Cách viết chấp nhận:** `44` (có thể có khoảng trắng hai đầu hoặc dấu chấm cuối). Không nhận `144`, `044` hay chữ.
- **Giải thích:** 43 × 2 + 58 = 144, rồi chỉ giữ 2 chữ số cuối nên mã trang là 44. Nếu em ra 144 là em quên bước "mod 100"; nếu em ra 101 là em đã cộng 43 + 58 thay vì nhân đôi mã trước.
- **Nguồn đối chiếu:** spec 02 thẻ 3 và mục "Quy ước & công thức"; `pageCode(43, 58) = 44` (`lib/chain.ts`).

### Thẻ 4 — `lang-giay#3` — "Vì sao khó sửa lén?"
- **Kiến thức cần nhớ:** mã trang sau được tính từ mã trang trước, nên sửa một trang kéo theo phải sửa mọi trang phía sau. Blockchain thật dùng hàm băm (như SHA-256) phức tạp hơn nhiều, nhưng ý tưởng giống nhau.
- **Ví dụ:** Chuỗi bắt đầu từ mã bìa 10 với nội dung 23, 58, 7 có các mã 43, 44, 95. Nếu {phanDien} sửa nội dung trang 1 từ 23 thành 24 thì mã trang 1 thành 44; khi đó trang 2 phải đổi mã từ 44 thành 46 và trang 3 từ 95 thành 99.
- **Câu hỏi (ABCD):** {phanDien} sửa nội dung trang 2 của một chuỗi 6 trang rồi tính lại mã trang 2 cho khớp. Để cả chuỗi vẫn khớp công thức, {phanDien} còn phải làm gì?
  - A. Không cần làm gì thêm, vì trang 2 đã khớp
  - B. Chỉ cần sửa lại trang 1
  - C. Tính lại mã của trang 3, 4, 5 và 6
  - D. Xóa trang 1 khỏi chuỗi
- **Đáp án đúng:** C.
- **Giải thích:** Trang 3 dùng mã trang 2 để tính mã của mình, mà mã trang 2 đã đổi nên mã trang 3 đang ghi không còn đúng; tới lượt trang 4, 5, 6 cũng vậy. Vì thế một lần sửa kéo theo cả dãy phía sau, càng nhiều trang càng khó sửa kịp. Trang 1 đứng trước trang 2 nên không bị ảnh hưởng.
- **Nguồn đối chiếu:** spec 02 thẻ 4 và Mức Khó; `bai1Lesson.emCoBiet[3]`; chuỗi 43/44/95 và 44/46/99 tính bằng `pageCode`; tính chất "đổi nội dung 0–99 thì mọi mã phía sau đổi" được kiểm trong `p6a-check.test.mjs`.

---

## 5. Làng Dệt — Bài 2 "Cả làng cùng giữ sổ" (màn 4)

Nguồn chung: `docs/specs/giai-doan-1/03-bai2-node.md` (mục "Em có biết? (4 thẻ, cộng 1 thẻ ở mức Khó)", Mức Khó mục "Mỗi vòng": "có từ 2 phiếu đồng ý trở lên thì trang được ghi"); logic `lessons/bai-2/logic.ts` (`isValidProposal`).

### Thẻ 1 — `lang-det#0` — "Node là ai?"
- **Kiến thức cần nhớ:** node là một máy tính trong mạng blockchain, giống một người giữ sổ; mỗi node giữ một bản sao đầy đủ của cuốn sổ, và các bản sao giống hệt nhau.
- **Ví dụ:** Trong mạng Sổ Chung có 4 node: em, {cuBinh}, {coChi} và {phanDien}. Mỗi người giữ một cuốn sổ đầy đủ, y hệt nhau.
- **Câu hỏi (ABCD):** Mạng Sổ Chung có 4 node: em, {cuBinh}, {coChi} và {phanDien}. Một trang mới vừa được duyệt và ghi vào sổ chung. Lúc này sổ của các node thế nào?
  - A. Chỉ sổ của node tạo ra trang mới có trang đó
  - B. Mỗi node chỉ giữ một phần trang, ghép lại mới thành trang đầy đủ
  - C. Một node chính giữ bản đầy đủ, các node còn lại chỉ xem
  - D. Cả 4 node đều có trang mới và 4 bản sổ giống hệt nhau
- **Đáp án đúng:** D.
- **Giải thích:** Trong mạng của bài, trang đã được ghi thì ghi vào sổ của tất cả mọi người, nên mỗi node đều có bản đầy đủ và các bản giống nhau. Không có "node chính" và không chia nhỏ sổ: nhờ vậy, mất một bản sổ thì vẫn còn các bản khác. (Một số hệ thống thật có thêm cách chia dữ liệu hay vai trò khác nhau, nhưng không phải mô hình của bài này.)
- **Nguồn đối chiếu:** spec 03 thẻ 1; `bai2Lesson.emCoBiet[0]`.

### Thẻ 2 — `lang-det#1` — "Node làm gì khi có trang mới?"
- **Kiến thức cần nhớ:** node tự kiểm tra 2 điều: mã trang trước ghi trong trang mới có khớp với trang cuối trong sổ của mình không, và mã trang mới có được tính đúng không.
- **Ví dụ:** Sổ em có trang cuối mã 57. Trang mới ghi: mã trước 57, nội dung 36, mã 50. Điều 1: mã trước 57 khớp trang cuối. Điều 2: (57 × 2 + 36) mod 100 = 50, khớp. Em Đồng ý.
- **Câu hỏi (ABCD):** Trang cuối trong sổ của em có mã 40. {cuBinh} gửi trang mới ghi: mã trước 62, nội dung 15, mã trang 39. Em nên bỏ phiếu thế nào?
  - A. Từ chối: mã trước 62 không khớp trang cuối trong sổ của em (mã 40), dù phép tính trong trang đó đúng
  - B. Đồng ý, vì (62 × 2 + 15) mod 100 = 39 đúng bằng mã trang
  - C. Đồng ý, vì nội dung 15 là một số nhỏ
  - D. Từ chối, vì 62 × 2 + 15 = 139 không bằng 39
- **Đáp án đúng:** A.
- **Giải thích:** Phải kiểm cả 2 điều. Phép tính trong trang đúng ((62 × 2 + 15) = 139, giữ 2 chữ số cuối là 39), nhưng mã trước 62 không phải mã trang cuối trong sổ của em (40), nghĩa là trang này nối vào một sổ khác với sổ của em, nên em Từ chối. Chọn D là quên "mod 100": 139 và 39 có cùng 2 chữ số cuối.
- **Nguồn đối chiếu:** spec 03 thẻ 2; `bai2Lesson.emCoBiet[1]`; `isValidProposal(40, {prevCode: 62, content: 15, code: 39}) = 'prev-mismatch'` và `pageCode(62, 15) = 39` (kiểm trong `p6a-check.test.mjs`).

### Thẻ 3 — `lang-det#2` — "Đa số đồng ý mới được ghi."
- **Kiến thức cần nhớ:** chỉ khi phần lớn các node đồng ý, trang mới được ghi vào sổ của tất cả mọi người; cách các node thống nhất với nhau gọi là cơ chế đồng thuận.
- **Ví dụ:** Có 4 node. Một node tạo trang, 3 node còn lại bỏ phiếu: có từ 2 phiếu Đồng ý trở lên thì trang được ghi (cùng người tạo là ít nhất 3 trong 4 node, hơn một nửa).
- **Câu hỏi (ABCD):** {phanDien} tạo một trang mới. Ba node còn lại bỏ phiếu: 1 Đồng ý, 2 Từ chối. Kết quả là gì?
  - A. Được ghi, vì cộng cả người tạo đã có 2 trong 4 node đồng ý
  - B. Được ghi, nhưng chỉ vào sổ của node đã Đồng ý
  - C. Không được ghi, vì chưa đủ đa số (cần ít nhất 2 phiếu Đồng ý trong 3 phiếu)
  - D. Phải bỏ phiếu lại cho tới khi cả ba node đồng ý
- **Đáp án đúng:** C.
- **Giải thích:** Đa số nghĩa là hơn một nửa. Với 4 node, người tạo cộng 1 phiếu Đồng ý mới có 2 node, chỉ bằng một nửa, chưa phải đa số. Trang chỉ được ghi khi có ít nhất 2 phiếu Đồng ý trong 3 phiếu, và khi được ghi thì ghi vào sổ của tất cả mọi người, không riêng node nào. Đây là cách các node trong bài đồng thuận; mạng blockchain thật có nhiều node hơn và nhiều cách đồng thuận khác nhau.
- **Nguồn đối chiếu:** spec 03 thẻ 3 và Mức Khó mục "Mỗi vòng" (từ 2 phiếu trở lên); `bai2Lesson.emCoBiet[2]`.

### Thẻ 4 — `lang-det#3` — "Vì sao an toàn hơn?"
- **Kiến thức cần nhớ:** sổ không nằm trong tay một người; muốn sửa lén, kẻ gian phải sửa sổ của phần lớn các node cùng lúc, điều này cực kỳ khó.
- **Ví dụ:** {phanDien} sửa lén sổ của riêng mình, kể cả sửa và tính lại mã cho cả chuỗi khớp nhau. Sổ của em, {cuBinh} và {coChi} vẫn giữ nguyên, nên bản sổ đã sửa khác với số đông.
- **Câu hỏi (ABCD):** Trong mạng 4 node, {phanDien} sửa lén bản sổ của riêng mình, ba node còn lại không bị sửa. Khi đem bản sổ đã sửa so với sổ của các node khác, điều gì xảy ra?
  - A. Cả mạng đổi theo bản đã sửa, vì node nào đưa ra trước thì thắng
  - B. Bản đã sửa khác với 3 bản còn lại nên bị phát hiện và không được ghi vào sổ chung
  - C. Không ai phát hiện nếu {phanDien} đã tính lại mã trang cho khớp hết
  - D. Chỉ phát hiện được nếu node bị sửa là node vừa tạo trang
- **Đáp án đúng:** B.
- **Giải thích:** Dù {phanDien} đã tính lại mã cho bản của mình khớp từng trang, bản đó vẫn khác bản của 3 node còn lại, mà đa số mới quyết định sổ chung. Muốn thắng, {phanDien} phải sửa sổ của phần lớn các node cùng lúc. Ở blockchain thật, "đa số" có thể được tính theo cách khác (ví dụ theo sức mạnh tính toán hay số tiền đặt cọc), nhưng ý tưởng giống nhau: một node đơn lẻ không thể áp đặt sổ.
- **Nguồn đối chiếu:** spec 03 thẻ 4; `bai2Lesson.emCoBiet[3]`.

---

## 6. Làng Khắc Dấu — Bài 3 "Khuôn riêng, mẫu chung" (màn 7)

Nguồn chung: `docs/specs/giai-doan-1/04-bai3-khoa.md` mục "Toán" (p = 23, g = 5, q = 22; `publicKey(x) = 5^x mod 23`; chữ ký `sign`/`verify`) và mục Mức Khó (đoán ngược khóa, ước tính số lớn); logic `lessons/bai-3/logic.ts`; số ước tính ở `bai3Logic.uocTinh` (`content/lessons/bai-3.ts`). Nội dung thẻ theo bản đang dùng trong code (xem mục 3, điểm 2).

### Thẻ 1 — `lang-khac-dau#0` — "Chữ ký trên giấy vs Chữ ký số"
- **Kiến thức cần nhớ:** chữ ký trên giấy dễ bị tập đồ hoặc sao chép; chữ ký số gắn chặt với từng nội dung cụ thể: đổi dù chỉ một chữ số trong giao dịch, chữ ký không còn khớp.
- **Ví dụ:** Em ký giao dịch "Chuyển 3 xu cho An". Nếu {phanDien} sửa thành "Chuyển 300 xu cho An" mà giữ nguyên chữ ký, người kiểm bằng khóa công khai của em sẽ thấy chữ ký không khớp với nội dung mới.
- **Câu hỏi (ABCD):** Em ký "Chuyển 3 xu cho An". {phanDien} đổi nội dung thành "Chuyển 300 xu cho An" và giữ nguyên chữ ký của em. Khi người khác kiểm chữ ký bằng khóa công khai của em, điều gì xảy ra?
  - A. Chữ ký không còn khớp với nội dung mới, nên giao dịch bị từ chối
  - B. Chữ ký vẫn khớp, vì đó là chữ ký của em
  - C. Chữ ký vẫn khớp nếu {phanDien} biết khóa công khai của em
  - D. Chữ ký vẫn khớp nếu số tiền mới lớn hơn số tiền cũ
- **Đáp án đúng:** A.
- **Giải thích:** Chữ ký số được tính từ cả khóa riêng của em và chính nội dung giao dịch, nên nội dung đổi thì chữ ký cũ không còn đúng; {phanDien} không thể dán chữ ký cũ vào nội dung khác. Biết khóa công khai không giúp được, vì khóa công khai chỉ dùng để kiểm, không để ký. Số tiền lớn hay nhỏ không liên quan. (Kiểm bằng `sign`/`verify` của bài: với cả 21 giá trị k, chữ ký cũ không khớp "300 xu". Trong mô hình thu nhỏ của bài, về nguyên tắc có thể có trường hợp trùng ngẫu nhiên; hệ thật dùng hàm băm 256-bit nên không đáng kể.)
- **Nguồn đối chiếu:** `bai3Lesson.emCoBiet[0]`; spec 04 mục "Toán" (`sign`, `verify`); `bai3Logic.thongDiep`; kiểm trong `p6a-check.test.mjs`.

### Thẻ 2 — `lang-khac-dau#1` — "Phép toán một chiều"
- **Kiến thức cần nhớ:** dễ đi xuôi, bất khả thi đi ngược. Trong toán: tính 5^x mod 23 thì nhanh, nhưng biết kết quả để tìm lại x thì cực khó.
- **Ví dụ:** Khóa riêng x = 12 cho khóa công khai 5^12 mod 23 = 18, tính rất nhanh. Nhưng nhìn riêng số 18 và hỏi "x là mấy?" thì phải thử từng số 1, 2, 3, … (với số nhỏ như 23 vẫn thử được; với số thật dài hàng chục chữ số thì không).
- **Câu hỏi (điền số):** Bạn An có khóa riêng x = 15. Khóa công khai của An là 5^15 mod 23. Khóa công khai của An là số nào?
- **Đáp án đúng:** `19`. **Cách viết chấp nhận:** `19` (có thể có khoảng trắng hai đầu hoặc dấu chấm cuối). Không nhận chữ hay số khác.
- **Giải thích:** Tính xuôi bằng cách nhân dần và lấy phần dư khi chia cho 23: 5^15 mod 23 = 19. Ngược lại, chỉ biết 19 mà muốn tìm x thì phải thử lần lượt 5^1, 5^2, … cho tới 5^15, tức là 15 lần thử. Với số nhỏ như trong bài thì thử được, nhưng khóa thật là số có hàng chục chữ số nên không thể thử hết. (Bài này dùng số nhỏ để em tự tính; Bitcoin dùng đường cong elip chứ không phải phép tính này.)
- **Nguồn đối chiếu:** `bai3Lesson.emCoBiet[1]`; spec 04 mục "Toán" (`publicKey(x) = modPow(5, x, 23)`); `PEOPLE` (An: khóa riêng 15, khóa công khai 19); `publicKey(15) = 19` và 15 lần thử trong `p6a-check.test.mjs`.

### Thẻ 3 — `lang-khac-dau#2` — "Cặp khóa trong Bitcoin (ECDSA)"
- **Kiến thức cần nhớ:** Bitcoin dùng đường cong elip secp256k1; khóa riêng là một số 256-bit (khoảng 77 chữ số thập phân), số khả năng lớn hơn cả số nguyên tử trong vũ trụ quan sát được (~10^80).
- **Ví dụ:** Có khoảng 1,16 × 10^77 khóa riêng khả dĩ. Một siêu máy tính thử 10^18 khóa mỗi giây vẫn cần khoảng 3,7 × 10^51 năm để thử hết, trong khi vũ trụ mới khoảng 13,8 tỷ năm tuổi.
- **Câu hỏi (ABCD):** Ở trạm Khó, em thử đoán khóa riêng với số nhỏ và tìm được. Vì sao kẻ gian không làm được như vậy với khóa riêng của Bitcoin?
  - A. Vì Bitcoin chỉ cho mỗi người thử đoán 3 lần
  - B. Vì số khóa khả dĩ quá lớn: ngay cả siêu máy tính thử 10^18 khóa mỗi giây cũng cần cỡ 3,7 × 10^51 năm
  - C. Vì khóa riêng được đổi mới mỗi giây
  - D. Vì khóa công khai che giấu hoàn toàn khóa riêng nên không cần thử
- **Đáp án đúng:** B.
- **Giải thích:** Khóa riêng được chọn trong khoảng 1,16 × 10^77 khả năng. Chia cho 10^18 lần thử mỗi giây vẫn ra cỡ 10^59 giây, tức khoảng 3,7 × 10^51 năm, quá lớn so với tuổi vũ trụ. Bitcoin không giới hạn số lần thử và khóa riêng không tự đổi; sự an toàn nằm ở độ lớn của không gian khóa. Đáp án D sai vì khóa công khai không "che" được khóa riêng một cách tuyệt đối: nó chỉ làm cho việc suy ngược quá tốn kém.
- **Nguồn đối chiếu:** `bai3Lesson.emCoBiet[2]`; spec 04 Mức Khó (Phần 2 "Số càng lớn, càng tuyệt vọng"); `bai3Logic.uocTinh` (1,16 × 10^77; 10^18 lần mỗi giây; 3,7 × 10^51 năm; 13,8 tỷ năm); phép chia kiểm trong `p6a-check.test.mjs`.

### Thẻ 4 — `lang-khac-dau#3` — "Mất khóa riêng là mất vĩnh viễn"
- **Kiến thức cần nhớ:** không có ngân hàng nào để "quên mật khẩu", không có tổng đài hỗ trợ; ước tính khoảng 3–4 triệu Bitcoin đã "chết vĩnh viễn" vì chủ nhân làm mất khóa riêng.
- **Ví dụ:** Em có ví chứa Bitcoin và nhớ rõ địa chỉ ví, nhưng đánh mất khóa riêng. Em vẫn thấy số dư trong ví, nhưng không còn cách nào ký giao dịch để chuyển số tiền đó đi.
- **Câu hỏi (ABCD):** Bạn Hoa làm mất khóa riêng của ví nhưng vẫn nhớ địa chỉ ví. Điều nào đúng?
  - A. Hoa gọi tổng đài của Bitcoin để được đặt lại khóa riêng
  - B. Hoa tính ngược từ khóa công khai ra khóa riêng bằng một công thức
  - C. Không ai, kể cả mạng blockchain, có thể khôi phục khóa riêng; Hoa không còn ký được giao dịch từ ví đó
  - D. Hoa chờ các node cấp lại khóa riêng mới cho cùng một ví
- **Đáp án đúng:** C.
- **Giải thích:** Mạng blockchain không giữ khóa riêng của ai và không có "người quản lý" để đặt lại. Khóa công khai và địa chỉ ví không thể tính ngược ra khóa riêng (phép toán một chiều ở thẻ 2), và các node chỉ kiểm chữ ký chứ không cấp khóa. Vì vậy khóa riêng phải cất giữ cẩn thận, không gửi lên mạng.
- **Nguồn đối chiếu:** `bai3Lesson.emCoBiet[3]`; spec 04 Mức Khó Phần 3 "Nếu em làm mất khóa riêng?"; `bai3Lesson.keyTakeaway`.

---

## 7. Làng Bạc — Bài 4 "Cây gộp sổ" (màn 10)

Nguồn chung: `docs/specs/giai-doan-1/05-bai4-merkle.md` (mục "Em có biết? (4 thẻ)", "Công thức & logic.ts": T_ab = T_a × 10 + T_b, bảng test `buildTree`); logic `lessons/bai-4/logic.ts` (`combine`, `buildTree`).

### Thẻ 1 — `lang-bac#0` — "Một khối chứa rất nhiều giao dịch."
- **Kiến thức cần nhớ:** cây Merkle "gói" tất cả giao dịch thành một con số duy nhất ở đỉnh, gọi là gốc Merkle (Merkle root).
- **Ví dụ:** Một trang sổ có 1.000 giao dịch. Thay vì đọc cả 1.000 giao dịch để so sánh, các node chỉ so con số gốc Merkle của trang.
- **Câu hỏi (ABCD):** Hai node muốn biết bản sao một trang sổ gồm 1.000 giao dịch của hai bên có giống nhau không. Theo cây Merkle, cách nhanh nhất là gì?
  - A. Đọc và so từng giao dịch một, đủ 1.000 lần
  - B. Chỉ so giao dịch đầu tiên của hai bản
  - C. So hai gốc Merkle, mỗi bên chỉ là một con số
  - D. So tên người đã ghi trang
- **Đáp án đúng:** C.
- **Giải thích:** Gốc Merkle đại diện cho cả trang, nên chỉ cần so một con số. Nếu hai gốc khác nhau thì hai bản chắc chắn khác nhau; nếu giống nhau thì trong cây Merkle thật (dùng hàm băm) hai bản coi như giống hệt. Công thức ghép trong bài chỉ để em học cách hình thành cây, chưa phải hàm băm thật nên về nguyên tắc có thể trùng ngẫu nhiên. So giao dịch đầu tiên (B) không đủ vì giao dịch khác vẫn có thể bị sửa.
- **Nguồn đối chiếu:** spec 05 thẻ 1; `bai4Lesson.emCoBiet[0]`.

### Thẻ 2 — `lang-bac#1` — "Cách tạo cây."
- **Kiến thức cần nhớ:** ghép từng cặp giao dịch thành giá trị mới, rồi lại ghép từng cặp giá trị mới, cho tới khi còn 1 giá trị (gốc). Công thức ghép trong bài là T_ab = T_a × 10 + T_b; thứ tự quan trọng (T_12 khác T_21).
- **Ví dụ:** Hai lá 3 và 7: T12 = 3 × 10 + 7 = 37, nhưng đảo thứ tự thì 7 × 10 + 3 = 73. Với 4 lá 4, 2, 6, 1: ghép được 42 và 61, rồi 42 × 10 + 61 = 481.
- **Câu hỏi (điền số):** Cây có 4 giao dịch lần lượt là 2, 5, 3, 8 (từ trái sang phải), ghép theo T_ab = T_a × 10 + T_b. Gốc của cây là số nào?
- **Đáp án đúng:** `288`. **Cách viết chấp nhận:** `288` (có thể có khoảng trắng hai đầu hoặc dấu chấm cuối). Không nhận chữ hay số khác.
- **Giải thích:** Ghép cặp từ trái sang phải: 2 và 5 thành 2 × 10 + 5 = 25; 3 và 8 thành 3 × 10 + 8 = 38. Rồi ghép hai giá trị đó theo đúng thứ tự: 25 × 10 + 38 = 288. Nếu em ra số khác, hãy kiểm lại thứ tự ghép: đổi vị trí hai giá trị trong một cặp thì kết quả khác (ví dụ 5 và 2 cho 52, không phải 25). Số ví dụ (4, 2, 6, 1) khác số của câu hỏi để em tự tính, không chép lại.
- **Nguồn đối chiếu:** spec 05 thẻ 2 và bảng test (`buildTree([3,7,5,2]) = [[3,7,5,2],[37,52],[422]]`); `bai4Lesson.emCoBiet[1]`; `buildTree([2,5,3,8])` ra gốc 288, `buildTree([4,2,6,1])` ra gốc 481 và đảo thứ tự ra 256, kiểm trong `p6a-check.test.mjs`.

### Thẻ 3 — `lang-bac#2` — "Giống bảng đấu loại trực tiếp."
- **Kiến thức cần nhớ:** 8 đội đá 4 trận tứ kết, 2 trận bán kết, 1 trận chung kết; mỗi cặp gộp thành 1 cho tới khi chỉ còn nhà vô địch ở đỉnh, giống cách cây Merkle gộp thành gốc.
- **Ví dụ:** Cây Merkle 8 lá có 4 + 2 + 1 = 7 phép ghép (4 ở tầng đầu, 2 ở tầng giữa, 1 ở tầng gốc), giống 7 trận để tìm ra nhà vô địch của 8 đội.
- **Câu hỏi (ABCD):** Một cây Merkle có 16 giao dịch (16 lá). Cần bao nhiêu phép ghép cặp để có gốc?
  - A. 15
  - B. 16
  - C. 8
  - D. 31
- **Đáp án đúng:** A.
- **Giải thích:** Tầng đầu ghép 16 lá thành 8 giá trị (8 phép), rồi 8 thành 4 (4 phép), 4 thành 2 (2 phép), 2 thành 1 (1 phép): 8 + 4 + 2 + 1 = 15. Như giải đấu 16 đội cần 15 trận. 31 là tổng số nút (16 lá và 15 nút ghép), còn câu hỏi chỉ hỏi số phép ghép. Bài này dùng số lá là lũy thừa của 2 cho đơn giản.
- **Nguồn đối chiếu:** spec 05 thẻ 3; `bai4Lesson.emCoBiet[2]`; đếm số nút ghép của `buildTree` cho 8 lá (7) và 16 lá (15) trong `p6a-check.test.mjs`.

### Thẻ 4 — `lang-bac#3` — "Để làm gì?"
- **Kiến thức cần nhớ:** chỉ cần sửa 1 giao dịch là gốc đổi ngay; gốc được ghi vào khối (trang sổ), nên node chỉ cần so 1 con số thay vì so từng giao dịch, và phát hiện sửa đổi rất nhanh.
- **Ví dụ:** Trang có 4 giao dịch 3, 7, 5, 2 cho gốc 422. {phanDien} đổi giao dịch thứ 3 từ 5 thành 9: ghép được 37 và 92, nên gốc mới là 37 × 10 + 92 = 462, khác 422.
- **Câu hỏi (ABCD):** Hai node so gốc Merkle của cùng một trang: gốc của node thứ nhất là 422, gốc của node thứ hai là 462. Em kết luận gì?
  - A. Chắc chắn giao dịch đầu tiên đã bị sửa
  - B. Node có gốc lớn hơn (462) giữ bản đúng
  - C. Hai bản giống nhau, chỉ khác cách ghi
  - D. Hai bản có ít nhất một giao dịch khác nhau, nhưng chưa biết là giao dịch nào
- **Đáp án đúng:** D.
- **Giải thích:** Gốc khác nhau cho biết chắc chắn hai bản không giống nhau, nhưng không cho biết giao dịch nào bị sửa và cũng không cho biết bản nào đúng (gốc lớn hơn không có nghĩa là đúng). Muốn tìm ra chỗ sửa thì đi xuống từ gốc theo các nhánh khác nhau, như em làm ở trạm Trung bình và ở màn "Leo cây tìm lá giả". Công thức trong bài là bản đơn giản; cây Merkle thật dùng hàm băm nên hai bản khác nhau gần như chắc chắn cho gốc khác nhau.
- **Nguồn đối chiếu:** spec 05 thẻ 4 và Mức Trung bình Phần C; `bai4Lesson.emCoBiet[3]`; `buildTree([3,7,5,2])` ra gốc 422 và `buildTree([3,7,9,2])` ra gốc 462 trong `p6a-check.test.mjs`.

---

## 8. Bảng tổng hợp 16 câu

| # | Làng | Khóa thẻ | Tiêu đề thẻ | Dạng | Đáp án đúng | Điều em cần hiểu |
|---|---|---|---|---|---|---|
| 1 | Giấy | `lang-giay#0` | Blockchain là một cuốn sổ. | ABCD | A | 8 trang nối tiếp là chuỗi 8 khối |
| 2 | Giấy | `lang-giay#1` | Mỗi trang có 2 phần. | ABCD | B | mã trang là "dấu vân tay" phát hiện sửa nội dung |
| 3 | Giấy | `lang-giay#2` | Cách tính mã trang. | Điền số | `44` | (43 × 2 + 58) mod 100 |
| 4 | Giấy | `lang-giay#3` | Vì sao khó sửa lén? | ABCD | C | sửa một trang kéo theo mọi trang sau |
| 5 | Dệt | `lang-det#0` | Node là ai? | ABCD | D | mỗi node có bản sổ đầy đủ giống hệt |
| 6 | Dệt | `lang-det#1` | Node làm gì khi có trang mới? | ABCD | A | kiểm cả mã trước và mã mới |
| 7 | Dệt | `lang-det#2` | Đa số đồng ý mới được ghi. | ABCD | C | 1 phiếu Đồng ý trong 3 chưa đủ |
| 8 | Dệt | `lang-det#3` | Vì sao an toàn hơn? | ABCD | B | một node sửa lén bị đa số phát hiện |
| 9 | Khắc Dấu | `lang-khac-dau#0` | Chữ ký trên giấy vs Chữ ký số | ABCD | A | đổi nội dung thì chữ ký không còn khớp |
| 10 | Khắc Dấu | `lang-khac-dau#1` | Phép toán một chiều | Điền số | `19` | 5^15 mod 23 |
| 11 | Khắc Dấu | `lang-khac-dau#2` | Cặp khóa trong Bitcoin (ECDSA) | ABCD | B | không gian khóa quá lớn |
| 12 | Khắc Dấu | `lang-khac-dau#3` | Mất khóa riêng là mất vĩnh viễn | ABCD | C | không ai khôi phục được khóa riêng |
| 13 | Bạc | `lang-bac#0` | Một khối chứa rất nhiều giao dịch. | ABCD | C | so một gốc thay vì 1.000 giao dịch |
| 14 | Bạc | `lang-bac#1` | Cách tạo cây. | Điền số | `288` | ghép cặp theo thứ tự: 25 và 38 → 288 |
| 15 | Bạc | `lang-bac#2` | Giống bảng đấu loại trực tiếp. | ABCD | A | 16 lá cần 15 phép ghép |
| 16 | Bạc | `lang-bac#3` | Để làm gì? | ABCD | D | gốc khác nhau: có chỗ khác, chưa biết chỗ nào |

Phân bố: 13 câu ABCD (A: 4, B: 3, C: 4, D: 2) và 3 câu điền số (44, 19, 288).

## 9. Điểm cần chủ dự án duyệt

1. **Thẻ thứ 5 của Làng Khắc Dấu** ("Địa chỉ ví chính là khóa công khai"): có trong nội dung nhưng không có cuộn trong làng (xem mục 3). Chọn một: (a) giữ 4 cuộn, thẻ 5 chỉ đọc ở `/ban-do` và không có câu hỏi; (b) soạn câu hỏi cho thẻ 5 (có bản nháp ở Phụ lục A); (c) thêm cuộn thứ 5 vào làng (đổi bố cục làng, ngoài phạm vi P6, cần bước riêng).
2. **Spec Bài 3 lệch nội dung đang dùng** (mục 3, điểm 2): tài liệu này theo nội dung trong code. Có cần cập nhật spec giai đoạn 1 Bài 3 cho khớp không?
3. **Số lần trả lời:** một lần rồi sang giải thích (dự kiến), hay cho thử lại tới khi đúng? Dự kiến một lần để luồng ngắn và giữ nguyên "trả lời sai vẫn nhận thẻ".
4. **Lưu câu trả lời:** dự kiến **không lưu** (không thêm cờ, không đổi `compact.ts`, `merge.ts`, `manager.ts`); thẻ chỉ có trạng thái nhặt như hiện nay. Nếu muốn lưu "đã trả lời đúng" thì phải thêm cờ và test, và sửa cả khách lẫn tài khoản.
5. **Xem lại thẻ đã nhặt (menu "Em có biết?"):** có hiện lại ví dụ và giải thích (không hỏi lại) hay chỉ hiện nội dung thẻ như hiện nay? Dự kiến hiện thẻ, ví dụ và giải thích, không hỏi lại.
6. **Thẻ đã đọc ở `/ban-do` (giới thiệu làng):** phần giới thiệu làng hiện đọc đủ thẻ như hiện nay; dự kiến **không** hỏi ở đó (chỉ hỏi khi nhặt cuộn trong làng) để giữ phần giới thiệu ngắn.
7. **Ví dụ hiện có:** Làng Dệt, Khắc Dấu, Bạc đã có trường `example`; ví dụ đề xuất ở đây bổ sung hay thay thế? Dự kiến thay bằng ví dụ đề xuất khi hai bên khác nhau, để ví dụ và câu hỏi khớp nhau.
8. **Thứ tự phương án ABCD:** dự kiến giữ cố định như tài liệu (đáp án đã rải đều). Nếu muốn xáo trộn khi hiển thị thì phải chọn cách xáo có seed để kiểm thử được.
9. **Cách chấm điền số:** dự kiến chuẩn hóa như mục 2; không nhận số có dấu phân cách ngàn. Có muốn nhận thêm cách viết khác (ví dụ "bốn mươi bốn") không? Dự kiến không.
10. **Lời giải thích ở chỗ có tên nhân vật:** đã dùng `{phanDien}`, `{cuBinh}`, `{coChi}`; mọi chữ khi tích hợp sẽ nằm trong `packages/core/src/content/` (ví dụ tệp `knowQuiz.ts`), và `pnpm check:text` phải sạch.
11. **Chữ "Hoa", "Khang", "Giang", "Minh" trong ví dụ Làng Giấy** là tên người dân trong sổ (lấy từ `bai3Names`), không phải nhân vật chính; có đồng ý dùng không?
12. **Mức độ khó:** 13 câu ABCD ở mức nhận biết và vận dụng một bước; 3 câu điền số cần tính hai bước. Chủ dự án xem có cần dễ hơn hoặc khó hơn cho học sinh THPT không.

## Phụ lục A — Bản nháp thẻ thứ 5 của Làng Khắc Dấu (KHÔNG tính trong 16 câu, chưa có cuộn)

### Thẻ 5 — `lang-khac-dau#4` (chưa có cuộn) — "Địa chỉ ví chính là khóa công khai"
- **Kiến thức cần nhớ:** khi ai đó xin "địa chỉ ví" để gửi tiền cho em, họ xin một dạng rút gọn của khóa công khai; cho người khác biết địa chỉ ví là an toàn: họ chỉ gửi tiền vào được, không rút ra được.
- **Ví dụ:** Khóa công khai giống số tài khoản ngân hàng (ai cũng có thể chuyển tiền vào), còn khóa riêng giống mật khẩu rút tiền (chỉ em biết).
- **Câu hỏi (ABCD):** Em gửi địa chỉ ví cho một bạn để bạn chuyển tiền vào. Điều nào đúng?
  - A. Bạn đó có thể rút tiền khỏi ví của em, vì đã biết địa chỉ
  - B. Bạn đó chỉ có thể gửi tiền vào ví, không rút được, vì rút tiền cần khóa riêng
  - C. Bạn đó rút được nếu biết em có bao nhiêu tiền
  - D. Em phải đổi địa chỉ ví ngay sau khi nhận tiền
- **Đáp án đúng:** B.
- **Giải thích:** Địa chỉ ví là dạng rút gọn của khóa công khai, chỉ dùng để nhận tiền và kiểm chữ ký. Rút hay chuyển tiền đi cần chữ ký tạo bằng khóa riêng, mà khóa riêng không thể tính ngược từ khóa công khai. Vì vậy có thể chia sẻ địa chỉ ví, nhưng không bao giờ chia sẻ khóa riêng.
- **Nguồn đối chiếu:** `bai3Lesson.emCoBiet[4]`.

## Phụ lục B — Kiểm tra số liệu

`scripts/p6a-check.test.mjs` (13 ca, chạy trong `pnpm test`) kiểm bằng logic sẵn có: `pageCode` (Giấy: 43, 44, 95, 99, 46; đáp án nhiễu 144, 101), `isValidProposal` (Dệt: 57/36/50 hợp lệ; 62/15/39 so với sổ mã 40 là `prev-mismatch`), `modPow`, `publicKey`, `sign`, `verify` (Khắc Dấu: `5^15 mod 23 = 19`, 15 lần thử, chữ ký không khớp với cả 21 giá trị k; phép chia ra ≈ 3,7 × 10^51 năm khớp `bai3Logic.uocTinh`), `buildTree`, `combine` (Bạc: gốc 288, 481, 256, 422, 462; 7 và 15 phép ghép cho 8 và 16 lá).

# P6a — Nội dung thẻ "Em có biết?" tương tác (BẢN NHÁP CHỜ CHỦ DỰ ÁN DUYỆT)

Trạng thái: **bản nháp nội dung, chưa tích hợp vào game** (không sửa thẻ gốc, không sửa mã). Bước P6b (tích hợp) chỉ làm sau khi chủ dự án duyệt tài liệu này.

Mỗi thẻ gốc ở `packages/core/src/content/lessons/bai-N.ts` (`emCoBiet`) được bổ sung: một ví dụ ngắn, một câu hỏi (ABCD hoặc điền số), đáp án đúng và lời giải thích. Chữ viết tiếng Việt có dấu, xưng "em". Tên nhân vật viết bằng chỗ giữ tên (`{phanDien}`, `{cuBinh}`, `{coChi}`, `{bacAn}`), không viết thẳng tên phản diện.

## 1. Luồng dự kiến (các lựa chọn dưới đây giữ nguyên theo đề xuất đã duyệt sơ bộ)

Khi em nhặt một cuộn "Em có biết?" trong làng:

1. **Đọc thẻ**: tiêu đề và nội dung thẻ (đã sửa theo dòng "Thẻ gốc" của từng thẻ).
2. **Xem ví dụ**: ví dụ ngắn của thẻ (khung riêng dưới nội dung, như trường `example` hiện có).
3. **Trả lời**: một câu hỏi. ABCD chọn một đáp án; điền số gõ một số vào ô văn bản (bàn phím số) rồi bấm "Kiểm tra".
4. **Xem giải thích**: hiện đáp án đúng và lời giải thích ngắn, **dù em trả lời đúng hay sai**. Trả lời sai: giải thích viết để em hiểu vì sao đáp án em chọn chưa đúng, không có chữ chê bai và không trừ gì.
5. **Nhận thẻ**: bấm "Cất vào sổ" như hiện nay; thẻ được cất vào sổ.

Các lựa chọn đã giữ:
- **16 thẻ nhặt được** (4 thẻ đầu mỗi làng, đúng 4 cuộn mỗi làng). Thẻ thứ 5 của Làng Khắc Dấu không có cuộn và chưa thêm cuộn.
- **Một lần trả lời** (chọn hoặc gõ xong là sang giải thích).
- **Trả lời sai vẫn nhận thẻ** sau phần giải thích. Không thêm điểm, xu, sao, huy chương, tim hay điều kiện thắng nào; không ảnh hưởng Trang Sổ Vàng hay luật mở màn.
- **Không lưu đáp án**: không thêm cờ, không đổi `compact.ts`, `merge.ts`, `manager.ts`; cờ `knowCards` giữ nguyên (nhặt xong là có thẻ).
- **Xem lại thẻ đã nhặt** (menu "Em có biết?"): hiện thẻ, ví dụ và giải thích, **không hỏi lại**.
- **Trang `/ban-do` (giới thiệu làng): không bắt trả lời**; phần giới thiệu vẫn chỉ đọc đủ thẻ như hiện nay.
- Tôn trọng "Giảm chuyển động" (không hiệu ứng bay/nhấp nháy khi báo đúng/sai) và "Chữ to"; mọi chữ nằm ở `packages/core/src/content/` khi tích hợp.

## 2. Quy ước trong tài liệu

- **Khóa thẻ**: `<id làng>#<số thứ tự từ 0>`, đúng chỉ số cuộn trong làng (`VillageScroll.index`) và bit của `knowCards`; nguồn chữ là `bai<N>Lesson.emCoBiet[<số>]`.
- **Điền số**: ghi rõ các cách viết được chấp nhận. Dự kiến chuẩn hóa: bỏ khoảng trắng hai đầu, bỏ dấu chấm cuối câu, nhận số viết liền (ví dụ `44`); **không** nhận số kèm chữ khác, số thập phân hay dấu phân cách ngàn trừ khi ghi rõ. **Cách nhập khi tích hợp:** dùng ô văn bản (`<input type="text">`) với bàn phím số (`inputMode="numeric"`), không dùng `<input type="number">`, để trình duyệt không tự đổi định dạng (dấu phẩy, số 0 đứng đầu, mũi tên tăng giảm, cuộn chuột đổi số) và quy tắc chuẩn hóa trên được thực hiện đúng; việc chuẩn hóa và chấm viết thành hàm thuần có test.
- **Phương án ABCD**: đúng một đáp án, độ dài gần nhau, vị trí đáp án đúng đã được rải đều (A: 4, B: 3, C: 4, D: 2 trong 13 câu ABCD) để không có "mẹo đoán".
- **Tính toán**: dùng đúng công thức và số liệu của bài (mod 100; p = 23, g = 5; T_ab = T_a × 10 + T_b). Mọi số trong tài liệu được tự kiểm bằng logic sẵn có trong `scripts/p6a-check.test.mjs` (16 ca, chạy trong `pnpm test`).
- **Không đánh đồng mô hình đơn giản trong game với mọi blockchain**: chỗ nào game đã đơn giản hóa thì giải thích có câu nói rõ "trong bài này" / "ở blockchain thật".

## 3. Phát hiện cần lưu ý trước khi duyệt

1. **Làng Khắc Dấu có 5 thẻ trong nội dung nhưng chỉ có 4 cuộn trong làng.** `bai3Lesson.emCoBiet` có 5 thẻ (thẻ thứ 5 "Địa chỉ ví chính là khóa công khai"); `LOCAL_VILLAGES['lang-khac-dau'].scrolls` chỉ có 4 cuộn (chỉ số 0 đến 3) và `scrollTotals` = 4, nên thẻ thứ 5 **không thể nhặt trong làng**; nó chỉ hiện ở phần giới thiệu làng trên `/ban-do` (thẻ 5/5). Tài liệu này soạn **16 thẻ nhặt được (4 thẻ đầu mỗi làng)** đúng yêu cầu; thẻ thứ 5 chỉ có bản nháp ở Phụ lục A để chủ dự án quyết định.
2. **Spec giai đoạn 1 của Bài 3 mô tả 5 thẻ khác với nội dung đang dùng** (bảng đối chiếu từng thẻ ở mục 6A; không mặc định bản code là đúng) (`docs/specs/giai-doan-1/04-bai3-khoa.md` mục "Em có biết? (5 thẻ)": cặp khóa; công thức g^x mod p; ký và kiểm; tính xuôi dễ ngược khó; "Thử ngay"). Nội dung trong code (đang chạy) là bản khác (chữ ký giấy và chữ ký số; phép toán một chiều; cặp khóa Bitcoin; mất khóa riêng; địa chỉ ví). Tài liệu này **theo nội dung đang dùng trong code**, đối chiếu công thức với spec và `lessons/bai-3/logic.ts`. Ba bài còn lại khớp spec về tiêu đề.
3. **Đã rà lại chữ của thẻ gốc** (bản rà ngày 30/10/2026): một số thẻ gốc có câu quá mạnh hoặc sai (ví dụ "lớn hơn số nguyên tử trong vũ trụ (~10^80)", "bất khả thi", ước tính "3–4 triệu Bitcoin", "mọi mã phía sau luôn đổi", "một con số Gốc Merkle là biết ngay toàn vẹn"). Mỗi thẻ có dòng **"Thẻ gốc"** ghi đề xuất sửa; **chưa sửa content chạy trong game**, và khi tích hợp (P6b) phải sửa thẻ gốc **cùng lúc** với thêm câu hỏi, để không hiện thẻ gốc sai rồi giải thích đúng.
4. Thẻ Làng Giấy không có trường `example` trong code (ví dụ nằm trong chữ của thẻ 3); thẻ Làng Dệt, Khắc Dấu, Bạc đã có `example`. Dưới đây mỗi thẻ có **một ví dụ đề xuất**; nếu duyệt thì thay hoặc bổ sung trường `example` hiện có khi tích hợp.

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
- **Thẻ gốc:** giữ nguyên (đã rà, không thấy câu sai; thẻ này không đổi chữ khi tích hợp).
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
- **Thẻ gốc:** giữ nguyên (đã rà, không thấy câu sai; thẻ này không đổi chữ khi tích hợp).
- **Nguồn đối chiếu:** spec 02 thẻ 2; `bai1Lesson.emCoBiet[1]`; `pageCode(10, 24) = 44` (kiểm trong `p6a-check.test.mjs`).

### Thẻ 3 — `lang-giay#2` — "Cách tính mã trang."
- **Kiến thức cần nhớ:** Mã trang = (Mã trang trước × 2 + Nội dung) mod 100; "mod 100" nghĩa là chỉ giữ 2 chữ số cuối.
- **Ví dụ:** Mã trước 57, nội dung 36: 57 × 2 + 36 = 150, giữ 2 chữ số cuối là 50, nên mã trang là 50.
- **Câu hỏi (điền số):** Mã trang trước là 43, nội dung của trang mới là 58. Mã trang mới là bao nhiêu?
- **Đáp án đúng:** `44`. **Cách viết chấp nhận:** `44` (có thể có khoảng trắng hai đầu hoặc dấu chấm cuối). Không nhận `144`, `044` hay chữ.
- **Giải thích:** 43 × 2 + 58 = 144, rồi chỉ giữ 2 chữ số cuối nên mã trang là 44. Nếu em ra 144 là em quên bước "mod 100"; nếu em ra 101 là em đã cộng 43 + 58 thay vì nhân đôi mã trước.
- **Thẻ gốc:** giữ nguyên (đã rà, không thấy câu sai; thẻ này không đổi chữ khi tích hợp).
- **Nguồn đối chiếu:** spec 02 thẻ 3 và mục "Quy ước & công thức"; `pageCode(43, 58) = 44` (`lib/chain.ts`).

### Thẻ 4 — `lang-giay#3` — "Vì sao khó sửa lén?"
- **Kiến thức cần nhớ:** mã trang sau được tính từ mã trang trước, nên sau khi sửa một trang phải kiểm tra và tính lại mã của các trang đứng sau nó. Blockchain thật dùng hàm băm (như SHA-256) phức tạp hơn nhiều, nhưng ý tưởng giống nhau.
- **Ví dụ:** Trang 1 có mã 10. Các trang 2, 3, 4 có nội dung 10, 0, 0 nên mã là 30, 60, 20. {phanDien} sửa nội dung trang 2 từ 10 thành 35: mã trang 2 thành 55, tính tiếp ra mã trang 3 là 10 (khác 60) và mã trang 4 là 20. Mã trang 4 lần này trùng với mã cũ vì phép "giữ 2 chữ số cuối", nhưng chỉ tính xong mới biết điều đó.
- **Câu hỏi (ABCD):** {phanDien} sửa nội dung trang 2 của một chuỗi 6 trang rồi tính lại mã trang 2 cho khớp. Em chưa biết mã nào phía sau sẽ đổi. Để chắc chắn chuỗi còn khớp công thức, em cần làm gì?
  - A. Không cần làm gì thêm, vì trang 2 đã khớp
  - B. Chỉ kiểm tra lại trang 1
  - C. Kiểm tra lần lượt từ trang 3: mỗi trang tính lại từ mã mới của trang trước, cho tới khi hết chuỗi hoặc gặp trang tính ra đúng mã đang ghi
  - D. Chỉ tính lại trang 3, rồi dừng dù mã trang 3 đã đổi
- **Đáp án đúng:** C.
- **Giải thích:** Trang 3 dùng mã của trang 2 để tính mã của mình, mà mã trang 2 đã đổi, nên phải tính lại trang 3; nếu mã trang 3 đổi thì trang 4 cũng phải tính lại, và cứ thế. Có thể dừng sớm khi một trang tính ra đúng mã đang ghi (như trang 4 trong ví dụ), vì từ đó các trang sau nhận lại mã cũ; nhưng không thể biết trước điều đó mà không tính. Trang 1 đứng trước trang 2 nên không bị ảnh hưởng. Vậy việc sửa lén kéo theo cả dãy việc phải làm, càng nhiều trang càng khó làm kịp. Không nên nghĩ "mọi mã phía sau chắc chắn đổi": phép "giữ 2 chữ số cuối" có thể làm một mã trùng lại.
- **Thẻ gốc (đề xuất sửa trước khi hiện, chưa sửa trong game):** thay câu "sửa một trang sẽ kéo theo phải sửa mọi trang phía sau" bằng: "Mã trang sau được tính từ mã trang trước, nên sửa một trang thì phải kiểm tra và tính lại mã của các trang đứng sau nó. Blockchain thật dùng "hàm băm" (như SHA-256) phức tạp hơn nhiều, nhưng ý tưởng giống hệt." (giữ "ý tưởng giống hệt" như cũ hay đổi thành "ý tưởng giống nhau": chủ dự án chọn.)
- **Nguồn đối chiếu:** spec 02 thẻ 4 và Mức Khó; `bai1Lesson.emCoBiet[3]`; `pageCode` (`lib/chain.ts`). Phản ví dụ kiểm trong `p6a-check.test.mjs`: mã trang 1 = 10, nội dung trang 2, 3, 4 là 10, 0, 0 cho mã 30, 60, 20; sửa trang 2 thành 35 cho mã 55, 10, 20. Không đổi công thức hay logic game.

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
- **Thẻ gốc:** giữ nguyên (đã rà, không thấy câu sai; thẻ này không đổi chữ khi tích hợp).
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
- **Thẻ gốc:** giữ nguyên (đã rà, không thấy câu sai; thẻ này không đổi chữ khi tích hợp).
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
- **Thẻ gốc:** giữ nguyên (đã rà, không thấy câu sai; thẻ này không đổi chữ khi tích hợp).
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
- **Thẻ gốc:** giữ nguyên (đã rà, không thấy câu sai; thẻ này không đổi chữ khi tích hợp).
- **Nguồn đối chiếu:** spec 03 thẻ 4; `bai2Lesson.emCoBiet[3]`.

---

## 6. Làng Khắc Dấu — Bài 3 "Khuôn riêng, mẫu chung" (màn 7)

Nguồn chung: `docs/specs/giai-doan-1/04-bai3-khoa.md` mục "Toán" (p = 23, g = 5, q = 22; `publicKey(x) = 5^x mod 23`; chữ ký `sign`/`verify`) và mục Mức Khó (đoán ngược khóa, ước tính số lớn); logic `lessons/bai-3/logic.ts`; số ước tính ở `bai3Logic.uocTinh` (`content/lessons/bai-3.ts`). Nội dung thẻ theo bản đang dùng trong code, **đã rà lại và đề xuất sửa** ở từng thẻ (xem bảng đối chiếu spec và code ở mục 6A; không mặc định bản nào đúng).

### Thẻ 1 — `lang-khac-dau#0` — "Chữ ký trên giấy vs Chữ ký số"
- **Kiến thức cần nhớ:** chữ ký trên giấy dễ bị tập đồ hoặc sao chép; chữ ký số được tính từ chính nội dung giao dịch, nên đổi dù chỉ một chữ số trong nội dung thì chữ ký cũ không còn khớp. Ai cũng kiểm được chữ ký bằng khóa công khai mà không cần biết khóa riêng.
- **Ví dụ:** Em ký giao dịch "Chuyển 3 xu cho An". Nếu {phanDien} sửa thành "Chuyển 300 xu cho An" mà giữ nguyên chữ ký, người kiểm bằng khóa công khai của em sẽ thấy chữ ký không khớp với nội dung mới.
- **Câu hỏi (ABCD):** Em ký "Chuyển 3 xu cho An". {phanDien} đổi nội dung thành "Chuyển 300 xu cho An" và giữ nguyên chữ ký của em. Khi người khác kiểm chữ ký bằng khóa công khai của em, điều gì xảy ra?
  - A. Chữ ký không còn khớp với nội dung mới, nên giao dịch bị từ chối
  - B. Chữ ký vẫn khớp, vì đó là chữ ký của em
  - C. Chữ ký vẫn khớp nếu {phanDien} biết khóa công khai của em
  - D. Chữ ký vẫn khớp nếu số tiền mới lớn hơn số tiền cũ
- **Đáp án đúng:** A.
- **Giải thích:** Chữ ký số được tính từ cả khóa riêng của em và chính nội dung giao dịch, nên nội dung đổi thì chữ ký cũ không còn đúng; {phanDien} không thể dán chữ ký cũ vào nội dung khác. Biết khóa công khai không giúp được, vì khóa công khai chỉ dùng để kiểm, không để ký. Số tiền lớn hay nhỏ không liên quan. (Với đúng hai câu này, mô hình thu nhỏ của bài cho kết quả không khớp ở cả 21 giá trị k đã thử. Mô hình thu nhỏ dùng số rất nhỏ nên về nguyên tắc có thể có trường hợp trùng ngẫu nhiên; chữ ký thật dùng hàm băm 256-bit nên không đáng kể.)
- **Thẻ gốc (đề xuất sửa nhẹ trước khi hiện):** thay "sẽ lập tức vô hiệu!" bằng "sẽ không còn khớp"; thêm một câu "Ai cũng kiểm được chữ ký bằng khóa công khai, không cần biết khóa riêng" (ý thẻ 3 của spec, xem mục 6A). Ví dụ gốc "Kẻ gian không thể cắt chữ ký từ giấy này dán sang giấy khác…" có thể giữ.
- **Nguồn đối chiếu:** `bai3Lesson.emCoBiet[0]`; spec 04 mục "Toán" (`sign`, `verify`) và thẻ 3 của spec; `bai3Logic.thongDiep`; kiểm trong `p6a-check.test.mjs`.

### Thẻ 2 — `lang-khac-dau#1` — "Phép toán một chiều"
- **Kiến thức cần nhớ:** tính xuôi thì nhanh, tính ngược thì khó. Trong toán: tính 5^x mod 23 thì nhanh; nhưng chỉ biết kết quả mà muốn tìm lại x thì không có công thức trực tiếp đơn giản, có thể phải thử, và với số rất lớn thì số lần thử là quá nhiều.
- **Ví dụ:** Khóa riêng x = 12 cho khóa công khai 5^12 mod 23 = 18, tính rất nhanh. Nếu chỉ biết 18 và thử tuần tự x = 1, 2, 3, … thì phải tới x = 12 mới ra 18. Với số nhỏ như 23 thì thử được; với số rất lớn thì số lần thử quá nhiều.
- **Câu hỏi (điền số):** Bạn An có khóa riêng x = 15. Khóa công khai của An là 5^15 mod 23. Khóa công khai của An là số nào?
- **Đáp án đúng:** `19`. **Cách viết chấp nhận:** `19` (có thể có khoảng trắng hai đầu hoặc dấu chấm cuối). Không nhận chữ hay số khác.
- **Giải thích:** Tính xuôi bằng cách nhân dần và lấy phần dư khi chia cho 23: 5^15 mod 23 = 19. Ngược lại, nếu chỉ biết 19 và thử tuần tự x = 1, 2, 3, … thì tới x = 15 mới ra 19, tức là 15 lần thử. Đây chỉ là cách thử đơn giản nhất, không phải cách duy nhất để tìm ngược; với p = 23 rất nhỏ thì làm được, còn với số rất lớn thì số lần thử quá nhiều và chưa biết cách nào đủ nhanh. (Bài này dùng số nhỏ để em tự tính; Bitcoin không dùng đúng phép tính này.)
- **Thẻ gốc (đề xuất sửa trước khi hiện):** thay "Dễ đi xuôi, bất khả thi đi ngược" bằng "Dễ đi xuôi, khó đi ngược"; thay câu "biết kết quả tìm lại x thì cực khó" bằng "chỉ biết kết quả mà muốn tìm lại x thì phải thử, và với số rất lớn thì số lần thử là quá nhiều"; thay ví dụ "…bảo tìm lại 12 thì phải thử từng số một!" bằng ví dụ ở trên (nói rõ thử tuần tự từ 1 và số nhỏ thử được).
- **Nguồn đối chiếu:** `bai3Lesson.emCoBiet[1]`; spec 04 mục "Toán" (`publicKey(x) = modPow(5, x, 23)`) và Mức Khó Phần 1 "Đoán khóa với số nhỏ"; `PEOPLE` (An: khóa riêng 15, khóa công khai 19); `publicKey(15) = 19`, 15 lần thử tuần tự từ 1 (19) và 12 lần (18) trong `p6a-check.test.mjs`.

### Thẻ 3 — `lang-khac-dau#2` — "Cặp khóa trong Bitcoin" (đề xuất đổi tiêu đề; hiện là "Cặp khóa trong Bitcoin (ECDSA)")
- **Kiến thức cần nhớ:** Bitcoin dùng mật mã đường cong elip (đường cong secp256k1) cho cặp khóa; khóa riêng là một số 256-bit, tức khoảng 1,16 × 10^77 giá trị (khoảng 77 chữ số thập phân), nên không thể đoán bằng cách thử lần lượt từng khóa. Chữ ký trong Bitcoin có hai kiểu, ECDSA và Schnorr; không chỉ có ECDSA. (Chủ dự án/giáo viên cần xác nhận lại câu này với nguồn đáng tin trước khi đưa vào thẻ.)
- **Ví dụ:** Có khoảng 1,16 × 10^77 khóa riêng khả dĩ. Giả sử một máy thử 10^18 khóa mỗi giây (con số giả định rất lớn): duyệt hết cả không gian khóa cũng mất cỡ 3,7 × 10^51 năm, trong khi vũ trụ khoảng 13,8 tỷ năm tuổi.
- **Câu hỏi (ABCD):** Ở trạm Khó, em thử đoán khóa riêng với số nhỏ và tìm được. Vì sao thử lần lượt từng khóa không thực tế với khóa riêng 256-bit của Bitcoin?
  - A. Vì Bitcoin chỉ cho mỗi người thử đoán 3 lần
  - B. Vì số khóa khả dĩ quá lớn: ngay cả với tốc độ giả định 10^18 khóa mỗi giây, duyệt hết cũng cỡ 3,7 × 10^51 năm
  - C. Vì khóa riêng được đổi mới mỗi giây
  - D. Vì khóa công khai che giấu hoàn toàn khóa riêng nên không cần thử
- **Đáp án đúng:** B.
- **Giải thích:** Khóa riêng được chọn trong khoảng 1,16 × 10^77 khả năng. Chia cho 10^18 lần thử mỗi giây ra cỡ 10^59 giây, tức khoảng 3,7 × 10^51 năm. Đây chỉ là ước tính cho cách duyệt hết không gian khóa ở tốc độ giả định, không phải mô tả mọi cách tấn công; an toàn của Bitcoin còn dựa trên thiết kế mật mã và việc giữ khóa riêng kín. Bitcoin không giới hạn số lần thử và khóa riêng không tự đổi. Đáp án D sai: khóa công khai không "che hoàn toàn" khóa riêng, nó chỉ khiến việc suy ngược quá tốn kém.
- **Thẻ gốc (đề xuất sửa trước khi hiện):** (1) đổi tiêu đề thành "Cặp khóa trong Bitcoin"; (2) **bỏ** câu "Số khả năng lớn hơn cả số nguyên tử trong toàn bộ vũ trụ quan sát được (~10^80)!" vì sai: 2^256 ≈ 1,16 × 10^77 nhỏ hơn 10^80; thay bằng "Đó là một con số khổng lồ, cỡ 10^77"; (3) thay "Bitcoin dùng đường cong elip secp256k1" bằng câu nêu rõ hai kiểu chữ ký như trên (sau khi xác nhận nguồn); (4) ví dụ gốc (số 115.792.089.237.316.195.423.570.985.008.687.907.853.269.984.665.640.564.039.457.584.007.913.129.639.936) đúng là 2^256, có thể giữ và thêm "≈ 1,16 × 10^77".
- **Nguồn đối chiếu:** `bai3Lesson.emCoBiet[2]`; spec 04 Mức Khó (Phần 2 "Số càng lớn, càng tuyệt vọng"); `bai3Logic.uocTinh` (1,16 × 10^77; 10^18 lần mỗi giây; 3,7 × 10^51 năm; 13,8 tỷ năm); `p6a-check.test.mjs` kiểm 2^256 ≈ 1,16 × 10^77 < 10^80, ví dụ gốc đúng bằng 2^256 và phép chia ≈ 3,7 × 10^51 năm.

### Thẻ 4 — `lang-khac-dau#3` — "Mất khóa riêng là mất vĩnh viễn"
- **Kiến thức cần nhớ:** với ví tự quản (chính em giữ khóa riêng) thì không có ngân hàng để "quên mật khẩu" và không có tổng đài hỗ trợ. Nếu em mất mọi bản sao của khóa riêng (và cụm từ khôi phục, nếu có) và không còn cơ chế khôi phục nào khác thì không còn cách ký giao dịch, nên số tiền trong ví không chi tiêu được nữa. Ví do sàn giữ hộ hay còn bản sao lưu thì khác.
- **Ví dụ:** Em có ví tự quản chứa Bitcoin và nhớ rõ địa chỉ ví, nhưng đánh mất mọi bản sao khóa riêng và cụm từ khôi phục. Em vẫn thấy số dư của địa chỉ đó, nhưng không còn cách nào ký giao dịch để chuyển số tiền đi.
- **Câu hỏi (ABCD):** Hoa dùng ví tự quản (chính Hoa giữ khóa riêng). Hoa mất mọi bản sao khóa riêng và cụm từ khôi phục, không còn cơ chế khôi phục nào khác, nhưng vẫn nhớ địa chỉ ví. Điều nào đúng?
  - A. Hoa gọi tổng đài của Bitcoin để được đặt lại khóa riêng
  - B. Hoa dùng một công thức để tính ngược khóa riêng từ địa chỉ ví
  - C. Không ai, kể cả mạng blockchain, khôi phục được khóa riêng thay Hoa; Hoa không còn ký được giao dịch từ ví đó
  - D. Hoa chờ các node cấp lại khóa riêng mới cho cùng một ví
- **Đáp án đúng:** C.
- **Giải thích:** Câu hỏi giả định ví tự quản, mất mọi bản sao khóa/cụm khôi phục và không còn cơ chế khôi phục. Khi đó mạng blockchain không giữ khóa riêng của ai và không có "người quản lý" để đặt lại; các node chỉ kiểm chữ ký chứ không cấp khóa. Không có cách thực tế để tính ngược khóa riêng từ địa chỉ hay khóa công khai. Nếu Hoa còn một bản sao lưu hay cụm từ khôi phục, hoặc ví do một dịch vụ giữ hộ có cách xác minh riêng, thì tình huống khác. Vì vậy khóa riêng cần được sao lưu cẩn thận và không gửi lên mạng.
- **Thẻ gốc (đề xuất sửa trước khi hiện):** (1) thêm giả định "với ví tự quản … nếu mất mọi bản sao khóa riêng và cụm từ khôi phục, không còn cơ chế khôi phục"; (2) **bỏ** câu ước tính "khoảng 3–4 triệu Bitcoin (trị giá hàng trăm tỷ USD) đã bị 'chết vĩnh viễn'" vì chưa có nguồn đáng tin trong tài liệu dự án (chỉ đưa lại nếu chủ dự án cung cấp nguồn, ghi rõ ngày và là ước tính); (3) ví dụ gốc "Hãy ghi khóa riêng ra giấy và cất vào nơi an toàn nhất, tuyệt đối không gửi lên mạng" có thể giữ.
- **Nguồn đối chiếu:** `bai3Lesson.emCoBiet[3]`; spec 04 Mức Khó Phần 3 "Nếu em làm mất khóa riêng?"; `bai3Lesson.keyTakeaway`.

---

## 6A. Bảng đối chiếu 5 thẻ Làng Khắc Dấu: spec và code (không mặc định bản nào đúng)

Spec: `docs/specs/giai-doan-1/04-bai3-khoa.md` mục "Em có biết? (5 thẻ)" (nội dung cũ). Code: `bai3Lesson.emCoBiet` (nội dung hiện có, đang chạy). Hai bên **không cùng một bộ ý**, nên bảng xếp theo số thứ tự và ghi ý tương ứng.

| # | Nội dung cũ (spec 04) | Nội dung hiện có (code) | Đề xuất | Lý do |
|---|---|---|---|---|
| 1 | "Mỗi người có một cặp khóa": khóa riêng bí mật như chữ ký tay; khóa công khai ai cũng xem được như tên in trên bảng tên | "Chữ ký trên giấy vs Chữ ký số" (ý khác; cặp khóa không có thẻ riêng) | **Giữ thẻ code, sửa nhẹ** (thêm một câu về cặp khóa vào ví dụ). Cân nhắc đưa "cặp khóa" thành thẻ riêng: xem điểm 1 mục 9 | Cặp khóa là nền tảng nhưng đã được chú Dũng và trạm Dễ dạy; thẻ code gắn chữ ký với nội dung, ý hay còn thiếu cách nói "kiểm bằng khóa công khai" |
| 2 | "Khóa công khai được tạo từ khóa riêng": publicKey = g^x mod p, g = 5, p = 23; ví dụ khóa riêng 3 → 5³ = 125, 125 mod 23 = 10 | "Phép toán một chiều": 5^x mod 23; ví dụ 5^12 mod 23 = 18 | **Sửa**: giữ thẻ code, nêu rõ g = 5, p = 23 và "khóa công khai tạo từ khóa riêng"; bỏ "bất khả thi" | Công thức của spec đúng (5³ mod 23 = 10, kiểm trong test); thẻ code đúng ví dụ nhưng nói "bất khả thi" quá mạnh với p = 23 vì thử được |
| 3 | "Ký bằng khóa riêng, kiểm bằng khóa công khai": ai cũng kiểm chữ ký mà không cần biết khóa riêng | "Cặp khóa trong Bitcoin (ECDSA)": khóa 256-bit, "lớn hơn số nguyên tử vũ trụ (~10^80)" | **Sửa thẻ code**: bỏ so sánh sai với 10^80, đổi tiêu đề, không nói chỉ có ECDSA; ý "ký và kiểm" đưa vào thẻ 1 | Câu 10^80 sai (2^256 ≈ 1,16 × 10^77 < 10^80); Bitcoin có ECDSA và Schnorr; ý của spec là cốt lõi của bài nhưng thẻ code không còn nêu |
| 4 | "Tính xuôi dễ, tính ngược cực khó": số dài hàng chục chữ số thì "mọi máy tính trên thế giới cộng lại cũng không làm nổi"; Bitcoin dùng công thức "họ hàng" (đường cong elip) | "Mất khóa riêng là mất vĩnh viễn": "3–4 triệu Bitcoin đã chết vĩnh viễn" | **Giữ ý thẻ code, sửa**: thêm giả định ví tự quản và mất mọi bản sao/cụm khôi phục; bỏ ước tính 3–4 triệu Bitcoin chưa có nguồn. **Không dùng** câu "mọi máy tính cộng lại cũng không làm nổi" của spec | Mất khóa là ý thực tế có giá trị giáo dục nhưng cần giả định rõ; câu của spec là khẳng định tuyệt đối không có số liệu (đã thay bằng ước tính có giả định ở thẻ 3) |
| 5 | "Thử ngay!": lời mời vào mức Dễ | "Địa chỉ ví chính là khóa công khai" (thẻ không có cuộn) | **Bỏ thẻ "Thử ngay"** (lời mời, không phải kiến thức). Thẻ code giữ nhưng **sửa tiêu đề và nội dung** (Phụ lục A); chưa thêm cuộn thứ 5 | "Địa chỉ ví" thường được tạo từ khóa công khai (không đồng nhất với nó); công khai địa chỉ có thể ảnh hưởng riêng tư |

Ý chính: ba ý của spec (cặp khóa; công thức g^x mod p; ký và kiểm) là nền tảng của bài, còn code thay bằng ba ý đời thực (chữ ký số, Bitcoin, mất khóa) và thêm địa chỉ ví. **Đề xuất**: giữ 4 thẻ nhặt được theo code (đúng yêu cầu 16 thẻ) với các sửa ở trên, đồng thời **dồn ý "ký bằng khóa riêng, kiểm bằng khóa công khai" và "khóa công khai tạo từ khóa riêng" vào thẻ 1 và thẻ 2** để không mất ý cốt lõi. Nếu chủ dự án muốn bám spec hơn, phương án thay thế là đổi thẻ 3 (Bitcoin) thành "Ký bằng khóa riêng, kiểm bằng khóa công khai" và dời ý Bitcoin xuống phần ví dụ; việc đó đổi nội dung thẻ nên cần duyệt riêng (xem mục 9).

---

## 7. Làng Bạc — Bài 4 "Cây gộp sổ" (màn 10)

Nguồn chung: `docs/specs/giai-doan-1/05-bai4-merkle.md` (mục "Em có biết? (4 thẻ)", "Công thức & logic.ts": T_ab = T_a × 10 + T_b, bảng test `buildTree`); logic `lessons/bai-4/logic.ts` (`combine`, `buildTree`).

### Thẻ 1 — `lang-bac#0` — "Một khối chứa rất nhiều giao dịch."
- **Kiến thức cần nhớ:** cây Merkle "gói" tất cả giao dịch thành một con số duy nhất ở đỉnh, gọi là gốc Merkle (Merkle root). Muốn so gốc của hai bản thì hai bên phải tính gốc theo cùng quy tắc ghép và cùng thứ tự giao dịch.
- **Ví dụ:** Một trang sổ có 1.000 giao dịch. Hai node đã tính gốc theo cùng quy tắc và cùng thứ tự; thay vì đọc cả 1.000 giao dịch để so sánh, họ so con số gốc Merkle của hai bản.
- **Câu hỏi (ABCD):** Hai node đã tính gốc Merkle của cùng một trang gồm 1.000 giao dịch, theo cùng quy tắc ghép và cùng thứ tự giao dịch. Để biết nhanh hai bản có khác nhau không, họ nên làm gì?
  - A. Đọc và so từng giao dịch một, đủ 1.000 lần
  - B. Chỉ so giao dịch đầu tiên của hai bản
  - C. So hai gốc đã tính, mỗi bên chỉ là một con số
  - D. So tên người đã ghi trang
- **Đáp án đúng:** C.
- **Giải thích:** Gốc Merkle tóm tắt cả trang, nên chỉ cần so hai con số (sau khi mỗi bên đã tính xong gốc, theo cùng quy tắc và thứ tự). Nếu hai gốc khác nhau thì chắc chắn hai bản không giống nhau. Nếu hai gốc giống nhau thì với cây Merkle thật (dùng hàm băm) coi như hai bản giống hệt, vì khả năng hai bản khác nhau mà cùng gốc cực nhỏ. Công thức ghép số của bài chỉ để học cách hình thành cây, không phải hàm băm thật nên có thể trùng: lá (1, 20) và lá (2, 10) đều ghép ra 30. So giao dịch đầu tiên (B) không đủ vì giao dịch khác vẫn có thể bị sửa.
- **Thẻ gốc (đề xuất sửa trước khi hiện):** câu ví dụ "chỉ cần một con số Gốc Merkle là đại diện được cho tất cả!" thêm điều kiện: "…đại diện cho tất cả giao dịch của trang khi hai bên tính theo cùng quy tắc và cùng thứ tự". Thêm một câu: "Trong bài, công thức ghép chỉ để học; cây Merkle thật dùng hàm băm."
- **Nguồn đối chiếu:** spec 05 thẻ 1; `bai4Lesson.emCoBiet[0]`; `combine(1, 20) = combine(2, 10) = 30` và `buildTree` cho hai bộ lá khác nhau cùng gốc, kiểm trong `p6a-check.test.mjs`.

### Thẻ 2 — `lang-bac#1` — "Cách tạo cây."
- **Kiến thức cần nhớ:** ghép từng cặp giao dịch thành giá trị mới, rồi lại ghép từng cặp giá trị mới, cho tới khi còn 1 giá trị (gốc). Công thức ghép trong bài là T_ab = T_a × 10 + T_b; thứ tự quan trọng (T_12 khác T_21).
- **Ví dụ:** Hai lá 3 và 7: T12 = 3 × 10 + 7 = 37, nhưng đảo thứ tự thì 7 × 10 + 3 = 73. Với 4 lá 4, 2, 6, 1: ghép được 42 và 61, rồi 42 × 10 + 61 = 481.
- **Câu hỏi (điền số):** Cây có 4 giao dịch lần lượt là 2, 5, 3, 8 (từ trái sang phải), ghép theo T_ab = T_a × 10 + T_b. Gốc của cây là số nào?
- **Đáp án đúng:** `288`. **Cách viết chấp nhận:** `288` (có thể có khoảng trắng hai đầu hoặc dấu chấm cuối). Không nhận chữ hay số khác.
- **Giải thích:** Ghép cặp từ trái sang phải: 2 và 5 thành 2 × 10 + 5 = 25; 3 và 8 thành 3 × 10 + 8 = 38. Rồi ghép hai giá trị đó theo đúng thứ tự: 25 × 10 + 38 = 288. Nếu em ra số khác, hãy kiểm lại thứ tự ghép: đổi vị trí hai giá trị trong một cặp thì kết quả khác (ví dụ 5 và 2 cho 52, không phải 25). Số ví dụ (4, 2, 6, 1) khác số của câu hỏi để em tự tính, không chép lại.
- **Thẻ gốc:** giữ nguyên (đã rà, không thấy câu sai; thẻ này không đổi chữ khi tích hợp).
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
- **Thẻ gốc:** giữ nguyên (đã rà, không thấy câu sai; thẻ này không đổi chữ khi tích hợp).
- **Nguồn đối chiếu:** spec 05 thẻ 3; `bai4Lesson.emCoBiet[2]`; đếm số nút ghép của `buildTree` cho 8 lá (7) và 16 lá (15) trong `p6a-check.test.mjs`.

### Thẻ 4 — `lang-bac#3` — "Để làm gì?"
- **Kiến thức cần nhớ:** chỉ cần sửa 1 giao dịch là gốc đổi (khi tính cùng quy tắc, cùng thứ tự). Gốc được ghi vào khối (trang sổ), nên node chỉ cần so 1 con số thay vì so từng giao dịch, và phát hiện sửa đổi rất nhanh. Gốc khác nhau thì chắc chắn có khác biệt; gốc giống nhau thì với hàm băm thật coi như dữ liệu giống nhau, còn công thức ghép số của bài chỉ để học.
- **Ví dụ:** Trang có 4 giao dịch 3, 7, 5, 2 cho gốc 422. {phanDien} đổi giao dịch thứ 3 từ 5 thành 9: ghép được 37 và 92, nên gốc mới là 37 × 10 + 92 = 462, khác 422.
- **Câu hỏi (ABCD):** Hai node đã tính gốc Merkle của cùng một trang theo cùng quy tắc ghép và cùng thứ tự giao dịch: gốc của node thứ nhất là 422, gốc của node thứ hai là 462. Em kết luận gì?
  - A. Chắc chắn giao dịch đầu tiên đã bị sửa
  - B. Node có gốc lớn hơn (462) giữ bản đúng
  - C. Hai bản giống nhau, chỉ khác cách ghi
  - D. Hai bản có ít nhất một giao dịch khác nhau, nhưng chưa biết là giao dịch nào
- **Đáp án đúng:** D.
- **Giải thích:** Hai gốc tính cùng quy tắc, cùng thứ tự mà khác nhau cho biết chắc chắn hai bản không giống nhau, nhưng không cho biết giao dịch nào bị sửa và cũng không cho biết bản nào đúng (gốc lớn hơn không có nghĩa là đúng). Muốn tìm ra chỗ sửa thì đi xuống từ gốc theo các nhánh khác nhau, như em làm ở trạm Trung bình và ở màn "Leo cây tìm lá giả". Ngược lại, hai gốc giống nhau chưa phải chứng minh tuyệt đối hai bản giống hệt: với hàm băm thật xác suất trùng cực nhỏ nên được coi là giống, còn công thức ghép số của bài thì có thể trùng (ví dụ lá 1, 20 và lá 2, 10 đều cho 30).
- **Thẻ gốc (đề xuất sửa trước khi hiện):** ví dụ gốc "chỉ cần so khớp 1 con số Gốc Merkle là biết ngay tính toàn vẹn của cả trang" sửa thành "…so gốc đã tính cùng quy tắc: gốc khác nhau thì chắc chắn có khác biệt; gốc giống nhau thì (với hàm băm thật) coi như trang giống nhau". Câu "phát hiện sửa đổi rất nhanh" giữ được.
- **Nguồn đối chiếu:** spec 05 thẻ 4 và Mức Trung bình Phần C; `bai4Lesson.emCoBiet[3]`; `buildTree([3,7,5,2])` ra gốc 422 và `buildTree([3,7,9,2])` ra gốc 462 (cùng thứ tự), phản ví dụ trùng gốc trong `p6a-check.test.mjs`.

---

## 8. Bảng tổng hợp 16 câu

| # | Làng | Khóa thẻ | Tiêu đề thẻ | Dạng | Đáp án đúng | Điều em cần hiểu |
|---|---|---|---|---|---|---|
| 1 | Giấy | `lang-giay#0` | Blockchain là một cuốn sổ. | ABCD | A | 8 trang nối tiếp là chuỗi 8 khối |
| 2 | Giấy | `lang-giay#1` | Mỗi trang có 2 phần. | ABCD | B | mã trang là "dấu vân tay" phát hiện sửa nội dung |
| 3 | Giấy | `lang-giay#2` | Cách tính mã trang. | Điền số | `44` | (43 × 2 + 58) mod 100 |
| 4 | Giấy | `lang-giay#3` | Vì sao khó sửa lén? | ABCD | C | sau khi sửa một trang phải kiểm tra/tính lại các trang sau (mã có thể trùng lại nhờ mod) |
| 5 | Dệt | `lang-det#0` | Node là ai? | ABCD | D | mỗi node có bản sổ đầy đủ giống hệt |
| 6 | Dệt | `lang-det#1` | Node làm gì khi có trang mới? | ABCD | A | kiểm cả mã trước và mã mới |
| 7 | Dệt | `lang-det#2` | Đa số đồng ý mới được ghi. | ABCD | C | 1 phiếu Đồng ý trong 3 chưa đủ |
| 8 | Dệt | `lang-det#3` | Vì sao an toàn hơn? | ABCD | B | một node sửa lén bị đa số phát hiện |
| 9 | Khắc Dấu | `lang-khac-dau#0` | Chữ ký trên giấy vs Chữ ký số | ABCD | A | đổi nội dung thì chữ ký không còn khớp |
| 10 | Khắc Dấu | `lang-khac-dau#1` | Phép toán một chiều | Điền số | `19` | 5^15 mod 23; ngược lại 15 lần thử tuần tự từ 1 (không phải cách duy nhất) |
| 11 | Khắc Dấu | `lang-khac-dau#2` | Cặp khóa trong Bitcoin (đề xuất bỏ "(ECDSA)") | ABCD | B | duyệt hết không gian khóa là không thực tế (ước tính ở tốc độ giả định) |
| 12 | Khắc Dấu | `lang-khac-dau#3` | Mất khóa riêng là mất vĩnh viễn | ABCD | C | ví tự quản + mất mọi bản sao/cụm khôi phục: không khôi phục được |
| 13 | Bạc | `lang-bac#0` | Một khối chứa rất nhiều giao dịch. | ABCD | C | so hai gốc đã tính cùng quy tắc và thứ tự |
| 14 | Bạc | `lang-bac#1` | Cách tạo cây. | Điền số | `288` | ghép cặp theo thứ tự: 25 và 38 → 288 |
| 15 | Bạc | `lang-bac#2` | Giống bảng đấu loại trực tiếp. | ABCD | A | 16 lá cần 15 phép ghép |
| 16 | Bạc | `lang-bac#3` | Để làm gì? | ABCD | D | gốc khác (cùng quy tắc, thứ tự): có chỗ khác, chưa biết chỗ nào |

Phân bố: 13 câu ABCD (A: 4, B: 3, C: 4, D: 2) và 3 câu điền số (44, 19, 288).

## 9. Điểm cần chủ dự án duyệt

**Đã giữ theo đề xuất (không cần duyệt lại trừ khi muốn đổi):** 16 thẻ nhặt được; một lần trả lời; sai vẫn nhận thẻ; không lưu đáp án; xem lại có ví dụ và giải thích, không hỏi lại; `/ban-do` không bắt trả lời; điền số dùng ô văn bản với bàn phím số và chuẩn hóa như mục 2 (không nhận số có dấu phân cách ngàn, không nhận chữ).

**Cần duyệt:**
1. **Bộ thẻ Làng Khắc Dấu** (mục 6A): giữ 4 thẻ theo code với các sửa đã ghi và dồn ý "ký/kiểm" và "khóa công khai tạo từ khóa riêng" vào thẻ 1 và 2 (đề xuất), hay bám spec hơn (đổi thẻ 3 thành "Ký bằng khóa riêng, kiểm bằng khóa công khai")? Có cập nhật spec giai đoạn 1 Bài 3 cho khớp không?
2. **Thẻ thứ 5 của Làng Khắc Dấu**: giữ 4 cuộn, thẻ 5 chỉ đọc ở `/ban-do` và không có câu hỏi (đề xuất, và sửa tiêu đề/nội dung ở Phụ lục A); hoặc có câu hỏi ở chỗ khác; thêm cuộn thứ 5 là việc riêng ngoài P6.
3. **Sửa thẻ gốc** (dòng "Thẻ gốc" ở từng thẻ: Giấy thẻ 4; Khắc Dấu thẻ 1 đến 4 và thẻ 5; Bạc thẻ 1 và 4): đồng ý sửa chữ thẻ gốc cùng lúc với thêm câu hỏi ở P6b không?
4. **Nguồn cho hai khẳng định về Bitcoin** (Khắc Dấu thẻ 3: "chữ ký có hai kiểu ECDSA và Schnorr"; số 2^256 ≈ 1,16 × 10^77): chủ dự án hoặc giáo viên xác nhận nguồn trước khi đưa vào thẻ. Ước tính "3–4 triệu Bitcoin" đã bỏ; chỉ đưa lại nếu có nguồn đáng tin kèm ngày.
5. **Ví dụ hiện có:** Làng Dệt, Khắc Dấu, Bạc đã có trường `example`; ví dụ đề xuất thay khi hai bên khác nhau (đề xuất), để ví dụ và câu hỏi khớp nhau.
6. **Thứ tự phương án ABCD:** giữ cố định như tài liệu (đáp án đã rải đều). Nếu muốn xáo trộn khi hiển thị thì phải chọn cách xáo có seed để kiểm thử được.
7. **Lời giải thích có tên nhân vật:** đã dùng `{phanDien}`, `{cuBinh}`, `{coChi}`; mọi chữ khi tích hợp nằm trong `packages/core/src/content/` (ví dụ tệp `knowQuiz.ts`) và `pnpm check:text` phải sạch.
8. **Tên "Hoa", "Khang", "Giang", "Minh" trong ví dụ Làng Giấy** là tên người dân trong sổ (lấy từ `bai3Names`), không phải nhân vật chính; có đồng ý dùng không?
9. **Mức độ khó:** 13 câu ABCD ở mức nhận biết và vận dụng một bước; 3 câu điền số cần tính hai bước. Cần dễ hơn hoặc khó hơn cho học sinh THPT không?
10. **Giáo viên/bản dev:** giáo viên không bị chặn bởi thẻ; dự kiến giáo viên cũng gặp câu hỏi khi tự nhặt thẻ (để thử nội dung) và vẫn không ảnh hưởng gì tới tiến độ.

## Phụ lục A — Bản nháp thẻ thứ 5 của Làng Khắc Dấu (KHÔNG tính trong 16 câu, chưa có cuộn, chưa thêm cuộn)

### Thẻ 5 — `lang-khac-dau#4` (chưa có cuộn) — "Địa chỉ ví được tạo từ khóa công khai" (đề xuất đổi tiêu đề; hiện là "Địa chỉ ví chính là khóa công khai")
- **Kiến thức cần nhớ:** địa chỉ ví thường được tạo ra từ khóa công khai (ví dụ qua các bước biến đổi cho gọn), nó không đồng nhất với khóa công khai. Biết địa chỉ ví không cho quyền chi tiêu: muốn chuyển tiền đi cần chữ ký tạo bằng khóa riêng. Nhưng địa chỉ được ghi công khai trên sổ chung, nên ai biết địa chỉ có thể xem các giao dịch của địa chỉ đó; công khai hoặc dùng lại một địa chỉ có thể ảnh hưởng đến riêng tư.
- **Ví dụ:** Địa chỉ ví giống số tài khoản ngân hàng ở chỗ ai cũng có thể chuyển tiền vào; còn khóa riêng giống quyền ký lệnh chuyển tiền, chỉ em có. Khác ngân hàng ở chỗ, trên blockchain công khai, các giao dịch của một địa chỉ ai cũng xem được.
- **Câu hỏi (ABCD):** Em gửi địa chỉ ví cho một bạn để nhận tiền. Điều nào đúng?
  - A. Bạn đó rút được tiền khỏi ví của em, vì đã biết địa chỉ
  - B. Bạn đó không thể chi tiêu số tiền trong ví chỉ nhờ biết địa chỉ, vì chi tiêu cần chữ ký bằng khóa riêng; nhưng bạn đó có thể xem các giao dịch của địa chỉ này nên có thể ảnh hưởng đến riêng tư của em
  - C. Bạn đó rút được nếu biết số dư của ví
  - D. Em phải đổi khóa riêng ngay sau khi nhận tiền
- **Đáp án đúng:** B.
- **Giải thích:** Chi tiêu cần chữ ký tạo bằng khóa riêng, mà địa chỉ ví không cho phép tính ra khóa riêng, nên chia sẻ địa chỉ để nhận tiền không cấp quyền chi tiêu; không bao giờ chia sẻ khóa riêng. Tuy vậy địa chỉ và các giao dịch của nó nằm công khai trên sổ chung, nên ai biết em dùng địa chỉ nào có thể theo dõi số dư và lịch sử giao dịch; vì vậy người ta cân nhắc khi công khai địa chỉ hoặc dùng lại cùng một địa chỉ.
- **Thẻ gốc (đề xuất sửa trước khi hiện, nếu thẻ này được dùng):** (1) tiêu đề như trên; (2) thay "họ đang xin một dạng rút gọn của khóa công khai" bằng "địa chỉ ví thường được tạo ra từ khóa công khai"; (3) giữ "họ chỉ có thể gửi tiền vào, không thể rút tiền ra" nhưng thêm câu về riêng tư ở trên; (4) ví dụ gốc "Khóa công khai giống số tài khoản ngân hàng, còn khóa riêng là mật khẩu rút tiền" nên đổi thành ví dụ ở trên (khóa riêng không phải "mật khẩu" mà là thứ tạo chữ ký).
- **Nguồn đối chiếu:** `bai3Lesson.emCoBiet[4]`; mục 6A hàng 5.

## Phụ lục B — Kiểm tra số liệu

`scripts/p6a-check.test.mjs` (chạy trong `pnpm test`) kiểm bằng logic sẵn có, không viết lại công thức:
- **Giấy:** `pageCode` cho 43, 44, 95, 99, 46; đáp án nhiễu 144 và 101; mã trang 2 luôn đổi khi nội dung đổi; **phản ví dụ** mã trang 1 = 10, nội dung trang 2, 3, 4 là 10, 0, 0 (mã 30, 60, 20) và 35, 0, 0 (mã 55, 10, 20): mã trang 4 trùng lại dù trang 2 đã sửa, nên tài liệu không khẳng định "mọi mã phía sau luôn đổi".
- **Dệt:** `isValidProposal` (57/36/50 hợp lệ; 62/15/39 so với sổ mã 40 là `prev-mismatch`).
- **Khắc Dấu:** `modPow`, `publicKey`, `sign`, `verify` (5^15 mod 23 = 19; thử tuần tự từ 1 cần 15 lần cho 19 và 12 lần cho 18; 5^3 mod 23 = 10 của spec; chữ ký không khớp với cả 21 giá trị k); 2^256 ≈ 1,16 × 10^77 nhỏ hơn 10^80 (nên bỏ so sánh sai với 10^80); ví dụ gốc trong thẻ đúng bằng 2^256; phép chia ≈ 3,7 × 10^51 năm khớp `bai3Logic.uocTinh`.
- **Bạc:** `buildTree`, `combine` (gốc 288, 481, 256, 422, 462; 7 và 15 phép ghép cho 8 và 16 lá); **phản ví dụ** mô hình ghép số: lá (1, 20) và (2, 10) cùng ra 30, bốn lá (1, 20, 3, 5) và (2, 10, 3, 5) cùng gốc 335 dù lá khác nhau, nên mô hình của bài khác hàm băm thật.

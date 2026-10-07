# PROMPT 3/7 — BÀI 2: NODE ("Nhiều người cùng giữ sổ")

Tiếp tục dự án Sổ Chung.

- Chỉ xây Bài 2 trong `src/lessons/lesson2/`.
- Dùng lại `TrangSo`, `MatXich` và `pageCode` (trong `src/lib/chain.ts`).
- Bot đặt trong `bots.ts`: hàm thuần, random có seed.
- Thêm test vào self-test.
- Khi xong, liệt kê những gì đã làm và những điểm còn chưa chắc chắn.

## Mục tiêu học tập

1. Node là người giữ một bản sao của sổ.
2. Node xác minh trang mới bằng cách so với sổ của mình và tính lại mã.
3. Sổ không nằm ở một người: phải đa số đồng ý thì trang mới được ghi.
4. Với cơ chế đặt cọc, gian lận thì lỗ hơn làm thật.

## "Em có biết?" (4 thẻ, cộng 1 thẻ ở mức Khó)

1. **Node là ai?** Node là một máy tính trong mạng blockchain, giống một người giữ sổ. Mỗi node giữ một bản sao đầy đủ của cuốn sổ, và các bản sao giống hệt nhau.
2. **Node làm gì khi có trang mới?** Node tự kiểm tra 2 điều: mã trang trước ghi trong trang mới có khớp với trang cuối trong sổ của mình không, và mã trang mới có được tính đúng không.
3. **Đa số đồng ý mới được ghi.** Chỉ khi phần lớn các node đồng ý, trang mới được ghi vào sổ của tất cả mọi người. Cách các node thống nhất với nhau gọi là cơ chế đồng thuận.
4. **Vì sao an toàn hơn?** Sổ không nằm trong tay một người. Muốn sửa lén, kẻ gian phải sửa sổ của phần lớn các node cùng lúc, điều này cực kỳ khó.
5. *(chỉ hiện ở mức Khó)* **Đặt cọc.** Ở một số blockchain (cơ chế Proof of Stake), muốn được tạo khối thì phải đặt cọc. Làm đúng thì được thưởng, gian lận thì mất cọc, nên làm thật luôn có lợi hơn.

## logic.ts

`isValidProposal(myLastCode, proposal: { prevCode, content, code })` trả về một trong ba lý do:

| Kết quả | Khi nào |
|---|---|
| `'ok'` | `prevCode === myLastCode` và `code === pageCode(prevCode, content)` |
| `'prev-mismatch'` | mã trang trước không khớp sổ của mình |
| `'wrong-code'` | mã trang trước khớp nhưng mã trang mới tính sai |

Viết thêm các hàm tạo đề cho từng mức (dùng rng có seed).

**Test case:**

| Lời gọi | Kết quả mong đợi |
|---|---|
| `isValidProposal(57, { prevCode: 57, content: 36, code: 50 })` | `'ok'` |
| `isValidProposal(57, { prevCode: 57, content: 36, code: 51 })` | `'wrong-code'` |
| `isValidProposal(57, { prevCode: 62, content: 36, code: 60 })` | `'prev-mismatch'` |

## Mức Dễ — "Duyệt trang mới" (5 vòng, 3 tim)

**Màn hình:**
- Trên cùng là "Sổ của em": 2 trang cuối, làm nổi mã trang cuối X.
- Mỗi vòng, một bạn (Bình, Chi, Tí luân phiên) gửi trang mới gồm "Nội dung c" và "Mã trang y". Mã trang trước ngầm hiểu là X.
- Em bấm "Đồng ý" hoặc "Từ chối". Trang hợp lệ khi `y = (X × 2 + c) mod 100`.

**Tạo đề:**
- Trong 5 vòng có 2 hoặc 3 trang hợp lệ (ngẫu nhiên).
- Trang sai: `y` = mã đúng cộng hoặc trừ một trong các lượng 1…9, 10, 20 (kết quả vẫn trong khoảng 0–99).

**Phản hồi:**
- Luôn kèm phép tính, ví dụ: "(57 × 2 + 36) mod 100 = 50, khớp với 50, nên Đồng ý."
- Khi chọn sai: mất 1 tim, và hiện thêm "May là các node khác đã tính đúng và [từ chối / đồng ý] trang này."
- Sổ của em luôn đi theo quyết định đúng của đa số: trang hợp lệ thì được thêm vào, X cập nhật theo.

**Kết thúc:**
- Hết 3 tim (tức sai 3 lần): `LevelFailed`.
- Qua đủ 5 vòng: `LevelComplete`.
- Sao: 0 lỗi 3 sao; 1 lỗi 2 sao; 2 lỗi 1 sao.
- Điều em vừa học: "Mỗi node tự tính lại để kiểm tra, không tin ngay trang người khác gửi."

## Mức Trung bình — "So sổ trước khi duyệt" (5 vòng, 3 tim)

**Màn hình:** hai cột.
- "Sổ của em": 3 trang cuối.
- "Sổ của [người gửi]": 3 trang cuối theo bản của họ, cộng trang mới.

**Ba kiểu đề:**

| Kiểu | Mô tả |
|---|---|
| Hợp lệ | Sổ khớp, mã tính đúng. |
| Tính sai | Sổ khớp, nhưng mã trang mới sai. |
| Sổ đã bị sửa | Một trong 3 trang cuối của người gửi có nội dung khác (độ chênh không chia hết cho 25), các mã từ trang đó trở đi bị tính lại theo. Trang mới được tính đúng, nhưng dựa trên cuốn sổ sai, nên mã trang trước không khớp mã trang cuối của em. |

Mỗi lượt chơi gồm 2 vòng hợp lệ, ít nhất 1 vòng "Tính sai" và ít nhất 1 vòng "Sổ đã bị sửa"; vòng còn lại là một kiểu sai bất kỳ. Thứ tự ngẫu nhiên.

**Phản hồi:**
- Không đánh dấu chỗ khác nhau trước khi em trả lời.
- Sau khi em trả lời: tô nổi chỗ khác nhau bằng màu bút đỏ và giải thích.

Luật tim, sao và cách phản hồi giống mức Dễ.

Điều em vừa học: "Node kiểm cả 2 thứ: sổ có khớp không, và mã có đúng không."

## Mức Khó — "Đặt cọc để được ghi sổ" (8 vòng, chơi với 3 bot)

### Người chơi & thứ tự

- 4 người chơi: Em, Bình 🐢 (cẩn thận), Chi 🐇 (vội vàng), Tí 🦊 (gian xảo).
- Mỗi người bắt đầu với 100 điểm cọc.
- Thứ tự tạo trang: Em, Bình, Tí, Chi, Em, Bình, Tí, Chi.

### Mỗi vòng

1. Người tạo trang đặt cọc 30 điểm. Nếu không đủ 30 điểm thì bỏ lượt, hiện "Không đủ điểm cọc để tạo trang".
2. 3 người còn lại bỏ phiếu "Đồng ý" hoặc "Từ chối". Có từ 2 phiếu đồng ý trở lên thì trang được ghi.
3. Lật mở sự thật (trang thật, trang gian, hay trang tính nhầm) rồi tính điểm. Số điểm cộng/trừ bay lên từ avatar (+10, −30…).

### Luật điểm (đặt trong `gameConfig.lesson2`)

| Tình huống | Người tạo trang | Người bỏ phiếu |
|---|---|---|
| Trang hợp lệ, được ghi | nhận lại cọc, +10 | Đồng ý: +2 |
| Trang hợp lệ, bị từ chối | nhận lại cọc, không thưởng | Đồng ý: +2 |
| Trang không hợp lệ, bị từ chối | mất 30 điểm cọc | Từ chối: +2; Đồng ý: −15 (nửa cọc) |
| Trang gian vẫn được ghi (lọt) | nhận lại cọc, +40 | Đồng ý: −15; Từ chối: +2 |
| Trang tính nhầm vẫn được ghi | nhận lại cọc, không thưởng | Đồng ý: −15; Từ chối: +2 |

Trang không hợp lệ mà vẫn được ghi thì hiện trong sổ chung với viền đỏ, nhãn "Trang sai đã lọt vào sổ chung" (sẽ liên hệ với Bài 5).

### Lượt của em khi tạo trang

- Hiện nội dung được giao (ngẫu nhiên 1–99) và mã trang cuối của sổ chung.
- Em chọn một trong hai:
  - **"Ghi trang thật":**
    - Em nhập mã trang.
    - Nếu sai: cảnh báo nhẹ "Mã này chưa đúng, em kiểm tra lại nhé" (không tính lỗi).
    - Sai 2 lần: hiện gợi ý công thức đã thế số.
  - **"Ghi trang gian (tự cộng 40 điểm)":**
    - Hiện hộp thoại "Ghi trang gian? Nếu bị phát hiện, em mất 30 điểm cọc.", với hai nút "Vẫn ghi gian" và "Thôi, ghi trang thật".
    - Nếu em vẫn ghi gian, game tự tạo trang gian (kiểu A hoặc B, xem bên dưới).

### Lượt của em khi bỏ phiếu

- Thẻ trang đề xuất gồm: "Mã trang trước (theo sổ người gửi)", "Nội dung", "Mã trang", kèm "Mã trang cuối trong sổ của em". Em tự kiểm tra rồi bỏ phiếu.
- Phiếu của các bot chỉ hiện **sau** khi em đã bỏ phiếu, để em không chép. Mỗi bot "đang tính…" 400–900 ms, lần lượt từng bot.

### Hai kiểu trang gian

| Kiểu | Mô tả |
|---|---|
| A | Mã trang trước khác mã trang cuối của sổ chung (kẻ gian đã sửa sổ riêng). Mã trang được tính đúng theo mã trước giả đó. |
| B | Mã trang trước đúng, nhưng mã trang là số bịa (sai). Có ghi chú "Thưởng thêm cho [tên]". |

### Hành vi bot

**Bình 🐢**
- Tạo trang: luôn đúng.
- Bỏ phiếu: luôn tính đúng (hợp lệ thì đồng ý, không hợp lệ thì từ chối).

**Chi 🐇**
- Tạo trang: trang thật, nhưng 30% khả năng tính nhầm (mã lệch 1–9).
- Bỏ phiếu: 25% khả năng "duyệt vội", tức đồng ý luôn mà không kiểm tra; còn lại thì tính đúng.

**Tí 🦊**
- Bỏ phiếu: đồng ý mọi trang của người khác (dễ dãi, mong người khác cũng dễ dãi lại với mình).
- Tạo trang, lượt đầu tiên: luôn gian ("thử lòng mọi người").
- Tạo trang, các lượt sau — Tí tính toán theo 5 bước:
  1. **Niềm tin về từng người bỏ phiếu.** Tí giữ, cho mỗi người, xác suất người đó đồng ý một trang gian, dưới dạng Beta(α, β). Giá trị khởi đầu: Em (1, 2), Bình (1, 4), Chi (1, 2).
  2. **Cập nhật.** Mỗi khi có một trang gian (của bất kỳ ai) được bỏ phiếu: người nào đồng ý thì α + 1, người nào từ chối thì β + 1.
  3. **Xác suất trang gian lọt.** Với mỗi người, p = α / (α + β). P_lọt là xác suất có ít nhất 2 trong 3 người bỏ phiếu đồng ý (coi các p là độc lập).
  4. **So sánh kỳ vọng.**
     - Kỳ vọng nếu gian = P_lọt × 40 − (1 − P_lọt) × 30.
     - Kỳ vọng nếu làm thật = 10.
  5. **Quyết định.**
     - Gian nếu kỳ vọng gian lớn hơn kỳ vọng làm thật.
     - Nếu không, vẫn "liều" gian với xác suất 15%.
     - Còn lại thì làm thật.
- Sau lượt tạo trang của Tí, hiện bong bóng suy nghĩ, ví dụ:
  - "Tí tính rồi: gian thì dễ mất cọc, thôi làm thật!"
  - "Hình như mọi người dễ dãi… thử gian xem!"
- Bong bóng không bao giờ hiện **trước** khi bỏ phiếu.

### Màn kết thúc

- Bảng xếp hạng, kèm dòng tóm tắt cho từng người, ví dụ "Tí gian 1 lần: mất 30 điểm cọc", "Em làm thật cả 2 lượt: +20".
- Điều em vừa học (lời của file gốc):
  - "Sổ không nằm ở một người. Nhiều người cùng giữ và họ phải đồng ý thì trang mới được ghi."
  - "Gian lận thì lỗ hơn làm thật."
- Câu hỏi suy ngẫm: "Vì sao càng về sau Tí càng ít gian lận?" Đáp án: "Vì Tí tính ra gian thì dễ mất cọc, làm thật mới có lời."
- Sao:
  - 3 sao nếu em không đồng ý trang gian nào và kết thúc trong top 2.
  - 2 sao nếu kết thúc với từ 100 điểm trở lên.
  - Còn lại 1 sao.
- Màn này luôn tính là hoàn thành.

**Số liệu tham khảo khi test** (mô phỏng 20.000 ván với đúng luật trên, điểm trung bình cuối game):

| Người chơi | Điểm |
|---|---|
| Người làm thật và kiểm kỹ | ~130 |
| Người gian 1 lần | ~108 |
| Tí | ~77 (về bét khoảng 84% số ván) |

## Checklist nghiệm thu Bài 2

- [ ] Mọi test trong self-test đều ✅.
- [ ] Dễ/Trung bình: sai 3 lần thì thua; phản hồi luôn có phép tính.
- [ ] Trung bình: chỗ khác nhau chỉ được tô sau khi em trả lời.
- [ ] Khó: phiếu của bot hiện sau phiếu của em; Tí luôn gian ở lượt đầu; cộng trừ điểm đúng bảng; bỏ lượt khi không đủ cọc.
- [ ] Thử ghi gian 1 lần: thấy mất cọc và bảng xếp hạng phản ánh đúng.

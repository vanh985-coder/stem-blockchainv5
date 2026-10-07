# PROMPT 6/7 — BÀI 5: TẤN CÔNG 51%

Tiếp tục dự án Sổ Chung.

- Chỉ xây Bài 5 trong `src/lessons/lesson5/`.
- Bot đặt trong `bot.ts`: hàm thuần, random có seed.
- Thêm test vào self-test.
- Khi xong, liệt kê những gì đã làm và những điểm còn chưa chắc chắn.

## Mục tiêu học tập

Theo đúng mạch của file gốc: biết 51% là gì, rồi biết 51% nguy hiểm thế nào, rồi tự trải nghiệm vì sao đạt 51% lại nguy hiểm.

## "Em có biết?" (5 thẻ)

1. **Các node "bỏ phiếu".** Trong blockchain, các node bỏ phiếu để quyết định trang nào được ghi. Sức nặng lá phiếu phụ thuộc vào sức mạnh của node (ví dụ sức mạnh máy tính hoặc số tiền đặt cọc), không phụ thuộc vào số lượng node.
2. **Tấn công 51% là gì?** Là khi một kẻ, hoặc một nhóm, nắm hơn một nửa tổng sức mạnh của mạng. Khi đó họ có thể lấn át toàn bộ phần còn lại.
3. **Họ làm được gì?** Chặn giao dịch của người khác, hoặc cố đảo ngược các giao dịch gần đây để tiêu một khoản tiền hai lần.
4. **Họ KHÔNG làm được gì?** Họ không lấy được tiền trong ví của người khác, vì không có khóa riêng của người đó (nhớ lại Bài 3!).
5. **Vì vậy:** mạng càng phân tán (nhiều người tham gia, không ai nắm quá nhiều sức mạnh) thì càng an toàn.

## Mức Dễ — "Sức mạnh, không phải số lượng"

**Bàn chơi:**
- 10 thẻ node với sức mạnh 25, 18, 15, 12, 10, 8, 5, 3, 2, 2. Tổng là 100, nên sức mạnh cũng chính là phần trăm.
- Hai cột: "Hacker 😈 (Tí)" và "Người bảo vệ 🛡️". Lúc đầu cả 10 thẻ nằm ở cột Người bảo vệ.
- Thanh đo phần trăm của Hacker, có vạch 50% và nhãn "cần ít nhất 51%".

**Ba nhiệm vụ, làm nối tiếp nhau:**
1. **"Giúp Hacker thắng":** kéo node sang cột Hacker cho tới khi Hacker đạt ít nhất 51%.
2. **"Hacker thắng với ÍT node nhất":** đạt ít nhất 51% chỉ với 3 node (số tối thiểu).
   - Nếu em dùng nhiều hơn 3 node: "Thắng rồi, nhưng thử ít node hơn xem!"
   - Nếu em thử với 2 node: "Hai node mạnh nhất cũng chỉ được 43%, chưa đủ."
3. **"Hacker có 7 node mà vẫn THUA":** Hacker giữ đúng 7 node nhưng dưới 51%. Làm được, vì 7 node nhỏ nhất cộng lại chỉ 42%.

**Rút ra** (lời của file gốc): "Chỉ cần sức mạnh lớn hơn, không cần nhiều node."

**Sao:** mỗi nhiệm vụ hoàn thành mà không cần gợi ý được 1 sao.

## Mức Trung bình — "Tấn công, hậu quả, phòng thủ"

**Cách nối:** chạm một thẻ bên trái rồi chạm một thẻ bên phải để vẽ đường nối (hoặc kéo thả).

- **Phần A:** nối 3 thẻ tấn công với 3 thẻ hậu quả.
- **Phần B:** nối 3 thẻ tấn công với 3 thẻ phòng thủ.

**Thẻ tấn công:**

| Thẻ | Tên | Mô tả |
|---|---|---|
| A | Chi tiêu hai lần | Tí trả 10 xu cho cửa hàng, rồi viết lại lịch sử để 10 xu đó vẫn là của Tí. |
| B | Chặn giao dịch | Tí cố tình không đưa giao dịch của An vào trang mới. |
| C | Viết lại lịch sử gần đây | Tí tạo một nhánh sổ khác dài hơn để thay thế vài trang gần nhất. |

**Thẻ hậu quả:**

| Thẻ | Nội dung |
|---|---|
| 1 | Cửa hàng đã giao hàng, nhưng cuối cùng không thực sự nhận được tiền. |
| 2 | Giao dịch của An bị treo, chậm, hoặc không được xác nhận. |
| 3 | Một số giao dịch gần đây bị đảo ngược, như chưa từng xảy ra. |

**Thẻ phòng thủ:**

| Thẻ | Tên | Mô tả |
|---|---|---|
| D | Chờ thêm xác nhận | Đợi thêm nhiều trang được ghi phía sau rồi mới coi giao dịch là chắc chắn. |
| E | Phân tán quyền kiểm soát | Không để một người hay một nhóm nhỏ nắm phần lớn sức mạnh của mạng. |
| F | Xác nhận & Finality | Khi giao dịch đã đạt trạng thái cuối (finality), rất khó hoặc không thể đảo ngược. |

**Đáp án:** A–1–D, B–2–E, C–3–F.

**Phần C — câu hỏi bẫy:** "Tí nắm 51% sức mạnh mạng. Tí có lấy được tiền trong ví của An không?"
- Lựa chọn: "Có, vì Tí mạnh nhất mạng" / "Không, vì Tí không có khóa riêng của An" / "Chỉ lấy được một nửa".
- Đáp án đúng: "Không, vì Tí không có khóa riêng của An".

**Sau phần C, hiện ô "Em có biết?":** "Tấn công 51% không có nghĩa là hacker 'hack được ví của mọi người'. Nó chủ yếu cho kẻ tấn công ảnh hưởng rất lớn tới việc xác nhận và thứ tự giao dịch. Kiểm soát mạng không đồng nghĩa với sở hữu tài sản trong ví."

**Sao:** tính theo số lỗi.

## Mức Khó — "Trận chiến giành mạng lưới"

### Luật chơi

Luật này đã được cân bằng lại so với file gốc. Hiển thị cho học sinh gọn trong 1 thẻ.

**Bàn chơi:**
- 10 node xếp thành vòng tròn N1…N10, mỗi node nối với 2 node bên cạnh (N10 nối với N1).
- Ban đầu Hacker giữ N1, N2 (màu đỏ); Người bảo vệ giữ 8 node còn lại (màu xanh).

**Mỗi round, hai bên chọn bí mật cùng lúc:**
- **Hacker** có 2 quân ⚔️, đặt vào các node xanh nằm sát vùng đỏ. Có thể đặt 2 quân vào 2 node khác nhau, hoặc dồn cả 2 vào 1 node (tấn công dồn).
- **Người bảo vệ** chọn một trong hai:
  - 🛡️ **Bảo vệ:** đặt 2 khiên vào các node xanh nằm sát vùng đỏ (2 node khác nhau, hoặc dồn cả 2 vào 1 node).
  - 🔄 **Phục hồi:** lấy lại 1 node đỏ nằm sát vùng xanh. Round đó không đặt khiên.

**Lật bài (REVEAL):**
- Ở mỗi node: số ⚔️ nhiều hơn số 🛡️ thì Hacker chiếm node đó; ngược lại node giữ nguyên.
- Phục hồi luôn thành công.
- Mọi thứ xảy ra cùng lúc, tính theo bàn cờ lúc đầu round.

**Thắng thua:**
- Hacker thắng ngay khi giữ từ 6/10 node trở lên (60%, tức hơn 51%).
- Người bảo vệ thắng nếu hết 6 round mà Hacker vẫn chưa đạt 6 node, hoặc nếu Hacker không còn node nào.
- Vì sao cần 6 mà không phải 5: 5/10 = 50%, chưa vượt quá một nửa.

**Vì sao luật này cân bằng** (thông tin cho AI, không cần hiện cho học sinh): khi cả hai bên chơi tối ưu, Hacker thắng khoảng 56%. Không có nước đi nào luôn thắng: mỗi lựa chọn đều có lựa chọn khắc chế (dàn đều khắc dồn, bảo vệ khắc phục hồi, và ngược lại).

### logic.ts

Trong code, node đánh số 0–9; trên giao diện hiển thị N1–N10.

```ts
type Owner = 'H' | 'D';
frontier(owner: Owner[]): number[]      // các node D kề ít nhất 1 node H
recoverable(owner: Owner[]): number[]   // các node H kề ít nhất 1 node D
type AttackMove = [number, number];     // 2 quân, có thể cùng một node
type DefenseMove =
  | { kind: 'protect'; shields: [number, number] }  // 2 khiên, có thể cùng một node
  | { kind: 'recover'; node: number };
legalAttacks(owner): AttackMove[]       // mọi cặp không thứ tự lấy từ frontier, kể cả cặp trùng
legalDefenses(owner): DefenseMove[]
resolve(owner, attack, defense): Owner[]
countH(owner): number
```

**Test case** (chỉ số 0-based, bắt đầu với H = {0, 1}):

| Kiểm tra | Kết quả mong đợi |
|---|---|
| `frontier` | `[2, 9]` |
| `recoverable` | `[0, 1]` |
| Số nước của `legalAttacks` | 3 |
| Số nước của `legalDefenses` | 5 |
| Tấn công (2, 9) vs bảo vệ (2, 9) | H = {0, 1} |
| Tấn công dồn (2, 2) vs bảo vệ (2, 9) | H = {0, 1, 2} |
| Tấn công dồn (2, 2) vs bảo vệ dồn (2, 2) | H = {0, 1} |
| Tấn công (2, 9) vs bảo vệ dồn (2, 2) | H = {0, 1, 9} |
| Tấn công (2, 9) vs phục hồi 1 | H = {0, 2, 9} |
| Tấn công dồn (2, 2) vs phục hồi 1 | H = {0, 2} |
| Với H = {0, 2, 9}: `frontier` | `[1, 3, 8]` |
| Với H = {0, 2, 9}: `recoverable` | `[0, 2, 9]` |

### Giao diện

**Bắt đầu:**
- Chọn vai: "Em làm Hacker 😈" hoặc "Em làm Người bảo vệ 🛡️".
- Chọn độ khó: "Bot khôn" (mặc định) hoặc "Bot vừa".
- Thẻ luật 4 dòng, nút "Bắt đầu".

**Bàn cờ:** SVG vòng tròn 10 node (đỏ/xanh), có đường nối giữa các node kề nhau. Node nào hợp lệ để đặt quân thì viền phát sáng.

**Đặt quân:**
- Chạm một node hợp lệ để thêm 1 quân; chạm lần nữa để thêm quân thứ 2 vào cùng node đó.
- Chạm vào biểu tượng quân để gỡ ra.
- Người bảo vệ có công tắc "🛡️ Bảo vệ / 🔄 Phục hồi".
- Nút "Chốt lựa chọn" chỉ bật khi đã đặt đủ quân.

**Sau khi chốt:**
1. Bot "đang suy nghĩ…" 600–900 ms.
2. REVEAL: quân của hai bên bay vào cùng lúc. Mỗi node tranh chấp hiện kiểu "⚔️ 2 vs 🛡️ 1". Node bị chiếm lật màu, có xung sáng.
3. Một dòng tóm tắt, ví dụ "N3 bị chiếm! N10 được bảo vệ."

**Thanh trạng thái:** "Round 3/6", "Hacker: 4/10 (40%)", và thước đo có vạch 50% cùng vạch thắng 60%.

**Băng rôn:**
- Khi Hacker đạt 5 node: "⚠️ Hacker đang kiểm soát 50% mạng! Đã thắng chưa? Chưa, cần hơn một nửa."
- Khi Hacker đạt 6 node: "🔴 Hacker kiểm soát 60% mạng. Tấn công 51% thành công!"

**Lịch sử:** danh sách các round đã chơi (thu gọn được), để học sinh tự rút kinh nghiệm.

### Bot (`bot.ts`)

**Nguyên tắc công bằng:** bot **không được** đọc lựa chọn của học sinh trong round hiện tại. Bot phải quyết định độc lập.

**Bước 1 — Dựng ma trận.** Liệt kê mọi nước đi hợp lệ của hai bên. Tạo ma trận:
- `M[i][j] = evaluate(resolve(owner, attack_i, defense_j), rLeft)`
- `rLeft = MAX_ROUNDS − round`, tức số round còn lại sau round này.

**Bước 2 — Hàm `evaluate(owner, r)`.** Gọi a = `countH(owner)`:
- a ≥ 6: trả về 1.1.
- a = 0: trả về −0.1.
- r = 0: trả về 0.01·a.
- Các trường hợp còn lại: `W[a][r] + 0.01·a`.

Bảng W: xác suất Hacker thắng khi cả hai bên chơi tối ưu, đã tính trước bằng quy hoạch động. Hàng a = số node Hacker đang giữ; cột r = số round còn lại. Nếu r > 7 thì dùng cột 7.

| a \ r | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 0 | 0.076 | 0.235 | 0.426 |
| 2 | 0 | 0 | 0 | 0.119 | 0.334 | 0.558 | 0.734 |
| 3 | 0 | 0 | 0.188 | 0.453 | 0.680 | 0.830 | 0.916 |
| 4 | 0 | 0.300 | 0.603 | 0.804 | 0.911 | 0.962 | 0.984 |
| 5 | 0.500 | 0.786 | 0.916 | 0.969 | 0.989 | 0.996 | 0.999 |

**Bước 3 — Tìm chiến lược cân bằng** bằng regret matching (300 vòng). Hàng là Hacker (muốn tối đa hóa), cột là Người bảo vệ (muốn tối thiểu hóa).

```ts
function solve(M: number[][], iters = 300) {
  const m = M.length, n = M[0].length;
  const regR = Array(m).fill(0), regC = Array(n).fill(0);
  const sumR = Array(m).fill(0), sumC = Array(n).fill(0);
  for (let t = 0; t < iters; t++) {
    const pR = positiveNormalize(regR), pC = positiveNormalize(regC); // chia đều nếu mọi regret ≤ 0
    const uR = M.map(row => row.reduce((s, v, j) => s + v * pC[j], 0));
    const uC = Array.from({ length: n }, (_, j) => -M.reduce((s, row, i) => s + row[j] * pR[i], 0));
    const vR = uR.reduce((s, u, i) => s + u * pR[i], 0);
    const vC = uC.reduce((s, u, j) => s + u * pC[j], 0);
    for (let i = 0; i < m; i++) { regR[i] += uR[i] - vR; sumR[i] += pR[i]; }
    for (let j = 0; j < n; j++) { regC[j] += uC[j] - vC; sumC[j] += pC[j]; }
  }
  return { attackMix: normalize(sumR), defenseMix: normalize(sumC) };
}
```

**Bước 4 — Mô hình thói quen của học sinh.** Lưu trong `localStorage`, nhớ qua các ván.
- Các kiểu nước đi được đếm:
  - Khi học sinh làm Người bảo vệ: "dàn khiên" (2 khiên ở 2 node), "dồn khiên" (2 khiên ở 1 node), "phục hồi".
  - Khi học sinh làm Hacker: "đánh 2 nơi", "đánh dồn".
- Số đếm ban đầu (prior): mỗi kiểu 1 (riêng vai Hacker: mỗi kiểu 1,5).
- Đầu mỗi ván mới, nhân mọi số đếm với 0,8 để thói quen gần đây quan trọng hơn.
- Dự đoán nước đi của học sinh:
  - P(kiểu) = số đếm của kiểu / tổng số đếm.
  - Chia đều xác suất đó cho các nước đi cụ thể thuộc kiểu ấy.
  - Chỉ xét những kiểu có nước đi hợp lệ ở thế cờ hiện tại, rồi chuẩn hóa lại.

**Bước 5 — Chọn nước.**

"Bot khôn":
- Số quan sát n = tổng số đếm − tổng prior; λ = min(0,6; 0,12·n).
- Với xác suất λ: chơi nước đáp trả tốt nhất theo dự đoán ở bước 4. Bot là Hacker thì chọn nước có kỳ vọng `evaluate` lớn nhất; bot là Người bảo vệ thì chọn nước có kỳ vọng nhỏ nhất. Hòa thì chọn ngẫu nhiên.
- Còn lại: bốc ngẫu nhiên theo chiến lược cân bằng ở bước 3.

"Bot vừa":
- λ = 0.
- 30% số lần chọn một nước hợp lệ bất kỳ; còn lại theo chiến lược cân bằng.

**Hiệu năng:** mỗi lần bot quyết định mất dưới 30 ms (ma trận lớn nhất khoảng 15 × 20). Chạy sau khi đã hiện "đang suy nghĩ…" (`setTimeout` 0) để giao diện không giật.

**Bong bóng lời thoại của bot.** Chỉ hiện **sau** REVEAL, không bao giờ để lộ nước đi trước.

| Tình huống | Ví dụ lời thoại |
|---|---|
| Bot vừa đáp trả một thói quen | "Mình để ý em hay dàn 2 khiên ra 2 bên, nên lần này mình dồn quân!" / "Em hay đánh cả 2 phía, nên mình chia khiên đều!" |
| Bot chơi theo chiến lược cân bằng | "Mình chọn ngẫu nhiên có tính toán, đoán đi!" / "Khó đoán chưa? 😎" |
| Bot phục hồi | "Lấy lại N{x} trước đã!" |
| Hacker chỉ còn thiếu 1 node | "Chỉ cần thêm 1 node nữa thôi…" |

**Số liệu tham khảo khi test** (mô phỏng):

| Trận | Tỉ lệ thắng của bot |
|---|---|
| Bot khôn làm Hacker, gặp người chơi ngẫu nhiên | ~83% |
| Bot khôn làm Người bảo vệ, gặp người chơi ngẫu nhiên | ~61% |
| Gặp người chơi tối ưu | quanh mức cân bằng (~56% cho phía Hacker) |

### Kết thúc ván

**Hiển thị:** kết quả, thống kê số node chiếm/mất qua từng round, và 3 câu "ngộ ra" (theo file gốc, đã chỉnh cho khớp luật mới):

| Câu hỏi | Đáp án |
|---|---|
| Vì sao 5/10 node chưa đủ? | Vì 5/10 = 50%, chưa vượt quá một nửa. |
| Ở mức Dễ, Hacker thắng chỉ với 3 node; ở đây cần 6. Vì sao? | Ở đây mọi node mạnh như nhau. Điều quyết định luôn là tổng sức mạnh vượt quá 50%. |
| Khi một bên nắm phần lớn mạng, điều gì nguy hiểm? | Họ có thể chặn giao dịch và cố đảo ngược các giao dịch gần đây, nhưng vẫn không lấy được tiền trong ví người khác. |

**Sao:**
- Thắng: 3 sao.
- Thua nhưng vẫn chơi tốt (làm Người bảo vệ và trụ được từ 4 round; hoặc làm Hacker và đạt 5 node): 2 sao.
- Còn lại: 1 sao.

Màn này luôn tính là hoàn thành. Có nút "Đổi vai chơi lại".

## Checklist nghiệm thu Bài 5

- [ ] Mọi test trong self-test đều ✅.
- [ ] Dễ: không thể thắng nhiệm vụ 2 với 2 node; nhiệm vụ 3 làm được với 7 node nhỏ nhất.
- [ ] Khó: chỉ đặt được quân vào node hợp lệ; REVEAL tính đúng theo bảng test; hết 6 round thì Người bảo vệ thắng.
- [ ] Bot không bao giờ đọc được lựa chọn của em trước khi quyết định; mỗi lần bot suy nghĩ không làm giật giao diện.
- [ ] Chơi 3 ván liên tiếp luôn dùng một kiểu nước đi: bot bắt đầu nói ra thói quen đó và khai thác nó.

# SPEC 08 — BÀI 4: LÀNG BẠC (mốc 1: bài học; mốc 3: cảnh làng, màn 11, màn 12, cao trào)

**Gói:** `packages/village-lang-bac`. Gồm màn 10 (bài học), màn 11, màn 12 và cảnh cao trào. Chạy riêng ở `lang-bac.ten-mien.vn`.

**Nguồn luật:** công thức T_ab = T_a × 10 + T_b, dữ liệu và chấm sao của bài học giữ đúng **spec giai đoạn 1 `05-bai4-merkle.md`**. Dùng lại `combine`, `buildTree` trong `packages/core/src/lessons/bai-4`.

**Người dẫn:** thầy Linh (`characters/thay-linh`, không có xương).

**Loại cảnh:** cảnh làng là 3D đi lại; màn 10 là trang bài học 2D; màn 11 và màn 12 là 2.5D; cảnh cao trào là 3D. Tên phản diện viết `{phanDien}` (hiện là Tí).

## Cảnh làng (3D đi lại, vùng làng của `WorldScene` ở thế giới mở `/cho`; bước W1 chỉ có bản tối giản, nội dung đầy đủ làm sau)

- **Cổng vào:** `env/cong-lang-bac`.
- **Giữa làng:** cây đa `env/cay-da`; code treo thêm nhiều thẻ gỗ nhỏ ghi số đung đưa trên cành. Đây là "cây gộp sổ".
- **Xung quanh:** nhà `env/nha-mai-ngoi`, `env/nha-mai-tranh`; lều `env/leu-cho` làm quầy đổi bạc.
- **Code tự dựng:** xâu tiền đồng, thỏi bạc, cân đòn; bến sông với cầu tàu và thuyền gỗ đơn giản.
- **Thầy Linh** đứng dưới gốc đa; **lái buôn** đứng ở bến sông. Cả hai không có xương.
- **Cảnh mở đầu:** ảnh truyện số 9 kèm lời, sau đó là lời thầy Linh như cũ.
- **3 biển gỗ:** "Học cùng thầy Linh" (màn 10), "Ghép lá cây sổ" (màn 11), "Leo cây tìm lá giả" (màn 12).

## Màn 10 — Game chính: "Cây gộp sổ" (trang bài học 2D)

**Dựng bằng `LessonPage2D`:**
- Nền: `scenes/bai-hoc-lang-bac`.
- Bảng giữa: **dùng lại nguyên bài 4 của web 2D giai đoạn 1**, gồm 3 trạm:
  - ghép cặp, có bẫy thứ tự T21;
  - dựng cây 4 giao dịch, sau đó {phanDien} tráo một giao dịch;
  - ghép lại cây 8 giao dịch bị xé mất ô.

**Lời thầy Linh:**

| Thời điểm | Thầy Linh nói |
|---|---|
| **Đầu bài** | "Ghép hai giao dịch: T_ab = T_a × 10 + T_b. Ghép từng cặp, rồi lại ghép từng cặp kết quả, tới khi còn một số gốc." |
| **Khi {phanDien} tráo giao dịch** | "Thấy chưa, chỉ đổi một lá mà con số đổi lan lên tận gốc." |
| **Cuối bài** | "Nhờ số gốc, cả làng chỉ cần so một con số là biết sổ có bị sửa hay không." |

Lời "Khi {phanDien} tráo giao dịch" hiện giữa lúc làm trạm Trung bình, ngay khi gốc đổi (trạm gọi `onTwist()`; `LessonPage2D` mở hộp thoại thầy Linh đè lên trạm, bấm "Tiếp" để đóng). Trạm Trung bình và trạm Khó không có lời trước trạm.

### Trạm Trung bình, phần 3 "Khám phá bí mật": soi ô tìm giao dịch bị sửa

Thay cho nút "Sửa giao dịch & xem gốc đổi" ở bản cũ. Công thức, số liệu và cách chấm sao (theo lỗi ở phần B) không đổi.
- {phanDien} nói: "Tớ vừa lén sửa một lá trên cây em vừa dựng. Gốc đổi rồi đấy, xem em có tìm ra lá nào không!" (không nói lá nào).
- **Hai cây** (từ 640px xếp cạnh nhau, dưới 640px xếp trên–dưới; cây co theo bề rộng nên ở 360px cả hai hiện đủ, không cuộn ngang, chữ từ 14px). Số lấy từ cây em vừa dựng ở phần 2, không viết cứng. Ví dụ lá 6, 3, 2, 1; T12 = 63, T34 = 21, gốc = 651; giao dịch bị sửa là T3 (2 → 3):
  - **"Cây trong sổ (lúc em dựng)":** hiện đủ số ở mọi ô, viền xanh, nhãn "✓ đúng" ở gốc.
  - **"Cây bây giờ ({phanDien} đã sửa)":** chỉ hiện số gốc (661) kèm "✗ khác"; các ô khác hiện "?". Mỗi ô chỉ có tên ô và một số.
  - Dòng chú thích dưới hai cây: "Số trên ô là số lúc em dựng cây (đã ghi trong sổ)."
- Hai dòng đầu mối: "Sổ ghi số gốc 651 — em đã tính đúng ✓" và "{phanDien} sửa một lá, nên tính lại bây giờ ra 661. Hãy tìm lá đã khác so với lúc em dựng cây!".
- Câu hướng dẫn: "Bấm vào một ô để so: số lúc em dựng cây (trong sổ) và số tính lại bây giờ."
- **Soi một ô "?"** ở cây mới (bấm, hoặc Enter/Space khi chọn bằng bàn phím): ô hiện số bây giờ kèm "✓ giống" (xanh) hoặc "✗ khác" (đỏ), có icon và chữ, không chỉ màu. Ô cùng vị trí ở cây cũ được tô viền vàng để so (ô vừa soi viền đậm hơn). Ô đã soi giữ nguyên trạng thái.
- **Ô "?" chỉ bấm được khi ô cha đã soi và "✗ khác"** (đi từ gốc xuống theo nhánh khác; gốc đã hiện sẵn "khác" nên T12 và T34 bấm được ngay). Ô chưa bấm được thì mờ nhẹ, có nhãn thay thế cho trình đọc màn hình ("chưa mở, hãy soi ô cha đang khác trước"). Vì đã chặn như vậy nên không còn gợi ý "soi sai 2 lần" của Bi.
- Với ví dụ trên: gốc, T34, T3 khác; T12, T1, T2, T4 giống.
- Soi trúng lá bị sửa: "Em tìm ra rồi! {phanDien} đã sửa T3 từ 2 thành 3.", chạy hiệu ứng đỏ lan từ lá lên gốc (như cũ), rồi mới gọi `onTwist` (lời thầy Linh).
- Cuối phần: "Em soi {so} ô. Đi theo nhánh đỏ thì chỉ cần 2 ô mỗi tầng." ({so} đếm các ô em đã bấm; gốc hiện sẵn không tính.)
- Logic soi là hàm thuần trong `lessons/bai-4/inspect.ts` (dùng `combine`, `buildTree`): soi từng ô, ô nào bấm được theo trạng thái soi, trúng lá bị sửa thì xong, đếm số lần soi. Có test.

### Ở mốc 1

Cao trào (mốc 3) và hội làng (mốc 4) chưa có, nên ngay sau màn 10 chỉ có cảnh trao trang đơn giản, qua `LessonPage2D`:
- Dòng chú thích: "Thầy Linh trao Trang Sổ Vàng thứ tư." Trang giấy vàng bay vào ô thứ tư (bỏ hiệu ứng bay khi bật "Giảm chuyển động").
- Bi nói: "Đủ 4 trang rồi! Cả làng đang mở hội."
- Dòng "Hội làng sắp mở", rồi nút **"Về bản đồ"**.
- Trang Sổ Vàng thứ tư được trao một lần, ngay khi xong màn 10 (màn 11, 12 còn `coming-soon`). Học lại thì không trao nữa.
- Từ mốc 3: cao trào thay cho cảnh này, và Trang Sổ Vàng thứ tư chỉ trao sau cao trào.

## Màn 11 — Game phụ 1: "Ghép lá cây sổ" (kiểu Candy Crush)

Logic đặt trong `match3Logic.ts` (hàm thuần, có test).

**Câu chuyện:** {phanDien} rải lá giả khắp nơi để làm rối cây gộp sổ. Học sinh ghép các lá giao dịch cùng loại để dựng lại cây.

### Dựng bằng `Scene25D`

- **Nền:** `scenes/man-11-goc-da`.
- **Bên trái:** bàn ghép lá 7 × 7.
- **Bên phải:** cây hình chạc ba `sprites/man-11-ghep-la/cay-ghep-la`. Code đặt các ô lá ở đầu 8 nhánh (vòng 1 chỉ dùng 4 nhánh). Tọa độ các nhánh lưu trong `man11Slots.ts`, có trang `/dev/man-11-slots` để chỉnh khớp với ảnh.
- **Điện thoại khung dọc:** cây nằm trên, bàn ghép nằm dưới.
- **{phanDien}:** cứ mỗi 5 lượt, model 3D ló ra mép bàn, ném một lá giả (`swing`) rồi cười (`cheer`).

### Bàn chơi

- Lưới 7 × 7 với 6 loại lá (ảnh trong `ui/tiles/`).
- Đổi chỗ 2 ô kề nhau. Đổi xong mà không tạo được hàng nào thì hai ô trả về chỗ cũ.
- Từ 3 lá cùng loại thẳng hàng (ngang hoặc dọc) trở lên thì biến mất. Lá phía trên rơi xuống, lá mới thêm vào từ trên; nếu lại tạo hàng thì nổ dây chuyền.
- **Lá giả của {phanDien} (`la-gia`):**
  - không đổi chỗ được, không tính vào hàng;
  - biến mất khi có hàng nổ ngay sát bên (trên, dưới, trái, phải);
  - cứ mỗi 5 lượt, {phanDien} ném thêm 1 lá giả vào một ô ngẫu nhiên, có hoạt cảnh.
- **Ô đặc biệt:**
  - 4 lá thẳng hàng tạo ra ô **hoa sen** (`o-hoa`): khi nổ, xóa cả hàng ngang của nó.
  - 5 lá thẳng hàng tạo ra ô **gió xoáy** (`o-gio`): đổi chỗ với một lá nào đó thì xóa mọi lá cùng loại với lá đó.
- **Hết nước đi** (không còn cách đổi nào tạo được hàng): xáo lại bàn, lá giả giữ nguyên chỗ.

### Cây ở bên cạnh bàn

- Cây có các ô lá ở tầng dưới. Mỗi ô có hình loại lá cần ghép.
- Mỗi lần nổ một hàng loại X, nếu còn ô trống cần loại X thì một lá bay lên lấp ô đó.
- Hai ô cạnh nhau cùng đã đầy thì gộp thành một cành; đủ cành thì lên tới gốc.
- Gốc hình thành là xong vòng.

### Vòng chơi

| Vòng | Số ô lá trên cây | Số lượt | Lá giả lúc đầu |
|---|---|---|---|
| 1 | 4 | 20 | 3 |
| 2 | 8 | 25 | 5 |
| 3 | 8 | 25 | 8 |

Hết lượt mà cây chưa xong thì vòng đó không được thưởng, nhưng vẫn sang vòng sau. Game không bao giờ chặn đường.

### Điểm

- Mỗi lá nổ: +5.
- Mỗi ô cây được lấp: +50.
- Xong cây: mỗi lượt còn dư +20.

| Mốc | Điểm |
|---|---|
| Đồng | 600 |
| Bạc | 1000 |
| Vàng | 1400 |

### Test (`match3Logic.ts`)

Ký hiệu: A–G là các loại lá, X là lá giả. Bàn ghi theo hàng, ngăn hàng bằng dấu "/".

| Bàn | Kết quả mong đợi |
|---|---|
| `AAAB / CDEF` | Nổ đúng 3 ô (0,0), (0,1), (0,2) |
| `ABC / ADE / AFG` | Nổ đúng 3 ô cột 0 |
| `AAX / BCD` | Không nổ (lá giả không tính) |
| `ABAB / BABA / ABAB` | Còn nước đi (ví dụ đổi ô (0,1) với (1,1)) |
| `ABC / BCA / CAB` | Hết nước đi, phải xáo lại |
| Lá giả nằm sát một hàng vừa nổ | Lá giả biến mất |
| Nổ hàng loại A khi cây còn ô trống loại A | Lấp đúng 1 ô |
| Hai ô cạnh nhau cùng đầy | Gộp thành 1 cành |
| 4 lá thẳng hàng | Tạo ô hoa sen ở vị trí vừa đổi |

## Màn 12 — Game phụ 2: "Leo cây tìm lá giả" (kiểu leo dây của Talking Tom) và cao trào

Logic đặt trong `climbLogic.ts` (hàm thuần, có test).

**Câu chuyện:** lái buôn phương xa vừa trả một khoản bạc lớn. {phanDien} tráo một chiếc lá giao dịch trên cây đa để khoản bạc chảy về túi mình, nên số gốc báo lệch. Học sinh leo từ gốc lên, lần theo nhánh lệch để bắt {phanDien}.

### Dựng bằng `Scene25D` (khung dọc, camera đi theo người chơi lên trên)

- **Thân cây:** ghép nối từ `sprites/man-12-leo-cay/than-cay` theo chiều dọc; dưới cùng là `goc-cay`, trên cùng là `ngon-cay`.
- **Mỗi tầng:** thanh `canh-ngang`; hai tay nắm dùng `tay-nam`, số ghi trên tay nắm do code vẽ.
- **Nền trời:** code vẽ dải màu chuyển; tiền đồng dùng `ui/icons/tien-dong`.
- **Học sinh:** model 3D, clip `hang` khi đang treo, `jump` khi bật lên.
- **{phanDien}:** model 3D ngồi trên ngọn cây ôm chiếc lá giả.
- **Khung nhìn:** chơi được cả khung dọc lẫn ngang. Khung ngang thì để cây ở giữa, hai bên là bầu trời.

### Cây và cách leo

- **Cây mọc như cây thật:** gốc ở dưới, lá ở trên. Lần đầu vào màn, Bi giải thích: "Trên bảng thì gốc vẽ ở trên cùng; còn ở cây thật thì gốc ở dưới. Vẫn là một cây thôi!"
- **Thanh ngang:** mỗi tầng cây là một thanh ngang có **2 tay nắm** (`tay-nam`), ứng với nhánh trái và nhánh phải.
  - Mỗi tay nắm ghi 2 số: **số trong sổ / số hiện tại**.
- **Mô hình leo (mốc 3, bước B3; thay câu cũ "mỗi tay nắm ở một nửa thanh, trượt đối xứng", vì câu đó làm người chơi ở nửa trái không bao giờ với được nhánh phải):**
  - Tầng 0 là gốc (người chơi bắt đầu ở đây); ở tầng k, cặp tay nắm phía trên là 2 con của nút người chơi đang giữ; tầng trên cùng là các lá.
  - Người chơi treo ở x = 0 (giữa thân cây). Mỗi lần nắm được thì coi như kéo về giữa (hoạt cảnh làm ở bước B4).
  - Cặp tay nắm tầng trên trượt cùng nhau: x_trái = c(t) − 1,5, x_phải = c(t) + 1,5. c(t) là sóng tam giác trong [−1,5; 1,5], tốc độ |dc/dt| bằng tốc độ của vòng, pha ban đầu ngẫu nhiên mỗi tầng. Chu kỳ = 6 / tốc độ.
  - **Bật lên** (chạm, bấm chuột hoặc Space) lúc t: xét ở đỉnh cú bật, lúc t + 0,35 giây. Tay nắm nào có |x| ≤ tầm với thì nắm được. Hai tay nắm cách nhau 3 > 2 × tầm với nên không bao giờ nắm được cả hai.
  - Học sinh chọn nhánh bằng cách **canh lúc bật lên**: tay nắm trái tới ngay trên đầu khi c ở gần +1,5, tay phải khi c ở gần −1,5. Mỗi chu kỳ, mỗi tay nắm ở trong tầm với 2 × tầm với / tốc độ giây: vòng 1 là 1,0 giây, vòng 2 là 0,69 giây, vòng 3 là 0,5 giây, vòng 4 là 0,375 giây (chu kỳ 5; 3,75; 3; 2,5 giây).
- **Nắm trúng nhánh lệch:** lên tầng trên.
- **Nắm nhầm nhánh khớp:** "Ngõ cụt!", {phanDien} cười; ở lại tầng cũ, mất 1 tim, không bật được trong 1 giây.
- **Không nắm được gì:** ở lại tầng cũ, không mất tim, không bật được trong 1 giây.
- **Tầng trên cùng là các chiếc lá:** nắm được lá lệch (lá giả) là bắt được {phanDien} đang ngồi trên ngọn cây, xong vòng. Xong vòng 4 là thắng. Hết tim thì kết thúc game (Bi vào giúp, vẫn sang cao trào: bước B5).
- **Tiền đồng (bước B4):** mỗi khoảng giữa hai tầng có 2 đồng treo trên thân. Chỉ nhặt được khi leo qua khoảng đó ngay lần bật đầu tiên ở tầng đó (chưa trượt, chưa ngõ cụt ở tầng đó); không thì 2 đồng đó rơi mất. Tối đa 2 × (3 + 4 + 5 + 6) = 36 đồng. Leo hoàn hảo: 400 + 36 + 150 = 586 điểm; một lần ngõ cụt: 534; một lần trượt: 584. Logic: `coinsPerGap` trong `climbConfig.ts`, sự kiện `up` báo `coins` và `lostCoins`.

### 4 vòng

| Vòng | Số lá | Số tầng | Tốc độ tay nắm | Tầm với | Con số |
|---|---|---|---|---|---|
| 1 | 8 | 3 | 1,2 | 0,6 | Giá trị thật tính bằng `combine` |
| 2 | 16 | 4 | 1,6 | 0,55 | Giá trị thật tính bằng `combine` |
| 3 | 32 | 5 | 2,0 | 0,5 | Mã rút gọn 4 chữ số |
| 4 | 64 | 6 | 2,4 | 0,45 | Mã rút gọn 4 chữ số |

- **Cây mỗi vòng:** lá là chữ số 1–9; chọn đúng 1 lá bị {phanDien} tráo, đổi sang chữ số 1–9 khác. "Số trong sổ" là cây dựng từ lá gốc, "số hiện tại" là cây dựng từ lá đã tráo, cả hai bằng `buildTree` của Bài 4. Các nút lệch đúng là các nút trên đường từ lá bị tráo lên gốc.
- **Mã rút gọn (vòng 3–4):** ở nhánh lệch, hai số chỉ khác nhau 1–2 chữ số, cho khó nhận ra hơn. Cách sinh (bước B3):
  - Mã trong sổ = 4 chữ số cuối của giá trị trong sổ (đệm 0 bên trái).
  - Nút khớp: mã hiện tại = mã trong sổ.
  - Nút lệch: mã hiện tại biến đổi từ mã trong sổ bằng rng: hoặc đổi 1 chữ số sang chữ số khác, hoặc đảo 2 chữ số liền nhau KHÁC nhau (mã không có cặp như vậy thì đổi 1 chữ số). Luôn khác mã trong sổ.
  - KHÔNG lấy mã hiện tại từ 4 chữ số cuối của giá trị hiện tại: lá bị sửa ở sâu thì độ lệch bị nhân 10^k, nên 4 chữ số cuối có thể trùng nhau.
- **Hết mỗi vòng**, hiện: "Em chỉ leo d tầng thay vì kiểm tra cả 2^d lá!", trong đó d là số tầng, 2^d là số lá.

### Tim, điểm

- 3 tim cho cả game. Hết tim thì Bi vào giúp ("Để Bi giúp em!") và vẫn dẫn vào cảnh cao trào.
- Điểm = số vòng xong × 100 + số tiền đồng + số tim còn lại × 50.

| Mốc | Điểm |
|---|---|
| Đồng | 250 |
| Bạc | 400 |
| Vàng | 520 |

### Cảnh cao trào (sau vòng 4, bỏ qua được)

1. Học sinh tóm được {phanDien} trên ngọn cây (ảnh truyện số 10, rồi cảnh 3D).
2. {phanDien} cúi đầu: "Sửa trang thì cả chuỗi lệch, gian thì mất cọc, giả dấu thì bị soi ra, tráo lá thì số gốc đổi… Hóa ra làm thật mới có lời."
3. Cụ Bình: "Biết sai thì sửa. Làng đang cần thêm người giữ sổ cẩn thận. {phanDien} có muốn làm không?" {phanDien}: "Có ạ!" (ảnh truyện số 11).
4. Thầy Linh trao **Trang Sổ Vàng thứ tư**. Sau đó về chợ và chuyển sang `/hoi-lang` (spec 10).

### Test (`climbLogic.ts`)

| Tình huống | Kết quả mong đợi |
|---|---|
| Lá `[3,7,5,2,6,1,4,8]`, đổi T8 thành 9 | Gốc 4878 / 4879; T1234 422 / 422; T5678 658 / 659; T56 61 / 61; T78 48 / 49; T7 4 / 4; T8 8 / 9 |
| Sinh 500 cây | Trên đường từ gốc tới lá giả, mỗi tầng có đúng một nhánh lệch; mọi nút ngoài đường đi đều khớp |
| Mã rút gọn của nhánh lệch | Khác 1–2 chữ số so với số trong sổ, và luôn khác số trong sổ |
| Tay cách tay nắm 0,5 khi tầm với là 0,6 | Nắm được |
| Nắm nhầm nhánh khớp | Ở lại tầng cũ, mất 1 tim, khóa bật 1 giây |
| Không nắm được gì | Giữ nguyên tầng, tim không đổi, khóa bật 1 giây |

Code ở `packages/village-lang-bac/src/climb/` (`climbConfig.ts`, `climbLogic.ts`, `climbLogic.test.ts`). Ngoài bảng trên, test còn có: sinh 500 cây mỗi vòng, mã rút gọn của 500 cây, c(t) luôn trong [−1,5; 1,5] và cửa sổ nắm được đúng 2 × tầm với / tốc độ ở cả 4 vòng, bot canh đúng leo hết 4 vòng không mất tim với 300 seed, điểm (4 vòng, 10 đồng, 2 tim → 510), cùng seed thì cùng cây.

**Đã làm (mốc 3, bước B4: cảnh, chưa có cao trào; màn 12 vẫn `coming-soon`, chơi thử ở `/dev/man-12` của vỏ lang-bac khi chạy dev):**
- Code: `climbLayout.ts` (bố cục thuần, có test), `climbArt.ts` (nạp hình, cắt khung, tách nền trắng của hai hình lá, vẽ trời và nhãn), `ClimbStage.tsx` (cảnh trong Scene25D), `ClimbGame.tsx` (màn chơi), `pages/Man12.tsx`, `climbBots.ts` + `climbBalance.test.ts`. Scene25D nhận `background={null}` để cảnh tự vẽ trời.
- Cảnh: cây ghép từ `than-cay` (cắt bỏ hai đầu tròn), `goc-cay` dưới cùng, `ngon-cay` trên cùng; mỗi tầng một `canh-ngang`, tay nắm `tay-nam` (tầng lá dùng `ui/tiles/la-da`), {phanDien} trên ngọn ôm `ui/tiles/la-gia`. Hai hình lá có nền trắng đục nên code tách nền khi nạp. Khoảng cách tầng 3,6 đơn vị; camera đi theo tầng người chơi đang giữ (Giảm chuyển động: nhảy thẳng).
- Nhãn trên tay nắm: hai dòng "Sổ: …" / "Nay: …" cùng màu, không đánh dấu nhánh nào lệch. Đo: 17,3 px ở 360 × 640 và 844 × 390, 36,3 px ở 1366 × 768 (không dưới 14 px, "Chữ to" nhân 1,15).
- Cú bật nhận ở `pointerdown` và `keydown` (Space không cuộn trang). Nắm được thì tay nắm kéo về giữa thân trong 0,3 giây (chỉ là hình). Ngõ cụt: "Ngõ cụt!", {phanDien} `cheer`, nhân vật tụt về. Bắt được: {phanDien} `jump`, sau 1,1 giây hiện "Bắt được {phanDien}!" và "Em chỉ leo d tầng thay vì kiểm tra cả 2^d lá!".
- Lần đầu vào màn Bi nói câu "Trên bảng thì gốc vẽ ở trên cùng…"; cờ `gameTipSeen` (`progress/gameTips.ts`, cookie `gt`, bit số màn − 1).
- **Clip `hang` của `hoc-sinh-nam` đang sai:** ở `/dev/3d` clip "hanging from a horizontal bar with both arms straight up above" cho tư thế ngồi co, tay ôm mặt, không phải treo tay. Tạm dùng `idle` (đầu ngay dưới tay nắm, `STUDENT_HANG_CLIP` trong `ClimbStage.tsx`), chờ quyết định sửa file đồ họa hay dựng tư thế treo bằng code.

**Cân bằng (300 ván mỗi bot, seed 1 đến 300, mốc 250 / 400 / 520):**

| Bot | Điểm trung bình | Chưa đạt | Đồng | Bạc | Vàng | Hết tim |
|---|---|---|---|---|---|---|
| Giỏi: lệch giờ σ 0,04 giây, không đọc nhầm | 586 | 0% | 0% | 0% | 100% | 0% |
| Trung bình: lệch giờ σ 0,12 giây, đọc nhầm số 10% số lần | 441,9 (2 đến 586) | 12,0% | 18,7% | 28,3% | 41,0% | 30,7% |

Bot trung bình CHƯA đạt tiêu chí (Đồng hoặc Bạc ≥ 80%, Vàng dưới 10%): mốc giữ nguyên, chờ chủ dự án quyết. Thử thêm (không đưa vào luật): bỏ đọc nhầm (σ 0,12) thì 100% Vàng; σ 0,2 và đọc nhầm 10% thì Vàng 43,3%; đọc nhầm 20% thì Vàng 5,7% nhưng hết tim 80,7%. Lệch giờ gần như không đổi kết quả (trượt chỉ mất 2 đồng); kết quả do số lần đọc nhầm quyết định (mỗi lần mất 1 tim, 50 điểm, và có thể hết tim).

## Checklist nghiệm thu

- [ ] Test Bài 4 (giai đoạn 1), `match3Logic` và `climbLogic` đều ✅.
- [ ] Màn 10: bẫy thứ tự T21 chạy đúng; ánh đỏ chạy đúng đường từ thẻ bị tráo lên gốc.
- [ ] Màn 11:
  - đổi ô mượt, nổ dây chuyền đúng;
  - lá giả chỉ mất khi có hàng nổ sát bên;
  - cây lấp ô đúng loại lá.
- [ ] Màn 12:
  - canh nhảy chọn nhánh được trên cả điện thoại lẫn máy tính;
  - con số khó dần qua 4 vòng;
  - hết tim vẫn xem được cao trào.
- [ ] Sau cao trào: có đủ 4 Trang Sổ Vàng, chuyển sang hội làng.

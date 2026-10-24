# SPEC 06 — BÀI 2: LÀNG DỆT (mốc 1: bài học; mốc 3: cảnh làng, màn 5, màn 6)

**Gói:** `packages/village-lang-det`. Gồm màn 4 (bài học), màn 5, màn 6. Chạy riêng ở `lang-det.ten-mien.vn`.

**Nguồn luật:** luật, số liệu, bot và cách chấm sao của bài học giữ đúng **spec giai đoạn 1 `03-bai2-node.md`**. Dùng lại `isValidProposal`, các hàm tạo đề và `bots.ts` trong `packages/core/src/lessons/bai-2`.

**Người dẫn:** cụ Bình (`characters/cu-binh`) và cô Chi (`characters/co-chi`). Cả hai không có xương, chuyển động theo spec 03 mục 3.4.

**Loại cảnh:** cảnh làng là 3D đi lại; màn 4 là trang bài học 2D; màn 5 và màn 6 là 2.5D. Tên phản diện viết `{phanDien}` (hiện là Tí).

## Cảnh làng (3D đi lại, vùng làng của `WorldScene` ở thế giới mở `/cho`; bước W1 chỉ có bản tối giản, nội dung đầy đủ làm sau)

- **Cổng vào:** `env/cong-lang-det`.
- **Bên trong:** nhà `env/nha-mai-ngoi` và `env/nha-mai-tranh`; vài `env/khung-cui` đặt dưới hiên.
- **Code tự dựng:** sào phơi vải (các tấm vải đỏ, hồng, chàm phấp phới); một sân đình lát gạch (texture `ui/textures/san-gach`) làm khoảng sân giữa làng.
- **Cụ Bình và cô Chi** đứng ở sân đình.
- **Cảnh mở đầu:** ảnh truyện số 7 kèm lời. Cụ Bình: "Ở làng này, nhà nào cũng giữ một cuốn sổ giống hệt nhau. Có trang mới là cả làng kéo về đình kiểm."
- **3 biển gỗ:** "Học cùng cụ Bình" (màn 4), "Đập {phanDien}" (màn 5), "Diều đưa sổ" (màn 6).

## Màn 4 — Game chính: "Cả làng cùng giữ sổ" (trang bài học 2D)

**Dựng bằng `LessonPage2D`:**
- Nền: `scenes/bai-hoc-lang-det`.
- Bảng giữa: **dùng lại nguyên bài 2 của web 2D giai đoạn 1**, gồm 3 trạm Duyệt trang, So sổ, Đặt cọc với các bot Bình, Chi và `{phanDien}`.
- **Giữ đúng 2 luật:** phiếu của bot chỉ hiện **sau** khi học sinh đã chọn; `{phanDien}` gian lận ở lượt đầu.

**Lời người dẫn:**

| Thời điểm | Ai nói | Lời thoại |
|---|---|---|
| **Đầu bài** | Cụ Bình | "Mỗi nhà là một người giữ sổ. Trang mới phải được cả làng kiểm lại rồi mới ghi." |
| **Trước Trạm Khó** | Cô Chi | "Duyệt nhanh cho xong việc được không cụ?" Cụ Bình đáp: "Duyệt ẩu là mất cọc đấy!" |
| **Cuối bài** | Cụ Bình | "Gian một lần thì mất cọc, làm thật thì có thưởng. Ai cũng hiểu nên chẳng ai muốn gian." |

## Màn 5 — Game phụ 1: "Đập {phanDien}" (kiểu Whack-A-Mouse của My Talking Tom, có câu hỏi)

Logic đặt trong `whackLogic.ts` (hàm thuần, có test).

**Câu chuyện:** {phanDien} gấp các trang giả thành **chuột giấy**, thả cho chạy xuống sân để bôi mực vào cuốn Sổ Chung đặt cuối sân. Học sinh cầm quạt nan đập chuột. Thỉnh thoảng chính {phanDien} chạy xuống. Phải trả lời đúng câu hỏi mới đét trúng được.

### Dựng bằng `Scene25D`

- **Nền:** `scenes/man-05-san-det`: 4 dải vải trải dọc sân, từ cổng đình ở trên xuống bàn đặt sổ ở dưới.
- **4 làn:** mỗi làn là một đoạn thẳng từ điểm trên tới điểm dưới, tính theo tọa độ chuẩn hóa của ảnh, lưu trong `man05Lanes.ts`.
  - Có trang `/dev/man-05-lanes` để bấm chọn điểm trực tiếp trên ảnh, khớp đúng 4 dải vải.
  - Chuột chạy dọc theo đoạn thẳng, càng lên trên càng nhỏ (theo phối cảnh của ảnh).
- **Vùng đập:** đoạn cuối mỗi làn, ngay trên bàn sổ, từ **10% đến 35%** chiều dài làn tính từ dưới lên (sửa sau B6, trước là 15% đến 30%, xem "Sửa sau B6" bên dưới). Có vệt sáng mờ để học sinh nhìn thấy.
- **Hình rời:** `sprites/man-05-dap-ti/` gồm `chuot-giay-thuong`, `chuot-giay-doi-lan`, `chuot-giay-nhanh`, `chuot-giay-to`, `vet-muc`. Tiền đồng dùng `ui/icons/tien-dong`.
- **Học sinh:** model 3D đứng ở hàng dưới cùng, dưới đuôi các làn (không che vùng đập), tay phải cầm quạt nan (code dựng, gắn vào xương `mixamorig:RightHand`). Khi đập thì trượt ngang sang chân làn đó và dùng tư thế `swing`.
- **{phanDien}:** model 3D, xuất hiện khi làm "trùm".
- **Cô Chi:** đứng cố định ở khoảng trống bên trái sân (không xương, không che làn), nhún vui mỗi lần học sinh đét trúng {phanDien}.

### Điều khiển

| Thiết bị | Cách đập |
|---|---|
| Máy tính | Phím D, F, J, K (hoặc 1–4), hoặc bấm chuột vào làn |
| Điện thoại | Chạm vào làn |

- Đập trúng con chuột **thấp nhất** đang nằm trong vùng đập của làn đó.
- Không có chuột trong vùng thì đập hụt, không bị phạt; làn đó nghỉ 0,2 giây.

### Chuột giấy

| Loại | Đặc điểm | Điểm |
|---|---|---|
| Thường | Chạy thẳng | 10 |
| Đổi làn | Khi còn cách vùng đập 1,5 đơn vị, nhảy sang làn bên cạnh **một lần** (ở làn ngoài cùng thì sang làn phía trong), nhưng chỉ khi làn đó đang trống trong khoảng ±1,5 quanh vị trí của nó; không thì ở nguyên làn (vẫn là chuột đổi làn, vẫn 15 điểm) | 15 |
| Nhanh | Nhỏ hơn, nhanh gấp 1,6 lần | 15 |
| To | Phải đập 2 lần; sau lần đầu khựng lại 0,3 giây và chớp sáng | 30 |

**Tốc độ và nhịp sinh:**
- Chuột cần 3 giây để chạy từ đầu làn tới **đầu vùng đập**; giảm dần còn 1,8 giây ở giây thứ 120.
- Nhịp sinh 1,2 giây một con, giảm dần còn 0,55 giây.
- Không sinh chuột vào làn nếu con gần nhất ở làn đó còn quá gần điểm xuất phát (dưới 15% chiều dài làn).

**Tỉ lệ các loại chuột theo thời gian:**

| Thời gian | Thường | Đổi làn | Nhanh | To |
|---|---|---|---|---|
| 0–20 giây | 100% | | | |
| 20–40 giây | 80% | 20% | | |
| 40–60 giây | 60% | 20% | 20% | |
| Từ 60 giây | 45% | 20% | 20% | 15% |

**Lọt chuột:** chuột chạy qua vùng đập tới cuốn sổ thì sổ bị loang **1 vết mực** (`vet-muc` hiện trên sổ). **Sổ chịu tối đa 8 vết mực: đủ 8 vết là thua** (cân bằng sau B6, trước là 5). Thanh 8 chấm tròn ở góc màn hình chuyển đỏ dần, giống Talking Tom.

**Tiền đồng:** khoảng 8 giây hiện một đồng, tồn tại 2,5 giây. Chạm vào được +5 điểm và +1 xu.

### {phanDien} làm "trùm" (có câu hỏi)

- **Xuất hiện ở giây thứ 12, 24, …, 120** (10 lần).
- **Khi trùm ra:**
  - ngừng sinh chuột mới; chuột đang chạy chậm lại còn 20% tốc độ;
  - {phanDien} chạy xuống một làn ngẫu nhiên (`run`), dừng giữa vùng đập, rồi `cheer` trêu.
- **Câu hỏi:** hiện `QuizCard`, ôn Bài 1–2. Có 15 giây cho lần 1–5, 10 giây cho lần 6–10.
  - Rê chuột lên đáp án nào thì học sinh **quay đầu nhìn đáp án đó** (`ChoiceReaction`).
- **Đúng:** {phanDien} chạy xuống cuối làn, ngay trên chỗ học sinh đứng; học sinh đét quạt nan vào mông {phanDien} (`swing`). {phanDien} giật nảy (`hurt`), kêu "Ui da!" rồi chạy ngược lên, biến mất. Được **100 + 5 × số giây còn lại**, và **xoá 2 vết mực** nếu đang có (cân bằng sau B6, trước là 1).
- **Sai hoặc hết giờ:** học sinh đập trượt, {phanDien} cúi né, lè lưỡi rồi chạy thẳng xuống sổ: **+1 vết mực**. Hiện đáp án đúng và giải thích.
- **Kết thúc:** xong lượt trùm thứ 10 (chơi trọn), hoặc đủ 8 vết mực.

### Điểm

| Mốc | Điểm |
|---|---|
| Đồng | 1650 |
| Bạc | 2650 |
| Vàng | 3100 |

Các mốc này **tạm, chỉnh khi học sinh chơi thật** (sửa sau B6: trước là 800 / 1600 / 2400). Đặt theo số liệu bot sau cân bằng phương án A (300 ván mỗi bot; 800 / 1600 / 2400 rồi 550 / 1500 / 3100 là các mốc trước): Đồng = phân vị 25% điểm bot trung bình (1675) làm tròn xuống bội số 50; Bạc = phân vị 75% điểm bot trung bình (2675) làm tròn xuống bội số 50; Vàng = phân vị 10% điểm bot giỏi (3120) làm tròn xuống bội số 100. Số liệu: mục "Chốt cho logic" bên dưới.

### Chốt cho logic (mốc 3, bước B6 và sửa sau B6; code ở `packages/village-lang-det/src/whack/`)

Chỉ có logic (chưa có cảnh; màn 5 vẫn `coming-soon`). Đơn vị thời gian là **giây**. Cấu trúc theo mẫu màn 12: `whackConfig.ts` (số liệu, mốc `WHACK_SPEC.medals`), `whackLogic.ts` (hàm thuần, `createMulberry32`), `whackLogic.test.ts`, `whackBots.ts`, `whackBalance.test.ts`, `index.ts`.

- **Làn dài 10 đơn vị**, vị trí tính từ đầu làn (0) xuống sổ (10). **Vùng đập** từ 10% đến 35% chiều dài tính từ dưới lên, tức vị trí **[6,5; 9]** (dài 2,5 đơn vị). Tới 10 là lọt vào sổ.
- **Đồng hồ lịch** (dùng cho lịch trùm 12, 24, …, 120; tỉ lệ loại chuột; tốc độ; nhịp sinh) **dừng trong lượt trùm** (cả lúc {phanDien} chạy xuống lẫn lúc mở câu hỏi). Tiền đồng (hiện, biến mất) cũng đếm theo đồng hồ này nên dừng (tự chọn).
- **Lượt trùm:** ngừng sinh chuột; chuột đang chạy còn 20% tốc độ trong lúc {phanDien} chạy xuống (1,2 giây, tự chọn); khi bảng câu hỏi mở thì chuột **đứng yên** và không nhận cú đập. Trả lời xong (hoặc hết giờ) thì {phanDien} rời đi, mọi thứ chạy lại. Trong lúc {phanDien} chạy xuống vẫn đập được chuột (tự chọn).
- **Điểm trùm:** số giây còn lại **làm tròn xuống** (còn 7,0 đến 7,99 giây thì 7 → +135). Logic chỉ nhận kết quả `correct` / `wrong` / `timeout` kèm số giây còn lại; đếm giờ và chọn câu hỏi do `QuizCard` lo. Đúng thì **xoá 2 vết mực** nếu đang có (không xuống dưới 0); sai hoặc hết giờ +1 vết mực.
- **Tốc độ:** chuột cần 3 giây từ 0 tới đầu vùng đập (vị trí 6,5; tốc độ 6,5/3 đơn vị/giây), giảm tuyến tính còn 1,8 giây ở giây 120 của đồng hồ lịch (rồi giữ). Tốc độ của mỗi con chốt lúc sinh. **Nhịp sinh** 1,2 giây giảm tuyến tính còn 0,55; con đầu tiên ở giây 1,2 (tự chọn). Không sinh vào làn có con gần nhất còn dưới 1,5; chọn làn đều trong các làn còn lại.
- **Thời gian chuột nằm trong vùng đập** (2,5 đơn vị ÷ tốc độ): chuột thường **1,154 giây** ở giây 0 và **0,692 giây** ở giây 120; chuột nhanh (×1,6) **0,721 giây** ở giây 0 và **0,433 giây** ở giây 120.
- **Đổi làn:** tới vị trí **5,0** (cách vùng đập 1,5) thì nhảy sang làn kề một lần, nhưng chỉ sang làn kề đang **trống trong khoảng ±1,5 quanh vị trí của nó** (không có chuột nào của làn đó ở vị trí cách nó ≤ 1,5). Làn 0 → 1, làn 3 → 2; làn giữa thử bên rng chọn, bị chiếm thì thử bên kia; không làn nào trống thì **không đổi** (không thử lại; vẫn là chuột đổi làn, vẫn 15 điểm). **Nhanh:** tốc độ ×1,6. **To:** đập 2 lần; sau lần đầu khựng 0,3 giây (đứng yên) và có cờ chớp sáng; hạ xong +30.
- **Đập hụt:** làn nghỉ 0,2 giây (không nhận cú đập); đập trúng không nghỉ. **Tiền đồng:** hiện ở làn ngẫu nhiên, vị trí ngẫu nhiên trong [2; 6] (tự chọn), cách nhau 8 ± 1 giây, tồn tại 2,5 giây, chạm +5 điểm +1 xu. **Thua:** đủ 8 vết mực (xét trước); **thắng trọn:** xong lượt trùm thứ 10.
- **Bước mô phỏng cố định 1/120 giây:** `stepWhack(s, dt)` chia `dt` thành các bước này (rng chỉ rút trong bước cố định) nên cùng seed cùng ván và dt khác nhau (1/30, 1/60, 1/144) cho cùng chuỗi sinh chuột, đồng và trùm.

**Sửa sau B6 (lý do: game quá khó, bot trung bình thua sau khoảng 20 chuột, không tới được câu hỏi):**

| Luật | Trước | Sau |
|---|---|---|
| Vùng đập | 15% đến 30%, vị trí [7; 8,5] | 10% đến 35%, vị trí [6,5; 9]; "3 giây / 1,8 giây" tính tới đầu vùng mới (6,5) |
| Đổi làn | còn cách vùng đập 1,5 → vị trí 5,5; luôn nhảy | vị trí 5,0; chỉ nhảy khi làn kề trống trong ±1,5 |
| Trả lời đúng câu trùm | chỉ cộng điểm | cộng điểm và xoá 1 vết mực nếu đang có (sau B6); xoá 2 vết (cân bằng sau B6) |
| Mô hình bot | phản xạ từ lúc chuột vào vùng; bỏ sót 25% | canh trước: đập lúc chuột ở giữa vùng, lệch giờ chuẩn σ; bỏ sót 2% / 10% |
| Mốc | 800 / 1600 / 2400 | 550 / 1500 / 3100 (sau B6); 1650 / 2650 / 3100 (cân bằng sau B6; tạm, theo phân vị bot) |

**Cân bằng sau B6 (lý do: bot trung bình lọt khoảng 14 chuột mỗi ván, 5 vết mực quá ít: chỉ gặp 4,74 lượt trùm).** Chỉ chỉnh luật vết mực và nhịp sinh, thử lần lượt, dừng ở phương án đầu tiên đạt cả hai mục tiêu (bot trung bình gặp trung bình ≥ 6 lượt trùm; bot giỏi Vàng ≥ 90% với mốc đặt lại theo phân vị):

- **A (ĐÃ CHỌN, đạt cả hai mục tiêu):** sổ chịu tối đa **8** vết mực (thay 5); trả lời đúng câu trùm xoá **2** vết (thay 1).
- B (không cần thử để chọn, ghi để tham khảo): A + nhịp sinh cuối ván 0,7 giây (thay 0,55).
- C (như trên): B + tối đa 10 vết mực.

**Số liệu bot** (`whackBalance.test.ts`, 300 ván mỗi bot, seed 1 đến 300). Bot "canh trước": với mỗi con chuột chọn giờ đập lúc con đó ở giữa vùng đập (vị trí 7,75), lệch giờ theo phân phối chuẩn; một tay (hai cú đập cách nhau ≥ 0,15 giây), xếp hàng theo thứ tự chuột tới vùng; chuột to đập lần hai sau lần đầu + 0,3 giây khựng; tiền đồng nhặt sau 0,3 giây (tự chọn); chỉ dùng thao tác của học sinh. Mốc của mỗi dòng đặt lại theo đúng quy tắc phân vị (Đồng = p25 và Bạc = p75 điểm bot trung bình, bội số 50; Vàng = p10 điểm bot giỏi, bội số 100):

| Phương án (mốc) | Bot | Chưa đạt | Đồng | Bạc | Vàng | Thua (đầy sổ) | Điểm trung bình (nhỏ nhất đến lớn nhất) | Lượt trùm gặp được (trung bình) | % ván hết 10 lượt trùm |
|---|---|---|---|---|---|---|---|---|---|
| Trước (5 vết, xoá 1; mốc 550 / 1500 / 3100) | Giỏi | 0% | 0% | 8,7% | 91,3% | 0,3% | 3264,9 (2310 đến 3490) | 9,997 | 99,7% |
| | Trung bình | 23,0% | 49,0% | 28,0% | 0% | 98,7% | 1105,5 (55 đến 2940) | 4,74 | 1,3% |
| **A** (8 vết, xoá 2; mốc **1650 / 2650 / 3100**) | Giỏi | 0% | 0% | 8,7% | **91,3%** | 0% | 3266,1 (2670 đến 3490) | 10 | 100% |
| | Trung bình | 23,3% | 48,0% | 28,7% | 0% | 57,3% | 2129,3 (165 đến 2990) | **8,31** | 44,3% |
| B (A + nhịp sinh cuối 0,7 giây; mốc 1800 / 2500 / 2900) | Giỏi | 0% | 0% | 9,0% | 91,0% | 0% | 3062,8 (2695 đến 3275) | 10 | 100% |
| | Trung bình | 24,7% | 42,3% | 32,7% | 0,3% | 42,3% | 2127,2 (435 đến 2935) | 8,76 | 57,7% |
| C (B + 10 vết; mốc 2150 / 2550 / 2900) | Giỏi | 0% | 0% | 9,0% | 91,0% | 0% | 3062,8 (2695 đến 3275) | 10 | 100% |
| | Trung bình | 23,3% | 50,7% | 25,7% | 0,3% | 27,3% | 2291,3 (565 đến 2935) | 9,38 | 73,7% |
| Lý tưởng (σ 0, không sót, đúng hết, trả lời ngay; luật A) | | 0% | 0% | 0% | 100% | 0% | 3576,4 (3395 đến 3745) | 10 | 100% |

- **Hai bot:** giỏi σ 0,05 giây, bỏ sót 2%, đúng câu hỏi 95%, trả lời sau 4 giây; trung bình σ 0,12 giây, bỏ sót 10%, đúng 70%, trả lời sau 7 giây.
- **Chọn A vì là phương án đầu tiên đạt cả hai mục tiêu:** bot giỏi Vàng 91,3% (≥ 90%), bot trung bình gặp trung bình 8,31 lượt trùm (≥ 6). Lọt trung bình 12,4 chuột mỗi ván.
- **Mốc mới 1650 / 2650 / 3100 (tạm, chỉnh khi học sinh chơi thật):** Đồng = p25 bot trung bình 1675 → 1650; Bạc = p75 bot trung bình 2675 → 2650; Vàng = p10 bot giỏi 3120 → 3100. Đồng < Bạc < Vàng. Với mốc này bot trung bình: 23,3% chưa đạt, 48,0% Đồng, 28,7% Bạc, không Vàng.
- **Điểm tối đa lý thuyết ước tính khoảng 3580:** trùm 5 × (100 + 5 × 15) + 5 × (100 + 5 × 10) = 1625; khoảng 143 chuột (khoảng 1880 điểm); khoảng 14,5 đồng (khoảng 73 điểm).

### Cảnh màn 5 (mốc 3, bước B7; code ở `packages/village-lang-det/src/whack/`)

`Man5.tsx` bọc `WhackGame` trong `MiniGameLevel` (`medals={WHACK_SPEC.medals}`); route `man/5` ở `village-lang-det/src/index.ts`; `levels.ts` đặt màn 5 `ready` (màn 6 còn `coming-soon`). Logic chỉ gọi lại `whackLogic.ts` (không viết lại luật); `WhackGame` nối thao tác, hoạt cảnh, âm thanh vào luật.

- **Làn:** `man05Lanes.ts` (`MAN05_LANES`: 4 đoạn thẳng theo tọa độ chuẩn hóa của ảnh `scenes/man-05-san-det` 1376 × 768, khớp 4 dải vải; `LANE_SCALE` 0,45 ở đầu làn tới 1 ở sổ theo phối cảnh; `BOOK_POINT`; hàm thuần `lanePose`, `laneHeading`, `laneAt`, `imageToWorld`). Sửa sau B7: đầu dưới làn 2 (u 0,538) và làn 4 (u 0,77) dời cho nằm giữa dải vải (đo lại bằng màu trên ảnh; làn 4 trước lệch xuống mép dưới dải xanh lá chừng 50 điểm ảnh). Thêm `MAN05_CLOTH` (mép trái, phải của từng dải vải, đo bằng màu ở hai hàng ảnh) và `laneQuad`: hình thang bám dải vải của một đoạn làn (hai cạnh ngang nghiêng nhẹ theo `CLOTH_TILT`), dùng vẽ vệt sáng vùng đập và dựng hộp kiểm bố cục. **Chỉnh làn:** chạy `pnpm dev:lang-det` rồi mở `http://localhost:5175/dev/man-05-lanes` (chỉ khi chạy dev): chọn đầu làn hay cuối làn, bấm lên ảnh (hoặc kéo), ô dưới ảnh xuất khối mã `MAN05_LANES` để chép đè vào `man05Lanes.ts`. Nét dày trên mỗi làn là vùng đập (pos 6,5 đến 9), chấm mỗi đơn vị pos; hình thang trắng mờ là vệt sáng như trong game (theo `MAN05_CLOTH`, không đổi khi kéo làn).
- **Dựng cảnh (`WhackStage.tsx`, Scene25D, chỉ khung ngang):** chuột giấy (`sprites/man-05-dap-ti/*`) chạy dọc làn, xoay đầu xuống sổ, nhỏ dần lên trên; vệt sáng vùng đập vẽ RIÊNG cho từng làn, là hình thang bám hai mép dải vải (thu vào 5% mỗi bên nên không loang sang làn bên), viền sáng rõ ở mép trên và mép dưới, phần trong mờ nhẹ (nhấp nhô nhẹ, sáng lên khi đập vào làn); chuột to chớp sáng lúc khựng; chuột đổi làn nhảy rồi trượt về chỗ mới trong khoảng 0,1 giây; vết mực (`vet-muc`) hiện trên sổ theo số vết (nảy lên khi vừa loang); tiền đồng (`ui/icons/tien-dong`) nhấp nháy khi sắp biến mất. Chuột, đồng và vệt sáng vẽ ĐÈ lên nhân vật nếu giao nhau (tắt kiểm tra độ sâu, `renderOrder` sau nhân vật). **Dùng pool, không tạo object mới trong `useFrame`:** 20 chuột, 8 vết mực, 1 đồng, 4 vệt sáng (mesh, hình học và vật liệu tạo một lần, ẩn/hiện, đổi vị trí và cỡ; ô pool giữ theo id chuột). Khung dọc của điện thoại: Scene25D hiện nhắc "Xoay ngang để chơi" và game DỪNG (như màn 3).
- **Bố cục (`whackLayout.ts`, hàm thuần có test `whackLayout.test.ts`; sửa sau B7):** học sinh, cô Chi, {phanDien} lúc đứng chờ và HUD KHÔNG che 4 vùng đập và đoạn làn ngay trên (từ pos 5 tới hết vùng đập: `guardBox`). Test: hộp bao các nhân vật (kể cả quạt giơ cao, tay giơ trêu) và HUD không giao hộp bao 4 vùng đập, cả lúc học sinh trượt giữa các làn, ở 640×360, 844×390, 1366×768 và 1024×768 (4:3, khung 16:9 có dải đen). Khung luôn 16:9 nên chỉ HUD (cỡ cố định theo điểm ảnh) đổi theo cỡ cửa sổ.
- **Trùm (dòng thời gian tính theo đồng hồ hoạt cảnh, dừng khi tạm dừng):** {phanDien} (clip `run`, nhìn ra người chơi) chạy xuống làn được chọn theo `boss.pos` của logic nhưng trong cảnh chỉ tới `BOSS_WAIT_POS` = 3 (ở đầu làn, nhỏ theo phối cảnh, phía trên đoạn làn được giữ trống; logic vẫn tính trùm dừng giữa vùng đập), `cheer` trêu, rồi mở câu hỏi. **Đúng:** học sinh trượt tới chân làn của trùm, {phanDien} chạy xuống `BOSS_HIT_POS` = 9,3 (cuối làn, ngay trên học sinh), học sinh `swing` (0,3 giây sau khi trùm tới), trùm `hurt` (0,45 giây; bỏ khi "Giảm chuyển động"), bong bóng "Ui da!" trên đầu trùm, rồi trùm quay lưng chạy ngược lên và biến mất. **Sai hoặc hết giờ:** trùm cúi (`sad`) tại chỗ chờ, `cheer` lè lưỡi, rồi chạy thẳng xuống sổ. Kết quả chỉ đưa cho luật khi em bấm "Chơi tiếp" sau khi đọc lời giải thích (`answerBoss`), nên chuột và đồng hồ đứng yên suốt lúc đọc; điểm và vết mực đổi lúc đó. Cô Chi nhún vui lúc em bấm "Chơi tiếp" sau một câu đúng (bảng câu hỏi che cô lúc trùm bị đét).
- **Câu hỏi:** `pickQuestions({ bai: [1, 2], soCau: 10, seed })` (cách chọn như màn 2: không lặp, trộn đáp án). Bảng câu hỏi là một cột rộng 45% khung, cao hết khung (`QuizCard` có thêm thuộc tính `compact`), nằm BÊN TRÁI khi trùm ở làn 3 hay 4 và BÊN PHẢI khi trùm ở làn 1 hay 2 (để không che trùm và làn của nó; khi bảng sang phải thì HUD sang góc trái và tiêu đề bảng chừa chỗ cho nút "?"). Tiêu đề bảng và đồng hồ trả lời (15 giây lần 1–5, 10 giây lần 6–10, đếm bằng đồng hồ của game) gộp một khối hai dòng. Đã đo với cả 16 câu của Bài 1–2 ở 640×360 (chặt nhất: dùng 339 trong 352 điểm ảnh cao), 844×390, 1366×768, 1024×768: không cuộn, đủ đáp án, chữ câu hỏi 15,2 px, chữ đáp án 14 px, nút cao 44 px. Rê chuột hay focus vào đáp án thì học sinh quay đầu nhìn theo (`aimFromRects`, kho `choiceReactions` của QuizCard).
- **Điều khiển:** phím D F J K (hoặc 1 2 3 4, cả bàn phím số) cho làn 1 đến 4, bấm chuột hay chạm vào làn (chọn làn gần nhất bằng `laneAt`), bấm hay chạm vào đồng để nhặt; nhận ở `keydown` và `pointerdown`, không đợi `click`. Khi tạm dừng, bảng câu hỏi mở hay hết ván thì không nhận.
- **Chữ giao diện:** `whackUi` ở `content/games.ts`; hướng dẫn riêng (luật, cách điều khiển, 4 trang, câu nhắc "?") ở `content/huongDanGame.ts` mục màn 5, hình vẽ ở `GuideArt.tsx` (`dap-lan-phim`, `dap-lan-cham`, `chuot-loai`, `so-muc`, `trum-hoi`). Nút "?" (phím H) tạm dừng thật: `tickWhack(state, dt, paused)` không đổi gì (chuột, đồng, đồng hồ lịch và đồng hồ trùm đứng yên), đồng hồ trả lời và hoạt cảnh cũng đứng. Câu nhắc (khóa → câu): `dauVan` đập khi chuột vào vệt sáng, `chay`, `chuotTo` "Chuột to phải đập 2 lần.", `dongTien`, `soSapDay` "Sổ sắp đầy mực! Ưu tiên chuột gần sổ nhất." (còn 1 hay 2 chỗ trống), `trumChay`, `trumHoi`, `hetVan`; `hintFor` ở `whackHint.ts`, không lộ đáp án.
- **Màn kết quả:** điểm, mốc, các phần điểm "Chuột đập trúng" (số con, điểm), "Tiền đồng nhặt được", "Lượt trùm trả lời đúng" (số lượt, điểm gồm cả điểm giây còn lại) và "Vết mực trên sổ" (số vết); màn 6 chưa ra mắt nên cuối màn chỉ có "Chơi lại" và "Về làng" (có màn 6 thì nút "Chơi tiếp" tự hiện).
- **Mở khóa:** màn 5 ready, màn 6 coming-soon: xong màn 4 mà chưa chơi màn 5 thì chưa có Trang Sổ Vàng 2 (màn 5 mở, nhiệm vụ ở thế giới mở là "Đến biển \"Đập {phanDien}\""); chơi màn 5 (kể cả thua) thì có trang 2 và màn 7 mở; tài khoản đã có trang 2 từ trước giữ nguyên. Làng Dệt tối giản có đủ 3 biển, biển màn 5 mở được (E vào `/lang/lang-det/man/5`).
- **Tự chọn (spec chưa nói):** số ô pool (20 chuột); chuột nhanh vẽ nhỏ hơn 0,8 và chuột to to hơn 1,5 lần; học sinh cao 1,85 (nhỏ để vừa khoảng trống dưới đuôi các làn) và đứng lệch ra mép cuốn sổ nếu chân làn trùng sổ (làn 2 và 3); cô Chi cố định bên trái; trùm chờ ở pos 3 và bị đét ở pos 9,3; bảng câu hỏi 45% đổi bên theo làn của trùm; quạt nan là hình dựng bằng code (không có ảnh); khung dọc thì nhắc xoay ngang và dừng; tiền đồng nhặt bằng chạm hay bấm vào hình đồng (bán kính 0,95 đơn vị); HUD ghi "Trùm: số lượt đã qua/10".
- **Số đo GPU (bản dev, Chrome thật, mức Thấp, bot chơi 100 giây, trùm đúng 8 lượt, 107 chuột trúng):** tam giác 36.770 (54.597 khi trùm hiện), draw call 14 đến 17, `geometries` 11, `textures` 20 ở giây 20 và 23 ở giây 100 (hai ảnh chuột lần đầu được đẩy lên GPU trễ; sau khi thêm bước đẩy trước lúc khởi động, từ giây 5 đến 100 đứng yên ở 23), programs 7. Dựng lại màn 6 lần bằng "Chơi lại": từ lần 2 trở đi mỗi lần đều `geometries` 3, `textures` 10, draw call 25, tam giác 54.611 (không tăng). Lần đầu khác lần sau (chưa tìm rõ nguyên nhân, nhiều khả năng do cách đọc `renderer.info` sau khi dựng lại Canvas); không có lần nào tăng dần.
- **Kích thước chunk (`pnpm build`, apps/lang-det, trước, sau):** `index` 295,15 đến 299,05 kB; `Man4` 48,55 đến 43,93 kB; `Man5` mới 91,10 kB (gzip 28,49); chunk lõi 3D 1.017,28 đến 1.007,49 kB; module 229,22 kB không đổi. Thêm khoảng 80 kB, tải lười khi vào màn 5.

### Test (`whackLogic.ts`; ngoài 10 dòng dưới còn test đồng hồ lịch dừng, chuột đứng yên khi mở câu hỏi, tỉ lệ loại, tốc độ, nhịp sinh, chuột to khựng, làn nghỉ, tất định theo seed và theo dt)

| Tình huống | Kết quả mong đợi |
|---|---|
| Chuột thường ở trong vùng đập của làn 2, đập làn 2 | Trúng, +10 |
| Chuột ở trên vùng đập, đập làn đó | Không trúng, không bị phạt |
| Hai chuột cùng làn đều trong vùng | Trúng con thấp hơn |
| Chuột đổi làn ở làn 0 / làn 3 | Sang làn 1 / làn 2, chỉ một lần |
| Chuột to | Đập lần 1 vẫn còn; đập lần 2 thì mất, +30 |
| Chuột lọt tới sổ | +1 vết mực; vết thứ 8 (đầy sổ) thì kết thúc |
| Lịch trùm | Đúng 10 lần, ở giây 12, 24, …, 120 |
| Trùm: đúng khi còn 7 giây | +135 |
| Trùm: sai, hoặc hết giờ | +1 vết mực |
| Sinh chuột | Không sinh vào làn có con còn trong 15% đầu làn |

## Màn 6 — Game phụ 2: "Diều đưa sổ" (kiểu Flappy Bird + câu hỏi)

Logic đặt trong `kiteLogic.ts` (hàm thuần, có test).

**Câu chuyện:** cụ Bình nhờ học sinh thả diều mang bản sao sổ mới tới 4 làng xa, để làng nào cũng có sổ giống nhau. {phanDien} thả diều đen để cản đường.

**Dựng bằng `Scene25D` (nhìn ngang):**

**Nền 3 lớp cuộn ngang, lặp kiểu soi gương:**

| Lớp | File | Tốc độ cuộn |
|---|---|---|
| Trời | `scenes/man-06-troi` | 0,05 |
| Đồi xa | `scenes/man-06-doi-xa` | 0,25 |
| Tre gần | `scenes/man-06-tre-gan` | 0,6 |

Lớp đồi xa và tre gần phải có phần trời trong suốt (spec 01 mục 5).

**Hình rời** (`sprites/man-06-dieu/`):
- `cot-tre` cho cột: kéo dài theo chiều cao cần; cột phía trên lật ngược.
- `dieu` cho diều của học sinh; `dieu-den` cho diều của {phanDien}.
- `cong-lang-xa` cho cổng các làng.

**Học sinh:** model 3D treo dưới diều (clip `hang`), gắn ở điểm tay cầm của diều. Diều nghiêng theo vận tốc đứng (từ −20° đến +20°).

**Điều khiển:** chạm, bấm chuột hoặc Space thì diều bật lên.

**Vật lý:**
- Mỗi lần bật lên, vận tốc đứng thành 5,5. Trọng lực 14; rơi nhanh nhất −8.
- Vùng bay cao từ 0 đến 10.

**Cột tre:**
- Từng cặp cột tre, chừa một khe ở giữa, nằm trọn trong khoảng [0,5; 9,5].
- Khe cao 3,2, mỗi khe hẹp đi 0,04, dừng ở 2,4 từ khe thứ 20.
- Các cặp cách nhau 5 đơn vị.
- Tốc độ bay ngang bắt đầu 4, mỗi khe tăng 0,1, tối đa 6,5.

**Diều đen của {phanDien}:**
- Từ khe thứ 8 trở đi, thỉnh thoảng có diều đen bay lên xuống trong khe.
- Diều đen luôn chừa lại ít nhất một khoảng trống cao 1,4.
- Chạm diều đen thì mất 1 tim.

**Cổng làng và câu hỏi:**
- Sau khe thứ 6, 12, 18 và 24 là cổng của làng thứ 1, 2, 3, 4 (hình rời `cong-lang-xa`).
- Tới cổng, game dừng lại và hiện `QuizCard` về Bài 1–2 (20 giây).
  - Đúng: cổng mở, có cảnh giao sổ ngắn.
  - Sai: mất 1 tim, cổng vẫn mở để đi tiếp.
- Qua đủ 4 làng là thắng.

**Tim:** 3 tim. Chạm cột, đất, trần hay diều đen đều mất 1 tim, kèm bất tử 1 giây. Sau mỗi lần mất tim, diều được đặt lại vào giữa khe kế tiếp.

**Điểm** = số khe × 10 + số bản sao trang nhặt được × 5 + số câu đúng × 50.

| Mốc | Điểm |
|---|---|
| Đồng | 150 |
| Bạc | 260 |
| Vàng | 360 |

**Test (`kiteLogic.ts`):**

| Tình huống | Kết quả mong đợi |
|---|---|
| Vừa bật lên, sau 0,1 giây | Vận tốc đứng 4,1 |
| Chiều cao khe | Đạt 2,4 ở khe thứ 20 và không nhỏ hơn |
| Sinh 1000 khe | Khe luôn nằm trong [0,5; 9,5] |
| Diều đen | Không xuất hiện trước khe 8; luôn chừa khoảng trống ≥ 1,4 |
| Cổng làng | Ở sau khe 6, 12, 18, 24; qua cổng thứ 4 là thắng |

### Logic màn 6 (mốc 3, bước B8; code ở `packages/village-lang-det/src/kite/`, chưa có cảnh, màn 6 vẫn coming-soon)

`kiteConfig.ts` (số liệu), `kiteLogic.ts` (hàm thuần: `createKiteGame`, `stepKite(s, dt)` bước cố định 1/120 giây, `flap`, `answerGate`, `tickKite(s, dt, paused)`), `kiteBots.ts` (bot cân bằng và người chơi lý tưởng, chỉ dùng trong test), `kiteLogic.test.ts`, `kiteBalance.test.ts`, `index.ts` (xuất config và logic). Mọi số ngẫu nhiên (khe, diều đen, trang) rút từ `createMulberry32(seed)` LÚC TẠO VÁN, nên cùng seed cùng ván bất kể người chơi làm gì.

**Chốt trong lời giao B8 (spec chưa nói):**
- Hộp va chạm của diều: chữ nhật 0,8 × 0,5 quanh tâm diều (học sinh treo dưới không tính va chạm); cột rộng 0,9; chạm đất tính khi đáy hộp xuống tới 0, chạm trần khi đỉnh hộp lên tới 10.
- Tâm khe: ngẫu nhiên theo rng, tâm hai khe liền nhau chênh tối đa 3,0 (và khe luôn nằm trọn [0,5; 9,5]).
- Diều đen: từ khe 8, mỗi khe 35% có; cao 0,6; bám nửa trên hoặc nửa dưới khe (rng), dao động lên xuống trong dải sát mép đó sao cho phần trống còn lại của khe luôn ≥ 1,4: dải dao động rộng (cao khe − 0,6 − 1,4), khe 2,4 thì chỉ 0,4.
- Trang bản sao: mỗi khe tối đa 1 trang (60%), đặt trong phần trống chắc chắn của khe (nửa không có diều đen, cao ≥ 1,4); nhặt khi chạm hộp diều (+5 điểm, mỗi trang một lần).
- Sau câu hỏi ở cổng: diều đặt lại giữa khe kế tiếp, vận tốc 0, bất tử 1 giây. Mất tim (đất, trần, cột, diều đen) cũng đặt lại như vậy: "khe kế tiếp" là khe đầu tiên mà tâm còn ở phía trước diều (hết khe thì khe cuối).

**Tự chọn thêm (đã ghi chú trong `kiteConfig.ts`):**
- **Chiều cao khe:** khe thứ k (đếm từ 1) cao `max(2,4; 3,2 − 0,04 × k)`: đạt 2,4 đúng ở khe 20 (đúng dòng test của spec) nhưng khe 1 cao 3,16 chứ không đủ 3,2. Nếu khe 1 phải đủ 3,2 thì 2,4 tới ở khe 21 (hai dòng của spec lệch nhau 0,04 một khe; chờ chủ dự án chốt).
- Khe đầu cách chỗ xuất phát 8 (khoảng 2 giây bay); cổng đặt giữa khe có cổng và khe kế (cách tâm khe 2,5); diều đen rộng 0,8, chu kỳ dao động 1,6 giây (theo thời gian chạy của ván); trang bản sao cạnh 0,5.
- Pha `ready`: diều chờ, ván chưa chạy cho tới lần bật đầu tiên (như Flappy Bird, để học sinh không rơi trước khi kịp chạm).
- Bay qua tâm khe thì tính 1 khe, +10 điểm và +0,1 tốc độ (kể cả lúc đang bất tử); bất tử đúng 120 bước = 1 giây, bước mất tim không bị trừ.
- Hết giờ trả lời ở cổng coi như sai (`answerGate(s, 'timeout')`); việc đếm 20 giây và chọn câu hỏi do trang lo, logic chỉ nhận kết quả.

**Test thêm so với bảng spec** (`kiteLogic.test.ts`): chênh tâm hai khe liền nhau ≤ 3,0 (1000 khe, nhiều seed); diều đen luôn chừa ≥ 1,4 ở mọi thời điểm (lấy mẫu 0,01 giây, hơn 1000 diều đen); mất tim thì bất tử đúng 1 giây và đặt lại giữa khe kế tiếp; câu hỏi dừng mọi chuyển động; điểm một ván mẫu tính đúng công thức; cùng seed cùng ván; dt 1/30, 1/60, 1/144 (và 0,01, 0,0333) cho cùng kết quả; thống kê 35% diều đen, 60% trang; người chơi lý tưởng.

**Người chơi lý tưởng (biết trước, không trễ):**
- `findIdealRun(seed, gaps)` (`kiteBots.ts`) tìm chuỗi bật/không bật không chạm gì bằng quy hoạch động nhìn trước 2 giây (trạng thái là độ cao và vận tốc thật, gom theo ô lưới, có quay lui), rồi `replayRun` chạy lại chuỗi đó trên ván thật để kiểm độc lập. Test (`kiteLogic.test.ts`): **qua đủ 24 khe, độ dài một ván thật, không chạm lần nào ở seed 1, 2, 3** (chạy lại trên ván thật: 24 khe, 0 lần mất tim, còn 3 tim). Nghĩa là ván thật qua được mà không chạm ở các seed đã thử (chưa thử hết 300 seed).
- **CHƯA ĐẠT yêu cầu "qua 1000 khe không chạm":** thử seed 1 với 1000 khe (nhìn trước 2 giây, tối đa 12.000 trạng thái mỗi bước, 8 phương án quay lui, 40.000 lần lập kế hoạch, khoảng 25 phút) chỉ tới khe 91 rồi bế tắc; chưa biết là chỗ đó thật sự không qua được hay chỉ là bộ tìm kiếm chưa đủ mạnh. Ở các seed 3, 7, 11, 13 thì 80 khe qua được (có seed cần quay lui hàng chục lần). Vì ván thật chỉ có 24 khe (tốc độ tối đa 6,4, chưa chạm mức 6,5) nên điều này không ảnh hưởng ván thật, nhưng "không thể bị kẹt ở khe 25 trở đi" chưa được chứng minh. Chạy 1000 khe còn quá chậm cho `pnpm test` (hơn 0,15 giây mỗi lần lập kế hoạch, hàng nghìn lần).

**Cân bằng (`kiteBalance.test.ts`, 300 ván mỗi bot, seed 1 đến 300).** Bot nhắm tâm dải trống của khe kế (có tính vị trí diều đen lúc diều tới), đoán độ cao lúc cú bật có hiệu lực và bật khi dự đoán thấp hơn tâm 0,5 (nửa độ cao một cú bật, tự chọn); bot giỏi trễ 0,08 giây, lệch giờ σ 0,03, đúng câu hỏi 95%; bot trung bình trễ 0,18 giây, σ 0,08, đúng 70%.

| | Chưa đạt | Đồng | Bạc | Vàng | Điểm TB (nhỏ nhất đến lớn nhất) | Khe TB | Cổng TB | Qua đủ 4 cổng | Mất tim TB |
|---|---|---|---|---|---|---|---|---|---|
| Bot giỏi, mốc spec 150 / 260 / 360 | 0,7% | 8,7% | 25,0% | **65,7%** | 381,9 (125 đến 525) | 19,77 | 2,94 | 28,3% | 2,50 |
| Bot trung bình, mốc spec 150 / 260 / 360 | 28,3% | 40,7% | 24,3% | 6,7% | 208,8 (40 đến 515) | 12,54 | 1,61 | 0,3% | 2,54 |
| Bot giỏi, mốc tạm 140 / 200 / 260 | 0,7% | 5,0% | 3,7% | **90,7%** | | | | | |
| Bot trung bình, mốc tạm 140 / 200 / 260 | 22,7% | 30,0% | 16,3% | 31,0% | | | | | |

- **Mục tiêu 1 (bot giỏi Vàng ≥ 90%):** mốc spec cho 65,7% nên đặt lại theo quy tắc phân vị, TẠM: Đồng = p25 bot trung bình (140), Vàng = p10 bot giỏi (260), làm tròn xuống bội số 10. Bạc: quy tắc p75 bot trung bình cho 270, không nhỏ hơn Vàng (260) nên không dùng được (phải Đồng < Bạc < Vàng): tự chọn 200 (khoảng phân vị 53% của bot trung bình). **Mốc `medals` của màn 6: 140 / 200 / 260 (tạm)**; bot giỏi Vàng 90,7%.
- **Mục tiêu 2 (bot trung bình qua trung bình ≥ 2 cổng): CHƯA ĐẠT, chỉ 1,61 cổng** (qua ít nhất 1 cổng 98%, 2 cổng 51,7%, 3 cổng 10,3%, 4 cổng 1,0%). Theo lời giao KHÔNG đổi luật. Cũng chưa đạt mong muốn chung "bot trung bình hầu như không Vàng": ở mốc tạm bot trung bình Vàng 31% vì điểm của hai bot chồng nhau nhiều (bot giỏi p10 = 260, bot trung bình p75 = 270): cả hai mất trung bình 2,5 tim mỗi ván, độ ngẫu nhiên của màn (khe, diều đen) lớn hơn khác biệt tay nghề giữa hai bot.
- **Độ nhạy theo bot:** nếu bot bật đúng chữ "khi dự đoán sẽ rơi dưới tâm" (margin 0) thì bot giỏi chỉ điểm TB 192,8, 1,32 cổng, 5/300 ván Vàng ở mốc spec; margin 0,5 (dao động quanh tâm) và đoán vị trí diều đen lúc tới cho bot giỏi 381,9. Chọn bot khác thì mốc đổi theo, nên mốc là TẠM, chỉnh khi học sinh chơi thật.
- **Điểm tối đa lý thuyết:** 24 khe × 10 + 24 trang × 5 + 4 câu × 50 = **560**; thực tế mỗi khe chỉ có trang 60% nên tối đa của từng seed chừng 512 (trung bình seed 1 đến 300: 511,9; lớn nhất 540). Điểm lớn nhất của bot giỏi: 525.

## Kết thúc làng

- Cụ Bình trao **Trang Sổ Vàng thứ hai**.
- Cụ Bình: "Sổ thì ai cũng kiểm được. Nhưng làm sao biết giấy nợ đúng là người đó viết? Sang Làng Khắc Dấu hỏi chú Dũng."

## Checklist nghiệm thu

- [ ] Test Bài 2 (giai đoạn 1), `whackLogic` và `kiteLogic` đều ✅.
- [ ] Màn 4: phiếu của bot hiện sau phiếu của học sinh; {phanDien} luôn gian ở lượt đầu.
- [x] Màn 5 (bước B7, đã kiểm trên trình duyệt):
  - 4 làn khớp đúng 4 dải vải trên ảnh nền;
  - 4 loại chuột chạy đúng luật;
  - 8 vết mực thì thua;
  - trùm xuất hiện 10 lần;
  - rê chuột lên đáp án thì nhân vật nhìn theo;
  - đúng thì đét trúng, sai thì {phanDien} chạy xuống sổ.
  - **luật chung (bước HD, spec 03 mục 3.8 và 6):** có phần hướng dẫn riêng mở từ thẻ bắt đầu; nút "?" (phím H) trong lúc chơi với `hintFor(state)` không lộ đáp án và tạm dừng thật; nút "Chơi tiếp" ở màn kết quả (hết màn trong làng thì "Về làng").
- [ ] Màn 6: có câu hỏi ở 4 cổng làng; diều đen không chặn kín khe.
  - **luật chung (bước HD, spec 03 mục 3.8 và 6):** có phần hướng dẫn riêng mở từ thẻ bắt đầu; nút "?" (phím H) trong lúc chơi với `hintFor(state)` không lộ đáp án và tạm dừng thật; nút "Chơi tiếp" ở màn kết quả (hết màn trong làng thì "Về làng").
- [ ] Xong màn 6: nhận Trang Sổ Vàng; cổng Làng Khắc Dấu mở.

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
- **Học sinh:** model 3D đứng dưới cùng, tay phải cầm quạt nan (code dựng, gắn vào xương `mixamorig:RightHand`). Khi đập thì lướt sang làn đó và dùng tư thế `swing`.
- **{phanDien}:** model 3D, xuất hiện khi làm "trùm".
- **Cô Chi:** đứng một bên sân (không xương), nhún vui mỗi lần học sinh đập trúng {phanDien}.

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
- **Đúng:** học sinh lướt tới, đét quạt nan vào mông {phanDien} (`swing`). {phanDien} giật nảy (`hurt`), kêu "Ui da!" rồi chạy ngược lên, biến mất. Được **100 + 5 × số giây còn lại**, và **xoá 2 vết mực** nếu đang có (cân bằng sau B6, trước là 1).
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

## Kết thúc làng

- Cụ Bình trao **Trang Sổ Vàng thứ hai**.
- Cụ Bình: "Sổ thì ai cũng kiểm được. Nhưng làm sao biết giấy nợ đúng là người đó viết? Sang Làng Khắc Dấu hỏi chú Dũng."

## Checklist nghiệm thu

- [ ] Test Bài 2 (giai đoạn 1), `whackLogic` và `kiteLogic` đều ✅.
- [ ] Màn 4: phiếu của bot hiện sau phiếu của học sinh; {phanDien} luôn gian ở lượt đầu.
- [ ] Màn 5:
  - 4 làn khớp đúng 4 dải vải trên ảnh nền;
  - 4 loại chuột chạy đúng luật;
  - 8 vết mực thì thua;
  - trùm xuất hiện 10 lần;
  - rê chuột lên đáp án thì nhân vật nhìn theo;
  - đúng thì đét trúng, sai thì {phanDien} chạy xuống sổ.
- [ ] Màn 6: có câu hỏi ở 4 cổng làng; diều đen không chặn kín khe.
- [ ] Xong màn 6: nhận Trang Sổ Vàng; cổng Làng Khắc Dấu mở.

# SPEC 06 — BÀI 2: LÀNG DỆT (mốc 1: bài học; mốc 3: cảnh làng, màn 5, màn 6)

**Gói:** `packages/village-lang-det`. Gồm màn 4 (bài học), màn 5, màn 6. Chạy riêng ở `lang-det.ten-mien.vn`.

**Nguồn luật:** luật, số liệu, bot và cách chấm sao của bài học giữ đúng **spec giai đoạn 1 `03-bai2-node.md`**. Dùng lại `isValidProposal`, các hàm tạo đề và `bots.ts` trong `packages/core/src/lessons/bai-2`.

**Người dẫn:** cụ Bình (`characters/cu-binh`) và cô Chi (`characters/co-chi`). Cả hai không có xương, chuyển động theo spec 03 mục 3.4.

**Loại cảnh:** cảnh làng là 3D đi lại; màn 4 là trang bài học 2D; màn 5 và màn 6 là 2.5D. Tên phản diện viết `{phanDien}` (hiện là Tí).

## Cảnh làng (3D đi lại, `VillageScene`)

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
- **Vùng đập:** đoạn cuối mỗi làn, ngay trên bàn sổ, từ 15% đến 30% chiều dài làn tính từ dưới lên. Có vệt sáng mờ để học sinh nhìn thấy.
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
| Đổi làn | Khi còn cách vùng đập 1,5 đơn vị, nhảy sang làn bên cạnh **một lần** (ở làn ngoài cùng thì sang làn phía trong) | 15 |
| Nhanh | Nhỏ hơn, nhanh gấp 1,6 lần | 15 |
| To | Phải đập 2 lần; sau lần đầu khựng lại 0,3 giây và chớp sáng | 30 |

**Tốc độ và nhịp sinh:**
- Chuột cần 3 giây để chạy từ đầu làn tới vùng đập; giảm dần còn 1,8 giây ở giây thứ 120.
- Nhịp sinh 1,2 giây một con, giảm dần còn 0,55 giây.
- Không sinh chuột vào làn nếu con gần nhất ở làn đó còn quá gần điểm xuất phát (dưới 15% chiều dài làn).

**Tỉ lệ các loại chuột theo thời gian:**

| Thời gian | Thường | Đổi làn | Nhanh | To |
|---|---|---|---|---|
| 0–20 giây | 100% | | | |
| 20–40 giây | 80% | 20% | | |
| 40–60 giây | 60% | 20% | 20% | |
| Từ 60 giây | 45% | 20% | 20% | 15% |

**Lọt chuột:** chuột chạy qua vùng đập tới cuốn sổ thì sổ bị loang **1 vết mực** (`vet-muc` hiện trên sổ). **5 vết mực là thua.** Thanh 5 chấm tròn ở góc màn hình chuyển đỏ dần, giống Talking Tom.

**Tiền đồng:** khoảng 8 giây hiện một đồng, tồn tại 2,5 giây. Chạm vào được +5 điểm và +1 xu.

### {phanDien} làm "trùm" (có câu hỏi)

- **Xuất hiện ở giây thứ 12, 24, …, 120** (10 lần).
- **Khi trùm ra:**
  - ngừng sinh chuột mới; chuột đang chạy chậm lại còn 20% tốc độ;
  - {phanDien} chạy xuống một làn ngẫu nhiên (`run`), dừng giữa vùng đập, rồi `cheer` trêu.
- **Câu hỏi:** hiện `QuizCard`, ôn Bài 1–2. Có 15 giây cho lần 1–5, 10 giây cho lần 6–10.
  - Rê chuột lên đáp án nào thì học sinh **quay đầu nhìn đáp án đó** (`ChoiceReaction`).
- **Đúng:** học sinh lướt tới, đét quạt nan vào mông {phanDien} (`swing`). {phanDien} giật nảy (`hurt`), kêu "Ui da!" rồi chạy ngược lên, biến mất. Được **100 + 5 × số giây còn lại**.
- **Sai hoặc hết giờ:** học sinh đập trượt, {phanDien} cúi né, lè lưỡi rồi chạy thẳng xuống sổ: **+1 vết mực**. Hiện đáp án đúng và giải thích.
- **Kết thúc:** xong lượt trùm thứ 10 (chơi trọn), hoặc đủ 5 vết mực.

### Điểm

| Mốc | Điểm |
|---|---|
| Đồng | 800 |
| Bạc | 1600 |
| Vàng | 2400 |

Các mốc này chỉnh lại sau khi chơi thử.

### Test (`whackLogic.ts`)

| Tình huống | Kết quả mong đợi |
|---|---|
| Chuột thường ở trong vùng đập của làn 2, đập làn 2 | Trúng, +10 |
| Chuột ở trên vùng đập, đập làn đó | Không trúng, không bị phạt |
| Hai chuột cùng làn đều trong vùng | Trúng con thấp hơn |
| Chuột đổi làn ở làn 0 / làn 3 | Sang làn 1 / làn 2, chỉ một lần |
| Chuột to | Đập lần 1 vẫn còn; đập lần 2 thì mất, +30 |
| Chuột lọt tới sổ | +1 vết mực; vết thứ 5 thì kết thúc |
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
  - 5 vết mực thì thua;
  - trùm xuất hiện 10 lần;
  - rê chuột lên đáp án thì nhân vật nhìn theo;
  - đúng thì đét trúng, sai thì {phanDien} chạy xuống sổ.
- [ ] Màn 6: có câu hỏi ở 4 cổng làng; diều đen không chặn kín khe.
- [ ] Xong màn 6: nhận Trang Sổ Vàng; cổng Làng Khắc Dấu mở.

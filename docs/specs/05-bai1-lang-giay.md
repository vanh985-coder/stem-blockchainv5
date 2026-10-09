# SPEC 05 — BÀI 1: LÀNG GIẤY (mốc 1: bài học; mốc 2: cảnh làng, màn 2, màn 3)

**Gói:** `packages/village-lang-giay`. Gồm màn 1 (game chính, bài học), màn 2 (game phụ 1), màn 3 (game phụ 2). Chạy riêng ở `lang-giay.ten-mien.vn`.

**Nguồn luật:** công thức, số liệu, gợi ý và cách chấm sao của bài học giữ đúng **spec giai đoạn 1 `02-bai1-khoi-va-chuoi.md`**. Dùng lại `pageCode`, `buildChain`, `firstInvalidIndex`, `isSafeDelta` trong `packages/core/src/lessons/bai-1`. Không viết lại.

**Người dẫn:** bác An (`characters/bac-an`, không có xương, chuyển động theo spec 03 mục 3.4).

**Loại cảnh:** cảnh làng là 3D đi lại; màn 1 là trang bài học 2D; màn 2 là 3D chạy; màn 3 là 2.5D (spec 03 mục 0).

**Tên phản diện** luôn viết `{phanDien}` (hiện là Tí).

## Cảnh làng (3D đi lại, `VillageScene`)

- **Cổng vào:** `env/cong-lang-giay`.
- **Bên trong:** nhà `env/nha-mai-ngoi` và `env/nha-mai-tranh`; `env/bui-tre`; nhiều tấm `env/phen-phoi-giay` xếp thành sân phơi giấy.
- **Code tự dựng:** chồng giấy, bể ngâm, bàn chép sổ có cuốn Sổ Chung bìa tím.
- **Bác An** đứng gần bàn chép sổ.
- Xếp theo ảnh `concept-lang-giay`.
- **Cảnh mở đầu (lần đầu vào làng):** chiếu ảnh truyện số 6 kèm lời. Bác An: "Mỗi trang sổ có một mã, tính từ mã trang trước. Đêm qua có kẻ sửa trộm một trang, cả làng cãi nhau xem ai nợ ai!"
- **3 biển gỗ:** "Học cùng bác An" (màn 1), "Đuổi theo {phanDien}" (màn 2), "Ghép lại cuốn sổ" (màn 3).

## Màn 1 — Game chính: "Trang nối trang" (trang bài học 2D)

**Dựng bằng `LessonPage2D`:**
- Nền: `scenes/bai-hoc-lang-giay`.
- Bảng giữa: **dùng lại nguyên bài 1 của web 2D giai đoạn 1**, gồm 3 trạm, logic, gợi ý, chấm sao. Chỉ đổi giao diện theo spec 03 mục 1 (nền giấy dó, màu mới).
- Góc dưới trái: khung 3D nhỏ có cậu học sinh phản ứng khi chọn đáp án (từ mốc 2; mốc 1 chưa có).
- Khi chuyển bài cũ, làm theo bảng đổi nội dung ở spec 01 mục 3.
- **Thay đổi ở trạm Dễ "Xây chuỗi 5 trang":** không còn ô nhập "Nội dung" và nút "Chọn giúp em". Nội dung 5 trang do máy chọn ngẫu nhiên từ 0 đến 99 (hàm `easyRound(seed)` trong `lessons/bai-1/logic.ts`, dùng `lib/rng.ts`; cùng seed thì cùng nội dung) và hiện sẵn, không sửa được. Học sinh chỉ nhập "Mã trang". Công thức `pageCode`, cách chấm sao, gợi ý khi sai và các test cũ không đổi. Câu hướng dẫn của trạm: "Tính mã trang cho từng trang để đóng dấu xác nhận."

**Lời bác An** (hộp thoại có chân dung tự chụp):

| Thời điểm | Bác An nói |
|---|---|
| **Đầu bài** | "Mỗi trang sổ ghi Nội dung và Mã trang. Mã trang = (mã trang trước × 2 + nội dung), chỉ giữ 2 chữ số cuối. Nhờ thế các trang móc vào nhau như mắt xích." |
| **Trước Trạm Trung bình** | "Đêm qua {phanDien} lẻn vào sửa một trang. Cháu thử sửa lại xem có dễ không!" Kèm hình `{phanDien}` (chân dung) cười "Hì hì!" |
| **Trước Trạm Khó** | "Làng vẫn ghi trang mới liên tục. Thử sửa cho kịp xem nào." |
| **Cuối bài** | "Một người không thể sửa nhanh hơn cả làng cùng ghi sổ." |

**Chấm sao, xu:** như giai đoạn 1. Mỗi sao mới được 10 xu.

## Màn 2 — Game phụ 1: "Đuổi theo {phanDien}" (kiểu Subway Surfers, có câu hỏi)

Logic đặt trong `runnerLogic.ts` (hàm thuần, có test).

**Câu chuyện:** {phanDien} ôm xấp trang bị trộm chạy qua đường làng, bờ ruộng, sân phơi giấy. Học sinh đuổi theo để nhặt lại.

**Đường chạy:**
- 3 làn (x = −2, 0, 2). Nhân vật tự chạy.
- Tốc độ bắt đầu 8 đơn vị/giây, tăng 0,25 mỗi 5 giây, tối đa 16.
- {phanDien} luôn chạy ở phía trước, xa xa.

**Điều khiển:**
- Máy tính: ←/→ hoặc A/D để đổi làn; ↑/W/Space để nhảy; ↓/S để trượt.
- Điện thoại: vuốt theo hướng tương ứng.
- Nhảy: vận tốc đầu 7, trọng lực 22. Đỉnh cao khoảng 1,1.
- Trượt: kéo dài 0,6 giây; khi trượt, thân cao 0,6.

**Chướng ngại vật:**

| Loại | Model | Cách qua |
|---|---|---|
| Thấp (cao 0,8) | `games/man-02-duoi-ti/sap-thap`; đống rơm (code dựng) | Nhảy (nhân vật ở trên độ cao 0,8) |
| Cao (đáy ở độ cao 1,0) | Sào phơi giấy bắc ngang (code dựng) | Trượt qua bên dưới |
| Chắn làn | `games/man-02-duoi-ti/xe-bo`; `env/phen-phoi-giay` | Chỉ có thể đổi làn |
| Xe chở hàng, nóc cao 0,9 | `games/man-02-duoi-ti/xe-cho-hang` (code chỉnh tỉ lệ để nóc cao đúng 0,9) | Nhảy lên và chạy trên nóc. Đang rơi xuống mà ở độ cao ≥ 0,9 thì đáp lên nóc; còn thấp hơn mà đâm vào đầu xe thì tính là va |

**Quy tắc sinh chướng ngại:**
- Không bao giờ chắn kín cả 3 làn.
- **Khoảng cách giữa hai hàng chướng ngại** ≥ tốc độ hiện tại × **1,0** (khi đang có guốc mộc thì × 1,2). Lý do: một cú nhảy mất 0,64 giây, có guốc mộc thì 0,91 giây; khoảng cách ngắn hơn sẽ sinh ra đoạn gần như không qua được.
- **Luôn có đường đi:** giữa hai hàng liên tiếp, nhân vật đổi tối đa 1 làn. Phải luôn tồn tại một chuỗi làn đi qua được hết các hàng.
- **{phanDien} phá đám:** khoảng mỗi 6 giây {phanDien} ném một đống rơm xuống một làn phía trước, nhưng luôn chừa ít nhất một làn trống.

**Hình ảnh vật nhặt:**
- **Trang sổ, tiền đồng (lỗ vuông), nón lá:** code dựng 3D.
- **Guốc mộc, túi tiền:** ảnh `ui/icons/guoc-moc`, `ui/icons/tui-tien`, đặt trên mặt phẳng luôn quay về phía camera, xoay và nhấp nhô.

**Cảnh hai bên đường:**
- Nhà `env/nha-mai-ngoi`, `env/nha-mai-tranh`, `env/bui-tre`, `env/phen-phoi-giay`, nhân bản kèm biến thể.
- Ruộng lúa và bờ ruộng do code dựng.
- Cổng `env/cong-lang-giay` ở vạch xuất phát.

**Nhân vật:**
- **Học sinh:** `run`; khi nhảy thì `jump` (đoạn giữa clip); khi trượt thì tư thế `slide` (code); khi va thì nhấp nháy.
- **{phanDien}:** `run` ở phía trước, cách 12–15 đơn vị. Khi ném rơm thì quay người, kèm tư thế `swing` (code).

**Vật nhặt:**

| Vật | Tác dụng |
|---|---|
| Trang sổ | +1; trang nối thành chuỗi bay sau lưng nhân vật |
| Tiền đồng | +1 |
| Nón lá | Khiên chặn 1 lần va, tối đa 10 giây |
| Guốc mộc | Nhảy cao trong 10 giây (vận tốc đầu 10) |
| Túi tiền | Hút tiền đồng ở cả 3 làn, trong phạm vi 6 đơn vị phía trước, trong 10 giây |

**Vòng và câu hỏi:**
- Có 4 vòng, mỗi vòng 25 giây.
- Hết mỗi vòng, game chạy chậm lại và hiện một `QuizCard` về Bài 1, có 15 giây để trả lời.
  - Đúng: "{phanDien} làm rơi thêm trang!", được +3 trang.
  - Sai hoặc hết giờ: mất 1 tim, hiện giải thích.
- **Tim:** 3 tim. Mỗi lần va chạm cũng mất 1 tim.
- **Kết thúc:** hết 4 vòng hoặc hết tim.

**Điểm** = số trang × 10 + số tiền đồng + quãng đường (m) ÷ 10 + số câu đúng × 30.

| Mốc | Điểm |
|---|---|
| Đồng | 200 |
| Bạc | 380 |
| Vàng | 520 |

**Hiệu năng:** đường chạy gồm các đoạn dài 40 đơn vị, chỉ giữ khoảng 5 đoạn cùng lúc; chướng ngại và vật nhặt đều dùng lại (pooling).

**Test (`runnerLogic.ts`):**

| Tình huống | Kết quả mong đợi |
|---|---|
| Sinh 1000 hàng chướng ngại, có cả rơm {phanDien} ném | Không hàng nào chắn kín 3 làn |
| Hai hàng liên tiếp | Khoảng cách ≥ tốc độ × 1,0 (có guốc mộc thì × 1,2) |
| Dò đường qua 1000 hàng (mỗi bước đổi tối đa 1 làn, xét cả nhảy và trượt) | Luôn tồn tại đường đi tới hàng cuối |
| Nhân vật ở độ cao 1,0 gặp chướng ngại thấp | Không va |
| Đang trượt, gặp sào ngang | Không va |
| Đang rơi, ở độ cao 0,95 trên xe chở hàng | Đáp lên nóc |
| Ở độ cao 0,5, gặp đầu xe chở hàng | Va |
| Có nón lá, va 2 lần liên tiếp | Lần đầu không mất tim, lần sau mất tim |
| 23 trang, 50 tiền, 1080 m, 3 câu đúng | Điểm 478 |

## Màn 3 — Game phụ 2: "Ghép lại cuốn sổ" (kiểu domino)

Logic đặt trong `rebuildLogic.ts` (hàm thuần, có test).

**Câu chuyện:** học sinh mang các trang lấy lại về bàn của bác An để ghép lại cuốn sổ như ban đầu. Nhưng {phanDien} đã nhét lẫn một trang giả.

**Dựng bằng `Scene25D`:**
- Nền: `scenes/man-03-xuong-giay`.
- Hình rời: rổ trang giả `sprites/man-03-ghep-so/ro-trang-gia`, đặt ở góc phải.
- **Trang sổ:** code vẽ thẻ giấy dó có chữ.
- **Bác An:** model 3D đứng ở mép trái.
- **{phanDien}:** trước vòng 2 và vòng 3, model 3D chạy vào (`run`), cười (`cheer`), thả trang giả vào xấp giấy rồi chạy ra.

**Bàn chơi:**
- Bàn gỗ trong ảnh nền; bên trái là trang bìa có mã G.
- Khay bên dưới chứa các trang đã xáo trộn. Mỗi thẻ ghi: **Mã trang trước · Nội dung · Mã trang**.
- Học sinh kéo trang (hoặc chạm chọn rồi chạm đặt) vào ô kế tiếp của chuỗi.
- **Đặt đúng:** mã trang trước của thẻ bằng mã trang của trang cuối chuỗi, **và** mã trang đúng công thức. Mắt xích khớp, có âm thanh.
- **Mã trang trước không khớp:** thẻ bật về chỗ cũ, mất 1 tim.
- **Trang giả:** mã trang trước khớp, nhưng mã trang sai công thức.
  - Đặt nó vào chuỗi: Bi báo "Trang giả của {phanDien}!", thẻ bật ra, mất 1 tim.
  - Kéo nó vào **"Rổ trang giả"**: +30 điểm.
- **Nút "Soi công thức":** hiện phép tính của thẻ đang chọn, ví dụ "(31 × 2 + 7) mod 100 = 69 → khớp".

**3 vòng:**

| Vòng | Số trang | Trang giả |
|---|---|---|
| 1 | 5 | Không |
| 2 | 7 | 1 |
| 3 | 9 | 1 |

Trước vòng 2 và vòng 3, {phanDien} lẻn tới nhét trang giả vào xấp giấy, cười khúc khích.

**Tim, điểm:**
- 3 tim cho cả ván.
- Điểm mỗi vòng = 100 − 10 × số lỗi, cộng 30 nếu bỏ đúng trang giả vào rổ.

| Mốc | Điểm |
|---|---|
| Đồng | 150 |
| Bạc | 250 |
| Vàng | 330 |

**Quy tắc tạo đề:**
- Chuỗi thật tạo bằng `buildChain`; các mã trang trong chuỗi không được trùng nhau (trùng thì tạo lại).
- Trang giả:
  - mã trang trước bằng mã của một trang thật (không phải trang cuối);
  - nội dung ngẫu nhiên;
  - mã trang **khác** `pageCode(mã trước, nội dung)` và khác mọi mã của trang thật.

**Test (`rebuildLogic.ts`):**

| Tình huống | Kết quả mong đợi |
|---|---|
| `buildChain(10, [23, 45, 7, 88, 12])` | `[43, 31, 69, 26, 64]`, không trùng |
| Thẻ (31, 7, 69) đặt sau trang có mã 31 | Hợp lệ |
| Thẻ giả (31, 50, 99) | Bị nhận là trang giả, vì `pageCode(31, 50)` = 12, khác 99 |
| Thẻ (26, 12, 64) đặt sau trang có mã 31 | Bị từ chối, vì sai mã trang trước |
| Sinh 500 đề | Mã trang thật không trùng; trang giả luôn sai công thức |

## Kết thúc làng

- Bác An trao **Trang Sổ Vàng thứ nhất**.
- Bác An: "Một mình giữ sổ thì kẻ gian vẫn ngồi sửa cả đêm được. Vì thế các làng không bao giờ để sổ ở một nơi. Xuống Làng Dệt mà xem."
- Nút "Về chợ".

## Checklist nghiệm thu

- [ ] Test của Bài 1 (giai đoạn 1), `runnerLogic` và `rebuildLogic` đều ✅.
- [ ] Màn 1: đủ 3 trạm; domino và cuộc đua sửa sổ chạy đúng.
- [ ] Màn 2:
  - vuốt và phím đều nhận ngay;
  - có câu hỏi sau mỗi vòng;
  - chạy lên nóc xe được;
  - không bao giờ gặp hàng chắn kín 3 làn.
- [ ] Màn 3: trang giả luôn phát hiện được bằng công thức; kéo thả dùng được trên điện thoại.
- [ ] Xong màn 3: nhận Trang Sổ Vàng, về chợ thấy cổng Làng Dệt mở.
- [ ] Màn 1 là bài 2D giai đoạn 1 đặt trên nền làng, lời bác An hiện đúng chỗ.
- [ ] Ít nhất 30fps ở mức Thấp trên điện thoại tầm trung.

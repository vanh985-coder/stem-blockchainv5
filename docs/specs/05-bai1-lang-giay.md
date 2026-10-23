# SPEC 05 — BÀI 1: LÀNG GIẤY (mốc 1: bài học; mốc 2: cảnh làng, màn 2, màn 3)

**Gói:** `packages/village-lang-giay`. Gồm màn 1 (game chính, bài học), màn 2 (game phụ 1), màn 3 (game phụ 2). Chạy riêng ở `lang-giay.ten-mien.vn`.

**Nguồn luật:** công thức, số liệu, gợi ý và cách chấm sao của bài học giữ đúng **spec giai đoạn 1 `02-bai1-khoi-va-chuoi.md`**. Dùng lại `pageCode`, `buildChain`, `firstInvalidIndex`, `isSafeDelta` trong `packages/core/src/lessons/bai-1`. Không viết lại.

**Người dẫn:** bác An (`characters/bac-an`, không có xương, chuyển động theo spec 03 mục 3.4).

**Loại cảnh:** cảnh làng là 3D đi lại; màn 1 là trang bài học 2D; màn 2 là 3D chạy; màn 3 là 2.5D (spec 03 mục 0).

**Tên phản diện** luôn viết `{phanDien}` (hiện là Tí).

## Cảnh làng (3D đi lại; từ bước W1 là một vùng của thế giới mở `/cho`, `WorldScene`)

- **Trong thế giới mở (bước W1; W2 mở rộng; X3 mở rộng lần nữa):** làng nằm ở phía bắc chợ, cổng làng ở đầu làng, cách tâm chợ 72 (đường đất dài 30 từ rìa chợ). Từ X3 làng **bán kính 125** mở ra phía sau cổng nên tâm làng cách tâm chợ 197 (`three/world/villages/giay.ts`; `VILLAGE_RADIUS` ở `worldFrames.ts`); cổng vẫn ở 72. Làng chỉ được tải khi người chơi vào vùng tải (xem "Tải theo vùng" dưới) và dọn sau 3 giây khi ra xa; từ xa vẫn thấy hình làng nhẹ. Cảnh mở đầu chạy khi lần đầu bước qua cổng làng; **"Em có biết?" không còn tự hiện mà là 4 cuộn giấy rải trong làng** (spec 03 mục 3.9, phần "Thẻ rải trong làng"). "Về làng" (cuối màn) mở `/cho?tu=lang-giay`: người chơi đứng trong làng cạnh 3 biển gỗ, ở (0, −99) trong hệ tọa độ làng.

- **Cổng vào:** `env/cong-lang-giay`, ở (0, −125) trong hệ tọa độ làng (gốc là tâm làng, +Z là phía bắc, người vào cổng nhìn về +Z).
- **Model dùng:** nhà `env/nha-mai-ngoi` và `env/nha-mai-tranh`; `env/bui-tre`; `env/phen-phoi-giay`; `env/gieng-lang`; `env/cay-da` (cây lớn).
- **Code tự dựng:** chồng giấy, bể ngâm dó (có mặt nước), **cối giã dó** (`coi-gia`: nền đá, cối đá, đòn gánh gỗ và chày), **bếp nấu dó** (`bep-do`: bệ đá, nồi lớn, ống khói gạch), **đình làng nhỏ** (`dinh`: nền đá, bốn cột gỗ, mái ngói bốn mái), bàn chép sổ có cuốn Sổ Chung bìa tím, chum vại, đống rơm, khóm hoa, **ao** (hợp của 3 vũng tròn có bờ cỏ), **ruộng lúa** ở rìa, hàng rào tre ngắn quanh sân nhà. Đồ nhiều màu trong một hình (đình, cối, bếp) dùng màu theo đỉnh để vẫn là một draw call.
- **Bác An** đứng sau bàn chép sổ ở khu giữa làng.
- Xếp theo ảnh `concept-lang-giay`.
- **Bố cục bước X3 (đang dùng; bán kính 125, tọa độ làng, `LANG_GIAY_LAYOUT`)**: lũy tre bao quanh (vòng bụi tre ở bán kính 122, vật cản là chuỗi 64 hộp, cổng là lối vào chính; cả làng 571 bụi tre kể cả đồi tre), các khu nối nhau bằng đường làng (đường **gạch** ở đại lộ và quanh sân, đường **đất** ở ngõ). Đi từ cổng tới khu giữa mất khoảng 8 giây đi bộ (32,7 đơn vị), tới thẻ xa nhất khoảng 59 giây đi bộ (236,5 đơn vị, 34 giây chạy).
  - **Khu giữa làng** (sân ở (0, −88)): ba biển gỗ quay mặt về cổng, bàn chép sổ, bác An. `?tu=lang-giay` đưa người chơi tới (0, −99), nhìn về +Z.
  - **Xưởng làm giấy lớn** (đông nam): sân phơi 40 phên, 8 bể ngâm dó, 4 bếp nấu dó, 5 cối giã dó, chồng giấy, 3 nhà xưởng; **thẻ 1** ở (56, −38).
  - **Đình làng** (bắc): đình và sân đình lát gạch, cây đa (3 cây cả làng), giếng (2 cái cả làng); **thẻ 2** ở (8,5; 66).
  - **Ao làng lớn** (tây bắc): 4 vũng tròn nối nhau, cầu ao nhô ra mặt nước, quanh bờ cây ăn quả (32 cây quả cả làng); **thẻ 3** ở (−48,8; 40).
  - **Chợ làng nhỏ** (đông): 5 lều quanh sân chợ; **thẻ 4** ở (72; 24).
  - **Khu nhà ở** (tây, ba ngõ dọc đường đất): 33 nhà làng (25 nhà ngói, 11 nhà tranh cả làng kể cả nhà xưởng; ngõ dọc theo `ROW_X`), thêm nhà dọc đại lộ, cạnh ao và cạnh đình; 2 giếng; vườn cây ăn quả.
  - **Rìa làng**: 6 mảnh ruộng lúa, 5 đồi tre (đồi nhỏ, bụi tre quanh chân; màu xanh đậm), lũy tre.
  - **Dân làng**: 6 người đi lại giữa các khu, nhường đường người chơi như ở chợ.
  - **Đường cho mũi tên** (`paths`): cổng → đại lộ → sân giữa làng → từng biển; sân → bác An; và tới từng cuộn giấy (`scrollStands`: nút `scroll:<số>`).
  - **Vật cản theo chân thật** cho mọi vật (xem `?debug=colliders`): nhà, phên, bể, bếp, cối, nền đình, ao (từng vũng tròn), giếng, cây đa, biển, bác An, lũy tre, từng bụi tre và cây quả. Khóm hoa, ruộng, mặt nước trong bể thì đi qua được.
  - **Vẽ nhẹ:** nhà, cây đa, giếng, lều chợ là model (tối đa theo tầm, `VILLAGE_MODEL_MAX_DISTANCE`); tre, cây quả, phên, cầu ao, đồi là hình rải dựng bằng code (dưới 200 tam giác mỗi hình, màu theo đỉnh), chia mảnh theo ô lưới 48 và chỉ vẽ mảnh trong tầm (spec 03 mục 9).
  - **Tải theo vùng:** vùng làng dựng từng giai đoạn (đồ nhỏ → biển → cuộn giấy → từng loại đồ rải → model → hướng dẫn → dân làng), mỗi giai đoạn một khung hình để không khựng.
  - **Test** `villages/giay.test.ts` (12 ca): đủ số nhà, phên, bể, bếp, cối, đình; mọi món trong lũy tre và không chồng nhau; lũy tre kín (khi bịt cổng thì không đi từ trong ra ngoài được); từ chỗ xuất hiện đi được tới mọi biển, bác An, cổng, giếng, đình, bể, bếp, cối, từng cuộn giấy (dò lưới bước 1); mọi điểm và đoạn đi của dân làng không xuyên vật cản; nút đường trống và liền nhau.
- **Bố cục bước W2 (đã thay bằng bố cục X3 ở trên, giữ lại để biết lịch sử; bán kính 35)**, chia khu nối bằng đường đất nhỏ:
  - **Đại lộ** (rộng 4,4) từ cổng (0, −35) lên khu giữa làng, hai bên có nhà, bụi tre và khóm hoa.
  - **Khu giữa làng**: sân đất ở (0, −7), ba biển gỗ ở z ≈ −10 và −8,8 quay mặt về cổng, bàn chép sổ (−6,5; −0,5) và bác An (−6,7; 1,2). Chỗ xuất hiện khi `?tu=lang-giay`: (0, −14,5) nhìn về +Z, ngay trước ba biển.
  - **Xưởng làm giấy** (phía đông, +X): sân phơi giấy lớn 14 phên (8 phên ở phía nam đường ngang, 6 phên ở phía bắc; mỗi phên 4 chân giá), ba bể ngâm dó, hai bếp nấu dó, ba cối giã dó, chồng giấy thành phẩm trước hai nhà xưởng (một nhà ngói, một nhà tranh).
  - **Khu nhà ở** (phía tây và dọc đại lộ): 10 nhà ngói và nhà tranh, mỗi nhà một tỉ lệ (0,94 đến 1,08), màu nhân và góc xoay riêng, quay mặt ra đường; sân đất, chum vại, rơm, khóm hoa, hàng rào tre ngắn.
  - **Phía bắc**: ao làng (bờ cỏ rộng 1,3), đình nhỏ quay mặt ra ao, cây đa lớn (tỉ lệ 0,5), giếng.
  - **Rìa làng**: hàng rào tre bán kính 36,5 (chừa lối quanh cổng), 4 mảnh ruộng lúa, bụi tre (13 bụi, bụi nhỏ lấp chỗ trống).
  - **Dân làng**: 3 người đi lại giữa các khu (bà cụ quanh sân giữa làng và đại lộ; chú nông dân giữa sân phơi giấy và khu nhà ở; bà cụ dọc đường lên ao và đình), nhường đường người chơi như ở chợ.
  - **Đường cho mũi tên** (`paths`): cổng → đại lộ → ngã ở sân → từng biển; sân → đường ngang đông tây; sân → đường lên phía bắc; sân → chỗ đứng trước bác An (nút `guide:lang-giay`).
  - **Vật cản theo chân thật** cho mọi vật mới (xem `?debug=colliders`): nhà, phên, bể, bếp, cối, nền đình (hộp 6,2 × 5,0), ao (từng vũng tròn), giếng, cây đa (nền rễ), biển, bác An và hàng rào ngắn. Khóm hoa, ruộng, mặt nước trong bể thì đi qua được.
- **Test** `villages/giay.test.ts`: đủ nhà, phên, bể, bếp, cối, đình; mọi món trong hàng rào và không chồng nhau; ao và đình chặn đúng, bờ ao đi được; đi được từ chỗ xuất hiện tới biển, bác An, cổng, giếng, đình, bể, bếp, cối, từng phên và từng nhà; mọi điểm và đoạn đi của dân làng không xuyên vật cản; các nút đường nhỏ trống và liền nhau.
- **Cảnh mở đầu (lần đầu vào làng):** chiếu ảnh truyện số 6 kèm lời. Bác An: "Mỗi trang sổ có một mã, tính từ mã trang trước. Đêm qua có kẻ sửa trộm một trang, cả làng cãi nhau xem ai nợ ai!"
- **3 biển gỗ:** "Học cùng bác An" (màn 1), "Đuổi theo {phanDien}" (màn 2), "Ghép lại cuốn sổ" (màn 3).
- **Bản đầu (mốc 2, bước 9; đã thay bằng bố cục W2 ở trên, giữ lại để biết lịch sử):** bố cục ở `packages/village-lang-giay/src/scene/layout.ts` (bán kính khu 21, hàng rào tre bán kính 19,8; cổng ở phía nam (0, −17,5), con đường đất dẫn tới ba biển ở sân trước; bên +X sân phơi 6 phên xếp hai hàng, mỗi phên 4 chân giá; bên −X nhà ngói, bàn chép sổ và bác An; phía sau ba bể ngâm giữa hai nhà). Test `layout.test.ts`: mọi món trong hàng rào, không chồng nhau, tới được mọi biển. Màn 2 đã mở (mốc 2, bước 12), màn 3 hiện "Sắp ra mắt" cho tới khi làm xong; xong màn 1 thì nhiệm vụ là quay về chợ.

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
- Tốc độ bắt đầu **10** đơn vị/giây, tăng **0,3** mỗi 5 giây (theo bậc), tối đa **18**. (Bước X1: trước đó 8, 0,25 và 16; **đổi vì người dùng thấy màn 2 chạy chậm**. Cân bằng chạy lại ở dưới.)
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

**Đã làm (mốc 2, bước 10 — chỉ phần luật, chưa vẽ):** `packages/village-lang-giay/src/runner/`:
- `runnerLogic.ts`: `createRunner({ seed })` và `stepRunner(state, input, dt)` (sửa state tại chỗ, không cấp phát lúc chạy; cùng seed và cùng lệnh thì cùng kết quả). Bước 11 chỉ việc vẽ `state` (làn, `x`, `y`, `rows`, `items`, `villain`, `events`) và nối phím vào `input` (`move`, `jump`, `slide`; lúc hỏi: `answer`, `resume`). Hàm thuần: `speedAt`, `runnerScore`, `runnerMedal`, `minGap`.
- `runnerConfig.ts`: `RUNNER_SPEC` (số liệu đúng spec) và `RUNNER_TUNING` (số spec chưa có, có chú thích: thời gian đổi làn 0,15 giây; kích thước thân; nửa dài các chướng ngại; xe chở hàng dài 6 và hàng kế tiếp cách thêm 6; tần suất và độ dài chuỗi vật nhặt; vật nhặt trên nóc xe; hàng đầu cách vạch 30, sinh trước 90 phía trước; ném rơm rơi cách ít nhất 22 và bay 0,7 giây; chạy chậm 1,2 giây lúc hết vòng, tăng tốc lại 1,0 giây; xóa chướng ngại trong 14 mét phía trước lúc hỏi; nhấp nháy 1 giây sau khi mất tim).
- Quy ước cụ thể: một hàng chỉ có tối đa 2 trong 3 làn có chướng ngại ("chắn kín" là cả 3 làn đều có); mỗi hàng có "làn đi qua được" (trống, thấp hoặc cao) lệch tối đa 1 làn so với hàng trước; rơm {phanDien} ném chỉ được thêm vào làn đang trống của một hàng cách xa ≥ 22 mét và còn chừa ít nhất một làn trống, nên cũng chịu hai luật trên. Hết vòng thì chạy chậm lại, không va chạm trong lúc chậm và lúc hỏi; trả lời xong phải `resume` mới chạy tiếp (để hiện giải thích).
- Test `runnerLogic.test.ts` (đủ 9 ca của bảng trên, giữ nguyên số thứ tự) và `runnerBalance.test.ts` (300 ván bot giỏi, 300 ván bot trung bình; bot ở `testBots.ts`, chỉ dùng trong test). Cân bằng (cấu hình hiện tại): bot giỏi Vàng 95,7% (điểm trung bình 706); bot trung bình điểm trung bình 328: chưa đạt mốc 27,7%, Đồng 34,0%, Bạc 22,7%, Vàng 15,7%. Chỉ chỉnh được tần suất vật nhặt (`RUNNER_TUNING.chain`, `power`, `roof`); không đổi công thức điểm hay mốc điểm.

**Khoảng cách tối thiểu 1,2 (mốc 2, bước 11):** bộ sinh luôn đặt hai hàng cách nhau ≥ tốc độ × **1,2** (kể cả khi chưa có guốc mộc), để lúc vừa nhặt guốc không gặp đoạn quá khó; test của spec (≥ 1,0, guốc × 1,2) vẫn đúng. Cân bằng chạy lại: bot giỏi Vàng 93,0% (điểm trung bình 662); bot trung bình điểm trung bình 290, chưa đạt mốc 31,0%, Đồng 40,0%, Bạc 20,3%, Vàng 8,7% (không đổi cấu hình vật nhặt).

**Đã làm (mốc 2, bước 11 — đường chạy 3D, điều khiển, chướng ngại; chưa có vật nhặt, rơm, câu hỏi):** route `/lang/lang-giay/man/2` (từ bước 12 biển mở theo `unlock.ts`), `pages/Man2.tsx` bọc game trong `MiniGameLevel`, phần chơi ở `runner/RunnerGame.tsx` (khung 3D, phím, vuốt, tim, quãng đường) và `runner/RunnerWorld.tsx` (bên trong khung 3D).
- **Bước thời gian cố định 1/60 giây** (`RunnerSession`, `FixedStepper`): thời gian thật cộng dồn, mỗi khung chạy tối đa 5 bước; vị trí nhân vật, {phanDien} vẽ nội suy giữa bước trước và bước hiện tại. Lệnh phím/vuốt vào hàng đợi cỡ 4 (không cấp phát), mỗi bước dùng một lệnh. Từ bước 12 ván có 4 vòng (xem bên dưới); `noRounds` đã bỏ.
- **Điều khiển:** máy tính ←/→ hoặc A/D đổi làn, ↑/W/Space nhảy, ↓/S trượt; điện thoại vuốt trái/phải/lên/xuống (phát lệnh ngay khi ngón tay đi đủ 28 điểm ảnh). Camera sau lưng nhìn về +z nên phải màn hình là x nhỏ: **trái màn hình = làn +1 (x = +2)**.
- **Cảnh:** đường đất 3 làn giữa cỏ và ruộng, đoạn dài 40 đơn vị lặp theo 6 mẫu (đôi khi lật trái phải) gồm nhà ngói, nhà tranh, bụi tre, giá phơi giấy; mọi vật vẽ bằng "bể" bản dùng lại (`DynamicModel`, `DynamicBoxes` ở core: cấp bộ đệm một lần, mỗi khung ghi lại ma trận, không tạo vật mới). Bản chính/vừa/xa theo khoảng cách tới camera; mức Thấp bỏ bản chính của nhà, 40% vật cảnh, mỗi giá chỉ một phên, nhìn xa 60 mét.
- **Chướng ngại** (kích thước đúng `RUNNER_TUNING`, có test): thấp = `sap-thap` (model) hoặc đống rơm (code); cao = sào phơi giấy bắc ngang (code, rèm giấy từ độ cao 1,0 tới 1,5); chắn làn cao 2,5 = `xe-bo` chất rơm ba tầng (model + code) hoặc ba tầng phên `env/phen-phoi-giay` giữa bốn cột; xe chở hàng = `xe-cho-hang` phóng theo từng trục cho nóc cao đúng 0,9 và dài 6, chạy trên nóc được.
- **Nhân vật:** học sinh `run`, nhảy bằng clip `jump`, trượt bằng tư thế `slide`, nhấp nháy 1 giây và camera rung khi mất tim; {phanDien} (Tí) chạy phía trước 12 đến 15 đơn vị ôm xấp trang.
- Số liệu (máy thử: Intel UHD, Chrome): Thấp 144 FPS, khung lâu nhất 28 ms, tối đa khoảng 243.000 tam giác; Vừa 143 FPS, 573.000; Cao 119 FPS, 1.209.000. Vào cảnh lần đầu (bản build): Thấp 9,1 MB, Vừa và Cao 14,4 MB (chủ yếu model).

**Đã làm (mốc 2, bước 12 — vật nhặt, rơm, câu hỏi, điểm):** màn 2 chơi trọn được, `levels.ts` màn 2 là "ready", biển "Đuổi theo {phanDien}" mở theo `unlock.ts`, cuối màn 1 có nút "Chơi tiếp: Đuổi theo {phanDien}".
- **Ván 4 vòng:** mỗi vòng 25 giây; hết vòng thì chạy chậm lại, hiện QuizCard (ngân hàng câu hỏi Bài 1, tên phản diện lấy từ `{phanDien}`). Đúng +3 trang; sai −1 tim và hiện giải thích; trả lời xong bấm tiếp thì tăng tốc lại theo `runnerLogic`. Ván kết thúc sau vòng 4 hoặc khi hết tim.
- **Tốc độ** đúng spec: bắt đầu 10, **cộng 0,3 mỗi 5 giây theo bậc** (không tăng liên tục), tối đa 18 (`speedAt`, có test; bước X1, trước đó 8, 0,25 và 16).
- **Cân bằng sau khi tăng tốc (bước X1, 300 ván mỗi bot, cùng 300 seed; không đổi mốc điểm và tần suất vật nhặt):**

  | | Bot giỏi: Vàng | Bot giỏi: điểm trung bình (thấp nhất) | Bot trung bình: chưa đạt mốc | Đồng | Bạc | Vàng | điểm trung bình |
  |---|---|---|---|---|---|---|---|
  | Trước (8, 0,25, 16) | 99,7% | 688 (512) | 27,3% | 35,3% | 24,7% | 12,7% | 314 |
  | Sau (10, 0,3, 18) | 100% | 720 (551) | 25,0% | 32,0% | 24,3% | 18,7% | 341 |

  Đạt: bot giỏi ≥ 90% Vàng; bot trung bình "chưa đạt mốc" 25,0% (không quá 35%, test `runnerBalance.test.ts` kiểm); Đồng + Bạc vẫn là đa số (56,3%) và Vàng của bot trung bình dưới 20% (18,7%, sát ngưỡng). Chạy nhanh hơn thì đường dài hơn (quãng đường trung bình của bot giỏi 1.081 lên 1.339 mét) nên điểm tăng. Chín ca test của spec giữ nguyên nội dung; chỉ ca 6 giảm số bước chạy trên nóc xe từ 20 xuống 12 (cùng tình huống, tốc độ cao hơn thì hết nóc xe sớm hơn) và test tốc độ `speedAt` đổi số.
- **5 vật nhặt** (xoay nhẹ, nổ hạt lấp lánh khi nhặt; hạt dùng bể `ParticlePool`): trang sổ, tiền đồng, nón lá, guốc mộc, túi tiền. Nón lá, guốc, túi hiện biểu tượng và thời gian còn lại trên HUD.
- **{phanDien} ném rơm:** theo `runnerLogic`, có động tác ném, đống rơm bay vòng cung (`runnerFlight.ts`) và bóng đen báo chỗ rơi trên làn sẽ có chướng ngại.
- **Làm rơi trang (3b):** thỉnh thoảng {phanDien} làm rơi 2 đến 4 trang (động tác trượt tay, trang rơi lả tả, bóng báo chỗ rơi) xuống làn trống phía trước; chạm đất thì thành "trang sổ" thường (10 điểm, công thức điểm không đổi). Logic thuần ở `runnerLogic` (có test): chỉ rơi vào chỗ nhặt được (không trong chướng ngại, không trùng chỗ rơm) và **trừ vào ngân sách trang** (`pageDebt`: chuỗi trang sổ sau đó ít đi tương ứng).
- **HUD và kết quả:** tim, trang, tiền, quãng đường, vòng x/4. Màn kết quả liệt kê các phần điểm (`scoreParts`: trang × 10, tiền, quãng đường ÷ 10, câu đúng × 30; tổng bằng `runnerScore`) và mốc huy chương. Âm thanh dùng module có sẵn: nhặt, va, đúng, sai; tôn trọng nút tắt tiếng.
- **Pooling:** vật nhặt, rơm, trang rơi, hạt đều dùng bể cố định; chạy không tạo vật mới.
- **Cân bằng chạy lại** (tốc độ từng bậc + trang rơi): bot giỏi Vàng 99,7% (điểm trung bình 688); bot trung bình điểm trung bình 314: chưa đạt mốc 27,3%, Đồng 35,3%, Bạc 24,7%, Vàng 12,7%.
- **Ván thử đủ 4 vòng trong Chrome** (bot giỏi + bấm thẻ câu hỏi thật): 682 điểm = trang 42 → 420, tiền 34, quãng đường 1080 → 108, câu đúng 4 → 120; Vàng, không lỗi.
- Số liệu (Intel UHD, Chrome, bot giỏi chơi 22 giây): Thấp 173 FPS (thấp nhất 142), tối đa 246.000 tam giác; Vừa 110 FPS (72), 839.000; Cao 99 FPS (64), 1.227.000. Vào cảnh lần đầu (bản build, tắt cache): Thấp 9,0 MB, Vừa và Cao 14,1 MB.

**Khựng ở màn 2 (mốc 2, bước 13):** chạy trọn ván 3 mức, 2 ván mỗi mức, ghi từng khung > 33 ms kèm sự kiện của ván. Khung lâu nhất: Thấp 28 ms, Vừa 35 ms, Cao 34 ms; không khung nào > 50 ms; khung > 33 ms duy nhất là lúc mở màn kết quả (hủy cảnh 3D và dựng màn kết quả, sau khi ván đã xong). Đóng nạp trước (`?warmup=off`) thì ở mức Cao có khung 55 và 76 ms ở 1 đến 3 giây đầu (biên dịch shader và đưa hình lên GPU lần đầu): nạp trước trong màn hình tải đang đủ. Khựng 64 đến 72 FPS, 70 ms đo ở bước 12 không tái hiện được; nguyên nhân khả dĩ nhất là máy đang bận lúc đo (số đo cùng cách, đo lại ngay sau đó: Vừa 287 FPS, Cao 215 đến 257 FPS). Cũng đo: tạo `AudioContext` lần đầu mất khoảng 42 ms, nhưng nút "Bắt đầu" (có tiếng bấm) đã tạo nó trước khi chơi.

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

**Câu chuyện:** học sinh mang các trang lấy lại về bàn của bác An để ghép lại cuốn sổ như ban đầu. Nhưng {phanDien} đã nhét lẫn một trang giả. (Từ bước X2, vòng 3 là vòng giữ sổ: {phanDien} liên tục quay lại tráo trang trong chuỗi đã ghép xong, em phải sửa liên tục. Xem "Vòng 3 — giữ sổ 90 giây" ở dưới.)

**Dựng bằng `Scene25D`:**
- Nền: `scenes/man-03-xuong-giay`.
- Hình rời: rổ trang giả `sprites/man-03-ghep-so/ro-trang-gia`, đặt ở góc phải.
- **Trang sổ:** code vẽ thẻ giấy dó có chữ.
- **Bác An:** model 3D đứng ở mép trái.
- **{phanDien}:** trước vòng 2, model 3D chạy vào (`run`), cười (`cheer`), thả trang giả vào xấp giấy rồi chạy ra. Ở vòng 3 (bước X2) nó chạy vào, tráo và chạy ra liên tục suốt 90 giây.

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

> **Đã thay ở bước X2:** vòng 3 không còn là "9 trang, 1 trang giả" mà là **vòng giữ sổ 90 giây** (6 trang đúng ngay từ đầu, {phanDien} tráo liên tục). **Lý do:** người dùng muốn {phanDien} tráo liên tục và học sinh phải sửa liên tục, thay vì một lần nhét trang giả rồi ghép xong. Bảng gốc giữ lại để thấy chỗ đổi; vòng 1 và 2 giữ nguyên luật và test.

| Vòng (từ bước X2) | Số trang | Trang giả |
|---|---|---|
| 1 | 5 | Không |
| 2 | 7 | 1 (nhét trước khi chơi) |
| 3 — giữ sổ | 6 (đúng ngay từ đầu) | Tráo liên tục trong 90 giây, tối đa 3 cái cùng lúc (khoảng tráo 9 → 6 giây: bước X2b 5, bước X3 nâng lên 6) |

Trước vòng 2, {phanDien} lẻn tới nhét trang giả vào xấp giấy, cười khúc khích.

**Vòng 3 — giữ sổ 90 giây (bước X2):**
- Đầu vòng: chuỗi 6 trang **đúng** (tạo bằng `buildChain`, mã trang không trùng nhau). Mặt bàn trống. Thẻ giới thiệu "Vòng 3: Giữ sổ" nằm sẵn, bấm "Bắt đầu giữ sổ" thì đồng hồ 90 giây mới chạy.
- **Lịch tráo:** lần đầu ở giây 6; sau mỗi lần tráo ở giây `t`, lần kế tiếp cách `9 − 3 × t/90` giây (khoảng cách giảm tuyến tính từ 9 giây xuống **6 giây** theo giờ chơi; bước X2: xuống 4 giây, bước X2b: 5 giây, **bước X3 nâng lên 6** vì vòng vẫn quá dồn). Không tráo trong 6 giây cuối (để trang nào bị tráo cũng còn thời gian sửa). Lịch đủ **11 lần**, ở giây 6; 14,8; 23,3; 31,5; 39,5; 47,2; 54,6; 61,8; 68,7; 75,4; 81,9.
- **Một lần tráo:** {phanDien} chạy vào (1 giây), cười và ném trang thật ra bàn (1,5 giây là đúng lúc tráo), chạy ra (xong lúc 2,9 giây, ngắn hơn khoảng cách nhỏ nhất 6 giây nên hai lần không chồng nhau). Một **trang thật** bất kỳ trong chuỗi (không bao giờ chọn ô đã là trang giả hay đang trống) thành **trang giả**; trang thật bị ném ra bàn, đi kèm **1 trang mồi**.
- **Trang giả luôn phát hiện được bằng công thức:** nó giữ nguyên mã trang trước và mã trang của trang thật (nên mối nối với trang bên cạnh vẫn khớp, không lộ ô nào bị tráo) nhưng đổi nội dung. Vì `(trước × 2 + nội dung) mod 100` đổi theo nội dung, `pageCode(trước, nội dung) ≠ mã trang ghi trên thẻ`. Không có dấu hiệu nào khác: thanh trạng thái chỉ nói "Chuỗi đang lệch" khi còn ô chưa sửa xong, "Chuỗi đúng" khi cả 6 ô là trang thật; mọi trang trong chuỗi viền giống nhau.
- **Trang mồi:** trang đúng công thức nhưng mã trang trước không phải mã của trang nào trong chuỗi (kể cả trang bìa), nên không ô nào nhận; đặt vào ô thì sai mã trước. Mỗi lần tráo kèm một trang mồi; khi ô đó được sửa xong, trang mồi đi cùng lần tráo ấy bị dọn khỏi bàn. Bàn có tối đa 3 trang thật + 3 trang mồi.
- **Sửa một ô** = kéo trang giả (đang nằm trong chuỗi) vào rổ, ô thành ô trống, rồi kéo **đúng trang thật** (mã trước khớp ô đó) từ bàn vào ô trống. Mỗi ô là một vùng thả riêng. Chạm cũng được: chạm thẻ rồi chạm rổ hoặc chạm ô trống. Đặt trang vào ô còn trang thì không có gì xảy ra (Bi nhắc bỏ trang giả vào rổ trước), không phạt.
- **Phạt tim (hết tim: xem bước X2b ở cuối):** trang thật (ở chuỗi hay ở bàn, kể cả trang mồi) bỏ vào rổ: thẻ bật về, **mất 1 tim**; đặt sai thẻ vào ô trống (mồi, hay trang thật của ô khác): thẻ bật về, **mất 1 tim**. Đã có **3 ô chưa sửa** (còn trang giả hoặc ô trống) mà đến lượt tráo: **không tráo, nhưng mất 1 tim**. Hết 3 tim thì hết ván như trước; vòng 3 dở dang không được tính điểm.
- **Bi gợi ý:** một ô để quá **10 giây** chưa sửa thì Bi nói "nửa bên trái" (ô 1 đến 3) hoặc "nửa bên phải" (ô 4 đến 6) của chuỗi, chỉ một lần mỗi ô, không chỉ đúng ô.
- **Điểm vòng 3:** **+20** mỗi ô sửa xong, thêm **+5** nếu sửa trong 5 giây kể từ lúc bị tráo; hết 90 giây mà ô chưa sửa xong (còn trang giả, hoặc đã bỏ trang giả vào rổ mà chưa đặt lại trang thật) thì **−10** mỗi ô. Điểm vòng không bị trừ theo "lỗi" như vòng 1, 2 (lỗi chỉ làm mất tim). **Hết tim giữa vòng (bước X2b):** ván kết thúc nhưng vẫn tính +20/+5 các ô đã sửa; **không** trừ −10 cho ô chưa sửa (chỉ trừ khi hết giờ).
- **Điểm cao nhất:** 11 lần tráo × 25 = 275, nên tối đa 100 + 130 + 275 = **505** (bước X2b: 12 lần, 530; bước X2: 13 lần, 555).

**Tim, điểm:**
- 3 tim cho cả ván.
- Điểm mỗi vòng = 100 − 10 × số lỗi, cộng 30 nếu bỏ đúng trang giả vào rổ.

| Mốc | Điểm (gốc) | Điểm (từ bước X2) |
|---|---|---|
| Đồng | 150 | **200** |
| Bạc | 250 | **400** |
| Vàng | 330 | **475** (bước X2: 520; X3: 500, rồi 475 vì khoảng tráo 6 giây) |

**Mốc điểm (bước X2; Vàng hạ 520 → 500 → 475 ở bước X3) và vì sao:** vòng 3 mới cho nhiều điểm hơn vòng cũ (tối đa 300, vòng cũ 130), nên mốc cũ (tối đa 360 điểm) không còn đúng. Bước X2b đổi khoảng tráo nên tối đa còn 530; Vàng 520 chỉ dư 10 điểm (một lần sai là tụt Bạc), nên bước X3 hạ Vàng xuống 500. Sau đó khoảng tráo ngắn nhất nâng lên 6 giây làm tối đa còn 505, Vàng 500 lại chỉ dư 5 điểm, nên **Vàng hạ tiếp xuống 475 (dư 30 điểm), Đồng 200 và Bạc 400 giữ nguyên**. Mô phỏng 300 ván mỗi bot (seed 1 đến 300, `rebuildBots.ts`, `rebuildBalance.test.ts`); bot chỉ dùng thao tác của học sinh:
- **Bot giỏi:** vòng 1, 2 chơi hoàn hảo; vòng 3 sửa mỗi ô trong 3 đến 4 giây, không kéo nhầm.
- **Bot trung bình:** vòng 3 sửa trong 6 đến 9 giây, 15% mỗi lần tráo kéo nhầm một trang thật vào rổ; vòng 1, 2 chơi hoàn hảo (mô tả bot ở bước X2 chỉ nói về vòng 3). Bản "độ nhạy" thêm lỗi ở vòng 1, 2: mỗi lần đặt thẻ có 8% đặt nhầm một thẻ sai mã trước, và ở vòng 2 có 15% đặt thẳng trang giả vào chuỗi trước khi bỏ vào rổ (bước X2 dùng bản này làm bot trung bình).

| Bot | Điểm trung bình | Chưa đạt (< 200) | Đồng | Bạc | Vàng | Hết tim |
|---|---|---|---|---|---|---|
| Giỏi (bước X3, mốc 475) | 505 (cả 300 ván đúng 505) | 0% | 0% | 0% | **100%** | 0% |
| **Trung bình chính (bước X3): có sai ở vòng 1, 2; vào vòng 3 hồi đủ tim** | 392,2 | 7,7% | 15,7% | 76,7% | 0% | **29,7%** (89 ván) |
| Trung bình chơi hoàn hảo vòng 1, 2 (bot trung bình của bước X2b), hồi đủ tim | 425,4 | 0% | 15,0% | 85,0% | 0% | 23,0% (69 ván) |
| *Trước (bước X2b): bot trung bình có sai ở vòng 1, 2, không hồi tim* | 366,2 | 7,7% | 34,3% | 58,0% | 0% | 50,3% |

**Bước X3 — kết quả so với yêu cầu:** bot giỏi ≥ 90% Vàng (100%) đạt. Bot trung bình chính (có sai ở vòng 1, 2) hết tim **29,7% (89 ván), chưa đạt yêu cầu ≤ 25%** (khoảng tráo 5 giây: 30,3%; nâng lên 6 giây chỉ giảm 0,6 điểm phần trăm): hồi tim đã đưa 50,3% xuống 29,7%, nhưng 23 ván (7,7%) hết tim ngay ở vòng 1, 2 vì sai của bot, còn lại hết tim ở vòng 3 chủ yếu do 15% kéo nhầm trang thật vào rổ (mỗi lần mất 1 tim, 11 lần tráo). Theo lệnh, không đổi thêm luật. Số thử thêm ở khoảng tráo 5 giây, chưa đưa vào luật và chưa đo lại ở 6 giây: vòng 3 cho 4 tim thì hết tim còn 15,7% (47 ván); bỏ phạt "đầy 3 ô" thì không đổi (91 ván). Còn lại toàn Đồng, Bạc (92,3% cùng "chưa đạt" 7,7% ở vòng 1, 2), không có Vàng.

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

**Đã làm (mốc 2, bước 13 — luật màn 3, chưa có giao diện kéo thả):** `packages/village-lang-giay/src/rebuild/`: `rebuildConfig.ts` (số liệu đúng spec), `rebuildLogic.ts` (hàm thuần, `createMulberry32(seed)`, dùng lại `pageCode`, `buildChain`, `randomGenesis`, `randomContents`, `solutionSteps` của Bài 1).
- API: `generateDeal(rng, số trang, có trang giả)`, `createRebuild(seed)`, `placeCard`, `binCard`, `insertFake`, `advance`, `inspectCard` ("Soi công thức": prev × 2, tổng, kết quả mod 100, khớp hay không), `checkPlacement(mã trang cuối, thẻ)` → ok | badPrev | fake, `roundScore`, `rebuildScore`, `rebuildMedal`. Trạng thái sửa tại chỗ như `runnerLogic`; `phase`: villain (chờ {phanDien} nhét trang giả, vòng 2 và 3) → play → roundDone → over.
- Tạo đề: chuỗi thật bằng `buildChain`; mã trang không trùng nhau và không trùng mã trang bìa (chặt hơn spec một chút, để mỗi mã trước chỉ khớp đúng một trang thật); trang giả có mã trước là mã của một trang thật không phải trang cuối, nội dung ngẫu nhiên, mã khác `pageCode` và khác mọi mã thật. Phát hiện trang giả luôn bằng công thức, không đọc cờ `isFake`.
- Chỗ spec chưa nói, tôi chọn: (1) trang thật bỏ vào rổ thì bật về và mất 1 tim (không thì kéo thử từng thẻ vào rổ là lộ trang giả không mất gì); (2) mã trước sai được xét trước mã trang sai (thẻ giả đặt sai chỗ là "sai mã trước"); (3) hết tim giữa vòng thì vòng dở không được điểm, các vòng đã xong vẫn tính; (4) vòng xong khi đủ trang thật, không bắt buộc bỏ trang giả vào rổ (không bỏ thì mất 30 điểm thưởng).
- (Số liệu của bước 13, **đã thay ở bước X2**: vòng 3 mới tối đa 325 điểm, tổng tối đa 555, mốc 200 / 400 / 520.) Điểm cao nhất 100 + 130 + 130 = 360. Có 3 tim và lỗi thứ 3 kết thúc ván, nên ván hoàn thành có tối đa 2 lỗi: thấp nhất 360 − 20 = 340 nếu bỏ đúng cả 2 trang giả (Vàng 330), còn không bỏ trang giả nào thì tối đa 300 − 20 = 280 (Bạc).
- Test `rebuildLogic.test.ts`: 5 ca của bảng test (giữ số thứ tự), 1000 đề giải được, 1000 đề trang giả luôn phát hiện được, vòng, tim, điểm, mốc, tất định.

**Đã làm (mốc 2, bước 14 — giao diện và vòng chơi màn 3):** `packages/village-lang-giay/src/rebuild/` (`RebuildGame.tsx`, `RebuildCards.tsx`, `RebuildActors.tsx`, `rebuildLayout.ts` có test), trang `pages/Man3.tsx` bọc trong `MiniGameLevel`, route `man/3`; màn 3 là `ready` trong `levels.ts`.
- **Cảnh:** `Scene25D` với nền `scenes/man-03-xuong-giay`, rổ trang giả là hình rời (`ro-trang-gia`), Bác An (đứng yên) và học sinh ở mép trái, {phanDien} (Tí) là model 3D. Thẻ, thanh trên, chuỗi, khay, rổ là lớp HTML phủ lên (cỡ theo cqw nên co giãn cùng khung 16:9): thanh trên y 1–10%, hàng chuỗi 14–34%, dải giữa 35–65% (nhân vật, lời Bi, soi công thức), khay 67–89%, rổ ở bên phải dải giữa.
- **Thao tác:** kéo thẻ vào chuỗi hoặc rổ bằng chuột hoặc ngón tay (Pointer Events, đi quá 8 điểm ảnh mới tính là kéo), hoặc chạm chọn thẻ rồi chạm chuỗi/rổ; bàn phím: Enter hoặc Space chọn thẻ rồi Enter vào chuỗi hoặc rổ. Thả ra ngoài thì thẻ về chỗ cũ, không phạt. Thẻ ở khay tối thiểu 48 × 62 điểm ảnh ở điện thoại ngang (khung 693 điểm ảnh), nút 44 điểm ảnh. Sai thì thẻ rung đỏ và ô kế tiếp nháy đỏ, Bi báo lý do; đúng thì thẻ vào ô (hiệu ứng nảy) và có tiếng.
- **Soi công thức:** như spec: nút ở thanh trên mở một ô nhỏ trong dải giữa, hiện sẵn phép tính của thẻ đang chọn và kết quả, ví dụ "(31 × 2 + 7) mod 100 = 69 → khớp", hoặc "(31 × 2 + 50) mod 100 = 12, thẻ ghi 99 → không khớp" với trang giả. Không nói thẻ nào là trang giả hay đặt vào đâu (em tự so mã trước với trang cuối chuỗi). Bước "tự nhập kết quả" làm ở bước 14 đã bỏ (bước 14b). `inspectionLine` có test.
- **{phanDien} nhét trang giả (vòng 2, 3):** chạy vào từ bên phải (run) 1,2 giây, đứng cười (cheer) và thả một thẻ úp bay vào khay 1,9 giây, chạy ra 2,7 giây, 3,8 giây thì trang giả hiện trong khay (`VILLAIN_TIMING`); bật "giảm chuyển động" thì rút còn một phần tư. Trong lúc này chưa chơi được. Học sinh: sad khi đặt sai, point chỉ về rổ khi bắt được trang giả hoặc chỉ về {phanDien} khi nhét, cheer khi đủ chuỗi.
- **Vòng, tim, điểm:** đúng `rebuildLogic`; thanh trên có tim, "Vòng x/3", điểm (đã chắc + vòng đang chơi); hết vòng hiện bảng "Vòng x xong" với nút "Vòng tiếp theo" hoặc "Xem kết quả"; hết tim thì "Hết tim rồi!". Màn kết quả liệt kê từng vòng (số lần sai → điểm) và dòng +30 khi bỏ đúng trang giả.
- **Nạp trước:** ảnh và model nạp xong rồi giữ màn hình tải thêm khoảng 1,4 giây để chạy thử trước các chuyển động đầu (sad, point, cheer của học sinh; run, cheer của {phanDien}) rồi mới lộ cảnh (`Scene25D` có thêm prop `hold`).
- **Khựng ở màn 3 (bước 14b):** đo bản build (Chrome, Intel UHD) với trace: khung 60 đến 240 ms lúc xong vòng và lúc {phanDien} chạy vào do tiến trình GPU vẽ lại các ô của lớp HTML (`RasterDecoderImpl::DoEndRasterCHROMIUM::Flush` 20 đến 70 ms), luồng chính chỉ 2 đến 6 ms. Thử chèn CSS: bỏ `box-shadow` toàn trang thì hết khựng (khung lâu nhất 28 ms); chỉ bỏ bóng mờ hoặc chỉ bỏ bóng cứng thì còn 55 đến 62 ms. Sửa: lớp phủ của `Scene25D` không có bóng đổ (xem spec 03), màn 3 tạo khối bằng viền dưới dày; thẻ đang kéo là một lớp dựng sẵn di chuyển bằng `transform` (không mount mới lúc bắt đầu kéo, không dàn trang lại mỗi lần chuột nhích). Một khung 60 đến 80 ms còn lại lúc bắt đầu kéo lần đầu mất khi thẻ kéo được dựng sẵn.
**Đã làm (mốc 2, bước X2 — vòng 3 thành vòng giữ sổ 90 giây):** `packages/village-lang-giay/src/rebuild/`.
- **Luật (`rebuildLogic.ts`, `rebuildConfig.ts` có `REBUILD_KEEP`):** `KeepState` và phase mới `keep`; hàm thuần `swapIntervalAt`, `swapSchedule`, `beginKeep`, `stepKeep(s, dt)` (bước thời gian, trả về các sự kiện swap / overflow / hint / timeout, xử lý đúng thứ tự dù `dt` lớn), `placeInSlot`, `binFromSlot`, `binFromTable`, `keepChainStatus`, `keepUnfixed`, `keepHalf`, `keepTimeLeft`; `scoreParts` có thêm các dòng `sua`, `nhanh`, `conLech` cho vòng 3. Số ngẫu nhiên từ `createMulberry32(seed)` nên cùng seed và cùng thao tác thì cùng kết quả.
- **Test (`rebuildKeep.test.ts`, `rebuildBalance.test.ts`, sửa `rebuildLogic.test.ts` và `rebuildLayout.test.ts`):** lịch tráo giảm đúng từ 9 xuống 6 và đủ 11 lần; trang giả luôn sai công thức (300 ván) và giữ mã trước, mã trang; không tráo vào ô đã giả; không quá 3 ô chưa sửa; đầy 3 ô thì không tráo và mất 1 tim (hết tim thì hết ván); điểm +20, +5 (đúng 5 giây vẫn nhanh, 5,1 giây thì không), −10 mỗi ô khi hết giờ; gợi ý sau 10 giây đúng nửa chuỗi, một lần mỗi ô; trang mồi không ô nào nhận; tất định theo seed; mô phỏng 300 ván mỗi bot. Vòng 1, 2 và 5 ca của bảng test giữ nguyên.
- **Giao diện:** `RebuildGame.tsx` chạy vòng 3 bằng vòng lặp `requestAnimationFrame` gọi `stepKeep` (không dùng `useFrame`). {phanDien} (Tí) chạy vào trước giờ tráo 1,5 giây để lần tráo rơi đúng lúc nó đứng cười (`KEEP_VILLAIN_TIMING`: vào 1,0 / tráo 1,5 / ra 2,1 / xong 2,9 giây; bật "giảm chuyển động" thì rút còn một phần tư). Thẻ úp bay ra bàn lúc nó cười rồi hai thẻ (trang thật và trang mồi, viền vàng) rơi vào khay. Thanh trên có đồng hồ m:ss (đỏ khi còn dưới 10 giây) và thanh trạng thái "Chuỗi đang lệch" / "Chuỗi đúng". `KeepChainRow` ở `RebuildCards.tsx`: mỗi ô là vùng thả `slot:N`, trang trong chuỗi kéo được vào rổ hoặc chạm chọn để soi công thức. Lớp phủ không có `box-shadow` hay `filter` (bước 14b). Màn kết quả có dòng: ô đã sửa xong, sửa trong 5 giây, ô còn lệch khi hết giờ.
- **Hướng dẫn:** phần "Màn 3" của hộp hướng dẫn vẫn 4 trang; trang 3 gộp việc kéo trang giả vào rổ, trang 4 nói về vòng giữ sổ 90 giây (lời trong `content/huongDan.ts`, chữ giao diện trong `rebuildUi` ở `content/games.ts`).
- **Chỗ spec chưa nói, tôi chọn:** (1) lần tráo đầu ở giây 6 và không tráo trong 6 giây cuối; (2) một ô "chưa sửa" gồm cả ô trống sau khi bỏ trang giả vào rổ, và giới hạn 3 tính trên số ô chưa sửa này (không thì bàn có thể đầy thẻ); (3) hết giờ thì ô trống chưa đặt lại cũng bị −10; (4) mỗi lần tráo kèm một trang mồi riêng, bị dọn khi ô đó sửa xong; (5) thẻ giới thiệu vòng 3 phải bấm "Bắt đầu giữ sổ" thì đồng hồ mới chạy; (6) đặt trang vào ô còn trang thì không phạt; (7) hết tim giữa vòng 3: bước X2 không tính điểm vòng 3, **bước X2b đổi thành vẫn tính các ô đã sửa**.

**Đã làm (mốc 2, bước X3, phần màn 3):** vào vòng 3 được **hồi đủ 3 tim** (`startRound` đặt `hearts` về `SPEC.hearts`; có test), thẻ giới thiệu vòng 3 có thêm một câu động viên của bác An (`rebuildUi.bacAnDongVien`, hộp có `data-testid="bac-an-dong-vien"`). Bot trung bình chính là bot có sai ở vòng 1, 2 (`AVERAGE_BOT`; bot chơi hoàn hảo vòng 1, 2 đổi tên `AVERAGE_BOT_CLEAN`). Mốc 200 / 400 / **475** (Vàng 500 trước đó, đổi vì tối đa còn 505). Khoảng tráo ngắn nhất **6 giây**. Kết quả mô phỏng và chỗ chưa đạt ở bảng trên.

**Đã làm (mốc 2, bước X2b — chỉnh 4 điểm ở vòng 3):**
1. **Hết tim giữa vòng 3:** ván kết thúc nhưng vẫn tính +20/+5 các ô đã sửa; không trừ −10 cho ô chưa sửa (chỉ trừ khi hết giờ). `addError` ghi phần điểm vòng 3 ngay lúc hết tim (`rebuildLogic.ts`); màn kết quả có dòng "ô đã sửa xong" (kể cả 0 điểm) và dòng "sửa trong 5 giây", không có dòng trừ điểm. Test mới trong `rebuildKeep.test.ts`.
2. **Khoảng tráo ngắn nhất 5 giây** (`REBUILD_KEEP.intervalEnd`), lịch 12 lần; test lịch tráo cập nhật. (Bước X3 nâng lên 6 giây, lịch 11 lần.)
3. **Mô phỏng lại** (bảng ở mục Tim, điểm): bot giỏi 100% Vàng; bot trung bình hết tim 23,7%, toàn Đồng/Bạc; mốc huy chương **giữ 200 / 400 / 520**.
4. **Chống khựng lần đầu:** `KeepWarm` trong `RebuildGame.tsx` dựng sẵn (mờ 1%, góc dưới phải) đồng hồ đỏ, hai thanh trạng thái chuỗi, bong bóng lời Bi, ô trống nhấp nháy và nháy đỏ, thẻ mới/rung/đang chọn, bảng hết giờ; trạng thái chuỗi chuyển vào thanh trên (hết đè lên nút "Soi công thức" ở điện thoại). Tiếng không cần nạp trước: `AudioContext` đã có từ lần bấm nút đầu, mỗi tiếng chỉ tạo vài nút âm. Số đo ở báo cáo bước X2b.

- **Mở khóa:** màn 3 sẵn sàng nên Trang Sổ Vàng 1 chỉ được trao khi chơi xong màn 3 (người đã có trang từ trước vẫn giữ); biển "Ghép lại cuốn sổ" mở sau khi chơi màn 2.

## Kết thúc làng

- Bác An trao **Trang Sổ Vàng thứ nhất**.
- Bác An: "Một mình giữ sổ thì kẻ gian vẫn ngồi sửa cả đêm được. Vì thế các làng không bao giờ để sổ ở một nơi. Xuống Làng Dệt mà xem."
- Nút "Về chợ".

**Bản làm (mốc 2, bước 16):**
- **"Em có biết?" khi vào làng:** lần đầu vào làng, sau cảnh mở đầu (ảnh truyện, lời bác An), hiện 4 thẻ "Em có biết?" của Bài 1 (`bai1Lesson.emCoBiet`, không viết lại): "Thẻ n/4", nút "Trước", "Tiếp", thẻ cuối nút "Vào làng". Chỉ tự hiện một lần (cờ `knowSeen`, cookie `ks`); menu làng có mục "Em có biết?" để xem lại; nút "Em có biết?" ở trang bài học giữ nguyên. Thành phần dùng chung `EmCoBietDialog` (spec 03 mục 3.9).
- **Hướng dẫn chơi:** nút ? ở HUD làng, mục trong menu làng, và nút ở thẻ bắt đầu của màn 2 và màn 3 (mở thẳng "Màn 2: Đuổi theo {phanDien}" hoặc "Màn 3: Ghép lại cuốn sổ"). Xem spec 03 mục 3.8.
- **Sửa lỗi đống rơm ở màn 2 chỉ hiện một phần:** đã tái hiện bằng Chrome (đống rơm thấp, rơm đang bay, rơm đã rơi đều chỉ hiện hai "gò" rỗng). Nguyên nhân thật: `createHayStack` (`three/cho/marketGeometry.ts`) dựng `LatheGeometry` với đường viền đi từ ĐỈNH xuống ĐÁY, nên mọi mặt quay VÀO TRONG (thể tích có dấu −3,42); vật liệu một mặt chỉ vẽ mặt trong của thành phía sau. Các nghi vấn khác đã loại: `DynamicBoxes` và `newMesh` (bể bản của `DynamicModel`) đều đặt `frustumCulled = false` nên không bị cắt theo khung bao cũ; ma trận của mọi bản được ghi mỗi khung hình; mặt phẳng gần của camera không phải nguyên nhân (sau khi sửa, đống rơm đầy đủ ở mọi khoảng cách từ 2,6 đến 8,5 đơn vị trước người chơi). Sửa tận gốc: đường viền đi từ đáy lên đỉnh (đống rơm ở chợ phiên cũng được sửa vì dùng chung hình). Test: `signedVolume` (`three/geometryChecks.ts`) bắt mọi hình đặc dựng bằng code (đống rơm, chum, đồ gợi nghề, thân thuyền) phải có thể tích dương và đống rơm khớp thể tích khối tròn xoay; `newMesh` không cắt theo khung nhìn.

**Bản làm (mốc 2, bước 15a):**
- **Cảnh trao trang** (`WorldPage`, trong làng): vào làng khi đã có Trang Sổ Vàng của làng này mà chưa chiếu (xong màn 3, hoặc đã có trang từ trước; nếu cảnh mở đầu làng cũng là lần đầu thì chiếu sau cảnh đó) thì bác An nói hai lượt (`villageScene.lang-giay.award.loi`: "Em đã mang các trang về và ghép lại cuốn sổ rồi đấy! Bác trao em Trang Sổ Vàng thứ nhất." rồi câu của spec). Lượt đầu có hàng 4 ô Trang Sổ Vàng (`GoldenPagesRow`): trang vừa nhận bay vào ô trang 1 (bật "Giảm chuyển động" thì nằm sẵn trong ô), ô trang 1 trên HUD nhấp sáng 3 lần (`animate-golden-glow`). Hết lượt thì hộp thoại đóng (từ bước W1 không còn nút "Về chợ" sang trang khác: người chơi đang ở trong thế giới mở, dòng nhiệm vụ và mũi tên dưới chân chỉ về cổng Làng Dệt; xem spec 04 mục 5b); "Bỏ qua" cũng đóng hộp thoại.
- **Chiếu một lần, lưu theo tiến độ:** cờ `goldenSeen` trong `game_state.data` (chơi thử: trường `gs` của cookie `sc_guest`, một bit mỗi làng), hợp cờ khi gộp tiến độ; hàm thuần `shouldShowGolden` ở `progress/villageIntro.ts`, test `goldenFlags.test.ts`. Tài khoản giáo viên không chiếu.

- [x] Test của Bài 1 (giai đoạn 1), `runnerLogic` và `rebuildLogic` đều ✅. (Bước 15a: `pnpm test` 103 file, 1180 test xanh.)
- [ ] Màn 1: đủ 3 trạm; domino và cuộc đua sửa sổ chạy đúng.
- [ ] Màn 2:
  - vuốt và phím đều nhận ngay;
  - có câu hỏi sau mỗi vòng;
  - chạy lên nóc xe được;
  - không bao giờ gặp hàng chắn kín 3 làn.
  - [x] **luật chung (bước HD, spec 03 mục 3.8 và 6):** hướng dẫn riêng, nút "?" (phím H) với `runnerHint.ts`, tạm dừng thật (`RunnerSession.update(dt, paused)`); màn kết quả có nút "Chơi tiếp" sang màn 3.
- [ ] Màn 3: trang giả luôn phát hiện được bằng công thức; kéo thả dùng được trên điện thoại. (Bước X2: vòng 3 là vòng giữ sổ 90 giây, mốc 200 / 400 / 520; kiểm bằng Chrome, chuột và chạm giả lập đều chơi hết vòng 3 và ra "Vàng 545/555 điểm"; còn cần thử trên điện thoại thật.) (Bước 15a, **số điểm và mốc đã thay ở bước X2**: `rebuildLogic.test.ts` xanh; chơi hết màn trên bản build bằng chuột và bằng chạm giả lập đều ra "Vàng 360 điểm", 144 fps, không khung nào quá 33 ms. Còn cần thử trên điện thoại thật.)
  - [x] **luật chung (bước HD, spec 03 mục 3.8 và 6):** hướng dẫn riêng, nút "?" (phím H) với `rebuildHint.ts`, tạm dừng thật; màn kết quả chỉ có "Chơi lại" và "Về làng" (không còn màn sau trong làng).
- [x] Xong màn 3: nhận Trang Sổ Vàng, về chợ thấy cổng Làng Dệt mở. (Bước 15a, kiểm bằng Chrome: ghi kết quả 3 màn, vào làng thì bác An trao trang, "Về chợ" sang `/cho?mo=lang-giay`, then gỗ và dây đỏ rơi, Bi nói "Một trang rồi! Cổng Làng Dệt đã mở.", nhiệm vụ đổi sang Làng Dệt; tải lại thì không chiếu lại.)
- [x] Lần đầu vào làng: sau cảnh mở đầu hiện thẻ "Em có biết?" (Thẻ n/4, "Vào làng"), chỉ một lần, xem lại ở menu làng; nút "Hướng dẫn chơi" có ở HUD, menu làng và thẻ bắt đầu màn 2, màn 3. (Bước 16, kiểm bằng Chrome.)
- [x] Đống rơm ở màn 2 hiện đủ khối ở cả ba trạng thái (thấp, đang bay, đã rơi). (Bước 16.)
- [ ] Màn 1 là bài 2D giai đoạn 1 đặt trên nền làng, lời bác An hiện đúng chỗ.
- [ ] Ít nhất 30fps ở mức Thấp trên điện thoại tầm trung. (Bước 15a, bản build trên máy tính, mức Thấp: cảnh trao trang 546 fps, đi lại 604 fps; làm chậm CPU 4 lần còn 212 và 275 fps. Còn cần thử trên điện thoại thật.)

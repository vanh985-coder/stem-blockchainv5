# SPEC 07 — BÀI 3: LÀNG KHẮC DẤU (mốc 1: bài học; mốc 3: cảnh làng, màn 8, màn 9)

**Gói:** `packages/village-lang-khac-dau`. Gồm màn 7 (bài học), màn 8, màn 9. Chạy riêng ở `lang-khac-dau.ten-mien.vn`.

**Nguồn luật:** toán, cách tạo đề và chấm sao của bài học giữ đúng **spec giai đoạn 1 `04-bai3-khoa.md`**. Dùng lại `modPow`, `publicKey`, `sign`, `verify` trong `packages/core/src/lessons/bai-3`. Tên hiển thị "Linh" ở Bài 3 đã đổi thành **"Lan"** (spec 01).

**Bảng khóa dùng chung cả làng** (p = 23, g = 5):

| Người | Khóa riêng | Khóa công khai |
|---|---|---|
| Em (học sinh) | 12 | 18 |
| Bác An | 15 | 19 |
| Cụ Bình | 17 | 15 |
| Cô Chi | 19 | 7 |
| Chú Dũng | 21 | 14 |
| {phanDien} | 13 | 21 |
| Giang | 3 | 10 |
| Hoa | 5 | 20 |
| Khang | 6 | 8 |
| Lan | 7 | 17 |
| Minh | 9 | 11 |

**Người dẫn:** chú Dũng (`characters/chu-dung`, không có xương).

**Loại cảnh:** cảnh làng là 3D đi lại; màn 7 là trang bài học 2D; màn 8 và màn 9 là 2.5D. Tên phản diện viết `{phanDien}` (hiện là Tí).

## Cảnh làng (3D đi lại, vùng làng của `WorldScene` ở thế giới mở `/cho`; dựng đủ ở mốc 3, bước L3)

- **Trong thế giới mở:** Làng Khắc Dấu nằm ở phía TÂY chợ trên bản đồ (`worldFrames.ts`: hướng `tay`, quay 90°), cổng làng cách tâm chợ 72, làng **bán kính 125** mở ra phía sau cổng nên tâm làng cách tâm chợ 197 (`three/world/villages/khac-dau.ts`, hệ tọa độ làng như Làng Giấy và Làng Dệt: gốc là tâm làng, +Z là phía bắc của làng, cổng ở (0, −125); tên hướng dưới đây theo cách gọi của Làng Giấy, đông là +X của làng). Làng chỉ được tải khi người chơi vào vùng tải và dọn sau 3 giây khi ra xa; từ xa vẫn thấy hình làng nhẹ. Cảnh mở đầu chạy khi lần đầu bước qua cổng; **"Em có biết?" không còn tự hiện mà là 4 cuộn giấy rải trong làng** (spec 03 mục 3.9). "Về làng" (cuối màn) mở `/cho?tu=lang-khac-dau`: người chơi đứng ngay phía nam ba biển gỗ, ở (0, −96) trong hệ tọa độ làng, nhìn về +Z.
- **Cổng vào:** `env/cong-lang-khac-dau`, ở (0, −125).
- **Model dùng:** nhà `env/nha-mai-ngoi` và `env/nha-mai-tranh` (14 nhà ngói, 14 nhà tranh); `env/gieng-lang` (2); `env/cay-da` (3). Làng KHÔNG dùng `env/khung-cui` và `env/leu-cho`.
- **Code tự dựng (mốc 3, bước L3):** 10 đồ nhỏ mới (`PropKind`, hình học ở `three/cho/marketGeometry.ts`, cỡ ở `PROP_SIZES`, màu ở `CRAFT_COLOR`; ZonePrewarm biên dịch trước như mọi đồ nhỏ):
  - **máy soi dấu** (`may-soi-dau`): thân trụ đồng có bệ tròn, khe nhận thư, mui và lồng đèn; theo ảnh mẫu `source/objects/may-soi-dau.jpg`;
  - **bảng mẫu dấu** (`bang-mau`): hai trụ chân đá, xà ngang, mái hiên nhỏ và sáu tấm gỗ treo (hai hàng ba);
  - **phiến đá đang xẻ** (`phien-da`), **mái che xưởng** (`mai-che`, đi dưới mái được), **chồng phôi gỗ** (`phoi-go`);
  - **hòm thư** (`hom-thu`), **giá xếp thư** (`gia-thu`), **chuồng bồ câu** (`chuong-bo-cau`);
  - **chuồng gà tre** (`chuong-ga`) và **gà** (`ga`, đi qua được).
  - Dùng lại của hai làng kia: `ban-da`, `khoi-da`, `hom`, `thung`, `chum`, `rom`, `chau-canh`, `dinh`, `hoa`, `ban-chep`; sân đình lát gạch (`kind: 'gach'`, texture `ui/textures/san-gach`) như Làng Dệt.
- **Phần chuyển động và chữ** (`three/village/VillageFeatures.tsx`, vì không nhân bản chung được; chữ ở `content/villageFeatures.ts`): **3 bánh răng đồng thau quay chậm** và **đèn lồng tròn nhấp nháy** của máy soi dấu; **chữ trên 6 tấm của bảng mẫu dấu** (số và tên, vẽ lên một canvas dùng chung). "Giảm chuyển động" thì bánh răng đứng yên và đèn sáng đều. Sáu số trên bảng lấy từ khóa công khai của 6 người ở Bài 3 (`PEOPLE` của `lessons/bai-3/logic`, không đặt số riêng); tên phản diện qua `{phanDien}`. Phần vẽ riêng này bị ẩn theo cùng tầm vẽ đồ nhỏ của mức chất lượng (Thấp 55, Vừa 90, Cao 130, tính từ người chơi) như thân máy và khung bảng, để không còn bánh răng, đèn hay chữ lơ lửng khi thân đã bị ẩn. Là một giai đoạn dựng riêng của `VillageZone` (sau thẻ).
- **Chú Dũng** (người dẫn, nói chuyện được) đứng cạnh máy ở (−3,9; −80,6), quay mặt về phía người chơi vào.
- **Cảnh mở đầu:** ảnh truyện số 8 kèm lời. Chú Dũng: "Mỗi người có một khuôn dấu riêng cất kín, và một mẫu dấu công khai treo ở đình. Từ khuôn tạo ra mẫu thì dễ, nhìn mẫu mà đoán ngược ra khuôn thì chịu." (`content/villageScene.ts`, `VILLAGE_SCENE['lang-khac-dau']`: cả lời nhắc việc theo tiến độ và hai lượt trao Trang Sổ Vàng thứ ba).
- **3 biển gỗ:** "Học cùng chú Dũng" (màn 7), "Lật thẻ tìm cặp khóa" (màn 8), "Chữa đàn gà" (màn 9).
- **Bố cục bước L3 (đang dùng; bán kính 125, tọa độ làng, `LANG_KHAC_DAU_LAYOUT`)**: lũy tre bao quanh (vòng bụi tre ở bán kính 122, vật cản là chuỗi hộp, cổng là lối vào chính; 570 bụi tre kể cả đồi tre), các khu nối nhau bằng đường làng (đường **gạch** ở đại lộ và qua sân máy, đường **đất** ở ngõ; 11 đoạn). Đi từ cổng tới chỗ đứng trước biển giữa mất khoảng 8,4 giây đi bộ (34,5 đơn vị; 4,1 đơn vị mỗi giây); tới thẻ xa nhất khoảng 56 giây đi bộ (230,4 đơn vị, 33 giây chạy). Bộ dụng cụ xếp làng dùng chung ở `villages/villageKit.ts`. Cả làng: 28 nhà, 33 mục model (nhà, giếng, cây đa), 162 đồ nhỏ (kể cả 53 khóm hoa và 30 chum rải), 597 món đồ rải (570 tre, 21 cây quả, 6 đồi), 4 ruộng lúa.
  - **Sân máy soi dấu** (giữa làng, sân gạch bán kính 15 ở (0, −85)): máy ở (0; −78,5), ba biển gỗ ở z ≈ −90 (x = 4,6; 0; −4,6) quay mặt về cổng, chú Dũng, bàn đá khắc (8,8; −81,2) với hai khối đá, hòm và thùng ở phía tây sân, 8 chậu cây cảnh ở các góc sân; đường vòng quanh sân ở x = −8. `?tu=lang-khac-dau` đưa người chơi tới (0, −96), nhìn về +Z. Thẻ KHÔNG đặt ở sân.
  - **Xưởng khắc dấu** (đông nam, sân đất bán kính 24 ở (68, −68)): hai mái che ở (58; −69) và (78; −69), mỗi mái có 3 bàn đá khắc (6 bàn) quay ra đường, khối đá, 4 chồng phôi gỗ, 3 hòm, 2 thùng, chum, rơm; 3 nhà xưởng (ngói và tranh) quanh sân; **thẻ 1** ở (66; −57), tới bằng nhánh đường ra xưởng ở z = −50.
  - **Đình làng** (bắc): đình ở (0; 75), sân gạch bán kính 14 ở (0; 64), **bảng 6 mẫu dấu công khai** ở (14; 60) quay mặt về phía nam tây (về (0; 47)), 5 chậu cây, bàn đá, giếng (−14,5; 58,6), 2 cây đa (−17; 80) và (19; 82), 4 nhà quanh đình; **thẻ 2** ở (8; 52).
  - **Trạm đưa thư** (tây, sân đất bán kính 15 ở (−62; 8)): nhà trạm ngói (cỡ 1,18) ở (−62; 24), 2 hòm thư, 3 giá xếp thư, bàn chép, 2 chuồng bồ câu, 2 thùng; hai nhà bên; **thẻ 3** ở (−60; −4), tới bằng đường ra trạm ở z = −4.
  - **Bãi đá** (tây bắc, gần rìa, sân bán kính 15 ở (−82; 58)): 2 phiến đá đang xẻ, 8 khối đá (cỡ từ 0,9 tới 2,6), bàn đá, thùng; 2 đồi đá thấp xám bán kính 6 ở (−102; 38) và (−62; 92); **thẻ 4** ở (−82; 58), tới bằng đường lên bãi đá (hai đoạn từ (0, −4) qua (−36; 16)).
  - **Chuồng gà** (gần cổng, trong lũy tre, sân bán kính 11 ở (−28; −105)): chuồng tre ở (−32; −106), 5 gà quanh chuồng, chum nước, rơm. Đây là đàn gà của màn 9.
  - **Khu nhà ở**: 28 nhà (14 nhà ngói, 14 nhà tranh): 6 dọc ngõ phía tây (z = −46), 4 dọc đại lộ, 6 dọc trục bắc nam, 4 quanh đình, 3 quanh trạm, 3 quanh xưởng, 2 ở rìa phía đông; 2 giếng; 3 cây đa; 21 cây ăn quả.
  - **Rìa làng**: 4 ruộng lúa, 4 đồi tre xanh, 2 đồi đá, lũy tre.
  - **Dân làng**: 6 người đi lại giữa các khu (đại lộ và sân máy, đường ra xưởng, sân trạm, ngõ tây, trục bắc, trước đình), nhường đường người chơi như ở chợ.
  - **Đường cho mũi tên** (`paths`): cổng → đại lộ → sân máy → từng biển; sân → chú Dũng; và tới từng cuộn giấy (`scrollStands`: nút `scroll:lang-khac-dau:<số>`). Quãng đường từ cổng tới 4 thẻ: 154,5; 191,5; 187,3; 230,4 (đơn vị). Hai thẻ nào cũng cách nhau từ 60 trở lên; mỗi thẻ ở một khu (khóa khu `xuongdau`, `dinhlang`, `tramthu`, `baida` ở `content/knowScrolls.ts`; Bi gợi ý theo KHU).
  - **Bản đồ**: viền lũy tre vẽ nét liền (làng đã dựng), nhà, đường gạch và đường đất, ký hiệu thẻ chưa nhặt khi đang ở trong làng; không cần thêm mã (suy ra từ bố cục). Làng Khắc Dấu không còn đồ đất hoang (`wildlands()` bỏ qua cả ba làng đã dựng).
  - **Vật cản theo chân thật** cho mọi vật (xem `?debug=colliders`): nhà, máy soi dấu (hộp quanh bệ và thân), bảng mẫu dấu, mái che (đi dưới mái được), bàn đá, hòm, chuồng gà, nhà trạm, giếng, cây đa, biển, chú Dũng, lũy tre, từng bụi tre và cây quả. Gà, khóm hoa, ruộng thì đi qua được.
  - **Vẽ nhẹ và dựng theo giai đoạn:** như Làng Giấy và Làng Dệt (spec 05 và spec 03 mục 9); thêm một giai đoạn cho máy và bảng (sau thẻ) nên số giai đoạn của hai làng kia không đổi.
  - **Đồi xa của thế giới:** `Hills` (9 đồi cách chợ 400 tới 460, rộng tới 196) có một đồi cách tâm Làng Khắc Dấu có 209 mà rộng 170, che bãi đá và nửa phía bắc làng (ảnh chụp trước khi sửa thấy rõ vách xanh trước bãi đá). `three/cho/hillLayout.ts` (`layoutHills`, hàm thuần có test) đẩy mọi đồi lấn vào chỗ dành riêng của một làng (bán kính 125 cộng chừa 8) ra xa tâm làng theo đường nối tâm; đồi không lấn thì giữ nguyên chỗ. Sửa này cũng dời một số đồi xa gần Làng Giấy, Làng Dệt và Làng Bạc ra ngoài (chỉ ở đường chân trời, không đổi gì trong cảnh đi lại).
  - **Test** `villages/khac-dau.test.ts` (21 ca): đủ số nhà (25 tới 35), giếng, cây đa, cây quả, ruộng; sân máy, máy, ba biển, chú Dũng, chỗ xuất hiện; xưởng, đình có bảng 6 mẫu dấu quay về phía đường, trạm, bãi đá, chuồng gà; mọi món trong lũy tre, không chồng nhau; lũy tre kín; từ chỗ xuất hiện đi tới được mọi biển, chú Dũng, cổng, từng cuộn giấy (dò lưới bước 1); dân làng và các đoạn đường nhỏ không xuyên vật cản, mọi nút liền nhau; hai thẻ cách ≥ 60 và thẻ xa nhất ≤ 240 đơn vị đường đi; cổng tới biển giữa 6 tới 10 giây đi bộ; ở thế giới mở sân gạch, nước, chú Dũng và 4 nút thẻ đi theo bố cục; sáu số trên bảng khớp `PEOPLE`. Test mới khác: `marketGeometry.test.ts` (10 đồ nhỏ mới: cỡ khớp `PROP_SIZES`, hình kín), `hillLayout.test.ts`, `villageScene.test.ts`; băm bố cục Làng Giấy và Làng Dệt không đổi.
- **Tài khoản cũ:** đã xong màn 7 (hoặc đã xem hộp "Em có biết?" cũ) coi như đủ 4 thẻ (`effectiveKnowMask`), không bị chặn biển. Trang Sổ Vàng thứ ba trao như cũ theo `unlock.ts`; từ bước L3 cảnh trao trang (hai lượt của chú Dũng) chiếu một lần khi vào làng.
- **Số đo bước L3** (bản build `VITE_PROBE`, Chrome, máy cắm điện): xem `docs/specs/03-dong-co-3d-giao-dien-chung.md` mục 9, phần "Làng Khắc Dấu (mốc 3, bước L3)". Ảnh chụp kiểm: `docs/screenshots/l3/`.
- **Làm đẹp bước L4 (chỉ hình ảnh, cảnh mở đầu và test; bố cục khu, vị trí thẻ, đường, luật không đổi; ảnh trước/sau ở `docs/screenshots/l4/`):**
  - **Máy soi dấu**: thân trụ nằm ngang mui tròn đúc từ đường viền (`ExtrudeGeometry` vát cạnh), đồng ánh kim, hai đai đồng sẫm vòng quanh thân có hàng đinh tán (28 đinh), khung khe nhận thư có bốn đinh, đĩa đỡ sau từng bánh răng, ống dẫn cong (`TubeGeometry`) và bình có nắp trên mui. Bánh răng cũng là đồng (không còn đồng thau vàng). Vật liệu: vân mài và loang oxy hóa (`craftTextures.ts`, texture `copper`) và ÁNH KIM GIẢ tính trong bộ đổ bóng mảnh (`copperSheen.ts`: phản chiếu một bầu trời giả cộng vào ánh phát sáng theo màu đồng và độ Fresnel). Không dùng `material.envMap`: three đổi bản đồ môi trường sang PMREM ngay lần dùng đầu tiên trên luồng chính, đo trên bản build được một khung 380 đến 400 ms ở mức Vừa và Cao (có thêm khung 83 đến 97 ms lúc chạy), còn tắt đi thì sạch; cũng không đặt `scene.environment`. Chỉ vật liệu của máy và bánh răng có ánh kim giả; mọi đồ khác không kim loại, không bản đồ môi trường (có test). Mức Thấp: chỉ màu đồng, kim loại 0,18, nền phát sáng nhẹ, không ánh kim giả. "Giảm chuyển động" và việc ẩn theo tầm vẽ đồ nhỏ giữ nguyên.
  - **Bệ đá của máy** tách thành vật riêng `de-may` (hai bậc, vật liệu đá phẳng như trước L4, không kim loại, không vật cản riêng); thân máy giữ đĩa mỏng nằm trong bệ để khung bao khớp vật cản tròn bán kính 1,75.
  - **Xưởng khắc dấu**: mái che có vân rơm (texture `thatch`) và hàng bó tranh xòe xuống mép mái (hai màu, dài ngắn khác nhau theo rng cố định), nắp đỉnh sẫm; **bàn đá khắc** `ban-khac` / `ban-khac2` / `ban-khac3` (ba kiểu xếp dụng cụ khác nhau theo rng cố định: con dấu đang khắc có hoa văn nổi, đục, búa gỗ, khay mực đỏ, vụn gỗ, một hai con dấu đã khắc xong; cao 1,05), luân phiên dưới hai mái che và ở sân máy; hai **giá gỗ bày con dấu đã khắc xong** (`gia-dau`); phôi gỗ có vân gỗ (texture `wood`).
  - **Đá**: mọi `khoi-da`, `ban-da`, `phien-da` và các đồ đá mới dùng vân đá (texture `stone`, gần trắng, nhân với màu vật liệu hay màu theo đỉnh nên vẫn là đá xám, ấm, lạnh, cát); đá ven sông và đá viền sân gạch cũng có vân đá. Toạ độ ảnh đặt theo mét thật (`applyBoxUV`) nên mật độ vân đều trên mọi bộ phận. Bãi đá: đá xếp thành CỤM (mỗi cụm một khối to và vài khối nhỏ sát nhau, năm sắc đá xen kẽ, 18 khối từ 0,6 tới 2,6), hai chồng **khối đá vuông đã xẻ** (`da-xe`), **khung cưa đá bằng gỗ** (`khung-cua-da`: hai khung chữ A, khối đá đang xẻ, lưỡi cưa thép hai cán), bốn đống **đá vụn** (`da-vun`, đi qua được), hai **đồi đá lởm chởm có vân** (cờ `stone` của `ScatterPlacement`, hình học `createStoneHill`, vật liệu `stoneHillMaterial`; `ZonePrewarm` biên dịch trước).
  - **Trạm đưa thư**: ba **bồ câu** đậu trên thanh của mỗi chuồng (thân tĩnh trong hình chuồng; đầu và mỏ là một `InstancedMesh` ở `VillageFeatures` với tâm xoay ở cổ, mỗi con gật đầu nhẹ theo nhịp riêng; "Giảm chuyển động" thì đứng yên; ẩn khi xa quá tầm vẽ đồ nhỏ); **bàn viết thư** `ban-thu` thay bàn chép: xấp bao thư buộc dây đỏ đan chữ thập có nút, hai bao thư rời (một cái có dấu sáp), lọ mực và bút lông (cao 1,1).
  - **Bảng 6 mẫu dấu**: tên người trên bảng đi qua `fmt` ({phanDien} cho nhân vật phản diện, không viết cứng); test đổi tên phản diện thì bảng đổi theo (`VillageFeatures.test.ts`).
  - **Khựng khi cảnh mở đầu hiện lần đầu (54 đến 77 ms)**: nguyên nhân thật là lần vẽ đầu của hộp thoại có `box-shadow` và `filter: blur` trên nền WebGL (ảnh truyện chỉ nặng 33 KB; giải mã sẵn ảnh không đổi gì). Sửa: (1) hộp thoại hiện trên cảnh 3D (`VnDialog flat`) không còn bóng đổ và ảnh nền làm mờ, viền ngoài `outline` 3 px màu nâu gỗ đậm để vẫn tách khỏi cảnh; (2) `scenePreload.ts` nạp và giải mã trước ảnh truyện và chân dung người dẫn khi người chơi vào vùng chuẩn bị của một làng mà cảnh mở đầu chưa xem, rồi `WorldPage` dựng một hộp thoại ẩn (`VnDialog warm`, không lấy focus, không nghe phím) 0,7 giây để vẽ sẵn; `sceneTurns.ts` dùng chung các lượt của cảnh thật và cảnh làm ấm. Áp cho mọi làng có `VILLAGE_SCENE` (Giấy, Dệt, Khắc Dấu; Bạc khi dựng).
  - **Test mới**: `craftTextures.test.ts` (toạ độ ảnh theo mét thật, ba kiểu bàn khác nhau, đồi đá, bồ câu, ánh kim chỉ của máy), `VillageFeatures.test.ts`, `sceneTurns.test.ts`, `marketGeometry.test.ts` thêm 8 loại đồ nhỏ mới, `khac-dau.test.ts` thêm cụm đá, ba kiểu bàn khắc, đồi đá có vân.

## Màn 7 — Game chính: "Khuôn riêng, mẫu chung" (trang bài học 2D)

**Dựng bằng `LessonPage2D`:**
- Nền: `scenes/bai-hoc-lang-khac-dau`.
- Bảng giữa: **dùng lại nguyên bài 3 của web 2D giai đoạn 1**, gồm 3 trạm: đóng dấu và soi dấu, hòm thư giả, đoán khóa. Tên hiển thị "Linh" đã đổi thành "Lan".
- **Trạm Khó:** dò số với p = 1.000.003 phải chia nhỏ vòng lặp (như giai đoạn 1), không làm đơ giao diện.

**Lời chú Dũng:**

| Thời điểm | Chú Dũng nói |
|---|---|
| **Đầu bài** | "Khuôn riêng cất kín, chỉ cháu biết. Mẫu công khai thì treo cho cả làng xem. Có mẫu, ai cũng kiểm được dấu thật hay giả." |
| **Trước Trạm Trung bình** | "{phanDien} vừa gửi mấy lá thư giả, còn kèm cả mẫu dấu tự làm. Nhớ chỉ tin bảng mẫu của làng thôi!" |
| **Cuối bài** | "Mất khuôn riêng là mất hết, không ai lấy lại giúp được đâu." |

## Màn 8 — Game phụ 1: "Lật thẻ tìm cặp khóa"

Logic đặt trong `memoryLogic.ts` (hàm thuần, có test).

**Câu chuyện:** chú Dũng có **bộ khuôn tập**: khuôn mẫu chú khắc cho thợ học việc luyện tay, không phải khuôn riêng thật của ai. {phanDien} trộn lung tung bộ khuôn tập này. Học sinh lật thẻ để ghép lại từng cặp khuôn và mẫu công khai của nó.

**Lưu ý về bài học:** khuôn riêng thật thì phải cất kín, mất là mất hết (câu B3-01, B3-06). Vì vậy truyện chỉ nói đây là bộ khuôn tập, không bao giờ nói kho chứa khuôn riêng của mọi người.

**Dựng bằng `Scene25D`:**
- Nền: `scenes/man-08-kho-dau`.
- Thẻ là mặt phẳng hai mặt, lật bằng xoay 180°.
- **{phanDien}:** ở vòng 3, model 3D ló ra mép phải mỗi lần tráo bài (`cheer`). Hai thẻ bị tráo có vệt sáng tím chỉ rõ.

**Thẻ:**
- Ảnh trong `ui/cards/`.
- **Thẻ khuôn** chỉ ghi "Khuôn tập: x". **Không có tên, không có chân dung.**
  - x lấy trong bộ khuôn tập `{3, 5, 6, 7, 8, 9, 10, 11, 14, 16, 18, 20}`. 12 mẫu công khai của bộ này là 10, 20, 8, 17, 16, 11, 9, 22, 13, 3, 6, 12: khác nhau hết, và không số nào trùng với chính khuôn của nó.
  - **Không dùng khóa riêng của 6 nhân vật chính** (12, 13, 15, 17, 19, 21). Ví dụ khuôn 12 của học sinh, thứ Bài 3 luôn che bằng ••, hay khuôn 15 của bác An, chính là đáp án trạm Khó.
  - Các số 3, 5, 6, 7, 9 trùng khóa của 5 người phụ là được phép: đó là số luyện tập, cần cho đủ 8 cặp ở vòng 3.
- **Thẻ mẫu công khai chỉ ghi số:** "Mẫu công khai: y". **Không có tên, không có chân dung.** Như vậy học sinh phải tính xuôi 5^x mod 23 mới ghép được, không ghép theo mặt người được.
- **Nút "Máy tính mod"** ở góc màn hình (giống màn 9): nhập x, ra 5^x mod 23.

**3 vòng:**

| Vòng | Số cặp | Lưới |
|---|---|---|
| 1 | 4 cặp | 4 × 2 |
| 2 | 6 cặp | 4 × 3 |
| 3 | 8 cặp | 4 × 4 |

Mỗi vòng chọn ngẫu nhiên các khuôn trong bộ khuôn tập.

**Lật thẻ:**
- Mỗi lượt lật 2 thẻ.
- Khớp (thẻ khuôn x với thẻ mẫu 5^x mod 23): hai thẻ mở luôn, hiện dòng "5^x mod 23 = y".
- Không khớp: úp lại sau 0,8 giây.

**{phanDien} tráo bài (chỉ vòng 3):** cứ 20 giây {phanDien} tráo chỗ 2 thẻ đang úp và chưa khớp, có hoạt cảnh chỉ rõ 2 thẻ nào. Còn dưới 2 thẻ như vậy thì bỏ qua.

**Điểm mỗi vòng** = max(0, 300 − 10 × số lần lật sai).

| Mốc | Điểm |
|---|---|
| Đồng | 300 |
| Bạc | 550 |
| Vàng | 750 |

**Điều khiển:** chạm hoặc bấm; bàn phím dùng phím mũi tên và Enter.

**Test (`memoryLogic.ts`):**

| Tình huống | Kết quả mong đợi |
|---|---|
| Tạo bộ thẻ n cặp | Có 2n thẻ; mỗi khuôn đúng 2 thẻ (một thẻ khuôn, một thẻ mẫu) |
| Cùng seed | Cùng thứ tự thẻ |
| Mọi thẻ mẫu công khai | Bằng `publicKey(khuôn)`; không chứa tên hay chân dung |
| Mọi thẻ khuôn | Số nằm trong bộ khuôn tập; không có số nào của bảng khóa thật (12, 13, 15, 17, 19, 21) |
| Trong một vòng | Các số mẫu công khai đều khác nhau |
| Điểm vòng: lật sai 3 lần / 35 lần | 270 / 0 |
| {phanDien} tráo bài | Chỉ đụng thẻ đang úp và chưa khớp |

**Đã làm (mốc 3, bước B1–B2):**
- Code ở `packages/village-lang-khac-dau/src/memory/`: `memoryConfig.ts` (`MEMORY_SPEC`, mốc `medals` truyền thẳng vào `MiniGameLevel`), `memoryLogic.ts` (luật), `memoryLayout.ts` (bố cục khung ngang và dọc), `memoryFaces.ts` (vẽ mặt thẻ), `MemoryBoard.tsx` (thẻ và {phanDien} trong Scene25D), `MemoryGame.tsx` (màn chơi), `memoryBots.ts` + `memoryBalance.test.ts`. Trang `pages/Man8.tsx`, route `man/8`. Máy tính mod dùng chung cho màn 9: `src/ui/ModCalculator.tsx`.
- `stepMemory(state, dt, { swapClock })` tính `dt` bằng ms. Mở Máy tính mod hay đang chiếu hoạt cảnh tráo thì đồng hồ tráo đứng yên (`swapClock: false`), đồng hồ úp lại 0,8 giây vẫn chạy.
- Thẻ: mặt phẳng hai mặt trong một nhóm xoay 180°. Mặt sau `ui/cards/the-mat-sau`; mặt trước lấy nền `ui/cards/the-khuon-rieng` hay `ui/cards/the-mau-cong-khai`, code vẽ khung giấy với nhãn "Khuôn tập" hay "Mẫu công khai" và số bên dưới (không tên, không chân dung). 24 mặt trước và mặt sau vẽ chung một atlas 5 × 5 (một texture). Ảnh gốc có nền trắng ở góc nên khi vẽ được cắt mép 3,5% và bo góc.
- Chữ trên thẻ ≥ 14 px trên màn hình (vẽ theo cỡ thẻ thật, vẽ lại khi cỡ thẻ đổi); "Chữ to" nhân 1,15, thẻ hẹp quá thì thu về không dưới 14 px. Đo: thẻ 82,8 px ở 360 × 640 (khung dọc 9:16), 86,6 đến 90,6 px ở 844 × 390, 170,6 đến 178,5 px ở 1366 × 768.
- Khung ngang: cột trái có nút Máy tính mod, vòng, điểm, số lần sai, dòng kết quả; {phanDien} ló ra mép phải. Khung dọc (điện thoại xoay dọc, `allowPortrait`): dải trên là thanh trên, {phanDien} ló ra ở góc dưới phải.
- Tráo bài: vệt tím (viền sáng tím bo góc phủ đúng khung thẻ, cùng tâm thẻ, rộng hơn thẻ 6% mỗi cạnh: `GLOW_SCALE` = 1,12; giữa thẻ phủ tím nhạt) hiện 1 giây ở chỗ cũ, rồi hai thẻ trượt sang chỗ mới trong 0,45 giây; lúc này chưa bấm được thẻ. {phanDien} ló ra và cười (`cheer`). "Giảm chuyển động": lật không xoay, đổi chỗ ngay sau 1 giây vệt tím, {phanDien} không ló ra.
- Bàn phím: phím mũi tên đi giữa các thẻ (viền rõ khi chọn bằng phím), Enter hay Space để lật. Mỗi thẻ có nhãn cho trình đọc màn hình ("Thẻ úp, hàng 1, cột 2" hoặc mặt thẻ khi đã mở).
- Màn kết quả: điểm = tổng 3 vòng, mỗi vòng một dòng (số lần lật sai → điểm).

**Cân bằng (300 ván mỗi bot, seed 1 đến 300, mốc 300 / 550 / 750):**

| Bot | Lật sai trung bình (vòng 1 / 2 / 3) | Điểm trung bình | Chưa đạt | Đồng | Bạc | Vàng |
|---|---|---|---|---|---|---|
| Giỏi: nhớ hết, tính đúng, để ý thẻ bị tráo | 1,92 / 3,16 / 4,52 | 804,0 (thấp nhất 780) | 0% | 0% | 0% | 100% |
| Trung bình: quên 30% thẻ đã thấy sau mỗi lượt, 15% lật nhầm thẻ bên cạnh, không để ý thẻ bị tráo | 3,40 / 7,13 / 13,35 | 661,3 (490 đến 800) | 0% | 5,3% | 90,0% | 4,7% |

Đạt tiêu chí như màn 2, 3 (bot giỏi ≥ 90% Vàng; bot trung bình Đồng hoặc Bạc ≥ 80%, Vàng dưới 10%). Màn này không có tim nên không có tỉ lệ hết tim. Hồ sơ bot trung bình là tự chọn.

## Màn 9 — Game phụ 2: "Chữa đàn gà" (bắn ná)

Logic đặt trong `chickenLogic.ts` (hàm thuần, có test).

**Câu chuyện:** {phanDien} lùa một đàn gà bệnh vào làng để phá phiên chợ. Mỗi con gà đeo một thẻ số, là mẫu công khai. Học sinh dùng ná cao su bắn **viên thuốc** đúng loại để chữa cho gà.

**Bước "Nạp đạn"** (trước mỗi đợt):
- Có 3–4 loại thuốc, mỗi loại ghi một **khuôn riêng**, ví dụ "Thuốc 3", "Thuốc 5", "Thuốc 6".
- Học sinh kéo nhãn mẫu công khai (lẫn vài nhãn nhiễu) vào đúng loại thuốc, tức là tính xuôi 5^x mod 23. Có máy tính mod để hỗ trợ.
- Nạp đúng hết thì đợt gà bắt đầu. Nạp sai thì nhãn bật ra, trừ điểm thưởng nạp.
- **Lưu ý về bài học:** game chỉ bắt tính **xuôi** (từ khuôn riêng ra mẫu công khai). Không bao giờ bắt đoán ngược, đúng như Bài 3 dạy.

**Dựng bằng `Scene25D`:**
- Nền: `scenes/man-09-duong-lang`: đường đất có 3 làn chạy từ xa về phía cổng làng ở dưới.
- **3 làn:** cấu hình bằng đoạn thẳng trên ảnh, giống màn 5. Có trang `/dev/man-09-lanes` để chỉnh.
- **Gà:** hình rời `sprites/man-09-chua-ga/ga-benh`, `ga-khoe`, `ga-trum`. Code làm gà chạy lạch bạch: nảy lên xuống, nghiêng trái phải; càng xa càng nhỏ. Thẻ số treo trên đầu gà.
- **Ná cao su:** hình rời `sprites/man-09-chua-ga/na-cao-su`, đặt giữa đáy màn hình, xoay hướng về con gà được chọn.
- **Học sinh:** model 3D đứng cạnh ná, quay người theo hướng bắn.
- **Bảng thuốc:** 3–4 nút thuốc ở cạnh dưới.

**Đợt gà:**
- Gà chạy lạch bạch từ cuối đường về phía cổng làng, theo 3 làn.
- Chọn loại thuốc: phím 1–4, hoặc chạm nút thuốc. Sau đó chạm hoặc bấm vào con gà để bắn; viên thuốc bay theo đường vòng cung.
- **Đúng thuốc** (`publicKey(khuôn của thuốc)` bằng thẻ trên gà): gà lấp lánh, đổi sang hình `ga-khoe` rồi chạy về chuồng (ở mép đường). +20.
- **Sai thuốc:** hiện "Không đúng thuốc!", gà vẫn chạy tiếp. −5.
- Gà chạy tới cổng làng: mất 1 tim.

**Ba đợt:**

| Đợt | Thuốc (khuôn riêng) | Mẫu công khai trên gà | Số gà |
|---|---|---|---|
| 1 | 3, 5, 6 | 10, 20, 8 | 8 |
| 2 | 5, 7, 9 | 20, 17, 11 | 10, chạy nhanh hơn |
| 3 | 3, 6, 7, 9 | 10, 8, 17, 11 | 12, rồi tới gà trùm |

**Gà trùm cuối đợt 3:**
- {phanDien} cưỡi con gà trùm: hình rời `ga-trum`, với model 3D {phanDien} ngồi trên yên (`idle`, thu nhỏ cho vừa).
- Gà trùm cần chữa **3 lần**; sau mỗi lần đúng, thẻ trên gà đổi sang một số khác trong bộ đã nạp.
- Chữa xong: {phanDien} ngã nhào (`hurt`), kêu "Ối!" rồi chạy mất (`run`).

**Tim, điểm:**
- 3 tim.
- Điểm = số gà chữa được × 20, trừ 5 cho mỗi phát sai, cộng 30 cho mỗi lần nạp đạn không sai, cộng 60 khi chữa xong gà trùm.

| Mốc | Điểm |
|---|---|
| Đồng | 300 |
| Bạc | 500 |
| Vàng | 700 |

**Test (`chickenLogic.ts`):**

| Tình huống | Kết quả mong đợi |
|---|---|
| `publicKey` của 3, 5, 6, 7, 9 | 10, 20, 8, 17, 11 |
| Thuốc 5 bắn gà có thẻ 20 / thẻ 8 | Chữa được / không chữa được |
| Thẻ trên gà | Chỉ lấy trong bộ mẫu công khai của đợt đã nạp |
| Gà trùm | Cần đúng 3 lần chữa |
| Gà chạy tới cổng | Mất 1 tim |
| Nạp đạn | Chỉ cho bắt đầu khi mọi nhãn đều đúng |

### Chốt cho logic (mốc 3, bước B10; code ở `packages/village-lang-khac-dau/src/chicken/`; cảnh ở bước B11 bên dưới, màn 9 đã `ready`)

`chickenConfig.ts` (số liệu, `chickenVariant` cho các phương án độ khó), `chickenLogic.ts` (hàm thuần: `createChickenGame`, `dropLabel`, `startWave`, `selectMedicine`, `shoot`, `stepChicken(s, dt)` bước cố định 1/120 giây, `tickChicken`, `chickenScore`), `chickenBots.ts` (bot cân bằng, chỉ dùng trong test), `chickenLogic.test.ts` (26 ca), `chickenBalance.test.ts` (15 ca), `index.ts`. Mẫu công khai luôn tính bằng `publicKey` của bài 3 (`lessons/bai-3/logic`), không viết lại công thức. Mọi số ngẫu nhiên từ `createMulberry32(seed)`: ba lần nạp đạn và dãy thẻ của gà trùm rút SẴN khi tạo ván; số ngẫu nhiên khi sinh gà (làn rồi thẻ, hai số mỗi con) chỉ rút lúc sinh, nên chuỗi gà không phụ thuộc người chơi bắn thế nào.

**Chốt trong lời giao B10 (spec chưa nói):**
- Làn dài 10 đơn vị (0 là cuối đường, 10 là cổng làng), 3 làn.
- Gà chạy từ 0 tới cổng: đợt 1 là 9 giây, đợt 2 là 7 giây, đợt 3 là 6 giây; gà trùm 14 giây. Nhịp sinh 1,6 / 1,3 / 1,1 giây (con đầu sau đúng một nhịp: tự chọn); không sinh vào làn có con gần cuối đường nhất còn dưới 1,5 (làn nào cũng vướng thì thử lại bước sau, không rút số ngẫu nhiên). Hết đợt khi đã sinh đủ và không còn gà thường trên đường; rồi sang nạp đạn đợt sau, hoặc gà trùm sau đợt 3.
- Bắn: chọn thuốc (mặc định thuốc 1) rồi chọn một con gà; viên thuốc LUÔN trúng con đã chọn, bay 0,4 giây, xét kết quả lúc tới (so `publicKey(khuôn của thuốc lúc bắn)` với thẻ lúc viên thuốc tới); gà đã tới cổng (hay đã được chữa) trước đó thì phát đó không tính (không trừ, không cộng; tính vào `voidShots`). Giữa hai phát tối thiểu 0,35 giây. Gà tới cổng cùng bước với viên thuốc thì cổng xét trước (phát không tính).
- Gà trùm ở làn giữa, cần chữa đúng 3 lần; mỗi lần chữa đúng không có điểm riêng (điểm tối đa 750 chỉ tính 30 gà thường) và thẻ đổi sang số KHÁC thẻ liền trước, trong bộ mẫu công khai của đợt 3 (10, 8, 17, 11); chữa đủ 3 lần thì +60 và hết ván (`complete`). Phát sai vào trùm vẫn −5 và không mất lần chữa. Trùm tới cổng mà chưa chữa xong: mất 1 tim và hết ván (`boss`, không +60). Hết tim cũng hết ván (`hearts`).
- Nạp đạn (trước mỗi đợt, không tính giờ): mỗi thuốc 1 nhãn đúng (= `publicKey` của khuôn) cùng 2 nhãn nhiễu CHO CẢ ĐỢT (không phải mỗi thuốc 2 nhãn): một nhãn BẪY bằng chính số khuôn của một thuốc trong đợt (chọn trong các khuôn không trùng mẫu công khai nào của đợt) và một nhãn là mẫu công khai của một khuôn ngoài đợt; nhãn nhiễu không trùng mẫu công khai nào của đợt và các nhãn khác nhau. Kéo nhãn vào thuốc sai (kể cả nhãn nhiễu, và nhãn đúng vào thuốc khác) thì nhãn bật ra và đợt đó mất thưởng 30; xong khi mọi nhãn đúng đã nằm đúng thuốc (nhãn nhiễu để lại khay), rồi `startWave`. Thưởng 30 cộng lúc đợt bắt đầu.
- Điểm = gà chữa được × 20 − 5 × phát sai + 30 × số đợt nạp không sai + 60 nếu chữa xong trùm; hiển thị không âm (`chickenScore`). Tối đa 30 × 20 + 3 × 30 + 60 = **750**. 3 tim.

**Test thêm so với bảng spec** (`chickenLogic.test.ts`): nhãn nạp đạn mỗi đợt (đủ nhãn đúng, đúng 1 nhãn bẫy bằng số khuôn, 1 nhãn khuôn ngoài đợt, nhãn nhiễu không trùng mẫu công khai của đợt; 500 seed); đợt chỉ bắt đầu khi mọi nhãn đúng đã nạp, nạp sai một lần thì mất thưởng 30; gà trùm đổi thẻ sau mỗi lần chữa đúng (thẻ mới khác thẻ cũ, thuộc bộ đợt 3), tới cổng thì hết ván; viên thuốc bay 0,4 giây, gà tới cổng trước thì phát đó không tính; khoảng cách tối thiểu 0,35 giây; tốc độ và nhịp sinh từng đợt đúng số chốt; cùng seed cùng ván; dt 1/30, 1/60, 1/144 cho cùng kết quả; tạm dừng không đổi gì; người chơi hoàn hảo đúng 750 điểm.

**Cân bằng (`chickenBalance.test.ts`, 300 ván mỗi bot, seed 1 đến 300, mốc 300 / 500 / 700).** Bot bắn con gà gần cổng nhất trước (không nhắm con đã có viên thuốc đang bay tới), chỉ dùng thao tác của học sinh. Bot giỏi: nghĩ 0,4 giây mỗi phát, đúng thuốc 98%, nạp không sai ở 90% số đợt. Bot trung bình: 0,8 giây, đúng 85%, nạp sai một lần ở 50% số đợt. Bot chậm (sửa sau B10): 1,2 giây, đúng 80%, nạp sai một lần ở 60% số đợt (`SLOW_BOT`).

| Bot | Chưa đạt | Đồng | Bạc | Vàng | Điểm TB (nhỏ nhất đến lớn nhất) | Tới trùm | Chữa xong trùm | Hết tim | Tim mất TB | Phát sai TB | Đợt nạp không sai TB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| lý tưởng | 0% | 0% | 0% | 100% | 750 (750 đến 750) | 100% | 100% | 0% | 0 | 0 | 3,00 |
| giỏi | 0% | 0% | 3,0% | **97,0%** | 737,4 (675 đến 750) | 100% | 100% | 0% | 0 | 0,8 | 2,71 |
| trung bình | 0% | 0% | 77,7% | 22,3% | 671,3 (590 đến 750) | 100% | 100% | 0% | 0 | 6,4 | 1,45 |
| chậm | 1,0% | 16,0% | 77,3% | 5,7% | 604,3 (200 đến 720) | **70,3%** | 70,3% | 29,7% | 1,06 | 8,0 | 1,20 |

- **Độ khó:** mục tiêu là bot giỏi Vàng ≥ 85% (mốc 700) và bot chậm tới được gà trùm ≥ 60% (assert trong test; bot trung bình chỉ in bảng, không assert ngưỡng Vàng). Luật gốc đạt cả hai (bot chậm tới trùm 70,3%), nên **không dùng phương án A, B, C** (A: gà chậm hơn 20% mọi đợt; B: A + 4 tim; C: B + nhịp sinh giãn 20%; `chickenVariant`, đã có test cấu hình). Để đối chiếu, số liệu bot chậm ở các phương án (300 ván, mốc 300 / 500 / 700): A tới trùm 92,7%, hết tim 22 ván, Vàng 6,3%; B tới trùm 98,0%, hết tim 6 ván, Vàng 6,3%; C tới trùm 99,7%, hết tim 1 ván, Vàng 6,7%; bot giỏi và bot trung bình không đổi ở mọi phương án (không bao giờ mất tim). Ván gốc dễ về sống sót với bot nhanh (không mất tim nào trong 300 ván của bot giỏi và bot trung bình), khó hơn với bot chậm (1,06 tim mất mỗi ván, 29,7% hết tim, thường ở đợt 3).
- **Mốc 300 / 500 / 700 (TẠM, chỉnh khi học sinh chơi thật), giữ đúng spec, theo nghĩa:** **Vàng 700** = chữa hết gà và gà trùm, sai rất ít (tối đa 750); **Bạc 500** = chơi hết 3 đợt (chữa hết 30 gà thường đã được 600 điểm trừ phát sai); **Đồng 300** = qua 1 đến 2 đợt (một đợt chữa hết chỉ 190 điểm, hai đợt 360 điểm). Với mốc này bot giỏi Vàng 97,0% (291 ván), bot trung bình Vàng 22,3% (67 ván), bot chậm Vàng 5,7% (17 ván), chủ yếu Bạc.
- **Vì sao không dùng mốc theo phân vị của bước B10 (650 / 690 / 710):** điểm dồn trong khoảng 600 đến 750 (ván chữa hết gà là 600 điểm cộng thưởng), nên quy tắc phân vị cho ba mốc sát nhau; em chữa hết gà mà sai 12 phát thành "chưa đạt" là sai tinh thần. Thí dụ: chữa hết 30 gà và trùm, nạp sai cả ba đợt, sai 12 phát được 600 điểm: mốc 650 / 690 / 710 cho "chưa đạt", mốc 300 / 500 / 700 cho Bạc.

**Điểm các kịch bản (`chickenBalance.test.ts`, chơi bằng đúng thao tác của học sinh, điểm tính đúng công thức, mốc 300 / 500 / 700):**

| Kịch bản | Điểm tính | Điểm | Mốc |
|---|---|---|---|
| (a) chữa hết gà và trùm, nạp đúng cả 3 đợt, sai 2 phát | 600 + 90 + 60 − 10 | 740 | **Vàng** |
| (b) chữa hết gà và trùm, nạp sai 2 đợt, sai 6 phát | 600 + 30 + 60 − 30 | 660 | **Bạc** |
| (b2) chữa hết gà và trùm, nạp đúng, sai 12 phát | 600 + 90 + 60 − 60 | 690 | Bạc |
| (b3) chữa hết gà và trùm, nạp sai cả 3 đợt, sai 12 phát (xấu nhất khi chữa xong trùm) | 600 + 0 + 60 − 60 | 600 | Bạc (mốc cũ 650: chưa đạt) |
| (c) hết tim giữa đợt 3, hai đợt đầu chữa hết, nạp đúng cả ba đợt, chữa 3 gà đợt 3 rồi 3 gà tới cổng | 360 + 90 + 60 | 510 | **Bạc** |
| (c2) hết tim giữa đợt 3, nạp sai cả ba đợt, sai 8 phát, chưa chữa gà nào ở đợt 3 | 360 − 40 | 320 | **Đồng** |
| (d) hết tim ở đợt 1 (nhiều nhất chữa 5 gà trước khi 3 gà tới cổng) | 5 × 20 + 30 | 130 | **chưa đạt** |
| (d2) hết tim ở đợt 1, chưa chữa gà nào | 0 + 30 | 30 | chưa đạt |

Hết tim giữa đợt 3 thì **Bạc hoặc Đồng tùy điểm**: từ 500 trở lên khi hai đợt đầu chữa hết, nạp đúng và chữa thêm vài gà ở đợt 3 (kịch bản c: 510); dưới 500 khi nạp sai và sai nhiều phát (kịch bản c2: 320). Hai đợt đầu chữa hết mà sai dưới 12 phát thì không dưới Đồng (360 − 5 × 11 = 305).

### Cảnh màn 9 (mốc 3, bước B11; code ở `packages/village-lang-khac-dau/src/chicken/`)

Dùng lại logic B10 nguyên vẹn (không sửa luật). File: `man09Lanes.ts` (+ test), `DevMan09Lanes.tsx` (trang `/dev/man-09-lanes`, chỉ khi chạy dev, vỏ Làng Khắc Dấu cổng 5176), `chickenLayout.ts` (+ test, hàm thuần), `chickenArt.ts` (nạp hình rời, tia lấp lánh và viên thuốc vẽ bằng canvas), `ChickenStage.tsx` (cảnh Scene25D, pool, không cấp phát trong `useFrame`), `ChickenLoad.tsx` (bước nạp đạn), `ChickenGame.tsx` (vòng lặp, thẻ số, bảng thuốc, HUD, điều khiển), `chickenHint.ts` (+ test), `pages/Man9.tsx`, route `man/9`. Máy tính mod dùng lại `ui/ModCalculator.tsx`.

- **Ba làn** (`MAN09_LANES`, tọa độ chuẩn hóa của ảnh `scenes/man-09-duong-lang`, đo trên ảnh): làn 1 từ (0,55; 0,30) xuống (0,25; 0,69), làn 2 từ (0,654; 0,30) xuống (0,41; 0,70), làn 3 từ (0,748; 0,30) xuống (0,60; 0,69); mỗi làn có thêm nửa bề rộng ở hai đầu để vẽ hình thang. Ba dải đường tỏa ra phía người xem nên gà chạy chếch xuống bên trái; hình gà gốc quay sang phải nên cảnh lật lại. Gà nhỏ 0,38 ở cuối đường, cỡ đầy đủ ở cuối làn. Chuồng gà là cái chòi tre ở mép trái đường (`COOP_POINT`).
- **Bố cục** (test `chickenLayout.test.ts` ở 640×360, 844×390, 1366×768, 1024×768): ná cao su ở giữa đáy khung (xoay tối đa ±0,6 rad về con gà được chọn, di chuột lên gà cũng xoay), học sinh đứng bên phải ná (cách 2,3 đơn vị), bảng thuốc 3 hoặc 4 nút ở góc dưới trái (mỗi nút 60 × 58 điểm ảnh), HUD ở góc trên trái (250 × 64). Không đồ nào chồng lên nửa dưới ba làn (từ giữa làn tới cổng, kể cả thân gà và thẻ số trên đầu) và không chồng lên nhau. Chữ thẻ số trên gà cỡ theo gà trên màn hình, kẹp 14 đến 30 điểm ảnh (không dưới 14 ở mọi chỗ gà đứng, "Chữ to" nhân 1,15). Khung dọc: nhắc "Xoay ngang để chơi" như màn 5 (không `allowPortrait`).
- **Nạp đạn** (`ChickenLoad.tsx`): lọ "Thuốc x" kèm màu và số phím 1 đến 4; khay nhãn gồm nhãn đúng và 2 nhãn nhiễu của logic. Kéo thả bằng con trỏ (chuột và cảm ứng), hoặc chạm nhãn rồi chạm lọ, hoặc Tab chọn nhãn rồi nhấn phím 1 đến 4. Nạp sai: nhãn bay về khay (không bay khi "Giảm chuyển động", chỉ rung) và hiện "Chưa đúng: 5^^x^^ mod 23 của thuốc này không ra số đó". Nút "Bắt đầu đợt n" chỉ mở khi mọi lọ đã đủ nhãn. Nút Máy tính mod ở góc trên (lệch trái nút "?").
- **Đợt gà**: gà chạy nảy và nghiêng (không nảy, không nghiêng khi "Giảm chuyển động"; gà vẫn chạy vì đó là luật chơi), thẻ số HTML treo trên đầu gà. Chọn thuốc: phím 1 đến 4 hoặc chạm nút thuốc (thuốc đang chọn viền vàng dày). Bắn: bấm hay chạm vào con gà (nhận ngay ở `pointerdown`), hoặc mũi tên trái phải chọn gà (thẻ viền vàng và vòng sáng dưới chân) rồi Enter hay Space. Viên thuốc bay vòng cung 0,4 giây (bay thẳng khi "Giảm chuyển động"), học sinh quay người và chỉ về phía gà. Đúng thuốc: lấp lánh, đổi sang `ga-khoe` (to bằng gà thường, thu nhỏ 0,8), chạy về chuồng rồi mờ dần; sai: "Không đúng thuốc!" trên đầu gà. Gà lọt qua cổng: gà chạy tiếp rồi mờ dần, mất 1 tim.
- **Gà trùm**: `ga-trum` ở làn giữa với {phanDien} (model `ti`, `idle`, thu nhỏ còn 0,42 chiều cao gà) đứng trên yên, đi theo gà trùm (cùng độ nảy); thẻ đổi số sau mỗi lần chữa đúng kèm lấp lánh. Chữa xong lần thứ ba: gà trùm hóa `ga-khoe` chạy về chuồng, {phanDien} rơi từ yên xuống đất (0,35 giây), `hurt`, hiện "Ối!" (1,1 giây), rồi `run` chạy lên cuối đường (1,5 giây); bảng kết thúc hiện sau 3 giây. Gà trùm tới cổng hay hết tim: bảng kết thúc sau 0,9 giây.
- **Hướng dẫn và nút "?"** (luật chung, spec 03 mục 3.8 và 6): phần `man-9` ở `content/huongDanGame.ts` (4 luật, cách điều khiển, 4 trang với 5 hình vẽ trong `GuideArt.tsx`: `nap-nhan`, `nhan-bay`, `ban-ga-phim`, `ban-ga-cham`, `ga-trum`; 7 câu nhắc), thêm vào CUỐI `GUIDE_SECTIONS`. `hintFor` trả khóa, KHÔNG lộ thuốc nào chữa thẻ nào, không nói số cụ thể nào ngoài công thức. Hộp "?" tạm dừng thật (gà, viên thuốc, nhịp sinh, hoạt cảnh đứng yên). Màn kết quả: màn cuối của làng nên chỉ có "Chơi lại" và "Về làng"; hiện số gà chữa, số phát sai, số đợt nạp đúng, đã chữa gà trùm chưa.
- **Mở khóa**: màn 9 `ready`; Trang Sổ Vàng 3 trao sau khi chơi màn 9 (màn cuối đã ra mắt của làng), không còn sau màn 8. Tài khoản đã có trang 3 từ trước giữ nguyên (test `unlock.test.ts`). Biển màn 9 của làng tối giản mở được sau khi chơi màn 8 (test `minimal.test.ts`).
- **Chữ**: `chickenUi` ở `content/games.ts`. Câu nhắc "nạp đạn" viết "Dùng Máy tính mod để tính nếu cần" thay vì "Tính bằng Máy tính mod nếu cần" của lời giao (tự chọn: test `huongDanGame.test.ts` cấm chuỗi "Tí" trong chữ hướng dẫn và "Tính" bắt đầu bằng "Tí").

**Tự chọn của bước B11 (spec chưa nói):** hình gà lật cho quay sang trái theo hướng chạy; gà khỏe chạy về cái chòi tre ở mép trái đường; cỡ gà thường cao 2,3 đơn vị ở cuối làn và gà trùm 3,3; nhịp lạch bạch 11 rad/giây, nảy 6% chiều cao gà, nghiêng 0,1 rad; viên thuốc có màu theo loại thuốc (đỏ, xanh dương, xanh lá, vàng; luôn kèm chữ "Thuốc x"); di chuột lên gà cũng xoay ná và đặt vòng sáng; bảng thuốc hiện nhãn đã nạp trong mỗi nút; ván tua (`window.__chickenSim`) chỉ có khi chạy dev hay build có `VITE_PROBE`.

## Kết thúc làng

- Chú Dũng trao **Trang Sổ Vàng thứ ba**.
- Chú Dũng: "Không giả dấu được nữa, {phanDien} chuyển sang trò trộn giao dịch ở Làng Bạc rồi."

## Checklist nghiệm thu

- [ ] Test Bài 3 (giai đoạn 1), `memoryLogic` và `chickenLogic` đều ✅.
- [ ] Màn 7: máy soi dấu chỉ đúng người đã đóng dấu; dò số với p = 1.000.003 không làm đơ giao diện.
- [ ] Màn 8: {phanDien} tráo bài có hoạt cảnh rõ ràng, không bao giờ đụng thẻ đã khớp.
  - [x] **luật chung (bước HD, spec 03 mục 3.8 và 6):** có phần hướng dẫn riêng mở từ thẻ bắt đầu; nút "?" (phím H) trong lúc chơi với `hintFor(state)` không lộ đáp án và tạm dừng thật; nút "Chơi tiếp" ở màn kết quả (hết màn trong làng thì "Về làng"). (đã làm ở bước HD: phần `man-8`, `memoryHint.ts`, "Chơi tiếp" không có vì làng chưa có màn sau.)
- [x] Màn 9 (bước B11):
  - [x] nạp đạn chỉ tính xuôi;
  - [x] bắn đúng thuốc thì gà khỏi bệnh chạy về chuồng;
  - [x] gà trùm có {phanDien} cưỡi.
  - [x] **luật chung (bước HD, spec 03 mục 3.8 và 6):** có phần hướng dẫn riêng mở từ thẻ bắt đầu; nút "?" (phím H) trong lúc chơi với `hintFor(state)` không lộ đáp án và tạm dừng thật; nút "Chơi tiếp" ở màn kết quả (hết màn trong làng thì "Về làng").
- [x] Xong màn 9: nhận Trang Sổ Vàng; cổng Làng Bạc mở (test `unlock.test.ts`).

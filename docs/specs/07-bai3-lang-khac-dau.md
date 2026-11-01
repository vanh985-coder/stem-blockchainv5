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
- **Làm đẹp bước L4 (chỉ hình ảnh, cảnh mở đầu và test; bố cục khu, vị trí thẻ, đường, luật không đổi; ảnh trước/sau ở `docs/screenshots/l4/`; số đo ở spec 03 mục 9, phần "Làng Khắc Dấu, bước L4"):**
  - **Máy soi dấu**: thân trụ nằm ngang mui tròn đúc từ đường viền (`ExtrudeGeometry` vát cạnh), đồng ánh kim, hai đai đồng sẫm vòng quanh thân có hàng đinh tán (28 đinh), khung khe nhận thư có bốn đinh, đĩa đỡ sau từng bánh răng, ống dẫn cong (`TubeGeometry`) và bình có nắp trên mui. Bánh răng cũng là đồng (không còn đồng thau vàng). Vật liệu: vân mài và loang oxy hóa (`craftTextures.ts`, texture `copper`), kim loại 0,55 ở mức Vừa và Cao. ÁNH KIM được NƯỚNG vào màu theo đỉnh (`copperBake.ts`: nhân màu mỗi đỉnh với độ sáng của một bầu trời giả theo pháp tuyến, trời sáng ở trên, đất sẫm ở dưới, thêm một vệt nắng), nên vật liệu vẫn là vật liệu chuẩn có texture và màu theo đỉnh, dùng chung chương trình shader với các đồ nhỏ khác. Hai cách khác đã thử và bỏ vì làm khựng (đo trên bản build): `material.envMap` (three đổi bản đồ sang PMREM ngay lần dùng đầu tiên trên luồng chính: một khung 380 đến 400 ms ở mức Vừa và Cao) và phản chiếu giả tính trong bộ đổ bóng mảnh (hai chương trình shader mới cho thân máy và bánh răng: biên dịch 125 đến 215 ms và một khung 145 đến 166 ms khi bánh răng vào cảnh). Không đặt `scene.environment`; mọi đồ khác không kim loại và không bản đồ môi trường (có test). Đổi lại ánh kim cố định theo hướng của vật chứ không theo góc nhìn. Mức Thấp: chỉ màu đồng (có nướng) và kim loại 0,18, nền phát sáng nhẹ. "Giảm chuyển động" và việc ẩn theo tầm vẽ đồ nhỏ giữ nguyên.
  - **Bệ đá của máy** tách thành vật riêng `de-may` (hai bậc, vật liệu đá phẳng như trước L4, không kim loại, không vật cản riêng); thân máy giữ đĩa mỏng nằm trong bệ để khung bao khớp vật cản tròn bán kính 1,75.
  - **Xưởng khắc dấu**: mái che có vân rơm (texture `thatch`) và hàng bó tranh xòe xuống mép mái (hai màu, dài ngắn khác nhau theo rng cố định), nắp đỉnh sẫm; **bàn đá khắc** `ban-khac` / `ban-khac2` / `ban-khac3` (ba kiểu xếp dụng cụ khác nhau theo rng cố định: con dấu đang khắc có hoa văn nổi, đục, búa gỗ, khay mực đỏ, vụn gỗ, một hai con dấu đã khắc xong; cao 1,05), luân phiên dưới hai mái che và ở sân máy; hai **giá gỗ bày con dấu đã khắc xong** (`gia-dau`); phôi gỗ có vân gỗ (texture `wood`).
  - **Đá**: mọi `khoi-da`, `ban-da`, `phien-da` và các đồ đá mới dùng vân đá (texture `stone`, gần trắng, nhân với màu vật liệu hay màu theo đỉnh nên vẫn là đá xám, ấm, lạnh, cát); đá ven sông và đá viền sân gạch cũng có vân đá. Toạ độ ảnh đặt theo mét thật (`applyBoxUV`) nên mật độ vân đều trên mọi bộ phận. Bãi đá: đá xếp thành CỤM (mỗi cụm một khối to và vài khối nhỏ sát nhau, năm sắc đá xen kẽ, 18 khối từ 0,6 tới 2,6), hai chồng **khối đá vuông đã xẻ** (`da-xe`), **khung cưa đá bằng gỗ** (`khung-cua-da`: hai khung chữ A, khối đá đang xẻ, lưỡi cưa thép hai cán), bốn đống **đá vụn** (`da-vun`, đi qua được), hai **đồi đá lởm chởm có vân** (cờ `stone` của `ScatterPlacement`, hình học `createStoneHill`, vật liệu `stoneHillMaterial`; `ZonePrewarm` biên dịch trước).
  - **Trạm đưa thư**: ba **bồ câu** đậu trên thanh của mỗi chuồng (thân tĩnh trong hình chuồng; đầu và mỏ là một `InstancedMesh` ở `VillageFeatures` với tâm xoay ở cổ, mỗi con gật đầu nhẹ theo nhịp riêng; "Giảm chuyển động" thì đứng yên; ẩn khi xa quá tầm vẽ đồ nhỏ); **bàn viết thư** `ban-thu` thay bàn chép: xấp bao thư buộc dây đỏ đan chữ thập có nút, hai bao thư rời (một cái có dấu sáp), lọ mực và bút lông (cao 1,1).
  - **Bảng 6 mẫu dấu**: tên người trên bảng đi qua `fmt` ({phanDien} cho nhân vật phản diện, không viết cứng); test đổi tên phản diện thì bảng đổi theo (`VillageFeatures.test.ts`).
  - **Khựng khi cảnh mở đầu hiện lần đầu (54 đến 77 ms ở Khắc Dấu, 120 đến 185 ms ở Dệt khi đo lại)**: nguyên nhân thật là lần vẽ đầu của hộp thoại có `box-shadow` và `filter: blur` trên nền WebGL (ảnh truyện chỉ nặng 33 KB; giải mã sẵn ảnh không đổi gì). Sửa: (1) hộp thoại hiện trên cảnh 3D (`VnDialog flat`) không còn bóng đổ và ảnh nền làm mờ, viền ngoài `outline` 3 px màu nâu gỗ đậm để vẫn tách khỏi cảnh; (2) `scenePreload.ts` nạp và giải mã trước ảnh truyện và chân dung người dẫn khi người chơi vào vùng chuẩn bị của một làng mà cảnh mở đầu chưa xem, rồi `WorldPage` dựng một hộp thoại ẩn (`VnDialog warm`, không lấy focus, không nghe phím) 0,7 giây để vẽ sẵn; `sceneTurns.ts` dùng chung các lượt của cảnh thật và cảnh làm ấm. Áp cho mọi làng có `VILLAGE_SCENE` (Giấy, Dệt, Khắc Dấu; Bạc khi dựng).
  - **Giữ ngân sách khựng khi vùng làng dựng** (các việc tìm ra khi đo, đều có trong số liệu ở spec 03): (1) texture vân tranh vẽ từng nét một mất 120 đến 180 ms trên luồng chính: gom nét theo màu và độ đậm rồi vẽ một lần (`drawThatch`); (2) bánh răng là mesh thường có màu theo đỉnh và texture, một chương trình shader riêng: `gearMaterial` dùng chung giữa `VillageFeatures` và `ZonePrewarm` (cờ `plain`), biên dịch trước (trước đó một khung 130 đến 145 ms khi bánh răng vào cảnh); (3) hình học đồ nhỏ do bước chuẩn bị dựng sẵn được vùng làng dùng lại (`acquireCraftGeometry` / `releaseCraftGeometry`, đếm tham chiếu) thay vì dựng lần hai ở khung dựng vùng; (4) \`MarketProps\` của vùng làng thêm 6 loại đồ nhỏ mỗi khung hình thay vì cả 40 loại một lúc; (5) gộp các biến thể vật liệu có texture để dùng chung chương trình shader (bàn đá thường có màu theo đỉnh trắng, đá vụn bỏ \`flatShading\`, viền sân \`flatShading\`): còn ba chương trình có texture thay vì năm.
  - **Test mới**: `craftTextures.test.ts` (toạ độ ảnh theo mét thật, ba kiểu bàn khác nhau, đồi đá, bồ câu, ánh kim chỉ của máy và dùng chung chương trình shader, ánh kim nướng vào màu đỉnh), `VillageFeatures.test.ts`, `sceneTurns.test.ts`, `marketGeometry.test.ts` thêm 9 loại đồ nhỏ mới, `khac-dau.test.ts` thêm cụm đá, ba kiểu bàn khắc, đồi đá có vân.

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

## Màn 9 — Game phụ 2: "Bắn trứng khắc dấu" (bắn trứng kiểu Bubble Shooter)

Thay game cũ "Chữa đàn gà" (bắn ná). Giữ nguyên: id màn (9), route `man/9`, khung `MiniGameLevel` (thẻ bắt đầu, nút "Hướng dẫn chơi", nút "?" tạm dừng thật, màn kết quả, ghi tiến độ), nút Tự hoàn thành cả màn, Trang Sổ Vàng thứ 3 (trao sau khi chơi màn 9). Code: `packages/village-lang-khac-dau/src/bubble/`. Vẽ bằng **canvas 2D, không three.js**.

**Câu chuyện:** {phanDien} trộn trứng gà bệnh khắc dấu giả vào ổ trứng của làng. Em nạp đúng trứng khắc **mẫu công khai**, rồi bắn gom các trứng cùng mẫu cho vỡ. Bài học giữ nguyên: chỉ tính **xuôi** (khóa riêng x ra mẫu công khai 5^x mod 23, luôn gọi `publicKey` của `lessons/bai-3/logic`), không bao giờ bắt đoán ngược.

### Luật

1. **3 đợt.** Đợt 1: 3 khóa riêng, bàn 5 hàng; đợt 2: 4 khóa, 7 hàng; đợt 3: 5 khóa, 8 hàng. Bàn lưới lục giác rộng 10 trứng (hàng lẻ 9).
2. **Nạp trứng** (trước mỗi đợt, không tính giờ): hiện các khóa riêng của đợt. Khay có các trứng ghi mẫu công khai đúng (mỗi khóa một trứng) và 3 trứng nhiễu: 1 trứng ghi chính số khóa riêng, 2 trứng ghi mẫu công khai của khóa ngoài đợt; nhiễu không trùng mẫu đúng, các số trong khay khác nhau. Em bấm chọn trứng: đúng thì trứng bay vào máy bắn, sai thì bật ra và đợt đó mất thưởng nạp. Có Máy tính mod dùng chung (màn 8). Chọn đủ trứng đúng thì bấm "Bắt đầu đợt".
3. **Bàn:** mỗi trứng mang một mẫu công khai của đợt. Mỗi số một màu cố định và chữ số luôn hiện rõ (không phân biệt chỉ bằng màu).
4. **Bắn:** em PHẢI chọn loại trứng trong máy bắn mới bắn được (bấm trứng ở khay cạnh máy bắn, hoặc phím 1 đến 5); ban đầu chưa chọn thì nút "Bắn" khóa và có lời nhắc. Lựa chọn giữ nguyên sau mỗi phát; loại không còn trên bàn thì mờ, không chọn được (đang chọn mà hết loại đó thì bỏ chọn). Ngắm: PC rê chuột rồi bấm, hoặc phím mũi tên trái phải và Space/Enter; điện thoại kéo ngón tay để ngắm, thả tay để bắn. Góc giới hạn 12° đến 168° (90° là thẳng lên). Có vạch ngắm nét đứt tới lần nảy tường đầu tiên.
5. Trứng nảy tường trái/phải, dính vào ô lưới gần nhất khi chạm trứng khác hoặc trần. Từ 3 trứng cùng số liền nhau trở lên thì vỡ; trứng không còn nối với trần thì rơi.
6. Cứ **12 phát (đợt 3: 10 phát)** cả bàn hạ 1 hàng. Trứng chạm dây giới hạn: mất 1 tim, xóa 2 hàng dưới cùng, chơi tiếp. 3 tim cho cả ván; hết tim thì hết ván. Sạch bàn thì sang đợt sau (nạp trứng đợt kế); xong đợt 3 thì thắng.
7. **Điểm** = trứng vỡ × 10 + trứng rơi × 20 + 30 mỗi đợt nạp không sai + 100 mỗi đợt xong + tim còn × 50 (cộng lúc hết ván). **Chỉ trứng có sẵn trên bàn lúc bắt đầu đợt mới được tính** khi vỡ hay rơi; trứng em bắn KHÔNG BAO GIỜ được tính (kể cả khi vỡ cùng cụm hay rơi sau đó), và trứng bị xóa khi mất tim cũng không tính. Bắn thừa vì thế không bao giờ tăng điểm.
8. **Tạm dừng thật** khi mở "?", câu nhắc và hướng dẫn (trứng bay, hiệu ứng đứng yên). `hintFor` chỉ trả khóa câu nhắc, không lộ trứng nào đúng hay chỗ nên bắn.

### Mốc điểm (TẠM, chỉnh khi học sinh chơi thật)

| Mốc | Điểm | Nghĩa |
|---|---|---|
| Đồng | 1600 | qua được khoảng hai đợt |
| Bạc | 2450 | xong cả 3 đợt nhưng mất vài tim hay sót nhiều trứng |
| Vàng | 2750 | xong cả 3 đợt gọn, còn tim |

Đặt theo quy tắc phân vị bot (`bubbleBalance.test.ts`): Vàng 2750 ở dưới phân vị 5% của bot giỏi (bot giỏi Vàng 96,7%); Bạc 2450 gần phân vị 15% của bot trung bình; Đồng 1600 gần phân vị 1% của bot trung bình (và trên đa số ván bot yếu). Điểm tối đa lý thuyết (`bubbleMaxScore`, mọi trứng có sẵn đều rơi) là 4.360, nên điểm cũ của game gà (tối đa 750) nằm trong thang mới; điểm lưu vượt số này mới hiện "Kỷ lục từ phiên bản trước" (prop `maxScore` của `MiniGameLevel`).

### Cấu hình độ khó (điều chỉnh sau lần đầu; luật giữ nguyên)

Lần đầu bot trung bình hết tim 98,7% vì điểm tăng theo số phát bắn (trứng em bắn từng được tính điểm khi vỡ), nên không thể vừa để bot trung bình qua được ván vừa giữ điểm của họ dưới bot giỏi. Đã sửa cách đếm điểm (mục luật 7) và nới cấu hình:

| Số | Cũ | Mới |
|---|---|---|
| Dây giới hạn (hàng đầu chạm dây, tính từ tấm trần) | 10 | **13** |
| Số phát mỗi lần hạ bàn (đợt 1 / 2 / 3) | 8 / 8 / 6 | **12 / 12 / 10** |
| Số hàng đầu đợt, số khóa mỗi đợt | 5 / 7 / 8, 3 / 4 / 5 | giữ nguyên |

Các cấu hình đã thử (cách đếm điểm mới, bot trung bình hồ sơ mới trừ khi ghi khác; hết tim, tim mất TB): dây 13, 12/12/10: 1% / 0,01 (bot giỏi); dây 14, 12/12/10: bot trung bình hết tim 2%, Vàng khoảng 25%; dây 12, 12/12/10: hết tim 6%. Chọn dây 13 với bot trung bình có thêm lỗi (bên dưới) cho hết tim 15%, Vàng dưới 25%.

### Bot và cân bằng (`bubbleBalance.test.ts`, 300 ván mỗi bot, seed 1 đến 300, chỉ dùng thao tác của học sinh)

Bot chọn trứng ở khay nạp, chọn loại trứng, chọn góc bắn (dò mọi góc, chọn phát cho nhiều điểm nhất). **Hồ sơ bot:**

| Bot | Nạp sai | Bước dò góc | Lệch tay | Bắn ẩu | Chọn loại bừa |
|---|---|---|---|---|---|
| Giỏi | 10% số đợt | 2° | 0,4° | 2% | 0% |
| Trung bình (MỚI) | 50% | 3° | 2° | 12% | 8% |
| Trung bình (cũ) | 50% | 4° | 2° | 20% | 12% |
| Yếu | 70% | 5° | 3° | 35% | 20% |

Hồ sơ trung bình mới ít bắn bừa hơn (bắn ẩu 20% → 12%, chọn loại bừa 12% → 8%, dò góc mịn hơn).

| Bot | Điểm TB (nhỏ nhất đến lớn nhất) | Chưa đạt | Đồng | Bạc | Vàng | Hết tim | Tim mất TB | Phát bắn TB | Đợt xong TB |
|---|---|---|---|---|---|---|---|---|---|
| Giỏi (trước) | 2960 (2260 đến 3230) | 0% | 0% | 4,7% | 95,3% | 1,7% | 0,71 | 88,9 | 2,98 |
| Giỏi (sau) | 2858 (2690 đến 3100) | 0% | 0% | 3,3% | **96,7%** | **0%** | 0,01 | 94,8 | 3,00 |
| Trung bình (trước) | 2260 (980 đến 3580) | 2,7% | 33,0% | 52,0% | 12,3% | 98,7% | 2,98 | 111,1 | 1,74 |
| Trung bình (sau) | 2595 (1310 đến 2880) | 0,3% | 14,7% | 69,3% | **15,7%** | **15,0%** | 1,02 | 201,2 | 2,85 |
| Yếu (sau) | 1559 (570 đến 2520) | 45,7% | 53,3% | 1,0% | 0% | 99,0% | 2,98 | 209,9 | 1,59 |

Đạt mục tiêu: bot giỏi Vàng ≥ 90% (96,7%) và hết tim ≤ 2% (0%); bot trung bình hết tim ≤ 40% (15%), Đồng + Bạc ≥ 70% (84,0%), Vàng < 25% (15,7%). Test assert các điều này. Đổi cấu hình thì chạy lại và cập nhật số.

### Bố cục (`bubbleLayout.ts`, hàm thuần có test)

- **PC ngang** (rộng ≥ 1,1 lần cao): nền phủ cả màn; ba cột. Giữa: bàn trứng khoảng 44% chiều rộng, có khung viền, máy bắn ở đáy giữa của khung, khay chọn loại trứng và nút "Bắn" ngay dưới khung (cạnh máy bắn). Trái: các khóa riêng của đợt và Máy tính mod (luôn hiện). Phải: tim, đợt, điểm, số phát còn lại trước lần hạ bàn, số trứng còn, chân dung {phanDien}, nút "Hướng dẫn" (chừa chỗ cho nút "?" của khung).
- **Điện thoại dọc**: bàn rộng hết màn (96% ở 360×800), dải trên (HUD, nút Hướng dẫn, Máy tính mod), dải dưới (khóa riêng, {phanDien}); điện thoại ngang dùng khung ngang. Nút ≥ 44 px; số trên trứng ≥ 14 px (kiểm ở 360×800).

### Đồ họa

Vẽ bằng code (không dùng three.js): trứng oval có bóng mềm, dấu khắc tròn kiểu đóng dấu (vòng đôi), số ở giữa viền trắng; màu theo số (góc màu theo tỉ lệ vàng); máy bắn, khung bàn, tấm trần, dây giới hạn đỏ nét đứt, vạch ngắm, hiệu ứng vỡ (to ra, mờ dần, vòng sáng) và rơi (rơi và xoay) đều có hình thay thế bằng code. Nền tạm là dải màu ấm. Mỗi hình thử tải từ manifest trước (`sprites/man-09-ban-trung/...`), thiếu thì dùng hình code, không lỗi trang. Chủ dự án có thể vẽ thêm theo bảng sau (đặt ở `assets/sprites/man-09-ban-trung/`, rồi `pnpm assets:build`):

#### Đồ họa cần tạo

| Tên file (không đuôi) | Kích thước | Nền | Mô tả |
|---|---|---|---|
| `nen-pc` | 1920×1080 | KHÔNG trong suốt | Nền ngang phủ cả màn, vibe Làng Khắc Dấu: sân đình ấm, mái ngói, ổ rơm và trứng, dải màu cam vàng nâu; tối và nhạt vừa phải để bàn trứng ở giữa nổi bật; không chữ, không số. Giữa ảnh (khoảng 40% chiều rộng) để thoáng. |
| `khung-ban` | 920×1100 | Trong suốt | Khung bàn trứng: viền gỗ nâu dày bo góc, bên trong nền giấy ấm nhạt (hơi trong), phía trên là tấm trần gỗ. Tỉ lệ khung chơi 10 : 11,9; code vẽ tấm trần hạ dần và dây giới hạn đè lên. Không chữ. |
| `trung-1` đến `trung-7` | 128×128 mỗi ảnh | Trong suốt | Bảy quả trứng, mỗi quả một màu khác nhau (đỏ, cam, vàng, xanh lá, xanh dương, tím, hồng), hình trứng oval hơi thon ở đỉnh, có bóng sáng, bóng mềm dưới đáy, chiếm khoảng 88% ảnh; ở giữa có dấu khắc tròn kiểu đóng dấu (vòng đôi nhạt) để code vẽ số lên; KHÔNG có số, KHÔNG có chữ. Code dùng ảnh `trung-(số mod 7 + 1)`. |
| `may-ban` | 256×320 | Trong suốt | Máy bắn trứng bằng gỗ: nòng hướng thẳng LÊN, đế tròn ở dưới; tâm xoay ở khoảng 62% chiều cao tính từ trên xuống, chính giữa chiều ngang. Không chữ. |
| `trung-vo` | 256×256 | Trong suốt | Hiệu ứng trứng vỡ: vỏ văng ra bốn phía, chút lòng trứng, tâm ảnh là chỗ trứng vỡ. Không chữ. |

### Hướng dẫn và nút "?"

- Hướng dẫn chơi (`content/huongDanGame.ts`, mục 9; không đổi thứ tự hay xóa mục trong `GUIDE_SECTIONS`): 4 luật, cách điều khiển máy tính và điện thoại, 4 trang với 5 hình vẽ code trong `GuideArt.tsx` (`nap-trung`, `chon-trung-may`, `ngam-phim`, `ngam-cham`, `ha-ban`), 7 câu nhắc (`napDan`, `napXong`, `chuaChon`, `ngamBan`, `sapHa`, `motTim`, `hetVan`).
- **Hướng dẫn P8** (`TutorialSpotlight` bản gọn, `tutorialTexts.man9`; tự mở ở ván đầu, mở lại bằng nút "💡 Hướng dẫn"): giới thiệu → chọn 1 trứng đúng ở khay nạp → chọn trứng ở máy bắn → ngắm → bắn thử 1 phát trên bàn mẫu nhỏ (1 khóa, 2 hàng trứng cùng số, không hạ bàn). Dữ liệu riêng (`PRACTICE_SPEC`), không cộng điểm hay tiến độ, ván thật chưa bị đụng tới.

### Test

`bubbleLogic.test.ts` (29 ca: `publicKey` của 3, 5, 6, 7, 9 là 10, 20, 8, 17, 11; khay nạp 500 seed; chọn sai/đúng; chỉ vào đợt khi nạp đủ; bàn 5/7/8 hàng và độ rộng hàng; chưa chọn loại thì không bắn; loại hết thì không chọn; góc kẹp 12° đến 168°; nảy tường; dính ô; vỡ từ 3 trứng; trứng rơi; hạ bàn sau 12/12/10 phát; chạm dây mất tim và dọn 2 hàng; hết tim; sạch bàn sang đợt sau và thắng; công thức điểm; cùng seed cùng ván), `bubbleHint.test.ts`, `bubbleLayout.test.ts`, `bubbleBalance.test.ts`. Kiểm bằng Chrome thật: `scripts/man9-bubble-check.mjs` (chuột 1366×768 và 1920×1080, chạm 360×800; nạp sai/đúng, chưa chọn thì không bắn, nổ cụm, trứng rơi, hạ bàn, mất tim, "?" dừng, hướng dẫn làm thử, tự hoàn thành); ảnh ở `docs/screenshots/man9-bubble/`.

### Tự chọn (spec và lời giao chưa nói)

- **Hạ bàn là tấm trần cùng đàn trứng hạ xuống 1 hàng, KHÔNG thêm trứng mới.** (Thử chèn hàng mới thì ván không kết thúc: bot giỏi bắn hơn 300 phát mỗi ván.) Ván hữu hạn; trứng tiến dần tới dây giới hạn.
- **Dây giới hạn nằm ở mép trên của hàng 13** (tính từ tấm trần chưa hạ; hàng 0 là hàng đầu). Trứng nằm ở hàng 13 trở xuống là chạm dây. Chạm dây thì xóa 2 hàng dưới cùng (lặp tới khi hết trứng chạm dây, vẫn chỉ mất 1 tim).
- Trứng em bắn KHÔNG BAO GIỜ được tính điểm (vỡ hay rơi); chỉ trứng có sẵn lúc bắt đầu đợt được tính (`BubbleState.mine` ghi các ô giữ trứng của em). Nếu tính thì bắn thừa tăng điểm, bot trung bình cao điểm hơn bot giỏi.
- Khóa riêng mỗi đợt rút trong 2 đến 15 (mẫu công khai khác nhau vì 5 là căn nguyên thủy mod 23). Trứng nhiễu "ghi chính số khóa riêng" chọn trong các khóa của đợt sao cho số đó không trùng mẫu đúng nào.
- Bàn đầu đợt sinh có kiểm để hầu như không có sẵn cụm 3 trứng cùng số (dưới 10% số trứng nằm trong cụm); hết lựa chọn thì rút tùy ý.
- Va chạm: trứng bay dừng khi tâm cách tâm trứng khác dưới 0,9 đường kính (trượt qua khe hẹp dễ hơn); dính vào ô trống gần chỗ dừng nhất mà kề một trứng (hoặc ở hàng đầu).
- Tốc độ bay 34 đơn vị/giây (chỉ ảnh hưởng hoạt cảnh; luật xử lý ngay tại đường bay đã tính). Hạ bàn và hết ván diễn ra ngay khi trứng tới nơi; bảng kết thúc hiện sau 0,9 giây.
- Màu theo số: góc màu = (số × 137,5°) mod 360° (hai số khác nhau luôn khác màu); khi có ảnh `trung-1` đến `trung-7` thì dùng ảnh theo (số mod 7), hai số có thể dùng chung ảnh, nên số luôn được vẽ rõ.
- Khung dọc: Máy tính mod là nút ở dải trên (bảng mở xuống); khung ngang: bảng luôn hiện. Ngưỡng khung ngang/dọc: rộng ≥ 1,1 lần cao.
- Cảm ứng: bấm nhanh một chấm trên bàn cũng bắn theo hướng chấm đó (kéo rồi thả là cùng một thao tác); chuột: mỗi lần bấm (nhấn rồi nhả) bắn một phát tại góc đang trỏ.
- Hết ván còn điểm "tim còn × 50" chỉ cộng khi ván kết thúc (khi chưa kết thúc, điểm đang hiện chưa gồm phần này).
- Đã bỏ trang dev `/dev/man-09-lanes` (chọn 3 làn của game gà) và ảnh `scenes/man-09-duong-lang`, `sprites/man-09-chua-ga/*` không còn được dùng (file gốc còn ở `assets/`, chưa xóa).

### Kích thước chunk

Chunk `Man9` (tải lười khi vào màn 9), bản build hub `VITE_MERGED=true` ngày 01/11/2026: **35,07 kB (gzip 12,62 kB)** (đo sau khi gộp với màn 12 và bản đồ dịch chuyển); bản vỏ riêng `apps/lang-khac-dau`: 34,92 kB (gzip 12,56 kB). Game cũ (three.js, Scene25D) không còn trong chunk này.

## Kết thúc làng

- Chú Dũng trao **Trang Sổ Vàng thứ ba**.
- Chú Dũng: "Không giả dấu được nữa, {phanDien} chuyển sang trò trộn giao dịch ở Làng Bạc rồi."

## Checklist nghiệm thu

- [ ] Test Bài 3 (giai đoạn 1), `memoryLogic` và `bubbleLogic` đều ✅.
- [ ] Màn 7: máy soi dấu chỉ đúng người đã đóng dấu; dò số với p = 1.000.003 không làm đơ giao diện.
- [ ] Màn 8: {phanDien} tráo bài có hoạt cảnh rõ ràng, không bao giờ đụng thẻ đã khớp.
  - [x] **luật chung (bước HD, spec 03 mục 3.8 và 6):** có phần hướng dẫn riêng mở từ thẻ bắt đầu; nút "?" (phím H) trong lúc chơi với `hintFor(state)` không lộ đáp án và tạm dừng thật; nút "Chơi tiếp" ở màn kết quả (hết màn trong làng thì "Về làng"). (đã làm ở bước HD: phần `man-8`, `memoryHint.ts`, "Chơi tiếp" không có vì làng chưa có màn sau.)
- [x] Màn 9 (Bắn trứng khắc dấu):
  - [x] nạp trứng chỉ tính xuôi;
  - [x] chưa chọn loại trứng thì không bắn được; ba trứng cùng số liền nhau thì vỡ, trứng không nối trần thì rơi;
  - [x] cứ 12 phát (đợt 3: 10 phát) bàn hạ một hàng; chạm dây thì mất tim.
  - [x] **luật chung (bước HD, spec 03 mục 3.8 và 6):** có phần hướng dẫn riêng mở từ thẻ bắt đầu; nút "?" (phím H) trong lúc chơi với `hintFor(state)` không lộ đáp án và tạm dừng thật; nút "Chơi tiếp" ở màn kết quả (hết màn trong làng thì "Về làng").
- [x] Xong màn 9: nhận Trang Sổ Vàng; cổng Làng Bạc mở (test `unlock.test.ts`).

## Bổ sung mốc 4 và bàn giao Claude — 01/11/2026

- P8 đã tích hợp Màn 7 đủ Dễ/TB/Khó, Màn 8 lật cặp và máy tính mod, Màn 9 nạp trứng/bắn trứng (đã thay game gà bằng "Bắn trứng khắc dấu", xem mục Màn 9); xem spec P8 và TRANG-THAI.md về bằng chứng/giới hạn.
- Ký bằng khóa riêng của mình, xác minh bằng khóa công khai người gửi. Bài tập tìm x với 5^x mod23 là mô hình thu nhỏ. Thử tuần tự là phương pháp minh họa, không khẳng định đó là phương pháp duy nhất hay suy ra thời gian bảo mật thực chỉ từ kích thước không gian khóa.
- Rà các câu trái với nguyên tắc trên trong content và báo cáo là việc CÒN TỒN, chưa được đánh dấu sửa mã. Máy tính Màn 8 giữ hiển thị sẵn, kích thước dễ đọc; không quay lại bắt bấm mới mở.

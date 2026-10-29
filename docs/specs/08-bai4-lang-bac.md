# SPEC 08 — BÀI 4: LÀNG BẠC (mốc 1: bài học; mốc 3: cảnh làng, màn 11, màn 12, cao trào)

**Gói:** `packages/village-lang-bac`. Gồm màn 10 (bài học), màn 11, màn 12 và cảnh cao trào. Chạy riêng ở `lang-bac.ten-mien.vn`.

**Nguồn luật:** công thức T_ab = T_a × 10 + T_b, dữ liệu và chấm sao của bài học giữ đúng **spec giai đoạn 1 `05-bai4-merkle.md`**. Dùng lại `combine`, `buildTree` trong `packages/core/src/lessons/bai-4`.

**Người dẫn:** thầy Linh (`characters/thay-linh`, không có xương).

**Loại cảnh:** cảnh làng là 3D đi lại; màn 10 là trang bài học 2D; màn 11 và màn 12 là 2.5D; cảnh cao trào là 3D. Tên phản diện viết `{phanDien}` (hiện là Tí).

## Cảnh làng (3D đi lại, vùng làng của `WorldScene` ở thế giới mở `/cho`; dựng đủ ở mốc 3, bước L5)

- **Trong thế giới mở:** Làng Bạc nằm ở phía ĐÔNG chợ trên bản đồ (`worldFrames.ts`: hướng `dong`, quay −90°; đường từ chợ sang làng đi qua cầu gỗ bắc qua sông), cổng làng cách tâm chợ 72, làng **bán kính 125** mở ra phía sau cổng nên tâm làng cách tâm chợ 197 (`three/world/villages/bac.ts`, hệ tọa độ làng như ba làng kia: gốc là tâm làng, +Z là phía bắc của làng, cổng ở (0, −125); tên hướng dưới đây theo cách gọi của Làng Giấy, đông là +X của làng; người đi từ cổng vào nhìn về +Z thì phía đông ở bên TRÁI). Làng chỉ được tải khi người chơi vào vùng tải và dọn sau 3 giây khi ra xa; từ xa vẫn thấy hình làng nhẹ. Nhánh sông nhỏ trong làng cách xa sông của thế giới (không chạm `river.ts`). Cảnh mở đầu chạy khi lần đầu bước qua cổng; **"Em có biết?" không còn tự hiện mà là 4 cuộn giấy rải trong làng** (spec 03 mục 3.9). "Về làng" (cuối màn) mở `/cho?tu=lang-bac`: người chơi đứng ngay phía nam ba biển gỗ, ở (0, −96) trong hệ tọa độ làng, nhìn về +Z.
- **Cổng vào:** `env/cong-lang-bac`, ở (0, −125).
- **Model dùng:** nhà `env/nha-mai-ngoi` (12 nhà thường và nhà giữ sổ cỡ 1,7) và `env/nha-mai-tranh` (22 nhà); lều `env/leu-cho` (5, quầy đổi bạc); `env/gieng-lang` (2); `env/cay-da` (1, cây gộp sổ cỡ 1).
- **Code tự dựng (mốc 3, bước L5):** 10 đồ nhỏ mới (`PropKind`, hình học ở `three/cho/marketGeometry.ts`, cỡ ở `PROP_SIZES`, màu theo đỉnh ở `CRAFT_COLOR`; ZonePrewarm biên dịch trước như mọi đồ nhỏ; cùng một chương trình shader với các đồ nhỏ màu theo đỉnh khác):
  - **dây xu** (`day-xu`: giá hai cột, năm dây xu đồng và đồng thau), **bàn thỏi bạc** (`thoi-bac`: chồng thỏi bạc ba tầng), **cân đĩa** (`can-bac`: bàn nhỏ, đòn cân hơi nghiêng, đĩa có thỏi bạc và quả cân), **rương gỗ** (`ruong-go`: nắp tròn, đai sắt, khóa đồng), **kiện hàng** (`kien-hang`: vải bố buộc dây), **giá sổ cái** (`ke-so`: bốn tầng sổ cái nhiều màu gáy);
  - **thuyền mui lá** (`thuyen`: thân thuyền của chợ sơn nâu và mui lá nửa ống dày; nằm trên nước, không có vật cản vì nước đã là vật cản), **bến gỗ** (`ben-go`, xem dưới), **lá sen** (`la-sen`, nổi trên nước, đi qua được) và **hoa sen** (`hoa-sen`).
  - Dùng lại: `ban-chep` + `so-chung` (sổ cái trên bàn), `mai-che` (hiên nhà giữ sổ), `thung`, `chum`, `rom`, `hom`, `ban-da`, `chau-canh`, `khoi-da`, `hoa`; cầu ao `cau-ao`; sân đất nện và đường gạch ở đại lộ như Làng Khắc Dấu.
- **Thẻ gỗ ghi số trên cây đa** (bản L5; từ bước L6 thẻ vẽ khác, xem mục "Làm đẹp bước L6" bên dưới: chữ bằng phông của game, không còn đồ rải `the-so` và chữ đoạn thẳng): **15 thẻ** là cả cây ví dụ của Bài 4 (đề mẫu `SAMPLE_HARD_CHALLENGE`: tám lá 3, 7, 5, 2, 6, 1, 4, 8; công thức T_ab = T_a × 10 + T_b nên tầng 1 là 37, 52, 61, 48, tầng 2 là 422, 658, gốc là 4878), số lấy từ `buildTree` (có test), không đặt số riêng. Càng gần gốc thẻ càng to và treo càng thấp: thẻ gốc (4878) to nhất, treo thấp nhất ngay trước thân (cao 2,7), tầng lá ở ngoài cùng và cao nhất (cao 5,1); mỗi thẻ treo bằng dây lên cành. Chữ số là đoạn thẳng bằng hộp mỏng nổi lên mặt thẻ (không dùng ảnh chữ, không texture). Thẻ **lay nhẹ bằng đúng vật liệu của sào vải** (`clothMaterial`, cùng chương trình shader 'cloth-sway-v3', một uniform thời gian dùng chung; `aSway` tăng dần từ chỗ buộc dây xuống đáy thẻ, `aSlot = −1`), nên KHÔNG thêm chương trình shader nào và KHÔNG dùng `envMap`. Thẻ to đung đưa ít hơn (độ lệch tối đa khoảng 3 cm, chữ nổi 5 cm): bộ đổ bóng đẩy từng đỉnh theo sóng phụ thuộc vị trí đỉnh còn mặt tấm gỗ chỉ có 4 đỉnh, nên tấm càng rộng mà lay mạnh thì chữ càng lệch khỏi mặt gỗ (thấy ở lần chụp đầu: thẻ gốc mất nửa chữ). "Giảm chuyển động" thì thẻ đứng yên. Khoảng 2.100 tam giác cho cả 15 thẻ.
- **Bến gỗ có thể đi lên** (`three/village/deck.ts`; đồ nhỏ `ben-go`, gốc ở giữa bến, trục z từ bờ ra nước): rộng 3,4, dài 9, dốc dài 2,2 ở phía bờ lên tới mặt sàn cao 0,5, rồi sàn phẳng ra tới mũi bến; sàn ván đặc, cột và thanh vịn tre hai bên phần sàn, hai cọc buộc thuyền ở mũi bến. `WorldLayout.groundHeight` (dùng cho `WalkWorld`) ghép `worldGroundHeight` của cầu chợ với độ cao của mọi bến trong các làng; người chơi đi lên bằng dốc (độ cao tăng đều, không nhảy; đo khi thử: 0,045 ở đầu dốc, 0,27 giữa dốc, 0,5 trên sàn). Hai bên bến và quá mũi bến là nước (vật cản), nên không rơi khỏi bến.
- **Nhánh sông nhỏ** (`streams`, `blocks` của `VillageLayoutInput`; `ponds[].collide`): đường tim đi qua 9 điểm điều khiển (rộng 8 tới 9) từ vũng nước ở phía bắc (92; 63,5) xuống vũng ở phía nam (89; 1,5), làm mượt bằng `smoothPath` của `river.ts` và vẽ thành dải nước có bờ cỏ (`VillageStreamMesh` ở `WorldTerrain.tsx`, cùng texture nước của sông, hai draw call). Từ z = 46 trở xuống nước chảy thẳng theo trục z ở x = 89 (chỗ có bến). Vật cản của nước là chuỗi hộp xoay phủ dải nước (như sông thế giới) và, ở đoạn thẳng, ba hộp chữ nhật chừa đúng lối cho bến gỗ: trong lòng nước chỗ nào cũng bị chặn trừ lối ra bến. Bản đồ nhỏ và lớn vẽ nhánh sông này (`mapGeometry.ts`).
- **Thầy Linh** (người dẫn, nói chuyện được) đứng dưới tán cây đa, ngoài nền rễ, ở (−7,3; −86,6); **lái buôn** (`companions`, không nói chuyện được, không có xương) đứng ở bờ cạnh bến ở (81,5; 27,4), quay mặt về bến.
- **Cảnh mở đầu:** ảnh truyện số 9 ("Làng Bạc: mỗi ngày hàng trăm khoản bạc qua tay. Thầy Linh gộp chúng lên cây đa thành một con số gốc.") kèm lời. Thầy Linh: "Hàng trăm khoản bạc đổi tay mỗi ngày, ghi cả vào sổ thì dài lắm. Thầy gộp từng cặp giao dịch lên cây đa này, để chỉ cần nhìn một con số ở gốc là biết cả sổ có bị sửa hay không." (`content/villageScene.ts`, `VILLAGE_SCENE['lang-bac']`: lời nhắc việc theo tiến độ, KHÔNG có `award`: **Làng Bạc không có cảnh trao Trang Sổ Vàng ở thế giới mở**, trang thứ tư trao trong cảnh cao trào sau màn 12; `award` thành trường tùy chọn và `WorldPage` chỉ chiếu cảnh trao trang cho làng có `award`). Nạp và giải mã trước ảnh, dựng ẩn hộp thoại khi vào vùng chuẩn bị (`scenePreload.ts`) áp dụng như ba làng kia.
- **3 biển gỗ:** "Học cùng thầy Linh" (màn 10), "Ghép lá cây sổ" (màn 11), "Leo cây tìm lá giả" (màn 12).
- **Bố cục bước L5 (bán kính 125, tọa độ làng, `LANG_BAC_LAYOUT`)**: lũy tre bao quanh (vòng bụi tre ở bán kính 122, vật cản là chuỗi hộp, cổng là lối vào chính; 552 bụi tre kể cả đồi tre), các khu nối nhau bằng đường làng (đường **gạch** ở đại lộ và qua sân cây, đường **đất** ở ngõ; 11 đoạn). Đi từ cổng tới chỗ đứng trước biển giữa mất khoảng 8,3 giây đi bộ (34 đơn vị; 4,1 đơn vị mỗi giây); tới thẻ xa nhất (bến sông) khoảng 53 giây đi bộ (218,8 đơn vị). Cả làng: 34 nhà ở (12 ngói, 22 tranh) và nhà giữ sổ, 5 lều, 2 giếng, 1 cây đa, 191 đồ nhỏ (kể cả 51 khóm hoa, 39 chum, 25 lá và hoa sen), 622 món đồ rải (552 tre, 64 cây quả, 4 đồi, thẻ số, cầu ao), 5 ruộng lúa, 3 vũng nước (ao sen và hai vũng đầu nhánh sông).
  - **Cây Gộp Sổ** (giữa làng, sân đất nện bán kính 17 ở (0, −80)): cây đa ở (0, −80) (nền rễ là vật cản, rộng chừng 6), ba biển gỗ ở z ≈ −90 (x = 4,6; 0; −4,6) quay mặt về cổng, thầy Linh, hai chum, rương và thùng ở phía tây sân, 5 chậu cây cảnh, bàn đá; đường vòng quanh sân ở x = −10. `?tu=lang-bac` đưa người chơi tới (0, −96), nhìn về +Z. Thẻ KHÔNG đặt ở sân.
  - **Quầy đổi bạc** (đông nam, sân đất nện bán kính 24 ở (63; −43), cạnh đường ngang z = −50): năm lều chợ ở z ≈ −40 (x = 47, 55, 63, 71, 79) quay mặt về đường; trước lều bày 2 dây xu, bàn thỏi bạc, cân đĩa, bàn chép sổ có sổ, 2 rương gỗ; sau lều kiện hàng, thùng, chum, rương; **thẻ 1** ở (59,1; −44,9), tới bằng nhánh đường ra quầy.
  - **Bến sông** (đông bắc, quanh (85; 31)): nhánh sông nhỏ, bến gỗ ở (86,3; 31) hướng ra +X, ba thuyền mui lá đậu dọc theo dòng, 3 kiện hàng, 3 thúng, rương và chum trên bờ, lái buôn; sân đất bán kính 9 ở (82; 31); đường chéo lên bến từ (0, −10) tới (79; 31); **thẻ 2** ở (80,4; 35,2).
  - **Nhà giữ sổ** (tây, sân đất bán kính 12 ở (−68; −10)): nhà ngói cỡ 1,7 ở (−79; −10) quay mặt về đông, hiên (`mai-che`) ở (−70,9; −10) có 2 bàn chép sổ (mỗi bàn một cuốn sổ), 3 giá sổ cái, 2 rương gỗ, thùng, chậu cây; **thẻ 3** ở (−62,4; −11), tới bằng đường ra nhà giữ sổ ở z = −10.
  - **Ao sen** (tây bắc, ao bán kính 13 ở (−66; 52)): 16 lá sen và 9 hoa sen nổi trên nước (đều nằm trong ao, chừa lối trống ra cầu ao), cầu ao ở (−51,2; 52), khóm hoa và đá ven bờ; **thẻ 4** ở (−46,8; 55,4), tới bằng đường chéo từ trục bắc nam ở (0, 22).
  - **Khu nhà ở**: 34 nhà dọc các ngõ (đường ngang z = −50, trục bắc nam, đường ra bến, đường ra ao sen, đường ra nhà giữ sổ), xếp tự động ở chỗ trống (`createFiller.onGround`: không đè quầy, bến, đường, lối đi của dân làng); 2 giếng; 64 cây ăn quả ở các góc.
  - **Rìa làng**: 5 ruộng lúa, 4 đồi tre xanh, lũy tre.
  - **Dân làng**: 6 người đi lại giữa các khu (đại lộ và sân cây, đường ra quầy, trước nhà giữ sổ, ngõ tây, trục bắc, đường ra ao sen), nhường đường người chơi như ở chợ.
  - **Đường cho mũi tên** (`paths`): cổng → đại lộ → sân cây → từng biển; sân → thầy Linh; và tới từng cuộn giấy (`scrollStands`: nút `scroll:lang-bac:<số>`). Quãng đường từ cổng tới 4 thẻ: 148,7 (quầy); 218,8 (bến sông); 186,9 (nhà giữ sổ); 215,6 (ao sen) đơn vị. Hai thẻ nào cũng cách nhau từ 60 trở lên; mỗi thẻ ở một khu (khóa khu `quaybac`, `bensong`, `nhaso`, `aosen` ở `content/knowScrolls.ts`; Bi gợi ý theo KHU).
  - **Bản đồ**: viền lũy tre vẽ nét liền (làng đã dựng), nhà, đường gạch và đường đất, ao và nhánh sông nhỏ, ký hiệu thẻ chưa nhặt khi đang ở trong làng. Làng Bạc không còn đồ đất hoang (`wildlands()` bỏ qua cả bốn làng).
  - **Vật cản theo chân thật** cho mọi vật (xem `?debug=colliders`): nhà, lều, giếng, cây đa (nền rễ), biển, thầy Linh, lái buôn, bàn, rương, giá, kiện hàng, nước của nhánh sông và hai vũng, ao sen, lũy tre, từng bụi tre và cây quả. Bến gỗ, thuyền (trên nước), lá sen, hoa sen, khóm hoa, ruộng thì đi qua được.
  - **Vẽ nhẹ và dựng theo giai đoạn:** như ba làng kia (spec 05 và spec 03 mục 9); thẻ số là một loại đồ rải thêm nên thêm một giai đoạn dựng.
  - **Test** `villages/bac.test.ts` (30 ca): đủ số nhà (25 tới 35), giếng, năm lều, cây đa, ruộng; Cây Gộp Sổ (cây, sân, ba biển quay về cổng, thầy Linh ngoài nền rễ, chỗ xuất hiện); quầy, nhà giữ sổ, ao sen; 15 thẻ số khớp `buildTree` (số, to nhất và thấp nhất là gốc, hình học có `aSway` và `aSlot = −1`); bến gỗ (độ cao tăng đều, không nhảy); nước là vật cản trừ lối bến (mọi mẫu dọc đường tim và hai mép trong lòng nước), đi từ bờ lên mũi bến không bị chặn, hai bên và quá mũi bến bị chặn, thuyền nằm trong lòng nước; mọi món trong lũy tre, không chồng nhau, ruộng và nước không đè đồ; lũy tre kín; từ chỗ xuất hiện đi tới được mọi biển, thầy Linh, lái buôn, mũi bến, từng cuộn giấy, cổng (dò lưới bước 1); dân làng và các đoạn đường nhỏ không xuyên vật cản, mọi nút liền nhau; hai thẻ cách ≥ 60 và thẻ xa nhất ≤ 240 đơn vị đường đi; cổng tới biển giữa 6 tới 10 giây đi bộ; ở thế giới mở độ cao mặt đi được theo bến (cầu chợ giữ nguyên), nước và 4 nút thẻ đi theo bố cục. Test mới khác: `marketGeometry.test.ts` (10 đồ nhỏ mới), `villageScene.test.ts`, `sceneTurns.test.ts`, `questVillages.test.ts` (đổi tên từ `minimal.test.ts`; `minimal.ts` bỏ vì không còn làng nào chưa dựng), `worldLayout.test.ts` (không còn đất hoang), `mapGeometry.test.ts` (nhánh sông, bốn viền làng), `scatter.test.ts` (thẻ số). Băm bố cục Làng Giấy, Dệt và Khắc Dấu không đổi (test cũ của ba làng vẫn xanh).
- **Tài khoản cũ:** đã xong màn 10 (hoặc đã xem hộp "Em có biết?" cũ) coi như đủ 4 thẻ (`effectiveKnowMask`), không bị chặn biển. Trang Sổ Vàng thứ tư trao trong cảnh cao trào sau màn 12 như cũ.
- **Số đo bước L5** (bản build `VITE_PROBE`, Chrome, máy cắm điện): xem `docs/specs/03-dong-co-3d-giao-dien-chung.md` mục 9, phần "Làng Bạc (mốc 3, bước L5)". Ảnh chụp kiểm: `docs/screenshots/l5/` (cổng, Cây Gộp Sổ, thẻ gỗ cận cảnh, quầy đổi bạc, bến sông, nhà giữ sổ, ao sen, bản đồ lớn và nhỏ).
- **Làm đẹp bước L6 (chỉ hình ảnh; bố cục khu, vị trí thẻ, đường, luật không đổi; ảnh trước/sau ở `docs/screenshots/l5/` và `docs/screenshots/l6/`; số đo ở spec 03 mục 9, phần "Làng Bạc, bước L6"):**
  - **Hòm, thúng, kiện hàng** (dùng chung cho đồ quanh cổng của mọi làng, vì `hom` và `thung` là đồ nhỏ chung): **hòm** `hom` và `ruong-go` cùng một hình (`chestGeometry`): thân óc chó, nắp nửa trụ cong, ba đai đồng xỉn ôm cả thân và nắp, góc bọc đồng, khóa đồng thau; **thúng** `thung` đan tre: miệng loe, bảy vòng nan xen ba sắc tre so le nửa cạnh (vân đan), viền miệng sẫm, tám nan dọc nhô ra; **kiện hàng** `kien-hang`: bốn kiện bọc vải (bố, bố nhạt, vải chàm), mỗi kiện phình nhẹ như gối, xoay và nghiêng riêng, hai đai dây buộc và nút buộc, không xếp thẳng tắp. `hom` và `thung` chuyển sang màu theo đỉnh (cùng chương trình shader với đồ nhỏ khác).
  - **Nhà giữ sổ**: nhà ngói cỡ 1,9 (thường 1) ở (−80; −10); **hiên dựng bằng code** `hien-nha` (sáu cột tròn ở mép trước, sáu cột sau sát vách, xà, mái ngói đỏ dốc về trước có các hàng ngói, bậc gỗ; đi dưới mái được) thay mái che tranh; **bàn chép sổ** `ban-viet` (cuốn sổ mở bìa nâu, nghiên đá có mực, thỏi mực, bút lông gác trên giá bút, tờ giấy rời) thay bàn chép và cuốn Sổ Chung tím; **giá sổ** `ke-so` bỏ gáy màu kiểu hiện đại: bốn tầng ván, mỗi tầng ba chồng SỔ ĐÓNG CHỈ nằm (bìa nâu, chàm, vàng đất, xếp lệch nhẹ, gáy khâu chỉ sẫm, dây buộc nhạt), tầng trên cùng sáu cuộn giấy buộc dây đỏ; **hòm sổ** `ruong-go` có khóa.
  - **Quầy đổi bạc**: **xâu xu** `day-xu` là chuỗi đồng tiền tròn lỗ vuông màu đồng xỉn treo trên năm móc đồng (mặt quay ra, so le, dài ngắn khác nhau), không còn dáng bàn tính; **cuộn xu** `cuon-xu` (bàn nhỏ, ba cuộn xu buộc dây đỏ, vài đồng rời); **bàn thỏi bạc** `thoi-bac`: thỏi bạc hình thuyền màu bạc sáng (màu đỉnh; hình học là thân thuyền của chợ co lại) chồng 3, 2, 1 trên khay gỗ có thành; **cân đòn** `can-bac` cỡ 1,15 đặt ở quầy giữa: bàn, cột gỗ cao, đòn gỗ dài hơi nghiêng có đầu đồng, hai đĩa đồng thau treo mỗi đĩa ba sợi dây, đĩa trái có thỏi bạc, đĩa phải có ba quả cân. Mỗi quầy bày khác nhau: quầy 1 xâu xu và cuộn xu, quầy 2 thỏi bạc, quầy 3 cân đòn, quầy 4 bàn chép sổ, quầy 5 rương và xâu xu; mỗi món lệch vị trí và hướng nhẹ theo hạt giống cố định (`createMulberry32(20260422)`).
  - **Số trên thẻ gỗ** (`VillageFeatures.tsx` `BanyanTags`, chỗ đặt là đồ nhỏ `cay-the`; `banyanTags.ts` giữ vị trí, ô trong ảnh chữ và cách lay): số vẫn lấy từ `buildTree` (3, 7, 5, 2, 6, 1, 4, 8; 37, 52, 61, 48; 422, 658; 4878), chữ vẽ bằng **phông Baloo 2** của game (nét mềm, mực nâu sẫm `#3A2210`, viền sáng nhẹ) trên một ảnh chung 1024 × 1024 (mỗi thẻ một ô, chữ co vừa mặt phẳng phủ lên tấm gỗ), cao tối thiểu 0,34 (lá) tới 0,58 (gốc), đọc rõ ở khoảng 6 đến 8 đơn vị. Tấm gỗ (cạnh sẫm, mặt sáng) và dây là hai InstancedMesh màu theo đỉnh, chữ là mặt phẳng vật liệu cơ bản trong suốt (như bảng mẫu dấu); cả ba lay quanh chỗ buộc dây bằng cách ghi lại ma trận mỗi khung hình (thẻ to lay ít hơn: biên độ 0,05 rad chia cho bề rộng thẻ), "Giảm chuyển động" thì đứng yên, ẩn khi xa hơn tầm vẽ đồ nhỏ. Bỏ: đồ rải `the-so`, `createNumberTags`, chữ đoạn thẳng, vật liệu sào vải cho thẻ.
  - **Ngân sách**: không thêm chương trình shader; ảnh chữ vẽ và đẩy lên GPU ở bước chuẩn bị làng (nếu để ở khung dựng vùng thì có khung 100 đến 200 ms); mức Vừa thêm `FAR_VIEW_MEDIUM` = 260 cho nhà, lều, bụi tre ở xa. Số đo và các chỗ chưa đạt: spec 03 mục 9.
  - **Test**: `bac.test.ts` (30 ca; thẻ số: số khớp `buildTree`, ô ảnh chữ không trùng, chữ lọt mặt phẳng, lay nhẹ; hiên, bàn chép, cuộn xu), `marketGeometry.test.ts` (đồ nhỏ mới và hòm, thúng làm lại vẫn vừa khung bao và là hình kín), `scatter.test.ts`.

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

### Sau màn 10 (đã thay ở mốc 3, bước B5)

Cảnh trao trang tạm của mốc 1 (`LessonPage2D`: "Thầy Linh trao Trang Sổ Vàng thứ tư…", nút "Về bản đồ") đã bỏ (`bai4Lesson.award` không còn). Xong màn 10 mở màn 11 (từ bước B13 màn 11 đã ra mắt; trước đó còn `coming-soon` nên mở thẳng màn 12); nút "Chơi tiếp" của bài trỏ tới game đã ra mắt kế tiếp, tức màn 11. Xong màn 11 thì mở màn 12. Trang Sổ Vàng thứ tư vẫn chỉ trao sau cảnh cao trào của màn 12 (mục "Cảnh cao trào"); xong màn 10 và 11 mà chưa chơi màn 12 thì mới có 3 trang.

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
| 1 | 4 | 12 (gốc 20) | 3 |
| 2 | 8 | 15 (gốc 25) | 5 |
| 3 | 8 | 15 (gốc 25) | 8 |

(Số lượt đã chỉnh ở lượt cân bằng 2, xem mục "Cân bằng màn 11, lượt 2"; số gốc 20 / 25 / 25 làm màn quá dễ.)

Hết lượt mà cây chưa xong thì vòng đó không được thưởng, nhưng vẫn sang vòng sau. Game không bao giờ chặn đường.

### Điểm

- Mỗi lá nổ: +1 (gốc +5; lượt cân bằng 2).
- Mỗi ô cây được lấp: +50.
- Xong một cây: +200, và mỗi lượt còn dư +20 (gốc chỉ có thưởng lượt dư).

| Mốc | Điểm | Nghĩa | Gốc |
|---|---|---|---|
| Đồng | 1150 | xong khoảng 1 cây | 600 |
| Bạc | 1550 | xong khoảng 2 cây | 1000 |
| Vàng | 1850 | xong cả 3 cây | 1400 |

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

### Logic đã làm và các chỗ đã chốt (mốc 3, bước B12; code ở `packages/village-lang-bac/src/match3/`)

Logic thuần (cảnh làm ở bước B13, mục "Cảnh màn 11" ngay dưới): `match3Config.ts` (số liệu, phương án độ khó), `match3Logic.ts`, `match3Logic.test.ts` (36 ca), `match3Bots.ts`, `match3Balance.test.ts` (7 ca), `index.ts`. Ngẫu nhiên chỉ qua `createMulberry32`: bàn đầu vòng và ô cây rút từ rng RIÊNG của vòng (theo seed và số vòng, không phụ thuộc cách chơi); lá mới, lá giả ném và xáo bàn rút từ rng của ván. Cùng seed và cùng chuỗi nước đi thì cùng ván.

**Chốt các chỗ spec chưa rõ:**
- **Một hàng** là một nhóm liền nhau từ 3 lá cùng loại thẳng hàng (ngang hoặc dọc) trở lên; hai đường cùng loại giao nhau (hình L, T, +) là MỘT nhóm, độ dài tính theo đường dài nhất. Mỗi hàng loại X lấp TỐI ĐA 1 ô cây loại X còn trống, dù hàng dài 3, 4 hay 5 (ô trống nhỏ nhất cần đúng loại X, tự chọn). Nổ dây chuyền: mỗi đợt xét mọi hàng cùng lúc, rồi xóa, rồi lá rơi (lá giả cũng rơi theo trọng lực, tự chọn), rồi thêm lá từ trên, lặp lại tới khi hết hàng. Hai hàng loại A trong cùng một đợt lấp 2 ô A nếu còn.
- **Ô cây**: mỗi ô yêu cầu một loại lá, chọn theo rng sao cho không loại nào chiếm quá 3 ô trong 8 (tự chọn: 4 ô thì tối đa 2 ô mỗi loại, cùng tỉ lệ). Cây là cây nhị phân: 8 ô → 4 cành → 2 cành → gốc (vòng 1: 4 ô → 2 cành → gốc). Hai ô anh em (chỉ số 2k và 2k + 1) cùng đầy thì gộp thành cành (chỉ là sự kiện để vẽ); gộp tiếp lên mức trên khi cành anh em cũng đã gộp; mọi ô đầy là gốc hình thành, xong vòng (thưởng +20 mỗi lượt dư).
- **Hoa sen** (`o-hoa`): tạo khi đúng 4 thẳng hàng, đặt ở ô vừa đổi nếu ô đó nằm trong nhóm (ô đầu tiên trong hai ô đổi thỏa), không thì ô giữa của đường dài nhất (ô thứ ⌊(n − 1) / 2⌋, tự chọn). Hoa sen GIỮ loại lá của nhóm (vẫn ghép hàng được). Khi nổ (bằng bất cứ cách nào): xóa cả hàng ngang của nó, kể cả lá giả và ô gió trong hàng; hoa sen khác trong hàng đó nổ theo. Các lá bị xóa thêm vẫn +5, không lấp ô cây; lá giả và ô gió bị xóa thêm không cộng điểm (tự chọn).
- **Gió xoáy** (`o-gio`): tạo khi từ 5 thẳng hàng trở lên (cùng quy tắc vị trí). Không có loại lá. Đổi chỗ với một lá thường loại X (hoặc hoa sen loại X) thì xóa mọi lá loại X trên bàn và chính nó, tính là 1 hàng loại X (lấp tối đa 1 ô); gió + gió xóa mọi lá thường (không lấp ô cây). Không đổi với lá giả. Đổi chỗ có ô gió luôn hợp lệ và mất một lượt.
- **Lá giả**: không đổi chỗ được, không tính vào hàng, biến mất khi có ô nổ ngay sát bên (trên, dưới, trái, phải; tính cả ô nổ do hoa sen xóa thêm), không cộng điểm khi biến mất. {phanDien} ném lá giả (cứ đủ 5 lượt, tức sau lượt thứ 5, 10, …; không ném ở lượt kết thúc vòng) vào một ô lá thường ngẫu nhiên (không vào hoa sen, ô gió hay lá giả).
- **Bàn đầu vòng và bàn sau khi xáo**: không có hàng sẵn, có ít nhất 1 nước đi; lá giả ban đầu đặt ngẫu nhiên. Hết nước đi (sau lượt, sau lần ném lá giả): xáo lại các lá thường (không phải hoa sen), lá giả và ô đặc biệt giữ chỗ.
- **Lượt**: một lượt là một lần đổi chỗ hợp lệ. Đổi mà không tạo được hàng thì trả về chỗ cũ, KHÔNG mất lượt (`ok: false`, `why: 'noMatch'`). Hết lượt chưa xong cây thì vẫn sang vòng sau (`advanceRound`), không thưởng. Điểm (lượt cân bằng 2: lá +1, xong cây thêm +200; xem mục cân bằng): mỗi lá nổ +5 (kể cả lá bị hoa sen và gió xoáy xóa thêm, hoa sen, lá thường; không tính lá giả và ô gió), mỗi ô cây lấp +50, xong cây +20 × lượt dư.
- **Sự kiện** (để cảnh diễn hoạt đúng thứ tự, theo từng đợt): `swap`, `swapBack`, `wave` (đầu mỗi đợt nổ), `spawnLotus`, `spawnWind`, `clear` (các lá nổ, điểm, hàng bị hoa sen xóa, loại bị gió xóa), `fakeGone`, `slotFilled`, `branchMerged` (mức, chỉ số, có phải gốc), `treeDone`, `fall`, `fill`, `throwFake`, `shuffle`, `roundEnd`, `roundStart`, `gameEnd`. Thứ tự trong một đợt: `wave`, tạo hoa sen hay gió, `clear`, `fakeGone`, lấp ô cây và gộp cành, `fall`, `fill`.
- **Bot** (`match3Bots.ts`): chỉ dùng `swapCells` và `advanceRound`, nhìn MỘT nước đi (`previewMove`: đợt nổ đầu, không đoán lá rơi xuống). Bot giỏi chọn nước lấp được nhiều ô cây nhất, rồi nổ nhiều lá nhất (hòa thì ngẫu nhiên bằng rng riêng của bot); bot trung bình 50% chọn như bot giỏi, 50% chọn ngẫu nhiên một nước hợp lệ; thêm bot ngẫu nhiên (chỉ để báo mức sàn).

**Kết quả cân bằng bước B12** (300 ván mỗi bot, seed 1 đến 300, luật gốc 20 / 25 / 25 lượt, mốc 600 / 1000 / 1400; đã được thay bằng phương án C ở mục "Cân bằng màn 11" ngay dưới, giữ lại để so sánh):

| Bot | Điểm TB (nhỏ nhất đến lớn nhất) | p10 / p25 / p75 | Xong cây vòng 1 / 2 / 3 | Lượt dư vòng 1 / 2 / 3 | Lượt, lá nổ, xáo mỗi ván | Chưa đạt / Đồng / Bạc / Vàng |
|---|---|---|---|---|---|---|
| Giỏi | 2.553,3 (2.300 đến 2.950) | 2.425 / 2.480 / 2.615 | 100% / 100% / 100% | 13,9 / 15,1 / 14,7 | 26,3; 136,1; 0,26 | 0 / 0 / 0 / 300 |
| Trung bình | 2.537,7 (2.350 đến 2.820) | 2.420 / 2.470 / 2.595 | 99,7% / 99,7% / 100% | 13,2 / 13,7 / 13,7 | 29,4; 145,1; 0,30 | 0 / 0 / 0 / 300 |
| Ngẫu nhiên | 2.508,2 (2.170 đến 2.825) | 2.400 / 2.450 / 2.565 | 98,7% / 99,7% / 99,0% | 11,8 / 11,9 / 12,2 | 34,1; 158,2; 0,35 | 0 / 0 / 0 / 300 |

- **Độ khó**: mục tiêu "bot trung bình xong cây vòng 1 ≥ 70%" đạt dư (99,7%) nên KHÔNG dùng phương án A (mỗi vòng +5 lượt) hay B (A và lá giả ban đầu 2 / 4 / 6); cả hai chỉ làm dễ hơn (điểm trung bình của bot trung bình 2.850). Với luật gốc ngay cả bot chỉ chọn ngẫu nhiên cũng xong cây ở 99% ván: cây chỉ cần chừng 9 lượt mỗi vòng so với 20 đến 25 lượt cho phép.
- **Mốc điểm CHƯA ĐẠT, chờ chủ dự án chọn**: với mốc 600 / 1000 / 1400 mọi bot đều Vàng 100% (bot trung bình Vàng 100% > 15%), vì điểm dồn vào 2.170 đến 2.950 (ô cây 1.000 điểm cố định, lá nổ khoảng 700, thưởng lượt dư khoảng 800). Quy tắc phân vị của lời giao (Đồng = p25 bot trung bình = 2.470 → 2.450, Bạc = p75 bot trung bình = 2.595 → 2.550, Vàng = p10 bot giỏi = 2.425 → 2.400; Bạc ≥ Vàng nên Bạc = trung bình cộng Đồng và Vàng = 2.425) cho ba mốc không tăng dần và cách nhau dưới 150 điểm, nên KHÔNG áp dụng; giữ 600 / 1000 / 1400 của spec trong `MATCH3_SPEC` cho tới khi chọn mốc theo nghĩa (ví dụ theo số vòng xong cây trong số lượt cho phép, hoặc giảm số lượt cho khó hơn).
- **Điểm tối đa ước tính**: khoảng 3.300 (ô cây 1.000; thưởng lượt dư tối đa 20 × (16 + 17 + 17) = 1.000 nếu mỗi ô cây một lượt; lá nổ khoảng 1.300 cho 260 lá). Bot giỏi cao nhất thấy 2.950 (300 ván).

### Cân bằng màn 11, lượt 1 (số lượt A, B, C; đã thay bằng lượt 2 ở mục dưới; code ở `match3Config.ts`, `match3Balance.test.ts`)

(Bảng dưới tính với điểm gốc: lá nổ +5, không thưởng +200 mỗi cây; số cây xong không đổi khi đổi cách tính điểm vì điểm không ảnh hưởng đường chơi của bot.)

**Lý do**: với luật gốc bot chọn ngẫu nhiên cũng xong cây khoảng 99% ván và mọi bot đều Vàng, nên học sinh bấm bừa vẫn thắng. Chỉ đổi số lượt (vòng 1, 2, 3) và xét mốc; mọi luật khác (lưới, lá, lá giả, điểm, cây) giữ nguyên.

**Phương án số lượt đã thử** (300 ván mỗi bot, seed 1 đến 300; thử lần lượt, dừng ở phương án đầu tiên đạt cả hai mục tiêu: bot giỏi xong cả 3 cây ≥ 85% và bot ngẫu nhiên xong cả 3 cây ≤ 40%; bot trung bình chỉ in ra):

| Phương án | Lượt (vòng 1 / 2 / 3) | Bot giỏi xong cả 3 cây | Bot trung bình xong cả 3 cây | Bot ngẫu nhiên xong cả 3 cây | Điểm TB giỏi / trung bình / ngẫu nhiên | Đạt? |
|---|---|---|---|---|---|---|
| Gốc | 20 / 25 / 25 | 100% | 99,7% (vòng 1) | 98,7% (vòng 1) | 2.553,3 / 2.537,7 / 2.508,2 | Không (ngẫu nhiên quá cao) |
| A | 12 / 16 / 16 | 260 / 300 = 86,7% (đạt) | 240 / 300 = 80,0% | 177 / 300 = 59,0% (> 40%) | 2.021,2 / 2.000,5 / 1.958,8 | Không |
| B | 10 / 14 / 14 | 215 / 300 = 71,7% (< 85%) | 179 / 300 = 59,7% | 107 / 300 = 35,7% (đạt) | 1.891,5 / 1.863,1 / 1.807,2 | Không |
| C | 8 / 12 / 12 | 137 / 300 = 45,7% (< 85%) | 101 / 300 = 33,7% | 45 / 300 = 15,0% (đạt) | 1.737,9 / 1.699,7 / 1.643,1 | Không |

**Kết luận**: không phương án nào đạt cả hai mục tiêu. A đạt mục tiêu bot giỏi nhưng bot ngẫu nhiên còn xong cả 3 cây ở 59%; B và C làm bot ngẫu nhiên đủ khó nhưng bot giỏi (chỉ nhìn một nước đi) xong cả 3 cây ở 71,7% và 45,7%. Theo lời giao dừng ở C và báo số thật; `MATCH3_SPEC` đang là C (8 / 12 / 12), mục tiêu bot giỏi ≥ 85% ở C ghi bằng `it.fails` trong test. Khoảng giữa các phương án (ví dụ lượt 11 / 15 / 15) chưa thử vì ngoài lời giao; nếu chủ dự án muốn cả hai mục tiêu, nên thử một phương án nằm giữa A và B.

**Bảng 3 bot ở phương án C** (mốc spec 600 / 1000 / 1400):

| Bot | Xong 0 / 1 / 2 / 3 cây (ván) | Điểm TB (nhỏ nhất đến lớn nhất) | Chưa đạt / Đồng / Bạc / Vàng (ván) |
|---|---|---|---|
| Giỏi | 5 / 34 / 124 / 137 | 1.737,9 (1.360 đến 2.095) | 0 / 0 / 2 / 298 |
| Trung bình | 7 / 60 / 132 / 101 | 1.699,7 (1.335 đến 2.060) | 0 / 0 / 2 / 298 |
| Ngẫu nhiên | 32 / 86 / 137 / 45 | 1.643,1 (1.280 đến 1.950) | 0 / 0 / 6 / 294 |

**Điểm theo số cây xong** (gộp cả 3 bot, 900 ván, phương án C):

| Xong | Số ván | p10 | Trung vị | p90 | Nhỏ nhất đến lớn nhất |
|---|---|---|---|---|---|
| 0 cây | 44 | 1.370 | 1.495 | 1.605 | 1.280 đến 1.660 |
| 1 cây | 180 | 1.460 | 1.570 | 1.745 | 1.325 đến 1.850 |
| 2 cây | 393 | 1.565 | 1.685 | 1.810 | 1.335 đến 2.055 |
| 3 cây | 283 | 1.670 | 1.795 | 1.915 | 1.595 đến 2.095 |

**Mốc theo nghĩa CHƯA CHỌN ĐƯỢC**: yêu cầu là Vàng ≈ xong 3 cây, Bạc ≈ xong 2 cây, Đồng ≈ xong 1 cây, với ≥ 90% ván xong đúng số cây đạt mốc và ≤ 10% ván xong ít cây hơn đạt mốc (bội số 50). Quét mọi bội số 50 từ 0 đến 3.600: không giá trị nào thỏa cho Vàng, Bạc hay Đồng. Nguyên nhân: điểm gần như không phụ thuộc số cây xong (lá nổ cho khoảng 1.200 điểm; ô cây lấp được và thưởng lượt dư chỉ thêm vài trăm), nên điểm các ván xong 0, 1, 2, 3 cây chồng lên nhau (ví dụ Vàng ở 1.800: 46% ván xong 3 cây đạt, 9% ván xong ≤ 2 cây đạt; ở 1.700: 84% và 35%). Không tự chế mốc: giữ 600 / 1000 / 1400 của spec trong `MATCH3_SPEC` (298 / 300 ván của bot giỏi và bot trung bình, 294 / 300 của bot ngẫu nhiên vẫn Vàng, nên mốc này chưa phân biệt được ai). Hướng cho chủ dự án chọn: cho điểm phụ thuộc cây nhiều hơn (tăng điểm ô cây và thưởng lượt dư, hoặc giảm điểm lá nổ) rồi quét lại, hoặc đặt mốc theo số cây xong thay vì theo điểm. (Lượt 2 ngay dưới làm đúng hướng thứ nhất.)

### Cân bằng màn 11, lượt 2 (điểm mới, quét lưới số lượt, mốc theo nghĩa)

**Lý do**: điểm lá nổ (~1.200) lấn át điểm dựng cây, nên điểm không phản ánh số cây xong; bot ngẫu nhiên vốn ăn may nhờ nổ dây chuyền nên mục tiêu ≤ 40% quá chặt. Chỉ chỉnh cách tính điểm, số lượt và mốc.

**Điểm mới**: mỗi lá nổ +1 (thay +5); mỗi ô cây lấp +50 (giữ); xong một cây +200 + 20 × lượt dư (thưởng +200 là mới). `points = { leaf: 1, slot: 50, tree: 200, spare: 20 }`.

**Số lượt**: quét lưới vòng 1 ∈ {8, 9, 10, 11, 12} × vòng 2 = vòng 3 ∈ {12, 13, 14, 15, 16}, 300 ván mỗi bot mỗi ô (seed 1 đến 300). Mục tiêu: bot giỏi xong cả 3 cây ≥ 80% VÀ bot ngẫu nhiên xong cả 3 cây ≤ 50%. Chọn ô đạt có (giỏi − ngẫu nhiên) lớn nhất; không ô nào đạt thì chọn ô có hiệu lớn nhất trong các ô có giỏi ≥ 80%, và báo. **KHÔNG ô nào đạt cả hai.** Các ô có giỏi ≥ 80% (số ván xong cả 3 cây trên 300):

| Vòng 1 / 2 / 3 | Giỏi | Trung bình | Ngẫu nhiên | Giỏi − ngẫu nhiên |
|---|---|---|---|---|
| 10 / 16 / 16 | 246 (82,0%) | 225 (75,0%) | 157 (52,3%) | 89 |
| 11 / 16 / 16 | 250 (83,3%) | 236 (78,7%) | 170 (56,7%) | 80 |
| **12 / 15 / 15 (chọn)** | 245 (81,7%) | 223 (74,3%) | 154 (51,3%) | **91** |
| 12 / 16 / 16 | 260 (86,7%) | 240 (80,0%) | 177 (59,0%) | 83 |

Ô gần nhất ở phía còn lại: 11 / 15 / 15 giỏi 236 (78,7%, hụt mục tiêu bot giỏi) / ngẫu nhiên 148 (49,3%). Bot ngẫu nhiên ở ô chọn xong cả 3 cây ở 51,3%, vượt 50% khoảng 1,3 điểm phần trăm (chủ dự án chấp nhận mức ≤ 55%, xem bên dưới). Các ô còn lại (giỏi < 80%) có trong lần quét nhưng không đưa vào bảng.

**Bảng 3 bot ở 12 / 15 / 15** (mốc 1150 / 1550 / 1850):

| Bot | Xong 0 / 1 / 2 / 3 cây (ván) | Điểm TB (nhỏ nhất đến lớn nhất) | Chưa đạt / Đồng / Bạc / Vàng (ván) | Tỉ lệ Đồng / Bạc / Vàng |
|---|---|---|---|---|
| Giỏi | 0 / 4 / 51 / 245 | 2.007,3 (1.278 đến 2.273) | 0 / 4 / 51 / 245 | 1,3% / 17,0% / 81,7% |
| Trung bình | 0 / 7 / 70 / 223 | 1.944,0 (1.294 đến 2.242) | 0 / 8 / 71 / 221 | 2,7% / 23,7% / 73,7% |
| Ngẫu nhiên | 2 / 33 / 111 / 154 | 1.794,3 (897 đến 2.199) | 2 / 41 / 106 / 151 | 13,7% / 35,3% / 50,3% |

**Điểm theo số cây xong** (gộp 900 ván của cả 3 bot):

| Xong | Số ván | p10 | Trung vị | p90 | Nhỏ nhất đến lớn nhất |
|---|---|---|---|---|---|
| 0 cây | 2 | 897 | 1.010 | 1.010 | 897 đến 1.010 |
| 1 cây | 44 | 1.271 | 1.340 | 1.415 | 1.186 đến 1.436 |
| 2 cây | 232 | 1.608 | 1.695 | 1.790 | 1.509 đến 1.856 |
| 3 cây | 622 | 1.930 | 2.041 | 2.150 | 1.802 đến 2.273 |

**Mốc theo nghĩa**: điều kiện ≥ 85% ván xong k cây đạt mốc k và ≤ 15% ván xong ít hơn k cây đạt mốc k (bội số 50, gộp 900 ván). Với điểm mới các bậc tách nhau: thỏa Đồng 1050 đến 1250, Bạc 1450 đến 1600, Vàng 1800 đến 1900. Chọn giữa khoảng thỏa (tự chọn): **Đồng 1150, Bạc 1550, Vàng 1850**. Tỉ lệ thật: Đồng 1150: 44 / 44 ván xong 1 cây đạt (100%), 0 / 2 ván xong 0 cây đạt (0%); Bạc 1550: 223 / 232 ván xong 2 cây đạt (96,1%), 0 / 46 ván xong ≤ 1 cây đạt (0%); Vàng 1850: 615 / 622 ván xong 3 cây đạt (98,9%), 2 / 278 ván xong ≤ 2 cây đạt (0,7%).

**Mức chấp nhận thật (lượt B13)**: match-3 bấm bừa vẫn ăn may nhờ nổ dây chuyền; mốc đặt theo nghĩa số cây xong, không theo tỉ lệ bot. Test chấp nhận: bot giỏi xong cả 3 cây ≥ 80% (81,7%), bot ngẫu nhiên ≤ 55% (51,3%), và ba tỉ lệ nghĩa của mốc (≥ 85% ván xong k cây đạt mốc k, ≤ 15% ván xong ít hơn k cây đạt mốc k). Bot trung bình Vàng 73,7% và bot ngẫu nhiên Vàng 50,3%: màn 11 thuộc ngoại lệ "mốc theo nghĩa" của CLAUDE.md mục 7 (màn 9, 11, 12), không áp quy tắc "bot trung bình hầu như không Vàng".

### Cảnh màn 11 (mốc 3, bước B13; code ở `packages/village-lang-bac/src/match3/`, trang `pages/Man11.tsx`)

Màn 11 đã ra mắt (`status: 'ready'`, route `man/11`, bọc trong `MiniGameLevel` với `medals = MATCH3_SPEC.medals` = 1150 / 1550 / 1850). Logic giữ nguyên; cảnh chỉ nối thao tác vào `swapCells` rồi diễn hoạt theo DANH SÁCH SỰ KIỆN logic trả về, không tính lại luật.

**Các tệp:** `man11Slots.ts` (chỗ 8 ô lá trên ảnh cây) + `DevMan11Slots.tsx` (trang `/dev/man-11-slots`, chỉ khi chạy dev, ở `pnpm dev:lang-bac`); `man11Layout.ts` (bố cục thuần) + test; `man11Anim.ts` (đổi sự kiện thành dòng thời gian) + test; `man11Engine.ts` (phát dòng thời gian, tạm dừng, cây đã hiện) + test; `man11Art.ts` (nạp hình, texture vẽ bằng canvas); `Man11Stage.tsx` (cảnh, chỉ vẽ bằng pool); `Match3Game.tsx` (vòng chơi, điều khiển, HUD, hết vòng); `match3Hint.ts` + test (câu nhắc).

**Bố cục (`Scene25D`, nền `scenes/man-11-goc-da`, `allowPortrait`: chơi được cả hai khung, không nhắc xoay):**
- Khung ngang 16 × 9: bàn 7 × 7 bên trái (cạnh ô 1,05 đơn vị: 42 điểm ảnh ở 640 × 360), cây bên phải (rộng 6,8; ảnh cây cắt theo phần có hình: u từ 0,225 đến 0,765, v từ 0,125 đến 0,9). HUD một hàng bốn ô ở mép trên: "Vòng", "Lượt còn", "Cây xong", "Điểm".
- Khung dọc 9 × 16: cây ở trên (rộng 6,4), bàn ở dưới (cạnh ô 1,12: 44,8 điểm ảnh ở 360 × 640, đạt yêu cầu ô lá ≥ 40 điểm ảnh). HUD hai hàng hai ô (cao 64 điểm ảnh) vì khung hẹp.
- Nút "?" của khung chơi (44 điểm ảnh cộng lề 8, góc trên bên phải) là vùng cấm. {phanDien} ló ra từ mép dưới khung, cạnh mép bàn (khung ngang: bên phải khay; khung dọc: góc dưới bên phải), rồi rụt lại.
- Test bố cục (`man11Layout.test.ts`) ở 360 × 640, 640 × 360, 844 × 390, 1366 × 768: khay bàn, cây, HUD, nút "?" nằm trong khung và không chồng nhau; 8 ô lá trên cây không chồng nhau và không chồng khay, HUD, nút "?"; {phanDien} lúc ló ra (nửa thân trên) không che ô lá, HUD, nút "?".

**Ô lá trên cây (`man11Slots.ts`):** tọa độ theo ẢNH cây (u, v), không phụ thuộc cỡ khung. Giá trị đầu tự đặt bằng cách xem ảnh: cây có 5 đầu mút mỗi bên, chọn 4 (bỏ cành nhỏ gần ngọn nhất, **tự chọn**) sao cho hai ô cạnh nhau cách ≥ 1 đơn vị. Chỉ số theo logic: ô (2k, 2k + 1) là anh em (gộp thành cành): (0, 1) hai đầu chạc dưới bên trái, (2, 3) đầu nhánh trên và cành nhỏ gần thân bên trái, (4, 5) và (6, 7) đối xứng bên phải. Vòng 1 (4 ô) dùng hai cặp thấp nhất, tức ô 0, 1, 6, 7 (**tự chọn**). Nút gộp (cành, gốc) nằm ở trung điểm hai nút con kéo về gốc 0,2 × mức (gốc đúng chỗ cành chia ra từ thân). Trang `/dev/man-11-slots` vẽ 8 ô và các nút gộp lên ảnh cây, chọn ô rồi bấm/kéo trên ảnh, khối mã xuất chép vào `TREE_SLOTS`. Ảnh 8 ô chồng lên cây: `docs/screenshots/b13/01-tam-o-chong-cay.jpg`.

**Bàn và diễn hoạt (`man11Anim.ts`):** bàn hiển thị gồm 49 miếng (mỗi miếng hai mesh: lá `ui/tiles/la-*`, lá giả `la-gia`, ô gió xoáy `o-gio`; hoa sen `o-hoa` vẽ phủ lên lá mang loại nên `o-hoa` và `o-gio` được tách nền như `la-*` trong `scripts/assets-build.mjs`). `planEvents(view, events, reduced)` đổi các sự kiện của MỘT thao tác thành dòng thời gian (khóa chuyển động từng miếng, lá bay, vòng nổ, độ ló của {phanDien}, mốc âm thanh và cây) và trả bàn hiển thị ở trạng thái cuối; cảnh lấy mẫu theo đồng hồ mỗi khung hình (`sampleTrack`), không cấp phát trong `useFrame`:

| Sự kiện của logic | Hoạt cảnh (bình thường) |
|---|---|
| `swap`, `swapBack` | hai ô đổi chỗ 160 ms; không tạo hàng thì đổi rồi trả về (160 ms nữa), không mất lượt, lời "Chưa tạo được hàng…" |
| `wave` | nghỉ 60 ms giữa hai đợt nổ liền nhau |
| `spawnLotus`, `spawnWind` | miếng đổi mặt thành hoa sen (phủ trên lá mang loại) hay gió xoáy, nảy phóng 1,32 lần |
| `clear` | các lá nổ 260 ms (phóng rồi nhỏ dần) kèm vòng nổ; hoa sen quét hàng ngang, trễ 30 ms mỗi cột |
| `fakeGone` | lá giả nhỏ dần cùng lúc với đợt nổ |
| `slotFilled` | một lá bay từ ô nổ lên đúng ô cây (560 ms, đường cong, xoay); mốc `slot` khi tới nơi mới hiện ô đầy |
| `branchMerged`, `treeDone` | cành nối mọc dần (170 ms mỗi mức), nút gộp hiện, gốc sáng lên (vầng vàng nhịp nhẹ) |
| `fall` | lá rơi 120 + 70 ms mỗi hàng (tối đa 430 ms), nảy khi chạm |
| `fill` | lá mới hiện dần và rơi từ trên đầu bàn |
| `throwFake` | {phanDien} ló ra (420 ms), vung tay (`swing`), lá giả rời tay và bay (460 ms) vào đúng ô logic chọn, ô đổi thành lá giả khi lá tới nơi, {phanDien} cười (`cheer`, 700 ms) rồi rụt lại |
| `shuffle` | các lá thu nhỏ rồi đổi mặt rồi lớn lại (340 ms) |
| `roundEnd` | mốc cuối của hoạt cảnh: hiện hộp hết vòng |

Test (`man11Anim.test.ts`, `man11Engine.test.ts`): 120 ván ngẫu nhiên × 80 nước (hợp lệ hay không), sau MỖI thao tác bàn hiển thị khớp bàn của logic (mặt, ô, độ lớn, độ trong), khóa theo thứ tự thời gian, đủ mốc, số lá bay bằng số sự kiện `slotFilled` và `throwFake`; "Giảm chuyển động" cho cùng bàn cuối và không dài hơn; lấy mẫu đầu và cuối khớp bàn trước và sau; tạm dừng thì đồng hồ, mốc và cây đứng yên.

**Cây:** mỗi ô có hình mờ loại lá cần (độ trong 0,42; đầy thì rõ và nảy). Hàng nổ loại X lấp ô thì một lá bay từ bàn lên ô đó. Hai ô anh em đầy thì hiện cành nối (đoạn xanh) và nút gộp; đủ cành thì gốc sáng lên; hộp hết vòng hiện dòng "Các lá gộp thành cành, cành gộp lên gốc — giống cây gộp sổ của làng Bạc!" (`match3Ui.cayGop`), thưởng xong cây (+200) và lượt dư (+20 mỗi lượt), nút "Vòng tiếp theo" ("Xem kết quả" ở vòng cuối). Hết lượt mà chưa đủ cây thì hộp nói "Hết lượt rồi, cây chưa đủ lá. Mình sang vòng sau nhé." (vẫn sang vòng sau, game không chặn đường).

**{phanDien}:** cứ 5 lượt (sau lượt thứ 5, 10, …; theo sự kiện `throwFake` của logic) model 3D `characters/ti` ló ra mép bàn, vung tay (`swing`), lá giả bay vào ô logic chọn, rồi `cheer`.

**Điều khiển:** kéo một ô sang ô kề (kéo quá 0,4 cạnh ô theo hướng nào thì đổi với ô kề hướng đó); hoặc chạm ô này rồi chạm ô kề (chạm lại ô đang chọn thì bỏ chọn); bàn phím: mũi tên di chuyển con trỏ, Enter hoặc Space chọn ô rồi mũi tên để đổi chỗ, Esc bỏ chọn. Ô đang chọn có viền tím dày, con trỏ bàn phím có viền nét đứt. Trong lúc diễn hoạt, khi hộp hết vòng mở hay khi tạm dừng thì không nhận thao tác. Lá giả: bấm đổi thì báo "Lá giả không đổi chỗ được." (không mất lượt).

**Hướng dẫn và câu nhắc (luật chung, spec 03 mục 3.8 và 6):** phần `man-11` của "Hướng dẫn chơi" (mục 11 của `content/huongDanGame.ts`): 4 trang (đổi ô; hàng nổ, hoa sen, gió xoáy; cây; lá giả), hình vẽ bằng code trong `GuideArt.tsx` (`doi-o-phim`, `doi-o-vuot`, `hang-no`, `cay-gop`, `la-gia-no`), có bản riêng cho điện thoại ở trang 1. Nút "?" (phím H) tạm dừng thật (đồng hồ hoạt cảnh đứng yên: đã kiểm trên trình duyệt) và hiện "Việc của em lúc này: …" từ `hintFor(state)` (chỉ trả khóa, `match3Hint.ts`, test 300 trạng thái ngẫu nhiên không chỉ ô, hàng, cột hay loại lá). Các câu nhắc, theo thứ tự ưu tiên:
- hết vòng: "Vòng này xong rồi. Bấm nút để sang vòng kế tiếp."; hết ván: "Ván này đã kết thúc.";
- còn ≤ 3 lượt: "Sắp hết lượt: ghép đúng loại lá cây còn thiếu.";
- có ô gió xoáy: "Ô gió xoáy: đổi chỗ nó với một lá để xóa mọi lá cùng loại với lá đó.";
- có hoa sen: "Hoa sen trên bàn: khi nó nổ sẽ xóa cả hàng ngang của nó.";
- có lá giả: "Lá giả của {phanDien} biến mất khi có hàng nổ ngay sát bên.";
- còn lại: "Đổi 2 ô kề nhau để có 3 lá cùng loại thẳng hàng. Nhìn cây: ô còn trống cần loại lá nào thì ưu tiên ghép loại đó."

**Màn kết quả:** điểm, mốc, và các phần: lá nổ (+1 mỗi lá), ô cây đã lấp (+50 mỗi ô), cây xong (n/3, +200 mỗi cây), lượt dư của cây xong (+20 mỗi lượt), lá giả đã gỡ (không điểm). Nút "Chơi tiếp" sang màn 12 (`nextReadyLevel(11)`).

**"Giảm chuyển động" và "Chữ to":** giảm chuyển động thì không nảy, không vòng nổ, lá bay thẳng (không cong, không xoay), lá nổ mờ dần nhanh, lá rơi bằng cách mờ ở chỗ cũ rồi hiện ở chỗ mới, mọi thời lượng ngắn hơn (`REDUCED` trong `man11Anim.ts`). Chữ HUD theo rem (≥ 14 điểm ảnh), nên "Chữ to" nhân lên cùng giao diện; lớp HTML phủ chỉ dùng viền và nền phẳng (không bóng đổ, không lọc).

**Mở khóa:** màn 11 mở khi xong bài học 10; màn 12 mở khi xong màn 11; Trang Sổ Vàng 4 VẪN chỉ trao sau màn 12 và cao trào (không đổi chỗ trao trang; test `unlock.test.ts`, `minimal.test.ts`). Nút "Chơi tiếp" ở bài 10 trỏ màn 11.

**Số đo (bước B13)** (bản build `VITE_PROBE`, Chrome d3d11, máy phát triển cắm điện, mỗi mức 1 lượt, chơi 10 đến 14 nước ở 1366 × 768):
- **Kích thước** (`pnpm build`): tổng JS của `apps/lang-bac` 1.934.258 → 1.989.334 byte (+55.076 byte, +2,8%; 29 → 33 tệp). Chunk `Man11` 43,40 kB (gzip 15,93 kB); `Scene25D` tách thành chunk riêng 71,26 kB (gzip 19,42 kB) dùng chung với màn 12 (trước đó nằm trong `Man12` 93,24 kB, gzip 28,41 kB; sau: `Man12` 30,01 kB, gzip 12,13 kB); `index` 285,84 → 288,86 kB (gzip 90,12 → 91,05 kB).
- **Khung hình** (rAF, 60 giây): trung bình 6,9 ms mỗi khung (màn hình thử chạy khoảng 144 Hz), p99 7,2 đến 7,3 ms, khung chậm nhất Thấp 27,6 ms, Vừa 8,2 ms, Cao 14,6 ms, không khung nào quá 50 ms; 63 đến 76 draw call, 126 đến 152 tam giác (hình phẳng) khi chưa có {phanDien}.
- **Bộ nhớ GPU và heap** (giữa vòng 1 và giữa vòng 3, rồi dựng lại cảnh 6 lần bằng "Chơi lại"): Thấp: giữa vòng 1 hình học 4, texture 21, draw call 63; giữa vòng 3 hình học 4, texture 21, draw call 71; sáu lần dựng lại (lần 2 đến 7) hình học 4, texture 21, draw call 60; heap 17.7 đến 27.1 MB; Vừa: giữa vòng 1 hình học 3, texture 20, draw call 63; giữa vòng 3 hình học 3, texture 20, draw call 78; sáu lần dựng lại (lần 2 đến 7) hình học 3, texture 20, draw call 60; heap 20.5 đến 25.9 MB; Cao: giữa vòng 1 hình học 3, texture 20, draw call 60; giữa vòng 3 hình học 3, texture 20, draw call 71; sáu lần dựng lại (lần 2 đến 7) hình học 3, texture 20, draw call 60; heap 20.9 đến 36.4 MB. Số hình học và texture đứng yên qua 6 lần dựng lại (không rò rỉ).
- Chơi thử trên trình duyệt ở 360 × 640, 844 × 390, 1366 × 768: chơi hết ba vòng với bot, có nổ dây chuyền, hoa sen, {phanDien} ném lá giả, "?" tạm dừng thật, kéo, chạm hai ô và bàn phím đều đổi được; không lỗi trong console. Ảnh ở `docs/screenshots/b13/`.

**Việc tự chọn (B13):** thời lượng hoạt cảnh và các hệ số trong bảng trên; cỡ khung ảnh từng mặt (`FACE_QUAD`) để phần có hình đầy khoảng 85% ô; hai hàng hai ô cho HUD khung dọc; vòng 1 dùng ô 0, 1, 6, 7 của cây; bỏ một đầu mút mỗi bên của cây; hộp hết vòng đặt đè lên bàn (sửa sau B13); lá giả bấm đổi thì báo lời nói (không mất lượt); HUD điểm và lượt cập nhật khi hoạt cảnh xong (lượt trừ ngay lúc đổi); `ui/tiles/o-hoa` và `o-gio` tách nền (đã chạy lại `pnpm assets:build`, chỉ hai tệp này đổi).

**Điểm chưa chắc:** chưa thử trên điện thoại thật (chỉ giả lập khung 360 × 640 và cảm ứng của Chrome); số đo khung hình ở máy phát triển, chưa phải điện thoại tầm trung. (Dải trắng ở nửa dưới ảnh nền `man-11-goc-da` đã được thay bằng mặt đất vẽ bằng code, xem mục "Sửa sau B13".)


### Sửa sau B13 (màn 11; ảnh ở `docs/screenshots/b13-sua/`)

1. **Màn kết quả "Điểm: 0": KHÔNG phải lỗi của game.** Ảnh `09-ket-qua-844x390` ở B13 chụp bằng móc dev `__match3Finish` gọi ngay lúc vào ván (chưa đi nước nào), nên điểm và mọi dòng đều 0. Chơi thật hết ba vòng thì điểm và thống kê vào `MiniGameLevel` đúng: bot giỏi (xong cả 3 cây) hay bot ngẫu nhiên (hết lượt ở vòng 3, cây thứ ba chưa đủ: "Điểm: 1.658" = 168 lá + 950 ô cây + 400 xong 2 cây + 140 lượt dư, `results[2] = { done: false, turnsLeft: 0 }`) đều đúng. Để khóa lại: kết quả tính ở hàm thuần `match3Result.ts` (`match3Summary`, cảnh dùng đúng hàm này) và `match3Result.test.ts` kiểm 180 ván của ba bot (điểm đưa vào = `state.score` = tổng các phần = lá × 1 + ô × 50 + cây × 200 + lượt dư × 20; số cây, lượt dư, lá giả đã gỡ khớp thống kê; có ván hết lượt ở vòng 3 mà cây chưa đủ). Móc dev mới `__match3Rush` tua bằng logic tới hết ván rồi chuyển kết quả THẬT sang màn kết quả (móc cũ `__match3Finish` chỉ để thử khung). Ảnh thật: `09-ket-qua-that-a-bot-gioi-844x390`, `09-ket-qua-that-b-het-luot-844x390`.
2. **Hộp "Cây xong rồi!" không che cây:** cây xong thì gộp cành và gốc sáng chạy hết, cây đầy được giữ `treeHold` = 1,4 giây (giảm chuyển động 0,5 giây) kể từ mốc gốc sáng, rồi hộp mới hiện (`man11Anim.ts`; `roundEnd` = lớn hơn của "mọi hoạt cảnh xong" và "mốc gốc sáng + treeHold"). Hộp đặt đè lên BÀN ở cả khung ngang lẫn khung dọc (giữa lưới 7 × 7, rộng bằng bàn). Đo trên trình duyệt: từ lúc gốc sáng tới lúc hiện hộp 1,38 đến 1,39 giây. Test: `man11Anim.test.ts` (hộp hiện sau gốc sáng ≥ treeHold).
3. **Mặt đất thay nửa dưới trắng của `scenes/man-11-goc-da`** (`man11Ground.ts`, `man11Art.ts`, `Man11Stage.tsx`): ảnh nền được vẽ trong cảnh (không qua `background` của `Scene25D`) sau khi bóc phần trắng nối với mép dưới (loang từ mép dưới, bóc thêm 2 điểm ảnh quanh để hết viền trắng nhạt, mờ mép 1 điểm ảnh; mây hay chỗ trắng khác không đụng); sau ảnh là mặt đất vẽ bằng code phủ cả khung: dải màu chuyển từ màu cỏ lấy ngay phía trên mép (cùng tông với cỏ của ảnh, sáng hơn 30% ở mép, tối dần xuống dưới), vài mảng đất, nét cỏ rải bằng hạt giống cố định. Gốc cây có bóng mờ dưới chân (elip đen mờ). Khung ngang {phanDien} nay đứng hẳn trên mặt đất (chân cao hơn mép dưới khung 0,4) và có bóng mờ dưới chân; khung dọc giữ kiểu ló ra ở mép dưới (chân nằm ngoài khung). Đo: ở 640 × 360, 844 × 390, 1366 × 768, 1024 × 768 (và 360 × 640) không còn khoảng trắng trong khung (số điểm ảnh gần trắng ≤ 0,024%: chỉ là lá nhạt, cánh hoa). Test `man11Ground.test.ts`.
4. **Nút của màn kết quả dùng chung** (`.mg-result-buttons` ở `theme.css`, điện thoại ngang thấp dưới 500 điểm ảnh): nhãn một dòng, không gãy chữ ("Chơi lại", "Chơi tiếp", "Về làng", "Xem lại cảnh cuối"): cỡ chữ 0,875rem (14 điểm ảnh, "Chữ to" nhân lên 16,1), lề ngang 8, `white-space: nowrap`, nút chia chỗ theo độ dài nhãn, không đủ chỗ thì xuống hàng cả nút. Trước sửa chữ 24 điểm ảnh gãy 2 đến 3 dòng (ví dụ "Xem lại cảnh cuối" thành 4 dòng ở 640 × 360). Đã kiểm màn 2, 3, 5, 6, 8, 9, 11, 12 ở 844 × 390 và 640 × 360 (màn 12 có nút thứ ba "Xem lại cảnh cuối": `/dev/minigame?level=12&finale=1`), và màn 12 với "Chữ to" ở 640 × 360: bảng không cuộn, nút nằm trong bảng.
5. **Gió xoáy:** móc dev `__match3PlaceWind(r, c)` dựng bàn có sẵn ô gió; ở bàn thử đổi gió ở (3, 3) với lá loại 5 ở (3, 4): bàn có 9 lá loại đó, đợt nổ đầu có đúng 10 ô (9 lá và ô gió), `windOf` = 5, 10 vòng nổ, mọi lá loại đó nổ cùng lúc, không lá loại khác (ảnh `05-gio-xoay-dang-no`). Test thuần `man11Anim.test.ts`: đợt nổ đầu xóa đúng mọi lá cùng loại và ô gió, mọi miếng đó mờ hẳn cuối đợt, bàn hiển thị cuối khớp logic.

## Màn 12 — Game phụ 2: "Leo cây tìm lá giả" (kiểu leo dây của Talking Tom) và cao trào

Logic đặt trong `climbLogic.ts` (hàm thuần, có test).

**Câu chuyện:** lái buôn phương xa vừa trả một khoản bạc lớn. {phanDien} tráo một chiếc lá giao dịch trên cây đa để khoản bạc chảy về túi mình, nên số gốc báo lệch. Học sinh leo từ gốc lên, lần theo nhánh lệch để bắt {phanDien}.

### Dựng bằng `Scene25D` (khung dọc, camera đi theo người chơi lên trên)

- **Thân cây:** ghép nối từ `sprites/man-12-leo-cay/than-cay` theo chiều dọc; dưới cùng là `goc-cay`, trên cùng là `ngon-cay`.
- **Mỗi tầng:** thanh `canh-ngang`; hai tay nắm dùng `tay-nam`, số ghi trên tay nắm do code vẽ.
- **Nền trời:** code vẽ dải màu chuyển; tiền đồng dùng `ui/icons/tien-dong`.
- **Học sinh:** model 3D, tư thế `hang` dựng bằng code (clip `idle` cộng tư thế treo, xem spec 03 mục 3.3; clip `hang` trong file model sai nên không dùng) khi đang treo, clip `jump` khi bật lên.
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
| Bạc | 450 |
| Vàng | 570 |

**Nghĩa của mốc** (đổi ở bước sửa sau B4; điểm hoàn hảo là 586 = 400 + 36 đồng + 150 điểm tim):
- **Đồng (250):** qua được 3 vòng (3 × 100 cộng đồng nhặt được); hết tim ở vòng 4 vẫn được Đồng (324 điểm khi nhầm 3 lần ở tầng đầu vòng 4).
- **Bạc (450):** leo hết 4 vòng, nhầm nhánh tối đa 2 lần (hai ngõ cụt: 482 điểm; ba ngõ cụt đã hết tim nên không leo hết 4 vòng).
- **Vàng (570):** không nhầm nhánh lần nào (586). Trượt (không nắm được gì) chỉ mất 2 đồng mỗi lần nên vẫn còn Vàng khi trượt tối đa 8 lần.
- Hết tim ở vòng 3 (mới xong 2 vòng) là 214 điểm: chưa đạt mốc.

### Cảnh cao trào (sau màn 12, bỏ qua được)

Chạy ngay sau khi màn 12 kết thúc (hết vòng 4, hoặc hết tim sau khi Bi nói "Để Bi giúp em!") và trước màn kết quả. Mọi bước có nút "Bỏ qua" (kết thúc cả cảnh). Code: `packages/village-lang-bac/src/climax/` (`climaxFlow.ts` thuần có test, `ClimaxScene.tsx`), chữ ở `content/climax.ts` (lời ảnh truyện 10 và 11 lấy từ `content/story.ts`, cùng chữ với `/truyen`), nối vào `pages/Man12.tsx` qua `finale` của `MiniGameLevel`.

1. **a.** Ảnh truyện số 10 kèm lời ({phanDien} tráo một chiếc lá giao dịch… con số gốc đã báo lệch…).
2. **b.** Cảnh 3D nhỏ dưới gốc đa (`Scene25D`, nền `scenes/bai-hoc-lang-bac`): học sinh, {phanDien} (tư thế `sad`, cúi đầu, lặp mỗi 1,4 giây cho tới hết lượt; nhảy cẫng `cheer` khi nói "Có ạ!"), cụ Bình và thầy Linh (nhân vật không xương, nhún nhẹ, nghiêng đầu khi nói; spec 03 mục 3.4). Lời qua `VnDialog` có chân dung: {phanDien} cúi đầu: "Sửa trang thì cả chuỗi lệch, gian thì mất cọc, giả dấu thì bị soi ra, tráo lá thì số gốc đổi… Hóa ra làm thật mới có lời."; cụ Bình: "Biết sai thì sửa. Làng đang cần thêm người giữ sổ cẩn thận. {phanDien} có muốn làm không?"; {phanDien}: "Có ạ!".
3. **c.** Ảnh truyện số 11 kèm lời ("Hóa ra làm thật mới có lời." {phanDien} xin được làm người giữ sổ của làng).
4. **d.** Thầy Linh trao **Trang Sổ Vàng thứ tư**: hàng 4 ô (`GoldenPagesRow`, trang bay vào ô thứ 4; "Giảm chuyển động" thì nằm sẵn); Bi nói theo cờ `FESTIVAL_LAUNCHED` (`config/festival.ts`): `false` (mặc định, hội làng chưa làm, mốc 4) thì "Đủ 4 trang rồi! Cả làng đang chuẩn bị mở hội." kèm dòng "Hội làng sắp mở"; `true` (bước H1 bật) thì "Đủ 4 trang rồi! Cả làng đang mở hội." và bỏ dòng "Hội làng sắp mở". Nút lượt cuối "Xem kết quả".

**Tự chạy một lần, xem lại được:**
- Cờ `climaxSeen` (`progress/gameTips.ts`; `game_state.data.climaxSeen`; chơi thử: bit 12 của trường "gt" trong cookie `sc_guest`; hợp cờ khi gộp tiến độ). Hết cảnh hay bấm "Bỏ qua" đều ghi cờ. Lần đầu cảnh tự chạy; những lần sau không tự chạy, màn kết quả có nút "Xem lại cảnh cuối" (xem lại thì không ghi cờ và luôn có bước d).
- Sau cảnh là màn kết quả của `MiniGameLevel` như thường; "Về làng" mở `/cho?tu=lang-bac`.

**Trang Sổ Vàng thứ tư:**
- Trao khi đã xong màn 10 và đã chơi màn 12 (kể cả hết tim: `doneLevels` tính game đã chơi). Giá trị `golden_pages` = 4 được ghi cùng kết quả ván, TRƯỚC cảnh, nên đóng tab giữa cảnh vẫn giữ trang. Chỉ hiện ở HUD thế giới mở khi người chơi về làng.
- Xong màn 10 mà chưa chơi màn 12: chưa có trang 4.
- Tài khoản đã có trang 4 từ trước (luật mốc 1): giữ nguyên số trang, không trao thêm. (P3a hoàn thiện: bước d là cảnh trao trang nên có ở LẦN XEM ĐẦU của mọi tài khoản, tức khi cờ `climaxSeen` chưa có, và ở lần xem lại; trước đó bước d bỏ khi đã có trang 4 trước ván. **Tự chọn**: một cờ duy nhất quyết định, không trao hai lần.)

**Các làng vào độc lập (P3a): màn 12 xong trước các làng khác.** Cổng làng mở từ đầu nên màn 12 có thể xong khi còn làng chưa xong (chưa đủ 4 trang):
- Kết quả màn 12 vẫn được ghi như thường. Cảnh cao trào CHỈ chiếu khi đã đủ 4 trang và đã chơi màn 12 (`progress/climaxState.ts`: `canWatchClimax`; `MiniGameFinale.ready`), nên không bao giờ nói "đủ 4 trang" khi chưa đủ; chơi màn 12 lúc chưa đủ trang thì đi thẳng tới màn kết quả.
- Khi làng còn thiếu xong về sau (các trang tới cùng lúc), KHÔNG phải chơi lại màn 12: cảnh "đang chờ" (`climaxPending` = xem được và chưa có cờ `climaxSeen`) hiện ở ba chỗ, đều là thao tác của em, không tự ngắt ván hay hộp phản hồi đang mở: (1) màn kết quả của game vừa làm đủ trang: lời báo và nút "Xem cảnh cuối" (`MiniGameLevel`); (2) bảng Làng Bạc ở `/ban-do`: nút "Xem cảnh cuối" (đã chiếu rồi thì "Xem lại cảnh cuối"); (3) dòng nhiệm vụ ở chợ nhắc "Cảnh cuối đang chờ em" (ngoài làng).
- Hai nút mở `/lang/lang-bac/man/12?canh=cuoi` (`openClimax`, `climaxPath` ở `config/urls.ts`): trang này chiếu thẳng cảnh (không vào game), hết cảnh hay "Bỏ qua" thì về `/ban-do`. Lần xem đầu (cờ chưa có): có bước d và ghi `climaxSeen` khi hết hay "Bỏ qua"; tải lại giữa cảnh thì cờ chưa ghi nên cảnh vẫn đang chờ. Xem lại: không ghi gì. Lượt chiếu đầu/xem lại được chụp lúc vào trang để cờ `climaxSeen` đổi giữa cảnh không làm số bước đổi theo (lỗi đã gặp khi kiểm: bước d biến mất lúc đang chiếu làm `ClimaxScene` lỗi; nay chụp lúc vào trang và `stepAt` kẹp chỉ số).
- Đi theo thứ tự thường (màn 12 là màn cuối): giữ nguyên, cảnh tự chiếu sau ván rồi mới tới màn kết quả.
- Ở thế giới mở, Làng Bạc không chiếu thêm cảnh trao trang riêng (`VILLAGE_SCENE` không có `lang-bac`).

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
- Cảnh: cây ghép từ `than-cay` (cắt bỏ hai đầu tròn), `goc-cay` dưới cùng, `ngon-cay` trên cùng; mỗi tầng một `canh-ngang`, tay nắm `tay-nam` (tầng lá dùng `ui/tiles/la-da`), {phanDien} trên ngọn ôm `ui/tiles/la-gia`. Hai hình lá (`ui/tiles/la-gia`, `la-da`) in sẵn nền trắng vào ảnh nên `pnpm assets:build` tách nền (xem spec 01); vẫn còn một vệt bóng xám nhạt dưới lá. Khoảng cách tầng 3,6 đơn vị; camera đi theo tầng người chơi đang giữ (Giảm chuyển động: nhảy thẳng).
- Nhãn trên tay nắm: hai dòng "Sổ: …" / "Nay: …" cùng màu, không đánh dấu nhánh nào lệch. Đo: 17,3 px ở 360 × 640 và 844 × 390, 36,3 px ở 1366 × 768 (không dưới 14 px, "Chữ to" nhân 1,15).
- Cú bật nhận ở `pointerdown` và `keydown` (Space không cuộn trang). Nắm được thì tay nắm kéo về giữa thân trong 0,3 giây (chỉ là hình). Ngõ cụt: "Ngõ cụt!", {phanDien} `cheer`, nhân vật tụt về. Bắt được: {phanDien} `jump`, sau 1,1 giây hiện "Bắt được {phanDien}!" và "Em chỉ leo d tầng thay vì kiểm tra cả 2^d lá!".
- Lần đầu vào màn Bi nói câu "Trên bảng thì gốc vẽ ở trên cùng…"; cờ `gameTipSeen` (`progress/gameTips.ts`, cookie `gt`, bit số màn − 1).
- **Tư thế treo (sửa sau B4, chỉnh lại ở B5):** clip `hang` trong file `hoc-sinh-nam` sai (ở `/dev/3d` cho tư thế ngồi co, tay ôm mặt) nên màn 12 dùng tư thế `hang` dựng bằng code (spec 03 mục 3.3): xương đòn nâng 30°, hai tay giơ thẳng, khuỷu thẳng, hai bàn tay khép lại nằm hẳn trên đỉnh đầu, thân thẳng, chân thả lỏng, đung đưa ±4° (tắt khi Giảm chuyển động). Hai lòng bàn tay (cao 0,985 × chiều cao) nắm vào đáy thân đèn lồng của `tay-nam`, ở dưới thanh 0,95; đầu nằm hẳn dưới đèn; chân ở `feetY(k)`.

**Cân bằng (300 ván mỗi bot, seed 1 đến 300, mốc 250 / 450 / 570):**

| Bot | Điểm trung bình | Chưa đạt | Đồng | Bạc | Vàng | Hết tim |
|---|---|---|---|---|---|---|
| Giỏi: lệch giờ σ 0,04 giây, không đọc nhầm | 586 | 0% | 0% | 0% | 100% | 0% |
| Trung bình: lệch giờ σ 0,12 giây, đọc nhầm số 10% số lần | 441,9 (2 đến 586) | 12,0% | 18,7% | 55,7% | 13,7% | 30,7% |

Bot giỏi 100% Vàng (có assert). Bot trung bình chỉ in bảng tỉ lệ, KHÔNG assert ngưỡng Đồng/Bạc ≥ 80% và Vàng < 10% cho màn này: ngưỡng chỉnh khi học sinh chơi thật. Kết quả do số lần đọc nhầm số quyết định (mỗi lần mất 1 tim và có thể hết tim); lệch giờ gần như không đổi kết quả vì trượt chỉ mất 2 đồng.

## Checklist nghiệm thu

- [ ] Test Bài 4 (giai đoạn 1), `match3Logic` và `climbLogic` đều ✅.
- [ ] Màn 10: bẫy thứ tự T21 chạy đúng; ánh đỏ chạy đúng đường từ thẻ bị tráo lên gốc.
- [x] Màn 11 (bước B13):
  - đổi ô mượt, nổ dây chuyền đúng (diễn hoạt theo đúng danh sách sự kiện của logic, test 120 ván ngẫu nhiên: bàn hiển thị luôn khớp bàn của logic);
  - lá giả chỉ mất khi có hàng nổ sát bên;
  - cây lấp ô đúng loại lá (lá bay lên đúng ô, cây chỉ hiện khi lá tới nơi).
  - **luật chung (bước HD, spec 03 mục 3.8 và 6):** có phần hướng dẫn riêng mở từ thẻ bắt đầu; nút "?" (phím H) trong lúc chơi với `hintFor(state)` không lộ đáp án và tạm dừng thật; nút "Chơi tiếp" ở màn kết quả (hết màn trong làng thì "Về làng").
- [ ] Màn 12:
  - canh nhảy chọn nhánh được trên cả điện thoại lẫn máy tính;
  - con số khó dần qua 4 vòng;
  - hết tim vẫn xem được cao trào.
  - [x] **luật chung (bước HD, spec 03 mục 3.8 và 6):** có phần hướng dẫn riêng mở từ thẻ bắt đầu; nút "?" (phím H) trong lúc chơi với `hintFor(state)` không lộ đáp án và tạm dừng thật; nút "Chơi tiếp" ở màn kết quả (hết màn trong làng thì "Về làng"). (đã làm ở bước HD: phần `man-12`, `climbHint.ts`; màn kết quả chỉ có "Chơi lại", "Về làng" và "Xem lại cảnh cuối" vì màn 11 chưa ra mắt.)
- [ ] Sau cao trào: có đủ 4 Trang Sổ Vàng, chuyển sang hội làng.

# Giấc mơ Sổ Chung — hướng dẫn cho AI code

Game phiêu lưu 3D trên web dạy blockchain cho học sinh THPT: 12 màn ở 4 làng, có đăng nhập Supabase và trang giáo viên.
File này khớp với `GEMINI.md` (cùng nội dung, chỉ khác dòng tiêu đề; Gemini CLI không đọc CLAUDE.md nên `GEMINI.md` cũng tự đủ). Sửa một file thì sửa cả hai.

## 1. Đọc trước khi làm
- `docs/specs/00-HUONG-DAN-DU-AN.md`, rồi đúng file spec của việc được giao. Spec 03 là nền tảng cho mọi màn. Làm đúng spec; không tự thêm tính năng ngoài spec.
- Luật và số liệu của 4 bài học: spec giai đoạn 1 trong `docs/specs/giai-doan-1/`. Triển khai: `docs/DEPLOY.md`.

## 2. Lệnh
- `pnpm install` · `pnpm test` · `pnpm typecheck` · `pnpm build` · `pnpm check:text` · `pnpm crop-portraits`
- `pnpm guide:capture` (chụp ảnh thật cho Hướng dẫn chơi vào `assets/ui/huong-dan`, rồi `pnpm assets:build`)
- `pnpm dev:hub` (5173), `pnpm dev:lang-giay` (5174), `pnpm dev:lang-det` (5175), `pnpm dev:lang-khac-dau` (5176), `pnpm dev:lang-bac` (5177), `pnpm dev:assets` (5180)
- `pnpm assets:build`: nén đồ họa vào `assets-build/` và tạo `manifest.json`. `pnpm rls:check`: kiểm RLS Supabase.

## 3. Cấu trúc
- `apps/hub`: web chính, trang `/cho` là thế giới mở (chợ + 4 làng trong một cảnh, `packages/core/src/three/world/`). `apps/lang-*`: vỏ chạy riêng từng làng, chỉ còn trang bài học và game (`/` và `/lang/<id>` chuyển sang `/cho?tu=<id>` ở hub).
- `packages/core`: giao diện, động cơ 3D, đăng nhập, tiến độ, câu hỏi, logic 4 bài.
- `packages/village-*`: nội dung từng làng, export `VillageModule` (trang bài học, game, route).
- `supabase/`: migrations SQL, edge functions.

## 4. Đồ họa
- Bản gốc nằm ở `assets/` (không đưa lên Git). Chạy `pnpm assets:build`, rồi commit `assets-build/`.
- Tìm file theo đường dẫn không kèm đuôi file, có trong `manifest.json`. Danh sách chuẩn: `docs/danh-sach-assets3.txt`.
- Nhân vật: xem `docs/specs/03-dong-co-3d-giao-dien-chung.md` mục 3.
  - Chỉ hoc-sinh-nam, ti, dan-lang-ba-cu, dan-lang-nong-dan có xương Mixamo.
  - Clip tìm theo từ khóa.
  - sad, point, slide, swing, hurt do code dựng.

## 5. Quy tắc bắt buộc
- Lời thoại và câu hỏi KHÔNG viết cứng tên phản diện; dùng `{phanDien}` lấy từ `content/characters.ts`.
- Dùng lại logic có sẵn trong `packages/core/src/lessons/`. KHÔNG viết lại công thức.
- Mọi hàm logic game là hàm thuần, có test vitest. `pnpm test` phải xanh trước khi báo xong.
- Chữ trên giao diện là tiếng Việt có dấu, xưng "em" với học sinh. Không có chữ trong ảnh (kể cả hình SVG hướng dẫn).
- MỌI chữ hiển thị (lời thoại, nút, thông báo, nội dung bài) nằm trong `packages/core/src/content/`. Không viết chữ tiếng Việt thẳng trong component. `pnpm check:text` phải sạch (chữ trong mã dev viết tiếng Anh).
- Đồ họa tải theo `manifest.json` từ `VITE_ASSETS_URL`. Thiếu file thì hiện hình thay thế, không được lỗi trang.
- Hiệu năng: mức Thấp ≥ 30fps trên điện thoại tầm trung; không tạo object mới trong `useFrame`; rời cảnh thì dispose (hình học, vật liệu, texture, `ImageBitmap`).
- Supabase: chỉ dùng anon key ở frontend. Thay đổi cơ sở dữ liệu viết thành file migration mới. Không tắt RLS.
- Không thêm server riêng, quảng cáo hay công cụ theo dõi. Bí mật để trong `.env.local`, không commit.
- Lớp HTML phủ lên cảnh 3D hay 2.5D (HUD, `Scene25D` overlay, bản đồ nhỏ) KHÔNG dùng `box-shadow`, `text-shadow`, `filter`: mỗi lần phần tử đổi, GPU phải vẽ lại bóng/lọc trên nền WebGL. Dùng viền và nền phẳng.
- Cài đặt phải được tôn trọng: "Chữ to" (cỡ chữ theo rem, khung nhân 1,15), "Giảm chuyển động" (không nhấp nháy, không hiệu ứng bay). Giáo viên thấy mọi thứ đã mở và không bị chặn.
- Tiến độ lưu ở `game_state.data` (tài khoản) và cookie `sc_guest` (chơi thử, trường viết tắt trong `progress/compact.ts`); thêm cờ mới thì sửa cả `compact.ts`, `merge.ts` (hợp cờ hai bên), `manager.ts` và có test.

## 6. Bản đồ code sau mốc 2
Đường dẫn dưới đây tính từ `packages/core/src/` trừ khi ghi khác.
- **Thế giới mở** `three/world/`: `WorldPage.tsx` (trang, HUD, nhiệm vụ, hộp thoại, tiến độ), `WorldScene.tsx`, `WorldTerrain.tsx` (đất, đường, sông, cầu), `worldLayout.ts` (`assembleWorld`: chợ, 4 làng, sông, đồ đất hoang), `worldFrames.ts` (hệ tọa độ làng: cổng cách tâm chợ 72, chỗ dành mỗi làng bán kính 125, tâm cách chợ 197; `placeVillage` đổi bố cục làng sang tọa độ thế giới), `river.ts`, `worldTargets.ts` + `worldQuest.ts` + `roadGraph.ts` (đích, mũi tên dưới chân theo đường), `VillageFar.tsx` (hình làng nhìn từ xa).
- **Vùng làng** (tải, dọn, chuẩn bị): `WorldTracker.tsx` + `worldZones.ts` (tải khi cách rìa < 50, dọn khi > 90 sau 3 giây; chuẩn bị sẵn khi < 56, bỏ khi > 100; làng của nhiệm vụ luôn được chuẩn bị), `VillageZone.tsx` (dựng vùng theo giai đoạn, mỗi giai đoạn một khung hình), `ZonePrewarm.tsx` + `warm.ts` (tải model, nướng hình học, đẩy texture lên GPU mỗi khung một cái, biên dịch shader mỗi khung một vật liệu). Model dùng chung qua `three/modelLoader.ts` (đếm `retainModel`/`releaseModel`, dọn sau vài giây) và `three/cho/ModelInstances.tsx` (nhân bản InstancedMesh, bộ nhớ đệm hình học đã nướng).
- **Làng** `three/village/` và `three/world/villages/`: `villageLayout.ts` (kiểu `VillageLayoutInput`: nhà, biển, người dẫn, dân làng, đường đất/gạch, ao, ruộng, lũy tre, đồ rải, thẻ, đường cho mũi tên), `villages/giay.ts` (MẪU làng dựng đủ) + `giay.test.ts`, `villages/minimal.ts` (làng tạm), `villages/index.ts` (`LOCAL_VILLAGES`), `scatter*.ts` + `ScatterProps.tsx` + `ChunkedInstances.tsx` (đồ rải dựng bằng code, chia mảnh theo ô lưới, vẽ theo tầm), `VillageBoards.tsx`.
- **Thẻ "Em có biết?"**: `content/knowScrolls.ts` (chữ), `content/villageCards.ts` (thẻ lấy từ bài học), `progress/knowCards.ts` (cờ theo bit), `three/village/KnowScrolls.tsx` + `scrollTargets.ts` (cuộn giấy, cột sáng), `ui/EmCoBietDialog.tsx`, `ui/KnowCollectionDialog.tsx`. Chặn biển bài, mũi tên, Bi gợi ý khu, `/ban-do` đọc thẻ: đã làm chung cho mọi làng có `scrolls`.
- **Bản đồ nhỏ và lớn** `three/world/map/`: `mapProjection.ts`, `mapMarkers.ts`, `mapProgress.ts`, `mapGeometry.ts`, `miniMapFrame.ts` (hàm thuần có test), `MiniMap.tsx`, `BigMap.tsx`, chữ ở `content/minimap.ts`. Phím M ở `three/WalkControls.tsx`; vị trí người chơi đọc từ `WalkApi.player`.
- **Cảnh 2.5D và trang bài học**: `three/scene25d/Scene25D.tsx` (camera trực giao, hình rời 2D, nhân vật 3D), `lesson2d/` (trang bài học 2D). **Khung màn chơi**: `ui/MiniGameLevel.tsx` (thẻ bắt đầu, câu hỏi, màn kết quả, huy chương `games/medals.ts`).
- **Mẫu game**: `packages/village-lang-giay/src/runner/` (màn 2, chạy 3D: `runnerConfig`, `runnerLogic`, `runnerSession`, `testBots`, `runnerBalance.test`, `RunnerGame.tsx`) và `src/rebuild/` (màn 3, 2.5D: `rebuildConfig`, `rebuildLogic`, `rebuildBots`, `rebuildBalance.test`, `RebuildGame.tsx`).
- **Đồ vật động**: `three/DynamicInstances.tsx` (`DynamicModel`, `DynamicBoxes`: InstancedMesh tạo sẵn sức chứa, bật/tắt bản theo lệnh, không cấp phát trong `useFrame`).
- **Cỡ và va chạm**: `three/modelSizes.ts` (`MODEL_SIZES`: chiều cao thật, `dims`), `three/cho/footprints.ts` (chân tường thật của model làm vật cản; sinh lại: `GEN_FOOTPRINTS=<file.json> pnpm vitest run footprintGen`), `three/collision.ts`. Xem vật cản bằng `?debug=colliders`.
- **Chữ** `content/`: `ui.ts` (chữ chung), `levels.ts` (12 màn, tên, chữ biển, `status`), `dialogues.ts`, `story.ts`, `characters.ts` (`{phanDien}`, `fmt`), `games.ts`, `villageScene.ts`, `villageIntro.ts`, `huongDan.ts` (Hướng dẫn chơi), `minimap.ts`, `lessons/`. Hướng dẫn chơi thêm phần mới ở CUỐI `GUIDE_SECTIONS` (cờ lưu theo bit).
- **Tiến độ** `progress/`: `unlock.ts` (mở màn, cổng), `manager.ts`, `merge.ts`, `compact.ts`, các cờ (`knowCards`, `guideFlags`, `villageIntro`...).

## 7. Làm một game mới theo mẫu màn 2, 3
1. Thư mục `packages/village-<làng>/src/<game>/`. `<game>Config.ts`: số liệu đúng spec (mốc Đồng/Bạc/Vàng, tim, thời gian) kèm chú thích; số spec chưa nói ghi riêng và báo "tự chọn".
2. `<game>Logic.ts`: hàm thuần, trạng thái trong một đối tượng, bước thời gian `step(dt)` trả về sự kiện; số ngẫu nhiên từ `createMulberry32(seed)` (`lib/rng`) để cùng seed cùng kết quả; dùng lại công thức ở `core/src/lessons/`.
3. `<game>Logic.test.ts` theo BẢNG TEST trong spec của màn (mỗi dòng bảng một ca), thêm ca tất định theo seed.
4. Mô phỏng cân bằng: `<game>Bots.ts` + `<game>Balance.test.ts`, 300 ván mỗi bot (seed 1 đến 300), chỉ dùng thao tác của học sinh. **Bot giỏi ≥ 90% Vàng; bot trung bình chủ yếu Đồng/Bạc, hầu như không Vàng.** Ghi tỉ lệ hết tim và phân bố mốc vào test và spec; chưa đạt thì báo số thật, không giấu, không tự đổi luật. Đổi cấu hình thì chạy lại và cập nhật số.
5. Giao diện: bọc trong `ui/MiniGameLevel.tsx` (thẻ bắt đầu, nút "Hướng dẫn chơi", màn kết quả, ghi kết quả bằng `progress/record.ts`). Cảnh 3D chạy dùng `Scene3D`; cảnh 2.5D dùng `Scene25D`.
6. **Nạp trước**: ảnh nền, hình rời và model nạp xong trước khi tắt màn hình tải, rồi `SceneWarmup` (`?warmup=off` để kiểm). Thiếu file thì ô màu thay thế.
7. **Lớp chặn lỗi 3D**: mọi Canvas bọc `CanvasErrorBoundary` (thử bằng `?loi3d=1`); rời cảnh thì dispose, dựng lại cảnh 6 lần phải không tăng texture, geometry, draw call.
8. Nối vào làng: trang `pages/ManN.tsx` (tải lười), route ở `src/index.ts`, đổi `status` màn sang `'ready'` ở `content/levels.ts`, chữ vào `content/games.ts`, thêm phần Hướng dẫn chơi nếu cần, cập nhật spec của màn.

## 8. Thêm một làng vào thế giới theo mẫu Làng Giấy
1. Viết `three/world/villages/<làng>.ts` theo `giay.ts`, hệ tọa độ làng: +Z là bắc, tâm (0, 0), cổng ở (0, −125), bán kính 125, lũy tre ở 122. Gồm: nhà (`placements`), `props`, 3 `boards` (bài học + 2 game, đúng số màn ở `levels.ts`), `guide`, 5–6 dân làng đi lại (`villagers`), `roads` (`dat`, `gach`), `ponds`, `fields`, `scatter` (tre, cây, đồi), `wall` (lũy tre, chừa lối quanh cổng), `scrolls` (thẻ), `paths` (đường cho mũi tên), `yards`, `start` (chỗ `?tu=`), `seed`. Đăng ký ở `villages/index.ts` thay `minimalVillage`, và bỏ làng đó khỏi `wildlands()` ở `worldLayout.ts` (hiện chỉ bỏ `lang-giay`).
2. **Footprint va chạm**: model mới thì thêm cỡ vào `MODEL_SIZES` và sinh footprint (`footprints.ts`); vật cản tự dựng ở `assembleVillage`. Test như `giay.test.ts`: không đồ nào chồng nhau, mọi đích đi được (dò lưới bước 1), lũy tre kín khi bịt cổng, dân làng không xuyên vật cản.
3. **Thẻ "Em có biết?"**: đặt 4 cuộn ở 4 khu xa nhau (`scrolls: { index, x, z, zone }`), thêm khóa khu vào `knowScrollUi.khu` (`content/knowScrolls.ts`). Không viết thêm mã chặn, mũi tên, lưu cờ (dùng chung).
4. **Biển gỗ**: trạng thái lấy từ `unlock`; chữ biển ở `levels.ts` (`bien`, có thể có `{phanDien}`).
5. **Đồ thị đường**: `paths` (`VillagePaths`) khai báo các nút và đoạn nối trong làng, `entry` (nối cổng), `boardJoin` (nối các biển), `guideStand` (chỗ đứng trước người dẫn), `scrollStands` (cạnh từng thẻ); chỗ đứng trước biển tính tự động từ `boards`. `buildWorldGraph` tự gắn vào đồ thị thế giới; mũi tên dưới chân và điểm đến trên bản đồ nhỏ đi theo đó. Test: mọi nút nối được với vòng đường quanh cây đa.
6. **Bản đồ nhỏ**: tự có từ bố cục (đường, ao, nhà, viền, biển, thẻ, cổng); chỉ thêm tên ngắn ở `content/minimap.ts` (`tenNgan`) nếu tên mới. Chụp ảnh kiểm ở chợ, giữa đường, trong làng.
7. Cảnh mở đầu và người dẫn: `content/villageScene.ts`, `content/villageIntro.ts`; Trang Sổ Vàng và mở cổng theo `unlock.ts`.
8. Ngân sách (mục 9): đo ở cả 3 mức; chỉnh `VILLAGE_MODEL_MAX_DISTANCE` và `SCATTER_MAX_DISTANCE` nếu vượt. Làng chỉ dùng đồ rải dựng bằng code cho tre, cây, phên; chỉ dùng model cho nhà, cây đa, giếng, lều.

## 9. Ngân sách và quy trình đo
- **Tam giác** ở MỌI chỗ đứng (quét lưới trong làng, chợ, đường, cầu, sông): Thấp ≤ 270.000; Vừa < 1.000.000; Cao < 1.500.000.
- **Tải**: lần đầu vào `/cho` ≤ 25 MB; mỗi vùng làng tải thêm ≤ 15 MB. Cloudflare không cache `.glb` mặc định (xem `docs/DEPLOY.md`).
- **Khựng khi từ ngoài vùng tải đi vào làng**: tối đa 1 khung > 50 ms, không khung nào > 100 ms (đặt người chơi ngay ngoài vùng tải rồi chạy vào).
- **Bộ nhớ**: vào/ra làng 10–20 lần: số `geometries` và `textures` (`renderer.info.memory`) phải đứng yên sau vài lần đầu, heap tăng ≤ 0,3 MB mỗi lần (thu gom rác trước khi đọc). Làng của nhiệm vụ được `ZonePrewarm` cố ý giữ model, nên đo thêm với nhiệm vụ ở làng khác.
- **Cách đo**: bản BUILD, không đo trên máy chủ dev. `cd apps/hub && VITE_PROBE=true npx vite build --outDir dist-probe`, rồi `npx vite preview --outDir dist-probe --port 5190 --strictPort`, cùng `pnpm dev:assets` (5180). Máy CẮM ĐIỆN, đóng ứng dụng nặng. Mỗi mức chất lượng (`?q=low|medium|high`) đo TỐI ĐA 2 lượt hợp lệ; lượt hỏng do mạng hay trình duyệt chết thì chạy lại, không tính. Báo cả trước và sau khi đổi.
- **Công cụ**: `puppeteer-core` (đã có ở root) điều khiển Chrome; viết script đo ở thư mục tạm NGOÀI repo, không commit. Chỉ khi build có `VITE_PROBE` hay chạy dev mới có `window.__marketStats` (tam giác, draw call, geometries, textures), `__walkPlayer` (x, z, yaw; đổi vị trí để đặt chỗ đứng), `__walkApi`, `__world`, `__worldInteractables`, `__r3f` (scene, gl). Khóa chuột giả: ghi đè `Element.prototype.requestPointerLock`. Khung hình: bọc `requestAnimationFrame` ghi hiệu thời gian.
- Đo xong **tắt server nền** (5173–5177, 5180, 5190…) và xóa thư mục build thử `dist-probe*` (đã có trong `.gitignore`).

## 10. Tham số dev và trang thử
- Địa chỉ `/cho`: `?q=low|medium|high` (ép mức chất lượng), `?tu=<id làng>` (xuất hiện trong làng, cạnh biển), `?mo=<id làng>` (cách cổng 8,5 nhìn vào cổng, để thử hiệu ứng mở cổng), `?cam=top|oblique|free` (góc nhìn cố định để chụp; `free` đặt `window.__freeCam = {x,y,z,tx,ty,tz}` khi có PROBE), `?debug=colliders` (vẽ vật cản), `?loi3d=1` (ép lỗi 3D, chỉ khi chạy dev), `?warmup=off` (tắt `SceneWarmup`).
- Trang thử chỉ có khi chạy dev: `/dev/assets`, `/dev/ui`, `/dev/nen`, `/dev/minigame`, `/dev/guide`, `/dev/3d`, `/dev/25d`, `/dev/walk`, `/dev/portraits`, `/dev/ban-do-hotspots`. Trang người chơi: `/ban-do` (bản đồ 2D đi nhanh).
- `pnpm guide:capture`: tự chụp ảnh thật cho Hướng dẫn chơi bằng Chrome (tự bật máy chủ dev còn thiếu); sau đó `pnpm assets:build`.
- `pnpm assets:build` cần chạy lại khi đổi đồ họa gốc; commit `assets-build/`.

## 11. Môi trường Windows
- Shell có thể là Git Bash hoặc PowerShell. KHÔNG dùng heredoc dài hay chuỗi có dấu huyền (backtick), dấu nháy lồng, tiếng Việt có dấu trong lệnh shell: ký tự hay bị nuốt hay đổi. Ghi file bằng công cụ ghi file; sửa hàng loạt bằng một file `.cjs` ghi bằng công cụ ghi file rồi `node file.cjs` (nhớ giữ CRLF của các file docs).
- Tên file không phân biệt hoa thường: không đặt hai file chỉ khác hoa thường (ví dụ `KnowScrolls.tsx` và `knowScrolls.ts` đụng nhau).
- Tắt server nền sau khi đo (PowerShell: `Get-NetTCPConnection -LocalPort <cổng> -State Listen`, rồi `Stop-Process -Id <OwningProcess>`). Chạy `pnpm test` khi máy RẢNH (không đo trình duyệt cùng lúc); thời hạn mỗi test mặc định 30 giây (`vitest.config.ts`).
- Docker Desktop có thể không chạy trên máy này; Vite nhớ cả import hỏng (khởi động lại dev server khi sửa lỗi import).

## 12. Quy tắc làm việc
- Commit: tự commit sau mỗi bước, CHỈ khi pnpm test, pnpm typecheck, pnpm check:text đều xanh. Mỗi bước một commit (sửa lỗi trong cùng bước thì commit thêm). Message tiếng Việt, dạng "<gói>: <việc đã làm>". Không commit .env*, assets/, file tạm. Không push, không sửa lịch sử (không amend, rebase, force).
- HỎI TRƯỚC mọi thay đổi về server, Cloudflare, Supabase (migration, edge function, RLS, khóa, DNS, cache). KHÔNG deploy.
- Không in ra hay ghi bí mật (khóa, token, mật khẩu, nội dung `.env.local`) vào chat, log, file, ảnh chụp.
- Làm đúng spec. Chỗ spec chưa nói thì chọn phương án hợp lý nhất, nhưng PHẢI ghi rõ là "tự chọn" trong báo cáo. Không thêm tính năng ngoài spec.
- Cập nhật spec liên quan (số liệu, đường dẫn, quyết định) trong cùng đợt làm.
- docs: luật commit cho Claude Code, ước lượng mốc 3 (làng to)
## 13. Mẫu báo cáo khi xong một việc
Trả lời bằng bản tóm tắt tiếng Việt gồm:
1. **Đã làm gì** (ngắn, theo ý chứ không liệt kê từng file).
2. **Kết quả kiểm tra**: `pnpm test`, `pnpm typecheck`, `pnpm check:text`, `pnpm build` (đạt hay lỗi, số test).
3. **Số đo nếu có phần 3D**: FPS, khung chậm nhất, tam giác lớn nhất ở 3 mức, MB tải, bộ nhớ vào/ra làng, kích thước bundle; ghi rõ bản đo (build), máy, số lượt.
4. **Việc tự chọn** ngoài lời giao (và lý do).
5. **Điểm chưa chắc chắn** (số chưa đạt thì nêu số thật; việc chưa thử trên máy thật).
Kèm đề xuất thông điệp commit (không tự commit).
